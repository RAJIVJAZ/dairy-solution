'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { Badge, type Tone } from '@/components/brand';
import { dayShort, inrShort, num, pct, time } from '@/lib/format';
import {
  actions,
  batchState,
  centreDays,
  dayStats,
  finishedStock,
  intermediateStock,
  maintenanceStatus,
  packagingStatus,
  todaysBatches,
  yieldAnalysis,
  type Action,
} from '@/lib/ledger/analytics';
import { checkStep, type Ledger } from '@/lib/ledger/engine';
import type { Batch } from '@/lib/ledger/types';
import { nowLocal, useDevice } from '@/lib/store';
import { useLedger } from '@/lib/useLedger';
import { Alert, DataTable, Kpi, Loading, SectionTitle } from './ui';

function Header({ L, title }: { L: Ledger; title: string }) {
  const hour = new Date().getHours();
  const shift = hour < 14 ? 'Morning shift' : 'Evening shift';
  const all = todaysBatches(L).every((b) => checkStep(L, b.group).closed);
  return (
    <div className="flex items-center justify-between px-5 pb-2.5 pt-4">
      <div>
        <div className="text-[12px] text-muted">
          {L.ds.plant} · {shift}
        </div>
        <h1 className="font-display text-[26px] leading-tight">{title}</h1>
      </div>
      {all ? <Badge tone="ok">Balanced</Badge> : <Badge tone="loss">Open steps</Badge>}
    </div>
  );
}

/** Separation and churning feed a ghee batch; the explorer opens on that batch. */
function explorerLot(b: Batch) {
  if (b.kind === 'churn') return `GH-${b.id.slice(3)}`;
  if (b.kind === 'separation') return `GH-${(b.outputLot ?? '').slice(3)}`;
  return b.outputLot ?? '';
}

const STATE_TONE: Record<string, Tone> = { Balanced: 'ok', 'Below standard': 'loss', Open: 'running' };

function batchLine(L: Ledger, b: Batch) {
  const c = checkStep(L, b.group);
  const out = b.outputLot ? c.outputs.filter((o) => o.to === b.outputLot).reduce((a, o) => a + o.qty.kg, 0) : 0;
  return { input: c.input.kg, out, state: batchState(L, b) };
}

function ActionRow({ a }: { a: Action }) {
  const tasks = useDevice((s) => s.tasks);
  const addTask = useDevice((s) => s.addTask);
  const done = tasks.find((t) => t.id === a.id);
  const tone = a.kind === 'recipe' ? 'loss' : a.kind === 'reorder' ? 'fat' : 'neutral';
  const label = a.kind === 'recipe' ? 'Review' : a.kind === 'reorder' ? 'Reorder' : 'Schedule';
  const cls = { loss: 'border-loss-edge bg-loss-tint text-loss-ink', fat: 'border-fat-edge bg-fat-tint text-fat-ink', neutral: 'border-line bg-white text-ink' }[tone];
  return (
    <div className={`flex items-center justify-between gap-2.5 rounded-card border px-3.5 py-2 ${cls}`}>
      <span className="text-[14px] leading-[1.35]">
        {a.text}
        <span className="block text-[12px] opacity-80">{done ? `${label === 'Review' ? 'Opened' : label === 'Reorder' ? 'Ordered' : 'Scheduled'} at ${time(done.ts)}` : a.why}</span>
      </span>
      {a.kind === 'recipe' ? (
        <Link href={a.href} className="inline-flex min-h-[44px] shrink-0 items-center px-1 text-[13px] font-semibold underline underline-offset-2">
          {label}
        </Link>
      ) : (
        <button
          type="button"
          disabled={!!done}
          onClick={() => addTask({ id: a.id, kind: a.kind === 'reorder' ? 'reorder' : 'service', ref: a.id, text: a.text, ts: nowLocal() })}
          className="inline-flex min-h-[44px] shrink-0 items-center px-1 text-[13px] font-semibold underline underline-offset-2 disabled:no-underline disabled:opacity-60"
        >
          {done ? 'Done' : label}
        </button>
      )}
    </div>
  );
}

