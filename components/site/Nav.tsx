'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Icon, Logo } from '@/components/brand';

const LINKS = [
  { href: '/#ledger', label: 'Ledger' },
  { href: '/#modules', label: 'Modules' },
  { href: '/#ai', label: 'AI agents' },
  { href: '/#apps', label: 'Apps' },
  { href: '/#pricing', label: 'Pricing' },
];

export function Nav() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const close = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [open]);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/90 backdrop-blur supports-[backdrop-filter]:bg-paper/80">
      <nav aria-label="Main" className="mx-auto flex h-[72px] max-w-shell items-center justify-between px-gutter">
        <Link href="/" aria-label="DairyOS home" className="shrink-0">
          <Logo />
        </Link>
        <div className="hidden gap-9 text-[15px] text-body lg:flex">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className="transition-colors hover:text-ink">
              {l.label}
            </a>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <Link href="/app/" className="hidden px-2 py-3 text-[15px] text-body hover:text-ink sm:inline">
            Sign in
          </Link>
          <a href="/#demo" className="btn-primary hidden !px-5 sm:inline-flex">
            Book a plant walkthrough
          </a>
          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-control border border-line lg:hidden"
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? 'Close menu' : 'Open menu'}
            onClick={() => setOpen((v) => !v)}
          >
            <Icon name={open ? 'close' : 'menu'} />
          </button>
        </div>
      </nav>
      {open && (
        <div id="mobile-menu" className="border-t border-line bg-paper px-gutter pb-6 pt-2 lg:hidden">
          <ul className="flex flex-col">
            {LINKS.map((l) => (
              <li key={l.href}>
                <a href={l.href} onClick={() => setOpen(false)} className="flex min-h-[48px] items-center border-b border-line text-[17px]">
                  {l.label}
                </a>
              </li>
            ))}
            <li>
              <Link href="/app/" className="flex min-h-[48px] items-center border-b border-line text-[17px]">
                Sign in
              </Link>
            </li>
          </ul>
          <a href="/#demo" onClick={() => setOpen(false)} className="btn-primary mt-5 w-full">
            Book a plant walkthrough
          </a>
        </div>
      )}
    </header>
  );
}
