import { SAMPLE_SETTINGS, clrFrom, isRejected, slipAmount, standardGheeYield } from './settings';
import {
  ZERO,
  type Batch,
  type Centre,
  type Dataset,
  type Dealer,
  type DealerPayment,
  type Equipment,
  type Farmer,
  type Invoice,
  type InvoiceLine,
  type Lot,
  type LotKind,
  type Movement,
  type PackItem,
  type Product,
  type Qty,
  type Settings,
  type Shift,
  type Slip,
  type Step,
  type Trip,
} from './types';
import {
  add,
  addDays,
  at,
  clamp,
  dayKey,
  isLot,
  makeRandom,
  minutesToHhmm,
  mmdd,
  r2,
  r3,
  roundQty,
  scale,
  sub,
} from './util';

/**
 * A deterministic sample plant: one plant, three village collection centres,
 * 312 farmers and four weeks of operations ending on the anchor day. Every
 * figure the apps show is derived from these entries; nothing downstream is
 * typed in by hand.
 */

export const SIM_DAYS = 28;
const SEED = 20260926;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const shortDay = (day: string) => `${Number(day.slice(8, 10))} ${MONTHS[Number(day.slice(5, 7)) - 1]}`;

interface Out {
  to: string;
  memo: string;
  kg: number;
  fat: number;
  snf: number;
}

