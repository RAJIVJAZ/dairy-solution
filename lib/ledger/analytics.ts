import { checkStep, type Ledger } from './engine';
import { khoyaYieldFor, paneerYieldFor } from './settings';
import type { Batch, Farmer, Invoice, Movement, Qty, Slip } from './types';
import { ZERO } from './types';
import { add, addDays, daysBetween, isLot, sum } from './util';

/* ---------------- memo per ledger ---------------- */

const caches = new WeakMap<Ledger, Map<string, unknown>>();
function memo<T>(L: Ledger, key: string, fn: () => T): T {
  let c = caches.get(L);
  if (!c) caches.set(L, (c = new Map()));
  if (!c.has(key)) c.set(key, fn());
  return c.get(key) as T;
}

const dayOf = (ts: string) => ts.slice(0, 10);

function movementsByDay(L: Ledger): Map<string, Movement[]> {
  return memo(L, 'byDay', () => {
    const m = new Map<string, Movement[]>();
    for (const x of L.ds.movements) {
      const d = dayOf(x.ts);
      const list = m.get(d);
      if (list) list.push(x);
      else m.set(d, [x]);
    }
    return m;
  });
}

const PROCESS = new Set(['separate', 'churn', 'clarify', 'khoya', 'paneer']);

export const litres = (L: Ledger, kg: number) => kg / L.ds.settings.density;

/* ---------------- one day at the plant ---------------- */

export interface DayStats {
  day: string;
  slips: number;
  farmers: number;
  centres: number;
  rejected: number;
  collected: Qty;
  received: Qty;
  receivedLitres: number;
  milkCost: number;
  costPerLitre: number;
  gheeKg: number;
  khoyaKg: number;
  paneerKg: number;
  dispatchDealers: number;
  dispatchKg: number;
  revenue: number;
  plantLoss: Qty;
  unexplained: Qty;
  /** share of the fat entering today's process steps that came out in products, by-products or stock */
  fatRecovery: number;
  snfRecovery: number;
}

export function dayStats(L: Ledger, day: string): DayStats {
  return memo(L, `day:${day}`, () => {
    const ms = movementsByDay(L).get(day) ?? [];
    const slips = L.ds.slips.filter((s) => s.day === day && (s.origin !== 'device' || s.syncState === 'synced'));
    const accepted = slips.filter((s) => s.status === 'accepted');
    const collected = sum(ms.filter((m) => m.step === 'collect').map((m) => m.qty));
    const toTank = ms.filter((m) => m.step === 'trip' && isLot(m.to));
    const received = sum(toTank.map((m) => m.qty));
    const transport = ms.filter((m) => m.from === 'overhead:transport').reduce((a, m) => a + m.qty.cost, 0);
    const milkCost = received.cost + transport;
    const receivedLitres = litres(L, received.kg);
    const into = (kind: string) =>
      ms.filter((m) => m.step !== 'overhead' && isLot(m.to) && L.ds.lots[m.to]?.kind === kind).reduce((a, m) => a + m.qty.kg, 0);
    const processMs = ms.filter((m) => PROCESS.has(m.step));
    const processInput = sum(processMs.map((m) => m.qty));
    const lossMs = processMs.filter((m) => m.to === 'loss:unexplained' || m.to === 'loss:process');
    const plantLoss = sum(lossMs.map((m) => m.qty));
    const unexplained = sum(lossMs.filter((m) => m.to === 'loss:unexplained').map((m) => m.qty));
    const dispatched = L.ds.invoices.filter((v) => v.day === day && v.status === 'dispatched' && v.dealerId !== 'BULK');
    return {
      day,
      slips: slips.length,
      farmers: new Set(accepted.map((s) => s.farmerId)).size,
      centres: new Set(accepted.map((s) => s.centreId)).size,
      rejected: slips.filter((s) => s.status === 'rejected').length,
      collected,
      received,
      receivedLitres,
      milkCost,
      costPerLitre: receivedLitres > 0 ? milkCost / receivedLitres : 0,
      gheeKg: into('ghee'),
      khoyaKg: into('khoya'),
      paneerKg: into('paneer'),
      dispatchDealers: new Set(dispatched.map((v) => v.dealerId)).size,
      dispatchKg: dispatched.reduce((a, v) => a + v.lines.reduce((s, l) => s + l.kg, 0), 0),
      revenue: dispatched.reduce((a, v) => a + v.total, 0),
      plantLoss,
      unexplained,
      fatRecovery: processInput.fat > 0 ? 1 - plantLoss.fat / processInput.fat : 1,
      snfRecovery: processInput.snf > 0 ? 1 - plantLoss.snf / processInput.snf : 1,
    };
  });
}

