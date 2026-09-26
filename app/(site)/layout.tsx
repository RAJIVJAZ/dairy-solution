import Link from 'next/link';
import { Logo } from '@/components/brand';
import { Nav } from '@/components/site/Nav';
import { SITE } from '@/lib/site';

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-control focus:bg-ink focus:px-4 focus:py-3 focus:text-paper">
        Skip to content
      </a>
      <Nav />
      <main id="main">{children}</main>
      <footer className="mx-auto flex max-w-shell flex-col justify-between gap-10 px-gutter pb-10 pt-14 text-[14px] text-muted sm:flex-row sm:items-start">
        <div className="flex flex-col gap-2">
          <Logo />
          <span>{SITE.base}</span>
        </div>
        <div className="flex gap-16">
          <div className="flex flex-col gap-2">
            <span className="font-semibold text-ink">Product</span>
            <Link href="/#ledger" className="py-1 hover:text-ink">Ledger</Link>
            <Link href="/#modules" className="py-1 hover:text-ink">Modules</Link>
            <Link href="/#ai" className="py-1 hover:text-ink">AI agents</Link>
            <Link href="/app/" className="py-1 hover:text-ink">Open the app</Link>
          </div>
          <div className="flex flex-col gap-2">
            <span className="font-semibold text-ink">Company</span>
            <Link href="/#demo" className="py-1 hover:text-ink">Contact</Link>
            <Link href="/design-system/" className="py-1 hover:text-ink">Design system</Link>
            <Link href="/privacy/" className="py-1 hover:text-ink">Privacy</Link>
          </div>
        </div>
      </footer>
    </>
  );
}
