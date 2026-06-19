export interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export const browserLocalStorage: StorageAdapter = {
  getItem: (key) => localStorage.getItem(key),
  setItem: (key, value) => {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* quota */
    }
  },
  removeItem: (key) => localStorage.removeItem(key),
};

export function loadJson<T>(
  adapter: StorageAdapter,
  key: string,
  fallback: T,
): T {
  try {
    const raw = adapter.getItem(key);
    if (raw == null || raw === "") return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function saveJson<T>(
  adapter: StorageAdapter,
  key: string,
  value: T,
): void {
  saveJsonToAdapter(adapter, key, value);
}

export function saveJsonToAdapter<T>(
  adapter: StorageAdapter,
  key: string,
  value: T,
): void {
  try {
    adapter.setItem(key, JSON.stringify(value));
  } catch {
    /* quota */
  }
}