/** Average of a daily figure over the days before `day` in the window. */
export function baseline(L: Ledger, day: string, pick: (d: DayStats) => number, skipLast = 0): number {
  const idx = L.ds.days.indexOf(day);
  const prior = L.ds.days.slice(0, Math.max(0, idx - skipLast)).map((d) => pick(dayStats(L, d)));
  return prior.length ? prior.reduce((a, b) => a + b, 0) / prior.length : 0;
}

/* ---------------- centres ---------------- */

export interface CentreDay {
  centreId: string;
  name: string;
  farmers: number;
  kg: number;
  fatPct: number;
  snfPct: number;
  rejected: number;
  shrinkToday: number;
  shrinkAvg: number;
  scaleDays: number;
}

export function centreDays(L: Ledger, day: string): CentreDay[] {
  return memo(L, `centres:${day}`, () =>
    L.ds.centres.map((c) => {
      const slips = L.ds.slips.filter((s) => s.day === day && s.centreId === c.id);
      const ok = slips.filter((s) => s.status === 'accepted');
      const kg = ok.reduce((a, s) => a + s.kg, 0);
      const fat = ok.reduce((a, s) => a + (s.kg * s.fatPct) / 100, 0);
      const snf = ok.reduce((a, s) => a + (s.kg * s.snfPct) / 100, 0);
      const shrink = (trips: typeof L.ds.trips) => {
        const sent = trips.reduce((a, t) => a + t.sent.kg, 0);
        const rec = trips.reduce((a, t) => a + t.received.kg, 0);
        return sent > 0 ? 1 - rec / sent : 0;
      };
      const mine = L.ds.trips.filter((t) => t.centreId === c.id);
      return {
        centreId: c.id,
        name: c.name,
        farmers: new Set(ok.map((s) => s.farmerId)).size,
        kg,
        fatPct: kg ? (fat / kg) * 100 : 0,
        snfPct: kg ? (snf / kg) * 100 : 0,
        rejected: slips.filter((s) => s.status === 'rejected').length,
        shrinkToday: shrink(mine.filter((t) => t.day === day)),
        shrinkAvg: shrink(mine.filter((t) => t.day < day)),
        scaleDays: c.scaleCalibratedDaysAgo,
      };
    }),
  );
}

/* ---------------- dealers ---------------- */

export interface DealerStatus {
  id: string;
  name: string;
  route: string;
  kind: 'dealer' | 'bulk';
  limit: number;
  billed: number;
  paid: number;
  outstanding: number;
  over: boolean;
  lastPaid?: string;
  open: Invoice[];
}

export function dealerStatus(L: Ledger): DealerStatus[] {
  return memo(L, 'dealers', () =>
    L.ds.dealers.map((d) => {
      const inv = L.ds.invoices.filter((v) => v.dealerId === d.id);
      const billed = inv.filter((v) => v.status === 'dispatched').reduce((a, v) => a + v.total, 0);
      const pays = L.ds.payments.filter((p) => p.dealerId === d.id);
      const paid = pays.reduce((a, p) => a + p.amount, 0);
      const outstanding = billed - paid;
      return {
        id: d.id,
        name: d.name,
        route: d.route,
        kind: d.kind,
        limit: d.creditLimit,
        billed,
        paid,
        outstanding,
        over: outstanding > d.creditLimit,
        lastPaid: pays.at(-1)?.day,
        open: inv.filter((v) => v.status === 'pending'),
      };
    }),
  );
}

/* ---------------- packaging and maintenance ---------------- */

export function packagingStatus(L: Ledger) {
  return L.ds.packaging.map((p) => {
    const cover = p.dailyUse > 0 ? p.stock / p.dailyUse : Infinity;
    return { ...p, cover, reorder: cover < p.leadDays };
  });
}

