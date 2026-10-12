/** 서버 POST apihub/entry → { ok, url } 또는 { ok:false, error }. 앱이 자기 요청 함수(토큰 · 재시도)를 넘긴다 */
export type EntryResult = {
    ok: true;
    url: string;
} | {
    ok: false;
    reason: 'off' | 'not_ready' | 'network' | 'invalid';
};
export type Requester = (path: string, options?: {
    method?: string;
    body?: unknown;
}) => Promise<unknown>;
/** 서버가 준 주소가 APIHUB 웹뷰 주소(https · 약속된 호스트 · entry.php)일 때만 쓴다 — 이상한 주소로 웹뷰를 열지 않는다 */
export declare function isEntryUrl(url: unknown): url is string;
export declare function fetchEntry(request: Requester, adId?: string): Promise<EntryResult>;
