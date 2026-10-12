/**
 * 웹뷰가 열어 달라고 하는 주소(openAppTarget)를 거르는 규칙 — APIHUB 가이드 「블랙리스트 방식」.
 * javascript: data: file: content: about: blob: 만 막고, naversearchapp:// · coupang:// 같은 앱 스킴과 intent:// 는 그대로 연다.
 */
export const BLOCKED_SCHEMES = ['javascript', 'data', 'file', 'content', 'about', 'blob'] as const;

/** 주소의 스킴(소문자). 없거나 이상하면 null. 앞뒤 공백 · 제어 문자 제거 후 본다(「java\tscript:」 같은 우회 방지) */
export function schemeOf(url: string): string | null {
  const clean = String(url ?? '').replace(/[\u0000- \u007f]/g, '');
  const m = /^([a-z][a-z0-9+.-]*):/i.exec(clean);
  return m ? m[1].toLowerCase() : null;
}

export function isBlocked(url: unknown): boolean {
  if (typeof url !== 'string' || url.trim() === '') return true;
  const s = schemeOf(url);
  return s === null || (BLOCKED_SCHEMES as readonly string[]).includes(s);
}

export type Target = { url: string; fallbackUrl?: string };

/**
 * 열 주소를 앱이 열 수 있는 모양으로 바꾼다.
 *  - intent://host/path#Intent;scheme=xxx;package=yyy;S.browser_fallback_url=zzz;end → xxx://host/path (+ 폴백 zzz)
 *  - market://details?id=… → https://play.google.com/store/apps/details?id=…
 * 막힌 주소면 null.
 */
export function resolveTarget(rawUrl: unknown, fallbackUrl?: unknown): Target | null {
  if (typeof rawUrl !== 'string' || isBlocked(rawUrl)) return null;
  let url = rawUrl.trim();
  let fallback = typeof fallbackUrl === 'string' && !isBlocked(fallbackUrl) ? fallbackUrl.trim() : undefined;

  if (schemeOf(url) === 'intent') {
    const hash = url.indexOf('#Intent;');
    const body = hash >= 0 ? url.slice(hash + '#Intent;'.length) : '';
    const parts: Record<string, string> = {};
    for (const piece of body.split(';')) {
      const eq = piece.indexOf('=');
      if (eq > 0) parts[piece.slice(0, eq)] = piece.slice(eq + 1);
    }
    const scheme = parts.scheme;
    const browserFallback = parts['S.browser_fallback_url'];
    if (browserFallback) {
      let decoded = browserFallback;
      try { decoded = decodeURIComponent(browserFallback); } catch { /* 그대로 */ }
      if (!isBlocked(decoded) && !fallback) fallback = decoded;
    }
    const rest = (hash >= 0 ? url.slice(0, hash) : url).replace(/^intent:/i, '');
    if (!scheme || isBlocked(scheme + '://') || !/^[a-z][a-z0-9+.-]*$/i.test(scheme)) {
      // 열 앱 스킴을 알 수 없다 — 폴백만 있으면 폴백으로
      return fallback ? { url: fallback } : null;
    }
    url = scheme + ':' + rest;
  }

  if (schemeOf(url) === 'market') {
    url = url.replace(/^market:\/\//i, 'https://play.google.com/store/apps/');
  }
  return fallback ? { url, fallbackUrl: fallback } : { url };
}

export function isWebUrl(url: string): boolean {
  const s = schemeOf(url);
  return s === 'http' || s === 'https';
}
