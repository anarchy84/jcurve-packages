import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { fetchEntry, type EntryResult, type Requester } from './entry';
import { MissionWebView, type MissionNavigation, type MissionWebViewProps } from './MissionWebView';
import { DEFAULT_THEME, MissionLoading, MissionState } from './states';

export type ShoppingMissionProps = Omit<MissionWebViewProps, 'url' | 'onClose' | 'onNavigationChange'> & {
  fetchJson: Requester;
  onClose: () => void;
  title?: string;
  adId?: string;
  /** Modal 바깥에서 읽은 useSafeAreaInsets() 값을 전달한다. */
  safeAreaInsets: { top: number; bottom: number; left?: number; right?: number };
};

/** 앱이 Modal 또는 내비게이션 화면 안에 넣는 쇼핑 미션 화면. */
export function ShoppingMission({ fetchJson, onClose, title = '일주일 쇼핑 미션', adId, safeAreaInsets, theme = DEFAULT_THEME, ...webViewProps }: ShoppingMissionProps) {
  const [result, setResult] = useState<EntryResult | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [canGoBack, setCanGoBack] = useState(false);
  const goBack = useRef<(() => void) | null>(null);
  const navigationChanged = useCallback((navigation: MissionNavigation) => {
    setCanGoBack(navigation.canGoBack);
    goBack.current = navigation.goBack;
  }, []);
  useEffect(() => {
    let live = true;
    setResult(null);
    setCanGoBack(false);
    goBack.current = null;
    void fetchEntry(fetchJson, adId).then(r => { if (live) setResult(r); });
    return () => { live = false; };
  }, [fetchJson, adId, attempt]);
  return <View style={[s.screen, { backgroundColor: theme.bg, paddingTop: safeAreaInsets.top, paddingBottom: safeAreaInsets.bottom, paddingLeft: safeAreaInsets.left ?? 0, paddingRight: safeAreaInsets.right ?? 0 }]}>
    <View style={[s.bar, { backgroundColor: theme.bg, borderBottomColor: theme.line }]}>
      <Pressable accessibilityRole="button" accessibilityLabel="닫기" onPress={onClose} hitSlop={12} style={s.button}><Text style={[s.buttonText, { color: theme.text }]}>닫기</Text></Pressable>
      <Text numberOfLines={1} style={[s.title, { color: theme.text }]}>{title}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="뒤로가기" accessibilityState={{ disabled: !canGoBack }} disabled={!canGoBack} onPress={() => goBack.current?.()} hitSlop={12} style={[s.button, { opacity: canGoBack ? 1 : 0.35 }]}><Text style={[s.buttonText, { color: theme.text }]}>뒤로가기</Text></Pressable>
    </View>
    <View style={s.body}>
      {result?.ok ? <MissionWebView {...webViewProps} url={result.url} theme={theme} onClose={onClose} onNavigationChange={navigationChanged} />
        : result ? <MissionState kind={result.reason === 'off' ? 'off' : result.reason === 'not_ready' ? 'notReady' : 'error'} theme={theme} onClose={onClose} onRetry={() => setAttempt(n => n + 1)} />
        : <MissionLoading theme={theme} />}
    </View>
  </View>;
}
const s = StyleSheet.create({
  screen: { flex: 1 },
  body: { flex: 1, zIndex: 0 },
  bar: { minHeight: 48, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, borderBottomWidth: 1, zIndex: 2, elevation: 2 },
  button: { minWidth: 64, minHeight: 48, justifyContent: 'center', alignItems: 'center' },
  buttonText: { fontSize: 16, fontWeight: '700' },
  title: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '800', marginHorizontal: 12 },
});
