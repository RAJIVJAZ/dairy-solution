'use client';

import clsx from 'clsx';
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { Badge, Icon } from '@/components/brand';
import { dayDow, dayShort, inr, num, pct, time } from '@/lib/format';
import { qualityScore, slipAnomaly } from '@/lib/ledger/analytics';
import type { DeviceSlip, Ledger } from '@/lib/ledger/engine';
import { clrFrom, isRejected, slipAmount } from '@/lib/ledger/settings';
import type { Farmer, Shift, Slip } from '@/lib/ledger/types';
import { mmdd } from '@/lib/ledger/util';
import { isOnline, nowLocal, queuedCount, useDevice } from '@/lib/store';
import { useLedger } from '@/lib/useLedger';
import { Alert, DataTable, Loading, SectionTitle } from './ui';

/* ---------------- connectivity ---------------- */

function subscribeOnline(cb: () => void) {
  window.addEventListener('online', cb);
  window.addEventListener('offline', cb);
  return () => {
    window.removeEventListener('online', cb);
    window.removeEventListener('offline', cb);
  };
}

export function useOnline() {
  const browser = useSyncExternalStore(
    subscribeOnline,
    () => navigator.onLine,
    () => true,
  );
  const forced = useDevice((s) => s.forcedOffline);
  return browser && !forced;
}

/** Sends the queue a moment after anything lands in it, whenever there is signal. */
function useAutoSync() {
  const online = useOnline();
  const queued = useDevice(queuedCount);
  const sync = useDevice((s) => s.syncNow);
  useEffect(() => {
    if (!online || queued === 0) return;
    const id = window.setTimeout(() => sync(), 1500);
    return () => window.clearTimeout(id);
  }, [online, queued, sync]);
}

const currentShift = (): Shift => (new Date().getHours() < 12 ? 'AM' : 'PM');

function StatusChip() {
  const online = useOnline();
  const queued = useDevice(queuedCount);
  if (!online) {
    return (
      <Badge tone="queued">
        <Icon name="offline" size={16} /> Offline · {queued} queued
      </Badge>
    );
  }
  if (queued > 0) {
    return (
      <Badge tone="synced">
        <Icon name="sync" size={16} /> Syncing {queued}
      </Badge>
    );
  }
  return (
    <Badge tone="ok">
      <Icon name="check" size={16} /> Synced
    </Badge>
  );
}

export function CentreHeader({ title }: { title: React.ReactNode }) {
  useAutoSync();
  return (
    <div className="flex items-center justify-between gap-3 px-5 pb-3 pt-4">
      <h1 className="font-display text-[22px] leading-tight">{title}</h1>
      <StatusChip />
    </div>
  );
}

function useCentre() {
  const L = useLedger();
  const centreId = useDevice((s) => s.centreId);
  const device = useDevice((s) => s.slips);
  return useMemo(() => {
    if (!L) return null;
    const centre = L.ds.centres.find((c) => c.id === centreId) ?? L.ds.centres[0];
    const farmers = L.ds.farmers.filter((f) => f.centreId === centre.id);
    // Slips this centre's own screen can see: everything synced, plus its own queue.
    const queued = device.filter((s) => s.centreId === centre.id && s.syncState === 'queued');
    const all: Slip[] = [...L.ds.slips.filter((s) => s.centreId === centre.id), ...queued];
    return { L, centre, farmers, all };
  }, [L, centreId, device]);
}

/* ---------------- collect ---------------- */

const toFarmerId = (raw: string) => {
  const digits = raw.replace(/\D/g, '');
  return digits ? `F${digits.slice(-4).padStart(4, '0')}` : '';
};

function sampleReading(f: Farmer, shift: Shift) {
  const jitter = (sd: number) => (Math.random() + Math.random() + Math.random() - 1.5) * sd * 1.4;
  return {
    kg: Math.max(1, Math.round((8 + Number(f.id.slice(1)) % 7) * (shift === 'AM' ? 1.1 : 0.85) * 10) / 10),
    fat: Math.round((f.baseFat + jitter(0.15)) * 10) / 10,
    snf: Math.round((f.baseSnf + jitter(0.08)) * 10) / 10,
  };
}

