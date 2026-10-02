// ==UserScript==
// @name         CardMarket Helper
// @namespace    cardmarket-helper
// @version      1.0.0
// @description  Wishlist exporter, offers scraper, shopping-cart exporter and cart filler for cardmarket_helper — one script, configured below.
// @match        https://www.cardmarket.com/*
// @icon         https://www.cardmarket.com/favicon.ico
// @noframes
// @run-at       document-idle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @grant        GM_registerMenuCommand
// @require      https://cdn.jsdelivr.net/gh/nicolas-goyon/TamperMonkey-CardMarketScrapper@v1.0.0/dist/cardmarket-helper.js
// ==/UserScript==

// All the code lives in the @require'd bundle, built and published by this
// repository's CI on every vX.Y.Z tag. This file is only YOUR configuration:
// edit the values below, save, reload CardMarket. Delete a line to get its
// default back.
//
// Updating: change the version in the @require URL above (see the repo's
// Releases page for the latest tag) — always pin an exact tag, jsDelivr
// caches branches and version ranges for days.
//
// No @updateURL on purpose: Tampermonkey would overwrite your config.

window.CardmarketHelper.init({
  features: {
    wishlistExporter: true, // "Export this wishlist" on Wants pages
    offersScraper: true,    // "Scrape offers…" from .wishlist.json files
    cartExporter: true,     // "Export shopping cart" on the cart page
    cartFiller: true,       // "Add to Cart" buttons of the optimizer report
  },

  scraper: {
    sellerCountry: 12,        // CardMarket seller country id (12 = France), null = any country
    speed: 'balanced',        // 'safe' | 'balanced' | 'fast' (fast = higher rate-limit risk)
    expansionBatchSize: 5,    // printings fetched per page on /Cards/ pages
    autoDownloadEvery: 5,     // download partial results every N cards (0 = never)
    // delays: { cardNavigation: { min: 1000, max: 1500 } }, // fine-tune any delay (ms)
  },

  cartFiller: {
    speed: 'balanced',        // 'safe' | 'balanced' | 'fast'
  },

  ui: {
    position: 'bottom-right', // 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
    theme: 'auto',            // 'auto' follows CardMarket's light/dark mode
    // offset: { x: 0, y: 60 }, // move the button away from the corner (px)
  },

  debug: false,
});
