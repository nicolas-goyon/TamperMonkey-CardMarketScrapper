import { build, context } from 'esbuild';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const watch = process.argv.includes('--watch');
const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));

// Single bundle regrouping the whole plugin. The loader userscript
// (../userscripts/cardmarket-helper.user.js) @requires it and calls
// window.CardmarketHelper.init({ ...config }).
const entry = {
  in: path.join(root, 'src', 'index.ts'),
  out: 'cardmarket-helper',
  globalName: 'CardmarketHelper',
};

const options = {
  bundle: true,
  format: 'iife',
  target: 'es2020',
  // No external .map: Tampermonkey can't fetch it next to an @require'd
  // file. Watch builds inline one for local debugging instead.
  sourcemap: watch ? 'inline' : false,
  logLevel: 'info',
  entryPoints: [entry.in],
  outfile: path.join(root, 'dist', `${entry.out}.js`),
  globalName: entry.globalName,
  define: { __VERSION__: JSON.stringify(pkg.version) },
  banner: {
    js: `/*! CardMarket Helper v${pkg.version} — built bundle, do not edit: edit tampermonkey/src/ and run "npm run build". */`,
  },
  // Inside the Tampermonkey sandbox (any @grant != none), the top-level
  // `var CardmarketHelper` of the IIFE bundle stays local to the wrapper:
  // window.CardmarketHelper would be undefined. Attach it explicitly so
  // `window.CardmarketHelper.init(...)` works everywhere.
  footer: {
    js: `if (typeof window !== 'undefined') { window.${entry.globalName} = ${entry.globalName}; }`,
  },
};

async function run() {
  if (watch) {
    const ctx = await context(options);
    await ctx.watch();
    console.log(`[watch] -> dist/${entry.out}.js (window.${entry.globalName})`);
  } else {
    await build(options);
    console.log(`[build] -> dist/${entry.out}.js (window.${entry.globalName}) v${pkg.version}`);
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
