'use client';

import clsx from 'clsx';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon, LogoMark } from '@/components/brand';

export const EXEC_NAV = [
  { href: '/app/executive/', label: 'Today' },
  { href: '/app/ledger/', label: 'Ledger' },
  { href: '/app/executive/collection/', label: 'Collection' },
  { href: '/app/executive/plant/', label: 'Plant' },
  { href: '/app/executive/manufacturing/', label: 'Manufacturing' },
  { href: '/app/executive/inventory/', label: 'Inventory' },
  { href: '/app/executive/sales/', label: 'Dispatch and sales' },
  { href: '/app/executive/finance/', label: 'Finance' },
  { href: '/app/executive/compliance/', label: 'Compliance' },
];

export function ExecShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const norm = path.endsWith('/') ? path : `${path}/`;
  return (
    <div className="flex min-h-dvh flex-col bg-paper lg:flex-row">
      <aside className="shrink-0 bg-ink text-cloud lg:sticky lg:top-0 lg:flex lg:h-dvh lg:w-[232px] lg:flex-col lg:gap-1.5 lg:px-4 lg:py-6">
        <div className="flex items-center justify-between px-4 py-3 lg:px-2.5 lg:pb-[18px] lg:pt-0">
          <Link href="/app/" className="inline-flex items-center gap-2.5 font-display text-[22px] font-semibold">
            <LogoMark size={26} inverse />
            DairyOS
          </Link>
          <span className="text-[12px] text-muted-dark lg:hidden">Executive</span>
        </div>
        <nav aria-label="Dashboard sections" className="overflow-x-auto lg:overflow-visible">
          <ul className="flex gap-1 px-3 pb-3 lg:flex-col lg:px-0 lg:pb-0">
            {EXEC_NAV.map((n) => {
              const active = norm === n.href;
              return (
                <li key={n.href} className="shrink-0">
                  <Link
                    href={n.href}
                    aria-current={active ? 'page' : undefined}
                    className={clsx(
                      'flex min-h-[44px] items-center whitespace-nowrap rounded-control px-3 text-[15px]',
                      active ? 'bg-ink-5 text-white' : 'text-muted-nav hover:bg-ink-4 hover:text-white',
                    )}
                  >
                    {n.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <Link href="/app/" className="mt-auto hidden items-center gap-1.5 px-3 text-[13px] text-muted-dark hover:text-white lg:inline-flex">
          <Icon name="chevron" size={14} className="rotate-180" /> All apps
        </Link>
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
