"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MissionWebView = MissionWebView;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const react_native_1 = require("react-native");
const react_native_webview_1 = require("react-native-webview");
const bridge_1 = require("./bridge");
const entry_1 = require("./entry");
const policy_1 = require("./policy");
const shim_1 = require("./shim");
const states_1 = require("./states");
const WebView = react_native_webview_1.WebView;
/** 웹뷰가 이 시간 안에 첫 화면을 못 띄우면 에러 화면 */
const LOAD_TIMEOUT_MS = 20000;
/** 렌더러가 죽어 다시 만든 횟수가 이를 넘으면 오류 화면 */
const MAX_RECOVER = 2;
const nonceOf = () => Math.random().toString(36).slice(2) + Date.now().toString(36) + Math.random().toString(36).slice(2);
/** 주소가 바뀌었거나 다시 시도할 때마다 상태를 처음부터 */
function MissionWebView({ url, theme = states_1.DEFAULT_THEME, onClose, onEvent, onFloatingPopup, onOverlayRequest, overlayReady = false }) {
    const valid = (0, entry_1.isEntryUrl)(url);
    const [state, setState] = (0, react_1.useState)('loading');
    const [nonce, setNonce] = (0, react_1.useState)(0); // 바뀌면 웹뷰를 새로 만든다(재시도 · 렌더러 복구)
    const secret = (0, react_1.useMemo)(nonceOf, [nonce, url]); // 이 로드의 비밀 값 — shim 안에만 있다
    const handle = (0, react_1.useRef)(null);
    const timer = (0, react_1.useRef)(null);
    const recovered = (0, react_1.useRef)(0);
    const canGoBack = (0, react_1.useRef)(false);
    const platform = react_native_1.Platform.OS === 'ios' ? 'ios' : 'android';
    const shim = (0, react_1.useMemo)(() => (0, shim_1.bridgeShim)(platform, overlayReady, secret), [platform, overlayReady, secret]);
    const disarm = (0, react_1.useCallback)(() => { if (timer.current) {
        clearTimeout(timer.current);
        timer.current = null;
    } }, []);
    const fail = (0, react_1.useCallback)((kind, why) => {
        disarm();
        setState(kind);
        onEvent?.('mission_error', { kind, ...why });
    }, [disarm, onEvent]);
    // 로드가 시작될 때마다(주소 · 다시 시도) 상태와 타이머를 처음부터
    (0, react_1.useEffect)(() => {
        recovered.current = 0;
        setState('loading');
        if (!valid) {
            fail('error', { why: 'bad_url' });
            return disarm;
        }
        onEvent?.('mission_open');
        disarm();
        timer.current = setTimeout(() => fail('error', { why: 'timeout' }), LOAD_TIMEOUT_MS);
        return disarm;
    }, [url, nonce]); // eslint-disable-line react-hooks/exhaustive-deps
    // Android 뒤로 가기 — 웹 히스토리가 있으면 먼저, 첫 페이지면 닫기
    (0, react_1.useEffect)(() => {
        if (react_native_1.Platform.OS !== 'android')
            return;
        const sub = react_native_1.BackHandler.addEventListener('hardwareBackPress', () => {
            if (canGoBack.current) {
                handle.current?.goBack();
                return true;
            }
            if (onClose) {
                onClose();
                return true;
            }
            return false;
        });
        return () => sub.remove();
    }, [onClose]);
    const retry = () => setNonce(n => n + 1);
    const openExternal = (u) => { onEvent?.('mission_external_link'); void react_native_1.Linking.openURL(u).catch(() => undefined); };
    const onMessage = (e) => {
        // 보낸 쪽 화면이 승인된 origin 이고, 이 로드의 비밀 값을 아는 글만 받는다
        if (!(0, entry_1.isAllowedOrigin)(e.nativeEvent.url))
            return;
        const m = (0, bridge_1.parseBridgeMessage)(e.nativeEvent.data, secret);
        if (!m)
            return;
        if (m.method === 'openAppTarget') {
            if (!(0, policy_1.resolveTarget)(m.params.url, m.params.fallbackUrl)) {
                onEvent?.('mission_target_blocked');
                return;
            }
            void (0, bridge_1.openAppTarget)(m.params, u => react_native_1.Linking.openURL(u)).then(opened => onEvent?.('mission_target_open', { opened }));
        }
        else if (m.method === 'showFloatingPopup') {
            onEvent?.('mission_floating_popup');
            onFloatingPopup?.(m.params);
        }
        else if (m.method === 'requestOverlayPermission') {
            onEvent?.('mission_overlay_request');
            onOverlayRequest?.();
        }
        // hasOverlayPermission 은 shim 이 바로 답한다(동기) — 여기는 올 일이 없다
    };
    if (state !== 'loading' && state !== 'ok')
        return (0, jsx_runtime_1.jsx)(states_1.MissionState, { kind: state, theme: theme, onRetry: retry, onClose: onClose });
    if (!valid)
        return (0, jsx_runtime_1.jsx)(states_1.MissionState, { kind: "error", theme: theme, onClose: onClose });
    return (0, jsx_runtime_1.jsxs)(react_native_1.View, { style: { flex: 1, backgroundColor: theme.bg }, children: [(0, jsx_runtime_1.jsx)(WebView, { ref: handle, source: { uri: url }, originWhitelist: ['https://*'], injectedJavaScriptBeforeContentLoaded: shim, injectedJavaScriptBeforeContentLoadedForMainFrameOnly: true, injectedJavaScriptForMainFrameOnly: true, onMessage: onMessage, javaScriptEnabled: true, domStorageEnabled: true, sharedCookiesEnabled: true, thirdPartyCookiesEnabled: true, allowFileAccess: false, allowsInlineMediaPlayback: true, javaScriptCanOpenWindowsAutomatically: false, setSupportMultipleWindows: false, setBuiltInZoomControls: false, allowsBackForwardNavigationGestures: true, onNavigationStateChange: s => { canGoBack.current = s.canGoBack; }, onLoad: () => { disarm(); setState('ok'); onEvent?.('mission_loaded'); }, onError: () => fail('error', { why: 'load' }), onHttpError: e => {
                    const code = e.nativeEvent.statusCode;
                    if (code === 503)
                        fail('maintenance', { why: 'http', status: code });
                    else if (code === 401 || code === 403 || code === 410 || code === 419)
                        fail('session', { why: 'http', status: code });
                    else if (code >= 400)
                        fail('error', { why: 'http', status: code });
                }, 
                // 렌더러가 죽으면 웹뷰를 새로 만든다(reload 는 죽은 렌더러에 소용없다). 반복하면 오류 화면
                onRenderProcessGone: () => { recovered.current += 1; if (recovered.current > MAX_RECOVER)
                    fail('error', { why: 'renderer' });
                else
                    setNonce(n => n + 1); }, onContentProcessDidTerminate: () => { recovered.current += 1; if (recovered.current > MAX_RECOVER)
                    fail('error', { why: 'renderer' });
                else
                    handle.current?.reload(); }, 
                // 승인된 APIHUB origin 안에서만 웹뷰가 움직인다. 다른 https 주소는 기본 브라우저로, 앱 스킴 · intent 는 openAppTarget 규칙으로 열고, 웹뷰는 그대로
                onShouldStartLoadWithRequest: req => {
                    if (req.url === 'about:blank')
                        return true;
                    if ((0, policy_1.isWebUrl)(req.url)) {
                        if ((0, entry_1.isAllowedOrigin)(req.url))
                            return true;
                        if (req.isTopFrame !== false && req.url.toLowerCase().startsWith('https://'))
                            openExternal(req.url);
                        return false;
                    }
                    if (req.isTopFrame !== false) {
                        if ((0, policy_1.resolveTarget)(req.url))
                            void (0, bridge_1.openAppTarget)({ url: req.url }, u => react_native_1.Linking.openURL(u)).then(opened => onEvent?.('mission_target_open', { opened }));
                        else
                            onEvent?.('mission_target_blocked');
                    }
                    return false;
                } }, `${nonce}`), state === 'loading' ? (0, jsx_runtime_1.jsx)(react_native_1.View, { style: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }, pointerEvents: "none", children: (0, jsx_runtime_1.jsx)(states_1.MissionLoading, { theme: theme }) }) : null] });
}
