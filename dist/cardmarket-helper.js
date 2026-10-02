/*! CardMarket Helper v1.0.0 — built bundle, do not edit: edit tampermonkey/src/ and run "npm run build". */
"use strict";
var CardmarketHelper = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/index.ts
  var src_exports = {};
  __export(src_exports, {
    init: () => init,
    version: () => version
  });

  // src/config.ts
  var SCRAPER_PRESETS = {
    safe: {
      initialPageLoad: { min: 3e3, max: 5e3 },
      betweenLoadMore: { min: 1500, max: 2500 },
      afterLoadingComplete: { min: 700, max: 1e3 },
      cardNavigation: { min: 2e3, max: 3e3 },
      firstScrape: { min: 200, max: 400 }
    },
    balanced: {
      initialPageLoad: { min: 2e3, max: 3e3 },
      betweenLoadMore: { min: 800, max: 1300 },
      afterLoadingComplete: { min: 400, max: 700 },
      cardNavigation: { min: 1e3, max: 1500 },
      firstScrape: { min: 100, max: 200 }
    },
    fast: {
      initialPageLoad: { min: 1e3, max: 1500 },
      betweenLoadMore: { min: 500, max: 800 },
      afterLoadingComplete: { min: 200, max: 400 },
      cardNavigation: { min: 500, max: 1e3 },
      firstScrape: { min: 50, max: 100 }
    }
  };
  var CART_FILLER_PRESETS = {
    safe: {
      initialPageLoad: { min: 2500, max: 4e3 },
      betweenCartAdds: { min: 1200, max: 2e3 },
      betweenNavigation: { min: 2e3, max: 3500 }
    },
    balanced: {
      initialPageLoad: { min: 1500, max: 2500 },
      betweenCartAdds: { min: 600, max: 1200 },
      betweenNavigation: { min: 1200, max: 2e3 }
    },
    fast: {
      initialPageLoad: { min: 800, max: 1300 },
      betweenCartAdds: { min: 300, max: 600 },
      betweenNavigation: { min: 600, max: 1e3 }
    }
  };
  function preset(table, speed) {
    return table[speed && speed in table ? speed : "balanced"];
  }
  function resolveConfig(input = {}) {
    const f = input.features ?? {};
    const s = input.scraper ?? {};
    const c = input.cartFiller ?? {};
    const u = input.ui ?? {};
    const corners = ["bottom-right", "bottom-left", "top-right", "top-left"];
    return {
      features: {
        wishlistExporter: f.wishlistExporter ?? true,
        offersScraper: f.offersScraper ?? true,
        cartExporter: f.cartExporter ?? true,
        cartFiller: f.cartFiller ?? true
      },
      scraper: {
        sellerCountry: s.sellerCountry === void 0 ? 12 : s.sellerCountry,
        expansionBatchSize: Math.max(1, Math.floor(s.expansionBatchSize ?? 5)),
        delays: { ...preset(SCRAPER_PRESETS, s.speed), ...s.delays ?? {} },
        autoDownloadEvery: Math.max(0, Math.floor(s.autoDownloadEvery ?? 5))
      },
      cartFiller: {
        delays: { ...preset(CART_FILLER_PRESETS, c.speed), ...c.delays ?? {} },
        cartUpdateTimeout: c.cartUpdateTimeout ?? 1e4,
        cartUpdatePoll: 500
      },
      ui: {
        position: u.position && corners.includes(u.position) ? u.position : "bottom-right",
        theme: u.theme ?? "auto",
        offset: { x: u.offset?.x ?? 0, y: u.offset?.y ?? 0 }
      },
      debug: !!input.debug
    };
  }

  // src/core/gm.ts
  var LS_PREFIX = "cmh:";
  function hasGM(name) {
    try {
      switch (name) {
        case "GM_getValue":
          return typeof GM_getValue === "function";
        case "GM_setValue":
          return typeof GM_setValue === "function";
        case "GM_deleteValue":
          return typeof GM_deleteValue === "function";
        case "GM_registerMenuCommand":
          return typeof GM_registerMenuCommand === "function";
      }
    } catch {
      return false;
    }
  }
  var storage = {
    get(key) {
      if (hasGM("GM_getValue")) return GM_getValue(key, void 0);
      try {
        const raw = localStorage.getItem(LS_PREFIX + key);
        return raw === null ? void 0 : JSON.parse(raw);
      } catch {
        return void 0;
      }
    },
    set(key, value) {
      if (hasGM("GM_setValue")) {
        GM_setValue(key, value);
        return;
      }
      try {
        localStorage.setItem(LS_PREFIX + key, JSON.stringify(value));
      } catch (e) {
        console.error("[CardMarket Helper] Could not persist", key, e);
      }
    },
    delete(key) {
      if (hasGM("GM_deleteValue")) {
        GM_deleteValue(key);
        return;
      }
      try {
        localStorage.removeItem(LS_PREFIX + key);
      } catch {
      }
    }
  };
  var tabStorage = {
    get(key) {
      try {
        const raw = sessionStorage.getItem(key);
        return raw === null ? null : JSON.parse(raw);
      } catch {
        return null;
      }
    },
    set(key, value) {
      sessionStorage.setItem(key, JSON.stringify(value));
    },
    delete(key) {
      sessionStorage.removeItem(key);
    },
    /** Raw flag helpers (kept string-valued for compatibility with the old scripts). */
    getFlag(key) {
      try {
        return sessionStorage.getItem(key) !== null;
      } catch {
        return false;
      }
    },
    setFlag(key) {
      sessionStorage.setItem(key, "true");
    }
  };
  function registerMenuCommand(label, onCommand) {
    if (hasGM("GM_registerMenuCommand")) GM_registerMenuCommand(label, onCommand);
  }

  // src/core/util.ts
  var sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  function randomDelay(range) {
    if (!range || !(range.max >= range.min) || range.min < 0) {
      console.error("[CardMarket Helper] Invalid delay range, using 1s:", range);
      return 1e3;
    }
    return range.min + Math.random() * (range.max - range.min);
  }
  function parsePrice(str) {
    if (!str) return null;
    const cleaned = String(str).replace(/[^0-9,.]/g, "").replace(/\./g, "").replace(",", ".");
    const value = parseFloat(cleaned);
    return isNaN(value) ? null : value;
  }
  function formatDuration(ms) {
    const minutes = Math.floor(ms / 6e4);
    const seconds = Math.floor(ms % 6e4 / 1e3);
    return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
  }
  function downloadJSON(data, filename) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1e3);
  }
  function errorMessage(e) {
    return e instanceof Error ? e.message : String(e);
  }
  function domReady() {
    if (document.readyState !== "loading") return Promise.resolve();
    return new Promise((resolve) => document.addEventListener("DOMContentLoaded", () => resolve(), { once: true }));
  }
  async function waitFor(test, timeoutMs, intervalMs = 250) {
    const start2 = Date.now();
    for (; ; ) {
      const value = test();
      if (value) return value;
      if (Date.now() - start2 >= timeoutMs) return null;
      await sleep(intervalMs);
    }
  }

  // src/core/cardmarket.ts
  var KNOWN_LANGUAGES = [
    "English",
    "French",
    "German",
    "Spanish",
    "Italian",
    "S-Chinese",
    "Japanese",
    "Portuguese",
    "Russian",
    "Korean",
    "T-Chinese"
  ];
  var LANGUAGE_IDS = {
    English: "1",
    French: "2",
    German: "3",
    Spanish: "4",
    Italian: "5",
    "S-Chinese": "6",
    Japanese: "7",
    Portuguese: "8",
    Russian: "9",
    Korean: "10",
    "T-Chinese": "11",
    Dutch: "12",
    Polish: "13",
    Czech: "14",
    Hungarian: "15",
    Indonesian: "16",
    Thai: "17"
  };
  var CONDITION_IDS = {
    Mint: "1",
    "Near Mint": "2",
    Excellent: "3",
    Good: "4",
    "Light Played": "5",
    Played: "6",
    Poor: "7"
  };
  function currentSiteLanguage() {
    const match = window.location.pathname.match(/^\/([a-z]{2})\//);
    return match ? match[1] : "en";
  }
  function isEnglishVersion() {
    return window.location.pathname.startsWith("/en/");
  }
  function englishUrl(href = window.location.href) {
    const lang = currentSiteLanguage();
    return lang === "en" ? href : href.replace(`/${lang}/`, "/en/");
  }
  var route = {
    wishlistId() {
      const match = window.location.pathname.match(/\/Wants\/(\d+)/);
      return match ? match[1] : null;
    },
    isShoppingCart() {
      return /\/(Shopping-Cart|ShoppingCart)/.test(window.location.pathname);
    },
    isMagic() {
      return /^\/[a-z]{2}\/Magic(\/|$)/.test(window.location.pathname);
    },
    /** Seller name on /Magic/Users/<seller>/Offers/Singles pages. */
    singlesSeller() {
      const match = window.location.pathname.match(/\/Magic\/Users\/([^/]+)\/Offers\/Singles/);
      return match ? decodeURIComponent(match[1]) : null;
    }
  };
  function siteIsDark() {
    const html = document.documentElement;
    return html.getAttribute("data-bs-theme") === "dark" || getComputedStyle(html).getPropertyValue("color-scheme").includes("dark");
  }

  // src/ui/dom.ts
  var PROP_KEYS = /* @__PURE__ */ new Set(["value", "checked", "disabled", "selected", "type", "title", "min", "max", "htmlFor", "id", "name", "placeholder", "multiple", "accept"]);
  function h(tag, props, ...children) {
    const el = document.createElement(tag);
    if (props) {
      for (const [key, value] of Object.entries(props)) {
        if (value === void 0 || value === null || value === false) continue;
        if (key === "class") el.className = String(value);
        else if (key === "style") {
          if (typeof value === "string") el.setAttribute("style", value);
          else Object.assign(el.style, value);
        } else if (key.startsWith("on") && typeof value === "function") {
          el.addEventListener(key.slice(2).toLowerCase(), value);
        } else if (PROP_KEYS.has(key)) {
          el[key] = value;
        } else {
          el.setAttribute(key, value === true ? "" : String(value));
        }
      }
    }
    append(el, children);
    return el;
  }
  function append(parent, children) {
    for (const child of children) {
      if (child === null || child === void 0 || child === false) continue;
      if (Array.isArray(child)) append(parent, child);
      else parent.appendChild(typeof child === "object" ? child : document.createTextNode(String(child)));
    }
  }
  function setChildren(el, ...children) {
    el.replaceChildren();
    append(el, children);
  }

  // src/ui/styles.ts
  var STYLES = `
:host { all: initial; }
:host {
  --cmh-accent: #1f5fd1;
  --cmh-accent-hover: #184fb0;
  --cmh-accent-soft: rgba(31, 95, 209, .10);
  --cmh-bg: #ffffff;
  --cmh-bg-2: #f5f7fa;
  --cmh-bg-3: #eceff4;
  --cmh-fg: #1d2330;
  --cmh-fg-muted: #5f6b7d;
  --cmh-border: #dde2ea;
  --cmh-success: #1e8e4e;
  --cmh-success-soft: rgba(30, 142, 78, .12);
  --cmh-warning: #b8690a;
  --cmh-warning-soft: rgba(230, 140, 20, .14);
  --cmh-danger: #c9343f;
  --cmh-danger-soft: rgba(201, 52, 63, .10);
  --cmh-shadow: 0 10px 30px rgba(17, 24, 39, .16), 0 2px 6px rgba(17, 24, 39, .08);
  --cmh-radius: 10px;
}
:host([data-theme="dark"]) {
  --cmh-accent: #5b8def;
  --cmh-accent-hover: #7aa3f2;
  --cmh-accent-soft: rgba(91, 141, 239, .16);
  --cmh-bg: #1b1e25;
  --cmh-bg-2: #22262f;
  --cmh-bg-3: #2b303b;
  --cmh-fg: #e7eaf0;
  --cmh-fg-muted: #9aa4b5;
  --cmh-border: #343a46;
  --cmh-success: #4cc27f;
  --cmh-success-soft: rgba(76, 194, 127, .14);
  --cmh-warning: #f0a83a;
  --cmh-warning-soft: rgba(240, 168, 58, .14);
  --cmh-danger: #f06470;
  --cmh-danger-soft: rgba(240, 100, 112, .14);
  --cmh-shadow: 0 10px 30px rgba(0, 0, 0, .5), 0 2px 6px rgba(0, 0, 0, .3);
}

* { box-sizing: border-box; }
.cmh { font: 13px/1.45 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; color: var(--cmh-fg); -webkit-font-smoothing: antialiased; }
button, input, select { font: inherit; color: inherit; }
button { cursor: pointer; }
button:disabled { cursor: not-allowed; opacity: .55; }
:focus-visible { outline: 2px solid var(--cmh-accent); outline-offset: 2px; }

/* ---------- dock (corner stack: launcher, menu, panels, toasts) ---------- */
.dock { position: fixed; z-index: 2147483000; display: flex; gap: 10px; pointer-events: none; max-height: calc(100vh - 32px); }
.dock > * { pointer-events: auto; }
.dock.bottom-right { right: 16px; bottom: 16px; flex-direction: column-reverse; align-items: flex-end; }
.dock.bottom-left  { left: 16px;  bottom: 16px; flex-direction: column-reverse; align-items: flex-start; }
.dock.top-right    { right: 16px; top: 16px;    flex-direction: column;         align-items: flex-end; }
.dock.top-left     { left: 16px;  top: 16px;    flex-direction: column;         align-items: flex-start; }

/* ---------- launcher ---------- */
.launcher { display: inline-flex; align-items: center; gap: 8px; height: 40px; padding: 0 14px 0 6px; border: none; border-radius: 999px;
  background: var(--cmh-accent); color: #fff; font-weight: 600; letter-spacing: .01em; box-shadow: var(--cmh-shadow); transition: background .15s, transform .15s; }
.launcher:hover { background: var(--cmh-accent-hover); }
.launcher:active { transform: translateY(1px); }
.launcher .logo { width: 28px; height: 28px; border-radius: 50%; background: rgba(255,255,255,.18); display: grid; place-items: center; }
.launcher .logo svg { width: 16px; height: 16px; }
.launcher .busy { display: none; font-weight: 500; font-size: 12px; background: rgba(255,255,255,.2); padding: 2px 8px; border-radius: 999px; }
.launcher.is-busy .busy { display: inline-block; }
.launcher.is-busy .logo { animation: cmh-pulse 1.6s ease-in-out infinite; }
@keyframes cmh-pulse { 50% { background: rgba(255,255,255,.38); } }

/* ---------- surfaces ---------- */
.surface { background: var(--cmh-bg); border: 1px solid var(--cmh-border); border-radius: var(--cmh-radius); box-shadow: var(--cmh-shadow); }

/* ---------- menu ---------- */
.menu { width: 320px; max-height: min(70vh, 560px); overflow: auto; padding: 6px; }
.menu[hidden] { display: none; }
.menu-head { display: flex; align-items: baseline; justify-content: space-between; padding: 8px 10px 6px; }
.menu-title { font-weight: 700; font-size: 14px; }
.menu-version { color: var(--cmh-fg-muted); font-size: 11px; }
.menu-section { padding: 8px 10px 4px; color: var(--cmh-fg-muted); font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .06em; }
.action { display: flex; width: 100%; gap: 10px; align-items: flex-start; text-align: left; padding: 8px 10px; border: none; border-radius: 8px; background: transparent; }
.action:hover:not(:disabled) { background: var(--cmh-bg-2); }
.action .ico { flex: none; width: 30px; height: 30px; border-radius: 8px; display: grid; place-items: center; background: var(--cmh-accent-soft); font-size: 15px; }
.action .txt { display: flex; flex-direction: column; min-width: 0; }
.action .label { font-weight: 600; }
.action .desc { color: var(--cmh-fg-muted); font-size: 12px; }
.menu-empty { padding: 6px 10px 10px; color: var(--cmh-fg-muted); font-size: 12px; }
.menu-foot { margin-top: 4px; padding: 8px 10px 4px; border-top: 1px solid var(--cmh-border); color: var(--cmh-fg-muted); font-size: 11px; }

/* ---------- job panel ---------- */
.panel { width: 340px; max-height: min(60vh, 520px); display: flex; flex-direction: column; overflow: hidden; }
.panel-head { display: flex; align-items: center; gap: 10px; padding: 12px 14px 8px; }
.panel-head .ico { flex: none; width: 30px; height: 30px; border-radius: 8px; display: grid; place-items: center; background: var(--cmh-accent-soft); font-size: 15px; }
.panel-head .titles { flex: 1; min-width: 0; }
.panel-title { font-weight: 700; font-size: 13.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.panel-sub { color: var(--cmh-fg-muted); font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.icon-btn { flex: none; border: none; background: transparent; color: var(--cmh-fg-muted); width: 28px; height: 28px; border-radius: 6px; font-size: 14px; }
.icon-btn:hover { background: var(--cmh-bg-2); color: var(--cmh-fg); }
.panel-body { padding: 0 14px 12px; overflow: auto; }
.panel.collapsed .panel-body, .panel.collapsed .panel-foot { display: none; }
.progress { height: 6px; border-radius: 999px; background: var(--cmh-bg-3); overflow: hidden; margin: 2px 0 8px; }
.progress > div { height: 100%; width: 0; background: var(--cmh-accent); border-radius: 999px; transition: width .3s; }
.progress.success > div { background: var(--cmh-success); }
.progress.warning > div { background: var(--cmh-warning); }
.stats { display: flex; flex-wrap: wrap; gap: 4px 14px; color: var(--cmh-fg-muted); font-size: 12px; }
.stats b { color: var(--cmh-fg); font-weight: 600; }
.status-line { margin-top: 8px; font-size: 12px; padding: 6px 8px; border-radius: 6px; background: var(--cmh-bg-2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.items { list-style: none; margin: 10px 0 0; padding: 0; display: flex; flex-direction: column; gap: 2px; }
.items li { display: flex; gap: 8px; align-items: baseline; padding: 4px 6px; border-radius: 6px; }
.items li.current { background: var(--cmh-accent-soft); }
.items .st { flex: none; width: 16px; text-align: center; }
.items .qty { flex: none; font-variant-numeric: tabular-nums; font-weight: 600; min-width: 34px; }
.items .name { min-width: 0; }
.items .detail { display: block; color: var(--cmh-fg-muted); font-size: 11px; }
.panel-foot { display: flex; gap: 8px; padding: 10px 14px; border-top: 1px solid var(--cmh-border); background: var(--cmh-bg-2); }

/* ---------- buttons ---------- */
.btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; height: 32px; padding: 0 14px; border-radius: 7px;
  border: 1px solid var(--cmh-border); background: var(--cmh-bg); font-weight: 600; text-decoration: none; color: var(--cmh-fg); white-space: nowrap; }
.btn:hover:not(:disabled) { background: var(--cmh-bg-2); }
.btn.primary { background: var(--cmh-accent); border-color: var(--cmh-accent); color: #fff; }
.btn.primary:hover:not(:disabled) { background: var(--cmh-accent-hover); }
.btn.danger { color: var(--cmh-danger); border-color: color-mix(in srgb, var(--cmh-danger) 45%, transparent); }
.btn.danger:hover:not(:disabled) { background: var(--cmh-danger-soft); }
.btn.grow { flex: 1; }
.btn.sm { height: 26px; padding: 0 10px; font-size: 12px; }

/* ---------- modal ---------- */
.overlay { position: fixed; inset: 0; z-index: 2147483100; background: rgba(10, 14, 22, .45); display: grid; place-items: center; padding: 24px; animation: cmh-fade .12s ease-out; }
@keyframes cmh-fade { from { opacity: 0; } }
.modal { width: min(560px, 100%); max-height: min(88vh, 900px); display: flex; flex-direction: column; overflow: hidden; }
.modal.wide { width: min(1100px, 100%); }
.modal-head { display: flex; align-items: flex-start; gap: 12px; padding: 18px 20px 12px; }
.modal-head .titles { flex: 1; }
.modal-title { font-size: 17px; font-weight: 700; margin: 0; }
.modal-sub { color: var(--cmh-fg-muted); margin-top: 2px; }
.modal-body { padding: 4px 20px 16px; overflow: auto; }
.modal-foot { display: flex; gap: 8px; justify-content: flex-end; align-items: center; padding: 12px 20px; border-top: 1px solid var(--cmh-border); background: var(--cmh-bg-2); }
.modal-foot .spacer { flex: 1; color: var(--cmh-fg-muted); font-size: 12px; }

/* ---------- toasts ---------- */
.toasts { display: flex; flex-direction: column; gap: 8px; width: 340px; }
.dock.top-right .toasts, .dock.top-left .toasts { flex-direction: column-reverse; }
.toast { display: flex; gap: 10px; align-items: flex-start; padding: 10px 10px 10px 12px; border-left: 4px solid var(--cmh-accent); animation: cmh-in .18s ease-out; }
@keyframes cmh-in { from { opacity: 0; transform: translateY(6px); } }
.toast.success { border-left-color: var(--cmh-success); }
.toast.warning { border-left-color: var(--cmh-warning); }
.toast.error { border-left-color: var(--cmh-danger); }
.toast .t-ico { flex: none; font-size: 15px; line-height: 1.3; }
.toast .t-body { flex: 1; min-width: 0; white-space: pre-line; word-break: break-word; }
.toast .t-title { font-weight: 600; }

/* ---------- content blocks ---------- */
.chips { display: flex; flex-wrap: wrap; gap: 6px; margin: 4px 0 14px; }
.chip { display: inline-flex; gap: 6px; align-items: center; padding: 4px 10px; border-radius: 999px; background: var(--cmh-bg-2); border: 1px solid var(--cmh-border); font-size: 12px; }
.chip .muted { color: var(--cmh-fg-muted); }
.callout { padding: 10px 12px; border-radius: 8px; margin: 0 0 12px; background: var(--cmh-accent-soft); }
.callout.warning { background: var(--cmh-warning-soft); color: var(--cmh-fg); }
.callout.success { background: var(--cmh-success-soft); }
.callout.danger { background: var(--cmh-danger-soft); }
.callout b { font-weight: 700; }
.kv { display: grid; grid-template-columns: auto 1fr; gap: 4px 12px; margin: 0 0 14px; }
.kv dt { color: var(--cmh-fg-muted); }
.kv dd { margin: 0; word-break: break-word; }
.muted { color: var(--cmh-fg-muted); }
.stack { display: flex; flex-direction: column; gap: 8px; }

table.grid { width: 100%; border-collapse: separate; border-spacing: 0; font-size: 12.5px; }
table.grid th { position: sticky; top: 0; z-index: 1; background: var(--cmh-bg-2); color: var(--cmh-fg-muted); font-weight: 600; text-align: left; padding: 7px 8px; border-bottom: 1px solid var(--cmh-border); white-space: nowrap; }
table.grid td { padding: 6px 8px; border-bottom: 1px solid var(--cmh-border); vertical-align: top; }
table.grid td.c, table.grid th.c { text-align: center; }
table.grid tr.conflict > td { background: var(--cmh-warning-soft); }
table.grid tr.conflict.resolved > td { background: var(--cmh-success-soft); }
table.grid tr.editor > td { background: var(--cmh-bg-2); padding: 12px; }
.table-wrap { max-height: 46vh; overflow: auto; border: 1px solid var(--cmh-border); border-radius: 8px; }
.badge { display: inline-block; padding: 1px 7px; border-radius: 999px; font-size: 11px; font-weight: 600; background: var(--cmh-bg-3); }
.badge.warning { background: var(--cmh-warning-soft); color: var(--cmh-warning); }
.badge.success { background: var(--cmh-success-soft); color: var(--cmh-success); }
.small { font-size: 11.5px; }

.editor-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 12px; margin-bottom: 10px; }
.field-label { font-size: 11px; font-weight: 600; color: var(--cmh-fg-muted); text-transform: uppercase; letter-spacing: .05em; margin-bottom: 4px; }
.checks { display: flex; flex-wrap: wrap; gap: 4px 12px; }
.checks label { display: inline-flex; gap: 5px; align-items: center; cursor: pointer; font-size: 12px; }
.control { height: 30px; padding: 0 8px; border-radius: 6px; border: 1px solid var(--cmh-border); background: var(--cmh-bg); color: var(--cmh-fg); }
input.control { width: 80px; }
.row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.row.between { justify-content: space-between; }
.dl-list { display: flex; flex-direction: column; gap: 8px; }
.dl-item { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border: 1px solid var(--cmh-border); border-radius: 8px; }
.dl-item .grow { flex: 1; min-width: 0; }
.dl-item .fname { font-weight: 600; word-break: break-all; }
`;

  // src/ui/root.ts
  var HOST_ID = "cardmarket-helper-root";
  var root = null;
  function getUIRoot() {
    if (!root) throw new Error("CardMarket Helper UI not mounted yet");
    return root;
  }
  function mountUI(config) {
    if (root) return root;
    document.getElementById(HOST_ID)?.remove();
    const host = document.createElement("div");
    host.id = HOST_ID;
    (document.body || document.documentElement).appendChild(host);
    const shadow = host.attachShadow({ mode: "open" });
    shadow.appendChild(h("style", null, STYLES));
    const applyTheme = () => {
      const dark = config.ui.theme === "dark" || config.ui.theme === "auto" && siteIsDark();
      host.setAttribute("data-theme", dark ? "dark" : "light");
    };
    applyTheme();
    if (config.ui.theme === "auto") {
      new MutationObserver(applyTheme).observe(document.documentElement, { attributes: true, attributeFilter: ["data-bs-theme", "class", "style"] });
    }
    const slots = {
      launcher: h("div", { class: "slot-launcher" }),
      menu: h("div", { class: "slot-menu" }),
      panel: h("div", { class: "slot-panel stack" }),
      toasts: h("div", { class: "toasts" })
    };
    const { x, y } = config.ui.offset;
    const pos = config.ui.position;
    const style = {};
    if (pos.includes("right")) style.right = `${16 + x}px`;
    else style.left = `${16 + x}px`;
    if (pos.includes("bottom")) style.bottom = `${16 + y}px`;
    else style.top = `${16 + y}px`;
    const dock = h("div", { class: `cmh dock ${pos}`, style }, slots.launcher, slots.menu, slots.panel, slots.toasts);
    const overlays = h("div", { class: "cmh" });
    shadow.append(dock, overlays);
    root = { shadow, dock, slots, overlays };
    return root;
  }

  // src/ui/launcher.ts
  var actions = [];
  var notes = [];
  var launcherBtn = null;
  var menuEl = null;
  var LOGO = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="11" height="15" rx="2"/><path d="M8 4.5 9.2 3.6a2 2 0 0 1 2.8.4l7.2 9.6a2 2 0 0 1-.4 2.8l-3.3 2.5"/></svg>`;
  function addAction(action) {
    actions.push(action);
    if (menuEl && !menuEl.hidden) renderMenu();
  }
  function addMenuNote(note) {
    notes.push(note);
  }
  function installLauncher(version2) {
    const { slots, dock } = getUIRoot();
    const logo = h("span", { class: "logo" });
    logo.innerHTML = LOGO;
    launcherBtn = h("button", {
      class: "launcher",
      type: "button",
      title: "CardMarket Helper",
      "aria-haspopup": "menu",
      "aria-expanded": "false",
      onClick: () => toggleMenu()
    }, logo, h("span", null, "CM Helper"), h("span", { class: "busy" }));
    slots.launcher.appendChild(launcherBtn);
    menuEl = h("div", { class: "surface menu", role: "menu", hidden: true });
    menuEl.dataset.version = version2;
    slots.menu.appendChild(menuEl);
    document.addEventListener("mousedown", (event) => {
      if (menuEl && !menuEl.hidden && !event.composedPath().includes(dock)) toggleMenu(false);
    }, true);
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && menuEl && !menuEl.hidden) toggleMenu(false);
    }, true);
  }
  function toggleMenu(open) {
    if (!menuEl || !launcherBtn) return;
    const show = open ?? menuEl.hidden;
    if (show) renderMenu();
    menuEl.hidden = !show;
    launcherBtn.setAttribute("aria-expanded", String(show));
  }
  function setLauncherBusy(badge) {
    if (!launcherBtn) return;
    launcherBtn.classList.toggle("is-busy", badge !== null);
    const busy = launcherBtn.querySelector(".busy");
    if (busy) busy.textContent = badge ?? "";
  }
  function renderMenu() {
    if (!menuEl) return;
    const sections = ["This page", "Tools"];
    const blocks = sections.map((section) => {
      const list = actions.filter((a) => a.section === section);
      if (list.length === 0 && section === "This page") {
        return [
          h("div", { class: "menu-section" }, section),
          h("div", { class: "menu-empty" }, "Nothing to do here. Open a wishlist (Wants) or your shopping cart to export it.")
        ];
      }
      if (list.length === 0) return [];
      return [h("div", { class: "menu-section" }, section), list.map(renderAction)];
    });
    setChildren(
      menuEl,
      h(
        "div",
        { class: "menu-head" },
        h("span", { class: "menu-title" }, "CardMarket Helper"),
        h("span", { class: "menu-version" }, `v${menuEl.dataset.version}`)
      ),
      blocks,
      notes.length ? h("div", { class: "menu-foot" }, notes.map((n) => h("div", null, n))) : null
    );
  }
  function renderAction(action) {
    const reason = action.disabledReason?.() ?? null;
    return h(
      "button",
      {
        class: "action",
        type: "button",
        role: "menuitem",
        disabled: reason !== null,
        title: reason ?? action.description ?? "",
        onClick: async () => {
          toggleMenu(false);
          await action.run();
        }
      },
      h("span", { class: "ico" }, action.icon),
      h(
        "span",
        { class: "txt" },
        h("span", { class: "label" }, action.label),
        h("span", { class: "desc" }, reason ?? action.description ?? "")
      )
    );
  }

  // src/ui/toast.ts
  var ICONS = { info: "\u2139\uFE0F", success: "\u2705", warning: "\u26A0\uFE0F", error: "\u274C" };
  function toast(kind, message, options = {}) {
    const { slots } = getUIRoot();
    const duration = options.duration ?? (kind === "warning" || kind === "error" ? 0 : 5e3);
    const close = () => el.remove();
    const el = h(
      "div",
      { class: `surface toast ${kind}`, role: kind === "error" ? "alert" : "status" },
      h("span", { class: "t-ico" }, ICONS[kind]),
      h(
        "div",
        { class: "t-body" },
        options.title ? h("div", { class: "t-title" }, options.title) : null,
        message
      ),
      h("button", { class: "icon-btn", title: "Dismiss", "aria-label": "Dismiss", onClick: close }, "\u2715")
    );
    slots.toasts.prepend(el);
    if (duration > 0) setTimeout(close, duration);
    const all = slots.toasts.querySelectorAll(".toast");
    for (let i = 5; i < all.length; i++) all[i].remove();
    return close;
  }

  // src/features/common.ts
  function ensureEnglishForExport(flagKey) {
    if (isEnglishVersion()) return false;
    tabStorage.setFlag(flagKey);
    toast("info", "Switching to the English version of this page \u2014 the export resumes automatically.", { duration: 3e3 });
    setTimeout(() => {
      window.location.href = englishUrl();
    }, 600);
    return true;
  }
  function takeResumeFlag(flagKey) {
    if (!tabStorage.getFlag(flagKey)) return false;
    tabStorage.delete(flagKey);
    return true;
  }
  function safeFilePart(value, maxLength = 50) {
    return value.replace(/[^a-zA-Z0-9_-]/g, "_").substring(0, maxLength);
  }

  // src/features/cartExporter.ts
  var RESUME_FLAG = "cardmarket_auto_export_cart";
  function strictPrice(text) {
    const value = parsePrice(text);
    if (value === null) throw new Error(`Failed to parse price: ${text}`);
    return value;
  }
  function extractLanguage(infoCell) {
    const spans = infoCell.querySelectorAll("span[data-bs-original-title], span[data-original-title], span[aria-label]");
    for (const span of Array.from(spans)) {
      for (const attr of ["data-bs-original-title", "data-original-title", "aria-label"]) {
        const label = span.getAttribute(attr);
        if (label && KNOWN_LANGUAGES.includes(label)) return label;
      }
    }
    throw new Error("Could not extract language from info cell");
  }
  function extractExpansion(infoCell) {
    const link = infoCell.querySelector("a.expansion-symbol");
    const expansion = link?.getAttribute("aria-label") || link?.getAttribute("data-bs-original-title");
    if (expansion) return expansion;
    throw new Error("Could not extract expansion from info cell");
  }
  function quantityOf(row) {
    const cell = row.querySelector("td.amount");
    if (!cell) throw new Error("Missing amount cell in row");
    const match = (cell.textContent ?? "").match(/(\d+)/);
    if (!match) throw new Error(`Could not parse quantity from: ${cell.textContent}`);
    return parseInt(match[1], 10);
  }
  function extractCart() {
    const cards = [];
    let failedRows = 0;
    let failedSellers = 0;
    document.querySelectorAll('section[id^="seller"]').forEach((section) => {
      try {
        const seller = section.querySelector('a[href*="/Users/"]')?.textContent?.trim();
        if (!seller) throw new Error("Could not extract seller name from section");
        const ds = section.dataset;
        const articleCount = parseInt(ds.articleCount ?? "", 10);
        const itemValue = parseFloat(ds.itemValue ?? "");
        const shipping = parseFloat(ds.shipCost || ds.shippingPrice || "");
        const trust = parseFloat(ds.serviceCost || ds.internalInsurance || "");
        if ([articleCount, itemValue, shipping, trust].some(isNaN)) {
          throw new Error(`Missing or invalid seller data attributes for seller: ${seller}`);
        }
        const table = section.querySelector("table.article-table");
        if (!table) throw new Error(`No article table found for seller: ${seller}`);
        const rows = Array.from(table.querySelectorAll("tr[data-article-id]"));
        const totalCards2 = rows.reduce((sum, r) => sum + quantityOf(r), 0);
        if (totalCards2 === 0) throw new Error(`Total cards for seller ${seller} is 0`);
        const shippingPerCard = shipping / totalCards2;
        const trustPerCard = trust / totalCards2;
        rows.forEach((row) => {
          try {
            const name = row.querySelector("td.name a")?.textContent?.trim();
            if (!name) throw new Error("Missing name cell/link");
            const priceText = row.querySelector("td.price")?.textContent?.trim();
            if (!priceText) throw new Error(`Missing price cell for card: ${name}`);
            const unitPrice = strictPrice(priceText);
            const info = row.querySelector("td.info");
            if (!info) throw new Error(`Missing info cell for card: ${name}`);
            const quantity = quantityOf(row);
            const perCard = unitPrice + shippingPerCard + trustPerCard;
            cards.push({
              card_name: name,
              quantity,
              unit_price: unitPrice,
              price_str: priceText,
              seller,
              language: extractLanguage(info),
              expansion: extractExpansion(info),
              shipping_per_card: shippingPerCard,
              trust_per_card: trustPerCard,
              total_cost_per_card: perCard,
              total_cost: perCard * quantity
            });
          } catch (e) {
            console.warn("[CardMarket Helper] Failed to parse cart row:", e);
            failedRows++;
          }
        });
      } catch (e) {
        console.warn("[CardMarket Helper] Failed to parse seller section:", e);
        failedSellers++;
      }
    });
    return { cards, failedRows, failedSellers };
  }
  function exportCart() {
    if (ensureEnglishForExport(RESUME_FLAG)) return;
    try {
      const { cards, failedRows, failedSellers } = extractCart();
      if (cards.length === 0) {
        toast("error", "No cards found in the shopping cart.");
        return;
      }
      const sum = (f) => cards.reduce((s, c) => s + f(c), 0);
      const sellers = new Set(cards.map((c) => c.seller)).size;
      const total = sum((c) => c.total_cost);
      console.log("[CardMarket Helper] Cart export", {
        cards: cards.length,
        value: sum((c) => c.unit_price * c.quantity).toFixed(2),
        shipping: sum((c) => c.shipping_per_card * c.quantity).toFixed(2),
        trust: sum((c) => c.trust_per_card * c.quantity).toFixed(2),
        total: total.toFixed(2),
        sellers
      });
      const timestamp = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-").slice(0, -5);
      const filename = `shopping_cart_${timestamp}.json`;
      downloadJSON(cards, filename);
      toast("success", `${cards.length} line(s) from ${sellers} seller(s) \xB7 ${total.toFixed(2)} \u20AC total
${filename}`, { title: "Shopping cart exported" });
      if (failedRows > 0 || failedSellers > 0) {
        const parts = [];
        if (failedSellers > 0) parts.push(`${failedSellers} seller section(s)`);
        if (failedRows > 0) parts.push(`${failedRows} cart row(s)`);
        toast("warning", `${parts.join(" and ")} could not be parsed and were skipped \u2014 the export is incomplete${failedSellers > 0 ? " (per-seller totals in the comparison will be off)" : ""}. See the console for details.`);
      }
    } catch (error) {
      console.error("[CardMarket Helper] Error exporting shopping cart:", error);
      toast("error", `Export failed: ${errorMessage(error)}`);
    }
  }
  function setupCartExporter() {
    if (!route.isShoppingCart()) return;
    addAction({
      id: "cart-export",
      section: "This page",
      icon: "\u{1F9FE}",
      label: "Export shopping cart",
      description: "Download it as JSON to compare with the optimizer report",
      run: exportCart
    });
    if (takeResumeFlag(RESUME_FLAG)) {
      void sleep(1500).then(exportCart);
    }
  }

  // src/ui/jobPanel.ts
  var panelEl = null;
  var collapsed = false;
  function showJob(view) {
    const { slots } = getUIRoot();
    if (!panelEl) {
      panelEl = h("div", { class: "surface panel", role: "status", "aria-live": "polite" });
      slots.panel.appendChild(panelEl);
    }
    panelEl.classList.toggle("collapsed", collapsed);
    const pct = view.progress === null ? null : Math.max(0, Math.min(1, view.progress));
    const toggle = h("button", {
      class: "icon-btn",
      title: collapsed ? "Expand" : "Collapse",
      "aria-label": collapsed ? "Expand" : "Collapse",
      onClick: () => {
        collapsed = !collapsed;
        showJob(view);
      }
    }, collapsed ? "\u25B4" : "\u25BE");
    setChildren(
      panelEl,
      h(
        "div",
        { class: "panel-head" },
        h("div", { class: "ico" }, view.icon),
        h(
          "div",
          { class: "titles" },
          h("div", { class: "panel-title" }, view.title),
          view.subtitle ? h("div", { class: "panel-sub" }, view.subtitle) : null
        ),
        toggle
      ),
      h(
        "div",
        { class: "panel-body" },
        h(
          "div",
          { class: `progress ${view.tone && view.tone !== "normal" ? view.tone : ""}` },
          h("div", { style: { width: pct === null ? "100%" : `${(pct * 100).toFixed(1)}%`, opacity: pct === null ? ".35" : "1" } })
        ),
        view.stats?.length ? h("div", { class: "stats" }, view.stats.map(([label, value]) => h("span", null, `${label} `, h("b", null, value)))) : null,
        view.status ? h("div", { class: "status-line", title: view.status }, view.status) : null,
        view.details ?? null
      ),
      view.actions ? h("div", { class: "panel-foot" }, view.actions) : null
    );
    setLauncherBusy(view.badge ?? null);
  }
  function hideJob() {
    panelEl?.remove();
    panelEl = null;
    setLauncherBusy(null);
  }

  // src/features/cartFiller.ts
  var STATE_KEY = "cmCartFillState";
  var HASH_MARKER = "cmcartfill=";
  var PAGE_MARKER_PARAM = "cmcf";
  var cfg;
  var loadState = () => tabStorage.get(STATE_KEY);
  var saveState = (s) => tabStorage.set(STATE_KEY, s);
  var clearState = () => tabStorage.delete(STATE_KEY);
  var stopped = () => loadState() === null;
  function readHashPayload() {
    const hash = window.location.hash || "";
    const idx = hash.indexOf(HASH_MARKER);
    if (idx === -1) return null;
    try {
      let b64 = hash.substring(idx + HASH_MARKER.length).replace(/-/g, "+").replace(/_/g, "/");
      while (b64.length % 4 !== 0) b64 += "=";
      const bytes = Uint8Array.from(atob(b64), (ch) => ch.charCodeAt(0));
      const payload = JSON.parse(new TextDecoder().decode(bytes));
      if (!payload || payload.v !== 1 || !payload.seller || !Array.isArray(payload.items) || payload.items.length === 0) {
        throw new Error("unexpected payload structure");
      }
      for (const item of payload.items) {
        if (!item.n || !(item.q >= 1)) throw new Error(`invalid item: ${JSON.stringify(item)}`);
      }
      return payload;
    } catch (e) {
      console.error("[CardMarket Helper] Failed to decode cart-fill payload:", e);
      toast("error", `Could not decode the card list from the URL (${errorMessage(e)}). Regenerate the report and use its "Add to Cart" button again.`, { title: "Cart filler" });
      return null;
    }
  }
  function itemUrl(state, idx) {
    const item = state.items[idx];
    const params = new URLSearchParams();
    params.set("name", item.n);
    params.set("sortBy", "price_asc");
    const langId = item.l ? LANGUAGE_IDS[item.l] : null;
    if (langId) params.set("idLanguage", langId);
    if (item.f === true) params.set("isFoil", "Y");
    else if (item.f === false) params.set("isFoil", "N");
    params.set(PAGE_MARKER_PARAM, String(idx));
    return `https://www.cardmarket.com/en/Magic/Users/${encodeURIComponent(state.seller)}/Offers/Singles?${params.toString()}`;
  }
  function versionFromThumbnail(row) {
    const title = row.querySelector(".thumbnail-icon")?.getAttribute("data-bs-title");
    const alt = title?.match(/alt=\\?"([^"]+)\\?"/);
    return alt?.[1].match(/\(V\.(\d+)\)/)?.[1] ?? null;
  }
  function parseRow(row) {
    const articleId = (row.id || "").match(/^stockRow(\d+)$/)?.[1] ?? null;
    let name = row.querySelector(".col-seller a")?.textContent?.trim() || null;
    let nameVersion = null;
    if (name) {
      const m = name.match(/\s*\(V\.(\d+)\)\s*$/);
      if (m) {
        nameVersion = m[1];
        name = name.slice(0, m.index).trim();
      }
    }
    const expEl = row.querySelector(".product-attributes .expansion-symbol");
    const langEl = row.querySelector(".product-attributes span.icon[aria-label]:not(.expansion-symbol)");
    const priceEl = row.querySelector(".col-offer .price-container .color-primary") || row.querySelector(".mobile-offer-container .color-primary");
    const available = parseInt(row.querySelector(".item-count")?.textContent?.trim() ?? "", 10);
    if (!name || isNaN(available)) return null;
    return {
      articleId,
      name,
      expansion: expEl ? expEl.getAttribute("aria-label") || expEl.getAttribute("data-bs-original-title") : null,
      condition: row.querySelector(".article-condition span")?.textContent?.trim() || null,
      language: langEl ? (langEl.getAttribute("aria-label") || langEl.getAttribute("data-bs-original-title") || "").trim() || null : null,
      foil: !!row.querySelector('.product-attributes [aria-label="Foil"], .product-attributes [data-bs-original-title="Foil"]'),
      price: priceEl ? parsePrice(priceEl.textContent) : null,
      version: versionFromThumbnail(row) ?? nameVersion,
      available,
      cartButton: row.querySelector('form[data-ajax-action="ShoppingCart_Add_AddArticlesFromUserOffers"] button[type="submit"]'),
      row
    };
  }
  function rowMatches(item, r) {
    if (r.name !== item.n) return false;
    if (item.l && r.language && r.language !== item.l) return false;
    if (item.c && r.condition && r.condition !== item.c) return false;
    if (item.e && r.expansion && r.expansion !== item.e) return false;
    if (item.pv && r.version !== item.pv) return false;
    if (item.f === true && !r.foil) return false;
    if (item.f === false && r.foil) return false;
    if (item.p != null) {
      const wanted = parsePrice(item.p);
      if (wanted != null && (r.price == null || Math.abs(r.price - wanted) > 5e-3)) return false;
    }
    return r.available >= 1 && !!r.cartButton;
  }
  function readCartTotal() {
    const span = document.getElementById("cart")?.querySelector(".text-muted");
    return span ? parsePrice(span.textContent) : null;
  }
  async function addRowToCart(r, qty) {
    let requested = 1;
    if (qty > 1) {
      const select = r.articleId && document.getElementById("amount" + r.articleId) || r.row.querySelector(".actions-container select");
      if (select) {
        const values = Array.from(select.options).map((o) => parseInt(o.value, 10)).filter((v) => !isNaN(v));
        requested = Math.min(qty, values.length ? Math.max(...values) : 1);
        select.value = String(requested);
        select.dispatchEvent(new Event("change", { bubbles: true }));
      } else {
        console.warn(`[CardMarket Helper] No amount dropdown for article ${r.articleId} \u2014 adding 1 copy only`);
      }
    }
    const before = readCartTotal();
    r.cartButton.click();
    let waited = 0;
    while (waited < cfg.cartUpdateTimeout) {
      await sleep(cfg.cartUpdatePoll);
      waited += cfg.cartUpdatePoll;
      const now = readCartTotal();
      if (before == null || now != null && Math.abs(now - before) > 1e-3) return { added: requested, verified: true };
    }
    console.warn(`[CardMarket Helper] Cart total did not change within ${cfg.cartUpdateTimeout}ms after adding article ${r.articleId} \u2014 counting it as added (check your cart)`);
    return { added: requested, verified: false };
  }
  var STATUS_ICON = { pending: "\u23F3", done: "\u2705", partial: "\u26A0\uFE0F", notfound: "\u274C" };
  function itemList(state, highlightCurrent) {
    return h("ul", { class: "items" }, state.items.map((it, i) => {
      const detail = [it.l, it.c, it.e ? it.e + (it.pv ? ` (V.${it.pv})` : "") : null, it.p].filter(Boolean).join(" \xB7 ");
      return h(
        "li",
        { class: highlightCurrent && i === state.current ? "current" : "" },
        h("span", { class: "st" }, STATUS_ICON[it.status]),
        h("span", { class: "qty" }, `${it.added}/${it.q}`),
        h("span", { class: "name" }, it.n, detail ? h("span", { class: "detail" }, detail) : null)
      );
    }));
  }
  function renderProgress(state, status) {
    const added = state.items.reduce((s, it) => s + it.added, 0);
    const total = state.items.reduce((s, it) => s + it.q, 0);
    const finished = state.items.filter((it) => it.status !== "pending").length;
    showJob({
      icon: "\u{1F6D2}",
      title: "Filling cart",
      subtitle: `Seller ${state.seller}`,
      progress: state.items.length ? finished / state.items.length : 0,
      stats: [["Listing", `${Math.min(state.current + 1, state.items.length)}/${state.items.length}`], ["Copies added", `${added}/${total}`]],
      status,
      details: itemList(state, true),
      badge: `${finished}/${state.items.length}`,
      actions: h("button", {
        class: "btn danger grow",
        onClick: () => {
          clearState();
          renderSummary(state, true);
        }
      }, "\u23F9 Stop")
    });
  }
  function renderSummary(state, wasStopped = false) {
    const added = state.items.reduce((s, it) => s + it.added, 0);
    const total = state.items.reduce((s, it) => s + it.q, 0);
    const missing = state.items.filter((it) => it.added < it.q);
    const unverified = state.items.reduce((s, it) => s + (it.unverified || 0), 0);
    showJob({
      icon: wasStopped ? "\u23F9" : missing.length ? "\u26A0\uFE0F" : "\u2705",
      title: wasStopped ? "Cart filler stopped" : missing.length ? "Cart filled \u2014 with issues" : "Cart filled",
      subtitle: `Seller ${state.seller}`,
      progress: total ? added / total : 1,
      tone: missing.length || wasStopped ? "warning" : "success",
      stats: [["Added", `${added}/${total}`], ["Missing", String(missing.length)]],
      status: unverified ? `${unverified} addition(s) not confirmed by the cart total \u2014 double-check your cart.` : void 0,
      details: itemList(state, false),
      actions: [
        h("a", { class: "btn primary grow", href: "https://www.cardmarket.com/en/Magic/ShoppingCart" }, "Open cart"),
        h("button", { class: "btn", onClick: hideJob }, "Close")
      ]
    });
  }
  async function scanCurrentPage(state) {
    const item = state.items[state.current];
    renderProgress(state, `Scanning page for \u201C${item.n}\u201D\u2026`);
    await sleep(randomDelay(cfg.delays.initialPageLoad));
    if (stopped()) return;
    const rows = Array.from(document.querySelectorAll("#UserOffersTable div.article-row, div.article-row"));
    let needed = item.q - item.added;
    for (const row of rows) {
      if (needed <= 0) break;
      const r = parseRow(row);
      if (!r || !rowMatches(item, r)) continue;
      renderProgress(state, `Adding \u201C${item.n}\u201D to the cart\u2026`);
      const { added, verified } = await addRowToCart(r, Math.min(needed, r.available));
      item.added += added;
      if (!verified) item.unverified = (item.unverified || 0) + added;
      needed = item.q - item.added;
      if (stopped()) return;
      saveState(state);
      renderProgress(state);
      if (needed > 0) await sleep(randomDelay(cfg.delays.betweenCartAdds));
    }
    if (needed > 0) {
      const nextHref = document.querySelector('a.pagination-control[data-direction="next"]:not(.disabled)')?.getAttribute("href");
      if (nextHref) {
        saveState(state);
        renderProgress(state, `\u201C${item.n}\u201D: checking the next page\u2026`);
        await sleep(randomDelay(cfg.delays.betweenNavigation));
        if (stopped()) return;
        const next = new URL(nextHref, window.location.origin);
        next.searchParams.set(PAGE_MARKER_PARAM, String(state.current));
        window.location.href = next.href;
        return;
      }
    }
    item.status = item.added >= item.q ? "done" : item.added > 0 ? "partial" : "notfound";
    console.log(`[CardMarket Helper] Cart filler "${item.n}": ${item.status} (${item.added}/${item.q})`);
    await advance(state);
  }
  async function advance(state) {
    state.current++;
    if (state.current < state.items.length) {
      saveState(state);
      renderProgress(state, `Next: \u201C${state.items[state.current].n}\u201D`);
      await sleep(randomDelay(cfg.delays.betweenNavigation));
      if (stopped()) return;
      window.location.href = itemUrl(state, state.current);
    } else {
      state.active = false;
      clearState();
      renderSummary(state);
    }
  }
  async function start() {
    if ((window.location.hash || "").includes(HASH_MARKER)) {
      if (!isEnglishVersion()) {
        window.location.href = englishUrl();
        return;
      }
      const payload = readHashPayload();
      history.replaceState(null, "", window.location.pathname + window.location.search);
      if (!payload) return;
      const state2 = {
        active: true,
        seller: payload.seller,
        items: payload.items.map((it) => ({ ...it, added: 0, status: "pending" })),
        current: 0
      };
      saveState(state2);
      renderProgress(state2, "Starting\u2026");
      await sleep(randomDelay(cfg.delays.initialPageLoad));
      if (stopped()) return;
      window.location.href = itemUrl(state2, state2.current);
      return;
    }
    const state = loadState();
    if (!state || !state.active) return;
    const marker = new URLSearchParams(window.location.search).get(PAGE_MARKER_PARAM);
    if (marker === null) return;
    if (route.singlesSeller() !== state.seller) return;
    if (parseInt(marker, 10) !== state.current) {
      renderProgress(state, "Returning to the current card\u2026");
      await sleep(randomDelay(cfg.delays.betweenNavigation));
      if (stopped()) return;
      window.location.href = itemUrl(state, state.current);
      return;
    }
    await scanCurrentPage(state);
  }
  function setupCartFiller(config) {
    cfg = config.cartFiller;
    if (route.singlesSeller()) void start();
    addMenuNote("\u{1F6D2} Cart filler starts from the \u201CAdd to Cart\u201D buttons of the optimizer report.");
  }

  // src/ui/modal.ts
  function openModal(options) {
    const { overlays } = getUIRoot();
    overlays.replaceChildren();
    const dismissible = options.dismissible ?? true;
    let closed = false;
    const close = () => {
      if (closed) return;
      closed = true;
      overlay.remove();
      document.removeEventListener("keydown", onKey, true);
      options.onClose?.();
    };
    const onKey = (event) => {
      if (event.key === "Escape" && dismissible) {
        event.stopPropagation();
        close();
      }
    };
    const body = h("div", { class: "modal-body" }, options.body);
    const footer = h("div", { class: "modal-foot" }, options.footer);
    const box = h(
      "div",
      { class: `surface modal${options.wide ? " wide" : ""}`, role: "dialog", "aria-modal": "true", "aria-label": options.title },
      h(
        "div",
        { class: "modal-head" },
        h(
          "div",
          { class: "titles" },
          h("h2", { class: "modal-title" }, options.title),
          options.subtitle ? h("div", { class: "modal-sub" }, options.subtitle) : null
        ),
        dismissible ? h("button", { class: "icon-btn", title: "Close", "aria-label": "Close", onClick: close }, "\u2715") : null
      ),
      body,
      options.footer ? footer : null
    );
    const overlay = h("div", { class: "overlay" }, box);
    overlay.addEventListener("mousedown", (event) => {
      if (event.target === overlay && dismissible) close();
    });
    overlays.appendChild(overlay);
    document.addEventListener("keydown", onKey, true);
    return { close, root: box, body, footer };
  }

  // src/features/offersScraper/merge.ts
  function mergeWishlists(wishlists) {
    const variations = /* @__PURE__ */ new Map();
    for (const wishlist of wishlists) {
      for (const card of wishlist.cards) {
        const list = variations.get(card.name) ?? [];
        list.push({
          ...card,
          wishlist_id: wishlist.id,
          amount: card.amount || 1,
          wishlist_account: wishlist.account,
          wishlist_name: wishlist.name,
          wishlist_amounts: {}
        });
        variations.set(card.name, list);
      }
    }
    const merged = /* @__PURE__ */ new Map();
    const conflicts = [];
    const combine = (group) => {
      const amounts = {};
      group.forEach((v) => {
        amounts[v.wishlist_id] = v.amount;
      });
      return { ...group[0], amount: group.reduce((s, v) => s + v.amount, 0), wishlist_amounts: amounts };
    };
    variations.forEach((list, cardName) => {
      const groups = /* @__PURE__ */ new Map();
      for (const v of list) {
        const key = JSON.stringify({
          condition: v.condition,
          is_foil: v.is_foil,
          languages: v.languages ? [...v.languages].sort() : null,
          printings: v.printings ? [...v.printings].sort((a, b) => JSON.stringify(a) < JSON.stringify(b) ? -1 : 1) : null
        });
        groups.set(key, [...groups.get(key) ?? [], v]);
      }
      const options = Array.from(groups.values()).map(combine);
      if (options.length > 1) conflicts.push({ cardName, options });
      merged.set(cardName, options[0]);
    });
    return { mergedCards: Array.from(merged.values()), conflicts };
  }
  function resolveConflict(conflict, choice) {
    const base = conflict.options[0];
    const amounts = {};
    conflict.options.forEach((opt) => {
      Object.entries(opt.wishlist_amounts || {}).forEach(([id, amt]) => {
        amounts[id] = (amounts[id] || 0) + amt;
      });
    });
    const originalTotal = Object.values(amounts).reduce((s, v) => s + v, 0);
    if (originalTotal > 0 && originalTotal !== choice.amount) {
      const shares = Object.entries(amounts).map(([id, amt]) => {
        const exact = amt * choice.amount / originalTotal;
        const floor = Math.floor(exact);
        return { id, floor, remainder: exact - floor };
      });
      let leftover = choice.amount - shares.reduce((s, sh) => s + sh.floor, 0);
      shares.sort((a, b) => b.remainder - a.remainder);
      shares.forEach((sh) => {
        amounts[sh.id] = sh.floor + (leftover > 0 ? 1 : 0);
        if (leftover > 0) leftover--;
      });
    }
    return {
      ...base,
      languages: choice.languages.length > 0 ? choice.languages : base.languages,
      condition: choice.condition,
      is_foil: choice.is_foil,
      amount: choice.amount,
      printings: choice.printings.length > 0 ? choice.printings : base.printings,
      wishlist_amounts: amounts
    };
  }

  // src/features/offersScraper/types.ts
  var STATE_KEY2 = "cardmarket_offers_state";
  var BATCH_STATE_KEY = "cardmarket_offers_batch_state";
  var PAGE_MARKER_PARAM2 = "cmscrape";

  // src/features/offersScraper/parse.ts
  function isCardPageUrl(url) {
    return url.includes("/Cards/") && !url.includes("/Singles/");
  }
  function extractExpansionIds() {
    return Array.from(document.querySelectorAll('#articleFilterProductExpansion input[type="checkbox"][name^="idExpansion"]')).map((input) => input.value).filter(Boolean);
  }
  function buildFilterParams(card, cfg3) {
    const params = [];
    if (cfg3.sellerCountry !== null) params.push(`sellerCountry=${cfg3.sellerCountry}`);
    if (Array.isArray(card.languages)) {
      const codes = card.languages.map((lang) => LANGUAGE_IDS[lang]).filter((code) => code && Number(code) <= 11);
      if (codes.length > 0) params.push(`language=${codes.join(",")}`);
    }
    const cond = CONDITION_IDS[card.condition];
    if (cond) params.push(`minCondition=${cond}`);
    if (card.is_foil === true) params.push("isFoil=Y");
    else if (card.is_foil === false) params.push("isFoil=N");
    return params;
  }
  function buildCardUrl(card, cfg3) {
    const base = card.link.split("?")[0];
    const params = buildFilterParams(card, cfg3);
    return params.length ? `${base}?${params.join("&")}` : base;
  }
  function buildCardUrlWithExpansions(baseUrl, params, expansionIds) {
    const all = [...params];
    if (expansionIds.length > 0) all.push(`idExpansion=${expansionIds.join(",")}`);
    return all.length ? `${baseUrl}?${all.join("&")}` : baseUrl;
  }
  function withPageMarker(url, wishlistIndex, cardIndex) {
    return `${url}${url.includes("?") ? "&" : "?"}${PAGE_MARKER_PARAM2}=${wishlistIndex}-${cardIndex}`;
  }
  function extractPriceTrend() {
    for (const dl of Array.from(document.querySelectorAll("dl.labeled"))) {
      const dts = dl.querySelectorAll("dt");
      const dds = dl.querySelectorAll("dd");
      for (let i = 0; i < dts.length; i++) {
        if (dts[i].textContent?.trim() === "Price Trend") {
          const value = (dds[i]?.textContent ?? "").trim();
          const parsed = parseFloat(value.replace("\u20AC", "").replace(/\./g, "").trim().replace(",", "."));
          return isNaN(parsed) ? null : parsed;
        }
      }
    }
    return null;
  }
  function parseOffersFromPage(cardName) {
    const rows = document.querySelectorAll("div.article-row");
    const offers = [];
    let skippedSpecial = 0;
    let skippedNonShippable = 0;
    let failed = 0;
    rows.forEach((row) => {
      if (row.querySelector('svg[aria-label="Special"], svg[data-bs-original-title="Special"]')) {
        skippedSpecial++;
        return;
      }
      if (row.querySelector('.actions-container a[aria-label*="cannot buy"], .actions-container a[data-bs-original-title*="cannot buy"]')) {
        skippedNonShippable++;
        return;
      }
      const sellerA = row.querySelector(".seller-name a");
      const seller = sellerA?.textContent?.trim() || null;
      const priceEl = row.querySelector(".col-offer .color-primary.text-end, .col-offer span.color-primary:not(.fonticon-check-circle)");
      const price = priceEl?.textContent?.trim() || null;
      if (!seller || !price) {
        console.warn(`[CardMarket Helper] Skipping offer row for ${cardName}: missing seller or price (seller="${seller}", price="${price}")`);
        failed++;
        return;
      }
      const expEl = row.querySelector(".product-attributes .expansion-symbol");
      const expansion = expEl ? expEl.getAttribute("aria-label") || expEl.getAttribute("data-bs-original-title") : null;
      const langEl = row.querySelector(".product-attributes span.icon[aria-label]:not(.expansion-symbol)");
      const lang = langEl ? langEl.getAttribute("aria-label") || langEl.getAttribute("data-bs-original-title") : null;
      const locLabel = row.querySelector(".seller-name .icon[aria-label]")?.getAttribute("aria-label");
      let version2 = null;
      const alt = row.querySelector(".thumbnail-icon")?.getAttribute("data-bs-title")?.match(/alt=\\?"([^"]+)\\?"/);
      if (alt) version2 = alt[1].match(/\(V\.(\d+)\)/)?.[1] ?? null;
      const countEl = row.querySelector(".item-count");
      if (!countEl) {
        console.warn(`[CardMarket Helper] Skipping offer row for ${cardName}: .item-count not found`);
        failed++;
        return;
      }
      const quantity = parseInt(countEl.textContent?.trim() ?? "", 10);
      if (isNaN(quantity)) {
        console.warn(`[CardMarket Helper] Skipping offer row for ${cardName}: unparseable quantity "${countEl.textContent?.trim()}"`);
        failed++;
        return;
      }
      const tracking = !!(row.querySelector(".untracked .icon[data-bs-original-title*='Untracked shipping is not eligible']") || row.querySelector(".fonticon-check-circle[aria-label*='tracked shipping'], .fonticon-check-circle[data-bs-original-title*='tracked shipping']"));
      offers.push({
        seller,
        seller_link: sellerA?.getAttribute("href") ?? null,
        price,
        condition: row.querySelector(".article-condition span")?.textContent?.trim() || null,
        language: lang ? lang.trim() : null,
        location: locLabel ? locLabel.replace("Item location: ", "") : null,
        printing: expansion ? { expansion, version: version2 } : null,
        quantity,
        name: cardName,
        tracking_required: tracking
      });
    });
    if (skippedSpecial) console.log(`[CardMarket Helper] Filtered out ${skippedSpecial} special offer(s) for ${cardName}`);
    if (skippedNonShippable) console.log(`[CardMarket Helper] Filtered out ${skippedNonShippable} non-shippable offer(s) for ${cardName}`);
    if (failed > 0) {
      toast("warning", `${failed} unparseable offer row(s) skipped for \u201C${cardName}\u201D \u2014 these offers are missing from the results. See the console for details.`);
    }
    return offers;
  }
  function filterOffersByPrinting(offers, card) {
    if (!card.printings || card.printings.length === 0) return offers;
    return offers.filter((offer) => {
      if (!offer.printing) return true;
      return card.printings.some((wanted) => offer.printing.expansion === wanted.expansion && (!wanted.version || offer.printing.version === wanted.version));
    });
  }
  function filterOffersByLanguage(offers, card) {
    const wanted = (card.languages || []).filter((lang) => lang.toLowerCase() !== "any");
    if (wanted.length === 0) return offers;
    return offers.filter((offer) => !offer.language || wanted.includes(offer.language));
  }
  async function loadAllOffers(cfg3) {
    await sleep(randomDelay(cfg3.delays.firstScrape));
    let clicks = 0;
    for (; ; ) {
      const button = document.getElementById("loadMoreButton");
      if (!button || button.style.display === "none") break;
      try {
        button.scrollIntoView({ behavior: "smooth", block: "center" });
        await sleep(100 + Math.random() * 50);
        button.click();
        clicks++;
        await sleep(randomDelay(cfg3.delays.betweenLoadMore));
        for (let waited = 0; waited < 1e4; waited += 200) {
          const loader = document.querySelector("div.loader.small");
          if (!loader || loader.style.display === "none") break;
          await sleep(200);
        }
        await sleep(randomDelay(cfg3.delays.afterLoadingComplete));
      } catch (e) {
        console.error("[CardMarket Helper] Load more button not clickable:", e);
        toast("warning", "Could not click \u201CLoad More\u201D \u2014 the offers list for this card may be incomplete.");
        break;
      }
    }
    console.log(`[CardMarket Helper] All offers loaded (${clicks} "Load More" clicks)`);
  }

  // src/features/offersScraper/runner.ts
  var cfg2;
  function initRunner(config) {
    cfg2 = config;
  }
  var getState = () => storage.get(STATE_KEY2);
  var totalCards = (s) => s.wishlists.reduce((sum, w) => sum + w.cards.length, 0);
  var scrapedCards = (results) => results.reduce((sum, r) => r ? sum + r.card_offers.length : sum, 0);
  var stopRequested = () => !!getState()?.stopRequested;
  function clearRun() {
    storage.delete(STATE_KEY2);
    storage.delete(BATCH_STATE_KEY);
  }
  function exportData(result) {
    return { wishlists_metadata: result.wishlists_metadata || [], offers: result.card_offers };
  }
  async function startRun(cards, wishlistIds, metadata) {
    const state = {
      wishlists: [{ id: "MERGED_" + wishlistIds.join("_"), cards }],
      currentWishlistIndex: 0,
      currentCardIndex: 0,
      results: [],
      startTime: Date.now(),
      isMerged: true,
      sourceWishlistIds: wishlistIds,
      wishlistsMetadata: metadata
    };
    storage.delete(BATCH_STATE_KEY);
    storage.set(STATE_KEY2, state);
    renderProgress2(state, "Opening the first card\u2026");
    await sleep(800);
    window.location.href = withPageMarker(buildCardUrl(cards[0], cfg2), 0, 0);
  }
  function checkResume() {
    const state = getState();
    if (!state || !state.wishlists || state.wishlists.length === 0) return "none";
    const expected = `${state.currentWishlistIndex}-${state.currentCardIndex}`;
    const actual = new URLSearchParams(window.location.search).get(PAGE_MARKER_PARAM2);
    if (actual === null) return "other-tab";
    if (actual !== expected) {
      console.warn(`[CardMarket Helper] Page marker "${actual}" \u2260 scrape position "${expected}" \u2014 ignoring stale tab.`);
      return "stale-tab";
    }
    return "resume";
  }
  function showOtherTabNotice() {
    const state = getState();
    if (!state) return;
    const done = state.wishlists.slice(0, state.currentWishlistIndex).reduce((s, w) => s + w.cards.length, 0) + state.currentCardIndex;
    showJob({
      icon: "\u{1F50D}",
      title: "Offers scrape running in another tab",
      subtitle: "This tab will not interfere with it",
      progress: totalCards(state) ? done / totalCards(state) : null,
      stats: [["Card", `${done + 1}/${totalCards(state)}`]],
      badge: `${done}/${totalCards(state)}`,
      actions: [
        h("button", { class: "btn danger", onClick: requestStop, title: "The scraping tab stops after its current card" }, "\u26D4 Stop it"),
        h("button", { class: "btn", onClick: hideJob }, "Hide"),
        h("button", {
          class: "btn",
          title: "Use if the scraping tab was closed: discards the run state (partial results are lost unless already downloaded)",
          onClick: () => {
            if (confirm("Discard the running scrape? Use this only if the tab that was scraping is gone.\nPartial results not yet downloaded will be lost.")) {
              clearRun();
              hideJob();
            }
          }
        }, "Reset")
      ]
    });
  }
  async function resumeRun() {
    const state = getState();
    if (!state) return;
    renderProgress2(state);
    await sleep(randomDelay(cfg2.delays.initialPageLoad));
    const latest = getState();
    if (!latest) {
      showJob({ icon: "\u274C", title: "Scrape state lost", progress: 0, tone: "warning", status: "No scraping state found in storage \u2014 restart from the wishlist files.", actions: h("button", { class: "btn grow", onClick: hideJob }, "Close") });
      return;
    }
    if (latest.stopRequested) {
      finish(latest, true);
      return;
    }
    if (latest.currentWishlistIndex >= latest.wishlists.length) {
      finish(latest, false);
      return;
    }
    const card = latest.wishlists[latest.currentWishlistIndex].cards[latest.currentCardIndex];
    try {
      await processCard(latest, card);
    } catch (e) {
      console.error(`[CardMarket Helper] Error while scraping "${card.name}":`, e);
      showErrorModal(latest, card, e);
    }
  }
  async function processCard(state, card) {
    const { currentWishlistIndex: wi, currentCardIndex: ci } = state;
    const wishlist = state.wishlists[wi];
    let offers;
    let priceTrend;
    if (isCardPageUrl(window.location.href)) {
      let batch = storage.get(BATCH_STATE_KEY) ?? null;
      if (batch && (batch.wishlistIndex !== wi || batch.cardIndex !== ci)) {
        storage.delete(BATCH_STATE_KEY);
        batch = null;
      }
      if (batch && batch.currentBatchIndex >= 0) {
        const expected = batch.batches[batch.currentBatchIndex];
        if (new URLSearchParams(window.location.search).get("idExpansion") !== expected.join(",")) {
          renderProgress2(state, `Returning to expansion batch ${batch.currentBatchIndex + 1}/${batch.totalBatches}\u2026`);
          await sleep(randomDelay(cfg2.delays.cardNavigation));
          window.location.href = withPageMarker(buildCardUrlWithExpansions(batch.baseUrl, batch.params, expected), wi, ci);
          return;
        }
        renderProgress2(state, `Expansion batch ${batch.currentBatchIndex + 1}/${batch.totalBatches}: loading offers\u2026`);
        await loadAllOffers(cfg2);
        await sleep(randomDelay(cfg2.delays.afterLoadingComplete));
        const batchOffers = parseOffersFromPage(card.name);
        if (batch.currentBatchIndex === 0 && !batch.priceTrend) batch.priceTrend = extractPriceTrend();
        batch.allOffers.push(...batchOffers);
        batch.currentBatchIndex++;
        if (batch.currentBatchIndex < batch.totalBatches) {
          if (stopRequested()) return finish(state, true);
          storage.set(BATCH_STATE_KEY, batch);
          renderProgress2(state, `Next expansion batch ${batch.currentBatchIndex + 1}/${batch.totalBatches}\u2026`);
          await sleep(randomDelay(cfg2.delays.cardNavigation));
          const next = buildCardUrlWithExpansions(batch.baseUrl, batch.params, batch.batches[batch.currentBatchIndex]);
          window.location.href = withPageMarker(next, wi, ci);
          return;
        }
        offers = batch.allOffers;
        priceTrend = batch.priceTrend;
        storage.delete(BATCH_STATE_KEY);
      } else {
        const baseUrl = window.location.href.split("?")[0];
        const params = buildFilterParams(card, cfg2);
        const ids = extractExpansionIds();
        if (ids.length <= cfg2.expansionBatchSize) {
          renderProgress2(state, "Loading offers\u2026");
          await loadAllOffers(cfg2);
          await sleep(randomDelay(cfg2.delays.afterLoadingComplete));
          offers = parseOffersFromPage(card.name);
          priceTrend = extractPriceTrend();
        } else {
          const batches = [];
          for (let i = 0; i < ids.length; i += cfg2.expansionBatchSize) batches.push(ids.slice(i, i + cfg2.expansionBatchSize));
          const fresh = {
            wishlistIndex: wi,
            cardIndex: ci,
            baseUrl,
            params,
            batches,
            currentBatchIndex: 0,
            totalBatches: batches.length,
            allOffers: [],
            priceTrend: null
          };
          if (stopRequested()) return finish(state, true);
          storage.set(BATCH_STATE_KEY, fresh);
          renderProgress2(state, `${ids.length} printings \u2014 scanning in ${batches.length} batches\u2026`);
          await sleep(randomDelay(cfg2.delays.cardNavigation));
          window.location.href = withPageMarker(buildCardUrlWithExpansions(baseUrl, params, batches[0]), wi, ci);
          return;
        }
      }
    } else {
      renderProgress2(state, "Loading offers\u2026");
      await loadAllOffers(cfg2);
      await sleep(randomDelay(cfg2.delays.afterLoadingComplete));
      offers = parseOffersFromPage(card.name);
      priceTrend = extractPriceTrend();
    }
    const byPrinting = filterOffersByPrinting(offers, card);
    const filtered = filterOffersByLanguage(byPrinting, card);
    console.log(`[CardMarket Helper] ${card.name}: ${offers.length} offers, ${byPrinting.length} matching printings, ${filtered.length} matching printings+language`);
    if (!state.results) state.results = [];
    if (!state.results[wi]) {
      state.results[wi] = { wishlist_id: wishlist.id, card_offers: [], wishlists_metadata: state.wishlistsMetadata || [] };
    }
    const { wishlist_id: _a, wishlist_account: _b, wishlist_name: _c, ...wished } = card;
    state.results[wi].card_offers.push({ wished_card: wished, offers: filtered, price_trend: priceTrend });
    const scraped = scrapedCards(state.results);
    if (cfg2.autoDownloadEvery > 0 && scraped % cfg2.autoDownloadEvery === 0) {
      state.results.forEach((r, i) => {
        if (r) setTimeout(() => downloadJSON(exportData(r), `offers_${r.wishlist_id}_partial.json`), i * 500);
      });
    }
    if (ci + 1 < wishlist.cards.length) state.currentCardIndex++;
    else {
      state.currentWishlistIndex++;
      state.currentCardIndex = 0;
    }
    if (stopRequested()) return finish(state, true);
    storage.set(STATE_KEY2, state);
    if (state.currentWishlistIndex < state.wishlists.length) {
      const next = state.wishlists[state.currentWishlistIndex].cards[state.currentCardIndex];
      renderProgress2(state, `${filtered.length} offer(s) kept \xB7 next: ${next.name}`);
      await sleep(randomDelay(cfg2.delays.cardNavigation));
      window.location.href = withPageMarker(buildCardUrl(next, cfg2), state.currentWishlistIndex, state.currentCardIndex);
    } else {
      finish(state, false);
    }
  }
  function requestStop() {
    const state = getState();
    if (!state) return;
    state.stopRequested = true;
    storage.set(STATE_KEY2, state);
    const current = getState();
    if (current) renderProgress2(current, "Stopping after the current card\u2026");
  }
  function renderProgress2(state, status) {
    const total = totalCards(state);
    const done = state.wishlists.slice(0, state.currentWishlistIndex).reduce((s, w) => s + w.cards.length, 0) + state.currentCardIndex;
    const elapsed = Date.now() - state.startTime;
    const stats = [["Card", `${Math.min(done + 1, total)}/${total}`], ["Elapsed", formatDuration(elapsed)]];
    if (done > 0) stats.push(["ETA", `~${formatDuration(elapsed / done * (total - done))}`]);
    const current = state.wishlists[state.currentWishlistIndex]?.cards[state.currentCardIndex];
    showJob({
      icon: "\u{1F50D}",
      title: "Scraping offers",
      subtitle: current ? current.name : void 0,
      progress: total ? done / total : 0,
      stats,
      status: state.stopRequested ? "Stopping after the current card\u2026" : status,
      badge: `${done}/${total}`,
      actions: h("button", { class: "btn danger grow", disabled: !!state.stopRequested, onClick: requestStop }, state.stopRequested ? "Stopping\u2026" : "\u26D4 Stop scraping")
    });
  }
  function finish(state, stoppedEarly) {
    clearRun();
    const results = (state.results || []).filter((r) => !!r);
    const scraped = scrapedCards(results);
    const total = totalCards(state);
    const elapsed = formatDuration(Date.now() - state.startTime);
    showJob({
      icon: stoppedEarly ? "\u23F9" : "\u2705",
      title: stoppedEarly ? "Scrape stopped" : "Scrape complete",
      subtitle: `${scraped}/${total} cards \xB7 ${elapsed}`,
      progress: total ? scraped / total : 1,
      tone: stoppedEarly ? "warning" : "success",
      actions: h("button", { class: "btn grow", onClick: hideJob }, "Close")
    });
    const download = (r) => downloadJSON(exportData(r), `offers_${r.wishlist_id}.json`);
    const modal = openModal({
      title: stoppedEarly ? "Scrape stopped \u2014 partial results" : "Scrape complete",
      subtitle: stoppedEarly ? `${scraped} of ${total} cards were scraped. The file below contains them.` : `Offers collected for ${scraped} card(s) in ${elapsed}.`,
      body: h(
        "div",
        { class: "stack" },
        h(
          "div",
          { class: `callout ${stoppedEarly ? "warning" : "success"}` },
          "The file downloads automatically. Feed it to the optimizer: ",
          h("code", null, "python cardmarket_helper/optimize_purchases.py --offers-file <file>")
        ),
        results.length === 0 ? h("div", { class: "muted" }, "No card was scraped yet, nothing to download.") : h("div", { class: "dl-list" }, results.map((r) => {
          const offers = r.card_offers.reduce((s, co) => s + co.offers.length, 0);
          return h(
            "div",
            { class: "dl-item" },
            h("span", null, "\u{1F4C4}"),
            h(
              "div",
              { class: "grow" },
              h("div", { class: "fname" }, `offers_${r.wishlist_id}.json`),
              h("div", { class: "muted small" }, `${r.card_offers.length} cards \xB7 ${offers} offers`)
            ),
            h("button", { class: "btn primary sm", onClick: () => download(r) }, "Download again")
          );
        }))
      ),
      footer: h("button", { class: "btn", onClick: () => modal.close() }, "Close")
    });
    results.forEach((r, i) => setTimeout(() => download(r), 1e3 + i * 500));
  }
  function showErrorModal(state, card, error) {
    showJob({ icon: "\u274C", title: "Scrape paused on an error", subtitle: card.name, progress: null, tone: "warning", status: errorMessage(error), badge: "!" });
    const modal = openModal({
      title: "Error while scraping a card",
      dismissible: false,
      body: h(
        "dl",
        { class: "kv" },
        h("dt", null, "Card"),
        h("dd", null, card.name),
        h("dt", null, "Error"),
        h("dd", null, errorMessage(error))
      ),
      footer: [
        h("button", {
          class: "btn danger",
          onClick: () => {
            modal.close();
            finish(state, true);
          }
        }, "\u26D4 Stop & download partial results"),
        h("button", { class: "btn", onClick: () => window.location.reload() }, "\u{1F504} Retry"),
        h("button", {
          class: "btn primary",
          onClick: () => {
            modal.close();
            const wishlist = state.wishlists[state.currentWishlistIndex];
            if (state.currentCardIndex + 1 < wishlist.cards.length) state.currentCardIndex++;
            else {
              state.currentWishlistIndex++;
              state.currentCardIndex = 0;
            }
            storage.delete(BATCH_STATE_KEY);
            if (stopRequested()) state.stopRequested = true;
            if (state.currentWishlistIndex < state.wishlists.length && !state.stopRequested) {
              storage.set(STATE_KEY2, state);
              const next = state.wishlists[state.currentWishlistIndex].cards[state.currentCardIndex];
              window.location.href = withPageMarker(buildCardUrl(next, cfg2), state.currentWishlistIndex, state.currentCardIndex);
            } else {
              finish(state, !!state.stopRequested);
            }
          }
        }, "\u23ED Skip card & continue")
      ]
    });
  }

  // src/features/offersScraper/recapModal.ts
  var printingLabel = (p) => `${p.expansion}${p.version ? ` (V.${p.version})` : ""}`;
  var printingKey = (p) => `${p.expansion}|${p.version || ""}`;
  var foilLabel = (f) => f === true ? "Foil" : f === false ? "Non-foil" : "Any";
  function showMergeRecap(wishlists) {
    const { mergedCards, conflicts } = mergeWishlists(wishlists);
    const resolved = /* @__PURE__ */ new Map();
    const conflictByName = new Map(conflicts.map((c) => [c.cardName, c]));
    const wishlistLabel = (id, amount) => {
      const wl = wishlists.find((w) => w.id === id);
      const account = wl?.account || id;
      return `${wl?.name ? `${account} \u2013 ${wl.name}` : account} \xD7${amount}`;
    };
    const mainRows = /* @__PURE__ */ new Map();
    const renderMainRow = (row, card, conflict) => {
      const isResolved = resolved.has(card.name);
      row.className = conflict ? `conflict${isResolved ? " resolved" : ""}` : "";
      setChildren(
        row,
        h("td", null, conflict ? h("span", { class: `badge ${isResolved ? "success" : "warning"}`, style: "margin-right:6px" }, isResolved ? "resolved" : "conflict") : null, h("b", null, card.name)),
        h("td", { class: "small" }, card.printings?.length ? card.printings.map(printingLabel).join(", ") : "Any"),
        h("td", { class: "c" }, card.languages?.length ? card.languages.join(", ") : "Any"),
        h("td", { class: "c" }, card.condition || "Any"),
        h("td", { class: "c" }, foilLabel(card.is_foil)),
        h("td", { class: "c" }, h("b", null, String(card.amount))),
        h("td", { class: "small muted" }, Object.entries(card.wishlist_amounts || {}).map(([id, n]) => wishlistLabel(id, n)).join(", "))
      );
    };
    const tbody = h("tbody");
    for (const card of mergedCards) {
      const conflict = conflictByName.get(card.name);
      const row = h("tr");
      mainRows.set(card.name, row);
      renderMainRow(row, card, conflict);
      tbody.appendChild(row);
      if (conflict) tbody.appendChild(conflictEditor(conflict));
    }
    function conflictEditor(conflict) {
      const first = conflict.options[0];
      const languages = Array.from(new Set(conflict.options.flatMap((o) => o.languages || [])));
      const conditions = Array.from(/* @__PURE__ */ new Set([...conflict.options.map((o) => o.condition).filter(Boolean), ...Object.keys(CONDITION_IDS)]));
      const printings = [];
      conflict.options.forEach((o) => (o.printings || []).forEach((p) => {
        if (!printings.some((q) => printingKey(q) === printingKey(p))) printings.push(p);
      }));
      const langBoxes = languages.map((lang) => h("input", { type: "checkbox", value: lang, checked: first.languages?.includes(lang) }));
      const printBoxes = printings.map((p) => h("input", { type: "checkbox", value: printingKey(p), checked: first.printings?.some((q) => printingKey(q) === printingKey(p)) }));
      const condSelect = h("select", { class: "control" }, conditions.map((c) => h("option", { value: c, selected: c === first.condition }, c)));
      const foilSelect = h(
        "select",
        { class: "control" },
        h("option", { value: "any", selected: first.is_foil == null }, "Any"),
        h("option", { value: "true", selected: first.is_foil === true }, "Foil"),
        h("option", { value: "false", selected: first.is_foil === false }, "Non-foil")
      );
      const totalAmount = conflict.options.reduce((s, o) => s + o.amount, 0);
      const amountInput = h("input", { class: "control", type: "number", min: "1", value: String(totalAmount) });
      const status = h("span", { class: "muted small" });
      const preset2 = h(
        "select",
        {
          class: "control",
          onChange: () => {
            const option = conflict.options[parseInt(preset2.value, 10)];
            if (!option) return;
            langBoxes.forEach((cb) => cb.checked = !!option.languages?.includes(cb.value));
            printBoxes.forEach((cb) => cb.checked = !!option.printings?.some((p) => printingKey(p) === cb.value));
            condSelect.value = option.condition || "";
            foilSelect.value = option.is_foil === true ? "true" : option.is_foil === false ? "false" : "any";
            amountInput.value = String(option.amount);
          }
        },
        h("option", { value: "-1" }, "Custom"),
        conflict.options.map((o, i) => h(
          "option",
          { value: String(i), selected: i === 0 },
          `Option ${i + 1}: ${Object.entries(o.wishlist_amounts || {}).map(([id, n]) => wishlistLabel(id, n)).join(", ")}`
        ))
      );
      const apply = () => {
        const card = resolveConflict(conflict, {
          languages: langBoxes.filter((cb) => cb.checked).map((cb) => cb.value),
          condition: condSelect.value || first.condition,
          is_foil: foilSelect.value === "true" ? true : foilSelect.value === "false" ? false : null,
          amount: Math.max(1, parseInt(amountInput.value, 10) || 1),
          printings: printBoxes.filter((cb) => cb.checked).map((cb) => {
            const [expansion, version2] = cb.value.split("|");
            return { expansion, version: version2 || null };
          })
        });
        resolved.set(conflict.cardName, card);
        renderMainRow(mainRows.get(conflict.cardName), card, conflict);
        status.textContent = "\u2713 Applied \u2014 change and apply again if needed";
        updateFooter();
      };
      const field = (label, control) => h("div", null, h("div", { class: "field-label" }, label), control);
      return h("tr", { class: "editor" }, h(
        "td",
        { colspan: "7" },
        h(
          "div",
          { class: "row between", style: "margin-bottom:10px" },
          h("b", null, `Pick the filters to scrape \u201C${conflict.cardName}\u201D with`),
          h("label", { class: "row small" }, "Start from", preset2)
        ),
        h(
          "div",
          { class: "editor-grid" },
          field("Languages", languages.length ? h("div", { class: "checks" }, langBoxes.map((cb) => h("label", null, cb, cb.value))) : h("span", { class: "muted" }, "Any")),
          field("Min. condition", condSelect),
          field("Foil", foilSelect),
          field("Amount", amountInput)
        ),
        printings.length ? field("Printings", h("div", { class: "checks", style: "margin-bottom:10px" }, printBoxes.map((cb, i) => h("label", null, cb, printingLabel(printings[i]))))) : null,
        h("div", { class: "row" }, h("button", { class: "btn primary sm", onClick: apply }, "Apply"), status)
      ));
    }
    const remaining = () => conflicts.length - resolved.size;
    const startBtn = h("button", { class: "btn primary" });
    const footerNote = h("span", { class: "spacer" });
    const banner = h("div");
    const updateFooter = () => {
      const left = remaining();
      startBtn.disabled = left > 0;
      startBtn.textContent = left > 0 ? `${left} conflict(s) to resolve` : `Start scraping ${mergedCards.length} card(s)`;
      footerNote.textContent = left > 0 ? "Resolve every highlighted card to continue." : "Keep this tab open while it runs; you can use other tabs.";
      setChildren(banner, conflicts.length === 0 ? null : left > 0 ? h("div", { class: "callout warning" }, h("b", null, `${left} card(s) `), "appear in several wishlists with different requirements. Choose the filters for each below and click Apply.") : h("div", { class: "callout success" }, h("b", null, "All conflicts resolved. "), "You can start scraping."));
    };
    startBtn.addEventListener("click", async () => {
      if (remaining() > 0) return;
      const finalCards = mergedCards.map((c) => resolved.get(c.name) ?? c);
      if (finalCards.length === 0) {
        toast("error", "The merged card list is empty \u2014 nothing to scrape.");
        return;
      }
      startBtn.disabled = true;
      startBtn.textContent = "Starting\u2026";
      modal.close();
      await startRun(
        finalCards,
        wishlists.map((w) => w.id),
        wishlists.map((w) => ({ id: w.id, account: w.account || "Unknown Account", name: w.name || "Unnamed Wishlist" }))
      );
    });
    const modal = openModal({
      title: "Scrape offers \u2014 merge recap",
      subtitle: `${wishlists.length} wishlist(s) loaded \xB7 ${mergedCards.length} unique card(s) after merging`,
      wide: true,
      body: h(
        "div",
        null,
        h("div", { class: "chips" }, wishlists.map((w) => h("span", { class: "chip" }, h("b", null, w.account || "Unknown account"), w.name || "Unnamed wishlist", h("span", { class: "muted" }, `#${w.id} \xB7 ${w.cards.length} cards`)))),
        banner,
        h(
          "div",
          { class: "table-wrap" },
          h(
            "table",
            { class: "grid" },
            h("thead", null, h(
              "tr",
              null,
              h("th", null, "Card"),
              h("th", null, "Printings"),
              h("th", { class: "c" }, "Languages"),
              h("th", { class: "c" }, "Condition"),
              h("th", { class: "c" }, "Foil"),
              h("th", { class: "c" }, "Amount"),
              h("th", null, "Wishlists")
            )),
            tbody
          )
        )
      ),
      footer: [footerNote, h("button", { class: "btn", onClick: () => modal.close() }, "Cancel"), startBtn]
    });
    updateFooter();
  }

  // src/features/offersScraper/index.ts
  async function readWishlistFiles(files) {
    const wishlists = [];
    for (const file of Array.from(files)) {
      const data = JSON.parse(await file.text());
      if (!data || typeof data !== "object") throw new Error(`\u201C${file.name}\u201D does not contain a JSON object`);
      if (!Array.isArray(data.cards)) throw new Error(`\u201C${file.name}\u201D is missing the "cards" array`);
      if (data.cards.length === 0) throw new Error(`\u201C${file.name}\u201D contains no cards`);
      if (!data.id) throw new Error(`\u201C${file.name}\u201D is missing the "id" field`);
      data.cards.forEach((c, i) => {
        if (!c.name || !c.link) throw new Error(`\u201C${file.name}\u201D, card #${i + 1} is missing "name" or "link"`);
        if (!Array.isArray(c.languages) && typeof c.language === "string" && c.language) {
          console.warn(`[CardMarket Helper] ${file.name} / ${c.name}: old export format (single "language") auto-migrated \u2014 re-export the wishlist to avoid this.`);
          c.languages = [c.language];
        }
      });
      wishlists.push(data);
    }
    return wishlists;
  }
  function pickWishlistFiles() {
    const input = h("input", { type: "file", accept: ".json,.wishlist.json", multiple: true, style: "display:none" });
    input.addEventListener("change", async () => {
      try {
        if (input.files && input.files.length > 0) showMergeRecap(await readWishlistFiles(input.files));
      } catch (e) {
        toast("error", errorMessage(e), { title: "Could not load the wishlist files" });
      } finally {
        input.remove();
      }
    });
    input.addEventListener("cancel", () => input.remove());
    document.body.appendChild(input);
    input.click();
  }
  function setupOffersScraper(config) {
    initRunner(config.scraper);
    const verdict = checkResume();
    if (verdict === "resume") {
      void domReady().then(resumeRun);
      return;
    }
    if (verdict === "other-tab") showOtherTabNotice();
    addAction({
      id: "offers-scrape",
      section: "Tools",
      icon: "\u{1F50D}",
      label: "Scrape offers\u2026",
      description: "Pick .wishlist.json file(s) to collect offers for the optimizer",
      disabledReason: () => {
        if (checkResume() !== "none") return "A scrape is already running in another tab";
        if (!route.isMagic()) return "Open any CardMarket Magic page first";
        return null;
      },
      run: pickWishlistFiles
    });
  }

  // src/features/wishlistExporter.ts
  var RESUME_FLAG2 = "cardmarket_auto_export";
  function getAccountName() {
    const desktop = document.querySelector("#account-dropdown .d-none.d-lg-block");
    if (desktop?.textContent?.trim()) return desktop.textContent.trim();
    const mobile = document.querySelector(".dropdown-header span");
    if (mobile?.textContent?.trim()) return mobile.textContent.trim();
    return null;
  }
  function getWishlistName() {
    const heading = document.querySelector("h1");
    if (heading) {
      const clone = heading.cloneNode(true);
      clone.querySelectorAll(".badge").forEach((b) => b.remove());
      const text = clone.textContent?.trim();
      if (text) return text;
    }
    const title = document.querySelector(".page-title, .wishlist-title");
    return title?.textContent?.trim() || null;
  }
  function getStatedTotalCardCount() {
    try {
      for (const span of Array.from(document.querySelectorAll(".pagination span, .row.pagination span"))) {
        const match = (span.textContent ?? "").match(/\d[\d.,]*\s*(?:to|-)\s*\d[\d.,]*\s*(?:of|\/)\s*(\d[\d.,]*)/i);
        if (match) {
          const total = parseInt(match[1].replace(/[.,\s]/g, ""), 10);
          if (!isNaN(total) && total > 0) return total;
        }
      }
      const badge = document.querySelector("h1 .badge");
      if (badge) {
        const total = parseInt((badge.textContent ?? "").replace(/[.,\s]/g, ""), 10);
        if (!isNaN(total) && total > 0) return total;
      }
    } catch (error) {
      console.warn("[CardMarket Helper] Could not read the stated total card count:", error);
    }
    return null;
  }
  function parsePrintings(cell) {
    if (!cell) return [];
    return Array.from(cell.querySelectorAll(".expansion-symbol")).map((el) => {
      const setName = el.getAttribute("aria-label")?.trim() || "";
      if (setName.includes(" Version ")) {
        const [expansion, version2] = setName.split(" Version ");
        return { expansion, version: version2 || null };
      }
      return { expansion: setName, version: null };
    });
  }
  function getFoilColumnIndex(row) {
    const headerRow = row.closest("table")?.querySelector("thead tr");
    if (!headerRow) return -1;
    return Array.from(headerRow.children).findIndex((cell) => /foil/i.test(cell.outerHTML));
  }
  var warnedFoilFallback = false;
  function parseFoilPreference(row) {
    const index = getFoilColumnIndex(row);
    const candidate = index >= 0 ? row.children[index] : null;
    let foilCell;
    if (candidate && candidate.classList.contains("ternary-header")) {
      foilCell = candidate;
    } else {
      if (!warnedFoilFallback) {
        warnedFoilFallback = true;
        console.warn("[CardMarket Helper] Could not locate the Foil column from the table header; falling back to the first ternary column.");
      }
      foilCell = row.querySelector("td.ternary-header");
    }
    if (foilCell?.querySelector('span[name="yes"]')) return true;
    if (foilCell?.querySelector('span[name="no"]')) return false;
    return null;
  }
  function parseCardRow(row) {
    try {
      const amountText = row.querySelector("td.amount")?.textContent?.trim() || "";
      const amount = parseInt(amountText, 10);
      if (isNaN(amount) || amount < 1) {
        console.warn(`[CardMarket Helper] Skipping wishlist row: no valid amount in "${amountText}"`, row);
        return null;
      }
      const nameEl = row.querySelector("td.name a");
      const link = nameEl?.getAttribute("href") || "";
      const name = (nameEl?.textContent?.trim() || "").replace(/\s*\(V\.\d+\)\s*$/, "");
      const languages = Array.from(row.querySelectorAll("td.languages span.visually-hidden")).map((span) => span.textContent?.trim() || "").filter((lang) => lang && lang.toLowerCase() !== "any");
      const condition = row.querySelector("td.condition span.visually-hidden")?.textContent?.trim() || "";
      let maxPrice = null;
      const priceData = row.querySelector("td.buyPrice")?.getAttribute("data-text");
      if (priceData && priceData.trim()) {
        const value = parseFloat(priceData);
        if (value > 0) maxPrice = value;
      }
      return {
        amount,
        name,
        printings: parsePrintings(row.querySelector("td.expansion")),
        languages,
        condition,
        link,
        max_price: maxPrice,
        is_foil: parseFoilPreference(row)
      };
    } catch (error) {
      console.error("[CardMarket Helper] Error parsing card row:", error);
      return null;
    }
  }
  async function exportWishlist() {
    if (ensureEnglishForExport(RESUME_FLAG2)) return;
    const wishlistId = route.wishlistId();
    if (!wishlistId) {
      toast("error", "Could not determine the wishlist id from the URL.");
      return;
    }
    const table = await waitFor(() => document.querySelector("table.table thead"), 1e4);
    if (!table) {
      toast("error", "The wishlist table did not load \u2014 reload the page and try again.");
      return;
    }
    const account = getAccountName();
    if (!account) {
      toast("error", "Could not determine your account name. Make sure you are logged in to CardMarket.");
      return;
    }
    const name = getWishlistName();
    if (!name) {
      toast("error", "Could not determine the wishlist name. Wait for the page to finish loading.");
      return;
    }
    const cards = [];
    let failedRows = 0;
    document.querySelectorAll('table.table tbody tr[role="row"]').forEach((row) => {
      const card = parseCardRow(row);
      if (card && card.name) cards.push(card);
      else failedRows++;
    });
    if (cards.length === 0) {
      toast("error", "No cards found in this wishlist.");
      return;
    }
    const wishlist = { id: wishlistId, name, account, cards };
    const filename = `${safeFilePart(account, 100)}_${safeFilePart(name)}_${wishlistId}.wishlist.json`;
    downloadJSON(wishlist, filename);
    console.log(`[CardMarket Helper] Exported ${cards.length} cards from wishlist ${wishlistId} (${account})`);
    toast("success", `${cards.length} card(s) exported to ${filename}`, { title: `\u201C${name}\u201D exported` });
    if (failedRows > 0) {
      toast("warning", `${failedRows} row(s) could not be parsed and are missing from the export. See the browser console for details.`);
    }
    const statedTotal = getStatedTotalCardCount();
    if (statedTotal !== null && cards.length !== statedTotal) {
      toast("warning", `Exported ${cards.length} card(s) but the page reports ${statedTotal}. If the list spans several pages, only the displayed page was exported \u2014 increase the page size or export each page.`);
    }
  }
  function setupWishlistExporter() {
    if (!route.wishlistId()) return;
    addAction({
      id: "wishlist-export",
      section: "This page",
      icon: "\u{1F4E5}",
      label: "Export this wishlist",
      description: "Download it as .wishlist.json for the offers scraper",
      run: exportWishlist
    });
    if (takeResumeFlag(RESUME_FLAG2)) {
      void sleep(1e3).then(exportWishlist);
    }
  }

  // src/index.ts
  var version = "1.0.0";
  var initialized = false;
  function init(userConfig = {}) {
    if (initialized) return;
    if (window.self !== window.top) return;
    initialized = true;
    const config = resolveConfig(userConfig);
    if (config.debug) console.log("[CardMarket Helper] v%s config", version, config);
    void domReady().then(() => {
      mountUI(config);
      installLauncher(version);
      registerMenuCommand("Open CardMarket Helper", () => toggleMenu(true));
      const setups = [
        ["wishlistExporter", () => setupWishlistExporter()],
        ["cartExporter", () => setupCartExporter()],
        ["offersScraper", () => setupOffersScraper(config)],
        ["cartFiller", () => setupCartFiller(config)]
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
  return __toCommonJS(src_exports);
})();
if (typeof window !== 'undefined') { window.CardmarketHelper = CardmarketHelper; }