export function simulate(anchor: Date, settings: Settings = SAMPLE_SETTINGS): Dataset {
  const R = makeRandom(SEED);
  const S = settings;
  const st = S.standards;
  const today = dayKey(anchor);
  const days = Array.from({ length: SIM_DAYS }, (_, i) => addDays(today, i - (SIM_DAYS - 1)));

  const movements: Movement[] = [];
  const lots: Record<string, Lot> = {};
  const stock = new Map<string, Qty>();
  const slips: Slip[] = [];
  const trips: Trip[] = [];
  const batches: Batch[] = [];
  const invoices: Invoice[] = [];
  const payments: DealerPayment[] = [];
  let seq = 0;

  const value = (q: { fat: number; snf: number }) => q.fat * S.rate.fatPerKg + q.snf * S.rate.snfPerKg;

  function makeLot(id: string, kind: LotKind, label: string, day: string, ts: string, place: string, expires?: string) {
    if (!lots[id]) {
      lots[id] = { id, kind, label, day, ts, place, expires };
      stock.set(id, { ...ZERO });
    }
    return id;
  }

  function move(ts: string, group: string, step: Step, from: string, to: string, qty: Qty, memo: string, ref?: string) {
    const q = roundQty(qty);
    movements.push({ id: `E${String(++seq).padStart(6, '0')}`, ts, group, step, from, to, qty: q, memo, ref });
    if (isLot(from)) stock.set(from, sub(stock.get(from)!, q));
    if (isLot(to)) stock.set(to, add(stock.get(to)!, q));
    return q;
  }

  function take(lotId: string, kg?: number): Qty {
    const s = stock.get(lotId)!;
    if (kg === undefined || kg >= s.kg) return roundQty(s);
    return roundQty(scale(s, kg / s.kg));
  }

  /**
   * Posts one process step: `input` leaves `from` and is divided among `outs`.
   * Cost follows solids value. Rounding residue lands on `kgSink` for
   * kilograms and on `residueSink` for fat, SNF and cost, so each step closes
   * to the gram and the paisa.
   */
  function split(ts: string, group: string, step: Step, from: string, input: Qty, outs: Out[], kgSink: number, residueSink: number) {
    const totalValue = outs.reduce((a, o) => a + value(o), 0);
    const qs = outs.map((o) =>
      roundQty({ kg: o.kg, fat: o.fat, snf: o.snf, cost: totalValue > 0 ? (input.cost * value(o)) / totalValue : 0 }),
    );
    const others = (key: keyof Qty, skip: number) => qs.reduce((a, q, i) => (i === skip ? a : a + q[key]), 0);
    qs[kgSink].kg = r2(input.kg - others('kg', kgSink));
    qs[residueSink].fat = r3(input.fat - others('fat', residueSink));
    qs[residueSink].snf = r3(input.snf - others('snf', residueSink));
    qs[residueSink].cost = r2(input.cost - others('cost', residueSink));
    return outs.map((o, i) => move(ts, group, step, from, o.to, qs[i], o.memo));
  }

  const overhead = (ts: string, group: string, kind: string, to: string, cost: number, memo: string) =>
    move(ts, group, 'overhead', `overhead:${kind}`, to, { kg: 0, fat: 0, snf: 0, cost }, memo);

  /* ---------------- master data ---------------- */

  const centres: Centre[] = [
    { id: 'A', name: 'Centre A', scaleCalibratedDaysAgo: 41 },
    { id: 'B', name: 'Centre B', scaleCalibratedDaysAgo: 118 },
    { id: 'C', name: 'Centre C', scaleCalibratedDaysAgo: 63 },
  ];
  const perCentre: Record<string, number> = { A: 146, B: 84, C: 82 };

  const farmers: Farmer[] = [];
  const baseKg = new Map<string, number>();
  let n = 0;
  for (const c of centres) {
    for (let k = 0; k < perCentre[c.id]; k++) {
      n += 1;
      const id = `F${String(n).padStart(4, '0')}`;
      let fat = r2(clamp(R.normal(6.1, 0.75), 3.8, 8.2));
      let snf = r2(clamp(R.normal(8.72, 0.2), 8.25, 9.3));
      let kg = clamp(R.normal(9.5, 3.2), 3, 22);
      if (id === 'F0142') {
        fat = 6.05;
        snf = 8.62;
        kg = 10.8;
      }
      farmers.push({ id, name: `Farmer ${id.slice(1)}`, centreId: c.id, baseFat: fat, baseSnf: snf });
      baseKg.set(id, kg);
    }
  }
  const farmersOf = (cid: string) => farmers.filter((f) => f.centreId === cid);

  const dealers: Dealer[] = [
    { id: 'D01', name: 'Dealer 01', route: 'City route 1', creditLimit: 300000, kind: 'dealer' },
    { id: 'D02', name: 'Dealer 02', route: 'City route 1', creditLimit: 250000, kind: 'dealer' },
    { id: 'D03', name: 'Dealer 03', route: 'City route 2', creditLimit: 200000, kind: 'dealer' },
    { id: 'D04', name: 'Dealer 04', route: 'City route 2', creditLimit: 350000, kind: 'dealer' },
    { id: 'D05', name: 'Dealer 05', route: 'Highway route', creditLimit: 250000, kind: 'dealer' },
    { id: 'D06', name: 'Dealer 06', route: 'Highway route', creditLimit: 150000, kind: 'dealer' },
    { id: 'D07', name: 'Dealer 07', route: 'Town route', creditLimit: 250000, kind: 'dealer' },
    { id: 'D08', name: 'Dealer 08', route: 'Town route', creditLimit: 300000, kind: 'dealer' },
    { id: 'BULK', name: 'Bulk skim buyer', route: 'Plant gate', creditLimit: 800000, kind: 'bulk' },
  ];
  const slowPayers = new Set(['D03', 'D06']);

  /* ---------------- helpers for plant steps ---------------- */

  let gheeNo = 0;
  let khoyaNo = 0;
  let openCream: string | null = null;
  const skimLotFor = (day: string) =>
    makeLot(`SK-${mmdd(day)}`, 'skim', `Skim, ${shortDay(day)}`, day, at(day, '06:40'), 'tank:4');

  function separate(day: string, shift: Shift, tankLot: string, kgToSeparate: number) {
    const ts = at(day, shift === 'AM' ? '06:40' : '18:40');
    const group = `SEP-${mmdd(day)}-${shift}`;
    if (!openCream) {
      openCream = makeLot(`CR-${gheeNo + 1}`, 'cream', `Cream for ghee batch ${gheeNo + 1}`, day, ts, 'tank:cream');
    }
    const skimLot = skimLotFor(day);
    const P = take(tankLot, kgToSeparate);
    const uFat = P.fat * clamp(R.normal(0.0008, 0.0003), 0.0002, 0.002);
    const uSnf = P.snf * clamp(R.normal(0.0011, 0.0004), 0.0003, 0.003);
    const creamFatPct = clamp(R.normal(st.creamFat, 0.006), 0.37, 0.43);
    const creamKg = (P.fat - uFat - st.skimFat * P.kg) / (creamFatPct - st.skimFat);
    const creamFat = creamKg * creamFatPct;
    const serumSnf = P.snf / (P.kg - P.fat);
    const creamSnf = (creamKg - creamFat) * serumSnf;
    split(
      ts,
      group,
      'separate',
      tankLot,
      P,
      [
        { to: openCream, memo: 'Cream separated', kg: creamKg, fat: creamFat, snf: creamSnf },
        { to: skimLot, memo: 'Skim to tank 4', kg: P.kg - creamKg, fat: P.fat - uFat - creamFat, snf: P.snf - uSnf - creamSnf },
        { to: 'loss:unexplained', memo: 'Unexplained loss', kg: 0, fat: uFat, snf: uSnf },
      ],
      1,
      2,
    );
    overhead(ts, group, 'plant', openCream, P.kg * S.overhead.separationPerKg * (creamKg / P.kg), 'Separation, power and labour');
    overhead(ts, group, 'plant', skimLot, P.kg * S.overhead.separationPerKg * (1 - creamKg / P.kg), 'Separation, power and labour');
    batches.push({
      id: group,
      kind: 'separation',
      label: `Cream separation ${ts.slice(11, 16)}`,
      day,
      start: ts,
      end: ts,
      group,
      inputLots: [tankLot],
      outputLot: openCream,
    });
  }

  function churnAndClarify(day: string) {
    if (!openCream) return;
    gheeNo += 1;
    const creamLot = openCream;
    openCream = null;

    // Churn: cream to butter and buttermilk.
    const tsC = at(day, '09:15');
    const gC = `CH-${gheeNo}`;
    const butterLot = makeLot(`BT-${gheeNo}`, 'butter', `White butter for ghee batch ${gheeNo}`, day, tsC, 'store:butter');
    const C = take(creamLot);
    overhead(tsC, gC, 'plant', creamLot, C.kg * S.overhead.churnPerKgCream, 'Churning, power and labour');
    const C2 = take(creamLot);
    const butterFatPct = clamp(R.normal(st.butterFat, 0.003), 0.805, 0.835);
    const uFat = C2.fat * clamp(R.normal(0.0006, 0.0002), 0.0001, 0.0015);
    const uSnf = C2.snf * clamp(R.normal(0.001, 0.0003), 0.0002, 0.002);
    const butterFat = C2.fat * clamp(R.normal(st.churnRecovery, 0.002), 0.982, 0.995);
    const butterKg = butterFat / butterFatPct;
    const butterSnf = Math.min(butterKg * 0.015, C2.snf * 0.5);
    split(
      tsC,
      gC,
      'churn',
      creamLot,
      C2,
      [
        { to: butterLot, memo: 'Butter churned', kg: butterKg, fat: butterFat, snf: butterSnf },
        { to: 'byproduct:buttermilk', memo: 'Buttermilk', kg: C2.kg - butterKg, fat: C2.fat - butterFat - uFat, snf: C2.snf - butterSnf - uSnf },
        { to: 'loss:unexplained', memo: 'Unexplained loss', kg: 0, fat: uFat, snf: uSnf },
      ],
      1,
      2,
    );
    batches.push({
      id: gC,
      kind: 'churn',
      label: `Churn for ghee batch ${gheeNo}`,
      day,
      start: tsC,
      end: tsC,
      group: gC,
      inputLots: [creamLot],
      outputLot: butterLot,
      yieldActual: butterKg / C2.kg,
    });

    // Clarify: butter to ghee, residue and evaporated water.
    const tsG = at(day, '13:30');
    const gG = `GH-${gheeNo}`;
    const gheeLot = makeLot(gG, 'ghee', `Ghee batch ${gheeNo}`, day, tsG, 'store:finished', addDays(day, S.shelfLifeDays.ghee));
    const B0 = take(butterLot);
    overhead(tsG, gG, 'fuel', butterLot, B0.kg * S.overhead.clarifyPerKgButter, 'Clarification fuel and labour');
    const B = take(butterLot);
    const recovery = clamp(R.normal(st.gheeRecovery, 0.0025), 0.975, 0.99);
    const gUFat = B.fat * clamp(R.normal(0.0008, 0.0003), 0.0002, 0.002);
    const gheeFat = B.fat * recovery;
    const gheeKg = gheeFat / clamp(R.normal(st.gheeFat, 0.0005), 0.994, 0.998);
    const residueFat = B.fat - gheeFat - gUFat;
    const gUSnf = B.snf * 0.01;
    const residueSnf = B.snf - gUSnf;
    const residueKg = (residueFat + residueSnf) / 0.9;
    split(
      tsG,
      gG,
      'clarify',
      butterLot,
      B,
      [
        { to: gheeLot, memo: `Ghee produced, batch ${gheeNo}`, kg: gheeKg, fat: gheeFat, snf: 0 },
        { to: 'byproduct:residue', memo: 'Ghee residue', kg: residueKg, fat: residueFat, snf: residueSnf },
        { to: 'loss:evaporation', memo: 'Moisture driven off', kg: B.kg - gheeKg - residueKg, fat: 0, snf: 0 },
        { to: 'loss:unexplained', memo: 'Unexplained loss', kg: 0, fat: gUFat, snf: gUSnf },
      ],
      2,
      3,
    );
    overhead(tsG, gG, 'packing', gheeLot, gheeKg * S.overhead.gheePackPerKg, 'Tins, cartons and labels');
    batches.push({
      id: gG,
      kind: 'ghee',
      label: `Ghee batch ${gheeNo}`,
      day,
      start: at(day, '11:00'),
      end: tsG,
      group: gG,
      inputLots: [butterLot],
      outputLot: gheeLot,
      yieldActual: gheeKg / B.kg,
      yieldStandard: standardGheeYield(S),
    });
  }

  const pouchedToday = { kg: 0 };

  function makeKhoya(day: string, tankLot: string, kg: number, belowStandard: boolean) {
    khoyaNo += 1;
    const ts = at(day, '12:30');
    const group = `KH-${khoyaNo}`;
    const lotId = makeLot(group, 'khoya', `Khoya batch ${khoyaNo}`, day, ts, 'store:cold', addDays(day, S.shelfLifeDays.khoya));
    const P = take(tankLot, kg);
    const solids = P.fat + P.snf;
    const recovery = belowStandard ? 0.955 : clamp(R.normal(st.khoyaRecovery, 0.0015), 0.986, 0.993);
    const processShare = Math.min(1 - recovery, 1 - st.khoyaRecovery);
    const unexplainedShare = Math.max(0, st.khoyaRecovery - recovery) + 0.0004;
    const retained = solids * (1 - processShare - unexplainedShare);
    const fatShare = P.fat / solids;
    const moisture = clamp(R.normal(st.khoyaMoisture, 0.004), 0.31, 0.33);
    const khoyaKg = retained / (1 - moisture);
    const procKg = solids * processShare;
    const unexKg = solids * unexplainedShare;
    split(
      ts,
      group,
      'khoya',
      tankLot,
      P,
      [
        { to: lotId, memo: `Khoya produced, batch ${khoyaNo}`, kg: khoyaKg, fat: retained * fatShare, snf: retained * (1 - fatShare) },
        { to: 'loss:process', memo: 'Standard pan loss', kg: procKg, fat: procKg * fatShare, snf: procKg * (1 - fatShare) },
        { to: 'loss:evaporation', memo: 'Moisture driven off', kg: P.kg - khoyaKg - procKg - unexKg, fat: 0, snf: 0 },
        { to: 'loss:unexplained', memo: 'Unexplained loss', kg: unexKg, fat: unexKg * fatShare, snf: unexKg * (1 - fatShare) },
      ],
      2,
      3,
    );
    overhead(ts, group, 'fuel', lotId, P.kg * S.overhead.khoyaPerKgMilk, 'Khoya fuel and labour');
    pouchedToday.kg += khoyaKg;
    batches.push({
      id: group,
      kind: 'khoya',
      label: `Khoya batch ${khoyaNo}`,
      day,
      start: at(day, '07:30'),
      end: ts,
      group,
      inputLots: [tankLot],
      outputLot: lotId,
      yieldActual: khoyaKg / P.kg,
      yieldStandard: ((st.refFat + st.refSnf) * st.khoyaRecovery) / (1 - st.khoyaMoisture),
    });
  }

  function makePaneer(day: string, tankLot: string, kg: number) {
    const ts = at(day, '19:40');
    const group = `PN-${mmdd(day)}`;
    const lotId = makeLot(group, 'paneer', `Paneer, ${shortDay(day)}`, day, ts, 'store:cold', addDays(day, S.shelfLifeDays.paneer));
    const P = take(tankLot, kg);
    const pf = P.fat * clamp(R.normal(st.paneerFatRetention, 0.004), 0.885, 0.915);
    const ps = P.snf * clamp(R.normal(st.paneerSnfRetention, 0.004), 0.435, 0.465);
    const moisture = clamp(R.normal(st.paneerMoisture, 0.004), 0.54, 0.56);
    const pKg = (pf + ps) / (1 - moisture);
    const uFat = P.fat * 0.0008;
    const uSnf = P.snf * 0.001;
    split(
      ts,
      group,
      'paneer',
      tankLot,
      P,
      [
        { to: lotId, memo: 'Paneer pressed', kg: pKg, fat: pf, snf: ps },
        { to: 'byproduct:whey', memo: 'Whey', kg: P.kg - pKg, fat: P.fat - pf - uFat, snf: P.snf - ps - uSnf },
        { to: 'loss:unexplained', memo: 'Unexplained loss', kg: 0, fat: uFat, snf: uSnf },
      ],
      1,
      2,
    );
    overhead(ts, group, 'plant', lotId, P.kg * S.overhead.paneerPerKgMilk, 'Paneer labour, coagulant and pouches');
    pouchedToday.kg += pKg;
    batches.push({
      id: group,
      kind: 'paneer',
      label: `Paneer, ${shortDay(day)}`,
      day,
      start: at(day, '19:00'),
      end: ts,
      group,
      inputLots: [tankLot],
      outputLot: lotId,
      yieldActual: pKg / P.kg,
      yieldStandard: ((st.refFat * st.paneerFatRetention + st.refSnf * st.paneerSnfRetention) / (1 - st.paneerMoisture)),
    });
  }

  /* ---------------- sales ---------------- */

  const lotsOfKind = (kind: LotKind) =>
    Object.values(lots)
      .filter((l) => l.kind === kind && (stock.get(l.id)?.kg ?? 0) > 0.05)
      .sort((a, b) => a.ts.localeCompare(b.ts));

  function sellFefo(ts: string, invoiceId: string, dealerId: string, product: Product, kind: LotKind, kg: number, lines: InvoiceLine[]) {
    let left = kg;
    for (const l of lotsOfKind(kind)) {
      if (left <= 0.01) break;
      const avail = stock.get(l.id)!.kg;
      const takeKg = Math.min(avail, left);
      const q = take(l.id, takeKg);
      move(ts, invoiceId, 'sell', l.id, `dealer:${dealerId}`, q, `Dispatched to ${dealerId}`, invoiceId);
      const rate = S.prices[product];
      lines.push({ lotId: l.id, product, kg: q.kg, rate, amount: r2(q.kg * rate) });
      left -= q.kg;
    }
  }

  let invNo = 0;
  function dispatchDay(day: string, ts: string, dealerIds: string[], shares: { ghee: number; khoya: number; paneer: number }) {
    const weights = dealerIds.map(() => R.between(0.6, 1.4));
    const wsum = weights.reduce((a, b) => a + b, 0);
    const totals = {
      ghee: lotsOfKind('ghee').reduce((a, l) => a + stock.get(l.id)!.kg, 0) * shares.ghee,
      khoya: lotsOfKind('khoya').reduce((a, l) => a + stock.get(l.id)!.kg, 0) * shares.khoya,
      paneer: lotsOfKind('paneer').reduce((a, l) => a + stock.get(l.id)!.kg, 0) * shares.paneer,
    };
    dealerIds.forEach((d, idx) => {
      const id = `INV-${String(++invNo).padStart(4, '0')}`;
      const lines: InvoiceLine[] = [];
      const w = weights[idx] / wsum;
      (['ghee', 'khoya', 'paneer'] as const).forEach((p) => {
        const kg = Math.floor((totals[p] * w) / 0.5) * 0.5;
        if (kg >= 0.5) sellFefo(ts, id, d, p, p, kg, lines);
      });
      if (lines.length) {
        invoices.push({ id, dealerId: d, day, ts, lines, total: r2(lines.reduce((a, l) => a + l.amount, 0)), status: 'dispatched' });
      }
    });
  }

  function sellSkim(day: string) {
    const lotId = `SK-${mmdd(day)}`;
    if (!lots[lotId]) return;
    const ts = at(day, '20:30');
    const id = `INV-${String(++invNo).padStart(4, '0')}`;
    const q = take(lotId);
    move(ts, id, 'sell', lotId, 'dealer:BULK', q, 'Skim to bulk buyer', id);
    const amount = r2(q.kg * S.prices.skim);
    invoices.push({ id, dealerId: 'BULK', day, ts, lines: [{ lotId, product: 'skim', kg: q.kg, rate: S.prices.skim, amount }], total: amount, status: 'dispatched' });
  }

  function collectPayments(day: string) {
    for (const d of dealers) {
      const lag = d.kind === 'bulk' ? 2 : slowPayers.has(d.id) ? 16 : 5;
      const chance = d.kind === 'bulk' ? (Number(day.slice(8)) % 2 === 0 ? 1 : 0) : slowPayers.has(d.id) ? 0.25 : 0.8;
      if (R.next() > chance) continue;
      const cutoff = addDays(day, -lag);
      const billed = invoices.filter((v) => v.dealerId === d.id && v.day <= cutoff && v.status === 'dispatched').reduce((a, v) => a + v.total, 0);
      const paid = payments.filter((p) => p.dealerId === d.id).reduce((a, p) => a + p.amount, 0);
      const due = r2(billed - paid);
      if (due > 1) payments.push({ id: `PAY-${payments.length + 1}`, dealerId: d.id, day, amount: due });
    }
  }

  /* ---------------- the four weeks ---------------- */

  const shrinkMean: Record<string, number> = { A: 0.0015, B: 0.003, C: 0.002 };
  const gheeProduced: number[] = [];
  const pouchProduct: number[] = [];

  days.forEach((day, i) => {
    const isToday = i === SIM_DAYS - 1;
    const khoyaDay = i % 4 === 3;
    const shifts: Shift[] = isToday ? ['AM'] : ['AM', 'PM'];

    const runShift = (shift: Shift) => {
      const tankNo = shift === 'AM' ? 2 : 1;
      const tankLot = makeLot(
        `TK${tankNo}-${mmdd(day)}`,
        'tank',
        `Tank ${tankNo}, ${shortDay(day)} ${shift}`,
        day,
        at(day, shift === 'AM' ? '06:05' : '18:05'),
        `tank:${tankNo}`,
      );
      centres.forEach((c, ci) => {
        const startMin = shift === 'AM' ? 4 * 60 + 45 : 16 * 60 + 45;
        const centreLot = makeLot(
          `CL-${c.id}-${mmdd(day)}-${shift}`,
          'centre',
          `${c.name}, ${shortDay(day)} ${shift}`,
          day,
          at(day, minutesToHhmm(startMin)),
          `centre:${c.id}`,
        );
        const group = `COL-${centreLot}`;
        const list = farmersOf(c.id);
        list.forEach((f, idx) => {
          if (R.next() > 0.93 && f.id !== 'F0142') return;
          const kg = Math.round(baseKg.get(f.id)! * (shift === 'AM' ? 1.15 : 0.85) * clamp(R.normal(1, 0.06), 0.8, 1.2) * 10) / 10;
          let fat = Math.round((f.baseFat + R.normal(0, 0.14)) * 10) / 10;
          let snf = Math.round((f.baseSnf + R.normal(0, 0.07)) * 10) / 10;
          if (R.next() < 0.004) {
            snf = Math.round((snf - R.between(0.8, 1.4)) * 10) / 10;
            fat = Math.round((fat - R.between(0.3, 0.7)) * 10) / 10;
          }
          const rejected = isRejected(fat, snf, S);
          const ts = at(day, minutesToHhmm(startMin + (idx * 60) / list.length));
          const slip: Slip = {
            id: `S-${c.id}-${mmdd(day)}-${shift}-${f.id.slice(1)}`,
            farmerId: f.id,
            centreId: c.id,
            day,
            shift,
            ts,
            kg,
            clr: clrFrom(fat, snf),
            fatPct: fat,
            snfPct: snf,
            amount: rejected ? 0 : slipAmount(kg, fat, snf, S),
            status: rejected ? 'rejected' : 'accepted',
            origin: 'seed',
            syncState: 'synced',
          };
          slips.push(slip);
          if (!rejected) {
            move(ts, group, 'collect', `farmer:${f.id}`, centreLot, { kg, fat: (kg * fat) / 100, snf: (kg * snf) / 100, cost: slip.amount }, `Slip, ${f.name}`, slip.id);
          }
        });
        const closeTs = at(day, minutesToHhmm(startMin + 62));
        overhead(closeTs, group, 'collection', centreLot, stock.get(centreLot)!.kg * S.overhead.collectionPerKg, 'Collection and chilling');

        // Truck to plant.
        const recent = i >= SIM_DAYS - 4;
        const mean = c.id === 'B' && recent ? 0.0092 : shrinkMean[c.id];
        const shrink = clamp(R.normal(mean, mean * 0.18), 0.0004, 0.02);
        const sent = take(centreLot);
        const recKg = sent.kg * (1 - shrink);
        const recFat = sent.fat * (1 - shrink) * clamp(R.normal(0.9995, 0.0006), 0.998, 1);
        const recSnf = sent.snf * (1 - shrink) * clamp(R.normal(0.9995, 0.0006), 0.998, 1);
        const tripId = `TR-${c.id}-${mmdd(day)}-${shift}`;
        const recTs = at(day, minutesToHhmm((shift === 'AM' ? 6 * 60 : 18 * 60) + 5 * (ci + 1)));
        const [recQ] = split(
          recTs,
          tripId,
          'trip',
          centreLot,
          sent,
          [
            { to: tankLot, memo: `Raw milk received from ${c.name}`, kg: recKg, fat: recFat, snf: recSnf },
            { to: 'loss:transit', memo: `Shrinkage, ${c.name} to plant`, kg: sent.kg - recKg, fat: sent.fat - recFat, snf: sent.snf - recSnf },
          ],
          1,
          1,
        );
        overhead(recTs, tripId, 'transport', tankLot, sent.kg * S.overhead.transportPerKg, `Transport from ${c.name}`);
        trips.push({
          id: tripId,
          centreId: c.id,
          day,
          shift,
          lotId: centreLot,
          sentTs: closeTs,
          receivedTs: recTs,
          sent,
          received: recQ,
          tankLot,
        });
      });

      const tankKg = stock.get(tankLot)!.kg;
      if (shift === 'AM') {
        // Khoya milk stays in tank 2 and is boiled after the morning dispatch.
        separate(day, 'AM', tankLot, tankKg - (khoyaDay ? 600 : 0));
      } else {
        separate(day, 'PM', tankLot, tankKg - 500);
        makePaneer(day, tankLot, 500);
      }
    };

    runShift('AM');

    // Morning dispatch at 10:30 sells only what was on hand before today's
    // khoya (12:30) and ghee (13:30) are finished.
    if (i >= 1) {
      const pool = dealers.filter((d) => d.kind === 'dealer').map((d) => d.id);
      let chosen: string[];
      if (isToday) {
        chosen = ['D01', 'D02', 'D04', 'D07'];
      } else {
        chosen = pool.filter(() => R.next() < 0.75);
        if (chosen.length < 4) chosen = pool.slice(0, 5);
      }
      dispatchDay(day, at(day, '10:30'), chosen, { ghee: isToday ? 0.35 : 0.5, khoya: 1, paneer: 1 });
    }

    if (khoyaDay) makeKhoya(day, `TK2-${mmdd(day)}`, 600, isToday);
    const gheeBefore = gheeNo;
    if (i % 2 === 1) churnAndClarify(day);
    gheeProduced.push(gheeNo > gheeBefore ? stock.get(`GH-${gheeNo}`)!.kg : 0);

    if (shifts.includes('PM')) {
      runShift('PM');
      sellSkim(day);
    }
    pouchProduct.push(pouchedToday.kg);
    pouchedToday.kg = 0;
    collectPayments(day);
  });

  // Today's afternoon orders are open: taken but not yet dispatched.
  const todayOpen = ['D03', 'D05', 'D06'];
  const gheeLeft = lotsOfKind('ghee').reduce((a, l) => a + stock.get(l.id)!.kg, 0);
  todayOpen.forEach((d, idx) => {
    const kg = Math.floor((gheeLeft * (0.12 + idx * 0.03)) / 0.5) * 0.5;
    const rate = S.prices.ghee;
    const lotId = lotsOfKind('ghee')[0]?.id ?? '';
    invoices.push({
      id: `ORD-${idx + 1}`,
      dealerId: d,
      day: today,
      ts: at(today, '16:00'),
      lines: [{ lotId, product: 'ghee', kg, rate, amount: r2(kg * rate) }],
      total: r2(kg * rate),
      status: 'pending',
    });
  });

  /* ---------------- packaging, equipment, sync ---------------- */

  const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
  const last7 = <T,>(xs: T[]) => xs.slice(-8, -1);
  const tinsPerDay = avg(last7(gheeProduced)) / 0.905;
  const filmPerDay = avg(last7(pouchProduct)) / 70;
  const pouchesPerDay = avg(last7(pouchProduct)) / 0.5;
  // Stock on hand = opening + receipts - what production actually used. The
  // last receipt of each item is sized to leave the cover the sample plant
  // should show today (pouch film deliberately short).
  const used = (daily: number[]) => daily.reduce((a, b) => a + b, 0);
  const stockWithCover = (daily: number[], perDay: number, opening: number, coverDays: number) => {
    const lastReceipt = Math.max(0, perDay * coverDays - (opening - used(daily)));
    return opening + lastReceipt - used(daily);
  };
  const tinsUse = gheeProduced.map((g) => g / 0.905);
  const filmUse = pouchProduct.map((p) => p / 70);
  const packaging: PackItem[] = [
    {
      id: 'film',
      name: 'Pouch film',
      unit: 'kg',
      stock: r2(stockWithCover(filmUse, filmPerDay, filmPerDay * 12, 3.4)),
      dailyUse: r2(filmPerDay),
      leadDays: 7,
    },
    {
      id: 'tins',
      name: 'Ghee tins, 1 litre',
      unit: 'tins',
      stock: Math.round(stockWithCover(tinsUse, tinsPerDay, tinsPerDay * 12, 16.5)),
      dailyUse: Math.round(tinsPerDay),
      leadDays: 10,
    },
    {
      id: 'cartons',
      name: 'Shipper cartons',
      unit: 'cartons',
      stock: Math.round(stockWithCover(tinsUse.map((t) => t / 12), tinsPerDay / 12, (tinsPerDay / 12) * 20, 11.5)),
      dailyUse: Math.round(tinsPerDay / 12),
      leadDays: 5,
    },
    {
      id: 'labels',
      name: 'Batch labels',
      unit: 'labels',
      stock: Math.round((tinsPerDay + pouchesPerDay) * 21),
      dailyUse: Math.round(tinsPerDay + pouchesPerDay),
      leadDays: 4,
    },
  ];

  const ago = (n: number) => addDays(today, -n);
  const equipment: Equipment[] = [
    { id: 'boiler', name: 'Boiler service', place: 'Plant A', lastServiced: ago(86), intervalDays: 90 },
    { id: 'separator', name: 'Cream separator overhaul', place: 'Plant A', lastServiced: ago(12), intervalDays: 30 },
    { id: 'churn', name: 'Butter churn gaskets', place: 'Plant A', lastServiced: ago(20), intervalDays: 60 },
    { id: 'kettle', name: 'Ghee kettle burner', place: 'Plant A', lastServiced: ago(33), intervalDays: 60 },
    { id: 'khoya', name: 'Khoya pan scraper', place: 'Plant A', lastServiced: ago(9), intervalDays: 30 },
    ...centres.map((c) => ({
      id: `scale-${c.id}`,
      name: 'Weighing scale calibration',
      place: c.name,
      lastServiced: ago(c.scaleCalibratedDaysAgo),
      intervalDays: 90,
    })),
    ...centres.map((c, k) => ({
      id: `analyzer-${c.id}`,
      name: 'Milk analyzer calibration',
      place: c.name,
      lastServiced: ago([10, 12, 28][k]),
      intervalDays: 30,
    })),
  ];

  movements.sort((a, b) => (a.ts === b.ts ? a.id.localeCompare(b.id) : a.ts.localeCompare(b.ts)));

  return {
    anchor: anchor.toISOString(),
    today,
    days,
    settings: S,
    plant: 'Plant A',
    centres,
    farmers,
    dealers,
    slips,
    trips,
    lots,
    movements,
    batches,
    invoices,
    payments,
    packaging,
    equipment,
    sync: centres.map((c, k) => ({ centreId: c.id, lastSync: at(today, ['06:02', '05:58', '06:04'][k]) })),
  };
}
