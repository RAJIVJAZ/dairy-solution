'use client';

import clsx from 'clsx';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { Badge } from '@/components/brand';
import { downloadText, toCsv } from '@/lib/csv';
import { dayLong, dayShort, inr, num, pct, time } from '@/lib/format';
import { yieldAnalysis } from '@/lib/ledger/analytics';
import { checkStep, mockRecall, traceBack, type Ledger, type Recall } from '@/lib/ledger/engine';
import type { Lot, Qty } from '@/lib/ledger/types';
import { ZERO } from '@/lib/ledger/types';
import { add, isLot, sum } from '@/lib/ledger/util';
import { useDevice } from '@/lib/store';
import { useLedger } from '@/lib/useLedger';
import { Loading } from './ui';

interface Stage {
  kind: string;
  name: string;
  line: string;
  focus?: boolean;
}

interface EntryRow {
  key: string;
  ts: string;
  text: string;
  qty: Qty;
  tone?: 'loss' | 'product' | 'ok';
}

function productLots(L: Ledger) {
  return Object.values(L.ds.lots)
    .filter((l) => l.kind === 'ghee' || l.kind === 'khoya' || l.kind === 'paneer')
    .sort((a, b) => b.ts.localeCompare(a.ts));
}

const plural = (n: number, w: string) => `${num(n)} ${w}${n === 1 ? '' : 's'}`;

function explore(L: Ledger, lot: Lot) {
  const back = traceBack(L, lot.id);
  const chain = new Set([lot.id, ...back.lots.map((l) => l.id)]);
  const tanks = back.lots.filter((l) => l.kind === 'tank');
  const byKind = (k: string) => back.lots.filter((l) => l.kind === k);

  // Steps that produced a lot in the chain (collection slips and trucks are summarised per tank).
  const groups = new Set<string>();
  for (const id of chain) {
    for (const m of L.into.get(id) ?? []) {
      if (m.step !== 'collect' && m.step !== 'trip' && m.step !== 'overhead') groups.add(m.group);
    }
  }
  const steps = [...groups].map((g) => checkStep(L, g)).sort((a, b) => a.ts.localeCompare(b.ts));

  const rows: EntryRow[] = [];
  for (const t of tanks.sort((a, b) => a.ts.localeCompare(b.ts))) {
    const trips = (L.into.get(t.id) ?? []).filter((m) => m.step === 'trip');
    rows.push({ key: `in-${t.id}`, ts: trips[0]?.ts ?? t.ts, text: `Raw milk received, ${t.label} · ${plural(trips.length, 'truck')}`, qty: sum(trips.map((m) => m.qty)) });
  }
  const label = (node: string) => (isLot(node) ? L.ds.lots[node]?.label ?? node : node.split(':')[1].replace(/^./, (c) => c.toUpperCase()));
  for (const s of steps) {
    for (const o of s.outputs) {
      rows.push({
        key: `${s.group}-${o.to}`,
        ts: s.ts,
        text: o.to === 'loss:unexplained' ? 'Unexplained loss' : o.to === lot.id ? o.memo : `${o.memo} → ${label(o.to)}`,
        qty: o.qty,
        tone: o.to === 'loss:unexplained' ? 'loss' : o.to === lot.id ? 'product' : undefined,
      });
    }
  }
  rows.sort((a, b) => a.ts.localeCompare(b.ts));
  const residual = steps.reduce((a, s) => add(a, s.residual), { ...ZERO });
  const unexplained = steps.reduce((a, s) => add(a, s.unexplained), { ...ZERO });
  const closed = steps.every((s) => s.closed);

  const sells = (L.outOf.get(lot.id) ?? []).filter((m) => m.step === 'sell');
  const dealers = new Set(sells.map((m) => m.to));
  const invoices = new Set(sells.map((m) => m.ref));
  const out = (L.into.get(lot.id) ?? []).filter((m) => m.step !== 'overhead').reduce((a, m) => a + m.qty.kg, 0);
  const batch = L.batchByLot.get(lot.id);
  const collected = sum(
    byKind('centre').flatMap((c) => (L.into.get(c.id) ?? []).filter((m) => m.step === 'collect').map((m) => m.qty)),
  );
  const q = (id: string) => sum((L.into.get(id) ?? []).filter((m) => m.step !== 'overhead').map((m) => m.qty));

  const stages: Stage[] = [
    {
      kind: 'FARMERS',
      name: `${num(back.farmers.length)} farmers, ${back.centres.length} centres`,
      line: `${plural(back.slips, 'slip')}\n${num(collected.kg, 0)} kg · fat ${num(collected.fat, 1)}`,
    },
    {
      kind: 'RAW MILK',
      name: tanks.length === 1 ? tanks[0].label.split(',')[0] : `${plural(tanks.length, 'tank lot')}`,
      line: `${num(sum(tanks.map((t) => q(t.id))).kg, 0)} kg\nfat ${num(sum(tanks.map((t) => q(t.id))).fat, 2)}`,
    },
  ];
  if (lot.kind === 'ghee') {
    const cream = byKind('cream')[0];
    const butter = byKind('butter')[0];
    if (cream) stages.push({ kind: 'SEPARATION', name: `Cream ${num(q(cream.id).kg, 0)} kg`, line: `fat ${num(q(cream.id).fat, 2)}\nskim to tank 4` });
    if (butter) stages.push({ kind: 'CHURN', name: 'White butter', line: `${num(q(butter.id).kg, 1)} kg\nfat ${num(q(butter.id).fat, 2)}` });
    stages.push({ kind: 'CLARIFY', name: lot.label, line: `${num(out, 1)} kg\nyield ${batch?.yieldActual ? pct(batch.yieldActual) : '—'}`, focus: true });
  } else {
    stages.push({
      kind: lot.kind === 'khoya' ? 'EVAPORATE' : 'COAGULATE',
      name: lot.label,
      line: `${num(out, 1)} kg\nyield ${batch?.yieldActual ? pct(batch.yieldActual) : '—'}`,
      focus: true,
    });
  }
  stages.push({ kind: 'SELL', name: dealers.size ? 'Dealers and outlets' : 'In stock', line: `${plural(invoices.size, 'invoice')}\n${plural(dealers.size, 'dealer')}` });

  return { back, rows, residual, unexplained, closed, stages, batch, steps };
}

