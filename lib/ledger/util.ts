import { ZERO, type Qty } from './types';

export const isAccount = (node: string) => node.includes(':');
export const isLot = (node: string) => !node.includes(':');

export function add(a: Qty, b: Qty): Qty {
  return { kg: a.kg + b.kg, fat: a.fat + b.fat, snf: a.snf + b.snf, cost: a.cost + b.cost };
}

export function sub(a: Qty, b: Qty): Qty {
  return { kg: a.kg - b.kg, fat: a.fat - b.fat, snf: a.snf - b.snf, cost: a.cost - b.cost };
}

export function scale(a: Qty, f: number): Qty {
  return { kg: a.kg * f, fat: a.fat * f, snf: a.snf * f, cost: a.cost * f };
}

export function sum(list: Qty[]): Qty {
  return list.reduce(add, { ...ZERO });
}

export const r2 = (n: number) => Math.round(n * 100) / 100;
export const r3 = (n: number) => Math.round(n * 1000) / 1000;

export function roundQty(q: Qty): Qty {
  return { kg: r2(q.kg), fat: r3(q.fat), snf: r3(q.snf), cost: r2(q.cost) };
}

/** Deterministic PRNG so the sample plant is identical on every device. */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeRandom(seed: number) {
  const next = mulberry32(seed);
  const normal = (mean = 0, sd = 1) => {
    const u = Math.max(next(), 1e-9);
    const v = next();
    return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  const between = (lo: number, hi: number) => lo + (hi - lo) * next();
  const pick = <T,>(list: readonly T[]) => list[Math.floor(next() * list.length)];
  return { next, normal, between, pick };
}

export const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/* ---------- local dates, always in the device's own zone ---------- */

export function dayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function addDays(day: string, n: number): string {
  const [y, m, d] = day.split('-').map(Number);
  return dayKey(new Date(y, m - 1, d + n));
}

export function daysBetween(a: string, b: string): number {
  const [y1, m1, d1] = a.split('-').map(Number);
  const [y2, m2, d2] = b.split('-').map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000);
}

export function at(day: string, hhmm: string): string {
  return `${day}T${hhmm}:00`;
}

export function mmdd(day: string): string {
  return day.slice(5, 7) + day.slice(8, 10);
}

export function minutesToHhmm(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = Math.floor(mins % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