function PrintSlip({ slip, centre }: { slip: DeviceSlip | null; centre: string }) {
  if (!slip) return null;
  return (
    <div className="print-slip hidden font-mono text-[11px] leading-snug text-black" aria-hidden="true">
      <div style={{ fontWeight: 700 }}>DairyOS · {centre}</div>
      <div>
        {dayShort(slip.day)} {slip.shift} · {time(slip.ts)}
      </div>
      <div>Farmer {slip.farmerId.slice(1)}</div>
      <div>--------------------------</div>
      <div>Weight   {num(slip.kg, 2)} kg</div>
      <div>FAT      {num(slip.fatPct, 1)} %</div>
      <div>SNF      {num(slip.snfPct, 1)} %</div>
      <div>CLR      {num(slip.clr, 1)}</div>
      <div>--------------------------</div>
      <div style={{ fontWeight: 700 }}>{slip.status === 'rejected' ? 'REJECTED' : `Amount ${inr(slip.amount, 2)}`}</div>
      <div>{slip.id}</div>
    </div>
  );
}

function NumTile({
  label,
  value,
  onChange,
  edge,
  unit,
  id,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  edge: string;
  unit?: string;
  id: string;
}) {
  return (
    <label htmlFor={id} className={clsx('flex flex-col rounded-[10px] border-t-[3px] bg-paper p-3', edge)}>
      <span className="text-[12px] text-muted">{label}</span>
      <span className="flex items-baseline gap-1">
        <input
          id={id}
          inputMode="decimal"
          autoComplete="off"
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/[^\d.]/g, ''))}
          placeholder="0.0"
          className="w-full min-w-0 bg-transparent font-mono text-[26px] text-ink outline-none placeholder:text-line-strong"
        />
        {unit && <span className="font-mono text-[14px] text-muted">{unit}</span>}
      </span>
    </label>
  );
}