export function LedgerExplorer() {
  const L = useLedger();
  const params = useSearchParams();
  const router = useRouter();
  const logRecall = useDevice((s) => s.logRecall);
  const [recall, setRecall] = useState<Recall | null>(null);

  const lots = useMemo(() => (L ? productLots(L) : []), [L]);
  const wanted = params.get('lot') ?? '';
  const lot = L ? (L.ds.lots[wanted] && lots.some((l) => l.id === wanted) ? L.ds.lots[wanted] : lots.find((l) => l.kind === 'ghee')) : undefined;
  const view = useMemo(() => (L && lot ? explore(L, lot) : null), [L, lot]);

  if (!L || !lot || !view) return <Loading label="Tracing the batch" />;
  const y = view.batch ? yieldAnalysis(L, view.batch) : null;
  const live = recall && recall.lotId === lot.id ? recall : null;

  const runRecall = () => {
    const r = mockRecall(L, lot.id);
    setRecall(r);
    logRecall({ lotId: lot.id, ts: new Date().toISOString().slice(0, 19), ms: r.ms, dealers: r.dealers.length });
  };

  const csv = () =>
    downloadText(
      `dairyos-${lot.id}.csv`,
      toCsv(
        view.rows.map((r) => ({ time: r.ts, movement: r.text, kg: r.qty.kg, fat_kg: r.qty.fat, snf_kg: r.qty.snf, cost_inr: r.qty.cost })),
      ),
    );

  return (
    <main className="flex flex-col gap-[18px] px-4 py-6 sm:px-9 sm:py-7">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <label className="flex items-center gap-2 text-[13px] text-muted">
            Ledger · Traceability explorer ·
            <select
              aria-label="Batch"
              value={lot.id}
              onChange={(e) => {
                setRecall(null);
                router.replace(`/app/ledger/?lot=${e.target.value}`);
              }}
              className="min-h-[36px] rounded-control border border-line bg-white px-2 text-[13px] text-ink"
            >
              {lots.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.label} · {dayShort(l.day)}
                </option>
              ))}
            </select>
          </label>
          <h1 className="h-display mt-1 text-[28px] leading-tight sm:text-[32px]">{lot.label}, back to the farmer</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          {view.closed ? <Badge tone="ok">Mass balance closed</Badge> : <Badge tone="loss">Mass balance open</Badge>}
          <button type="button" className="btn-secondary !text-[14px]" onClick={runRecall}>
            Run mock recall
          </button>
        </div>
      </div>

      <section className="flex flex-col gap-3.5 rounded-panel border border-line bg-white p-5" aria-labelledby="gen-h">
        <h2 id="gen-h" className="text-[16px] font-semibold">
          Batch genealogy
        </h2>
        <ol className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:flex xl:gap-0">
          {view.stages.map((s, i) => (
            <li key={s.kind} className="flex items-center xl:flex-1">
              <div
                className={clsx(
                  'flex min-h-[132px] flex-1 flex-col gap-1 rounded-card border p-3.5',
                  s.focus ? 'border-fat bg-fat-tint' : 'border-line bg-white',
                )}
              >
                <div className="font-mono text-[11px] text-muted">{s.kind}</div>
                <div className="text-[15px] font-semibold">{s.name}</div>
                <div className="mt-auto whitespace-pre-line font-mono text-[12px] leading-normal text-body">{s.line}</div>
              </div>
              {i < view.stages.length - 1 && (
                <span aria-hidden="true" className="hidden w-4 text-center text-muted xl:block">
                  ›
                </span>
              )}
            </li>
          ))}
        </ol>
      </section>

      <div className="grid gap-4 xl:grid-cols-[1.7fr_1fr]">
        <section className="flex min-w-0 flex-col gap-2.5 rounded-panel border border-line bg-white p-5" aria-labelledby="ent-h">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="ent-h" className="text-[16px] font-semibold">
              Ledger entries for this batch
            </h2>
            <span className="text-[12px] text-muted">Immutable: corrections are new entries</span>
          </div>
          <div className="max-h-[560px] overflow-auto">
            <table className="w-full min-w-[640px] border-separate border-spacing-y-1 text-[13px]">
              <caption className="sr-only">Ledger entries behind {lot.label}</caption>
              <thead className="sticky top-0 bg-white">
                <tr className="font-mono text-[11px] text-muted">
                  <th scope="col" className="px-2.5 py-1 text-left font-normal">TIME</th>
                  <th scope="col" className="px-2.5 py-1 text-left font-normal">MOVEMENT</th>
                  <th scope="col" className="px-2.5 py-1 text-right font-normal">KG</th>
                  <th scope="col" className="px-2.5 py-1 text-right font-normal">FAT</th>
                  <th scope="col" className="px-2.5 py-1 text-right font-normal">SNF</th>
                  <th scope="col" className="px-2.5 py-1 text-right font-normal">COST</th>
                </tr>
              </thead>
              <tbody className="font-mono">
                {view.rows.map((r) => (
                  <tr
                    key={r.key}
                    className={clsx(
                      '[&>td:first-child]:rounded-l-control [&>td:last-child]:rounded-r-control',
                      r.tone === 'loss' ? 'bg-loss-tint text-loss-ink' : r.tone === 'product' ? 'bg-fat-tint text-fat-ink' : 'bg-paper',
                    )}
                  >
                    <td className="whitespace-nowrap px-2.5 py-2.5">
                      {dayShort(r.ts.slice(0, 10))} {time(r.ts)}
                    </td>
                    <td className="px-2.5 py-2.5 font-sans text-[14px]">{r.text}</td>
                    <td className="px-2.5 py-2.5 text-right">{num(r.qty.kg, 1)}</td>
                    <td className="px-2.5 py-2.5 text-right">{num(r.qty.fat, 2)}</td>
                    <td className="px-2.5 py-2.5 text-right">{num(r.qty.snf, 2)}</td>
                    <td className="px-2.5 py-2.5 text-right">{inr(r.qty.cost)}</td>
                  </tr>
                ))}
                <tr className={clsx('[&>td:first-child]:rounded-l-control [&>td:last-child]:rounded-r-control', view.closed ? 'bg-ok-tint text-ok' : 'bg-loss-tint text-loss-ink')}>
                  <td className="px-2.5 py-2.5">{time(view.rows.at(-1)?.ts ?? '')}</td>
                  <td className="px-2.5 py-2.5 font-sans text-[14px]">Balance check, {view.steps.length} steps</td>
                  <td className="px-2.5 py-2.5 text-right">{num(view.residual.kg, 1)}</td>
                  <td className="px-2.5 py-2.5 text-right">±{num(view.unexplained.fat, 2)}</td>
                  <td className="px-2.5 py-2.5 text-right">±{num(view.unexplained.snf, 2)}</td>
                  <td className="px-2.5 py-2.5 text-right">{view.closed ? 'closed' : 'open'}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="mt-auto flex flex-wrap items-center justify-between gap-2 text-[13px] text-muted">
            <span>Each step books input = outputs + losses; the ± figures are the unexplained fat and SNF across the chain.</span>
            <button type="button" onClick={csv} className="font-semibold text-ink underline underline-offset-2">
              Download CSV
            </button>
          </div>
        </section>

        <div className="flex flex-col gap-4">
          <section className="flex flex-col gap-2.5 rounded-panel border border-line bg-white p-5" aria-labelledby="y-h">
            <h2 id="y-h" className="text-[16px] font-semibold">
              Yield analysis
            </h2>
            {y ? (
              <>
                <Line label="Actual yield" value={pct(y.actual)} />
                <Line label="Standard" value={pct(y.standard)} />
                <Line label="Gap explained by input" value={`${num(y.explained * 100, 2)} pts`} tone={y.explained > 0.002} />
                <Line label="Gap unexplained" value={`${num(y.unexplained * 100, 2)} pts`} tone={y.unexplained > 0.002} />
                <p className="text-[12px] leading-snug text-muted">Input: {y.basis}.</p>
              </>
            ) : (
              <p className="text-[14px] text-muted">No yield standard for this lot.</p>
            )}
          </section>
          <section className="flex flex-1 flex-col gap-2.5 rounded-panel border border-line bg-white p-5" aria-labelledby="r-h">
            <h2 id="r-h" className="text-[16px] font-semibold">
              Recall simulator
            </h2>
            <p className="text-[14px] leading-[1.5] text-body">
              DairyOS lists every dealer and invoice that received product made from the same raw-milk tanks as {lot.label.toLowerCase()}, and
              the farmers behind them.
            </p>
            {live ? (
              <div aria-live="polite" className="flex flex-col gap-2.5">
                <div className="flex flex-wrap gap-2">
                  {[plural(live.dealers.length, 'dealer'), plural(live.invoices.length, 'invoice'), plural(live.farmers.length, 'farmer'), plural(live.affectedLots.length, 'lot')].map((c) => (
                    <span key={c} className="rounded-control border border-line bg-paper px-3 py-2 text-[13px]">
                      {c}
                    </span>
                  ))}
                </div>
                <p className="text-[13px] text-ok">
                  Traced in {num(live.ms, 1)} ms.{' '}
                  {live.dealers.length
                    ? `${num(live.kgOut, 1)} kg of product from these tanks reached customers.`
                    : `Nothing from these tanks has left the plant yet: hold the ${plural(live.affectedLots.length, 'lot')} in store.`}
                </p>
                <details className="text-[13px]">
                  <summary className="cursor-pointer font-semibold">Dealers and lots</summary>
                  <p className="mt-1.5 leading-relaxed text-body">
                    {live.dealers.map((d) => L.dealer.get(d)?.name ?? d).join(', ')}
                  </p>
                  <p className="mt-1.5 leading-relaxed text-body">{live.affectedLots.map((x) => L.ds.lots[x]?.label ?? x).join(', ')}</p>
                </details>
              </div>
            ) : (
              <button type="button" onClick={runRecall} className="btn-primary self-start">
                Trace {lot.label.toLowerCase()}
              </button>
            )}
            <div className="mt-auto text-[13px] text-muted">
              Target: full trace in under 30 minutes. {dayLong(lot.day)}.{' '}
              <Link href="/app/executive/compliance/" className="underline underline-offset-2">
                Recall log
              </Link>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function Line({ label, value, tone }: { label: string; value: string; tone?: boolean }) {
  return (
    <div className={clsx('flex justify-between text-[14px]', tone && 'text-loss-ink')}>
      <span>{label}</span>
      <span className="font-mono">{value}</span>
    </div>
  );
}

