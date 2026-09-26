'use client';

import clsx from 'clsx';
import Link from 'next/link';
import { useMemo } from 'react';
import { Badge } from '@/components/brand';
import { dayDow, dayShort, inr, num } from '@/lib/format';
import { billingCycle, farmerView, litres } from '@/lib/ledger/analytics';
import type { Ledger } from '@/lib/ledger/engine';
import type { Slip } from '@/lib/ledger/types';
import { useDevice } from '@/lib/store';
import { useLedger } from '@/lib/useLedger';
import { Alert, DataTable, Loading, SectionTitle } from './ui';

function useFarmer() {
  const L = useLedger();
  const farmerId = useDevice((s) => s.farmerId);
  return useMemo(() => {
    if (!L) return null;
    const farmer = L.farmer.get(farmerId) ?? L.farmer.get('F0142')!;
    return { L, farmer, view: farmerView(L, farmer), centre: L.ds.centres.find((c) => c.id === farmer.centreId)! };
  }, [L, farmerId]);
}

function Header({ name, centre, id }: { name: string; centre: string; id: string }) {
  return (
    <div className="flex items-center justify-between px-5 pb-3 pt-4">
      <div>
        <div className="text-[13px] text-muted" lang="hi">
          नमस्ते
        </div>
        <h1 className="font-display text-[26px] leading-tight">{name}</h1>
      </div>
      <div className="text-right text-[12px] leading-snug text-muted">
        केंद्र / Centre: {centre}
        <br />
        ID {id}
      </div>
    </div>
  );
}

const shiftLabel = (s: Slip, today: string) => {
  const when = s.day === today ? (s.shift === 'AM' ? 'आज सुबह / Today morning' : 'आज शाम / Today evening') : `${dayShort(s.day)} ${s.shift === 'AM' ? 'सुबह / morning' : 'शाम / evening'}`;
  return when;
};

function SlipRows({ L, slips }: { L: Ledger; slips: Slip[] }) {
  return (
    <DataTable
      caption="Milk slips"
      dense
      columns={[
        { key: 'day', label: 'SLIP' },
        { key: 'l', label: 'LITRES', align: 'right' },
        { key: 'f', label: 'FAT %', align: 'right', className: 'text-fat-text' },
        { key: 's', label: 'SNF %', align: 'right', className: 'text-snf-text' },
        { key: 'a', label: '₹', align: 'right' },
      ]}
      rows={slips.map((s) => ({
        _key: s.id,
        _tone: s.status === 'rejected' ? 'loss' : undefined,
        day: (
          <span>
            {dayDow(s.day)} {s.shift}
            {s.status === 'rejected' && <span className="ml-1.5 text-[12px] font-medium">rejected</span>}
          </span>
        ),
        l: num(litres(L, s.kg), 1),
        f: num(s.fatPct, 1),
        s: num(s.snfPct, 1),
        a: s.status === 'rejected' ? '0' : num(s.amount, 2),
      }))}
    />
  );
}

