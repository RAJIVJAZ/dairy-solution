import { PhoneShell } from '@/components/app/ui';

const TABS = [
  { href: '/app/centre/', label: 'Collect', hi: 'संग्रह' },
  { href: '/app/centre/farmers/', label: 'Farmers', hi: 'किसान' },
  { href: '/app/centre/dispatch/', label: 'Dispatch', hi: 'डिस्पैच' },
  { href: '/app/centre/sync/', label: 'Sync', hi: 'सिंक' },
];

export default function CentreLayout({ children }: { children: React.ReactNode }) {
  return <PhoneShell tabs={TABS}>{children}</PhoneShell>;
}
