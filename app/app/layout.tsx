import type { Metadata } from 'next';
import { AppRuntime } from '@/components/app/AppRuntime';

export const metadata: Metadata = {
  title: { default: 'App', template: '%s | DairyOS app' },
  robots: { index: false },
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AppRuntime />
      {children}
    </>
  );
}
