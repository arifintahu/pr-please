import { GITHUB_REPO } from '../utils';

export const STAR_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const THOUSAND = 1000;
const TEN_THOUSAND = 10_000;

interface StarCache {
  count: number;
  ts: number;
}

export function formatStarCount(n: number): string {
  if (n < THOUSAND) return String(n);
  if (n < TEN_THOUSAND) return (n / THOUSAND).toFixed(1).replace(/\.0$/, '') + 'k';
  return Math.round(n / THOUSAND) + 'k';
}

export async function loadStarCount(badge: HTMLElement, force = false) {
  try {
    const cached = await chrome.storage.local.get('starCache');
    const entry = cached.starCache as StarCache | undefined;
    const now = Date.now();
    if (!force && entry && now - entry.ts < STAR_CACHE_TTL_MS) {
      badge.textContent = formatStarCount(entry.count);
      badge.hidden = false;
      return;
    }
    const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}`, {
      headers: { Accept: 'application/vnd.github+json' },
    });
    if (!res.ok) return;
    const data = await res.json();
    const count = typeof data.stargazers_count === 'number' ? data.stargazers_count : null;
    if (count === null) return;
    badge.textContent = formatStarCount(count);
    badge.hidden = false;
    await chrome.storage.local.set({ starCache: { count, ts: now } });
  } catch {
    // Network errors shouldn't block the settings UI.
  }
}
