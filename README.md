# CardMarket Helper — Tampermonkey plugin

Browser side of [cardmarket_helper](https://gitlab.com/Nagatwin/cardmarket_helper) (the Gurobi purchase optimizer): all the CardMarket tools in **one** Tampermonkey script.

| Tool | Where | What it does |
|---|---|---|
| Wishlist exporter | Wants pages (`/Magic/Wants/<id>`) | Downloads the list as `<account>_<name>_<id>.wishlist.json` |
| Offers scraper | Any Magic page | Pick one or more `.wishlist.json` files → merge recap (resolve conflicting requirements) → scrapes every card's offers into `offers_<id>.json` |
| Shopping-cart exporter | Shopping cart | Downloads `shopping_cart_<timestamp>.json` for `merge_and_report.py` / the web app's cart comparison |
| Cart filler | Seller Singles pages | Started by the optimizer report's **🛒 Add to Cart** buttons; adds the exact selected offers to the cart |

Everything is reached from a single **CM Helper** button in a corner of the page (also in the Tampermonkey menu). Long runs show a progress card with ETA and a Stop button; messages are toasts instead of `alert()`s; the UI follows CardMarket's light/dark theme and lives in a shadow DOM.

## Install

1. Install [Tampermonkey](https://www.tampermonkey.net/).
2. Open [`examples/cardmarket-helper.user.js`](examples/cardmarket-helper.user.js) (raw) → **Install** — or Tampermonkey → *Create a new script* and paste it.
3. Set the `@require` tag to the latest [release](../../releases) (e.g. `@v1.0.3`) and adjust the `init({ ... })` config. That loader is the only thing you ever edit.

The bundle is served by jsDelivr from the release tags:

```
https://cdn.jsdelivr.net/gh/nicolas-goyon/TamperMonkey-CardMarketScrapper@vX.Y.Z/dist/cardmarket-helper.js
```

Always pin an exact tag: jsDelivr caches branches and version ranges for days. Each GitHub Release lists its exact `@require` line.

Several setups side by side (e.g. a safe and a fast scraper)? Install the loader twice with different `@name`/`@namespace` and configs — they share the same bundle.

## Releases (CI)

`.github/workflows/release.yml`, same pattern as [Tampermonkey-MultiFile-Plugin-Template](https://github.com/nicolas-goyon/Tampermonkey-MultiFile-Plugin-Template):

- Every push to `main` that touches `src/`, `package.json`/`package-lock.json`, `tsconfig.json` or `scripts/` typechecks, builds and publishes the next tag:
  - very first release: the `version` of `package.json` (`v1.0.0`);
  - then a **patch** bump by default, `[minor]` / `[major]` in a commit message for bigger bumps, `[skip release]` to publish nothing.
- The tag points at a CI-only commit that adds `dist/` (`main` never contains build output — `dist/` is git-ignored). The version is stamped into the bundle banner and the CM Helper menu.
- A GitHub Release is created with the bundle attached and the `@require` line to use.
- Pull requests to `main` are typechecked and built, nothing is published.
- Manual run (Actions → *Run workflow*): cut a release with a chosen bump, or rebuild an existing tag in place.

## Develop

```bash
npm ci
npm run typecheck     # tsc --noEmit
npm run build         # -> dist/cardmarket-helper.js (git-ignored)
npm run build:watch   # rebuild on change (inline source map)
```

To try local changes without releasing: enable *Allow access to file URLs* for Tampermonkey in the browser's extension settings and point the loader's `@require` at `file:///…/dist/cardmarket-helper.js`.

### Layout

```
src/
  index.ts               init(config): mounts the UI, starts each enabled feature
  config.ts              Config type, defaults, speed presets (resolveConfig)
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
    modal.ts, toast.ts
  features/
    wishlistExporter.ts
    cartExporter.ts
    cartFiller.ts        #cmcartfill payload — contract with cardmarket_helper (build_cart_fill_url, webapp app.js)
    offersScraper/       index (file picker), recapModal, merge, runner (page-to-page state machine), parse, types
examples/
  cardmarket-helper.user.js   the loader users install (config only)
```

### Contracts with cardmarket_helper

- **JSON outputs** (`.wishlist.json`, `offers_*.json`, `shopping_cart_*.json`) are parsed by `cardmarket_helper/model.py` and `merge_and_report.py` — field names and shapes must not change.
- **`#cmcartfill=` payload** keys `v/seller/items` + `n,q,p,l,c,e,pv,f`.
- **Storage keys** `cardmarket_offers_state`, `cardmarket_offers_batch_state` (GM storage), `cmCartFillState`, `cardmarket_auto_export*` (sessionStorage), page-marker query params `cmscrape` / `cmcf`.

### Adding a tool

Create `src/features/<tool>.ts` exporting `setup<Tool>(config)`, register its launcher entry with `addAction({...})`, use `showJob()` for progress, `toast()` for messages, `openModal()` for dialogs; add a `features.<tool>` flag in `config.ts`, call it from `index.ts`, and document the option in `examples/cardmarket-helper.user.js`.
