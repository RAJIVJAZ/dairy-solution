/** Homepage copy, as written on the design board. */

export const PROBLEMS = [
  'Farmer payments calculated by hand',
  'Milk reception does not match centre slips',
  'No view of yield by shift or batch',
  'Khoya yield varies, recipe unchanged',
  'Sweet costing by rule of thumb',
  'Dealer credit limits not enforced',
  'Tally disconnected from the plant',
  'Cost per litre unknown',
  'Working capital squeezed',
  'Excel, WhatsApp and notebooks everywhere',
  'Fat and SNF losses not reconciled',
  'No cash flow visibility',
  'Profit by product unknown',
  'No alert when something drifts',
];

export const FIXES = [
  { left: 'Farmer payments', right: 'Auto-billed from FAT/SNF slips' },
  { left: 'Reception mismatch', right: 'Centre-to-plant variance per trip' },
  { left: 'Yield and cost', right: 'Per batch, per kilogram, same day' },
  { left: 'Dealer credit', right: 'Limits enforced at order entry' },
  { left: 'Tally', right: 'Daily export, no re-keying' },
  { left: 'Exceptions', right: 'Alerts before the month-end' },
];

export const STAGES = [
  { kind: 'COLLECT', name: 'Farmer milk', line: 'kg · fat · SNF · rate' },
  { kind: 'STORE', name: 'Raw milk tank', line: 'stock by tank and time' },
  { kind: 'SEPARATE', name: 'Cream and skim', line: 'fat split, loss line' },
  { kind: 'CHURN', name: 'Butter', line: 'yield vs standard' },
  { kind: 'CLARIFY', name: 'Ghee', line: 'batch cost per kg' },
  { kind: 'SELL', name: 'Finished goods', line: 'dealer, invoice, margin' },
];

export const MODULES = [
  { tag: '01', name: 'Milk collection', body: 'Offline collection with analyzer capture, rate charts, farmer ledger and payment files.', solves: 'Solves manual billing and fraud' },
  { tag: '02', name: 'Milk and Solids Ledger', body: 'The spine: quantity, fat, SNF and cost on every movement.', solves: 'Solves unreconciled losses' },
  { tag: '03', name: 'Plant operations', body: 'Reception, tanks, chilling, pasteurisation and cream separation logs.', solves: 'Solves reception mismatch' },
  { tag: '04', name: 'Manufacturing', body: 'Recipes, batch sheets, yield and live costing for ghee, khoya and sweets.', solves: 'Solves recipe dependency' },
  { tag: '05', name: 'Inventory', body: 'Raw, packaging and finished stock with FEFO, QR lots and reorder alerts.', solves: 'Solves stock-outs' },
  { tag: '06', name: 'Dispatch and sales', body: 'Orders, dealer credit, routes, delivery proof and dealer profitability.', solves: 'Solves receivables' },
  { tag: '07', name: 'Finance', body: 'Cash flow, cost per litre, product profit and Tally export.', solves: 'Solves profit blindness' },
  { tag: '08', name: 'Compliance', body: 'FSSAI records, batch traceability, mock recall and an audit room.', solves: 'Solves audit scramble' },
];

export const AGENTS = [
  { name: 'Procurement', does: 'Forecasts milk, raw material and packaging needs by week.' },
  { name: 'Production', does: 'Drafts schedules, batch plans, shift plans and yield forecasts.' },
  { name: 'Quality', does: 'Flags adulteration risk, yield anomalies and process drift.' },
  { name: 'Finance', does: 'Projects cash flow, working capital and profitability.' },
  { name: 'CEO', does: 'One screen: what happened, what changed, what needs attention, what to do.' },
];

export const APPS = [
  { name: 'Farmer app', body: 'Live milk records, FAT, SNF, payment status, quality score and incentives.', href: '/app/farmer/' },
  { name: 'Collection centre app', body: 'Offline-first. Works without internet and syncs later.', href: '/app/centre/' },
  { name: 'Factory app', body: 'Plant manager controls production, quality, inventory and maintenance.', href: '/app/factory/' },
  { name: 'Executive dashboard', body: 'The CEO agent and drill-down to any litre in three clicks.', href: '/app/executive/' },
];
