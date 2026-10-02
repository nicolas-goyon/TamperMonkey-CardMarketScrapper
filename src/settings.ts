/**
 * User settings, persisted in Tampermonkey storage (GM_setValue). The script
 * is installed and auto-updated as a whole, so the configuration can't live
 * in the script file anymore — it lives here and is edited from the
 * ⚙ Settings panel (src/ui/settingsModal.ts).
 */
import type { CardmarketHelperConfig } from './config';
import { storage } from './core/gm';

const KEY = 'settings';

export function loadUserConfig(): CardmarketHelperConfig {
  const saved = storage.get<CardmarketHelperConfig>(KEY);
  return saved && typeof saved === 'object' ? saved : {};
}

export function saveUserConfig(config: CardmarketHelperConfig): void {
  storage.set(KEY, config);
}

export function resetUserConfig(): void {
  storage.delete(KEY);
}
