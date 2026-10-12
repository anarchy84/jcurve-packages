import React from 'react';
import { type BridgeMessage } from './bridge';
import { type MissionTheme } from './states';
export type MissionEvent = 'mission_open' | 'mission_loaded' | 'mission_error' | 'mission_target_open' | 'mission_target_blocked' | 'mission_overlay_request' | 'mission_floating_popup';
export type MissionWebViewProps = {
    /** 서버 apihub/entry 가 준 웹뷰 주소(fetchEntry 결과) */
    url: string;
    theme?: MissionTheme;
    onClose?: () => void;
    /** 계측 — 패키지는 아무 데도 보내지 않는다(앱이 자기 track 으로) */
    onEvent?: (name: MissionEvent, props?: Record<string, unknown>) => void;
    /** 페이지가 showFloatingPopup 을 불렀을 때(오버레이는 네이티브 빌드에서만 — 이 판은 알리기만) */
    onFloatingPopup?: (params: Extract<BridgeMessage, {
        method: 'showFloatingPopup';
    }>['params']) => void;
    /** 페이지가 「다른 앱 위에 표시」 권한을 요청했을 때 */
    onOverlayRequest?: () => void;
    /** 네이티브 오버레이가 들어간 빌드면 true(hasOverlayPermission 응답) */
    overlayReady?: boolean;
};
export declare function MissionWebView({ url, theme, onClose, onEvent, onFloatingPopup, onOverlayRequest, overlayReady }: MissionWebViewProps): React.JSX.Element;
