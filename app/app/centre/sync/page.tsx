import type { Metadata } from 'next';
import { CentreSync } from '@/components/app/centre';

export const metadata: Metadata = { title: 'Centre sync' };

export default function Page() {
  return <CentreSync />;
}
