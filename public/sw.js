/*
 * DairyOS service worker: keeps the app usable at village centres with no
 * signal. Pages are fetched network-first and fall back to the cached copy;
 * hashed build assets never change, so they are served from cache first.
 * On install it caches every app screen plus the scripts, styles and fonts
 * those screens reference, so a device that opened the app once can work
 * offline from then on.
 */
const VERSION = 'dairyos-v1';
const PAGES = [
  '/',
  '/app/',
  '/app/farmer/',
  '/app/farmer/ledger/',
  '/app/farmer/payments/',
  '/app/farmer/quality/',
  '/app/centre/',
  '/app/centre/farmers/',
  '/app/centre/dispatch/',
  '/app/centre/sync/',
  '/app/factory/',
  '/app/factory/quality/',
  '/app/factory/stock/',
  '/app/factory/maintenance/',
  '/app/executive/',
  '/app/ledger/',
];
const EXTRA = ['/manifest.webmanifest', '/icon.svg', '/icon-192.png', '/icon-512.png'];

async function precache() {
  const cache = await caches.open(VERSION);
  const assets = new Set(EXTRA);
  await Promise.all(
    PAGES.map(async (page) => {
      try {
        const res = await fetch(page, { cache: 'no-cache' });
        if (!res.ok) return;
        await cache.put(page, res.clone());
        const html = await res.text();
        for (const m of html.matchAll(/\/_next\/static\/[^"'\s)\\]+/g)) assets.add(m[0]);
        // The router fetches each page's payload on client-side navigation.
        const payload = `${page}index.txt`;
        const p = await fetch(payload).catch(() => null);
        if (p && p.ok) await cache.put(payload, p);
      } catch (e) {
        /* offline during install: runtime caching fills the gaps later */
      }
    }),
  );
  const css = [...assets].filter((a) => a.endsWith('.css'));
  await Promise.all(
    css.map(async (href) => {
      try {
        const text = await (await fetch(href)).text();
        for (const m of text.matchAll(/\/_next\/static\/media\/[^"')\s]+/g)) assets.add(m[0]);
      } catch (e) {
        /* ignore */
      }
    }),
  );
  await Promise.all([...assets].map((a) => cache.add(a).catch(() => undefined)));
}

self.addEventListener('install', (event) => {
  event.waitUntil(precache().then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(url.pathname, copy));
          return res;
        })
        .catch(async () => (await caches.match(url.pathname)) || (await caches.match('/app/')) || Response.error()),
    );
    return;
  }

  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            const copy = res.clone();
            caches.open(VERSION).then((c) => c.put(req, copy));
            return res;
          }),
      ),
    );
    return;
  }

  // Everything else (payloads, icons, manifest): cached copy now, refresh behind it.
  event.respondWith(
    caches.match(req, { ignoreSearch: url.pathname.endsWith('.txt') }).then((hit) => {
      const net = fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(VERSION).then((c) => c.put(url.pathname.endsWith('.txt') ? url.pathname : req, copy));
          }
          return res;
        })
        .catch(() => hit || Response.error());
      return hit || net;
    }),
  );
});
