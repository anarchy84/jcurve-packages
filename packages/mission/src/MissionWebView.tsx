import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, Linking, Platform, View } from 'react-native';
import { WebView as RNWebView, type WebViewMessageEvent, type WebViewProps } from 'react-native-webview';
import { openAppTarget, parseBridgeMessage, type BridgeMessage } from './bridge';
import { isAllowedOrigin, isEntryUrl } from './entry';
import { isWebUrl, resolveTarget } from './policy';
import { bridgeShim } from './shim';
import { DEFAULT_THEME, MissionLoading, MissionState, type MissionTheme, type StateKind } from './states';

export type MissionEvent = 'mission_open' | 'mission_loaded' | 'mission_error' | 'mission_target_open' | 'mission_target_blocked' | 'mission_overlay_request' | 'mission_floating_popup' | 'mission_external_link';

export type MissionWebViewProps = {
  /** 서버 apihub/entry 가 준 웹뷰 주소(fetchEntry 결과) — 승인된 APIHUB 주소가 아니면 열지 않고 오류 화면 */
  url: string;
  theme?: MissionTheme;
  onClose?: () => void;
  /** 계측 — 패키지는 아무 데도 보내지 않는다(앱이 자기 track 으로) */
  onEvent?: (name: MissionEvent, props?: Record<string, unknown>) => void;
  /** 페이지가 showFloatingPopup 을 불렀을 때(오버레이는 네이티브 빌드에서만 — 이 판은 알리기만) */
  onFloatingPopup?: (params: Extract<BridgeMessage, { method: 'showFloatingPopup' }>['params']) => void;
  /** 페이지가 「다른 앱 위에 표시」 권한을 요청했을 때 */
  onOverlayRequest?: () => void;
  /** 네이티브 오버레이가 들어간 빌드면 true(hasOverlayPermission 응답) */
  overlayReady?: boolean;
};

// react-native-webview 의 클래스 타입이 React 19 타입에서 JSX 로 안 받아진다 — 모양만 맞춰 준다
type WebViewHandle = { reload: () => void; goBack: () => void };
const WebView = RNWebView as unknown as React.ComponentType<WebViewProps & { ref?: React.Ref<WebViewHandle> }>;

/** 웹뷰가 이 시간 안에 첫 화면을 못 띄우면 에러 화면 */
const LOAD_TIMEOUT_MS = 20000;
/** 렌더러가 죽어 다시 만든 횟수가 이를 넘으면 오류 화면 */
const MAX_RECOVER = 2;

const nonceOf = () => Math.random().toString(36).slice(2) + Date.now().toString(36) + Math.random().toString(36).slice(2);

