const clientCache = new Map<string, unknown>();

export function getClientCache<T>(key: string): T | null {
  return (clientCache.get(key) as T | undefined) ?? null;
}

export function setClientCache<T>(key: string, value: T): void {
  clientCache.set(key, value);
}

export function hasClientCache(key: string): boolean {
  return clientCache.has(key);
}
