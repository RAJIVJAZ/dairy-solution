import type { Metadata } from 'next';
import { Suspense } from 'react';
import { LedgerExplorer } from '@/components/app/ledger-explorer';
import { Loading } from '@/components/app/ui';

export const metadata: Metadata = { title: 'Ledger explorer' };

export default function Page() {
  return (
    <Suspense fallback={<Loading label="Tracing the batch" />}>
      <LedgerExplorer />
    </Suspense>
  );
}
