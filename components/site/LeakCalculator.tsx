'use client';

import { useId, useState } from 'react';
import { inrShort, num } from '@/lib/format';
import { SAMPLE_SETTINGS } from '@/lib/ledger/settings';

const DENSITY = SAMPLE_SETTINGS.density;
const S = SAMPLE_SETTINGS.standards;

/** What centre-to-plant shrinkage costs a year, from three numbers a plant knows. */
export function leak(litresPerDay: number, fatPct: number, shrinkPct: number, pricePerLitre: number) {
  const lostLitresPerDay = litresPerDay * (shrinkPct / 100);
  const lostLitres = lostLitresPerDay * 365;
  const fatKg = lostLitres * DENSITY * (fatPct / 100);
  const gheeKg = (fatKg * S.gheeRecovery) / S.gheeFat;
  return { lostLitresPerDay, lostLitres, fatKg, gheeKg, rupees: lostLitres * pricePerLitre };
}

export function LeakCalculator() {
  const id = useId();
  const [litres, setLitres] = useState('10000');
  const [fat, setFat] = useState('6.0');
  const [shrink, setShrink] = useState(0.5);
  const [price, setPrice] = useState('50');
  const L = Math.max(0, Number(litres) || 0);
  const F = Math.min(15, Math.max(0, Number(fat) || 0));
  const P = Math.max(0, Number(price) || 0);
  const r = leak(L, F, shrink, P);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr] lg:gap-10">
      <form className="card flex flex-col gap-5 p-5 sm:p-7" onSubmit={(e) => e.preventDefault()} aria-label="Your plant">
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-[14px] font-medium" htmlFor={`${id}-l`}>
            Milk received per day (litres)
            <input
              id={`${id}-l`}
              className="field"
              inputMode="numeric"
              value={litres}
              onChange={(e) => setLitres(e.target.value.replace(/[^\d]/g, ''))}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-[14px] font-medium" htmlFor={`${id}-f`}>
            Average fat percent
            <input
              id={`${id}-f`}
              className="field"
              inputMode="decimal"
              value={fat}
              onChange={(e) => setFat(e.target.value.replace(/[^\d.]/g, ''))}
            />
          </label>
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between text-[14px] font-medium">
            <label htmlFor={`${id}-s`}>Centre-to-plant shrinkage</label>
            <output htmlFor={`${id}-s`} className="font-mono text-[18px] text-loss">
              {shrink.toFixed(2)}%
            </output>
          </div>
          <input
            id={`${id}-s`}
            type="range"
            min={0}
            max={2}
            step={0.05}
            value={shrink}
            onChange={(e) => setShrink(Number(e.target.value))}
            className="h-11 w-full cursor-pointer accent-[#B4432A]"
            aria-valuetext={`${shrink.toFixed(2)} percent`}
          />
          <div className="flex justify-between font-mono text-[12px] text-muted">
            <span>0%</span>
            <span>1%</span>
            <span>2%</span>
          </div>
        </div>
        <label className="flex flex-col gap-1.5 text-[14px] font-medium" htmlFor={`${id}-p`}>
          What you pay farmers per litre (₹)
          <input
            id={`${id}-p`}
            className="field"
            inputMode="decimal"
            value={price}
            onChange={(e) => setPrice(e.target.value.replace(/[^\d.]/g, ''))}
          />
        </label>
      </form>

      <div className="flex flex-col justify-between gap-6 rounded-panel bg-ink p-6 text-cloud sm:p-8" aria-live="polite">
        <div>
          <div className="font-mono text-[12px] uppercase tracking-[0.08em] text-muted-dark">Lost a year between centre and plant</div>
          <div className="mt-2 font-display text-[52px] leading-none tracking-[-0.02em] text-loss-glow sm:text-[72px]">{inrShort(r.rupees)}</div>
          <p className="mt-3 text-[15px] leading-relaxed text-muted-dark">
            {num(L)} litres × {shrink.toFixed(2)}% × ₹{num(P, P % 1 ? 2 : 0)} × 365 days
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Stat label="Litres a day" value={num(r.lostLitresPerDay, 1)} />
          <Stat label="Fat a year" value={`${num(r.fatKg)} kg`} tone="fat" />
          <Stat label="As ghee" value={`${num(r.gheeKg)} kg`} tone="fat" />
        </div>
        <p className="text-[13px] leading-relaxed text-muted-faint">
          Shrinkage here is milk that leaves a centre and never reaches the plant tank. DairyOS books it per trip, so you see which
          centre, which truck and which scale.
        </p>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'fat' }) {
  return (
    <div className="rounded-[10px] bg-ink-3 p-3">
      <div className="text-[11px] text-muted-dark sm:text-[12px]">{label}</div>
      <div className={`font-mono text-[16px] sm:text-[20px] ${tone === 'fat' ? 'text-fat-glow' : 'text-cloud'}`}>{value}</div>
    </div>
  );
}
