# CardMarket Helper — Tampermonkey plugin

All the browser tools of cardmarket_helper in **one** Tampermonkey script:

| Tool | Where | What it does |
|---|---|---|
| Wishlist exporter | Wants pages (`/Magic/Wants/<id>`) | Downloads the list as `<account>_<name>_<id>.wishlist.json` |
| Offers scraper | Any Magic page | Pick one or more `.wishlist.json` files → merge recap (resolve conflicting requirements) → scrapes every card's offers into `offers_<id>.json` |
| Shopping-cart exporter | Shopping cart | Downloads `shopping_cart_<timestamp>.json` for `merge_and_report.py` |
| Cart filler | Seller Singles pages | Started by the optimizer report's **🛒 Add to Cart** buttons; adds the exact selected offers to the cart |

Everything is reached from a single **CM Helper** button in a corner of the page (also in the Tampermonkey menu). Long runs (scrape, cart fill) show a progress card with ETA and a Stop button; messages are toasts instead of blocking `alert()`s; the UI follows CardMarket's light/dark theme and lives in a shadow DOM so the site's CSS can't break it.

## Install (users)

1. Install [Tampermonkey](https://www.tampermonkey.net/).
2. Open [`../userscripts/cardmarket-helper.user.js`](../userscripts/cardmarket-helper.user.js) in the browser (or Tampermonkey → *Create a new script* and paste it) → **Install**.
3. Edit the `init({ ... })` config in that script if needed (seller country, speed, button corner, which tools are on). That's the only thing you ever edit.

Remove the old separate scripts (Wishlist Exporter, Offers Scraper, Shopping Cart Exporter, Cart Filler — now in `userscripts/legacy/`) if you had them: they'd add duplicate buttons. Finish or stop any scrape running in an old script first — Tampermonkey storage is per script, so the new one can't resume it.

Updates: the loader `@require`s `dist/cardmarket-helper.js` from the repository, so code updates never touch your config. Tampermonkey refreshes `@require`d files periodically (the *Externals* section of its settings, visible in *Advanced* config mode, controls how often); reinstalling or saving the loader also refetches them.

## Develop

Built on [Tampermonkey-MultiFile-Plugin-Template](../Tampermonkey-MultiFile-Plugin-Template): TypeScript across many files, bundled by esbuild into one IIFE exposed as `window.CardmarketHelper`.

```bash
cd tampermonkey
npm install
npm run typecheck     # tsc --noEmit
npm run build         # -> dist/cardmarket-helper.js
npm run build:watch   # rebuild on change (inline source map)
```

**`dist/cardmarket-helper.js` is committed** — it's what users' loaders download. Rebuild and commit it with every source change, and bump `version` in `package.json` (shown in the menu and the bundle banner).

To test local changes without pushing, enable *Allow access to file URLs* for Tampermonkey in the browser's extension settings and point the loader's `@require` at `file:///…/tampermonkey/dist/cardmarket-helper.js`.

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
    cartFiller.ts        #cmcartfill payload — contract with optimize_purchases.build_cart_fill_url and webapp app.js
    offersScraper/       index (file picker), recapModal, merge, runner (page-to-page state machine), parse, types
```

### Contracts to keep

- **JSON outputs** (`.wishlist.json`, `offers_*.json`, `shopping_cart_*.json`) are parsed by `cardmarket_helper/model.py` and `merge_and_report.py` — field names and shapes must not change.
- **`#cmcartfill=` payload** keys `v/seller/items` + `n,q,p,l,c,e,pv,f`.
- **Storage keys** `cardmarket_offers_state`, `cardmarket_offers_batch_state` (GM storage), `cmCartFillState`, `cardmarket_auto_export*` (sessionStorage), and the page-marker query params `cmscrape` / `cmcf`.

### Adding a tool

Create `src/features/<tool>.ts` exporting `setup<Tool>(config)`, register its launcher entry with `addAction({...})`, use `showJob()` for progress, `toast()` for messages, `openModal()` for dialogs; add a `features.<tool>` flag in `config.ts` and call it from `index.ts`. Document the new option in the loader.
