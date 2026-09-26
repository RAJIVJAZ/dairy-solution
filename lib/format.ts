const nf = (dp: number) => new Intl.NumberFormat('en-IN', { minimumFractionDigits: dp, maximumFractionDigits: dp });
const cache = new Map<number, Intl.NumberFormat>();
const fmt = (dp: number) => {
  let f = cache.get(dp);
  if (!f) cache.set(dp, (f = nf(dp)));
  return f;
};

/** Indian digit grouping, fixed decimals: 1,00,000.0 */
export function num(n: number, dp = 0): string {
  const v = Math.abs(n) < 0.5 * 10 ** -dp ? 0 : n;
  return fmt(dp).format(v);
}

export const kg = (n: number, dp = 1) => `${num(n, dp)} kg`;

export function signed(n: number, dp = 1): string {
  const v = Math.abs(n) < 0.5 * 10 ** -dp ? 0 : n;
  return `${v > 0 ? '+' : v < 0 ? '−' : ''}${num(Math.abs(v), dp)}`;
}

export function pct(x: number, dp = 2): string {
  const v = Math.abs(x) < 0.5 * 10 ** -(dp + 2) ? 0 : x;
  return `${num(v * 100, dp)}%`;
}

export function inr(n: number, dp = 0): string {
  return `₹${num(n, dp)}`;
}

/** ₹9.1 lakh, ₹1.2 crore */
export function inrShort(n: number): string {
  const a = Math.abs(n);
  const s = n < 0 ? '−' : '';
  if (a >= 1e7) return `${s}₹${num(a / 1e7, 2)} crore`;
  if (a >= 1e5) return `${s}₹${num(a / 1e5, 1)} lakh`;
  return `${s}₹${num(a, 0)}`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function parts(day: string) {
  const [y, m, d] = day.split('-').map(Number);
  return { y, m, d, dow: new Date(y, m - 1, d).getDay() };
}

/** 26 Sep */
export function dayShort(day: string): string {
  const p = parts(day);
  return `${p.d} ${MONTHS[p.m - 1]}`;
}

/** Sat 26 Sep 2026 */
export function dayLong(day: string): string {
  const p = parts(day);
  return `${DOW[p.dow]} ${p.d} ${MONTHS[p.m - 1]} ${p.y}`;
}

/** Sat 26 */
export function dayDow(day: string): string {
  const p = parts(day);
  return `${DOW[p.dow]} ${p.d}`;
}

export const time = (ts: string) => ts.slice(11, 16);
