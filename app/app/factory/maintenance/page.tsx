import type { Metadata } from 'next';
import { FactoryMaintenance } from '@/components/app/factory';

export const metadata: Metadata = { title: 'Factory maintenance' };

export default function Page() {
  return <FactoryMaintenance />;
}