export function CentreCollect() {
  const d = useCentre();
  const addSlip = useDevice((s) => s.addSlip);
  const [fid, setFid] = useState('');
  const [kg, setKg] = useState('');
  const [fat, setFat] = useState('');
  const [snf, setSnf] = useState('');
  const [clr, setClr] = useState('');
  const [clrEdited, setClrEdited] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState<DeviceSlip | null>(null);
  const [printOnSave, setPrintOnSave] = useState(true);
  const idRef = useRef<HTMLInputElement>(null);

  if (!d) return <Loading />;
  const { L, centre, farmers, all } = d;
  const shift = currentShift();
  const today = L.ds.today;
  const farmerId = toFarmerId(fid);
  const farmer = farmerId ? L.farmer.get(farmerId) : undefined;
  const kgN = Number(kg);
  const fatN = Number(fat);
  const snfN = Number(snf);
  const complete = !!farmer && kgN > 0 && fatN > 0 && snfN > 0;
  const amount = complete ? slipAmount(kgN, fatN, snfN, L.ds.settings) : 0;
  const clrShown = clrEdited ? clr : fatN > 0 && snfN > 0 ? String(clrFrom(fatN, snfN)) : '';
  const belowMin = complete && isRejected(fatN, snfN, L.ds.settings);
  const anomaly = complete ? slipAnomaly(L, farmer.id, fatN, snfN) : null;
  const already = farmer ? all.find((s) => s.farmerId === farmer.id && s.day === today && s.shift === shift) : undefined;
  const elsewhere = farmer && farmer.centreId !== centre.id;

  const shiftSlips = all.filter((s) => s.day === today && s.shift === shift).sort((a, b) => b.ts.localeCompare(a.ts));
  const accepted = shiftSlips.filter((s) => s.status === 'accepted');
  const shiftKg = accepted.reduce((a, s) => a + s.kg, 0);

  function record(status: 'accepted' | 'rejected') {
    setError('');
    if (!farmer) return setError('Enter a farmer ID from this centre’s register.');
    if (!(kgN > 0 && kgN < 200)) return setError('Weight should be between 0 and 200 kg.');
    if (!(fatN > 0 && fatN < 15) || !(snfN > 0 && snfN < 15)) return setError('Fat and SNF should be percentages between 0 and 15.');
    const slip: DeviceSlip = {
      id: `S-${centre.id}-${mmdd(today)}-${shift}-${farmer.id.slice(1)}-D${Date.now().toString(36).toUpperCase()}`,
      farmerId: farmer.id,
      centreId: centre.id,
      day: today,
      shift,
      ts: nowLocal(),
      kg: kgN,
      clr: Number(clrShown) || 0,
      fatPct: fatN,
      snfPct: snfN,
      amount: status === 'accepted' ? amount : 0,
      status,
      origin: 'device',
      syncState: 'queued',
    };
    addSlip(slip);
    setSaved(slip);
    setFid('');
    setKg('');
    setFat('');
    setSnf('');
    setClr('');
    setClrEdited(false);
    idRef.current?.focus();
    if (printOnSave && status === 'accepted') window.setTimeout(() => window.print(), 50);
  }

  return (
    <main className="flex flex-1 flex-col pb-4">
      <CentreHeader title={<span lang="hi">संग्रह / Collection</span>} />
      <form
        className="mx-5 flex flex-col gap-3.5 rounded-tile border border-line bg-white p-[18px]"
        onSubmit={(e) => {
          e.preventDefault();
          record('accepted');
        }}
        aria-label="New slip"
      >
        <div className="grid grid-cols-[120px_1fr] items-end gap-3">
          <label className="flex flex-col gap-1 text-[12px] text-muted" htmlFor="fid">
            किसान / Farmer ID
            <input
              id="fid"
              ref={idRef}
              list="centre-farmers"
              inputMode="numeric"
              autoComplete="off"
              value={fid}
              onChange={(e) => setFid(e.target.value)}
              placeholder="0142"
              className="min-h-[44px] w-full rounded-control border border-line-strong px-3 font-mono text-[20px] text-ink"
            />
            <datalist id="centre-farmers">
              {farmers.map((f) => (
                <option key={f.id} value={f.id.slice(1)} />
              ))}
            </datalist>
          </label>
          <div className="min-w-0 pb-1 text-right" aria-live="polite">
            {farmer ? (
              <>
                <div className="truncate text-[20px] font-semibold">{farmer.name}</div>
                <div className="font-mono text-[12px] text-muted">
                  usual FAT {num(farmer.baseFat, 1)} · SNF {num(farmer.baseSnf, 1)}
                </div>
              </>
            ) : (
              <div className="text-[14px] text-muted">{fid ? 'Not in the register' : 'Type the ID on the card'}</div>
            )}
          </div>
        </div>
        {elsewhere && <Alert tone="fat">This farmer is registered at Centre {farmer.centreId}. The slip will still be recorded here.</Alert>}
        {already && (
          <Alert tone="fat">
            Already recorded this {shift === 'AM' ? 'morning' : 'evening'}: {num(already.kg, 1)} kg at {time(already.ts)}. Save only if this is a second can.
          </Alert>
        )}
        <div className="grid grid-cols-2 gap-2.5">
          <NumTile id="kg" label="Weight (from scale)" value={kg} onChange={setKg} edge="border-t-cost" unit="kg" />
          <NumTile
            id="clr"
            label="CLR"
            value={clrShown}
            onChange={(v) => {
              setClrEdited(true);
              setClr(v);
            }}
            edge="border-t-line-strong"
          />
          <NumTile id="fat" label="FAT % (analyzer)" value={fat} onChange={setFat} edge="border-t-fat" />
          <NumTile id="snf" label="SNF % (analyzer)" value={snf} onChange={setSnf} edge="border-t-snf" />
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-ok-tint px-3.5 text-[13px] font-medium text-ok disabled:opacity-50"
            disabled={!farmer}
            onClick={() => farmer && setKg(String(sampleReading(farmer, shift).kg))}
          >
            <Icon name="scale" size={16} /> Read scale · demo
          </button>
          <button
            type="button"
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-ok-tint px-3.5 text-[13px] font-medium text-ok disabled:opacity-50"
            disabled={!farmer}
            onClick={() => {
              if (!farmer) return;
              const r = sampleReading(farmer, shift);
              setFat(String(r.fat));
              setSnf(String(r.snf));
              setClrEdited(false);
            }}
          >
            <Icon name="flask" size={16} /> Read analyzer · demo
          </button>
        </div>
        <div className="flex items-center justify-between pt-1">
          <span className="text-[14px] text-muted">Amount from rate chart</span>
          <span className="font-mono text-[20px]">{complete ? inr(amount, 2) : '₹ —'}</span>
        </div>
        {belowMin && (
          <Alert tone="loss">
            <strong>Below the plant minimum.</strong> Fat must be at least {L.ds.settings.reject.minFat}% and SNF at least {L.ds.settings.reject.minSnf}%.
            Retest, or reject the milk.
          </Alert>
        )}
        {!belowMin && anomaly && (
          <Alert tone="loss">
            <strong>Check.</strong> {anomaly}
          </Alert>
        )}
        {error && (
          <p role="alert" className="text-[14px] text-loss-ink">
            {error}
          </p>
        )}
        <div className="flex gap-2.5">
          <button type="submit" className="min-h-[56px] flex-1 rounded-card bg-ink px-4 text-[17px] font-semibold text-paper disabled:opacity-60">
            {printOnSave ? 'Save and print slip' : 'Save slip'}
          </button>
          <button
            type="button"
            className="min-h-[56px] rounded-card border border-loss bg-white px-4 text-[15px] font-semibold text-loss"
            onClick={() => record('rejected')}
          >
            Reject
          </button>
        </div>
        <label className="flex items-center gap-2 text-[13px] text-muted">
          <input type="checkbox" checked={printOnSave} onChange={(e) => setPrintOnSave(e.target.checked)} className="h-4 w-4 accent-[#11201B]" />
          Print a slip for the farmer on save
        </label>
      </form>
      {saved && (
        <p className="mx-5 mt-3 text-[13px] text-ok" role="status">
          Saved {saved.status === 'rejected' ? 'as rejected' : inr(saved.amount, 2)} for {L.farmer.get(saved.farmerId)?.name} at {time(saved.ts)}. It is queued
          on this device and goes to the plant with the next sync.
        </p>
      )}
      <div className="mx-5 mb-1.5 mt-4">
        <SectionTitle aside={<span className="font-mono">{accepted.length} farmers · {num(shiftKg / L.ds.settings.density, 0)} L</span>}>
          {shift === 'AM' ? 'This morning' : 'This evening'}
        </SectionTitle>
      </div>
      <div className="mx-5 rounded-card border border-line bg-white py-2">
        {shiftSlips.length === 0 ? (
          <p className="px-4 py-3 text-[14px] text-muted">No slips yet this {shift === 'AM' ? 'morning' : 'evening'}.</p>
        ) : (
          <SlipTable L={L} slips={shiftSlips.slice(0, 12)} />
        )}
      </div>
      <PrintSlip slip={saved} centre={centre.name} />
    </main>
  );
}

