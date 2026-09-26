import { describe, expect, it } from 'vitest';
import { simulate } from './simulate';
import { buildLedger, checkStep, mockRecall, traceBack, withDeviceSlips, type DeviceSlip } from './engine';
import { clrFrom, slipAmount } from './settings';
import { sum } from './util';

const anchor = new Date(2026, 8, 26, 14, 0);
const ds = simulate(anchor);
const L = buildLedger(ds);

describe('sample plant', () => {
  it('is deterministic', () => {
    const again = simulate(anchor);
    expect(again.movements.length).toBe(ds.movements.length);
    expect(again.movements[500]).toEqual(ds.movements[500]);
  });

  it('has 312 farmers over three centres and 28 days', () => {
    expect(ds.farmers).toHaveLength(312);
    expect(ds.centres.map((c) => c.id)).toEqual(['A', 'B', 'C']);
    expect(ds.days).toHaveLength(28);
    expect(ds.today).toBe('2026-09-26');
  });

  it('numbers today’s batches as the design does', () => {
    expect(ds.lots['GH-14']?.day).toBe('2026-09-26');
    expect(ds.lots['KH-7']?.day).toBe('2026-09-26');
  });
});

describe('mass balance', () => {
  it('closes every process step to the gram', () => {
    const groups = new Set(ds.movements.filter((m) => m.step !== 'overhead' && m.step !== 'collect').map((m) => m.group));
    for (const g of groups) {
      const c = checkStep(L, g);
      expect(c.closed, g).toBe(true);
    }
  });

  it('conserves fat from farmers to every sink and stock', () => {
    const fromFarmers = sum(ds.movements.filter((m) => m.from.startsWith('farmer:')).map((m) => m.qty));
    const toSinks = sum(ds.movements.filter((m) => m.to.includes(':')).map((m) => m.qty));
    const lotStock = Object.keys(ds.lots).reduce(
      (a, id) => {
        const ins = (L.into.get(id) ?? []).reduce((s, m) => s + m.qty.fat, 0);
        const outs = (L.outOf.get(id) ?? []).reduce((s, m) => s + m.qty.fat, 0);
        return a + ins - outs;
      },
      0,
    );
    expect(Math.abs(fromFarmers.fat - toSinks.fat - lotStock)).toBeLessThan(0.01);
  });

  it('never leaves a lot with negative stock', () => {
    for (const id of Object.keys(ds.lots)) {
      const ins = (L.into.get(id) ?? []).reduce((s, m) => s + m.qty.kg, 0);
      const outs = (L.outOf.get(id) ?? []).reduce((s, m) => s + m.qty.kg, 0);
      expect(ins - outs, id).toBeGreaterThan(-0.02);
    }
  });

  it('never moves material out of a lot before it arrived', () => {
    for (const m of ds.movements) {
      if (m.from.includes(':')) continue;
      const first = (L.into.get(m.from) ?? []).filter((x) => x.step !== 'overhead')[0];
      expect(first && first.ts <= m.ts, `${m.id} ${m.from} at ${m.ts}`).toBe(true);
    }
  });

  it('books khoya batch 7 below its standard yield', () => {
    const b = L.batch.get('KH-7')!;
    expect(b.yieldActual!).toBeLessThan(b.yieldStandard! - 0.005);
  });
});

describe('traceability', () => {
  it('traces a ghee batch back to farmers at every centre', () => {
    const t = traceBack(L, 'GH-14');
    expect(t.lots.some((l) => l.kind === 'butter')).toBe(true);
    expect(t.lots.some((l) => l.kind === 'cream')).toBe(true);
    expect(t.centres.sort()).toEqual(['A', 'B', 'C']);
    expect(t.farmers.length).toBeGreaterThan(250);
  });

  it('finds the dealers of a recalled batch', () => {
    const r = mockRecall(L, 'GH-13');
    expect(r.dealers.length).toBeGreaterThan(0);
    expect(r.invoices.length).toBeGreaterThan(0);
  });
});

describe('rate chart', () => {
  it('prices a slip by its fat and SNF', () => {
    expect(slipAmount(12.5, 6.1, 8.6)).toBeCloseTo(12.5 * (0.061 * 450 + 0.086 * 280), 2);
  });

  it('derives CLR from fat and SNF', () => {
    expect(clrFrom(6.1, 8.6)).toBeCloseTo(27.8, 1);
  });
});

describe('device slips', () => {
  it('reach the plant ledger only once synced', () => {
    const base: Omit<DeviceSlip, 'id' | 'syncState'> = {
      farmerId: 'F0142',
      centreId: 'A',
      day: ds.today,
      shift: 'PM',
      ts: `${ds.today}T17:00:00`,
      kg: 10,
      clr: 28,
      fatPct: 6,
      snfPct: 8.6,
      amount: slipAmount(10, 6, 8.6),
      status: 'accepted',
      origin: 'device',
    };
    const merged = withDeviceSlips(ds, [
      { ...base, id: 'X1', syncState: 'queued' },
      { ...base, id: 'X2', syncState: 'synced' },
    ]);
    expect(merged.slips.length).toBe(ds.slips.length + 2);
    expect(merged.movements.length).toBe(ds.movements.length + 1);
  });
});
