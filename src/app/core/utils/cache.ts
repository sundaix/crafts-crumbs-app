/* Same stale-while-revalidate cache idea as the website's cc_*_cache_vN keys.
   Wrapped in two tiny helpers so it can be swapped for @capacitor/preferences
   later without touching any service. If you change a cached data shape,
   bump the version in the key (e.g. _v2 -> _v3). */
export function readCache<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function writeCache(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage full / blocked: safe to skip
  }
}
