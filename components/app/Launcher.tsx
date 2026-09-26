'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Icon, Logo } from '@/components/brand';
import { useDevice } from '@/lib/store';

const APPS = [
  { href: '/app/farmer/', title: 'Farmer', hi: 'किसान', icon: 'drop', body: 'Today’s slip, fat and SNF, payments, quality score and incentive.', form: 'Phone' },
  { href: '/app/centre/', title: 'Collection centre', hi: 'संग्रह केंद्र', icon: 'scale', body: 'Record slips with or without internet, print them, sync later.', form: 'Phone, works offline' },
  { href: '/app/factory/', title: 'Factory', hi: 'प्लांट', icon: 'tank', body: 'Live batches, yield, stock and maintenance for the plant manager.', form: 'Phone or tablet' },
  { href: '/app/executive/', title: 'Executive dashboard', icon: 'batch', body: 'The CEO agent’s four answers, and every figure behind them.', form: 'Desktop' },
  { href: '/app/ledger/', title: 'Ledger explorer', icon: 'recall', body: 'Follow any batch back to its farmers and forward to its dealers.', form: 'Desktop' },
] as const;

interface InstallPrompt extends Event {
  prompt: () => Promise<void>;
}

export function Launcher() {
  const reset = useDevice((s) => s.reset);
  const entries = useDevice((s) => s.slips.length + Object.keys(s.approvals).length + s.tasks.length);
  const [install, setInstall] = useState<InstallPrompt | null>(null);
  const [cleared, setCleared] = useState(false);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstall(e as InstallPrompt);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  return (
    <div className="min-h-dvh bg-paper">
      <header className="mx-auto flex h-[72px] max-w-[1120px] items-center justify-between px-5 sm:px-8">
        <Link href="/" aria-label="DairyOS website">
          <Logo />
        </Link>
        <Link href="/" className="text-[14px] text-body hover:text-ink">
          Website
        </Link>
      </header>
      <main className="mx-auto max-w-[1120px] px-5 pb-16 pt-6 sm:px-8 sm:pt-10">
        <div className="eyebrow">Sample plant · live demo</div>
        <h1 className="h-display mt-2 text-[38px] leading-tight sm:text-[52px]">Open DairyOS as</h1>
        <p className="mt-3 max-w-[720px] text-[16px] leading-[1.55] text-body sm:text-[17px]">
          Every screen runs on one simulated plant: three village collection centres and 312 farmers, four weeks of slips, trucks, batches and
          invoices ending today. Every figure is computed from its ledger entries. Anything you enter stays on this device.
        </p>
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {APPS.map((a) => (
            <li key={a.href}>
              <Link href={a.href} className="group flex h-full flex-col gap-3 rounded-tile border border-line bg-white p-5 transition-colors hover:border-ink">
                <div className="flex items-center justify-between">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-card bg-paper-4">
                    <Icon name={a.icon} size={22} />
                  </span>
                  <span className="text-[12px] text-muted">{a.form}</span>
                </div>
                <div>
                  <div className="text-[19px] font-semibold">
                    {'hi' in a && <span className="mr-2">{a.hi}</span>}
                    <span className={'hi' in a ? 'text-body' : ''}>{'hi' in a ? `/ ${a.title}` : a.title}</span>
                  </div>
                  <p className="mt-1 text-[14px] leading-[1.45] text-body">{a.body}</p>
                </div>
                <span className="mt-auto inline-flex items-center gap-1.5 text-[14px] font-semibold">
                  Open <Icon name="arrow" size={16} className="transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <div className="mt-10 flex flex-wrap items-center gap-3">
          {install && (
            <button
              type="button"
              className="btn-primary"
              onClick={async () => {
                await install.prompt();
                setInstall(null);
              }}
            >
              Install the app on this device
            </button>
          )}
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              reset();
              setCleared(true);
            }}
          >
            Reset demo data
          </button>
          <span className="text-[13px] text-muted" aria-live="polite">
            {cleared ? 'Cleared. The sample plant is back to its starting state.' : entries ? `${entries} entries made on this device.` : 'Nothing entered on this device yet.'}
          </span>
        </div>
      </main>
    </div>
  );
}