function SlipTable({ L, slips }: { L: Ledger; slips: Slip[] }) {
  return (
    <DataTable
      caption="Slips"
      dense
      columns={[
        { key: 'n', label: 'FARMER' },
        { key: 'kg', label: 'KG', align: 'right' },
        { key: 'f', label: 'FAT', align: 'right', className: 'text-fat-text' },
        { key: 's', label: 'SNF', align: 'right', className: 'text-snf-text' },
      ]}
      rows={slips.map((s) => ({
        _key: s.id,
        _tone: s.status === 'rejected' ? 'loss' : undefined,
        n: (
          <span className="flex flex-col">
            <span>{L.farmer.get(s.farmerId)?.name ?? s.farmerId}</span>
            <span className="text-[11px] text-muted">
              {time(s.ts)}
              {s.status === 'rejected' && ' · rejected'}
              {s.origin === 'device' && s.syncState === 'queued' && ' · queued'}
            </span>
          </span>
        ),
        kg: num(s.kg, 1),
        f: num(s.fatPct, 1),
        s: num(s.snfPct, 1),
      }))}
    />
  );
}

/* ---------------- farmers ---------------- */

export function CentreFarmers() {
  const d = useCentre();
  const [q, setQ] = useState('');
  if (!d) return <Loading />;
  const { L, centre, farmers, all } = d;
  const today = L.ds.today;
  const byFarmer = new Map<string, Slip[]>();
  all.forEach((s) => byFarmer.set(s.farmerId, [...(byFarmer.get(s.farmerId) ?? []), s]));
  const needle = q.replace(/\D/g, '');
  const shown = farmers.filter((f) => !needle || f.id.includes(needle));
  return (
    <main className="flex flex-1 flex-col gap-3 pb-4">
      <CentreHeader title={<span lang="hi">किसान / Farmers</span>} />
      <label className="mx-5 flex flex-col gap-1 text-[12px] text-muted">
        Search by ID
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          inputMode="numeric"
          placeholder="0142"
          className="min-h-[44px] rounded-control border border-line-strong bg-white px-3 font-mono text-[18px] text-ink"
        />
      </label>
      <p className="mx-5 text-[13px] text-muted">
        {centre.name}: {farmers.length} registered farmers. Averages cover the last seven days.
      </p>
      <div className="mx-5 rounded-card border border-line bg-white py-2">
        <DataTable
          caption="Farmers"
          dense
          columns={[
            { key: 'n', label: 'FARMER' },
            { key: 't', label: 'TODAY' },
            { key: 'f', label: 'FAT', align: 'right', className: 'text-fat-text' },
            { key: 's', label: 'SNF', align: 'right', className: 'text-snf-text' },
            { key: 'q', label: 'SCORE', align: 'right' },
          ]}
          rows={shown.slice(0, 60).map((f) => {
            const slips = byFarmer.get(f.id) ?? [];
            const week = slips.filter((s) => s.status === 'accepted' && s.day > L.ds.days[L.ds.days.length - 8]);
            const kg = week.reduce((a, s) => a + s.kg, 0);
            const avg = (k: 'fatPct' | 'snfPct') => (kg ? week.reduce((a, s) => a + s.kg * s[k], 0) / kg : 0);
            const todays = slips.filter((s) => s.day === today);
            return {
              _key: f.id,
              n: f.name,
              t: todays.length ? todays.map((s) => (s.status === 'rejected' ? `${s.shift} ✕` : `${s.shift} ✓`)).join(' ') : '—',
              f: num(avg('fatPct'), 1),
              s: num(avg('snfPct'), 1),
              q: qualityScore(L, slips).score,
            };
          })}
        />
        {shown.length > 60 && <p className="px-3 pt-2 text-[12px] text-muted">Showing 60 of {shown.length}. Search to narrow.</p>}
      </div>
    </main>
  );
}

