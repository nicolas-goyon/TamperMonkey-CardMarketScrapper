/**
 * Docked progress card for long-running jobs (offers scrape, cart fill).
 * Rendered from scratch on every page of a run, so it's a plain
 * "render(state)" component — features call update() with what to show.
 */
import { Child, h, setChildren } from './dom';
import { getUIRoot } from './root';
import { setLauncherBusy } from './launcher';

export interface JobView {
  icon: string;
  title: string;
  subtitle?: string;
  /** 0..1, or null for an indeterminate job. */
  progress: number | null;
  tone?: 'normal' | 'success' | 'warning';
  stats?: Array<[string, Child]>;
  status?: string;
  /** Extra content under the status line (e.g. an item list). */
  details?: Child;
  actions?: Child;
  /** Short text shown on the launcher while the job runs, e.g. "12/40". */
  badge?: string;
}

let panelEl: HTMLDivElement | null = null;
let collapsed = false;

export function showJob(view: JobView): void {
  const { slots } = getUIRoot();
  if (!panelEl) {
    panelEl = h('div', { class: 'surface panel', role: 'status', 'aria-live': 'polite' });
    slots.panel.appendChild(panelEl);
  }
  panelEl.classList.toggle('collapsed', collapsed);
  const pct = view.progress === null ? null : Math.max(0, Math.min(1, view.progress));
  const toggle = h('button', {
    class: 'icon-btn',
    title: collapsed ? 'Expand' : 'Collapse',
    'aria-label': collapsed ? 'Expand' : 'Collapse',
    onClick: () => {
      collapsed = !collapsed;
      showJob(view);
    },
  }, collapsed ? '▴' : '▾');

  setChildren(panelEl,
    h('div', { class: 'panel-head' },
      h('div', { class: 'ico' }, view.icon),
      h('div', { class: 'titles' },
        h('div', { class: 'panel-title' }, view.title),
        view.subtitle ? h('div', { class: 'panel-sub' }, view.subtitle) : null),
      toggle),
    h('div', { class: 'panel-body' },
      h('div', { class: `progress ${view.tone && view.tone !== 'normal' ? view.tone : ''}` },
        h('div', { style: { width: pct === null ? '100%' : `${(pct * 100).toFixed(1)}%`, opacity: pct === null ? '.35' : '1' } })),
      view.stats?.length
        ? h('div', { class: 'stats' }, view.stats.map(([label, value]) => h('span', null, `${label} `, h('b', null, value))))
        : null,
      view.status ? h('div', { class: 'status-line', title: view.status }, view.status) : null,
      view.details ?? null),
    view.actions ? h('div', { class: 'panel-foot' }, view.actions) : null,
  );
  setLauncherBusy(view.badge ?? null);
}

export function hideJob(): void {
  panelEl?.remove();
  panelEl = null;
  setLauncherBusy(null);
}
