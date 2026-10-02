import { h } from './dom';
import { getUIRoot } from './root';

export type ToastKind = 'info' | 'success' | 'warning' | 'error';

export interface ToastOptions {
  title?: string;
  /** ms before auto-dismiss; 0 = sticky until closed. Default: 5s, sticky for warnings/errors. */
  duration?: number;
}

const ICONS: Record<ToastKind, string> = { info: 'ℹ️', success: '✅', warning: '⚠️', error: '❌' };

/** Non-blocking notification (replaces the old scripts' alert() calls). */
export function toast(kind: ToastKind, message: string, options: ToastOptions = {}): () => void {
  const { slots } = getUIRoot();
  const duration = options.duration ?? (kind === 'warning' || kind === 'error' ? 0 : 5000);
  const close = () => el.remove();
  const el = h('div', { class: `surface toast ${kind}`, role: kind === 'error' ? 'alert' : 'status' },
    h('span', { class: 't-ico' }, ICONS[kind]),
    h('div', { class: 't-body' },
      options.title ? h('div', { class: 't-title' }, options.title) : null,
      message),
    h('button', { class: 'icon-btn', title: 'Dismiss', 'aria-label': 'Dismiss', onClick: close }, '✕'),
  );
  slots.toasts.prepend(el);
  if (duration > 0) setTimeout(close, duration);
  // Keep the stack short
  const all = slots.toasts.querySelectorAll('.toast');
  for (let i = 5; i < all.length; i++) all[i].remove();
  return close;
}
