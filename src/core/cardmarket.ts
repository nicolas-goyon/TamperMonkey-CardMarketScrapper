/** CardMarket-specific constants and page/URL helpers shared by every feature. */

/**
 * The 11 card languages CardMarket supports, spelled exactly as in the
 * English site's tooltips/aria-labels. Used to tell language labels apart
 * from other icon labels (rarity, condition, ...).
 */
export const KNOWN_LANGUAGES = [
  'English', 'French', 'German', 'Spanish', 'Italian', 'S-Chinese',
  'Japanese', 'Portuguese', 'Russian', 'Korean', 'T-Chinese',
] as const;

/** idLanguage / language filter ids (superset of KNOWN_LANGUAGES). */
export const LANGUAGE_IDS: Record<string, string> = {
  English: '1', French: '2', German: '3', Spanish: '4', Italian: '5',
  'S-Chinese': '6', Japanese: '7', Portuguese: '8', Russian: '9',
  Korean: '10', 'T-Chinese': '11', Dutch: '12', Polish: '13', Czech: '14',
  Hungarian: '15', Indonesian: '16', Thai: '17',
};

/** minCondition filter ids, matching the Python scraper. */
export const CONDITION_IDS: Record<string, string> = {
  Mint: '1', 'Near Mint': '2', Excellent: '3', Good: '4',
  'Light Played': '5', Played: '6', Poor: '7',
};

export function currentSiteLanguage(): string {
  const match = window.location.pathname.match(/^\/([a-z]{2})\//);
  return match ? match[1] : 'en';
}

export function isEnglishVersion(): boolean {
  return window.location.pathname.startsWith('/en/');
}

/** Same page on the English site (parsing relies on English labels). */
export function englishUrl(href = window.location.href): string {
  const lang = currentSiteLanguage();
  return lang === 'en' ? href : href.replace(`/${lang}/`, '/en/');
}

export const route = {
  wishlistId(): string | null {
    const match = window.location.pathname.match(/\/Wants\/(\d+)/);
    return match ? match[1] : null;
  },
  isShoppingCart(): boolean {
    return /\/(Shopping-Cart|ShoppingCart)/.test(window.location.pathname);
  },
  isMagic(): boolean {
    return /^\/[a-z]{2}\/Magic(\/|$)/.test(window.location.pathname);
  },
  /** Seller name on /Magic/Users/<seller>/Offers/Singles pages. */
  singlesSeller(): string | null {
    const match = window.location.pathname.match(/\/Magic\/Users\/([^/]+)\/Offers\/Singles/);
    return match ? decodeURIComponent(match[1]) : null;
  },
};

/** CardMarket's own dark mode (Bootstrap theme attribute or color-scheme). */
export function siteIsDark(): boolean {
  const html = document.documentElement;
  return html.getAttribute('data-bs-theme') === 'dark' ||
    getComputedStyle(html).getPropertyValue('color-scheme').includes('dark');
}
