import type { Metadata } from 'next';
import { FactoryProduction } from '@/components/app/factory';

export const metadata: Metadata = { title: 'Factory' };

export default function Page() {
  return <FactoryProduction />;
}
