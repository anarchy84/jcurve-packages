import React, { useEffect, useState, type ReactNode } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';
import { fetchCards, normalizeCards, type MissionCard, type MissionCardType } from './cards';
import type { Requester } from './entry';
import { DEFAULT_THEME, type MissionTheme } from './states';

export type MissionCardsTheme = { colors?: Partial<MissionTheme>; radius?: number };
export type MissionCardsProps = {
  fetchJson: Requester;
  fallbackCards?: readonly MissionCard[];
  title?: string;
  subtitle?: string;
  theme?: MissionCardsTheme;
  icons?: Partial<Record<MissionCardType, ReactNode | ImageSourcePropType>>;
  character?: ReactNode;
  renderAfterCards?: () => ReactNode;
  onOpenShopping: (card: MissionCard) => void;
  onOpenStamps: (card: MissionCard) => void;
};

const EMPTY: readonly MissionCard[] = [];
function renderIcon(icon: ReactNode | ImageSourcePropType) {
  if (typeof icon === 'number' || (icon && typeof icon === 'object' && !React.isValidElement(icon) && ('uri' in icon || Array.isArray(icon)))) {
    return <Image source={icon as ImageSourcePropType} style={s.image} resizeMode="contain" />;
  }
  return icon as ReactNode;
}

/** 모든 앱이 같은 머리글·카드 목록·광고 슬롯 구조를 쓴다. */
export function MissionCards({ fetchJson, fallbackCards = EMPTY, title = '미션', subtitle = '미션에 참여하고 포인트를 받아요', theme, icons, character, renderAfterCards, onOpenShopping, onOpenStamps }: MissionCardsProps) {
  const colors = { ...DEFAULT_THEME, ...theme?.colors };
  const [cards, setCards] = useState(() => normalizeCards(fallbackCards));
  useEffect(() => {
    let live = true;
    setCards(normalizeCards(fallbackCards));
    void fetchCards(fetchJson, fallbackCards).then(result => { if (live) setCards(result); });
    return () => { live = false; };
  }, [fetchJson, fallbackCards]);
  return <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={s.content}>
    <View style={s.header}>
      <View style={s.texts}>
        <Text accessibilityRole="header" style={[s.heading, { color: colors.text }]}>{title}</Text>
        <Text style={[s.subtitle, { color: colors.sub }]}>{subtitle}</Text>
      </View>
      {character}
    </View>
    <View style={s.cards}>
      {cards.map(card => <Pressable key={card.id} accessibilityRole="button" accessibilityLabel={`${card.title}, ${card.desc || ''}`} onPress={() => card.type === 'apihub_shopping' ? onOpenShopping(card) : onOpenStamps(card)} style={({ pressed }) => [s.card, { backgroundColor: colors.card, borderColor: colors.line, borderRadius: theme?.radius ?? 20, opacity: pressed ? 0.9 : 1 }]}>
        <View style={[s.icon, { backgroundColor: colors.bg }]}>
          {card.icon ? <Image source={{ uri: card.icon }} style={s.image} resizeMode="contain" /> : renderIcon(icons?.[card.type] ?? <Text style={{ color: colors.accent, fontSize: 28 }}>{card.type === 'apihub_shopping' ? '▣' : '✓'}</Text>)}
        </View>
        <View style={s.texts}>
          <Text style={[s.title, { color: colors.text }]}>{card.title}</Text>
          {card.desc ? <Text style={[s.subtitle, { color: colors.sub }]}>{card.desc}</Text> : null}
        </View>
        <Text style={[s.chevron, { color: colors.sub }]}>›</Text>
      </Pressable>)}
    </View>
    {renderAfterCards ? <View style={s.after}>{renderAfterCards()}</View> : null}
  </ScrollView>;
}
const s = StyleSheet.create({
  content: { padding: 16, paddingBottom: 32 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 16 },
  heading: { fontSize: 26, fontWeight: '800' },
  texts: { flex: 1, gap: 4 },
  cards: { gap: 16 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 20, borderWidth: 1 },
  icon: { width: 64, height: 64, borderRadius: 18, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  image: { width: 52, height: 52 },
  title: { fontSize: 16, fontWeight: '800' },
  subtitle: { fontSize: 13, lineHeight: 20 },
  chevron: { fontSize: 28 },
  after: { marginTop: 16 },
});
