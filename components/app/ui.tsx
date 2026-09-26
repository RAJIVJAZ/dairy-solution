'use client';

import clsx from 'clsx';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from '@/components/brand';

export function Loading({ label = 'Loading the plant ledger' }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-3 p-5">
      <span className="sr-only">{label}</span>
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-24 animate-pulse rounded-card bg-paper-4" />
      ))}
    </div>
  );
}

export interface Tab {
  href: string;
  label: string;
  hi?: string;
}

/** Bottom navigation for the phone apps. Hindi first, English under it. */
export function TabBar({ tabs }: { tabs: Tab[] }) {
  const path = usePathname();
  const norm = (p: string) => (p.endsWith('/') ? p : `${p}/`);
  const active = (href: string) => norm(path) === href;
  return (
    <nav aria-label="App sections" className="sticky bottom-0 z-30 mt-auto border-t border-line bg-white pb-[env(safe-area-inset-bottom)]">
      <ul className="flex">
        {tabs.map((t) => (
          <li key={t.href} className="flex-1">
            <Link
              href={t.href}
              aria-current={active(t.href) ? 'page' : undefined}
              className={clsx(
                'flex min-h-[56px] flex-col items-center justify-center gap-0.5 text-center leading-tight',
                active(t.href) ? 'font-semibold text-ink' : 'text-muted',
              )}
            >
              {t.hi && <span className="text-[13px]">{t.hi}</span>}
              <span className={t.hi ? 'text-[11px]' : 'text-[12px]'}>{t.label}</span>
              <span aria-hidden="true" className={clsx('mt-1 h-0.5 w-6 rounded-full', active(t.href) ? 'bg-ink' : 'bg-transparent')} />
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** A phone-width column; on larger screens it sits centred on the paper ground. */
export function PhoneShell({ children, tabs }: { children: React.ReactNode; tabs: Tab[] }) {
  return (
    <div className="min-h-dvh bg-paper-3 sm:py-6">
      <div className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col bg-paper sm:min-h-[calc(100dvh-48px)] sm:overflow-hidden sm:rounded-[28px] sm:border sm:border-line sm:shadow-[0_24px_60px_-30px_rgba(17,32,27,0.35)]">
        <div className="flex items-center justify-between px-5 pt-3 text-[12px] text-muted">
          <Link href="/app/" className="inline-flex min-h-[32px] items-center gap-1 hover:text-ink">
            <Icon name="chevron" size={14} className="rotate-180" /> All apps
          </Link>
          <span>Sample plant</span>
        </div>
        {children}
        <TabBar tabs={tabs} />
      </div>
    </div>
  );
}

export function Kpi({
  label,
  value,
  note,
  edge,
  className,
  href,
}: {
  label: string;
  value: React.ReactNode;
  note?: React.ReactNode;
  edge?: 'fat' | 'snf' | 'cost' | 'loss' | 'ok' | 'neutral';
  className?: string;
  href?: string;
}) {
  const edges = { fat: 'border-t-fat', snf: 'border-t-snf', cost: 'border-t-cost', loss: 'border-t-loss', ok: 'border-t-ok', neutral: 'border-t-line-strong' };
  const body = (
    <>
      <div className="text-[12px] text-muted">{label}</div>
      <div className="font-display text-[26px] leading-tight sm:text-[30px]">{value}</div>
      {note && <div className="text-[12px] text-muted">{note}</div>}
    </>
  );
  const cls = clsx('block rounded-card border border-line bg-white p-3.5', edge && `border-t-[3px] ${edges[edge]}`, href && 'transition-colors hover:border-ink', className);
  return href ? (
    <Link href={href} className={cls}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

export function SectionTitle({ children, aside, id }: { children: React.ReactNode; aside?: React.ReactNode; id?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <h2 id={id} className="text-[16px] font-semibold">
        {children}
      </h2>
      {aside && <div className="text-[12px] text-muted">{aside}</div>}
    </div>
  );
}

export function Alert({ tone, children, className }: { tone: 'loss' | 'fat' | 'ok' | 'neutral'; children: React.ReactNode; className?: string }) {
  const tones = {
    loss: 'border-loss-edge bg-loss-tint text-loss-ink',
    fat: 'border-fat-edge bg-fat-tint text-fat-ink',
    ok: 'border-ok-edge bg-ok-tint text-ok',
    neutral: 'border-line bg-paper-4 text-body',
  };
  return <div className={clsx('rounded-[10px] border px-3.5 py-3 text-[14px] leading-[1.45]', tones[tone], className)}>{children}</div>;
}

/** Tabular numbers with units in the header, as the design system asks. */
export function DataTable({
  columns,
  rows,
  caption,
  className,
  dense,
}: {
  columns: Array<{ key: string; label: string; align?: 'right' | 'left'; className?: string }>;
  rows: Array<Record<string, React.ReactNode> & { _key: string; _tone?: 'loss' | 'fat' | 'ok'; _href?: string }>;
  caption?: string;
  className?: string;
  dense?: boolean;
}) {
  const tones = { loss: 'bg-loss-tint text-loss-ink', fat: 'bg-fat-tint text-fat-ink', ok: 'bg-ok-tint text-ok' };
  return (
    <div className={clsx('overflow-x-auto', className)}>
      <table className="w-full min-w-max border-collapse text-[14px]">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead>
          <tr className="font-mono text-[11px] tracking-[0.04em] text-muted">
            {columns.map((c) => (
              <th key={c.key} scope="col" className={clsx('whitespace-nowrap px-2.5 pb-2 font-normal', c.align === 'right' ? 'text-right' : 'text-left', c.className)}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r._key} className={clsx('border-t border-paper-4', r._tone && tones[r._tone])}>
              {columns.map((c) => (
                <td
                  key={c.key}
                  className={clsx(
                    'px-2.5',
                    dense ? 'py-2' : 'py-2.5',
                    c.align === 'right' ? 'text-right font-mono' : 'text-left',
                    c.className,
                  )}
                >
                  {r[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Bar({ share, tone }: { share: number; tone: 'fat' | 'snf' | 'cost' | 'butter' | 'neutral' | 'loss' }) {
  const colours = { fat: 'bg-fat', snf: 'bg-snf', cost: 'bg-cost', butter: 'bg-butter', neutral: 'bg-line-strong', loss: 'bg-loss' };
  const w = Math.max(0, Math.min(1, share));
  return (
    <div className="h-4 overflow-hidden rounded-[4px] bg-paper-track">
      <div className={clsx('h-4', colours[tone])} style={{ width: `max(${(w * 100).toFixed(2)}%, ${tone === 'loss' && w > 0 ? '3px' : '0px'})` }} />
    </div>
  );
}
