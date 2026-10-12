/** 서버 POST apihub/entry → { ok, url } 또는 { ok:false, error }. 앱이 자기 요청 함수(토큰 · 재시도)를 넘긴다 */
export type EntryResult =
  | { ok: true; url: string }
  | { ok: false; reason: 'off' | 'not_ready' | 'network' | 'invalid' };

export type Requester = (path: string, options?: { method?: string; body?: unknown }) => Promise<unknown>;

const OK_HOSTS = ['service.mocation.co.kr', 'test.mocation.co.kr'];

/** 서버가 준 주소가 APIHUB 웹뷰 주소(https · 약속된 호스트 · entry.php)일 때만 쓴다 — 이상한 주소로 웹뷰를 열지 않는다 */
export function isEntryUrl(url: unknown): url is string {
  if (typeof url !== 'string') return false;
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && OK_HOSTS.includes(u.hostname) && u.pathname === '/alwayz/entry.php';
  } catch { return false; }
}

export async function fetchEntry(request: Requester, adId?: string): Promise<EntryResult> {
  let r: unknown;
  try {
    r = await request('apihub/entry', { method: 'POST', body: adId ? { adId } : {} });
  } catch (e) {
    const status = (e as { status?: unknown } | null)?.status;
    const code = (e as { error?: unknown; data?: { error?: unknown } } | null);
    const err = String(code?.error ?? code?.data?.error ?? '');
    if (status === 404 || err === 'off') return { ok: false, reason: 'off' };
    if (status === 503 || err === 'not_ready') return { ok: false, reason: 'not_ready' };
    return { ok: false, reason: 'network' };
  }
  const j = r as { ok?: unknown; url?: unknown; error?: unknown } | null;
  if (j?.ok === true && isEntryUrl(j.url)) return { ok: true, url: j.url };
  if (j?.error === 'off') return { ok: false, reason: 'off' };
  if (j?.error === 'not_ready') return { ok: false, reason: 'not_ready' };
  return { ok: false, reason: 'invalid' };
}
