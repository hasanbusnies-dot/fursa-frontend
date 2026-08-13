/**
 * String-safe money formatting.
 *
 * Wallet balances and amounts arrive from the API as decimal STRINGS and may exceed
 * Number.MAX_SAFE_INTEGER (2^53) — so they MUST NEVER be parsed through Number(),
 * which silently loses precision past 2^53. Here the integer part is handled via
 * BigInt (exact at any magnitude) and the fractional part via string ops; nothing
 * ever becomes a float. Pair with the backend contract (src/lib/prisma.ts) that
 * serializes wallet money as strings.
 */

export type Currency = 'SYP' | 'USD' | 'EUR';

const CURRENCY: Record<Currency, { symbol: string; before: boolean }> = {
  SYP: { symbol: 'ل.س', before: false }, // new Syrian pound
  USD: { symbol: '$',   before: true  },
  EUR: { symbol: '€',   before: true  },
};

/** Insert thousands separators into a non-negative integer digit string. */
function groupThousands(intDigits: string): string {
  return intDigits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Format a decimal string as a grouped, 2-dp number — EXACTLY, at any magnitude.
 * e.g. "9007199400000000.9" → "9,007,199,400,000,000.90". No Number(), no float.
 */
export function formatAmount(value: string): string {
  const trimmed = (value ?? '').trim();
  if (trimmed === '' || trimmed === '-' || trimmed === '+') return '0.00';

  const negative = trimmed.startsWith('-');
  const [intRaw = '0', fracRaw = ''] = trimmed.replace(/^[+-]/, '').split('.');

  // Digits only (defensive — the backend sends clean decimals).
  const intClean = intRaw.replace(/\D/g, '') || '0';
  // BigInt normalizes (drops leading zeros) EXACTLY, even far past 2^53.
  const intNorm = BigInt(intClean).toString();
  const frac2 = (fracRaw.replace(/\D/g, '') + '00').slice(0, 2);

  const grouped = groupThousands(intNorm);
  const isZero = intNorm === '0' && frac2 === '00';
  return `${negative && !isZero ? '-' : ''}${grouped}.${frac2}`;
}

/** Format money with the currency affix (SYP suffix "ل.س", USD/EUR prefix symbol). */
export function formatMoney(value: string, currency?: Currency | string): string {
  const num = formatAmount(value);
  if (!currency) return num;
  const c = (CURRENCY as Record<string, { symbol: string; before: boolean }>)[currency];
  if (!c) return `${num} ${currency}`;
  return c.before ? `${c.symbol}${num}` : `${num} ${c.symbol}`;
}

/** Bare currency symbol/label for chips and headings. */
export function currencyLabel(currency: string): string {
  return (CURRENCY as Record<string, { symbol: string }>)[currency]?.symbol ?? currency;
}

/**
 * A LISTING price, in the compact form the cards use — «$65,000», «19,900 ل.س».
 *
 * Deliberately separate from `formatMoney` above, and deliberately `number`-based:
 *   · wallet amounts are unbounded decimal STRINGS that must never touch Number(),
 *     and always want their 2 decimal places;
 *   · listing prices arrive as JSON numbers far below 2^53, and a map pill reading
 *     «$65,000.00» would be noise — the ad is not priced to the cent.
 *
 * It lives here rather than in a component because the browse map now labels
 * markers with it: a price on the map MUST read exactly like the same price on the
 * card, and one shared function is what makes drift impossible.
 *
 * NOTE: `ListingCard` and `FeaturedSection` still carry their own local copies of
 * this logic (identical output). Folding them into this one is a separate cleanup —
 * see FOLLOWUPS.md — kept out of the map work so card rendering isn't touched here.
 */
const listingPriceGrouping = new Intl.NumberFormat('en-US');

export function formatListingPrice(price: number, currency: 'SYP' | 'USD' | string): string {
  const n = listingPriceGrouping.format(price);
  return currency === 'USD' ? `$${n}` : `${n} ل.س`;
}

/** Decimal-string value scaled to BigInt cents — exact at any magnitude, no floats.
 *  (BigInt() calls, not literals — the tsconfig target predates ES2020.) */
function toCents(value: string): bigint {
  const trimmed = (value ?? '').trim();
  if (trimmed === '' || trimmed === '-' || trimmed === '+') return BigInt(0);
  const negative = trimmed.startsWith('-');
  const [intRaw = '0', fracRaw = ''] = trimmed.replace(/^[+-]/, '').split('.');
  const intClean = intRaw.replace(/\D/g, '') || '0';
  const frac2 = (fracRaw.replace(/\D/g, '') + '00').slice(0, 2);
  const cents = BigInt(intClean) * BigInt(100) + BigInt(frac2);
  return negative ? -cents : cents;
}

/** Compare two decimal money strings exactly (-1 | 0 | 1), e.g. for "is the wallet
 *  balance enough to cover this price?" — same no-Number() contract as formatAmount. */
export function compareAmounts(a: string, b: string): -1 | 0 | 1 {
  const ca = toCents(a);
  const cb = toCents(b);
  return ca < cb ? -1 : ca > cb ? 1 : 0;
}

/** Multiply a decimal money string by a small non-negative INTEGER factor — exact,
 *  no floats (e.g. pricePerWeek × durationInWeeks). Returns a plain decimal string. */
export function multiplyAmount(value: string, factor: number): string {
  const cents = toCents(value) * BigInt(Math.trunc(factor));
  const negative = cents < BigInt(0);
  const abs = negative ? -cents : cents;
  const int = (abs / BigInt(100)).toString();
  const frac = (abs % BigInt(100)).toString().padStart(2, '0');
  return `${negative ? '-' : ''}${int}.${frac}`;
}
