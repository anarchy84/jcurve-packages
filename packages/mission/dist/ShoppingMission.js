"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShoppingMission = ShoppingMission;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const react_native_1 = require("react-native");
const entry_1 = require("./entry");
const MissionWebView_1 = require("./MissionWebView");
const states_1 = require("./states");
/** 앱이 Modal 또는 내비게이션 화면 안에 넣는 쇼핑 미션 화면. */
function ShoppingMission({ fetchJson, onClose, title = '일주일 쇼핑 미션', adId, safeAreaInsets, theme = states_1.DEFAULT_THEME, ...webViewProps }) {
    const [result, setResult] = (0, react_1.useState)(null);
    const [attempt, setAttempt] = (0, react_1.useState)(0);
    const [canGoBack, setCanGoBack] = (0, react_1.useState)(false);
    const goBack = (0, react_1.useRef)(null);
    const navigationChanged = (0, react_1.useCallback)((navigation) => {
        setCanGoBack(navigation.canGoBack);
        goBack.current = navigation.goBack;
    }, []);
    (0, react_1.useEffect)(() => {
        let live = true;
        setResult(null);
        setCanGoBack(false);
        goBack.current = null;
        void (0, entry_1.fetchEntry)(fetchJson, adId).then(r => { if (live)
            setResult(r); });
        return () => { live = false; };
    }, [fetchJson, adId, attempt]);
    return (0, jsx_runtime_1.jsxs)(react_native_1.View, { style: [s.screen, { backgroundColor: theme.bg, paddingTop: safeAreaInsets.top, paddingBottom: safeAreaInsets.bottom, paddingLeft: safeAreaInsets.left ?? 0, paddingRight: safeAreaInsets.right ?? 0 }], children: [(0, jsx_runtime_1.jsxs)(react_native_1.View, { style: [s.bar, { backgroundColor: theme.bg, borderBottomColor: theme.line }], children: [(0, jsx_runtime_1.jsx)(react_native_1.Pressable, { accessibilityRole: "button", accessibilityLabel: "\uB2EB\uAE30", onPress: onClose, hitSlop: 12, style: s.button, children: (0, jsx_runtime_1.jsx)(react_native_1.Text, { style: [s.buttonText, { color: theme.text }], children: "\uB2EB\uAE30" }) }), (0, jsx_runtime_1.jsx)(react_native_1.Text, { numberOfLines: 1, style: [s.title, { color: theme.text }], children: title }), (0, jsx_runtime_1.jsx)(react_native_1.Pressable, { accessibilityRole: "button", accessibilityLabel: "\uB4A4\uB85C\uAC00\uAE30", accessibilityState: { disabled: !canGoBack }, disabled: !canGoBack, onPress: () => goBack.current?.(), hitSlop: 12, style: [s.button, { opacity: canGoBack ? 1 : 0.35 }], children: (0, jsx_runtime_1.jsx)(react_native_1.Text, { style: [s.buttonText, { color: theme.text }], children: "\uB4A4\uB85C\uAC00\uAE30" }) })] }), (0, jsx_runtime_1.jsx)(react_native_1.View, { style: s.body, children: result?.ok ? (0, jsx_runtime_1.jsx)(MissionWebView_1.MissionWebView, { ...webViewProps, url: result.url, theme: theme, onClose: onClose, onNavigationChange: navigationChanged })
                    : result ? (0, jsx_runtime_1.jsx)(states_1.MissionState, { kind: result.reason === 'off' ? 'off' : result.reason === 'not_ready' ? 'notReady' : 'error', theme: theme, onClose: onClose, onRetry: () => setAttempt(n => n + 1) })
                        : (0, jsx_runtime_1.jsx)(states_1.MissionLoading, { theme: theme }) })] });
}
const s = react_native_1.StyleSheet.create({
    screen: { flex: 1 },
    body: { flex: 1, zIndex: 0 },
    bar: { minHeight: 48, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, borderBottomWidth: 1, zIndex: 2, elevation: 2 },
    button: { minWidth: 64, minHeight: 48, justifyContent: 'center', alignItems: 'center' },
    buttonText: { fontSize: 16, fontWeight: '700' },
    title: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '800', marginHorizontal: 12 },
});
