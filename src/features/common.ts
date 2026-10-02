import { englishUrl, isEnglishVersion } from '../core/cardmarket';
import { tabStorage } from '../core/gm';
import { toast } from '../ui/toast';

/**
 * Exports parse English labels. On another language, flag the export in the
 * tab's sessionStorage, reload on /en/, and let the feature resume it.
 * Returns true when a redirect was started (caller should stop).
 */
export function ensureEnglishForExport(flagKey: string): boolean {
  if (isEnglishVersion()) return false;
  tabStorage.setFlag(flagKey);
  toast('info', 'Switching to the English version of this page — the export resumes automatically.', { duration: 3000 });
  setTimeout(() => {
    window.location.href = englishUrl();
  }, 600);
  return true;
}

/** Consume the "resume export after language switch" flag. */
export function takeResumeFlag(flagKey: string): boolean {
  if (!tabStorage.getFlag(flagKey)) return false;
  // Remove immediately so a failing export doesn't retry on every page load
  tabStorage.delete(flagKey);
  return true;
}

export function safeFilePart(value: string, maxLength = 50): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, maxLength);
}
