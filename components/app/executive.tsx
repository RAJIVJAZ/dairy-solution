'use client';

import clsx from 'clsx';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Badge, Icon } from '@/components/brand';
import { toCsv, downloadText } from '@/lib/csv';
import { dayDow, dayLong, dayShort, inr, inrShort, num, pct, time } from '@/lib/format';
import {
  actions,
  alerts,
  baseline,
  batchState,
  centreDays,
  dayStats,
  dealerStatus,
  finishedStock,
  fourAnswers,
  intermediateStock,
  litres,
  lotCost,
  packagingStatus,
  productProfit,
  solidsFlow,
  workingCapital,
  yieldAnalysis,
  type Action,
} from '@/lib/ledger/analytics';
import { checkStep, traceBack, type Ledger } from '@/lib/ledger/engine';
import { addDays } from '@/lib/ledger/util';
import { SECTIONS, type SectionKey } from '@/lib/sections';
import { queuedCount, useDevice } from '@/lib/store';
import { useLedger } from '@/lib/useLedger';
import { Alert, Bar, DataTable, Kpi, Loading, SectionTitle } from './ui';

/* ---------------- page frame ---------------- */

function PageHead({ L, title, children }: { L: Ledger; title: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <div className="text-[13px] text-muted">
          {dayLong(L.ds.today)} · All plants · sample data
        </div>
        <h1 className="h-display text-[30px] leading-tight sm:text-[34px]">{title}</h1>
      </div>
      <div className="flex flex-wrap gap-2.5">{children}</div>
    </div>
  );
}

function Frame({ children }: { children: React.ReactNode }) {
  return <main className="flex flex-col gap-5 px-4 py-6 sm:px-9 sm:py-7">{children}</main>;
}

/* ---------------- the CEO agent panel ---------------- */

