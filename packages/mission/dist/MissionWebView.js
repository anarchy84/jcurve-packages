"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.MissionWebView = MissionWebView;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = __importStar(require("react"));
const react_native_1 = require("react-native");
const react_native_webview_1 = require("react-native-webview");
const bridge_1 = require("./bridge");
const policy_1 = require("./policy");
const shim_1 = require("./shim");
const states_1 = require("./states");
const WebView = react_native_webview_1.WebView;
/** 웹뷰가 이 시간 안에 첫 화면을 못 띄우면 에러 화면 */
const LOAD_TIMEOUT_MS = 20000;
function MissionWebView({ url, theme = states_1.DEFAULT_THEME, onClose, onEvent, onFloatingPopup, onOverlayRequest, overlayReady = false }) {
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [failed, setFailed] = (0, react_1.useState)(false);
    const [nonce, setNonce] = (0, react_1.useState)(0);
    const ref = (0, react_1.useRef)(null);
    const timer = (0, react_1.useRef)(null);
    const platform = react_native_1.Platform.OS === 'ios' ? 'ios' : 'android';
    const shim = (0, react_1.useMemo)(() => (0, shim_1.bridgeShim)(platform, overlayReady), [platform, overlayReady]);
    const arm = (0, react_1.useCallback)(() => {
        if (timer.current)
            clearTimeout(timer.current);
        timer.current = setTimeout(() => { setFailed(true); onEvent?.('mission_error', { why: 'timeout' }); }, LOAD_TIMEOUT_MS);
    }, [onEvent]);
    const disarm = (0, react_1.useCallback)(() => { if (timer.current) {
        clearTimeout(timer.current);
        timer.current = null;
    } }, []);
    react_1.default.useEffect(() => { onEvent?.('mission_open'); arm(); return disarm; }, [nonce]); // eslint-disable-line react-hooks/exhaustive-deps
    const retry = () => { setFailed(false); setLoading(true); setNonce(n => n + 1); };
    const onMessage = (e) => {
        const m = (0, bridge_1.parseBridgeMessage)(e.nativeEvent.data);
        if (!m)
            return;
        if (m.method === 'openAppTarget') {
            const ok = (0, policy_1.resolveTarget)(m.params.url, m.params.fallbackUrl) !== null;
            if (!ok) {
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
    if (failed)
        return (0, jsx_runtime_1.jsx)(states_1.MissionState, { kind: "error", theme: theme, onRetry: retry, onClose: onClose });
    return (0, jsx_runtime_1.jsxs)(react_native_1.View, { style: { flex: 1, backgroundColor: theme.bg }, children: [(0, jsx_runtime_1.jsx)(WebView, { ref: ref, source: { uri: url }, originWhitelist: ['*'], injectedJavaScriptBeforeContentLoaded: shim, onMessage: onMessage, javaScriptEnabled: true, domStorageEnabled: true, sharedCookiesEnabled: true, thirdPartyCookiesEnabled: true, allowFileAccess: false, allowsInlineMediaPlayback: true, javaScriptCanOpenWindowsAutomatically: false, setSupportMultipleWindows: false, setBuiltInZoomControls: false, allowsBackForwardNavigationGestures: true, onLoadEnd: () => { setLoading(false); disarm(); onEvent?.('mission_loaded'); }, onError: () => { disarm(); setFailed(true); onEvent?.('mission_error', { why: 'load' }); }, onHttpError: e => { if (e.nativeEvent.statusCode >= 500) {
                    disarm();
                    setFailed(true);
                    onEvent?.('mission_error', { why: 'http', status: e.nativeEvent.statusCode });
                } }, onRenderProcessGone: () => ref.current?.reload(), onContentProcessDidTerminate: () => ref.current?.reload(), 
                // http/https 는 웹뷰 안에서, 그 밖의 스킴(앱 스킴 · intent)은 열어 주고 웹뷰는 그대로 둔다. 막힌 스킴은 조용히 버린다
                onShouldStartLoadWithRequest: req => {
                    if ((0, policy_1.isWebUrl)(req.url) || req.url === 'about:blank')
                        return true;
                    if (req.isTopFrame !== false) {
                        if ((0, policy_1.resolveTarget)(req.url))
                            void (0, bridge_1.openAppTarget)({ url: req.url }, u => react_native_1.Linking.openURL(u)).then(opened => onEvent?.('mission_target_open', { opened }));
                        else
                            onEvent?.('mission_target_blocked');
                    }
                    return false;
                } }, nonce), loading ? (0, jsx_runtime_1.jsx)(react_native_1.View, { style: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }, pointerEvents: "none", children: (0, jsx_runtime_1.jsx)(states_1.MissionLoading, { theme: theme }) }) : null] });
}
