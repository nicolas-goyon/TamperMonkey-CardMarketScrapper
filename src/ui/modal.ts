import { Child, h } from './dom';
import { getUIRoot } from './root';

export interface ModalOptions {
  title: string;
  subtitle?: Child;
  body: Child;
  footer?: Child;
  wide?: boolean;
  /** Close on Escape / backdrop click / ✕. Default true. */
  dismissible?: boolean;
  onClose?: () => void;
}

export interface ModalHandle {
  close(): void;
  root: HTMLDivElement;
  body: HTMLDivElement;
  footer: HTMLDivElement;
}

/** Centered modal. Only one at a time: opening another replaces it. */
export function openModal(options: ModalOptions): ModalHandle {
  const { overlays } = getUIRoot();
  overlays.replaceChildren();
  const dismissible = options.dismissible ?? true;

  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    overlay.remove();
    document.removeEventListener('keydown', onKey, true);
    options.onClose?.();
  };
  const onKey = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && dismissible) {
      event.stopPropagation();
      close();
    }
  };

  const body = h('div', { class: 'modal-body' }, options.body);
  const footer = h('div', { class: 'modal-foot' }, options.footer);
  const box = h('div', { class: `surface modal${options.wide ? ' wide' : ''}`, role: 'dialog', 'aria-modal': 'true', 'aria-label': options.title },
    h('div', { class: 'modal-head' },
      h('div', { class: 'titles' },
        h('h2', { class: 'modal-title' }, options.title),
        options.subtitle ? h('div', { class: 'modal-sub' }, options.subtitle) : null),
      dismissible ? h('button', { class: 'icon-btn', title: 'Close', 'aria-label': 'Close', onClick: close }, '✕') : null),
    body,
    options.footer ? footer : null,
  );
  const overlay = h('div', { class: 'overlay' }, box);
  overlay.addEventListener('mousedown', (event) => {
    if (event.target === overlay && dismissible) close();
  });
  overlays.appendChild(overlay);
  document.addEventListener('keydown', onKey, true);
  return { close, root: box, body, footer };
}

export function closeModals(): void {
  getUIRoot().overlays.replaceChildren();
}
