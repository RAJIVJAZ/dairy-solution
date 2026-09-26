import type { Metadata } from 'next';
import { CentreDispatch } from '@/components/app/centre';

export const metadata: Metadata = { title: 'Centre dispatch' };

export default function Page() {
  return <CentreDispatch />;
}