/* ---------------- dispatch ---------------- */

export function CentreDispatch() {
  const d = useCentre();
  const device = useDevice((s) => s.slips);
  const dispatches = useDevice((s) => s.dispatches);
  const addDispatch = useDevice((s) => s.addDispatch);
  if (!d) return <Loading />;
  const { L, centre } = d;
  const sent = new Set(dispatches.flatMap((x) => x.slipIds));
  const waiting = device.filter((s) => s.centreId === centre.id && s.status === 'accepted' && !sent.has(s.id));
  const w = {
    kg: waiting.reduce((a, s) => a + s.kg, 0),
    fat: waiting.reduce((a, s) => a + (s.kg * s.fatPct) / 100, 0),
    snf: waiting.reduce((a, s) => a + (s.kg * s.snfPct) / 100, 0),
  };
  const trips = L.ds.trips.filter((t) => t.centreId === centre.id).slice(-8).reverse();
  const avgShrink = (() => {
    const past = L.ds.trips.filter((t) => t.centreId === centre.id && t.day < L.ds.today);
    const s = past.reduce((a, t) => a + t.sent.kg, 0);
    return s ? 1 - past.reduce((a, t) => a + t.received.kg, 0) / s : 0;
  })();
  const mine = dispatches.filter((x) => x.centreId === centre.id).slice().reverse();
  return (
    <main className="flex flex-1 flex-col gap-3 pb-4">
      <CentreHeader title={<span lang="hi">डिस्पैच / Dispatch</span>} />
      <section className="mx-5 flex flex-col gap-3 rounded-tile border border-line bg-white p-[18px]" aria-label="Milk waiting at the centre">
        <div className="text-[12px] text-muted">Waiting at the centre, recorded on this device</div>
        <div className="grid grid-cols-3 gap-2 font-mono">
          <div>
            <div className="text-[11px] text-muted">KG</div>
            <div className="text-[22px]">{num(w.kg, 1)}</div>
          </div>
          <div>
            <div className="text-[11px] text-muted">FAT KG</div>
            <div className="text-[22px] text-fat-text">{num(w.fat, 2)}</div>
          </div>
          <div>
            <div className="text-[11px] text-muted">SNF KG</div>
            <div className="text-[22px] text-snf-text">{num(w.snf, 2)}</div>
          </div>
        </div>
        <button
          type="button"
          disabled={waiting.length === 0}
          className="min-h-[52px] rounded-card bg-ink px-4 text-[16px] font-semibold text-paper disabled:opacity-40"
          onClick={() =>
            addDispatch({
              id: `TR-${centre.id}-${mmdd(L.ds.today)}-D${Date.now().toString(36).toUpperCase()}`,
              centreId: centre.id,
              day: L.ds.today,
              shift: currentShift(),
              ts: nowLocal(),
              kg: w.kg,
              fatKg: w.fat,
              snfKg: w.snf,
              slipIds: waiting.map((s) => s.id),
              syncState: 'queued',
            })
          }
        >
          <span className="inline-flex items-center gap-2">
            <Icon name="truck" /> Send {waiting.length} slip{waiting.length === 1 ? '' : 's'} to the plant
          </span>
        </button>
        <p className="text-[12px] leading-snug text-muted">
          The plant weighs the truck on arrival. Any difference is booked as shrinkage against this trip, so it can be traced to a scale, a can or
          a driver.
        </p>
      </section>
      {mine.length > 0 && (
        <section className="mx-5 flex flex-col gap-2" aria-labelledby="mine-h">
          <SectionTitle id="mine-h">Sent from this device</SectionTitle>
          {mine.map((x) => (
            <div key={x.id} className="flex items-center justify-between rounded-card border border-line bg-white px-3.5 py-3 text-[14px]">
              <span>
                {time(x.ts)} · {x.slipIds.length} slips · <span className="font-mono">{num(x.kg, 1)} kg</span>
              </span>
              {x.syncState === 'queued' ? <Badge tone="queued">Queued</Badge> : <Badge tone="synced">In transit</Badge>}
            </div>
          ))}
        </section>
      )}
      <section className="mx-5 flex flex-col gap-2" aria-labelledby="trips-h">
        <SectionTitle id="trips-h" aside={`average shrinkage ${pct(avgShrink)}`}>
          Recent trips
        </SectionTitle>
        <div className="rounded-card border border-line bg-white py-2">
          <DataTable
            caption="Trips to the plant"
            dense
            columns={[
              { key: 'd', label: 'TRIP' },
              { key: 'sent', label: 'SENT KG', align: 'right' },
              { key: 'rec', label: 'RECD KG', align: 'right' },
              { key: 'sh', label: 'SHRINK', align: 'right' },
            ]}
            rows={trips.map((t) => {
              const sh = 1 - t.received.kg / t.sent.kg;
              return {
                _key: t.id,
                _tone: sh > 2 * avgShrink && sh > 0.005 ? 'loss' : undefined,
                d: `${dayDow(t.day)} ${t.shift}`,
                sent: num(t.sent.kg, 1),
                rec: num(t.received.kg, 1),
                sh: pct(sh),
              };
            })}
          />
        </div>
      </section>
    </main>
  );
}

