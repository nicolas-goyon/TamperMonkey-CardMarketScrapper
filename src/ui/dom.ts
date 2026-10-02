/**
 * Minimal hyperscript helper: h('div', { class: 'x', onClick: fn }, 'text', child).
 * Text children are always inserted as text nodes — never parsed as HTML —
 * so card/seller names can't inject markup.
 */
export type Child = Node | string | number | null | undefined | false | Child[];

type Handler = (event: any) => void;
export interface Props {
  class?: string;
  style?: string | Partial<CSSStyleDeclaration>;
  [key: string]: unknown;
}

const PROP_KEYS = new Set(['value', 'checked', 'disabled', 'selected', 'type', 'title', 'min', 'max', 'htmlFor', 'id', 'name', 'placeholder', 'multiple', 'accept']);

export function h<K extends keyof HTMLElementTagNameMap>(tag: K, props?: Props | null, ...children: Child[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (props) {
    for (const [key, value] of Object.entries(props)) {
      if (value === undefined || value === null || value === false) continue;
      if (key === 'class') el.className = String(value);
      else if (key === 'style') {
        if (typeof value === 'string') el.setAttribute('style', value);
        else Object.assign(el.style, value);
      } else if (key.startsWith('on') && typeof value === 'function') {
        el.addEventListener(key.slice(2).toLowerCase(), value as Handler);
      } else if (PROP_KEYS.has(key)) {
        (el as any)[key] = value;
      } else {
        el.setAttribute(key, value === true ? '' : String(value));
      }
    }
  }
  append(el, children);
  return el;
}

export function append(parent: Node, children: Child[]): void {
  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    if (Array.isArray(child)) append(parent, child);
    else parent.appendChild(typeof child === 'object' ? child : document.createTextNode(String(child)));
  }
}

/** Replace all children of `el`. */
export function setChildren(el: Element, ...children: Child[]): void {
  el.replaceChildren();
  append(el, children);
}