export function maintenanceStatus(L: Ledger) {
  return L.ds.equipment
    .map((e) => {
      const since = daysBetween(e.lastServiced, L.ds.today);
      const dueIn = e.intervalDays - since;
      return { ...e, since, dueIn, due: addDays(e.lastServiced, e.intervalDays), urgent: dueIn <= 7 };
    })
    .sort((a, b) => a.dueIn - b.dueIn);
}

/* ---------------- batches and yield ---------------- */

export interface YieldAnalysis {
  actual: number;
  standard: number;
  expected: number;
  /** points of yield explained by the input's composition */
  explained: number;
  /** points of yield nobody can account for */
  unexplained: number;
  basis: string;
}

export function yieldAnalysis(L: Ledger, b: Batch): YieldAnalysis | null {
  if (b.yieldActual === undefined || b.yieldStandard === undefined) return null;
  const s = L.ds.settings;
  const input = checkStep(L, b.group).input;
  if (input.kg <= 0) return null;
  let expected = b.yieldStandard;
  let basis = '';
  if (b.kind === 'ghee') {
    const butterFat = input.fat / input.kg;
    expected = (butterFat * s.standards.gheeRecovery) / s.standards.gheeFat;
    basis = `butter at ${(butterFat * 100).toFixed(1)}% fat against a ${(s.standards.butterFat * 100).toFixed(0)}% standard`;
  } else if (b.kind === 'khoya') {
    expected = khoyaYieldFor(input.fat / input.kg, input.snf / input.kg, s);
    basis = `milk at ${((input.fat / input.kg) * 100).toFixed(2)}% fat and ${((input.snf / input.kg) * 100).toFixed(2)}% SNF`;
  } else if (b.kind === 'paneer') {
    expected = paneerYieldFor(input.fat / input.kg, input.snf / input.kg, s);
    basis = `milk at ${((input.fat / input.kg) * 100).toFixed(2)}% fat and ${((input.snf / input.kg) * 100).toFixed(2)}% SNF`;
  }
  return {
    actual: b.yieldActual,
    standard: b.yieldStandard,
    expected,
    explained: b.yieldStandard - expected,
    unexplained: expected - b.yieldActual,
    basis,
  };
}

export type BatchState = 'Balanced' | 'Below standard' | 'Open';

/** Half a point of yield nobody can explain is where a plant manager should look. */
export const YIELD_ALERT_POINTS = 0.005;

export function batchState(L: Ledger, b: Batch): BatchState {
  const c = checkStep(L, b.group);
  if (!c.closed) return 'Open';
  const y = yieldAnalysis(L, b);
  if (y && y.unexplained > YIELD_ALERT_POINTS) return 'Below standard';
  return 'Balanced';
}

export function lotCost(L: Ledger, lotId: string): { kg: number; cost: number; perKg: number } {
  const ins = (L.into.get(lotId) ?? []).reduce((a, m) => add(a, m.qty), { ...ZERO });
  return { kg: ins.kg, cost: ins.cost, perKg: ins.kg > 0 ? ins.cost / ins.kg : 0 };
}

export function finishedStock(L: Ledger) {
  return Object.values(L.ds.lots)
    .filter((l) => l.kind === 'ghee' || l.kind === 'khoya' || l.kind === 'paneer')
    .map((l) => {
      const ins = (L.into.get(l.id) ?? []).reduce((a, m) => a + m.qty.kg, 0);
      const outs = (L.outOf.get(l.id) ?? []).reduce((a, m) => a + m.qty.kg, 0);
      const c = lotCost(L, l.id);
      return { lot: l, kg: ins - outs, value: (ins - outs) * c.perKg, perKg: c.perKg, expiresIn: l.expires ? daysBetween(L.ds.today, l.expires) : undefined };
    })
    .filter((x) => x.kg > 0.05)
    .sort((a, b) => (a.lot.expires ?? '').localeCompare(b.lot.expires ?? ''));
}

export function intermediateStock(L: Ledger) {
  return Object.values(L.ds.lots)
    .filter((l) => l.kind === 'tank' || l.kind === 'cream' || l.kind === 'butter' || l.kind === 'skim' || l.kind === 'centre')
    .map((l) => {
      const ins = sum((L.into.get(l.id) ?? []).map((m) => m.qty));
      const outs = sum((L.outOf.get(l.id) ?? []).map((m) => m.qty));
      return { lot: l, qty: { kg: ins.kg - outs.kg, fat: ins.fat - outs.fat, snf: ins.snf - outs.snf, cost: ins.cost - outs.cost } };
    })
    .filter((x) => x.qty.kg > 0.5);
}

