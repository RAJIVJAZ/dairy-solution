import type { Metadata } from 'next';
import { FactoryStock } from '@/components/app/factory';

export const metadata: Metadata = { title: 'Factory stock' };

export default function Page() {
  return <FactoryStock />;
}
