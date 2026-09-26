import type { StateStorage } from 'zustand/middleware';

/**
 * A minimal IndexedDB key-value store. Field devices at village centres lose
 * connectivity for hours, and IndexedDB survives reloads, low memory and the
 * browser being killed, which localStorage does not guarantee as well.
 */
const DB = 'dairyos';
const STORE = 'kv';

let dbPromise: Promise<IDBDatabase> | null = null;

function open(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return open().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const req = fn(tx.objectStore(STORE));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      }),
  );
}

const memory = new Map<string, string>();
const hasIdb = () => typeof indexedDB !== 'undefined';

export const idbStorage: StateStorage = {
  getItem: async (name) => {
    if (!hasIdb()) return memory.get(name) ?? null;
    try {
      return ((await run('readonly', (s) => s.get(name))) as string | undefined) ?? null;
    } catch {
      return memory.get(name) ?? null;
    }
  },
  setItem: async (name, value) => {
    memory.set(name, value);
    if (!hasIdb()) return;
    try {
      await run('readwrite', (s) => s.put(value, name));
    } catch {
      /* private mode or blocked storage: keep the in-memory copy */
    }
  },
  removeItem: async (name) => {
    memory.delete(name);
    if (!hasIdb()) return;
    try {
      await run('readwrite', (s) => s.delete(name));
    } catch {
      /* ignore */
    }
  },
};
