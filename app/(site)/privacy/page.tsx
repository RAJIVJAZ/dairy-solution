import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy',
  description: 'What this website and the DairyOS demo app store, and where.',
};

export default function Privacy() {
  return (
    <article className="mx-auto max-w-[760px] px-gutter py-12 text-[17px] leading-[1.6] text-body sm:py-[72px]">
      <div className="eyebrow">Privacy</div>
      <h1 className="h-display mt-2 text-[40px] leading-tight text-ink sm:text-[48px]">What we store, and where</h1>
      <p className="mt-6">
        This page describes what this website and the DairyOS demo app do with information. It covers the software as published here; a
        signed customer agreement governs a production deployment.
      </p>
      <h2 className="mt-10 text-[22px] font-semibold text-ink">The website</h2>
      <p className="mt-3">
        The site sets no cookies and runs no analytics or advertising scripts. Fonts are served from this site, not from a third party.
      </p>
      <p className="mt-3">
        When you request a plant walkthrough, the details you type (name, phone, dairy, city, daily volume, products and your note) are
        sent only to the DairyOS team, either to our booking inbox or by opening an email in your own email app. We use them to arrange
        the visit and nothing else.
      </p>
      <h2 className="mt-10 text-[22px] font-semibold text-ink">The demo app</h2>
      <p className="mt-3">
        The app at /app runs on a simulated plant. Anything you enter there, such as collection slips, approvals and tasks, is stored in
        your browser&apos;s own storage (IndexedDB) on this device, so it keeps working offline. It is not sent to a server. Clear it any
        time with &ldquo;Reset demo data&rdquo; on the app&apos;s start screen, or by clearing this site&apos;s data in your browser.
      </p>
    </article>
  );
}
