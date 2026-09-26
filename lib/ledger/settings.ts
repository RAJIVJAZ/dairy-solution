import type { Settings } from './types';

/**
 * Sample settings for the demo plant. Every value here is a placeholder a
 * dairy replaces with its own: the rate chart, overheads, standards and prices
 * are illustrative, not market data.
 */
export const SAMPLE_SETTINGS: Settings = {
  density: 1.03,
  rate: { fatPerKg: 450, snfPerKg: 280 },
  incentive: { fatThreshold: 6.0, bonusPerLitre: 0.5 },
  reject: { minFat: 3.0, minSnf: 7.8 },
  overhead: {
    collectionPerKg: 0.8,
    transportPerKg: 0.5,
    separationPerKg: 0.2,
    churnPerKgCream: 3,
    clarifyPerKgButter: 10,
    gheePackPerKg: 14,
    khoyaPerKgMilk: 5,
    paneerPerKgMilk: 4,
  },
  standards: {
    creamFat: 0.4,
    skimFat: 0.0007,
    butterFat: 0.82,
    churnRecovery: 0.99,
    gheeFat: 0.996,
    gheeRecovery: 0.985,
    khoyaMoisture: 0.32,
    khoyaRecovery: 0.99,
    paneerMoisture: 0.55,
    paneerFatRetention: 0.9,
    paneerSnfRetention: 0.45,
    snfQuality: 8.5,
    refFat: 0.06,
    refSnf: 0.087,
  },
  prices: { ghee: 640, khoya: 300, paneer: 340, skim: 28 },
  shelfLifeDays: { ghee: 270, khoya: 5, paneer: 3 },
};

/** Two-axis rate chart: rupees for the fat and the SNF a slip contains. */
export function slipAmount(kg: number, fatPct: number, snfPct: number, s: Settings = SAMPLE_SETTINGS): number {
  const perKg = (fatPct / 100) * s.rate.fatPerKg + (snfPct / 100) * s.rate.snfPerKg;
  return Math.round(kg * perKg * 100) / 100;
}

/** Rupees per kilogram of milk at a given composition. */
export function ratePerKg(fatPct: number, snfPct: number, s: Settings = SAMPLE_SETTINGS): number {
  return (fatPct / 100) * s.rate.fatPerKg + (snfPct / 100) * s.rate.snfPerKg;
}

/**
 * Corrected lactometer reading implied by fat and SNF, from the Richmond
 * relation SNF = CLR/4 + 0.21 fat + 0.36. Centres use it as a cross-check on
 * the analyzer.
 */
export function clrFrom(fatPct: number, snfPct: number): number {
  return Math.round(4 * (snfPct - 0.21 * fatPct - 0.36) * 10) / 10;
}

export function isRejected(fatPct: number, snfPct: number, s: Settings = SAMPLE_SETTINGS): boolean {
  return fatPct < s.reject.minFat || snfPct < s.reject.minSnf;
}

/** Standard ghee yield: kg of ghee per kg of butter at standard butter fat. */
export function standardGheeYield(s: Settings = SAMPLE_SETTINGS): number {
  return (s.standards.butterFat * s.standards.gheeRecovery) / s.standards.gheeFat;
}

/** Standard khoya yield for milk of the given composition (fractions). */
export function khoyaYieldFor(fat: number, snf: number, s: Settings = SAMPLE_SETTINGS): number {
  return ((fat + snf) * s.standards.khoyaRecovery) / (1 - s.standards.khoyaMoisture);
}

/** Standard paneer yield for milk of the given composition (fractions). */
export function paneerYieldFor(fat: number, snf: number, s: Settings = SAMPLE_SETTINGS): number {
  return (fat * s.standards.paneerFatRetention + snf * s.standards.paneerSnfRetention) / (1 - s.standards.paneerMoisture);
}
