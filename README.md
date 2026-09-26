# DairyOS

**Track every litre. Reconcile every solid. Run your entire dairy on one ledger.**

This repository holds two things built from the DairyOS design board:

- **The website** at `/`: homepage, brand and design system page, privacy page.
- **The app** at `/app`: an installable, offline-first web app with five surfaces (Farmer, Collection centre, Factory, Executive dashboard, Ledger explorer).

Both run on one Milk and Solids Ledger engine. The app ships with a simulated sample plant, so every screen works on first open.

## Quick start

```bash
npm install
npm run dev        # http://localhost:3000 (website) and /app (the app)
```

```bash
npm test           # ledger engine tests (mass balance, traceability, sync)
npm run typecheck
npm run lint
npm run build      # static export to out/
npm start          # serves out/ locally
```

Node 20 or newer. No environment variables are needed to run it.

## What is where

| Path | What it is |
|---|---|
| `lib/ledger/` | The ledger engine: types, the sample-plant simulator, mass-balance checks, genealogy and recall, and the analytics every screen reads |
| `lib/store.ts`, `lib/idb.ts` | Device state (slips recorded at a centre, approvals, tasks), kept in IndexedDB so it survives reloads and lost signal |
| `app/(site)/` | Website routes |
| `app/app/` | App routes |
| `components/site/` | Website pieces: animated hero ledger, scroll story, leak calculator, booking dialog |
| `components/app/` | App screens |
| `public/sw.js` | Service worker: caches every app screen and its assets on first visit so the app opens offline |

## The ledger

Every movement of milk or product is one entry carrying **kilograms, kilograms of fat, kilograms of SNF and rupees of cost**. An entry moves quantity from one node to another (a farmer to a centre's shift lot, a tank to cream and skim, butter to a ghee batch, a lot to a dealer). Nothing is created or destroyed without an entry, so:

- each process step balances: input equals outputs plus losses, and whatever the scales and analyzer cannot account for is booked on an **unexplained loss** line;
- any batch can be traced back to the farmers and forward to the dealers and invoices (`traceBack`, `mockRecall`);
- cost follows each kilogram; at a split it is shared by the value of the solids each output carries.

`lib/ledger/ledger.test.ts` checks these properties on the whole sample plant: every step closes, fat is conserved end to end, no lot goes negative and nothing leaves a lot before it arrived.

## The sample plant

One plant, three village collection centres and 312 farmers, simulated for the four weeks ending on the viewer's today. It is deterministic, so every device sees the same plant. The rate chart, overheads, yield standards, selling prices and shelf lives are **sample settings** in `lib/ledger/settings.ts`, not market data. Replace them with a real plant's figures.

## Offline and sync

The collection centre app writes each slip to IndexedDB first. Queued slips appear on the centre's own screen; only synced ones reach the plant ledger, the farmer app and the dashboards, as they would with a real server. The Sync tab has a "Work offline" switch to demonstrate this without cutting the network. In this build the "server" is the in-browser ledger; `useDevice.syncNow` in `lib/store.ts` is where a real API call goes.

The scale and analyzer buttons fill simulated readings and are labelled "demo".

## Configuration

Set these at build time (see `.env.example`):

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | Canonical site URL for metadata and the sitemap |
| `NEXT_PUBLIC_BOOKING_ENDPOINT` | A URL that accepts the walkthrough form as JSON (POST) |
| `NEXT_PUBLIC_BOOKING_EMAIL` | Fallback: the form opens an email to this address |

With neither booking setting, the form says bookings are not connected rather than pretending to send.

## Placeholders to fill

- `lib/site.ts`: `pricePerPlant` still reads `[YOUR PRICE]`.
- `app/(site)/privacy/page.tsx`: review the wording against how you will actually handle booking requests.

## Deploying

Every push to `main` runs `.github/workflows/deploy.yml`, which tests, builds with `NEXT_PUBLIC_BASE_PATH=/dairy-solution` and publishes `out/` to the `gh-pages` branch for GitHub Pages.

`npm run build` writes a fully static site to `out/`. At a domain root, leave `NEXT_PUBLIC_BASE_PATH` unset. Any static host works (Vercel, Netlify, Cloudflare Pages, GitHub Pages, S3). Serve it over HTTPS so the service worker registers and the app can be installed.
