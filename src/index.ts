/**
 * Plugin API. The userscript entry point is src/main.ts, which calls
 * init(loadUserConfig()) — the configuration lives in Tampermonkey storage and
 * is edited from the ⚙ Settings panel, so the script itself can auto-update.
 * Also exposed as window.CardmarketHelper (handy for debugging/tests).
 *
 * Layout: core/ (Tampermonkey + CardMarket glue, no UI), ui/ (shadow-DOM UI
 * kit: launcher, job panel, modal, toasts, settings), features/ (one module per tool).
 */
import { CardmarketHelperConfig, resolveConfig } from './config';
import { registerMenuCommand } from './core/gm';
import { domReady } from './core/util';
import { setupCartExporter } from './features/cartExporter';
import { setupCartFiller } from './features/cartFiller';
import { setupOffersScraper } from './features/offersScraper';
import { setupWishlistExporter } from './features/wishlistExporter';
import { addAction, installLauncher, toggleMenu } from './ui/launcher';
import { openSettings } from './ui/settingsModal';
import { mountUI } from './ui/root';

export type { CardmarketHelperConfig } from './config';
export const version = __VERSION__;

let initialized = false;

export function init(userConfig: CardmarketHelperConfig = {}): void {
  if (initialized) return;
  if (window.self !== window.top) return; // skip iframes
  initialized = true;

  const config = resolveConfig(userConfig);
  if (config.debug) console.log('[CardMarket Helper] v%s config', version, config);

  void domReady().then(() => {
    mountUI(config);
    installLauncher(version);
    registerMenuCommand('Open CardMarket Helper', () => toggleMenu(true));
    registerMenuCommand('Settings', () => openSettings(version));
    addAction({
      id: 'settings',
      section: 'Tools',
      icon: '⚙️',
      label: 'Settings',
      description: 'Seller country, speed, enabled tools, button position…',
      run: () => openSettings(version),
    });

    const setups: Array<[keyof typeof config.features, () => void]> = [
      ['wishlistExporter', () => setupWishlistExporter()],
      ['cartExporter', () => setupCartExporter()],
      ['offersScraper', () => setupOffersScraper(config)],
      ['cartFiller', () => setupCartFiller(config)],
    ];
    for (const [feature, setup] of setups) {
      if (!config.features[feature]) continue;
      try {
        setup();
      } catch (e) {
        console.error(`[CardMarket Helper] ${feature} failed to start:`, e);
      }
    }
  });
}