function AgentPanel({ L, open, onClose }: { L: Ledger; open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const approvals = useDevice((s) => s.approvals);
  const approve = useDevice((s) => s.approve);
  const revoke = useDevice((s) => s.revoke);
  const acts = actions(L);
  const pending = acts.filter((a) => !approvals[a.id]);
  const [picked, setPicked] = useState<Record<string, boolean>>({});
  const isPicked = (id: string) => picked[id] ?? true;

  useEffect(() => {
    const d = ref.current;
    if (d && open && !d.open) d.showModal();
    if (d && !open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-labelledby="agent-title"
      className="m-0 ml-auto h-dvh max-h-dvh w-full max-w-[560px] bg-paper p-0 text-ink backdrop:bg-ink/50"
      onClick={(e) => e.target === ref.current && onClose()}
    >
      <div className="flex h-full flex-col">
        <div className="flex items-start justify-between gap-3 border-b border-line p-5">
          <div>
            <div className="eyebrow">CEO agent</div>
            <h2 id="agent-title" className="h-display mt-1 text-[28px] leading-tight">
              What to do next, and why
            </h2>
            <p className="mt-1 text-[14px] text-body">It recommends. You approve. Each reason links to the entries behind it.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-control border border-line">
            <Icon name="close" />
          </button>
        </div>
        <ul className="flex flex-1 flex-col gap-3 overflow-y-auto p-5">
          {acts.map((a) => {
            const at = approvals[a.id];
            return (
              <li key={a.id} className={clsx('rounded-card border p-4', at ? 'border-ok-edge bg-ok-tint' : 'border-line bg-white')}>
                <div className="flex items-start gap-3">
                  {!at && (
                    <input
                      type="checkbox"
                      aria-label={`Include: ${a.text}`}
                      checked={isPicked(a.id)}
                      onChange={(e) => setPicked({ ...picked, [a.id]: e.target.checked })}
                      className="mt-1 h-5 w-5 shrink-0 accent-[#11201B]"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-[15px] font-semibold">{a.text}</div>
                    <p className="mt-1 text-[14px] leading-[1.45] text-body">
                      <span className="font-medium text-ink">Why: </span>
                      {a.why}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-[13px]">
                      <Link href={a.href} onClick={onClose} className="font-semibold underline underline-offset-2">
                        See the entries
                      </Link>
                      {at && (
                        <>
                          <span className="text-ok">Approved at {time(at)}</span>
                          <button type="button" onClick={() => revoke(a.id)} className="text-muted underline underline-offset-2">
                            Undo
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
        <div className="flex items-center justify-between gap-3 border-t border-line p-5">
          <span className="text-[13px] text-muted">
            {pending.length ? `${pending.filter((a) => isPicked(a.id)).length} of ${pending.length} selected` : 'Everything approved.'}
          </span>
          <button
            type="button"
            className="btn-amber"
            disabled={!pending.some((a) => isPicked(a.id))}
            onClick={() => approve(pending.filter((a) => isPicked(a.id)).map((a) => a.id))}
          >
            Approve selected
          </button>
        </div>
      </div>
    </dialog>
  );
}

function useAgent() {
  const [open, setOpen] = useState(false);
  return { open, show: () => setOpen(true), hide: () => setOpen(false) };
}

/* ---------------- today ---------------- */

const FLOW_TONE = { fat: 'fat', snf: 'snf', cost: 'cost', butter: 'butter', neutral: 'neutral', loss: 'loss' } as const;

export function ExecToday() {
  const L = useLedger();
  const queued = useDevice(queuedCount);
  const approvals = useDevice((s) => s.approvals);
  const agent = useAgent();
  const data = useMemo(() => {
    if (!L) return null;
    const t = dayStats(L, L.ds.today);
    return {
      t,
      a: fourAnswers(L),
      acts: actions(L),
      flow: solidsFlow(L),
      avgMorning: (() => {
        const past = L.ds.trips.filter((x) => x.shift === 'AM' && x.day < L.ds.today);
        const days = new Set(past.map((x) => x.day)).size;
        return days ? litres(L, past.reduce((a, x) => a + x.received.kg, 0)) / days : 0;
      })(),
      avgFat: baseline(L, L.ds.today, (d) => d.fatRecovery),
      avgSnf: baseline(L, L.ds.today, (d) => d.snfRecovery),
      avgCpl: baseline(L, L.ds.today, (d) => d.costPerLitre),
      over: dealerStatus(L).filter((d) => d.over && d.kind === 'dealer'),
    };
  }, [L]);
  if (!L || !data) return <Loading />;
  const { t, a, acts, flow, over } = data;
  const approved = acts.filter((x) => approvals[x.id]).length;
  const overBy = over.reduce((s, d) => s + d.outstanding - d.limit, 0);
  return (
    <Frame>
      <PageHead L={L} title="Today, in four answers">
        <span className="inline-flex min-h-[44px] items-center rounded-control border border-line-strong px-4 text-[14px]">Today</span>
        <button type="button" onClick={agent.show} className="btn-primary !text-[14px]">
          Ask the CEO agent
        </button>
      </PageHead>

      <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        <Answer n="1. WHAT HAPPENED">{a.happened}</Answer>
        <Answer n="2. WHAT CHANGED">{a.changed}</Answer>
        <Answer n="3. NEEDS ATTENTION" tone="loss">
          {a.attention}
        </Answer>
        <Answer n="4. DO NEXT" tone="ok">
          {a.next}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button type="button" onClick={agent.show} className="inline-flex min-h-[40px] items-center rounded-control bg-ok px-3.5 text-[14px] font-medium text-white">
              {approved === acts.length && acts.length ? 'Review' : 'Review and approve'}
            </button>
            <span className="text-[13px]">
              {approved} of {acts.length} approved
            </span>
          </div>
        </Answer>
      </div>

      <div className="grid grid-cols-2 gap-3.5 md:grid-cols-3 xl:grid-cols-5">
        <Kpi label="Milk received" value={`${num(t.receivedLitres, 0)} L`} note={`morning so far; 4-week morning average ${num(data.avgMorning, 0)} L`} edge="cost" href="/app/executive/collection/" />
        <Kpi label="Fat recovered" value={pct(t.fatRecovery)} note={`4-week average ${pct(data.avgFat)}`} edge="fat" href="/app/executive/manufacturing/" />
        <Kpi label="SNF recovered" value={pct(t.snfRecovery)} note={`4-week average ${pct(data.avgSnf)}`} edge="snf" href="/app/executive/manufacturing/" />
        <Kpi label="Cost per litre" value={inr(t.costPerLitre, 2)} note={`from the ledger; average ${inr(data.avgCpl, 2)}`} edge="cost" href="/app/executive/finance/" />
        <Kpi
          label="Receivables over limit"
          value={`${over.length} dealer${over.length === 1 ? '' : 's'}`}
          note={`${inrShort(overBy)} above their limits`}
          edge="loss"
          href="/app/executive/sales/"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <section className="flex flex-col gap-3 rounded-panel border border-line bg-white p-5" aria-labelledby="flow-h">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="flow-h" className="text-[16px] font-semibold">
              Where the fat went
            </h2>
            <span className="text-[12px] text-muted">
              {num(flow.total, 0)} kg collected, {dayShort(flow.from)} to {dayShort(flow.to)}
            </span>
          </div>
          <ul className="flex flex-col gap-2.5">
            {flow.rows.map((r) => (
              <li key={r.key} className="grid grid-cols-[minmax(0,150px)_1fr_64px] items-center gap-3 text-[14px] sm:grid-cols-[190px_1fr_80px]">
                <span className={r.key === 'unexplained' ? 'text-loss-ink' : ''}>{r.name}</span>
                <Bar share={r.share} tone={FLOW_TONE[r.tone]} />
                <span className="text-right font-mono text-muted">{pct(r.share)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-auto text-[13px] text-muted">
            Bars show each destination&apos;s share of the fat farmers delivered. The red bars are losses, always drawn even when tiny.{' '}
            <Link href="/app/ledger/" className="font-medium text-ink underline underline-offset-2">
              Open the ledger
            </Link>
          </p>
        </section>
        <section className="flex flex-col gap-2.5 rounded-panel border border-line bg-white p-5" aria-labelledby="exc-h">
          <h2 id="exc-h" className="text-[16px] font-semibold">
            Exceptions
          </h2>
          {alerts(L, queued).map((x) => (
            <Link
              key={x.tag + x.text}
              href={x.href}
              className={clsx(
                'flex gap-2.5 rounded-[10px] px-3 py-2.5 text-[14px] leading-[1.4] hover:ring-1 hover:ring-ink/30',
                x.tone === 'loss' ? 'bg-loss-tint text-loss-ink' : x.tone === 'fat' ? 'bg-fat-tint text-fat-ink' : 'bg-paper-4 text-body',
              )}
            >
              <span className="w-[72px] shrink-0 font-mono text-[12px]">{x.tag}</span>
              <span>{x.text}</span>
            </Link>
          ))}
        </section>
      </div>
      <AgentPanel L={L} open={agent.open} onClose={agent.hide} />
    </Frame>
  );
}

function Answer({ n, tone, children }: { n: string; tone?: 'loss' | 'ok'; children: React.ReactNode }) {
  const box = tone === 'loss' ? 'border-loss-edge bg-loss-tint text-loss-ink' : tone === 'ok' ? 'border-ok-edge bg-ok-tint text-ok' : 'border-line bg-white';
  return (
    <section className={clsx('flex flex-col gap-2 rounded-panel border p-[18px]', box)}>
      <h2 className={clsx('font-mono text-[11px] tracking-[0.06em]', tone ? '' : 'text-muted')}>{n}</h2>
      <div className="text-[15px] leading-[1.45]">{children}</div>
    </section>
  );
}

/* ---------------- sections ---------------- */


export function ExecSection({ section }: { section: SectionKey }) {
  const L = useLedger();
  if (!L) return <Loading />;
  const body = {
    collection: <Collection L={L} />,
    plant: <Plant L={L} />,
    manufacturing: <Manufacturing L={L} />,
    inventory: <Inventory L={L} />,
    sales: <Sales L={L} />,
    finance: <Finance L={L} />,
    compliance: <Compliance L={L} />,
  }[section];
  return (
    <Frame>
      <PageHead L={L} title={SECTIONS[section]} />
      {body}
    </Frame>
  );
}

function Panel({ title, aside, children, id }: { title: string; aside?: React.ReactNode; children: React.ReactNode; id: string }) {
  return (
    <section className="flex flex-col gap-3 rounded-panel border border-line bg-white p-5" aria-labelledby={id}>
      <SectionTitle id={id} aside={aside}>
        {title}
      </SectionTitle>
      {children}
    </section>
  );
}

function DayBars({ values, labels, tone = 'cost', unit }: { values: number[]; labels: string[]; tone?: 'cost' | 'fat' | 'snf'; unit: string }) {
  const max = Math.max(...values, 1);
  const fill = { cost: '#23446B', fat: '#C9821A', snf: '#2A7A73' }[tone];
  return (
    <div className="flex h-40 items-end gap-1.5" role="img" aria-label={`Daily ${unit}, ${labels[0]} to ${labels.at(-1)}`}>
      {values.map((v, i) => (
        <div key={labels[i]} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1" title={`${labels[i]}: ${num(v, 0)} ${unit}`}>
          <div className="w-full rounded-t-[3px]" style={{ height: `${(v / max) * 100}%`, background: fill, opacity: i === values.length - 1 ? 0.55 : 1 }} />
          <span className="font-mono text-[10px] text-muted">{labels[i].split(' ')[1]}</span>
        </div>
      ))}
    </div>
  );
}

function Collection({ L }: { L: Ledger }) {
  const rows = centreDays(L, L.ds.today);
  const t = dayStats(L, L.ds.today);
  const days = L.ds.days.slice(-14);
  return (
    <>
      <div className="grid grid-cols-2 gap-3.5 md:grid-cols-4">
        <Kpi label="Farmers today" value={num(t.farmers)} edge="neutral" />
        <Kpi label="Litres today" value={num(t.receivedLitres)} note="received at the plant" edge="cost" />
        <Kpi label="Fat collected" value={`${num(t.collected.fat, 1)} kg`} note={`${num((t.collected.fat / t.collected.kg) * 100, 2)}% of milk`} edge="fat" />
        <Kpi label="Rejected slips" value={num(t.rejected)} edge="loss" />
      </div>
      <Panel id="c-centres" title="Centres today" aside="shrinkage is centre-to-plant, against each centre's 4-week average">
        <DataTable
          caption="Centres today"
          columns={[
            { key: 'c', label: 'CENTRE' },
            { key: 'n', label: 'FARMERS', align: 'right' },
            { key: 'l', label: 'LITRES', align: 'right' },
            { key: 'f', label: 'FAT %', align: 'right', className: 'text-fat-text' },
            { key: 's', label: 'SNF %', align: 'right', className: 'text-snf-text' },
            { key: 'r', label: 'REJECTED', align: 'right' },
            { key: 'sh', label: 'SHRINKAGE', align: 'right' },
            { key: 'avg', label: '4-WK AVG', align: 'right' },
            { key: 'cal', label: 'SCALE CALIBRATED', align: 'right' },
          ]}
          rows={rows.map((c) => ({
            _key: c.centreId,
            _tone: c.shrinkToday > 0.005 && c.shrinkToday > 2 * c.shrinkAvg ? 'loss' : undefined,
            c: c.name,
            n: c.farmers,
            l: num(litres(L, c.kg), 0),
            f: num(c.fatPct, 2),
            s: num(c.snfPct, 2),
            r: c.rejected,
            sh: pct(c.shrinkToday),
            avg: pct(c.shrinkAvg),
            cal: `${c.scaleDays} days ago`,
          }))}
        />
      </Panel>
      <Panel id="c-trend" title="Litres collected per day" aside="last two weeks; today is morning only">
        <DayBars values={days.map((d) => litres(L, dayStats(L, d).collected.kg))} labels={days.map(dayDow)} unit="litres" />
      </Panel>
    </>
  );
}

function Plant({ L }: { L: Ledger }) {
  const trips = L.ds.trips.filter((t) => t.day === L.ds.today);
  const steps = L.ds.batches.filter((b) => b.day === L.ds.today);
  const stock = intermediateStock(L).filter((x) => x.lot.kind !== 'centre');
  return (
    <>
      <Panel id="p-trips" title="Reception, today" aside="every truck weighed on arrival">
        <DataTable
          caption="Trips received today"
          columns={[
            { key: 't', label: 'TRIP' },
            { key: 'sent', label: 'SENT KG', align: 'right' },
            { key: 'rec', label: 'RECEIVED KG', align: 'right' },
            { key: 'kg', label: 'SHORT KG', align: 'right' },
            { key: 'fat', label: 'FAT SHORT KG', align: 'right' },
            { key: 'p', label: 'SHRINKAGE', align: 'right' },
          ]}
          rows={trips.map((t) => {
            const sh = 1 - t.received.kg / t.sent.kg;
            return {
              _key: t.id,
              _tone: sh > 0.006 ? 'loss' : undefined,
              t: `${t.id} · ${time(t.receivedTs)}`,
              sent: num(t.sent.kg, 1),
              rec: num(t.received.kg, 1),
              kg: num(t.sent.kg - t.received.kg, 1),
              fat: num(t.sent.fat - t.received.fat, 2),
              p: pct(sh),
            };
          })}
        />
      </Panel>
      <Panel id="p-steps" title="Process steps, today" aside="input must equal outputs plus losses">
        <DataTable
          caption="Mass balance of today's process steps"
          columns={[
            { key: 's', label: 'STEP' },
            { key: 'in', label: 'INPUT KG', align: 'right' },
            { key: 'fat', label: 'FAT IN KG', align: 'right' },
            { key: 'u', label: 'UNEXPLAINED FAT', align: 'right' },
            { key: 'c', label: 'BALANCE' },
          ]}
          rows={steps.map((b) => {
            const c = checkStep(L, b.group);
            return {
              _key: b.id,
              s: `${b.label} · ${time(b.end)}`,
              in: num(c.input.kg, 1),
              fat: num(c.input.fat, 2),
              u: num(c.unexplained.fat, 3),
              c: c.closed ? <Badge tone="ok">Closed</Badge> : <Badge tone="loss">Open</Badge>,
            };
          })}
        />
      </Panel>
      <Panel id="p-stock" title="Tanks and in-process stock">
        {stock.length ? (
          <DataTable
            caption="Stock in tanks and in process"
            columns={[
              { key: 'l', label: 'LOT' },
              { key: 'kg', label: 'KG', align: 'right' },
              { key: 'f', label: 'FAT KG', align: 'right' },
              { key: 's', label: 'SNF KG', align: 'right' },
              { key: 'c', label: 'COST', align: 'right' },
            ]}
            rows={stock.map((x) => ({ _key: x.lot.id, l: x.lot.label, kg: num(x.qty.kg, 1), f: num(x.qty.fat, 2), s: num(x.qty.snf, 2), c: inr(x.qty.cost) }))}
          />
        ) : (
          <p className="text-[14px] text-muted">Every tank is empty.</p>
        )}
      </Panel>
    </>
  );
}

function Manufacturing({ L }: { L: Ledger }) {
  const from = addDays(L.ds.today, -13);
  const batches = L.ds.batches.filter((b) => (b.kind === 'ghee' || b.kind === 'khoya' || b.kind === 'paneer') && b.day >= from).reverse();
  return (
    <Panel id="m-batches" title="Batches, last two weeks" aside="yield gap split into what the input explains and what it does not">
      <DataTable
        caption="Batch yields"
        columns={[
          { key: 'b', label: 'BATCH' },
          { key: 'd', label: 'DAY' },
          { key: 'in', label: 'INPUT KG', align: 'right' },
          { key: 'out', label: 'OUTPUT KG', align: 'right' },
          { key: 'y', label: 'YIELD', align: 'right' },
          { key: 'std', label: 'STANDARD', align: 'right' },
          { key: 'u', label: 'UNEXPLAINED PTS', align: 'right' },
          { key: 'c', label: 'COST / KG', align: 'right' },
          { key: 's', label: 'STATE' },
        ]}
        rows={batches.map((b) => {
          const c = checkStep(L, b.group);
          const y = yieldAnalysis(L, b)!;
          const state = batchState(L, b);
          return {
            _key: b.id,
            _tone: state === 'Below standard' ? 'loss' : undefined,
            b: (
              <Link href={`/app/ledger/?lot=${b.outputLot}`} className="font-medium underline-offset-2 hover:underline">
                {b.label}
              </Link>
            ),
            d: dayShort(b.day),
            in: num(c.input.kg, 1),
            out: num(c.outputs.find((o) => o.to === b.outputLot)?.qty.kg ?? 0, 1),
            y: pct(y.actual),
            std: pct(y.standard),
            u: num(y.unexplained * 100, 2),
            c: inr(lotCost(L, b.outputLot!).perKg, 2),
            s: state,
          };
        })}
      />
    </Panel>
  );
}

function Inventory({ L }: { L: Ledger }) {
  const fg = finishedStock(L);
  const pack = packagingStatus(L);
  return (
    <>
      <Panel id="i-fg" title="Finished goods" aside={`at cost: ${inrShort(fg.reduce((a, x) => a + x.value, 0))}`}>
        <DataTable
          caption="Finished goods, first expiry first"
          columns={[
            { key: 'l', label: 'LOT' },
            { key: 'kg', label: 'KG', align: 'right' },
            { key: 'c', label: 'COST / KG', align: 'right' },
            { key: 'v', label: 'VALUE', align: 'right' },
            { key: 'e', label: 'USE BY', align: 'right' },
            { key: 'd', label: 'DAYS LEFT', align: 'right' },
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
            c: inr(x.perKg, 2),
            v: inr(x.value),
            e: x.lot.expires ? dayShort(x.lot.expires) : '—',
            d: x.expiresIn ?? '—',
          }))}
        />
      </Panel>
      <Panel id="i-pack" title="Packaging" aside="cover is stock divided by last week's daily use">
        <DataTable
          caption="Packaging stock"
          columns={[
            { key: 'n', label: 'ITEM' },
            { key: 's', label: 'STOCK', align: 'right' },
            { key: 'u', label: 'USE / DAY', align: 'right' },
            { key: 'c', label: 'COVER DAYS', align: 'right' },
            { key: 'l', label: 'LEAD DAYS', align: 'right' },
          ]}
          rows={pack.map((p) => ({
            _key: p.id,
            _tone: p.reorder ? 'fat' : undefined,
            n: p.name,
            s: `${num(p.stock, p.unit === 'kg' ? 1 : 0)} ${p.unit}`,
            u: num(p.dailyUse, p.unit === 'kg' ? 2 : 0),
            c: num(p.cover, 1),
            l: p.leadDays,
          }))}
        />
      </Panel>
    </>
  );
}

function Sales({ L }: { L: Ledger }) {
  const approvals = useDevice((s) => s.approvals);
  const approve = useDevice((s) => s.approve);
  const revoke = useDevice((s) => s.revoke);
  const dealers = dealerStatus(L);
  const open = dealers.flatMap((d) => d.open.map((o) => ({ o, d })));
  const recent = L.ds.invoices.filter((v) => v.status === 'dispatched' && v.dealerId !== 'BULK').slice(-10).reverse();
  return (
    <>
      <Panel id="s-open" title="Today's open orders" aside="checked against credit before the truck is loaded">
        <DataTable
          caption="Open orders"
          columns={[
            { key: 'o', label: 'ORDER' },
            { key: 'd', label: 'DEALER' },
            { key: 'kg', label: 'GHEE KG', align: 'right' },
            { key: 'v', label: 'VALUE', align: 'right' },
            { key: 'r', label: 'CREDIT CHECK' },
            { key: 'a', label: 'ACTION' },
          ]}
          rows={open.map(({ o, d }) => {
            const id = `hold-${o.id}`;
            const held = approvals[id];
            return {
              _key: o.id,
              _tone: d.over ? 'loss' : undefined,
              o: `${o.id} · ${time(o.ts)}`,
              d: d.name,
              kg: num(o.lines.reduce((a, l) => a + l.kg, 0), 1),
              v: inr(o.total),
              r: d.over ? `Over limit by ${inrShort(d.outstanding - d.limit)}` : 'Within limit',
              a: d.over ? (
                held ? (
                  <span className="flex items-center gap-2">
                    Held {time(held)}
                    <button type="button" className="underline underline-offset-2" onClick={() => revoke(id)}>
                      Release
                    </button>
                  </span>
                ) : (
                  <button type="button" className="btn-danger !min-h-[36px] !px-3 !text-[13px]" onClick={() => approve([id])}>
                    Hold dispatch
                  </button>
                )
              ) : (
                'Load'
              ),
            };
          })}
        />
      </Panel>
      <Panel id="s-credit" title="Dealer credit" aside="outstanding = dispatched invoices less payments received">
        <DataTable
          caption="Dealer credit"
          columns={[
            { key: 'd', label: 'DEALER' },
            { key: 'r', label: 'ROUTE' },
            { key: 'o', label: 'OUTSTANDING', align: 'right' },
            { key: 'l', label: 'LIMIT', align: 'right' },
            { key: 'u', label: 'USED', align: 'right' },
            { key: 'p', label: 'LAST PAID', align: 'right' },
          ]}
          rows={dealers.map((d) => ({
            _key: d.id,
            _tone: d.over ? 'loss' : undefined,
            d: d.name,
            r: d.route,
            o: inr(d.outstanding),
            l: inr(d.limit),
            u: pct(d.outstanding / d.limit, 0),
            p: d.lastPaid ? dayShort(d.lastPaid) : '—',
          }))}
        />
      </Panel>
      <Panel id="s-recent" title="Recent invoices">
        <DataTable
          caption="Recent invoices"
          columns={[
            { key: 'i', label: 'INVOICE' },
            { key: 'd', label: 'DEALER' },
            { key: 'day', label: 'DAY' },
            { key: 'l', label: 'LINES' },
            { key: 't', label: 'TOTAL', align: 'right' },
          ]}
          rows={recent.map((v) => ({
            _key: v.id,
            i: v.id,
            d: L.dealer.get(v.dealerId)?.name ?? v.dealerId,
            day: dayShort(v.day),
            l: [...v.lines.reduce((m, l) => m.set(l.product, (m.get(l.product) ?? 0) + l.kg), new Map<string, number>())]
              .map(([p, kg]) => `${p} ${num(kg, 1)} kg`)
              .join(', '),
            t: inr(v.total),
          }))}
        />
      </Panel>
    </>
  );
}

function Finance({ L }: { L: Ledger }) {
  const t = dayStats(L, L.ds.today);
  const avg = baseline(L, L.ds.today, (d) => d.costPerLitre);
  const wc = workingCapital(L);
  const profit = productProfit(L).sort((a, b) => b.revenue - a.revenue);
  const days = L.ds.days.slice(-15, -1);
  const invoicesCsv = () =>
    downloadText(
      `dairyos-invoices-${L.ds.today}.csv`,
      toCsv(
        L.ds.invoices
          .filter((v) => v.status === 'dispatched')
          .flatMap((v) =>
            v.lines.map((l) => ({ date: v.day, voucher: v.id, party: L.dealer.get(v.dealerId)?.name ?? v.dealerId, item: l.product, kg: l.kg, rate: l.rate, amount: l.amount })),
          ),
      ),
    );
  return (
    <>
      <div className="grid grid-cols-2 gap-3.5 md:grid-cols-3 xl:grid-cols-5">
        <Kpi label="Cost per litre, today" value={inr(t.costPerLitre, 2)} note={`4-week average ${inr(avg, 2)}`} edge="cost" />
        <Kpi label="Receivables" value={inrShort(wc.receivables)} note="dealers and bulk buyer" edge="cost" />
        <Kpi label="Farmer payable" value={inrShort(wc.payable)} note="this fortnight so far" edge="fat" />
        <Kpi label="Stock at cost" value={inrShort(wc.inventory)} note="finished and in process" edge="snf" />
        <Kpi label="Net working capital" value={inrShort(wc.net)} note="receivables + stock − farmer payable" edge="neutral" />
      </div>
      <Panel id="f-profit" title="Profit by product, last four weeks" aside="cost follows each kilogram through the ledger">
        <DataTable
          caption="Profit by product"
          columns={[
            { key: 'p', label: 'PRODUCT' },
            { key: 'kg', label: 'KG SOLD', align: 'right' },
            { key: 'r', label: 'REVENUE', align: 'right' },
            { key: 'c', label: 'COST', align: 'right' },
            { key: 'm', label: 'MARGIN', align: 'right' },
            { key: 'pc', label: 'MARGIN %', align: 'right' },
          ]}
          rows={profit.map((p) => ({
            _key: p.product,
            p: p.product.charAt(0).toUpperCase() + p.product.slice(1),
            kg: num(p.kg, 0),
            r: inrShort(p.revenue),
            c: inrShort(p.cost),
            m: inrShort(p.margin),
            pc: pct(p.marginPct, 1),
          }))}
        />
        <p className="text-[12px] text-muted">Selling prices, rates and overheads are sample settings. Skim is costed at the value of its solids, which is why it earns little.</p>
      </Panel>
      <Panel id="f-rev" title="Dealer revenue per day" aside="last two full weeks">
        <DayBars values={days.map((d) => dayStats(L, d).revenue)} labels={days.map(dayDow)} unit="rupees" />
      </Panel>
      <Panel id="f-tally" title="Tally export">
        <p className="text-[14px] text-body">Sales vouchers for every dispatched invoice, one line per item, ready to import instead of re-keying.</p>
        <button type="button" className="btn-secondary self-start" onClick={invoicesCsv}>
          Download sales vouchers (CSV)
        </button>
      </Panel>
    </>
  );
}

function Compliance({ L }: { L: Ledger }) {
  const recalls = useDevice((s) => s.recalls);
  const products = Object.values(L.ds.lots).filter((l) => l.kind === 'ghee' || l.kind === 'khoya' || l.kind === 'paneer');
  const traced = products.filter((l) => traceBack(L, l.id).farmers.length > 0).length;
  const groups = [...new Set(L.ds.movements.filter((m) => m.step !== 'overhead' && m.step !== 'collect' && m.step !== 'sell').map((m) => m.group))];
  const closed = groups.filter((g) => checkStep(L, g).closed).length;
  const csv = () =>
    downloadText(
      `dairyos-ledger-${L.ds.today}.csv`,
      toCsv(
        L.ds.movements.map((m) => ({
          entry: m.id,
          time: m.ts,
          step: m.step,
          group: m.group,
          from: m.from,
          to: m.to,
          kg: m.qty.kg,
          fat_kg: m.qty.fat,
          snf_kg: m.qty.snf,
          cost_inr: m.qty.cost,
          memo: m.memo,
          ref: m.ref ?? '',
        })),
      ),
    );
  return (
    <>
      <div className="grid grid-cols-2 gap-3.5 md:grid-cols-4">
        <Kpi label="Batches traced to farmers" value={`${traced} / ${products.length}`} edge="ok" />
        <Kpi label="Process steps balanced" value={`${closed} / ${groups.length}`} edge="ok" />
        <Kpi label="Ledger entries" value={num(L.ds.movements.length)} note="four weeks, immutable" edge="neutral" />
        <Kpi label="Mock recalls run" value={recalls.length} note="from this device" edge="neutral" />
      </div>
      <Panel id="cp-recall" title="Mock recall" aside="target: full trace in under 30 minutes">
        {recalls.length ? (
          <DataTable
            caption="Mock recalls"
            columns={[
              { key: 'l', label: 'LOT' },
              { key: 't', label: 'RUN AT' },
              { key: 'd', label: 'DEALERS', align: 'right' },
              { key: 'ms', label: 'TRACE TIME', align: 'right' },
            ]}
            rows={recalls.map((r) => ({ _key: r.lotId + r.ts, l: L.ds.lots[r.lotId]?.label ?? r.lotId, t: `${dayShort(r.ts.slice(0, 10))} ${time(r.ts)}`, d: r.dealers, ms: `${num(r.ms, 1)} ms` }))}
          />
        ) : (
          <p className="text-[14px] text-muted">No recall run yet from this device.</p>
        )}
        <Link href="/app/ledger/" className="btn-secondary self-start">
          Run a mock recall
        </Link>
      </Panel>
      <Panel id="cp-audit" title="Audit room">
        <p className="text-[14px] leading-[1.5] text-body">
          Every entry carries its time, the step it belongs to, where the material came from and went, and its kilograms, fat, SNF and cost. Nothing
          is edited in place: a correction is a new entry, so the history of every figure stays readable.
        </p>
        <button type="button" className="btn-secondary self-start" onClick={csv}>
          Download the full ledger (CSV)
        </button>
      </Panel>
      <Alert tone="neutral">FSSAI registers, licences and lab reports attach to batches in a production deployment. The demo carries the ledger only.</Alert>
    </>
  );
}
