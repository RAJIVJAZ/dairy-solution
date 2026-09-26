import { ZERO, type Batch, type Dataset, type Dealer, type Farmer, type Lot, type Movement, type Qty, type Slip } from './types';
import { add, isLot, mmdd, sub, sum } from './util';

/** Lookup tables built once per dataset so every screen can query cheaply. */
export interface Ledger {
  ds: Dataset;
  into: Map<string, Movement[]>;
  outOf: Map<string, Movement[]>;
  byGroup: Map<string, Movement[]>;
  slipsByFarmer: Map<string, Slip[]>;
  farmer: Map<string, Farmer>;
  dealer: Map<string, Dealer>;
  batch: Map<string, Batch>;
  batchByLot: Map<string, Batch>;
}

const push = <K, V>(m: Map<K, V[]>, k: K, v: V) => {
  const list = m.get(k);
  if (list) list.push(v);
  else m.set(k, [v]);
};

export function buildLedger(ds: Dataset): Ledger {
  const into = new Map<string, Movement[]>();
  const outOf = new Map<string, Movement[]>();
  const byGroup = new Map<string, Movement[]>();
  for (const m of ds.movements) {
    push(into, m.to, m);
    push(outOf, m.from, m);
    push(byGroup, m.group, m);
  }
  const slipsByFarmer = new Map<string, Slip[]>();
  for (const s of ds.slips) push(slipsByFarmer, s.farmerId, s);
  slipsByFarmer.forEach((list) => list.sort((a, b) => a.ts.localeCompare(b.ts)));
  const batchByLot = new Map<string, Batch>();
  ds.batches.forEach((b) => {
    if (b.outputLot && b.kind !== 'separation') batchByLot.set(b.outputLot, b);
  });
  return {
    ds,
    into,
    outOf,
    byGroup,
    slipsByFarmer,
    farmer: new Map(ds.farmers.map((f) => [f.id, f])),
    dealer: new Map(ds.dealers.map((d) => [d.id, d])),
    batch: new Map(ds.batches.map((b) => [b.id, b])),
    batchByLot,
  };
}

/** Quantity currently held by a node: everything in minus everything out. */
export function balance(L: Ledger, node: string, upTo?: string): Qty {
  const within = (m: Movement) => !upTo || m.ts <= upTo;
  const ins = sum((L.into.get(node) ?? []).filter(within).map((m) => m.qty));
  const outs = sum((L.outOf.get(node) ?? []).filter(within).map((m) => m.qty));
  return sub(ins, outs);
}

export const isEmpty = (q: Qty) => Math.abs(q.kg) < 0.005 && Math.abs(q.fat) < 0.0005 && Math.abs(q.snf) < 0.0005;

export interface StepCheck {
  group: string;
  ts: string;
  step: Movement['step'];
  /** material that left lots in this step (overhead cost excluded) */
  input: Qty;
  outputs: Array<{ to: string; memo: string; qty: Qty }>;
  unexplained: Qty;
  /** input minus everything booked out; zero when the step closes */
  residual: Qty;
  closed: boolean;
}

/** The mass balance of one process step. */
export function checkStep(L: Ledger, group: string): StepCheck {
  const ms = (L.byGroup.get(group) ?? []).filter((m) => m.step !== 'overhead');
  const fromLots = ms.filter((m) => isLot(m.from) || m.from.startsWith('farmer:'));
  const input = sum(fromLots.map((m) => m.qty));
  const outputs = fromLots.map((m) => ({ to: m.to, memo: m.memo, qty: m.qty }));
  const booked = sum(outputs.map((o) => o.qty));
  const residual = sub(input, booked);
  const unexplained = sum(ms.filter((m) => m.to === 'loss:unexplained').map((m) => m.qty));
  return { group, ts: ms[0]?.ts ?? '', step: ms[0]?.step ?? 'collect', input, outputs, unexplained, residual, closed: isEmpty(residual) };
}

/** Lots whose material flowed into `lotId`, nearest first. */
export function ancestors(L: Ledger, lotId: string): string[] {
  const seen = new Set<string>();
  const queue = [lotId];
  const out: string[] = [];
  while (queue.length) {
    const cur = queue.shift()!;
    for (const m of L.into.get(cur) ?? []) {
      if (isLot(m.from) && !seen.has(m.from)) {
        seen.add(m.from);
        out.push(m.from);
        queue.push(m.from);
      }
    }
  }
  return out;
}

/** Lots and outside accounts that received material from `lotId`. */
export function descendants(L: Ledger, lotId: string): { lots: string[]; accounts: string[]; refs: string[] } {
  const seen = new Set<string>([lotId]);
  const queue = [lotId];
  const lots: string[] = [];
  const accounts = new Set<string>();
  const refs = new Set<string>();
  while (queue.length) {
    const cur = queue.shift()!;
    for (const m of L.outOf.get(cur) ?? []) {
      if (isLot(m.to)) {
        if (!seen.has(m.to)) {
          seen.add(m.to);
          lots.push(m.to);
          queue.push(m.to);
        }
      } else {
        accounts.add(m.to);
        if (m.ref) refs.add(m.ref);
      }
    }
  }
  return { lots, accounts: [...accounts], refs: [...refs] };
}

