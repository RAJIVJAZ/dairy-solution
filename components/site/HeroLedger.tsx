'use client';

import clsx from 'clsx';
import { useEffect, useRef, useState } from 'react';
import { num } from '@/lib/format';
import { SAMPLE_SETTINGS } from '@/lib/ledger/settings';

/*
 * Sample separation of 1,000 kg of milk at 6% fat and 9% SNF. Cost per kg of
 * cream follows the ledger's own rule: the batch cost at the sample rate chart,
 * split between cream and skim by the value of the solids each carries.
 */
const RAW = { kg: 1000, fat: 60, snf: 90 };
const CREAM = { kg: 150, fat: 54, snf: 8.7 };
const SKIM = { kg: 850, fat: 5.95, snf: 81.2 };
const LOSS = { kg: 0, fat: 0.05, snf: 0.1 };
const r = SAMPLE_SETTINGS.rate;
const value = (q: { fat: number; snf: number }) => q.fat * r.fatPerKg + q.snf * r.snfPerKg;
const CREAM_COST_PER_KG = value(CREAM) / CREAM.kg;

const T = { raw: 0, split: 750, out: 1000, loss: 1750, done: 2350, end: 3300 };
const ease = (x: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);

export function HeroLedger() {
  const [t, setT] = useState(Infinity);
  const frame = useRef(0);

  useEffect(() => {
    if (document.documentElement.dataset.motion !== '1') return;
    const t0 = performance.now() + 250;
    const tick = (now: number) => {
      const e = Math.max(0, now - t0);
      setT(e);
      if (e < T.end) frame.current = requestAnimationFrame(tick);
      else setT(Infinity);
    };
    setT(0);
    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
  }, []);

  const p = (start: number, dur = 700) => ease((t - start) / dur);
  const shown = (start: number) => t >= start;
  const v = (target: number, start: number, dp: number) => num(target * p(start), dp);
  const split = p(T.split, 450);

  const row = (label: string, q: { kg: number; fat: number; snf: number }, start: number, loss = false) => (
    <div
      key={label}
      className={clsx(
        'reveal grid grid-cols-[1.6fr_1fr_1fr_1fr] items-center rounded-control px-3 py-3.5 sm:py-[14px]',
        loss ? 'border border-dashed border-loss-dash text-loss-glow' : 'bg-ink-3',
        !shown(start) && 'reveal-pending',
      )}
    >
      <span className="font-sans text-[13px] sm:text-[14px]">{label}</span>
      <span className="text-right">{v(q.kg, start, 1)}</span>
      <span className={clsx('text-right', !loss && 'text-fat-glow')}>{v(q.fat, start, 2)}</span>
      <span className={clsx('text-right', !loss && 'text-snf-glow')}>{v(q.snf, start, 2)}</span>
    </div>
  );

  const balanced = shown(T.done);

  return (
    <div
      className="flex w-full flex-col gap-[18px] rounded-[18px] bg-ink-2 p-5 text-cloud sm:p-7"
      role="figure"
      aria-label="Sample ledger for one cream separation: 1,000 kg of milk in, 150 kg of cream and 850 kg of skim out, 0.05 kg of fat and 0.10 kg of SNF unexplained. Balanced."
    >
      <div className="flex items-center justify-between gap-3">
        <div className="font-mono text-[11px] text-muted-dark sm:text-[13px]">BATCH SEP-26-PLANT-A / SEPARATION 06:40</div>
        <div
          className={clsx(
            'reveal shrink-0 rounded-full bg-ink-5 px-2.5 py-1 text-[12px] text-ok-glow',
            !balanced && 'reveal-pending',
          )}
        >
          Balanced
        </div>
      </div>

      <div className="flex h-1.5 gap-1" aria-hidden="true">
        <div className="rounded-full bg-fat-glow transition-[flex-basis] duration-300" style={{ flexBasis: `${15 + 85 * (1 - split)}%` }} />
        <div className="rounded-full bg-snf-glow" style={{ flexBasis: `${85 * split}%`, opacity: split }} />
      </div>

      <div className="grid grid-cols-[1.6fr_1fr_1fr_1fr] px-1 font-mono text-[11px] text-muted-dark sm:text-[12px]">
        <span>ENTRY</span>
        <span className="text-right">QTY KG</span>
        <span className="text-right">FAT KG</span>
        <span className="text-right">SNF KG</span>
      </div>
      <div className="flex flex-col gap-2 font-mono text-[12.5px] sm:text-[14px]">
        {row('Raw milk in (312 farmers)', RAW, T.raw)}
        {row('Cream out', CREAM, T.out)}
        {row('Skim out', SKIM, T.out + 150)}
        {row('Unexplained loss', LOSS, T.loss, true)}
      </div>
      <div className="h-px bg-ink-rule" />
      <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
        <Kpi label="Fat in cream" value={`${num((CREAM.fat / CREAM.kg) * 100 * p(T.done), 1)}%`} tone="fat" />
        <Kpi
          label="Fat recovered"
          value={`${num(((CREAM.fat + SKIM.fat) / RAW.fat) * 100 * p(T.done, 900), 2)}%`}
          tone="fat"
        />
        <Kpi label="Cost per kg cream" value={`₹${num(CREAM_COST_PER_KG * p(T.done, 900), 2)}`} />
      </div>
      <p className="text-[12px] leading-snug text-muted-faint">
        Sample data for illustration, costed at a sample rate chart of ₹{r.fatPerKg} per kg of fat and ₹{r.snfPerKg} per kg of
        SNF. Every row links to the farmers, tanks and batches behind it.
      </p>
    </div>
  );
}

function Kpi({ label, value, tone }: { label: string; value: string; tone?: 'fat' }) {
  return (
    <div className="rounded-[10px] bg-ink-3 p-3 sm:p-3.5">
      <div className="text-[11px] text-muted-dark sm:text-[12px]">{label}</div>
      <div className={clsx('font-display text-[20px] leading-tight sm:text-[30px]', tone === 'fat' ? 'text-fat-glow' : 'text-cloud')}>{value}</div>
    </div>
  );
}
