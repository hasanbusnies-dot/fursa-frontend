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
