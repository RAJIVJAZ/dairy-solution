import { PhoneShell } from '@/components/app/ui';

const TABS = [
  { href: '/app/farmer/', label: 'Today', hi: 'आज' },
  { href: '/app/farmer/ledger/', label: 'Ledger', hi: 'खाता' },
  { href: '/app/farmer/payments/', label: 'Payments', hi: 'भुगतान' },
  { href: '/app/farmer/quality/', label: 'Quality', hi: 'गुणवत्ता' },
];

export default function FarmerLayout({ children }: { children: React.ReactNode }) {
  return <PhoneShell tabs={TABS}>{children}</PhoneShell>;
}
