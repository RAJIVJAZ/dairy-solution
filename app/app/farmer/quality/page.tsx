import type { Metadata } from 'next';
import { FarmerQuality } from '@/components/app/farmer';

export const metadata: Metadata = { title: 'Farmer quality' };

export default function Page() {
  return <FarmerQuality />;
}
