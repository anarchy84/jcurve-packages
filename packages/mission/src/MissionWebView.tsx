import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Linking, Platform, View } from 'react-native';
import { WebView as RNWebView, type WebViewMessageEvent, type WebViewProps } from 'react-native-webview';
import { openAppTarget, parseBridgeMessage, type BridgeMessage } from './bridge';
import { isWebUrl, resolveTarget } from './policy';
import { bridgeShim } from './shim';
import { DEFAULT_THEME, MissionLoading, MissionState, type MissionTheme } from './states';

export type MissionEvent = 'mission_open' | 'mission_loaded' | 'mission_error' | 'mission_target_open' | 'mission_target_blocked' | 'mission_overlay_request' | 'mission_floating_popup';

export type MissionWebViewProps = {
  /** 서버 apihub/entry 가 준 웹뷰 주소(fetchEntry 결과) */
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
type WebViewHandle = { reload: () => void };
const WebView = RNWebView as unknown as React.ComponentType<WebViewProps & { ref?: React.Ref<WebViewHandle> }>;

/** 웹뷰가 이 시간 안에 첫 화면을 못 띄우면 에러 화면 */
const LOAD_TIMEOUT_MS = 20000;

export function MissionWebView({ url, theme = DEFAULT_THEME, onClose, onEvent, onFloatingPopup, onOverlayRequest, overlayReady = false }: MissionWebViewProps) {
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [nonce, setNonce] = useState(0);
  const ref = useRef<WebViewHandle>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const platform = Platform.OS === 'ios' ? 'ios' : 'android';
  const shim = useMemo(() => bridgeShim(platform, overlayReady), [platform, overlayReady]);

  const arm = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { setFailed(true); onEvent?.('mission_error', { why: 'timeout' }); }, LOAD_TIMEOUT_MS);
  }, [onEvent]);
  const disarm = useCallback(() => { if (timer.current) { clearTimeout(timer.current); timer.current = null; } }, []);
  React.useEffect(() => { onEvent?.('mission_open'); arm(); return disarm; }, [nonce]);   // eslint-disable-line react-hooks/exhaustive-deps

  const retry = () => { setFailed(false); setLoading(true); setNonce(n => n + 1); };

  const onMessage = (e: WebViewMessageEvent) => {
    const m = parseBridgeMessage(e.nativeEvent.data);
    if (!m) return;
    if (m.method === 'openAppTarget') {
      const ok = resolveTarget(m.params.url, m.params.fallbackUrl) !== null;
      if (!ok) { onEvent?.('mission_target_blocked'); return; }
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

  if (failed) return <MissionState kind="error" theme={theme} onRetry={retry} onClose={onClose} />;

  return <View style={{ flex: 1, backgroundColor: theme.bg }}>
    <WebView
      key={nonce}
      ref={ref}
      source={{ uri: url }}
      originWhitelist={['*']}
      injectedJavaScriptBeforeContentLoaded={shim}
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
      onLoadEnd={() => { setLoading(false); disarm(); onEvent?.('mission_loaded'); }}
      onError={() => { disarm(); setFailed(true); onEvent?.('mission_error', { why: 'load' }); }}
      onHttpError={e => { if (e.nativeEvent.statusCode >= 500) { disarm(); setFailed(true); onEvent?.('mission_error', { why: 'http', status: e.nativeEvent.statusCode }); } }}
      onRenderProcessGone={() => ref.current?.reload()}
      onContentProcessDidTerminate={() => ref.current?.reload()}
      // http/https 는 웹뷰 안에서, 그 밖의 스킴(앱 스킴 · intent)은 열어 주고 웹뷰는 그대로 둔다. 막힌 스킴은 조용히 버린다
      onShouldStartLoadWithRequest={req => {
        if (isWebUrl(req.url) || req.url === 'about:blank') return true;
        if (req.isTopFrame !== false) {
          if (resolveTarget(req.url)) void openAppTarget({ url: req.url }, u => Linking.openURL(u)).then(opened => onEvent?.('mission_target_open', { opened }));
          else onEvent?.('mission_target_blocked');
        }
        return false;
      }}
    />
    {loading ? <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} pointerEvents="none"><MissionLoading theme={theme} /></View> : null}
  </View>;
}
