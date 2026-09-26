import type { Metadata } from 'next';
import { CentreFarmers } from '@/components/app/centre';

export const metadata: Metadata = { title: 'Centre farmers' };

export default function Page() {
  return <CentreFarmers />;
}