/** 주소가 바뀌었거나 다시 시도할 때마다 상태를 처음부터 */
export function MissionWebView({ url, theme = DEFAULT_THEME, onClose, onEvent, onFloatingPopup, onOverlayRequest, overlayReady = false }: MissionWebViewProps) {
  const valid = isEntryUrl(url);
  const [state, setState] = useState<'loading' | 'ok' | StateKind>('loading');
  const [nonce, setNonce] = useState(0);     // 바뀌면 웹뷰를 새로 만든다(재시도 · 렌더러 복구)
  const secret = useMemo(nonceOf, [nonce, url]);   // 이 로드의 비밀 값 — shim 안에만 있다
  const handle = useRef<WebViewHandle>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recovered = useRef(0);
  const canGoBack = useRef(false);
  const platform = Platform.OS === 'ios' ? 'ios' : 'android';
  const shim = useMemo(() => bridgeShim(platform, overlayReady, secret), [platform, overlayReady, secret]);

  const disarm = useCallback(() => { if (timer.current) { clearTimeout(timer.current); timer.current = null; } }, []);
  const fail = useCallback((kind: StateKind, why: Record<string, unknown>) => {
    disarm();
    setState(kind);
    onEvent?.('mission_error', { kind, ...why });
  }, [disarm, onEvent]);

  // 로드가 시작될 때마다(주소 · 다시 시도) 상태와 타이머를 처음부터
  useEffect(() => {
    recovered.current = 0;
    setState('loading');
    if (!valid) { fail('error', { why: 'bad_url' }); return disarm; }
    onEvent?.('mission_open');
    disarm();
    timer.current = setTimeout(() => fail('error', { why: 'timeout' }), LOAD_TIMEOUT_MS);
    return disarm;
  }, [url, nonce]);   // eslint-disable-line react-hooks/exhaustive-deps

  // Android 뒤로 가기 — 웹 히스토리가 있으면 먼저, 첫 페이지면 닫기
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (canGoBack.current) { handle.current?.goBack(); return true; }
      if (onClose) { onClose(); return true; }
      return false;
    });
    return () => sub.remove();
  }, [onClose]);

  const retry = () => setNonce(n => n + 1);

  const openExternal = (u: string) => { onEvent?.('mission_external_link'); void Linking.openURL(u).catch(() => undefined); };

  const onMessage = (e: WebViewMessageEvent) => {
    // 보낸 쪽 화면이 승인된 origin 이고, 이 로드의 비밀 값을 아는 글만 받는다
    if (!isAllowedOrigin(e.nativeEvent.url)) return;
    const m = parseBridgeMessage(e.nativeEvent.data, secret);
    if (!m) return;
    if (m.method === 'openAppTarget') {
      if (!resolveTarget(m.params.url, m.params.fallbackUrl)) { onEvent?.('mission_target_blocked'); return; }
      void openAppTarget(m.params, u => Linking.openURL(u)).then(opened => onEvent?.('mission_target_open', { opened }));
    } else if (m.method === 'showFloatingPopup') {
      onEvent?.('mission_floating_popup');
      onFloatingPopup?.(m.params);
    } else if (m.method === 'requestOverlayPermission') {
      onEvent?.('mission_overlay_request');
      onOverlayRequest?.();
    }
    // hasOverlayPermission 은 shim 이 바로 답한다(동기) — 여기는 올 일이 없다
  };

  if (state !== 'loading' && state !== 'ok') return <MissionState kind={state} theme={theme} onRetry={retry} onClose={onClose} />;
  if (!valid) return <MissionState kind="error" theme={theme} onClose={onClose} />;

  return <View style={{ flex: 1, backgroundColor: theme.bg }}>
    <WebView
      key={`${nonce}`}
      ref={handle}
      source={{ uri: url }}
      originWhitelist={['https://*']}
      injectedJavaScriptBeforeContentLoaded={shim}
      injectedJavaScriptBeforeContentLoadedForMainFrameOnly
      injectedJavaScriptForMainFrameOnly
      onMessage={onMessage}
      javaScriptEnabled
      domStorageEnabled
      sharedCookiesEnabled
      thirdPartyCookiesEnabled
      allowFileAccess={false}
      allowsInlineMediaPlayback
      javaScriptCanOpenWindowsAutomatically={false}
      setSupportMultipleWindows={false}
      setBuiltInZoomControls={false}
      allowsBackForwardNavigationGestures
      onNavigationStateChange={s => { canGoBack.current = s.canGoBack; }}
      onLoad={() => { disarm(); setState('ok'); onEvent?.('mission_loaded'); }}
      onError={() => fail('error', { why: 'load' })}
      onHttpError={e => {
        const code = e.nativeEvent.statusCode;
        if (code === 503) fail('maintenance', { why: 'http', status: code });
        else if (code === 401 || code === 403 || code === 410 || code === 419) fail('session', { why: 'http', status: code });
        else if (code >= 400) fail('error', { why: 'http', status: code });
      }}
      // 렌더러가 죽으면 웹뷰를 새로 만든다(reload 는 죽은 렌더러에 소용없다). 반복하면 오류 화면
      onRenderProcessGone={() => { recovered.current += 1; if (recovered.current > MAX_RECOVER) fail('error', { why: 'renderer' }); else setNonce(n => n + 1); }}
      onContentProcessDidTerminate={() => { recovered.current += 1; if (recovered.current > MAX_RECOVER) fail('error', { why: 'renderer' }); else handle.current?.reload(); }}
      // 승인된 APIHUB origin 안에서만 웹뷰가 움직인다. 다른 https 주소는 기본 브라우저로, 앱 스킴 · intent 는 openAppTarget 규칙으로 열고, 웹뷰는 그대로
      onShouldStartLoadWithRequest={req => {
        if (req.url === 'about:blank') return true;
        if (isWebUrl(req.url)) {
          if (isAllowedOrigin(req.url)) return true;
          if (req.isTopFrame !== false && req.url.toLowerCase().startsWith('https://')) openExternal(req.url);
          return false;
        }
        if (req.isTopFrame !== false) {
          if (resolveTarget(req.url)) void openAppTarget({ url: req.url }, u => Linking.openURL(u)).then(opened => onEvent?.('mission_target_open', { opened }));
          else onEvent?.('mission_target_blocked');
        }
        return false;
      }}
    />
    {state === 'loading' ? <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} pointerEvents="none"><MissionLoading theme={theme} /></View> : null}
  </View>;
}
