import type { Metadata } from 'next';
import { ExecToday } from '@/components/app/executive';

export const metadata: Metadata = { title: 'Executive dashboard' };

export default function Page() {
  return <ExecToday />;
}