export function FactoryProduction() {
  const L = useLedger();
  const data = useMemo(() => {
    if (!L) return null;
    const t = dayStats(L, L.ds.today);
    const ghee = todaysBatches(L).find((b) => b.kind === 'ghee');
    return { t, ghee, batches: todaysBatches(L), acts: actions(L).filter((a) => a.kind !== 'hold' && a.kind !== 'audit') };
  }, [L]);
  if (!L || !data) return <Loading />;
  const { t, ghee, batches, acts } = data;
  // Solids nobody can account for today: fat plus SNF, in kilograms.
  const lossKg = t.unexplained.fat + t.unexplained.snf;
  return (
    <main className="flex flex-1 flex-col pb-4">
      <Header L={L} title="Plant floor" />
      <div className="mx-5 mb-2.5 grid grid-cols-3 gap-2">
        <div className="rounded-card bg-ink p-3 text-paper">
          <div className="text-[11px] text-muted-dark">Milk in today</div>
          <div className="font-mono text-[18px]">{num(t.received.kg, 0)} kg</div>
        </div>
        <div className="rounded-card border border-line border-t-[3px] border-t-fat bg-white p-3">
          <div className="text-[11px] text-muted">Ghee yield</div>
          <div className="font-mono text-[18px]">{ghee?.yieldActual ? pct(ghee.yieldActual, 1) : '—'}</div>
        </div>
        <div className="rounded-card border border-line border-t-[3px] border-t-loss bg-white p-3">
          <div className="text-[11px] text-muted">Unexplained solids</div>
          <div className="font-mono text-[18px]">{num(lossKg, 2)} kg</div>
        </div>
      </div>
      <div className="mx-5 mb-1.5 mt-1.5">
        <SectionTitle aside="tap a batch to open its ledger">Today&apos;s batches</SectionTitle>
      </div>
      <ul className="mx-5 flex flex-col gap-2">
        {batches.map((b) => {
          const x = batchLine(L, b);
          const y = yieldAnalysis(L, b);
          return (
            <li key={b.id}>
              <Link
                href={`/app/ledger/?lot=${explorerLot(b)}`}
                className="flex flex-col gap-2 rounded-card border border-line bg-white p-3.5 hover:border-ink"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[15px] font-semibold">{b.label}</span>
                  <Badge tone={STATE_TONE[x.state]} className="!text-[12px]">
                    {x.state}
                  </Badge>
                </div>
                <div className="flex justify-between font-mono text-[13px] text-body">
                  <span>In {num(x.input, 0)} kg</span>
                  <span>Out {num(x.out, 1)} kg</span>
                  <span>{y ? `Yield ${pct(y.actual, 1)}` : `${time(b.end)}`}</span>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="mx-5 mb-1.5 mt-4">
        <SectionTitle>Needs you</SectionTitle>
      </div>
      <div className="mx-5 flex flex-col gap-2">
        {acts.length === 0 ? <Alert tone="ok">Nothing waiting on the plant manager.</Alert> : acts.map((a) => <ActionRow key={a.id} a={a} />)}
      </div>
    </main>
  );
}

export function FactoryQuality() {
  const L = useLedger();
  if (!L) return <Loading />;
  const centres = centreDays(L, L.ds.today);
  const batches = L.ds.batches.filter((b) => b.kind === 'ghee' || b.kind === 'khoya' || b.kind === 'paneer').slice(-8).reverse();
  const st = L.ds.settings.standards;
  return (
    <main className="flex flex-1 flex-col gap-3 pb-4">
      <Header L={L} title="Quality" />
      <section className="mx-5 flex flex-col gap-2" aria-labelledby="in-h">
        <SectionTitle id="in-h" aside="today">
          Incoming milk
        </SectionTitle>
        <div className="rounded-card border border-line bg-white py-2">
          <DataTable
            caption="Incoming milk by centre"
            dense
            columns={[
              { key: 'c', label: 'CENTRE' },
              { key: 'kg', label: 'KG', align: 'right' },
              { key: 'f', label: 'FAT %', align: 'right', className: 'text-fat-text' },
              { key: 's', label: 'SNF %', align: 'right', className: 'text-snf-text' },
              { key: 'r', label: 'REJ', align: 'right' },
            ]}
            rows={centres.map((c) => ({ _key: c.centreId, c: c.name, kg: num(c.kg, 0), f: num(c.fatPct, 2), s: num(c.snfPct, 2), r: c.rejected }))}
          />
        </div>
      </section>
      <section className="mx-5 flex flex-col gap-2" aria-labelledby="b-h">
        <SectionTitle id="b-h" aside="composition from the ledger">
          Finished batches
        </SectionTitle>
        <div className="rounded-card border border-line bg-white py-2">
          <DataTable
            caption="Batch composition against plant standards"
            dense
            columns={[
              { key: 'b', label: 'BATCH' },
              { key: 'm', label: 'CHECK' },
              { key: 'v', label: 'VALUE', align: 'right' },
              { key: 'std', label: 'STD', align: 'right' },
            ]}
            rows={batches.map((b) => {
              const q = checkStep(L, b.group).outputs.find((o) => o.to === b.outputLot)!.qty;
              const solids = (q.fat + q.snf) / q.kg;
              const check =
                b.kind === 'ghee'
                  ? { m: 'Fat', v: q.fat / q.kg, std: st.gheeFat, bad: q.fat / q.kg < st.gheeFat - 0.002 }
                  : b.kind === 'khoya'
                    ? { m: 'Moisture', v: 1 - solids, std: st.khoyaMoisture, bad: Math.abs(1 - solids - st.khoyaMoisture) > 0.015 }
                    : { m: 'Moisture', v: 1 - solids, std: st.paneerMoisture, bad: Math.abs(1 - solids - st.paneerMoisture) > 0.015 };
              return { _key: b.id, _tone: check.bad ? 'loss' : undefined, b: b.label, m: check.m, v: pct(check.v, 1), std: pct(check.std, 1) };
            })}
          />
        </div>
        <p className="text-[12px] leading-snug text-muted">Standards are the plant&apos;s own targets from settings, not regulatory limits.</p>
      </section>
    </main>
  );
}

export function FactoryStock() {
  const L = useLedger();
  const tasks = useDevice((s) => s.tasks);
  const addTask = useDevice((s) => s.addTask);
  if (!L) return <Loading />;
  const inproc = intermediateStock(L).filter((x) => x.lot.kind !== 'centre');
  const fg = finishedStock(L);
  const pack = packagingStatus(L);
  return (
    <main className="flex flex-1 flex-col gap-3 pb-4">
      <Header L={L} title="Stock" />
      <section className="mx-5 flex flex-col gap-2" aria-labelledby="ip-h">
        <SectionTitle id="ip-h">In tanks and in process</SectionTitle>
        <div className="rounded-card border border-line bg-white py-2">
          <DataTable
            caption="Stock in process"
            dense
            columns={[
              { key: 'l', label: 'LOT' },
              { key: 'kg', label: 'KG', align: 'right' },
              { key: 'f', label: 'FAT KG', align: 'right', className: 'text-fat-text' },
            ]}
            rows={inproc.map((x) => ({ _key: x.lot.id, l: x.lot.label, kg: num(x.qty.kg, 1), f: num(x.qty.fat, 2) }))}
          />
          {inproc.length === 0 && <p className="px-3 py-2 text-[14px] text-muted">Tanks are empty.</p>}
        </div>
      </section>
      <section className="mx-5 flex flex-col gap-2" aria-labelledby="fg-h">
        <SectionTitle id="fg-h" aside="first expiry first out">
          Finished goods
        </SectionTitle>
        <div className="rounded-card border border-line bg-white py-2">
          <DataTable
            caption="Finished goods by lot"
            dense
            columns={[
              { key: 'l', label: 'LOT' },
              { key: 'kg', label: 'KG', align: 'right' },
              { key: 'e', label: 'USE BY', align: 'right' },
            ]}
            rows={fg.map((x) => ({
              _key: x.lot.id,
              _tone: x.expiresIn !== undefined && x.expiresIn <= 1 ? 'loss' : undefined,
              l: (
                <Link href={`/app/ledger/?lot=${x.lot.id}`} className="underline-offset-2 hover:underline">
                  {x.lot.label}
                </Link>
              ),
              kg: num(x.kg, 1),
              e: x.lot.expires ? `${dayShort(x.lot.expires)}` : '—',
            }))}
          />
        </div>
      </section>
      <section className="mx-5 flex flex-col gap-2" aria-labelledby="pk-h">
        <SectionTitle id="pk-h">Packaging</SectionTitle>
        {pack.map((p) => {
          const done = tasks.find((t) => t.id === `reorder-${p.id}`);
          return (
            <div
              key={p.id}
              className={`flex items-center justify-between gap-3 rounded-card border px-3.5 py-2.5 ${p.reorder ? 'border-fat-edge bg-fat-tint text-fat-ink' : 'border-line bg-white'}`}
            >
              <div className="text-[14px]">
                <div className="font-medium">{p.name}</div>
                <div className="font-mono text-[12px] opacity-80">
                  {num(p.stock, p.unit === 'kg' ? 1 : 0)} {p.unit} · {num(p.cover, 1)} days · lead {p.leadDays} d
                </div>
              </div>
              {p.reorder && (
                <button
                  type="button"
                  disabled={!!done}
                  className="inline-flex min-h-[44px] items-center text-[13px] font-semibold underline underline-offset-2 disabled:no-underline disabled:opacity-60"
                  onClick={() => addTask({ id: `reorder-${p.id}`, kind: 'reorder', ref: p.id, text: `Reorder ${p.name}`, ts: nowLocal() })}
                >
                  {done ? `Ordered ${time(done.ts)}` : 'Reorder'}
                </button>
              )}
            </div>
          );
        })}
        <p className="text-[12px] text-muted">Finished goods value at cost: {inrShort(fg.reduce((a, x) => a + x.value, 0))}.</p>
      </section>
    </main>
  );
}

export function FactoryMaintenance() {
  const L = useLedger();
  const tasks = useDevice((s) => s.tasks);
  const addTask = useDevice((s) => s.addTask);
  if (!L) return <Loading />;
  const list = maintenanceStatus(L);
  return (
    <main className="flex flex-1 flex-col gap-3 pb-4">
      <Header L={L} title="Maintenance" />
      <ul className="mx-5 flex flex-col gap-2">
        {list.map((e) => {
          const id = `service-${e.id}`;
          const done = tasks.find((t) => t.id === id);
          const overdue = e.dueIn < 0;
          return (
            <li
              key={e.id}
              className={`flex items-center justify-between gap-3 rounded-card border px-3.5 py-2.5 ${overdue ? 'border-loss-edge bg-loss-tint text-loss-ink' : e.urgent ? 'border-fat-edge bg-fat-tint text-fat-ink' : 'border-line bg-white'}`}
            >
              <div className="text-[14px]">
                <div className="font-medium">
                  {e.name} <span className="font-normal opacity-80">· {e.place}</span>
                </div>
                <div className="text-[12px] opacity-80">
                  {overdue ? `Overdue by ${-e.dueIn} days` : `Due ${dayShort(e.due)}, in ${e.dueIn} days`} · every {e.intervalDays} days
                </div>
              </div>
              {(e.urgent || overdue) && (
                <button
                  type="button"
                  disabled={!!done}
                  className="inline-flex min-h-[44px] shrink-0 items-center text-[13px] font-semibold underline underline-offset-2 disabled:no-underline disabled:opacity-60"
                  onClick={() => addTask({ id, kind: 'service', ref: e.id, text: `${e.name}, ${e.place}`, ts: nowLocal() })}
                >
                  {done ? `Booked ${time(done.ts)}` : 'Schedule'}
                </button>
              )}
            </li>
          );
        })}
      </ul>
      <Kpi className="mx-5" label="Jobs booked from this device" value={tasks.filter((t) => t.kind === 'service').length} edge="neutral" />
    </main>
  );
}
