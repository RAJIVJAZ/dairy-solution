'use client';

import { useEffect } from 'react';
import { queuedCount, useDevice } from '@/lib/store';

/**
 * Registers the service worker that keeps the app usable offline, and pushes
 * queued entries whenever the device comes back online.
 */
export function AppRuntime() {
  useEffect(() => {
    if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        /* the app still works online without it */
      });
    }
    const flush = () => {
      const s = useDevice.getState();
      if (queuedCount(s) > 0) s.syncNow();
    };
    window.addEventListener('online', flush);
    return () => window.removeEventListener('online', flush);
  }, []);
  return null;
}