/* ---------------- sync ---------------- */

export function CentreSync() {
  const online = useOnline();
  const s = useDevice();
  const L = useLedger();
  const queued = [
    ...s.slips
      .filter((x) => x.syncState === 'queued')
      .map((x) => ({ id: x.id, ts: x.ts, text: `Slip, Farmer ${x.farmerId.slice(1)}, ${num(x.kg, 1)} kg${x.status === 'rejected' ? ', rejected' : ''}` })),
    ...s.dispatches.filter((x) => x.syncState === 'queued').map((x) => ({ id: x.id, ts: x.ts, text: `Dispatch, ${x.slipIds.length} slips, ${num(x.kg, 1)} kg` })),
  ].sort((a, b) => b.ts.localeCompare(a.ts));
  const [flash, setFlash] = useState('');
  return (
    <main className="flex flex-1 flex-col gap-3 pb-4">
      <CentreHeader title={<span lang="hi">सिंक / Sync</span>} />
      <section className="mx-5 flex flex-col gap-3 rounded-tile border border-line bg-white p-[18px]" aria-label="Connection">
        <div className="flex items-center gap-3">
          <span className={clsx('inline-flex h-11 w-11 items-center justify-center rounded-full', online ? 'bg-ok-tint text-ok' : 'bg-paper-4 text-body')}>
            <Icon name={online ? 'online' : 'offline'} />
          </span>
          <div>
            <div className="text-[17px] font-semibold">{online ? 'Online' : 'Offline'}</div>
            <div className="text-[13px] text-muted">{s.lastSync ? `Last sync ${dayShort(s.lastSync.slice(0, 10))} at ${time(s.lastSync)}` : 'Not synced from this device yet'}</div>
          </div>
        </div>
        <label className="flex min-h-[44px] items-center justify-between gap-3 text-[15px]">
          Work offline (demo)
          <input
            type="checkbox"
            role="switch"
            checked={s.forcedOffline}
            onChange={(e) => s.setForcedOffline(e.target.checked)}
            className="h-6 w-6 accent-[#11201B]"
          />
        </label>
        <button
          type="button"
          className="btn-primary"
          disabled={!online || queued.length === 0}
          onClick={() => {
            const n = s.syncNow();
            setFlash(n ? `Sent ${n} ${n === 1 ? 'entry' : 'entries'} to the plant.` : '');
          }}
        >
          <Icon name="sync" /> Sync now
        </button>
        {flash && (
          <p role="status" className="text-[13px] text-ok">
            {flash}
          </p>
        )}
        {!isOnline(s.forcedOffline) && queued.length > 0 && (
          <p className="text-[13px] text-muted">Entries stay on this device and send themselves when the signal returns.</p>
        )}
      </section>
      <section className="mx-5 flex flex-col gap-2" aria-labelledby="queue-h">
        <SectionTitle id="queue-h" aside={`${queued.length} waiting`}>
          Queue
        </SectionTitle>
        <div className="rounded-card border border-line bg-white">
          {queued.length === 0 ? (
            <p className="px-4 py-3.5 text-[14px] text-muted">Nothing waiting. Everything recorded here has reached the plant.</p>
          ) : (
            <ul>
              {queued.map((x) => (
                <li key={x.id} className="flex items-center justify-between border-b border-paper-4 px-4 py-3 text-[14px] last:border-0">
                  <span>{x.text}</span>
                  <span className="font-mono text-[12px] text-muted">{time(x.ts)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
      <section className="mx-5 flex flex-col gap-2" aria-labelledby="dev-h">
        <SectionTitle id="dev-h">This device</SectionTitle>
        <label className="flex min-h-[44px] items-center justify-between gap-3 rounded-card border border-line bg-white px-4 py-2 text-[15px]">
          Collection centre
          <select value={s.centreId} onChange={(e) => s.setCentre(e.target.value)} className="min-h-[40px] rounded-control border border-line bg-white px-2 text-[15px]">
            {(L?.ds.centres ?? [{ id: 'A', name: 'Centre A' }]).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <p className="text-[13px] leading-snug text-muted">
          Slips are stored in this browser&apos;s IndexedDB, so they survive closing the app, a flat battery and a lost signal. Install the app from
          the browser menu to use it without an address bar.
        </p>
      </section>
    </main>
  );
}
