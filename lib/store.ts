'use client';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { DeviceSlip } from './ledger/engine';
import { idbStorage } from './idb';

export interface DeviceDispatch {
  id: string;
  centreId: string;
  day: string;
  shift: 'AM' | 'PM';
  ts: string;
  kg: number;
  fatKg: number;
  snfKg: number;
  slipIds: string[];
  syncState: 'queued' | 'synced';
}

export interface Task {
  id: string;
  kind: 'reorder' | 'service' | 'audit' | 'review' | 'hold' | 'recipe';
  ref: string;
  text: string;
  ts: string;
}

export interface RecallLog {
  lotId: string;
  ts: string;
  ms: number;
  dealers: number;
}

interface DeviceState {
  slips: DeviceSlip[];
  dispatches: DeviceDispatch[];
  approvals: Record<string, string>;
  tasks: Task[];
  recalls: RecallLog[];
  /** lets a demo user switch the centre app offline without killing the network */
  forcedOffline: boolean;
  lastSync: string | null;
  farmerId: string;
  centreId: string;
  hydrated: boolean;
  addSlip: (s: DeviceSlip) => void;
  addDispatch: (d: DeviceDispatch) => void;
  approve: (ids: string[]) => void;
  revoke: (id: string) => void;
  addTask: (t: Task) => void;
  logRecall: (r: RecallLog) => void;
  setForcedOffline: (v: boolean) => void;
  setFarmer: (id: string) => void;
  setCentre: (id: string) => void;
  /** pushes queued entries when the device is online; returns how many went */
  syncNow: () => number;
  reset: () => void;
}

export const nowLocal = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
};

export const isOnline = (forced: boolean) => !forced && (typeof navigator === 'undefined' || navigator.onLine);

const initial = {
  slips: [] as DeviceSlip[],
  dispatches: [] as DeviceDispatch[],
  approvals: {} as Record<string, string>,
  tasks: [] as Task[],
  recalls: [] as RecallLog[],
  forcedOffline: false,
  lastSync: null as string | null,
  farmerId: 'F0142',
  centreId: 'A',
};

export const useDevice = create<DeviceState>()(
  persist(
    (set, get) => ({
      ...initial,
      hydrated: false,
      addSlip: (s) => set({ slips: [...get().slips, s] }),
      addDispatch: (d) => set({ dispatches: [...get().dispatches, d] }),
      approve: (ids) => {
        const at = nowLocal();
        const next = { ...get().approvals };
        ids.forEach((id) => (next[id] = at));
        set({ approvals: next });
      },
      revoke: (id) => {
        const next = { ...get().approvals };
        delete next[id];
        set({ approvals: next });
      },
      addTask: (t) => set({ tasks: [...get().tasks.filter((x) => x.id !== t.id), t] }),
      logRecall: (r) => set({ recalls: [r, ...get().recalls].slice(0, 20) }),
      setForcedOffline: (v) => set({ forcedOffline: v }),
      setFarmer: (id) => set({ farmerId: id }),
      setCentre: (id) => set({ centreId: id }),
      syncNow: () => {
        const s = get();
        if (!isOnline(s.forcedOffline)) return 0;
        const queued = s.slips.filter((x) => x.syncState === 'queued').length + s.dispatches.filter((x) => x.syncState === 'queued').length;
        set({
          slips: s.slips.map((x) => (x.syncState === 'queued' ? { ...x, syncState: 'synced' } : x)),
          dispatches: s.dispatches.map((x) => (x.syncState === 'queued' ? { ...x, syncState: 'synced' } : x)),
          lastSync: nowLocal(),
        });
        return queued;
      },
      reset: () => set({ ...initial }),
    }),
    {
      name: 'dairyos-device',
      version: 1,
      storage: createJSONStorage(() => idbStorage),
      partialize: (s) => ({
        slips: s.slips,
        dispatches: s.dispatches,
        approvals: s.approvals,
        tasks: s.tasks,
        recalls: s.recalls,
        forcedOffline: s.forcedOffline,
        lastSync: s.lastSync,
        farmerId: s.farmerId,
        centreId: s.centreId,
      }),
      onRehydrateStorage: () => () => {
        useDevice.setState({ hydrated: true });
      },
    },
  ),
);

export const queuedCount = (s: Pick<DeviceState, 'slips' | 'dispatches'>) =>
  s.slips.filter((x) => x.syncState === 'queued').length + s.dispatches.filter((x) => x.syncState === 'queued').length;
