import type { Metadata } from 'next';
import { FarmerLedger } from '@/components/app/farmer';

export const metadata: Metadata = { title: 'Farmer ledger' };

export default function Page() {
  return <FarmerLedger />;
}
