import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

/** 색만 받는다 — 문구 · 모양은 패키지가 정한다(앱마다 달라지지 않게). 피그마 시안이 오면 이 화면들이 그 모양으로 바뀐다 */
export type MissionTheme = { bg: string; card: string; text: string; sub: string; accent: string; accentText: string; line: string };

export const DEFAULT_THEME: MissionTheme = { bg: '#FFFFFF', card: '#F5F6F8', text: '#191F28', sub: '#6B7684', accent: '#2F6BFF', accentText: '#FFFFFF', line: '#E5E8EB' };

export type StateKind = 'error' | 'maintenance' | 'maintenanceDaily' | 'session' | 'soldOut' | 'off' | 'notReady';

// 문구는 피그마 「리워드 선착순 마감, 에러 화면」(2026-10-12 읽은 노트) 그대로. 모양(아이콘 · 그라데이션)은 시안이 정해지면 바꾼다
const COPY: Record<StateKind, { title: string; body: string; button?: string; windowLabel?: string }> = {
  error: { title: '불러오지 못했어요', body: '네트워크를 확인하고 다시 시도해 주세요.', button: '다시 시도' },
  maintenance: { title: '지금은 시스템 점검 중이에요', body: '잠시 후 다시 이용해주세요!', windowLabel: '점검 예정 시간' },
  maintenanceDaily: { title: '지금은 잠깐 점검 중이에요', body: '곧 다시 열리니 조금만 기다려 주세요!', windowLabel: '점검 시간' },
  session: { title: '잘못된 접근이거나 세션이 만료됐어요', body: '잠시 후 다시 이용해주세요!' },
  soldOut: { title: '캠페인 선착순 마감', body: '회원분들의 많은 참여로 인해 캠페인이 마감되었습니다.', button: '다른 미션 보러가기' },
  off: { title: '지금은 참여할 수 없어요', body: '일주일 방문 미션이 준비되면 알려 드릴게요.' },
  notReady: { title: '곧 열려요', body: '미션을 준비하고 있어요. 조금만 기다려 주세요.' },
};

export function MissionState({ kind, theme = DEFAULT_THEME, window, onRetry, onClose }: { kind: StateKind; theme?: MissionTheme; /** 점검 시간 글(예 「매일 23:55 ~ 00:10」) — 점검 화면에서만 */ window?: string; onRetry?: () => void; onClose?: () => void }) {
  const c = COPY[kind];
  return <View style={[s.wrap, { backgroundColor: theme.bg }]}>
    <Text accessibilityRole="header" style={[s.title, { color: theme.text }]}>{c.title}</Text>
    <Text style={[s.body, { color: theme.sub }]}>{c.body}</Text>
    {c.windowLabel && window ? <View style={[s.box, { borderColor: theme.line }]}><Text style={[s.boxLabel, { color: theme.sub }]}>{c.windowLabel}</Text><Text style={[s.boxText, { color: theme.text }]}>{window}</Text></View> : null}
    {c.button && onRetry ? <Pressable accessibilityRole="button" onPress={onRetry} style={[s.btn, { backgroundColor: theme.accent }]}><Text style={[s.btnText, { color: theme.accentText }]}>{c.button}</Text></Pressable> : null}
    {onClose ? <Pressable accessibilityRole="button" onPress={onClose} style={s.link}><Text style={[s.linkText, { color: theme.sub }]}>닫기</Text></Pressable> : null}
  </View>;
}

export function MissionLoading({ theme = DEFAULT_THEME }: { theme?: MissionTheme }) {
  return <View style={[s.wrap, { backgroundColor: theme.bg }]}><ActivityIndicator color={theme.accent} accessibilityLabel="불러오는 중" /></View>;
}

const s = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 12 },
  title: { fontSize: 20, lineHeight: 28, fontWeight: '700', textAlign: 'center' },
  body: { fontSize: 15, lineHeight: 23, textAlign: 'center' },
  btn: { minHeight: 50, minWidth: 160, borderRadius: 14, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, marginTop: 8 },
  btnText: { fontSize: 16, fontWeight: '700' },
  box: { borderWidth: 1, borderStyle: 'dashed', borderRadius: 14, paddingVertical: 12, paddingHorizontal: 18, alignItems: 'center', gap: 2, marginTop: 4 },
  boxLabel: { fontSize: 13 },
  boxText: { fontSize: 16, fontWeight: '700' },
  link: { minHeight: 44, justifyContent: 'center' },
  linkText: { fontSize: 14, textDecorationLine: 'underline' },
});