/* ---------------- where the solids went ---------------- */

export interface FlowRow {
  key: string;
  name: string;
  fat: number;
  share: number;
  tone: 'fat' | 'snf' | 'cost' | 'butter' | 'neutral' | 'loss';
}

/**
 * Fat collected from farmers over the last `n` days, and where it is now.
 * The rows always add up to the fat collected, because stock still in tanks,
 * cream or butter is its own row. Use a window of several batch cycles so
 * pooled cream from before the window does not distort the shares.
 */
export function solidsFlow(L: Ledger, n = 28): { total: number; rows: FlowRow[]; from: string; to: string } {
  return memo(L, `flow:${n}`, () => {
    const from = addDays(L.ds.today, -(n - 1));
    const inWindow = L.ds.movements.filter((m) => m.ts.slice(0, 10) >= from);
    const kindOf = (node: string) => (isLot(node) ? L.ds.lots[node]?.kind : undefined);
    const intermediate = (node: string) => {
      const k = kindOf(node);
      return k === 'centre' || k === 'tank' || k === 'cream' || k === 'butter';
    };
    const total = inWindow.filter((m) => m.step === 'collect').reduce((a, m) => a + m.qty.fat, 0);
    const dest = (pred: (m: Movement) => boolean) =>
      inWindow.filter((m) => m.step !== 'overhead' && intermediate(m.from) && pred(m)).reduce((a, m) => a + m.qty.fat, 0);
    const ghee = dest((m) => kindOf(m.to) === 'ghee');
    const khoya = dest((m) => kindOf(m.to) === 'khoya');
    const paneer = dest((m) => kindOf(m.to) === 'paneer');
    const byproducts = dest((m) => kindOf(m.to) === 'skim' || m.to.startsWith('byproduct:'));
    const transit = dest((m) => m.to === 'loss:transit');
    const process = dest((m) => m.to === 'loss:process');
    const unexplained = dest((m) => m.to === 'loss:unexplained');
    const held = total - ghee - khoya - paneer - byproducts - transit - process - unexplained;
    const rows: FlowRow[] = [
      { key: 'ghee', name: 'Ghee', fat: ghee, share: 0, tone: 'fat' },
      { key: 'khoya', name: 'Khoya', fat: khoya, share: 0, tone: 'snf' },
      { key: 'paneer', name: 'Paneer', fat: paneer, share: 0, tone: 'cost' },
      { key: 'held', name: 'Cream and butter stock', fat: held, share: 0, tone: 'butter' },
      { key: 'byproducts', name: 'Skim and by-products', fat: byproducts, share: 0, tone: 'neutral' },
      { key: 'transit', name: 'Centre-to-plant shrinkage', fat: transit, share: 0, tone: 'loss' },
      { key: 'process', name: 'Standard process loss', fat: process, share: 0, tone: 'loss' },
      { key: 'unexplained', name: 'Unexplained loss', fat: unexplained, share: 0, tone: 'loss' },
    ];
    rows.forEach((r) => (r.share = total > 0 ? r.fat / total : 0));
    return { total, rows, from, to: L.ds.today };
  });
}

/* ---------------- the CEO agent ---------------- */

export interface Action {
  id: string;
  kind: 'hold' | 'reorder' | 'audit' | 'recipe' | 'service';
  short: string;
  text: string;
  why: string;
  href: string;
}

export interface Alert {
  tag: 'YIELD' | 'STOCK' | 'CREDIT' | 'SYNC' | 'QUALITY' | 'SERVICE' | 'WEIGHING';
  tone: 'loss' | 'fat' | 'neutral';
  text: string;
  href: string;
}

const WORDS = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
export const countWord = (n: number) => (n < WORDS.length ? WORDS[n] : String(n));
const fmt0 = (n: number) => Math.round(n).toLocaleString('en-IN');
const pct = (x: number, dp = 2) => `${(x * 100).toFixed(dp)}%`;
const lakh = (n: number) => (n >= 100000 ? `₹${(n / 100000).toFixed(1)} lakh` : `₹${fmt0(n)}`);

