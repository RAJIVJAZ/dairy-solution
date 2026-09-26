import type { Metadata } from 'next';
import { FarmerToday } from '@/components/app/farmer';

export const metadata: Metadata = { title: 'Farmer' };

export default function Page() {
  return <FarmerToday />;
}
