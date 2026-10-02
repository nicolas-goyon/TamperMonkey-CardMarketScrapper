export {};

declare global {
  /** Injected by esbuild (scripts/build.mjs) from package.json's version. */
  const __VERSION__: string;

  /**
   * Provided by Tampermonkey via @grant unsafeWindow. Absent outside a
   * userscript context, hence the optional typing.
   */
  const unsafeWindow: (Window & typeof globalThis) | undefined;

  // GM_* APIs: available when the loader @grants them. Every call site goes
  // through src/core/gm.ts, which checks `typeof GM_x === 'function'` first
  // and falls back to localStorage so the bundle also runs in a plain page
  // (handy for testing).
  function GM_getValue<T = unknown>(key: string, defaultValue?: T): T;
  function GM_setValue(key: string, value: unknown): void;
  function GM_deleteValue(key: string): void;
  function GM_registerMenuCommand(name: string, callback: () => void, accessKey?: string): number;
  const GM_info: { script: { name: string; version: string } } | undefined;

  interface Window {
    CardmarketHelper?: unknown;
  }
}
