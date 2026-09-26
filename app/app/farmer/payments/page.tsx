import type { Metadata } from 'next';
import { FarmerPayments } from '@/components/app/farmer';

export const metadata: Metadata = { title: 'Farmer payments' };

export default function Page() {
  return <FarmerPayments />;
}
