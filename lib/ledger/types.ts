/**
 * The Milk and Solids Ledger.
 *
 * Every physical movement of milk or a milk product is one entry that carries
 * four quantities: kilograms, kilograms of fat, kilograms of SNF and rupees of
 * cost. Entries move quantity from one node to another, so nothing is created
 * or destroyed without a line, in the same way double-entry bookkeeping treats
 * money.
 *
 * Nodes are either lots (a physical, traceable quantity: a centre's shift
 * collection, a tank, a cream lot, a ghee batch) or accounts outside the plant
 * (farmers, dealers, loss and by-product sinks, overhead sources). Account ids
 * contain a colon ("farmer:F0142", "loss:unexplained"); lot ids never do.
 */

export interface Qty {
  kg: number;
  /** kilograms of fat */
  fat: number;
  /** kilograms of solids-not-fat */
  snf: number;
  /** rupees */
  cost: number;
}

export const ZERO: Qty = Object.freeze({ kg: 0, fat: 0, snf: 0, cost: 0 });

export type Step =
  | 'collect'
  | 'trip'
  | 'separate'
  | 'churn'
  | 'clarify'
  | 'khoya'
  | 'paneer'
  | 'sell'
  | 'overhead';

export interface Movement {
  id: string;
  /** local ISO timestamp without zone, e.g. 2026-09-26T06:40:00 */
  ts: string;
  /** every entry of one process step shares a group id */
  group: string;
  step: Step;
  from: string;
  to: string;
  qty: Qty;
  memo: string;
  /** slip, trip or invoice id behind the entry */
  ref?: string;
}

export type LotKind = 'centre' | 'tank' | 'cream' | 'skim' | 'butter' | 'ghee' | 'khoya' | 'paneer';

export interface Lot {
  id: string;
  kind: LotKind;
  label: string;
  day: string;
  ts: string;
  /** where the lot physically sits */
  place: string;
  /** use-by date for finished goods */
  expires?: string;
}

export type Shift = 'AM' | 'PM';

export interface Centre {
  id: string;
  name: string;
  /** days since the centre scale was last calibrated, at the simulation anchor */
  scaleCalibratedDaysAgo: number;
}

export interface Farmer {
  id: string;
  name: string;
  centreId: string;
  /** usual fat and SNF percent, used for anomaly checks */
  baseFat: number;
  baseSnf: number;
}

export interface Slip {
  id: string;
  farmerId: string;
  centreId: string;
  day: string;
  shift: Shift;
  ts: string;
  kg: number;
  clr: number;
  fatPct: number;
  snfPct: number;
  /** rupees, from the rate chart; 0 when rejected */
  amount: number;
  status: 'accepted' | 'rejected';
  /** slips recorded on this device carry their sync state */
  origin?: 'seed' | 'device';
  syncState?: 'queued' | 'synced';
}

export interface Trip {
  id: string;
  centreId: string;
  day: string;
  shift: Shift;
  lotId: string;
  sentTs: string;
  receivedTs: string;
  sent: Qty;
  received: Qty;
  tankLot: string;
}

export type Product = 'ghee' | 'khoya' | 'paneer' | 'skim';

export interface Batch {
  id: string;
  kind: 'separation' | 'churn' | 'ghee' | 'khoya' | 'paneer';
  label: string;
  day: string;
  start: string;
  end: string;
  group: string;
  inputLots: string[];
  outputLot?: string;
  /** product kg per kg of input */
  yieldActual?: number;
  yieldStandard?: number;
}

export interface Dealer {
  id: string;
  name: string;
  route: string;
  creditLimit: number;
  kind: 'dealer' | 'bulk';
}

export interface InvoiceLine {
  lotId: string;
  product: Product;
  kg: number;
  rate: number;
  amount: number;
}

export interface Invoice {
  id: string;
  dealerId: string;
  day: string;
  ts: string;
  lines: InvoiceLine[];
  total: number;
  /** dispatched invoices have moved stock; pending ones are today's open orders */
  status: 'dispatched' | 'pending';
}

export interface DealerPayment {
  id: string;
  dealerId: string;
  day: string;
  amount: number;
}

export interface PackItem {
  id: string;
  name: string;
  unit: string;
  stock: number;
  dailyUse: number;
  leadDays: number;
}

export interface Equipment {
  id: string;
  name: string;
  place: string;
  lastServiced: string;
  intervalDays: number;
}

export interface CentreSync {
  centreId: string;
  lastSync: string;
}

export interface Settings {
  /** kilograms per litre of raw milk */
  density: number;
  rate: { fatPerKg: number; snfPerKg: number };
  incentive: { fatThreshold: number; bonusPerLitre: number };
  reject: { minFat: number; minSnf: number };
  overhead: {
    collectionPerKg: number;
    transportPerKg: number;
    separationPerKg: number;
    churnPerKgCream: number;
    clarifyPerKgButter: number;
    gheePackPerKg: number;
    khoyaPerKgMilk: number;
    paneerPerKgMilk: number;
  };
  standards: {
    creamFat: number;
    skimFat: number;
    butterFat: number;
    churnRecovery: number;
    gheeFat: number;
    gheeRecovery: number;
    khoyaMoisture: number;
    khoyaRecovery: number;
    paneerMoisture: number;
    paneerFatRetention: number;
    paneerSnfRetention: number;
    /** SNF percent below which a slip counts against quality */
    snfQuality: number;
    /** reference milk the plant's yield standards are quoted against (fractions) */
    refFat: number;
    refSnf: number;
  };
  prices: Record<Product, number>;
  shelfLifeDays: Record<'ghee' | 'khoya' | 'paneer', number>;
}

export interface Dataset {
  anchor: string;
  today: string;
  days: string[];
  settings: Settings;
  plant: string;
  centres: Centre[];
  farmers: Farmer[];
  dealers: Dealer[];
  slips: Slip[];
  trips: Trip[];
  lots: Record<string, Lot>;
  movements: Movement[];
  batches: Batch[];
  invoices: Invoice[];
  payments: DealerPayment[];
  packaging: PackItem[];
  equipment: Equipment[];
  sync: CentreSync[];
}
