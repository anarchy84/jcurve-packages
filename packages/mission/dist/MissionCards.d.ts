import React, { type ReactNode } from 'react';
import { type ImageSourcePropType } from 'react-native';
import { type MissionCard, type MissionCardType } from './cards';
import type { Requester } from './entry';
import { type MissionTheme } from './states';
export type MissionCardsTheme = {
    colors?: Partial<MissionTheme>;
    radius?: number;
};
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
/** 모든 앱이 같은 머리글·카드 목록·광고 슬롯 구조를 쓴다. */
export declare function MissionCards({ fetchJson, fallbackCards, title, subtitle, theme, icons, character, renderAfterCards, onOpenShopping, onOpenStamps }: MissionCardsProps): React.JSX.Element;
