"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseBridgeMessage = parseBridgeMessage;
exports.openAppTarget = openAppTarget;
const policy_1 = require("./policy");
const str = (v) => (typeof v === 'string' ? v : undefined);
/** react-native-webview 의 onMessage 문자열 → 알려진 메시지. 우리가 심은 shim 이 보낸 것만 받는다(다른 글은 null) */
function parseBridgeMessage(data) {
    if (typeof data !== 'string' || data.length > 20000)
        return null;
    let j;
    try {
        j = JSON.parse(data);
    }
    catch {
        return null;
    }
    if (!j || typeof j !== 'object' || j.m !== 'MocationNativeBridge')
        return null;
    const method = j.method;
    const p = (j.params ?? {});
    switch (method) {
        case 'openAppTarget': {
            const url = str(p.url);
            if (!url)
                return null;
            const fallbackUrl = str(p.fallbackUrl);
            return { method, params: fallbackUrl ? { url, fallbackUrl } : { url } };
        }
        case 'showFloatingPopup': {
            const imageUrl = str(p.imageUrl), name = str(p.name), price = str(p.price);
            if (imageUrl === undefined || name === undefined || price === undefined)
                return null;
            const d = Number(p.durationSec);
            return { method, params: { imageUrl, name, price, durationSec: Number.isFinite(d) && d > 0 ? Math.floor(d) : 300 } }; // 미전달 · 0 이하 · 숫자 아님이면 300초
        }
        case 'requestOverlayPermission':
        case 'hasOverlayPermission':
            return { method, params: {} };
        default:
            return null;
    }
}
/**
 * openAppTarget — 못 열면 fallbackUrl(스토어 링크 등). 막힌 주소는 열지 않는다.
 * openURL 은 앱이 넘긴다(Linking.openURL). 열었으면 true.
 */
async function openAppTarget(params, openURL) {
    const target = (0, policy_1.resolveTarget)(params.url, params.fallbackUrl);
    if (!target)
        return false;
    try {
        await openURL(target.url);
        return true;
    }
    catch {
        if (!target.fallbackUrl)
            return false;
        try {
            await openURL(target.fallbackUrl);
            return true;
        }
        catch {
            return false;
        }
    }
}
