/** Shared foreground, UMP and initialization policy. No ad is prefetched here. */
import type { AdsEnv } from './ads';

export type RequestPolicy = {
  test: boolean;
  testDevices?: string[];
  /** Conservative default: true. false still requires UMP personalization choices. */
  requestNonPersonalizedAdsOnly?: boolean;
};

export type RequestPrivacy = { requestNonPersonalizedAdsOnly: boolean };
export type FullscreenLease = { release: () => void };
type Session = { fullscreen: object | null; consent: Promise<void> | null; init: Promise<unknown> | null; devices: Set<string>; configuration: Promise<void> };
const sessions = new WeakMap<object, Session>();
const fallback = {};

function sessionFor(env: AdsEnv, sdk: any): Session {
  const key = sdk ?? env.appState() ?? fallback;
  let session = sessions.get(key);
  if (!session) {
    session = { fullscreen: null, consent: null, init: null, devices: new Set(), configuration: Promise.resolve() };
    sessions.set(key, session);
  }
  return session;
}

export function isForeground(env: AdsEnv): boolean {
  return env.appState()?.currentState === 'active';
}

export function acquireFullscreen(env: AdsEnv, sdk: any): FullscreenLease | null {
  const session = sessionFor(env, sdk);
  if (session.fullscreen) return null;
  const token = {};
  session.fullscreen = token;
  return { release: () => { if (session.fullscreen === token) session.fullscreen = null; } };
}

export function bounded<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    promise.then((value) => { clearTimeout(timer); resolve(value); }, (error) => { clearTimeout(timer); reject(error); });
  });
}

/** Failed UMP refresh may use a still-valid previous consent, never a fabricated one. */
export async function prepareRequest(env: AdsEnv, sdk: any, policy: RequestPolicy, stillNeeded: () => boolean = () => true, beforeInitialize?: () => Promise<void>): Promise<RequestPrivacy> {
  const check = () => {
    if (!stillNeeded()) throw new Error('광고를 그만뒀어요');
    if (!isForeground(env)) throw new Error('앱이 앞에 있을 때 광고를 요청할 수 있어요');
  };
  check();
  const session = sessionFor(env, sdk);
  const consent = sdk?.AdsConsent;
  if (!consent?.gatherConsent || !consent?.getConsentInfo) throw new Error('광고 동의를 확인할 수 없어요');
  if (!session.consent) {
    const pending = (async () => {
      try {
        await Promise.resolve(consent.gatherConsent({ testDeviceIdentifiers: policy.testDevices ?? [] }));
      } catch {
        // getConsentInfo below is the sole authority, including cached consent on network failure.
      }
      const info = await bounded(Promise.resolve(consent.getConsentInfo()), 5000, '광고 동의를 확인할 수 없어요');
      if (info?.canRequestAds !== true) throw new Error('광고 요청에 필요한 동의가 없어요');
    })();
    session.consent = pending;
    void pending.catch(() => { if (session.consent === pending) session.consent = null; });
  }
  // Keep the real in-flight form cached on timeout; another tap must not launch a second form.
  await bounded(session.consent, 45_000, '광고 동의 확인 시간이 초과됐어요');
  check();
  // Recheck after a privacy options change, even when the launch refresh has completed.
  const info = await bounded(Promise.resolve(consent.getConsentInfo()), 5000, '광고 동의를 확인할 수 없어요');
  if (info?.canRequestAds !== true) { session.consent = null; throw new Error('광고 요청에 필요한 동의가 없어요'); }
  check();
  // Manual ATT follows UMP and precedes the first SDK initialization/request.
  if (beforeInitialize) { await beforeInitialize(); check(); }
  let nonPersonalized = true;
  if (policy.requestNonPersonalizedAdsOnly === false) {
    try {
      const choices = await bounded(Promise.resolve(consent.getUserChoices()), 3000, '광고 동의를 확인할 수 없어요') as any;
      nonPersonalized = !(choices?.storeAndAccessInformationOnDevice === true && choices?.createAPersonalisedAdsProfile === true && choices?.selectPersonalisedAds === true);
      if (env.os() === 'ios') {
        const permissions = await bounded(Promise.resolve(env.tracking()?.getTrackingPermissionsAsync()), 3000, '추적 동의를 확인할 수 없어요') as any;
        if (!(permissions?.granted === true || permissions?.status === 'granted')) nonPersonalized = true;
      }
    } catch { nonPersonalized = true; }
  }
  check();
  const incoming = (policy.testDevices ?? []).filter((id) => !session.devices.has(id));
  if (incoming.length) {
    incoming.forEach((id) => session.devices.add(id));
    const identifiers = [...session.devices];
    const pending = session.configuration.then(async () => {
      await sdk.default().setRequestConfiguration({ testDeviceIdentifiers: identifiers });
    });
    // Registration must succeed before a real-unit request on a designated test device.
    session.configuration = pending.catch((error) => { incoming.forEach((id) => session.devices.delete(id)); throw error; });
    void session.configuration.catch(() => {});
  }
  const configuration = session.configuration;
  try { await bounded(configuration, 5000, '테스트 기기 등록 시간이 초과됐어요'); }
  catch (error) {
    // A still-pending registration remains a gate on later attempts. Only a real rejection resets it.
    void configuration.catch(() => { if (session.configuration === configuration) session.configuration = Promise.resolve(); });
    throw error;
  }
  check();
  if (!session.init) {
    const pending = (async () => {
      const mobile = sdk.default();
      check();
      return mobile.initialize();
    })();
    session.init = pending;
    void pending.catch(() => { if (session.init === pending) session.init = null; });
  }
  await bounded(session.init, 5000, '광고 초기화 시간이 초과됐어요');
  check();
  return { requestNonPersonalizedAdsOnly: nonPersonalized };
}

export function safeCall(fn: ((...args: any[]) => void) | undefined, ...args: any[]): void {
  try { fn?.(...args); } catch { /* Consumer callbacks never control SDK lifecycle. */ }
}

export function adError(error: any): string {
  const code = String(error?.code ?? error?.message ?? error ?? '');
  return /no.?fill/i.test(code) ? '지금은 볼 수 있는 광고가 없어요. 잠시 후 다시 시도해 주세요'
    : '광고를 불러오지 못했어요 (' + (code || '원인 불명') + ')';
}
