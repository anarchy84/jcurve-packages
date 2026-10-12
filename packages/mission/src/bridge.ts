import { resolveTarget } from './policy';

/** 웹뷰 → 앱 메시지. 페이지가 부른 MocationNativeBridge 함수 이름(method)과 그 인자 */
export type BridgeMessage =
  | { method: 'openAppTarget'; params: { url: string; fallbackUrl?: string } }
  | { method: 'showFloatingPopup'; params: { imageUrl: string; name: string; price: string; durationSec: number } }
  | { method: 'requestOverlayPermission'; params: Record<string, never> }
  | { method: 'hasOverlayPermission'; params: Record<string, never> };

const str = (v: unknown): string | undefined => (typeof v === 'string' ? v : undefined);

/** react-native-webview 의 onMessage 문자열 → 알려진 메시지. 우리가 심은 shim 이 보낸 것만 받는다(다른 글은 null) */
export function parseBridgeMessage(data: unknown): BridgeMessage | null {
  if (typeof data !== 'string' || data.length > 20000) return null;
  let j: unknown;
  try { j = JSON.parse(data); } catch { return null; }
  if (!j || typeof j !== 'object' || (j as { m?: unknown }).m !== 'MocationNativeBridge') return null;
  const method = (j as { method?: unknown }).method;
  const p = ((j as { params?: unknown }).params ?? {}) as Record<string, unknown>;
  switch (method) {
    case 'openAppTarget': {
      const url = str(p.url);
      if (!url) return null;
      const fallbackUrl = str(p.fallbackUrl);
      return { method, params: fallbackUrl ? { url, fallbackUrl } : { url } };
    }
    case 'showFloatingPopup': {
      const imageUrl = str(p.imageUrl), name = str(p.name), price = str(p.price);
      if (imageUrl === undefined || name === undefined || price === undefined) return null;
      const d = Number(p.durationSec);
      return { method, params: { imageUrl, name, price, durationSec: Number.isFinite(d) && d > 0 ? Math.floor(d) : 300 } };   // 미전달 · 0 이하 · 숫자 아님이면 300초
    }
    case 'requestOverlayPermission':
    case 'hasOverlayPermission':
      return { method, params: {} };
    default:
      return null;
  }
}

/**
 * openAppTarget — 못 열면 fallbackUrl(스토어 링크 등). 막힌 주소는 열지 않는다.
 * openURL 은 앱이 넘긴다(Linking.openURL). 열었으면 true.
 */
export async function openAppTarget(params: { url: string; fallbackUrl?: string }, openURL: (url: string) => Promise<unknown>): Promise<boolean> {
  const target = resolveTarget(params.url, params.fallbackUrl);
  if (!target) return false;
  try {
    await openURL(target.url);
    return true;
  } catch {
    if (!target.fallbackUrl) return false;
    try { await openURL(target.fallbackUrl); return true; } catch { return false; }
  }
}
