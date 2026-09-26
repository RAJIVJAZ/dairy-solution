import type { Metadata } from 'next';
import { FactoryQuality } from '@/components/app/factory';

export const metadata: Metadata = { title: 'Factory quality' };

export default function Page() {
  return <FactoryQuality />;
}