export interface Trace {
  lot: Lot;
  lots: Lot[];
  farmers: string[];
  centres: string[];
  slips: number;
}

/** Back to the farmer: every lot and every farmer whose milk is in `lotId`. */
export function traceBack(L: Ledger, lotId: string): Trace {
  const anc = ancestors(L, lotId);
  const lots = anc.map((id) => L.ds.lots[id]).filter(Boolean);
  const farmers = new Set<string>();
  const centres = new Set<string>();
  let slips = 0;
  for (const l of lots) {
    if (l.kind !== 'centre') continue;
    centres.add(l.place.replace('centre:', ''));
    for (const m of L.into.get(l.id) ?? []) {
      if (m.from.startsWith('farmer:')) {
        farmers.add(m.from.slice(7));
        slips += 1;
      }
    }
  }
  return { lot: L.ds.lots[lotId], lots, farmers: [...farmers], centres: [...centres], slips };
}

export interface Recall {
  lotId: string;
  sourceTanks: string[];
  affectedLots: string[];
  dealers: string[];
  invoices: string[];
  farmers: string[];
  kgOut: number;
  ms: number;
}

/**
 * Mock recall: from any lot, find the raw-milk tanks it came from, then every
 * product made from those tanks and every dealer and invoice that received it.
 */
export function mockRecall(L: Ledger, lotId: string): Recall {
  const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const back = traceBack(L, lotId);
  const tanks = back.lots.filter((l) => l.kind === 'tank').map((l) => l.id);
  const sources = tanks.length ? tanks : [lotId];
  const affected = new Set<string>();
  const dealers = new Set<string>();
  const invoices = new Set<string>();
  let kgOut = 0;
  for (const t of sources) {
    const d = descendants(L, t);
    d.lots.forEach((x) => affected.add(x));
    for (const a of d.accounts) if (a.startsWith('dealer:')) dealers.add(a.slice(7));
    d.refs.forEach((r) => {
      if (r.startsWith('INV-')) invoices.add(r);
    });
  }
  for (const x of affected) {
    for (const m of L.outOf.get(x) ?? []) if (m.to.startsWith('dealer:')) kgOut += m.qty.kg;
  }
  const farmers = new Set<string>();
  for (const t of sources) traceBack(L, t).farmers.forEach((f) => farmers.add(f));
  const t1 = typeof performance !== 'undefined' ? performance.now() : Date.now();
  return {
    lotId,
    sourceTanks: sources,
    affectedLots: [...affected],
    dealers: [...dealers],
    invoices: [...invoices],
    farmers: [...farmers],
    kgOut,
    ms: t1 - t0,
  };
}

/** Everything that happened to a lot, in time order, with a running balance. */
export function lotStatement(L: Ledger, lotId: string) {
  const ms = [...(L.into.get(lotId) ?? []), ...(L.outOf.get(lotId) ?? [])].sort((a, b) =>
    a.ts === b.ts ? a.id.localeCompare(b.id) : a.ts.localeCompare(b.ts),
  );
  let run: Qty = { ...ZERO };
  return ms.map((m) => {
    const sign = m.to === lotId ? 1 : -1;
    run = sign > 0 ? add(run, m.qty) : sub(run, m.qty);
    return { m, sign, balance: run };
  });
}

/* ---------------- device data ---------------- */

export interface DeviceSlip extends Slip {
  origin: 'device';
  syncState: 'queued' | 'synced';
}

/**
 * Folds slips recorded on this device into the dataset. Queued slips are
 * visible on the centre's own screen; only synced ones reach the plant ledger,
 * exactly as they would with a real server.
 */
export function withDeviceSlips(ds: Dataset, device: DeviceSlip[]): Dataset {
  if (!device.length) return ds;
  const inWindow = device.filter((s) => ds.days.includes(s.day));
  const lots = { ...ds.lots };
  const extra: Movement[] = [];
  for (const s of inWindow) {
    if (s.syncState !== 'synced' || s.status !== 'accepted') continue;
    const lotId = `CL-${s.centreId}-${mmdd(s.day)}-${s.shift}`;
    if (!lots[lotId]) {
      lots[lotId] = {
        id: lotId,
        kind: 'centre',
        label: `Centre ${s.centreId}, ${s.day} ${s.shift}`,
        day: s.day,
        ts: s.ts,
        place: `centre:${s.centreId}`,
      };
    }
    extra.push({
      id: `D-${s.id}`,
      ts: s.ts,
      group: `COL-${lotId}`,
      step: 'collect',
      from: `farmer:${s.farmerId}`,
      to: lotId,
      qty: { kg: s.kg, fat: (s.kg * s.fatPct) / 100, snf: (s.kg * s.snfPct) / 100, cost: s.amount },
      memo: `Slip, Farmer ${s.farmerId.slice(1)}`,
      ref: s.id,
    });
  }
  const movements = [...ds.movements, ...extra].sort((a, b) => (a.ts === b.ts ? a.id.localeCompare(b.id) : a.ts.localeCompare(b.ts)));
  return { ...ds, lots, movements, slips: [...ds.slips, ...inWindow] };
}