export function todaysBatches(L: Ledger) {
  return L.ds.batches.filter((b) => b.day === L.ds.today).sort((a, b) => a.end.localeCompare(b.end));
}

export function actions(L: Ledger): Action[] {
  return memo(L, 'actions', () => {
    const out: Action[] = [];
    const today = L.ds.today;
    for (const d of dealerStatus(L)) {
      if (!d.over) continue;
      for (const o of d.open) {
        out.push({
          id: `hold-${o.id}`,
          kind: 'hold',
          short: 'hold dispatch',
          text: `Hold today's order for ${d.name} (${lakh(o.total)})`,
          why: `${d.name} owes ${lakh(d.outstanding)} against a ${lakh(d.limit)} credit limit.`,
          href: '/app/executive/sales/',
        });
      }
    }
    for (const p of packagingStatus(L)) {
      if (!p.reorder) continue;
      out.push({
        id: `reorder-${p.id}`,
        kind: 'reorder',
        short: `reorder ${p.name.toLowerCase()}`,
        text: `Reorder ${p.name.toLowerCase()}`,
        why: `${p.stock.toLocaleString('en-IN')} ${p.unit} on hand covers ${p.cover.toFixed(1)} days; supplier lead time is ${p.leadDays} days.`,
        href: '/app/executive/inventory/',
      });
    }
    for (const c of centreDays(L, today)) {
      if (c.shrinkToday > 0.005 && c.shrinkToday > 2 * c.shrinkAvg) {
        out.push({
          id: `audit-${c.centreId}`,
          kind: 'audit',
          short: `audit ${c.name} weighing`,
          text: `Audit ${c.name} weighing at the next collection`,
          why: `Centre-to-plant shrinkage is ${pct(c.shrinkToday)} today against ${pct(c.shrinkAvg)} on average. The scale was last calibrated ${c.scaleDays} days ago.`,
          href: '/app/executive/collection/',
        });
      }
    }
    for (const b of todaysBatches(L)) {
      const y = yieldAnalysis(L, b);
      if (!y || y.unexplained <= YIELD_ALERT_POINTS) continue;
      out.push({
        id: `recipe-${b.id}`,
        kind: 'recipe',
        short: `recheck ${b.label.toLowerCase()}`,
        text: `Recheck the ${b.label.toLowerCase()} process`,
        why: `Yield ${pct(y.actual)} against ${pct(y.standard)}. Input composition explains ${(y.explained * 100).toFixed(2)} points; ${(y.unexplained * 100).toFixed(2)} points are unexplained.`,
        href: `/app/ledger/?lot=${b.outputLot}`,
      });
    }
    for (const e of maintenanceStatus(L)) {
      if (e.dueIn > 7 || e.id.startsWith('scale-')) continue;
      out.push({
        id: `service-${e.id}`,
        kind: 'service',
        short: `schedule ${e.name.toLowerCase()}`,
        text: `Schedule ${e.name.toLowerCase()}, ${e.place}`,
        why: e.dueIn < 0 ? `Overdue by ${-e.dueIn} days.` : `Due in ${e.dueIn} days.`,
        href: '/app/factory/maintenance/',
      });
    }
    return out;
  });
}

export interface FourAnswers {
  happened: string;
  changed: string;
  attention: string;
  next: string;
}

