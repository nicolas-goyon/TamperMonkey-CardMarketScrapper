/**
 * Userscript entry point (bundled by scripts/build.mjs into
 * dist/cardmarket-helper.user.js): start the plugin with the settings saved
 * in Tampermonkey storage.
 */
import { init } from './index';
import { loadUserConfig } from './settings';

export * from './index';

init(loadUserConfig());
