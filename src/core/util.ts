export const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export interface DelayRange {
  min: number;
  max: number;
}

/** Random duration within a range — never the same pause twice. */
export function randomDelay(range: DelayRange): number {
  if (!range || !(range.max >= range.min) || range.min < 0) {
    console.error('[CardMarket Helper] Invalid delay range, using 1s:', range);
    return 1000;
  }
  return range.min + Math.random() * (range.max - range.min);
}

/** European price string ("1.234,56 €") → number, mirroring model.parse_price. */
export function parsePrice(str: string | null | undefined): number | null {
  if (!str) return null;
  const cleaned = String(str).replace(/[^0-9,.]/g, '').replace(/\./g, '').replace(',', '.');
  const value = parseFloat(cleaned);
  return isNaN(value) ? null : value;
}

export function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

/** Serialize to pretty JSON and trigger a browser download. */
export function downloadJSON(data: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

/** Resolves once the DOM is parsed (immediately if it already is). */
export function domReady(): Promise<void> {
  if (document.readyState !== 'loading') return Promise.resolve();
  return new Promise((resolve) => document.addEventListener('DOMContentLoaded', () => resolve(), { once: true }));
}

/** Polls `test` until it returns a truthy value or the timeout elapses. */
export async function waitFor<T>(test: () => T | null | undefined | false, timeoutMs: number, intervalMs = 250): Promise<T | null> {
  const start = Date.now();
  for (;;) {
    const value = test();
    if (value) return value;
    if (Date.now() - start >= timeoutMs) return null;
    await sleep(intervalMs);
  }
}