export function fourAnswers(L: Ledger): FourAnswers {
  return memo(L, 'answers', () => {
    const today = L.ds.today;
    const t = dayStats(L, today);
    const products = [
      t.gheeKg > 0 ? `${fmt0(t.gheeKg)} kg ghee` : '',
      t.khoyaKg > 0 ? `${fmt0(t.khoyaKg)} kg khoya` : '',
      t.paneerKg > 0 ? `${fmt0(t.paneerKg)} kg paneer` : '',
    ].filter(Boolean);
    const happened = [
      `Received ${fmt0(t.receivedLitres)} litres from ${t.centres} centres.`,
      products.length ? `Produced ${joinAnd(products)}.` : 'No finished goods produced yet.',
      t.dispatchDealers ? `Dispatched to ${t.dispatchDealers} dealers.` : 'Nothing dispatched yet.',
    ].join(' ');

    const avgFat = baseline(L, today, (d) => d.fatRecovery);
    const diff = (t.fatRecovery - avgFat) * 100;
    const changes: string[] = [];
    if (Math.abs(diff) >= 0.05) {
      changes.push(`Fat recovery is ${Math.abs(diff).toFixed(2)} points ${diff < 0 ? 'below' : 'above'} its 4-week average.`);
    } else {
      changes.push('Fat recovery is in line with its 4-week average.');
    }
    const shrinkers = centreDays(L, today).filter((c) => c.shrinkToday > 0.005 && c.shrinkToday > 2 * c.shrinkAvg);
    shrinkers.forEach((c) => changes.push(`${c.name} shrinkage is up: ${pct(c.shrinkToday)} against ${pct(c.shrinkAvg)}.`));
    const avgCpl = baseline(L, today, (d) => d.costPerLitre);
    if (avgCpl > 0 && Math.abs(t.costPerLitre / avgCpl - 1) > 0.01) {
      changes.push(`Milk cost is ₹${t.costPerLitre.toFixed(2)} a litre against ₹${avgCpl.toFixed(2)} on average.`);
    }

    const acts = actions(L);
    const over = dealerStatus(L).filter((d) => d.over && d.kind === 'dealer');
    const att: string[] = [];
    if (over.length) att.push(`${countWord(over.length)} dealer${over.length > 1 ? 's' : ''} over credit limit.`);
    packagingStatus(L)
      .filter((p) => p.reorder)
      .forEach((p) => att.push(`${p.name} covers ${Math.floor(p.cover)} days.`));
    todaysBatches(L).forEach((b) => {
      if (batchState(L, b) === 'Below standard') att.push(`${b.label} below standard yield.`);
    });
    const kinds = new Map<string, Action[]>();
    acts.forEach((a) => kinds.set(a.kind, [...(kinds.get(a.kind) ?? []), a]));
    const next: string[] = [];
    const holds = kinds.get('hold') ?? [];
    if (holds.length) next.push(`hold ${countWord(holds.length).toLowerCase()} dispatch${holds.length > 1 ? 'es' : ''}`);
    (kinds.get('reorder') ?? []).forEach((a) => next.push(a.short));
    (kinds.get('audit') ?? []).forEach((a) => next.push(a.short));
    (kinds.get('recipe') ?? []).forEach((a) => next.push(a.short));
    const services = kinds.get('service') ?? [];
    if (services.length) next.push(`book ${countWord(services.length).toLowerCase()} maintenance job${services.length > 1 ? 's' : ''}`);
    return {
      happened,
      changed: changes.join(' '),
      attention: att.length ? att.join(' ') : 'Nothing needs attention.',
      next: next.length ? capital(joinAnd(next)) + '.' : 'No action needed today.',
    };
  });
}

export function alerts(L: Ledger, queued: number): Alert[] {
  return memo(L, `alerts:${queued}`, () => {
    const out: Alert[] = [];
    todaysBatches(L).forEach((b) => {
      const y = yieldAnalysis(L, b);
      if (y && y.unexplained > YIELD_ALERT_POINTS) {
        out.push({
          tag: 'YIELD',
          tone: 'loss',
          text: `${b.label} is ${(y.unexplained * 100).toFixed(2)} points below standard after allowing for its input.`,
          href: `/app/ledger/?lot=${b.outputLot}`,
        });
      }
    });
    packagingStatus(L)
      .filter((p) => p.reorder)
      .forEach((p) =>
        out.push({ tag: 'STOCK', tone: 'fat', text: `${p.name} covers ${p.cover.toFixed(1)} days at current use.`, href: '/app/executive/inventory/' }),
      );
    const over = dealerStatus(L).filter((d) => d.over && d.kind === 'dealer');
    if (over.length) {
      out.push({
        tag: 'CREDIT',
        tone: 'loss',
        text: `${countWord(over.length)} dealer${over.length > 1 ? 's exceed their' : ' exceeds its'} credit limit: ${over.map((d) => d.name).join(', ')}.`,
        href: '/app/executive/sales/',
      });
    }
    centreDays(L, L.ds.today)
      .filter((c) => c.shrinkToday > 0.005 && c.shrinkToday > 2 * c.shrinkAvg)
      .forEach((c) =>
        out.push({ tag: 'WEIGHING', tone: 'loss', text: `${c.name} lost ${pct(c.shrinkToday)} between centre and plant.`, href: '/app/executive/collection/' }),
      );
    const rej = centreDays(L, L.ds.today).reduce((a, c) => a + c.rejected, 0);
    if (rej) out.push({ tag: 'QUALITY', tone: 'neutral', text: `${countWord(rej)} slip${rej > 1 ? 's' : ''} rejected at centres today.`, href: '/app/executive/collection/' });
    out.push({
      tag: 'SYNC',
      tone: 'neutral',
      text: queued ? `${queued} entr${queued === 1 ? 'y is' : 'ies are'} queued offline on this device.` : 'All centres have synced today.',
      href: '/app/centre/sync/',
    });
    return out;
  });
}

