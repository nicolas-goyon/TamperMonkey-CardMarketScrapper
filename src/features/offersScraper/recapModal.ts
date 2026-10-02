/**
 * "Merge recap" modal shown after picking wishlist files: lists the merged
 * cards and, for cards whose requirements differ between wishlists, an inline
 * editor to pick the filters to scrape with. Scraping can start once every
 * conflict is resolved.
 */
import { CONDITION_IDS } from '../../core/cardmarket';
import { h, setChildren } from '../../ui/dom';
import { openModal } from '../../ui/modal';
import { toast } from '../../ui/toast';
import type { WishlistPrinting } from '../wishlistExporter';
import { Conflict, mergeWishlists, resolveConflict } from './merge';
import { startRun } from './runner';
import type { LoadedWishlist, ScrapeCard } from './types';

const printingLabel = (p: WishlistPrinting) => `${p.expansion}${p.version ? ` (V.${p.version})` : ''}`;
const printingKey = (p: WishlistPrinting) => `${p.expansion}|${p.version || ''}`;
const foilLabel = (f: boolean | null | undefined) => (f === true ? 'Foil' : f === false ? 'Non-foil' : 'Any');

export function showMergeRecap(wishlists: LoadedWishlist[]): void {
  const { mergedCards, conflicts } = mergeWishlists(wishlists);
  const resolved = new Map<string, ScrapeCard>();
  const conflictByName = new Map(conflicts.map((c) => [c.cardName, c]));

  const wishlistLabel = (id: string, amount: number) => {
    const wl = wishlists.find((w) => w.id === id);
    const account = wl?.account || id;
    return `${wl?.name ? `${account} – ${wl.name}` : account} ×${amount}`;
  };

  // ---- table
  const mainRows = new Map<string, HTMLTableRowElement>();
  const renderMainRow = (row: HTMLTableRowElement, card: ScrapeCard, conflict: Conflict | undefined) => {
    const isResolved = resolved.has(card.name);
    row.className = conflict ? `conflict${isResolved ? ' resolved' : ''}` : '';
    setChildren(row,
      h('td', null, conflict ? h('span', { class: `badge ${isResolved ? 'success' : 'warning'}`, style: 'margin-right:6px' }, isResolved ? 'resolved' : 'conflict') : null, h('b', null, card.name)),
      h('td', { class: 'small' }, card.printings?.length ? card.printings.map(printingLabel).join(', ') : 'Any'),
      h('td', { class: 'c' }, card.languages?.length ? card.languages.join(', ') : 'Any'),
      h('td', { class: 'c' }, card.condition || 'Any'),
      h('td', { class: 'c' }, foilLabel(card.is_foil)),
      h('td', { class: 'c' }, h('b', null, String(card.amount))),
      h('td', { class: 'small muted' }, Object.entries(card.wishlist_amounts || {}).map(([id, n]) => wishlistLabel(id, n)).join(', ')));
  };

  const tbody = h('tbody');
  for (const card of mergedCards) {
    const conflict = conflictByName.get(card.name);
    const row = h('tr');
    mainRows.set(card.name, row);
    renderMainRow(row, card, conflict);
    tbody.appendChild(row);
    if (conflict) tbody.appendChild(conflictEditor(conflict));
  }

  // ---- conflict editor rows
  function conflictEditor(conflict: Conflict): HTMLTableRowElement {
    const first = conflict.options[0];
    const languages = Array.from(new Set(conflict.options.flatMap((o) => o.languages || [])));
    const conditions = Array.from(new Set([...conflict.options.map((o) => o.condition).filter(Boolean), ...Object.keys(CONDITION_IDS)]));
    const printings: WishlistPrinting[] = [];
    conflict.options.forEach((o) => (o.printings || []).forEach((p) => {
      if (!printings.some((q) => printingKey(q) === printingKey(p))) printings.push(p);
    }));

    const langBoxes = languages.map((lang) => h('input', { type: 'checkbox', value: lang, checked: first.languages?.includes(lang) }));
    const printBoxes = printings.map((p) => h('input', { type: 'checkbox', value: printingKey(p), checked: first.printings?.some((q) => printingKey(q) === printingKey(p)) }));
    const condSelect = h('select', { class: 'control' }, conditions.map((c) => h('option', { value: c, selected: c === first.condition }, c)));
    const foilSelect = h('select', { class: 'control' },
      h('option', { value: 'any', selected: first.is_foil == null }, 'Any'),
      h('option', { value: 'true', selected: first.is_foil === true }, 'Foil'),
      h('option', { value: 'false', selected: first.is_foil === false }, 'Non-foil'));
    const totalAmount = conflict.options.reduce((s, o) => s + o.amount, 0);
    const amountInput = h('input', { class: 'control', type: 'number', min: '1', value: String(totalAmount) });
    const status = h('span', { class: 'muted small' });

    const preset = h('select', {
      class: 'control',
      onChange: () => {
        const option = conflict.options[parseInt(preset.value, 10)];
        if (!option) return;
        langBoxes.forEach((cb) => (cb.checked = !!option.languages?.includes(cb.value)));
        printBoxes.forEach((cb) => (cb.checked = !!option.printings?.some((p) => printingKey(p) === cb.value)));
        condSelect.value = option.condition || '';
        foilSelect.value = option.is_foil === true ? 'true' : option.is_foil === false ? 'false' : 'any';
        amountInput.value = String(option.amount);
      },
    },
    h('option', { value: '-1' }, 'Custom'),
    conflict.options.map((o, i) => h('option', { value: String(i), selected: i === 0 },
      `Option ${i + 1}: ${Object.entries(o.wishlist_amounts || {}).map(([id, n]) => wishlistLabel(id, n)).join(', ')}`)));

    const apply = () => {
      const card = resolveConflict(conflict, {
        languages: langBoxes.filter((cb) => cb.checked).map((cb) => cb.value),
        condition: condSelect.value || first.condition,
        is_foil: foilSelect.value === 'true' ? true : foilSelect.value === 'false' ? false : null,
        amount: Math.max(1, parseInt(amountInput.value, 10) || 1),
        printings: printBoxes.filter((cb) => cb.checked).map((cb) => {
          const [expansion, version] = cb.value.split('|');
          return { expansion, version: version || null };
        }),
      });
      resolved.set(conflict.cardName, card);
      renderMainRow(mainRows.get(conflict.cardName)!, card, conflict);
      status.textContent = '✓ Applied — change and apply again if needed';
      updateFooter();
    };

    const field = (label: string, control: HTMLElement) => h('div', null, h('div', { class: 'field-label' }, label), control);
    return h('tr', { class: 'editor' }, h('td', { colspan: '7' },
      h('div', { class: 'row between', style: 'margin-bottom:10px' },
        h('b', null, `Pick the filters to scrape “${conflict.cardName}” with`),
        h('label', { class: 'row small' }, 'Start from', preset)),
      h('div', { class: 'editor-grid' },
        field('Languages', languages.length ? h('div', { class: 'checks' }, langBoxes.map((cb) => h('label', null, cb, cb.value))) : h('span', { class: 'muted' }, 'Any')),
        field('Min. condition', condSelect),
        field('Foil', foilSelect),
        field('Amount', amountInput)),
      printings.length
        ? field('Printings', h('div', { class: 'checks', style: 'margin-bottom:10px' }, printBoxes.map((cb, i) => h('label', null, cb, printingLabel(printings[i])))))
        : null,
      h('div', { class: 'row' }, h('button', { class: 'btn primary sm', onClick: apply }, 'Apply'), status)));
  }

  // ---- footer
  const remaining = () => conflicts.length - resolved.size;
  const startBtn = h('button', { class: 'btn primary' });
  const footerNote = h('span', { class: 'spacer' });
  const banner = h('div');
  const updateFooter = () => {
    const left = remaining();
    startBtn.disabled = left > 0;
    startBtn.textContent = left > 0 ? `${left} conflict(s) to resolve` : `Start scraping ${mergedCards.length} card(s)`;
    footerNote.textContent = left > 0 ? 'Resolve every highlighted card to continue.' : 'Keep this tab open while it runs; you can use other tabs.';
    setChildren(banner, conflicts.length === 0 ? null : left > 0
      ? h('div', { class: 'callout warning' }, h('b', null, `${left} card(s) `), 'appear in several wishlists with different requirements. Choose the filters for each below and click Apply.')
      : h('div', { class: 'callout success' }, h('b', null, 'All conflicts resolved. '), 'You can start scraping.'));
  };

  startBtn.addEventListener('click', async () => {
    if (remaining() > 0) return;
    const finalCards = mergedCards.map((c) => resolved.get(c.name) ?? c);
    if (finalCards.length === 0) {
      toast('error', 'The merged card list is empty — nothing to scrape.');
      return;
    }
    startBtn.disabled = true;
    startBtn.textContent = 'Starting…';
    modal.close();
    await startRun(
      finalCards,
      wishlists.map((w) => w.id),
      wishlists.map((w) => ({ id: w.id, account: w.account || 'Unknown Account', name: w.name || 'Unnamed Wishlist' })),
    );
  });

  const modal = openModal({
    title: 'Scrape offers — merge recap',
    subtitle: `${wishlists.length} wishlist(s) loaded · ${mergedCards.length} unique card(s) after merging`,
    wide: true,
    body: h('div', null,
      h('div', { class: 'chips' }, wishlists.map((w) =>
        h('span', { class: 'chip' }, h('b', null, w.account || 'Unknown account'), w.name || 'Unnamed wishlist', h('span', { class: 'muted' }, `#${w.id} · ${w.cards.length} cards`)))),
      banner,
      h('div', { class: 'table-wrap' },
        h('table', { class: 'grid' },
          h('thead', null, h('tr', null,
            h('th', null, 'Card'), h('th', null, 'Printings'), h('th', { class: 'c' }, 'Languages'),
            h('th', { class: 'c' }, 'Condition'), h('th', { class: 'c' }, 'Foil'), h('th', { class: 'c' }, 'Amount'), h('th', null, 'Wishlists'))),
          tbody))),
    footer: [footerNote, h('button', { class: 'btn', onClick: () => modal.close() }, 'Cancel'), startBtn],
  });
  updateFooter();
}
