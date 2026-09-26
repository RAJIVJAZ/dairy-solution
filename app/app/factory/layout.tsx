import { PhoneShell } from '@/components/app/ui';

const TABS = [
  { href: '/app/factory/', label: 'Production' },
  { href: '/app/factory/quality/', label: 'Quality' },
  { href: '/app/factory/stock/', label: 'Stock' },
  { href: '/app/factory/maintenance/', label: 'Maintenance' },
];

export default function FactoryLayout({ children }: { children: React.ReactNode }) {
  return <PhoneShell tabs={TABS}>{children}</PhoneShell>;
}
