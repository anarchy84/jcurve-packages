"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isEntryUrl = isEntryUrl;
exports.fetchEntry = fetchEntry;
const OK_HOSTS = ['service.mocation.co.kr', 'test.mocation.co.kr'];
/** 서버가 준 주소가 APIHUB 웹뷰 주소(https · 약속된 호스트 · entry.php)일 때만 쓴다 — 이상한 주소로 웹뷰를 열지 않는다 */
function isEntryUrl(url) {
    if (typeof url !== 'string')
        return false;
    try {
        const u = new URL(url);
        return u.protocol === 'https:' && OK_HOSTS.includes(u.hostname) && u.pathname === '/alwayz/entry.php';
    }
    catch {
        return false;
    }
}
async function fetchEntry(request, adId) {
    let r;
    try {
        r = await request('apihub/entry', { method: 'POST', body: adId ? { adId } : {} });
    }
    catch (e) {
        const status = e?.status;
        const code = e;
        const err = String(code?.error ?? code?.data?.error ?? '');
        if (status === 404 || err === 'off')
            return { ok: false, reason: 'off' };
        if (status === 503 || err === 'not_ready')
            return { ok: false, reason: 'not_ready' };
        return { ok: false, reason: 'network' };
    }
    const j = r;
    if (j?.ok === true && isEntryUrl(j.url))
        return { ok: true, url: j.url };
    if (j?.error === 'off')
        return { ok: false, reason: 'off' };
    if (j?.error === 'not_ready')
        return { ok: false, reason: 'not_ready' };
    return { ok: false, reason: 'invalid' };
}
