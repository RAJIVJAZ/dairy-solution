import { ExecShell } from '@/components/app/ExecShell';

export default function LedgerLayout({ children }: { children: React.ReactNode }) {
  return <ExecShell>{children}</ExecShell>;
}