export function FarmerToday() {
  const d = useFarmer();
  const setFarmer = useDevice((s) => s.setFarmer);
  if (!d) return <Loading />;
  const { L, farmer, view, centre } = d;
  const s = view.latest;
  const recent = [...view.slips].reverse().slice(0, 5);
  return (
    <main className="flex flex-1 flex-col">
      <Header name={farmer.name} centre={centre.name} id={farmer.id} />
      {s && (
        <section aria-label="Latest slip" className="mx-5 my-2 flex flex-col gap-3 rounded-tile bg-ink p-[18px] text-paper">
          <div className="flex justify-between text-[13px] text-muted-dark">
            <span lang="hi">{shiftLabel(s, L.ds.today)}</span>
            <span className="font-mono">{s.ts.slice(11, 16)}</span>
          </div>
          <div className="flex gap-2.5">
            <div className="flex-1">
              <div className="text-[12px] text-muted-dark">लीटर / Litres</div>
              <div className="font-mono text-[24px]">{num(litres(L, s.kg), 1)}</div>
            </div>
            <div className="flex-1">
              <div className="text-[12px] text-muted-dark">FAT %</div>
              <div className="font-mono text-[24px] text-fat-glow">{num(s.fatPct, 1)}</div>
            </div>
            <div className="flex-1">
              <div className="text-[12px] text-muted-dark">SNF %</div>
              <div className="font-mono text-[24px] text-snf-glow">{num(s.snfPct, 1)}</div>
            </div>
          </div>
          <div className="h-px bg-ink-rule" />
          <div className="flex items-center justify-between">
            <span className="text-[14px]">{s.status === 'rejected' ? 'Rejected at the centre' : 'Amount for this slip'}</span>
            <span className="font-mono text-[20px]">{inr(s.amount, 2)}</span>
          </div>
        </section>
      )}
      <div className="mx-5 my-2 grid grid-cols-2 gap-2.5">
        <Link href="/app/farmer/payments/" className="rounded-card border border-line bg-white p-3.5 hover:border-ink">
          <div className="text-[12px] text-muted">Payment status</div>
          <div className="mt-1">
            {view.previous.paid ? <Badge tone="ok">Paid to bank</Badge> : <Badge tone="variance">Due {dayShort(view.previous.payDate)}</Badge>}
          </div>
          <div className="mt-1.5 font-mono text-[13px] text-body">
            {inr(view.previous.amount)} · {dayShort(view.previous.start)}–{dayShort(view.previous.end)}
          </div>
        </Link>
        <Link href="/app/farmer/quality/" className="rounded-card border border-line bg-white p-3.5 hover:border-ink">
          <div className="text-[12px] text-muted">Quality score</div>
          <div className="font-display text-[26px]">
            {view.quality.score} <span className="text-[16px] text-muted">/ 100</span>
          </div>
        </Link>
      </div>
      <div className="mx-5 mt-2">
        <SectionTitle aside={<Link href="/app/farmer/ledger/" className="underline underline-offset-2">See all</Link>}>
          Ledger, this fortnight
        </SectionTitle>
      </div>
      <div className="mx-5 my-2 rounded-card border border-line bg-white py-2">
        <SlipRows L={L} slips={recent} />
      </div>
      <Alert tone="fat" className="mx-5 !border-transparent">
        <strong>Incentive.</strong> Keep FAT above {num(view.incentive.threshold, 1)}% for the fortnight to earn ₹{num(view.incentive.perLitre, 2)} a
        litre. You are at {num(view.incentive.avgFat, 2)}%
        {view.incentive.qualifies ? `: on track for ${inr(view.incentive.bonus)}.` : `, ${num(view.incentive.threshold - view.incentive.avgFat, 2)} points short.`}
      </Alert>
      <label className="mx-5 mb-5 mt-5 flex items-center justify-between gap-3 text-[13px] text-muted">
        Viewing as (demo)
        <select
          value={farmer.id}
          onChange={(e) => setFarmer(e.target.value)}
          className="min-h-[44px] rounded-control border border-line bg-white px-3 text-[14px] text-ink"
        >
          {L.ds.farmers.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name} · {f.centreId}
            </option>
          ))}
        </select>
      </label>
    </main>
  );
}

export function FarmerLedger() {
  const d = useFarmer();
  if (!d) return <Loading />;
  const { L, farmer, view, centre } = d;
  const cycles = new Map<string, Slip[]>();
  [...view.slips].reverse().forEach((s) => {
    const c = billingCycle(s.day);
    const k = `${c.start}|${c.end}`;
    cycles.set(k, [...(cycles.get(k) ?? []), s]);
  });
  return (
    <main className="flex flex-1 flex-col gap-4 pb-5">
      <Header name={farmer.name} centre={centre.name} id={farmer.id} />
      {[...cycles.entries()].map(([k, slips]) => {
        const [start, end] = k.split('|');
        const ok = slips.filter((s) => s.status === 'accepted');
        const kg = ok.reduce((a, s) => a + s.kg, 0);
        return (
          <section key={k} className="mx-5 flex flex-col gap-2" aria-label={`Fortnight ${dayShort(start)} to ${dayShort(end)}`}>
            <SectionTitle aside={`${num(litres(L, kg), 1)} L · ${inr(ok.reduce((a, s) => a + s.amount, 0))}`}>
              {dayShort(start)} – {dayShort(end)}
            </SectionTitle>
            <div className="rounded-card border border-line bg-white py-2">
              <SlipRows L={L} slips={slips} />
            </div>
          </section>
        );
      })}
    </main>
  );
}

