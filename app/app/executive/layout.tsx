import { ExecShell } from '@/components/app/ExecShell';

export default function ExecutiveLayout({ children }: { children: React.ReactNode }) {
  return <ExecShell>{children}</ExecShell>;
}