function joinAnd(xs: string[]) {
  if (xs.length <= 1) return xs.join('');
  return `${xs.slice(0, -1).join(', ')} and ${xs.at(-1)}`;
}
const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/* ---------------- finance ---------------- */

export function productProfit(L: Ledger, days = 28) {
  const from = addDays(L.ds.today, -(days - 1));
  const rows = new Map<string, { product: string; kg: number; revenue: number; cost: number }>();
  const sellCost = new Map<string, number>();
  for (const m of L.ds.movements) {
    if (m.step === 'sell' && m.ref) sellCost.set(`${m.ref}|${m.from}`, (sellCost.get(`${m.ref}|${m.from}`) ?? 0) + m.qty.cost);
  }
  for (const v of L.ds.invoices) {
    if (v.status !== 'dispatched' || v.day < from) continue;
    for (const line of v.lines) {
      const r = rows.get(line.product) ?? { product: line.product, kg: 0, revenue: 0, cost: 0 };
      r.kg += line.kg;
      r.revenue += line.amount;
      r.cost += sellCost.get(`${v.id}|${line.lotId}`) ?? 0;
      rows.set(line.product, r);
    }
  }
  return [...rows.values()].map((r) => ({ ...r, margin: r.revenue - r.cost, marginPct: r.revenue ? (r.revenue - r.cost) / r.revenue : 0 }));
}

export function workingCapital(L: Ledger) {
  const receivables = dealerStatus(L).reduce((a, d) => a + d.outstanding, 0);
  const inventory =
    finishedStock(L).reduce((a, x) => a + x.value, 0) + intermediateStock(L).reduce((a, x) => a + x.qty.cost, 0);
  const cycle = billingCycle(L.ds.today);
  const payable = L.ds.slips
    .filter((s) => s.status === 'accepted' && s.day >= cycle.start && s.day <= L.ds.today)
    .reduce((a, s) => a + s.amount, 0);
  return { receivables, inventory, payable, net: receivables + inventory - payable };
}

/* ---------------- farmers ---------------- */

export function billingCycle(day: string) {
  const y = Number(day.slice(0, 4));
  const m = Number(day.slice(5, 7));
  const d = Number(day.slice(8, 10));
  const pad = (n: number) => String(n).padStart(2, '0');
  const lastDay = new Date(y, m, 0).getDate();
  const start = d <= 15 ? `${y}-${pad(m)}-01` : `${y}-${pad(m)}-16`;
  const end = d <= 15 ? `${y}-${pad(m)}-15` : `${y}-${pad(m)}-${pad(lastDay)}`;
  return { start, end, payDate: addDays(end, 3) };
}

export function previousCycle(day: string) {
  const cur = billingCycle(day);
  return billingCycle(addDays(cur.start, -1));
}

export interface QualityPart {
  label: string;
  points: number;
  max: number;
  detail: string;
}

/**
 * Quality score out of 100, over the last four weeks:
 * 40 for the share of slips at or above the plant's SNF standard,
 * 30 for steady fat (full marks under 0.1 points of spread, none at 0.5),
 * 30 less 15 for every rejected slip.
 */