export function FarmerPayments() {
  const d = useFarmer();
  if (!d) return <Loading />;
  const { L, farmer, view, centre } = d;
  const r = L.ds.settings.rate;
  const s = view.slips.filter((x) => x.status === 'accepted').at(-1);
  return (
    <main className="flex flex-1 flex-col gap-4 pb-5">
      <Header name={farmer.name} centre={centre.name} id={farmer.id} />
      <section className="mx-5 flex flex-col gap-2 rounded-tile bg-ink p-[18px] text-paper" aria-label="This fortnight">
        <div className="flex items-center justify-between text-[13px] text-muted-dark">
          <span>
            यह पखवाड़ा / This fortnight · {dayShort(view.cycle.start)}–{dayShort(view.cycle.end)}
          </span>
        </div>
        <div className="font-display text-[36px]">{inr(view.cycle.amount)}</div>
        <div className="grid grid-cols-3 gap-2 font-mono text-[14px]">
          <span>
            {num(view.cycle.litres, 1)} <span className="text-muted-dark">L</span>
          </span>
          <span className="text-fat-glow">FAT {num(view.cycle.fatPct, 2)}</span>
          <span className="text-snf-glow">SNF {num(view.cycle.snfPct, 2)}</span>
        </div>
        <div className="text-[13px] text-muted-dark">Paid to your bank on {dayShort(view.cycle.payDate)}, three days after the fortnight closes.</div>
      </section>
      <section className="mx-5 rounded-card border border-line bg-white p-4" aria-label="Last fortnight">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[12px] text-muted">
              पिछला पखवाड़ा / Last fortnight · {dayShort(view.previous.start)}–{dayShort(view.previous.end)}
            </div>
            <div className="font-display text-[26px]">{inr(view.previous.amount)}</div>
          </div>
          {view.previous.paid ? <Badge tone="ok">Paid {dayShort(view.previous.payDate)}</Badge> : <Badge tone="variance">Due {dayShort(view.previous.payDate)}</Badge>}
        </div>
        <div className="mt-1 font-mono text-[13px] text-body">
          {num(view.previous.litres, 1)} L · FAT {num(view.previous.fatPct, 2)} · SNF {num(view.previous.snfPct, 2)}
        </div>
      </section>
      <section className="mx-5 flex flex-col gap-2" aria-labelledby="rate-h">
        <SectionTitle id="rate-h">How each slip is priced</SectionTitle>
        <div className="rounded-card border border-line bg-white p-4 text-[14px] leading-[1.55] text-body">
          <p>
            Rate chart: <span className="font-mono text-ink">₹{r.fatPerKg}</span> for every kg of fat and{' '}
            <span className="font-mono text-ink">₹{r.snfPerKg}</span> for every kg of SNF in your milk. Sample chart; your centre sets its own.
          </p>
          {s && (
            <p className="mt-2 font-mono text-[13px] text-ink">
              {num(s.kg, 1)} kg × ({num(s.fatPct, 1)}% × {r.fatPerKg} + {num(s.snfPct, 1)}% × {r.snfPerKg}) = {inr(s.amount, 2)}
            </p>
          )}
        </div>
      </section>
      <Alert tone={view.incentive.qualifies ? 'ok' : 'fat'} className="mx-5">
        <strong>Incentive this fortnight:</strong>{' '}
        {view.incentive.qualifies
          ? `${inr(view.incentive.bonus)} extra, because your average fat is ${num(view.incentive.avgFat, 2)}%.`
          : `none yet. Average fat is ${num(view.incentive.avgFat, 2)}%, and the bonus starts at ${num(view.incentive.threshold, 1)}%.`}
      </Alert>
    </main>
  );
}

export function FarmerQuality() {
  const d = useFarmer();
  if (!d) return <Loading />;
  const { L, farmer, view, centre } = d;
  const std = L.ds.settings.standards.snfQuality;
  const pts = view.slips.filter((s) => s.status === 'accepted');
  const w = 340;
  const h = 120;
  const lo = 7.8;
  const hi = 9.4;
  const y = (v: number) => h - ((v - lo) / (hi - lo)) * h;
  const x = (i: number) => (pts.length > 1 ? (i / (pts.length - 1)) * w : 0);
  return (
    <main className="flex flex-1 flex-col gap-4 pb-5">
      <Header name={farmer.name} centre={centre.name} id={farmer.id} />
      <section className="mx-5 flex items-center gap-5 rounded-tile border border-line bg-white p-5" aria-label="Quality score">
        <div className="font-display text-[56px] leading-none">{view.quality.score}</div>
        <div className="text-[14px] leading-snug text-body">
          गुणवत्ता / Quality score out of 100, over the last four weeks of slips.
        </div>
      </section>
      <section className="mx-5 flex flex-col gap-3" aria-labelledby="parts-h">
        <SectionTitle id="parts-h">What makes up the score</SectionTitle>
        {view.quality.parts.map((p) => (
          <div key={p.label} className="rounded-card border border-line bg-white p-3.5">
            <div className="flex items-baseline justify-between text-[14px]">
              <span className="font-medium">{p.label}</span>
              <span className="font-mono">
                {p.points} / {p.max}
              </span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-paper-track">
              <div className={clsx('h-2 rounded-full', p.points === p.max ? 'bg-ok' : 'bg-fat')} style={{ width: `${(p.points / p.max) * 100}%` }} />
            </div>
            <div className="mt-1.5 text-[12px] text-muted">{p.detail}</div>
          </div>
        ))}
      </section>
      <section className="mx-5 flex flex-col gap-2" aria-labelledby="snf-h">
        <SectionTitle id="snf-h" aside={`dashed line: ${std}% standard`}>
          SNF, slip by slip
        </SectionTitle>
        <div className="rounded-card border border-line bg-white p-3">
          <svg viewBox={`-4 -4 ${w + 8} ${h + 8}`} className="w-full" role="img" aria-label={`SNF across ${pts.length} slips, against a ${std}% standard`}>
            <line x1={0} x2={w} y1={y(std)} y2={y(std)} stroke="#B9B29F" strokeDasharray="4 4" />
            <polyline fill="none" stroke="#2A7A73" strokeWidth={1.75} points={pts.map((s, i) => `${x(i)},${y(Math.max(lo, Math.min(hi, s.snfPct)))}`).join(' ')} />
            {pts.map((s, i) =>
              s.snfPct < std ? <circle key={s.id} cx={x(i)} cy={y(Math.max(lo, s.snfPct))} r={3} fill="#B4432A" /> : null,
            )}
          </svg>
        </div>
      </section>
    </main>
  );
}
