import type { Metadata } from 'next';
import { CentreCollect } from '@/components/app/centre';

export const metadata: Metadata = { title: 'Collection centre' };

export default function Page() {
  return <CentreCollect />;
}
