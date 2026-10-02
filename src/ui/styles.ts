/**
 * All plugin styles. They live inside the plugin's shadow root, so CardMarket's
 * CSS can't reach them and they can't leak onto the page.
 */
export const STYLES = `
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

/* ---------- settings ---------- */
.settings { display: flex; flex-direction: column; gap: 4px; }
.settings-section { padding: 12px 0; border-top: 1px solid var(--cmh-border); }
.settings-section:first-of-type { border-top: none; }
.settings-section h3 { margin: 0 0 10px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: var(--cmh-fg-muted); }
.settings-section summary { cursor: pointer; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: var(--cmh-fg-muted); }
.field { display: flex; flex-direction: column; gap: 4px; }
.field .control { width: 100%; }
.field-hint { font-size: 11px; color: var(--cmh-fg-muted); }
.toggles { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 8px 16px; }
.toggle { display: inline-flex; gap: 8px; align-items: center; cursor: pointer; }
.toggle input { width: 16px; height: 16px; accent-color: var(--cmh-accent); }
textarea.control { height: auto; padding: 6px 8px; resize: vertical; }
textarea.code { font: 12px/1.4 ui-monospace, SFMono-Regular, Consolas, monospace; }
.modal-sub a { color: var(--cmh-accent); }
`;
