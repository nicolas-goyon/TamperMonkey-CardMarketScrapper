/**
 * Every piece of UI mounts inside one shadow root (host page CSS can't bleed
 * in, ours can't leak out), into a "dock" pinned to the configured corner.
 * The dock stacks, from the corner outwards: launcher, menu, job panel, toasts.
 */
import type { ResolvedConfig } from '../config';
import { siteIsDark } from '../core/cardmarket';
import { h } from './dom';
import { STYLES } from './styles';

const HOST_ID = 'cardmarket-helper-root';

export interface UIRoot {
  shadow: ShadowRoot;
  dock: HTMLDivElement;
  /** Slots inside the dock, in stacking order from the corner. */
  slots: { launcher: HTMLDivElement; menu: HTMLDivElement; panel: HTMLDivElement; toasts: HTMLDivElement };
  /** Container for modals (outside the dock: they're centered). */
  overlays: HTMLDivElement;
}

let root: UIRoot | null = null;

export function getUIRoot(): UIRoot {
  if (!root) throw new Error('CardMarket Helper UI not mounted yet');
  return root;
}

export function mountUI(config: ResolvedConfig): UIRoot {
  if (root) return root;
  document.getElementById(HOST_ID)?.remove();

  const host = document.createElement('div');
  host.id = HOST_ID;
  (document.body || document.documentElement).appendChild(host);
  const shadow = host.attachShadow({ mode: 'open' });
  shadow.appendChild(h('style', null, STYLES));

  const applyTheme = () => {
    const dark = config.ui.theme === 'dark' || (config.ui.theme === 'auto' && siteIsDark());
    host.setAttribute('data-theme', dark ? 'dark' : 'light');
  };
  applyTheme();
  if (config.ui.theme === 'auto') {
    new MutationObserver(applyTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-bs-theme', 'class', 'style'] });
  }

  const slots = {
    launcher: h('div', { class: 'slot-launcher' }),
    menu: h('div', { class: 'slot-menu' }),
    panel: h('div', { class: 'slot-panel stack' }),
    toasts: h('div', { class: 'toasts' }),
  };
  const { x, y } = config.ui.offset;
  const pos = config.ui.position;
  const style: Partial<CSSStyleDeclaration> = {};
  if (pos.includes('right')) style.right = `${16 + x}px`;
  else style.left = `${16 + x}px`;
  if (pos.includes('bottom')) style.bottom = `${16 + y}px`;
  else style.top = `${16 + y}px`;
  const dock = h('div', { class: `cmh dock ${pos}`, style }, slots.launcher, slots.menu, slots.panel, slots.toasts);
  const overlays = h('div', { class: 'cmh' });
  shadow.append(dock, overlays);

  root = { shadow, dock, slots, overlays };
  return root;
}
