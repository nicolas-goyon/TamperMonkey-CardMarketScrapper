/**
 * Tampermonkey glue. Each wrapper uses the GM_* function when the loader
 * granted it and degrades gracefully otherwise (localStorage / no-op), so the
 * bundle never throws just because a @grant line is missing.
 */

const LS_PREFIX = 'cmh:';

export function hasGM(name: 'GM_getValue' | 'GM_setValue' | 'GM_deleteValue' | 'GM_registerMenuCommand'): boolean {
  try {
    switch (name) {
      case 'GM_getValue':
        return typeof GM_getValue === 'function';
      case 'GM_setValue':
        return typeof GM_setValue === 'function';
      case 'GM_deleteValue':
        return typeof GM_deleteValue === 'function';
      case 'GM_registerMenuCommand':
        return typeof GM_registerMenuCommand === 'function';
    }
  } catch {
    return false;
  }
}

/** Cross-tab persistent storage (GM storage, localStorage fallback). */
export const storage = {
  get<T>(key: string): T | undefined {
    if (hasGM('GM_getValue')) return GM_getValue<T | undefined>(key, undefined);
    try {
      const raw = localStorage.getItem(LS_PREFIX + key);
      return raw === null ? undefined : (JSON.parse(raw) as T);
    } catch {
      return undefined;
    }
  },
  set(key: string, value: unknown): void {
    if (hasGM('GM_setValue')) {
      GM_setValue(key, value);
      return;
    }
    try {
      localStorage.setItem(LS_PREFIX + key, JSON.stringify(value));
    } catch (e) {
      console.error('[CardMarket Helper] Could not persist', key, e);
    }
  },
  delete(key: string): void {
    if (hasGM('GM_deleteValue')) {
      GM_deleteValue(key);
      return;
    }
    try {
      localStorage.removeItem(LS_PREFIX + key);
    } catch {
      /* ignore */
    }
  },
};

/** Per-tab storage that survives navigation (the page's sessionStorage). */
export const tabStorage = {
  get<T>(key: string): T | null {
    try {
      const raw = sessionStorage.getItem(key);
      return raw === null ? null : (JSON.parse(raw) as T);
    } catch {
      return null;
    }
  },
  set(key: string, value: unknown): void {
    sessionStorage.setItem(key, JSON.stringify(value));
  },
  delete(key: string): void {
    sessionStorage.removeItem(key);
  },
  /** Raw flag helpers (kept string-valued for compatibility with the old scripts). */
  getFlag(key: string): boolean {
    try {
      return sessionStorage.getItem(key) !== null;
    } catch {
      return false;
    }
  },
  setFlag(key: string): void {
    sessionStorage.setItem(key, 'true');
  },
};

/** Adds an entry to the Tampermonkey menu; no-op outside a userscript context. */
export function registerMenuCommand(label: string, onCommand: () => void): void {
  if (hasGM('GM_registerMenuCommand')) GM_registerMenuCommand(label, onCommand);
}
