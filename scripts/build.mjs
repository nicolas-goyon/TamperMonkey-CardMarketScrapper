import { build, context } from 'esbuild';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const watch = process.argv.includes('--watch');
const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));

// GitHub repo (from package.json "repository") — release assets are served at
// <repo>/releases/latest/download/<file>, always pointing at the newest release.
const repoUrl = (pkg.repository?.url || pkg.repository || '').replace(/^git\+/, '').replace(/\.git$/, '');
if (!/^https:\/\/github\.com\/[^/]+\/[^/]+$/.test(repoUrl)) {
  throw new Error(`package.json "repository" must be a https://github.com/<owner>/<repo> URL (got "${repoUrl}")`);
}
const latest = (file) => `${repoUrl}/releases/latest/download/${file}`;

const OUT = 'cardmarket-helper';
const userJs = path.join(root, 'dist', `${OUT}.user.js`);
const metaJs = path.join(root, 'dist', `${OUT}.meta.js`);

// Tampermonkey reads this header to install the script, and re-downloads the
// small .meta.js (@updateURL) periodically: when its @version is higher than
// the installed one, it fetches @downloadURL — so every GitHub release is
// picked up automatically. The user's configuration lives in Tampermonkey
// storage (⚙ Settings), not in this file, so updates never overwrite it.
const header = [
  '// ==UserScript==',
  '// @name         CardMarket Helper',
  `// @namespace    ${repoUrl}`,
  `// @version      ${pkg.version}`,
  `// @description  ${pkg.description}`,
  '// @author       nicolas-goyon',
  `// @homepageURL  ${repoUrl}`,
  `// @supportURL   ${repoUrl}/issues`,
  '// @match        https://www.cardmarket.com/*',
  '// @icon         https://www.cardmarket.com/favicon.ico',
  '// @noframes',
  '// @run-at       document-idle',
  '// @grant        GM_getValue',
  '// @grant        GM_setValue',
  '// @grant        GM_deleteValue',
  '// @grant        GM_registerMenuCommand',
  `// @updateURL    ${latest(`${OUT}.meta.js`)}`,
  `// @downloadURL  ${latest(`${OUT}.user.js`)}`,
  '// ==/UserScript==',
].join('\n');

const options = {
  bundle: true,
  format: 'iife',
  target: 'es2020',
  sourcemap: watch ? 'inline' : false,
  logLevel: 'info',
  entryPoints: [path.join(root, 'src', 'main.ts')],
  outfile: userJs,
  globalName: 'CardmarketHelper',
  define: { __VERSION__: JSON.stringify(pkg.version) },
  banner: {
    js: `${header}\n\n/*! CardMarket Helper v${pkg.version} — built file, do not edit — ${repoUrl} */`,
  },
  // In the Tampermonkey sandbox the IIFE's `var CardmarketHelper` stays local;
  // expose it for debugging from the console.
  footer: {
    js: `if (typeof window !== 'undefined') { window.CardmarketHelper = CardmarketHelper; }`,
  },
};

function writeMeta() {
  mkdirSync(path.dirname(metaJs), { recursive: true });
  writeFileSync(metaJs, header + '\n');
}

async function run() {
  writeMeta();
  if (watch) {
    const ctx = await context(options);
    await ctx.watch();
    console.log(`[watch] -> dist/${OUT}.user.js`);
  } else {
    await build(options);
    console.log(`[build] -> dist/${OUT}.user.js + dist/${OUT}.meta.js v${pkg.version}`);
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
