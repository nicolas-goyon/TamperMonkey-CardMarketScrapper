# CardMarket Helper — Tampermonkey plugin


| Tool | Where | What it does |
|---|---|---|
| Wishlist exporter | Wants pages (`/Magic/Wants/<id>`) | Downloads the list as `<account>_<name>_<id>.wishlist.json` |
| Offers scraper | Any Magic page | Pick one or more `.wishlist.json` files → merge recap (resolve conflicting requirements) → scrapes every card's offers into `offers_<id>.json` |
| Shopping-cart exporter | Shopping cart | Downloads `shopping_cart_<timestamp>.json` for `merge_and_report.py` / the web app's cart comparison |
| Cart filler | Seller Singles pages | Started by the optimizer report's **🛒 Add to Cart** buttons; adds the exact selected offers to the cart |

It installs and **updates itself** from this repository's GitHub releases. Everything is reached from a single **CM Helper** button in a corner of the page (also in the Tampermonkey menu). Long runs show a progress card with ETA and a Stop button; messages are toasts instead of `alert()`s; the UI follows CardMarket's light/dark theme and lives in a shadow DOM.

## Install

1. Install [Tampermonkey](https://www.tampermonkey.net/).
2. Open **[https://github.com/nicolas-goyon/TamperMonkey-CardMarketScrapper/releases/latest/download/cardmarket-helper.user.js](https://github.com/nicolas-goyon/TamperMonkey-CardMarketScrapper/releases/latest/download/cardmarket-helper.user.js)** → Tampermonkey shows its install page → **Install**.
3. On cardmarket.com, **CM Helper → ⚙ Settings** (also in the Tampermonkey menu): seller country, scraper/cart-filler speed, enabled tools, button corner, theme… Saved in Tampermonkey's storage, applied on the next page load (*Save & reload*).

**Updates are automatic.** The script's `@updateURL` points at `cardmarket-helper.meta.js` of the latest GitHub release; Tampermonkey checks it periodically and installs any higher `@version` (to update right away: Tampermonkey dashboard → the script → check for updates). Your settings are not in the script file, so updates never touch them.

## Releases (CI)

`.github/workflows/release.yml`:

- Every push to `main` that touches `src/`, `package.json`/`package-lock.json`, `tsconfig.json` or `scripts/` typechecks, builds and publishes the next version:
  - very first release: the `version` of `package.json`;
  - then a **patch** bump by default, `[minor]` / `[major]` in a commit message for bigger bumps, `[skip release]` to publish nothing.
- The version is stamped into the userscript header (`@version`), which is what Tampermonkey compares to decide to update.
- A GitHub Release is created with `cardmarket-helper.user.js` (the script) and `cardmarket-helper.meta.js` (header only, polled by Tampermonkey) attached; it becomes the *latest* release that the install/update URLs point to. The tag also gets a CI-only commit containing `dist/`.
- Every push, pull request and manual run goes through the `check` job (typecheck + build, Node 24); the `release` job runs after it, only for pushes to `main` and manual runs.
- Manual run (Actions → *Run workflow*): cut a release with a chosen bump, or rebuild an existing tag in place.

## Develop

```bash
npm ci
npm run typecheck     # tsc --noEmit
npm run build         # -> dist/cardmarket-helper.user.js + .meta.js
npm run build:watch   # rebuild on change (inline source map)
```

To try local changes without releasing: disable the installed script, then create a new Tampermonkey script from `dist/cardmarket-helper.user.js` (or drag the file into the browser). Settings are per script in Tampermonkey storage, so the dev copy starts with defaults.

### Layout

```
src/
  main.ts                userscript entry: init(loadUserConfig())
  index.ts               init(config): mounts the UI, starts each enabled feature
  config.ts              Config type, defaults, speed presets (resolveConfig)
  settings.ts            user config in Tampermonkey storage (load/save/reset)
  global.d.ts            GM_* / unsafeWindow / __VERSION__ declarations
  core/                  No UI
    gm.ts                GM storage + menu wrappers (localStorage fallback outside Tampermonkey)
    cardmarket.ts        Language/condition ids, route detection, EN redirect, site theme
    util.ts              sleep, randomDelay, parsePrice, downloadJSON, waitFor…
  ui/                    Shadow-DOM UI kit, no business logic
    root.ts              Shadow root + corner "dock" + theme sync
    styles.ts            All CSS (light/dark variables)
    dom.ts               h() element builder (text is never parsed as HTML)
    launcher.ts          CM Helper button + action menu (features call addAction)
    jobPanel.ts          Progress card for long runs (showJob/hideJob)
    settingsModal.ts     ⚙ Settings panel
    modal.ts, toast.ts
  features/
    wishlistExporter.ts
    cartExporter.ts
    cartFiller.ts        #cmcartfill payload — contract with cardmarket_helper (build_cart_fill_url, webapp app.js)
    offersScraper/       index (file picker), recapModal, merge, runner (page-to-page state machine), parse, types
scripts/build.mjs        esbuild bundle + ==UserScript== header (@version, @updateURL/@downloadURL)
```

### Contracts with cardmarket_helper

- **JSON outputs** (`.wishlist.json`, `offers_*.json`, `shopping_cart_*.json`) are parsed by `cardmarket_helper/model.py` and `merge_and_report.py` — field names and shapes must not change.
- **`#cmcartfill=` payload** keys `v/seller/items` + `n,q,p,l,c,e,pv,f`.
- **Storage keys** `cardmarket_offers_state`, `cardmarket_offers_batch_state` (GM storage), `cmCartFillState`, `cardmarket_auto_export*` (sessionStorage), page-marker query params `cmscrape` / `cmcf`.

### Adding a tool

Create `src/features/<tool>.ts` exporting `setup<Tool>(config)`, register its launcher entry with `addAction({...})`, use `showJob()` for progress, `toast()` for messages, `openModal()` for dialogs; add a `features.<tool>` flag in `config.ts` (+ `DEFAULT_USER_CONFIG`), call it from `index.ts`, and add the toggle to `ui/settingsModal.ts`. A new `@grant` goes in the header in `scripts/build.mjs` (Tampermonkey asks the user to approve it on update).
