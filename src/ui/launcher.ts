/**
 * The single floating entry point: a pill button in the configured corner
 * that opens a menu of the actions available on the current page. Features
 * register actions; the menu groups them by section.
 */
import { h, setChildren } from './dom';
import { getUIRoot } from './root';

export interface LauncherAction {
  id: string;
  section: 'This page' | 'Tools';
  icon: string;
  label: string;
  description?: string;
  /** Return a string to show the action disabled with that hint. */
  disabledReason?: () => string | null;
  run: () => void | Promise<void>;
}

const actions: LauncherAction[] = [];
const notes: string[] = [];
let launcherBtn: HTMLButtonElement | null = null;
let menuEl: HTMLDivElement | null = null;

const LOGO = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="11" height="15" rx="2"/><path d="M8 4.5 9.2 3.6a2 2 0 0 1 2.8.4l7.2 9.6a2 2 0 0 1-.4 2.8l-3.3 2.5"/></svg>`;

export function addAction(action: LauncherAction): void {
  actions.push(action);
  if (menuEl && !menuEl.hidden) renderMenu();
}

/** Informational line shown at the bottom of the menu. */
export function addMenuNote(note: string): void {
  notes.push(note);
}

export function installLauncher(version: string): void {
  const { slots, dock } = getUIRoot();
  const logo = h('span', { class: 'logo' });
  logo.innerHTML = LOGO; // static, trusted markup
  launcherBtn = h('button', {
    class: 'launcher',
    type: 'button',
    title: 'CardMarket Helper',
    'aria-haspopup': 'menu',
    'aria-expanded': 'false',
    onClick: () => toggleMenu(),
  }, logo, h('span', null, 'CM Helper'), h('span', { class: 'busy' }));
  slots.launcher.appendChild(launcherBtn);

  menuEl = h('div', { class: 'surface menu', role: 'menu', hidden: true });
  menuEl.dataset.version = version;
  slots.menu.appendChild(menuEl);

  // Close on outside click / Escape
  document.addEventListener('mousedown', (event) => {
    if (menuEl && !menuEl.hidden && !event.composedPath().includes(dock)) toggleMenu(false);
  }, true);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && menuEl && !menuEl.hidden) toggleMenu(false);
  }, true);
}

export function toggleMenu(open?: boolean): void {
  if (!menuEl || !launcherBtn) return;
  const show = open ?? menuEl.hidden;
  if (show) renderMenu();
  menuEl.hidden = !show;
  launcherBtn.setAttribute('aria-expanded', String(show));
}

export function setLauncherBusy(badge: string | null): void {
  if (!launcherBtn) return;
  launcherBtn.classList.toggle('is-busy', badge !== null);
  const busy = launcherBtn.querySelector('.busy');
  if (busy) busy.textContent = badge ?? '';
}

function renderMenu(): void {
  if (!menuEl) return;
  const sections: Array<LauncherAction['section']> = ['This page', 'Tools'];
  const blocks = sections.map((section) => {
    const list = actions.filter((a) => a.section === section);
    if (list.length === 0 && section === 'This page') {
      return [h('div', { class: 'menu-section' }, section),
        h('div', { class: 'menu-empty' }, 'Nothing to do here. Open a wishlist (Wants) or your shopping cart to export it.')];
    }
    if (list.length === 0) return [];
    return [h('div', { class: 'menu-section' }, section), list.map(renderAction)];
  });
  setChildren(menuEl,
    h('div', { class: 'menu-head' },
      h('span', { class: 'menu-title' }, 'CardMarket Helper'),
      h('span', { class: 'menu-version' }, `v${menuEl.dataset.version}`)),
    blocks,
    notes.length ? h('div', { class: 'menu-foot' }, notes.map((n) => h('div', null, n))) : null,
  );
}

function renderAction(action: LauncherAction): HTMLButtonElement {
  const reason = action.disabledReason?.() ?? null;
  return h('button', {
    class: 'action',
    type: 'button',
    role: 'menuitem',
    disabled: reason !== null,
    title: reason ?? action.description ?? '',
    onClick: async () => {
      toggleMenu(false);
      await action.run();
    },
  },
  h('span', { class: 'ico' }, action.icon),
  h('span', { class: 'txt' },
    h('span', { class: 'label' }, action.label),
    h('span', { class: 'desc' }, reason ?? action.description ?? '')));
}
