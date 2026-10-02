/** Merging several wishlist files into one scrape list, detecting conflicts. */
import type { WishlistPrinting } from '../wishlistExporter';
import type { LoadedWishlist, ScrapeCard } from './types';

export interface Conflict {
  cardName: string;
  /** One option per distinct set of requirements, amounts summed per group. */
  options: ScrapeCard[];
}

export function mergeWishlists(wishlists: LoadedWishlist[]): { mergedCards: ScrapeCard[]; conflicts: Conflict[] } {
  const variations = new Map<string, ScrapeCard[]>();
  for (const wishlist of wishlists) {
    for (const card of wishlist.cards) {
      const list = variations.get(card.name) ?? [];
      list.push({
        ...card,
        wishlist_id: wishlist.id,
        amount: card.amount || 1,
        wishlist_account: wishlist.account,
        wishlist_name: wishlist.name,
        wishlist_amounts: {},
      });
      variations.set(card.name, list);
    }
  }

  const merged = new Map<string, ScrapeCard>();
  const conflicts: Conflict[] = [];

  const combine = (group: ScrapeCard[]): ScrapeCard => {
    const amounts: Record<string, number> = {};
    group.forEach((v) => {
      amounts[v.wishlist_id!] = v.amount;
    });
    return { ...group[0], amount: group.reduce((s, v) => s + v.amount, 0), wishlist_amounts: amounts };
  };

  variations.forEach((list, cardName) => {
    const groups = new Map<string, ScrapeCard[]>();
    for (const v of list) {
      const key = JSON.stringify({
        condition: v.condition,
        is_foil: v.is_foil,
        languages: v.languages ? [...v.languages].sort() : null,
        printings: v.printings ? [...v.printings].sort((a, b) => (JSON.stringify(a) < JSON.stringify(b) ? -1 : 1)) : null,
      });
      groups.set(key, [...(groups.get(key) ?? []), v]);
    }
    const options = Array.from(groups.values()).map(combine);
    if (options.length > 1) conflicts.push({ cardName, options });
    merged.set(cardName, options[0]); // first option is the default until resolved
  });

  return { mergedCards: Array.from(merged.values()), conflicts };
}

export interface Resolution {
  languages: string[];
  condition: string;
  is_foil: boolean | null;
  amount: number;
  printings: WishlistPrinting[];
}

/**
 * Build the resolved card: first option as base, the user's filter choices on
 * top, and every wishlist's amount scaled to the chosen total
 * (largest-remainder rounding, so they sum exactly to it).
 */
export function resolveConflict(conflict: Conflict, choice: Resolution): ScrapeCard {
  const base = conflict.options[0];
  const amounts: Record<string, number> = {};
  conflict.options.forEach((opt) => {
    Object.entries(opt.wishlist_amounts || {}).forEach(([id, amt]) => {
      amounts[id] = (amounts[id] || 0) + amt;
    });
  });
  const originalTotal = Object.values(amounts).reduce((s, v) => s + v, 0);
  if (originalTotal > 0 && originalTotal !== choice.amount) {
    const shares = Object.entries(amounts).map(([id, amt]) => {
      const exact = (amt * choice.amount) / originalTotal;
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
    wishlist_amounts: amounts,
  };
}