export function qualityScore(L: Ledger, slips: Slip[]): { score: number; parts: QualityPart[] } {
  const ok = slips.filter((s) => s.status === 'accepted');
  const std = L.ds.settings.standards.snfQuality;
  const share = ok.length ? ok.filter((s) => s.snfPct >= std).length / ok.length : 0;
  const mean = ok.reduce((a, s) => a + s.fatPct, 0) / Math.max(1, ok.length);
  const sd = Math.sqrt(ok.reduce((a, s) => a + (s.fatPct - mean) ** 2, 0) / Math.max(1, ok.length));
  const rejected = slips.length - ok.length;
  const snfPts = Math.round(40 * share);
  const fatPts = Math.round(30 * Math.max(0, Math.min(1, (0.5 - sd) / 0.4)));
  const rejPts = Math.max(0, 30 - 15 * rejected);
  return {
    score: snfPts + fatPts + rejPts,
    parts: [
      { label: `SNF at or above ${std}%`, points: snfPts, max: 40, detail: `${Math.round(share * 100)}% of slips` },
      { label: 'Steady fat', points: fatPts, max: 30, detail: `spread ${sd.toFixed(2)} points` },
      { label: 'No rejected milk', points: rejPts, max: 30, detail: `${rejected} rejected` },
    ],
  };
}

export function farmerView(L: Ledger, farmer: Farmer) {
  const all = (L.slipsByFarmer.get(farmer.id) ?? []).filter((s) => s.origin !== 'device' || s.syncState === 'synced');
  const today = L.ds.today;
  const cur = billingCycle(today);
  const prev = previousCycle(today);
  const inCycle = (c: { start: string; end: string }) => all.filter((s) => s.day >= c.start && s.day <= c.end);
  const summarise = (list: Slip[]) => {
    const ok = list.filter((s) => s.status === 'accepted');
    const kg = ok.reduce((a, s) => a + s.kg, 0);
    const fat = ok.reduce((a, s) => a + (s.kg * s.fatPct) / 100, 0);
    const snf = ok.reduce((a, s) => a + (s.kg * s.snfPct) / 100, 0);
    return {
      slips: list.length,
      kg,
      litres: litres(L, kg),
      amount: ok.reduce((a, s) => a + s.amount, 0),
      fatPct: kg ? (fat / kg) * 100 : 0,
      snfPct: kg ? (snf / kg) * 100 : 0,
    };
  };
  const curSum = summarise(inCycle(cur));
  const prevSum = summarise(inCycle(prev));
  const inc = L.ds.settings.incentive;
  return {
    latest: all.at(-1) ?? null,
    slips: all,
    cycle: { ...cur, ...curSum },
    previous: { ...prev, ...prevSum, paid: prev.payDate <= today },
    quality: qualityScore(L, all),
    incentive: {
      threshold: inc.fatThreshold,
      perLitre: inc.bonusPerLitre,
      avgFat: curSum.fatPct,
      qualifies: curSum.fatPct >= inc.fatThreshold,
      bonus: curSum.fatPct >= inc.fatThreshold ? curSum.litres * inc.bonusPerLitre : 0,
    },
  };
}

/** Is this reading far outside the farmer's own recent range? */
export function slipAnomaly(L: Ledger, farmerId: string, fatPct: number, snfPct: number): string | null {
  const recent = (L.slipsByFarmer.get(farmerId) ?? []).filter((s) => s.status === 'accepted').slice(-20);
  if (recent.length < 6) return null;
  const stats = (xs: number[]) => {
    const m = xs.reduce((a, b) => a + b, 0) / xs.length;
    const sd = Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / xs.length);
    return { m, sd: Math.max(sd, 0.08) };
  };
  const snf = stats(recent.map((s) => s.snfPct));
  const fat = stats(recent.map((s) => s.fatPct));
  if (snfPct < snf.m - Math.max(0.5, 4 * snf.sd)) {
    return `SNF ${snfPct.toFixed(1)} is far below this farmer's usual ${snf.m.toFixed(1)}. Retest before saving.`;
  }
  if (fatPct < fat.m - Math.max(0.8, 4 * fat.sd)) {
    return `Fat ${fatPct.toFixed(1)} is far below this farmer's usual ${fat.m.toFixed(1)}. Retest before saving.`;
  }
  if (fatPct > fat.m + Math.max(1.2, 5 * fat.sd)) {
    return `Fat ${fatPct.toFixed(1)} is far above this farmer's usual ${fat.m.toFixed(1)}. Check the sample.`;
  }
  return null;
}

