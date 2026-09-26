'use client';

import { useEffect, useMemo, useState } from 'react';
import { buildLedger, withDeviceSlips, type Ledger } from './ledger/engine';
import { simulate } from './ledger/simulate';
import type { Dataset } from './ledger/types';
import { dayKey } from './ledger/util';
import { useDevice } from './store';

/*
 * The sample plant is generated in the browser, never at build time, so its
 * "today" is always the viewer's today. One copy is kept per page load and
 * shared by every screen.
 */
let cached: { day: string; ds: Dataset } | null = null;

function sampleForToday(): Dataset {
  const now = new Date();
  const day = dayKey(now);
  if (!cached || cached.day !== day) cached = { day, ds: simulate(now) };
  return cached.ds;
}

export function useLedger(): Ledger | null {
  const slips = useDevice((s) => s.slips);
  const [base, setBase] = useState<Dataset | null>(() => (cached && cached.day === dayKey(new Date()) ? cached.ds : null));
  useEffect(() => {
    if (!base) {
      // Let the skeleton paint before the simulation runs.
      const id = window.setTimeout(() => setBase(sampleForToday()), 0);
      return () => window.clearTimeout(id);
    }
  }, [base]);
  return useMemo(() => (base ? buildLedger(withDeviceSlips(base, slips)) : null), [base, slips]);
}
