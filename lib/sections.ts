export const SECTIONS = {
  collection: 'Collection',
  plant: 'Plant',
  manufacturing: 'Manufacturing',
  inventory: 'Inventory',
  sales: 'Dispatch and sales',
  finance: 'Finance',
  compliance: 'Compliance',
} as const;

export type SectionKey = keyof typeof SECTIONS;
