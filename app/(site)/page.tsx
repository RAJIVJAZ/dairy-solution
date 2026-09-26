import Link from 'next/link';
import { Icon } from '@/components/brand';
import { BookingButton } from '@/components/site/Booking';
import { HeroLedger } from '@/components/site/HeroLedger';
import { LeakCalculator } from '@/components/site/LeakCalculator';
import { ScrollDesk } from '@/components/site/ScrollDesk';
import { AGENTS, APPS, FIXES, MODULES, PROBLEMS, STAGES } from '@/lib/content';
import { fourAnswers } from '@/lib/ledger/analytics';
import { buildLedger } from '@/lib/ledger/engine';
import { simulate } from '@/lib/ledger/simulate';
import { SITE } from '@/lib/site';

// The sample screen is the real CEO agent run over the sample plant, frozen
// at a fixed afternoon so the page is identical on every build.
const SAMPLE = fourAnswers(buildLedger(simulate(new Date(2026, 8, 26, 14, 0))));

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: SITE.name,
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web, Android, iOS',
  description: SITE.description,
};

export default function Home() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* HERO */}
      <section className="mx-auto grid max-w-shell gap-12 px-gutter pb-20 pt-12 sm:pt-16 lg:grid-cols-[minmax(0,620px)_minmax(0,1fr)] lg:gap-16 lg:pb-24 lg:pt-[88px]">
        <div className="flex flex-col gap-7">
          <div className="eyebrow">{SITE.tagline}</div>
          <h1 className="h-display text-[40px] leading-[1.04] tracking-[-0.025em] sm:text-[56px] xl:text-[68px]">
            Track every litre. Reconcile every solid. Run your entire dairy on one ledger.
          </h1>
          <p className="max-w-[560px] text-[18px] leading-[1.5] text-body sm:text-[20px]">{SITE.description}</p>
          <div className="mt-2 flex flex-wrap gap-3.5">
            <BookingButton className="btn-primary !min-h-[52px] !rounded-[10px] !px-[26px] !text-[16px]">Book a plant walkthrough</BookingButton>
            <a href="#ledger" className="btn-secondary !min-h-[52px] !rounded-[10px] !px-[26px] !text-[16px]">
              See the ledger in 90 seconds
            </a>
          </div>
          <ul className="mt-3 flex flex-wrap gap-x-7 gap-y-2 text-[14px] text-muted">
            <li>Works offline at village centres</li>
            <li>Hindi first</li>
            <li>Exports to Tally</li>
          </ul>
        </div>
        <div className="lg:pt-0">
          <HeroLedger />
        </div>
      </section>

      {/* PROBLEM */}
      <section aria-labelledby="problem-title" className="bg-paper-3">
        <div className="mx-auto max-w-shell px-gutter pt-16 sm:pt-[72px]">
          <div className="max-w-[820px]">
            <div className="eyebrow mb-3.5">The problem</div>
            <h2 id="problem-title" className="h-display text-[34px] leading-[1.08] sm:text-[46px]">
              Your plant makes money in solids and loses it in spreadsheets.
            </h2>
          </div>
        </div>
        <div className="mx-auto max-w-shell px-gutter">
          <ScrollDesk />
        </div>
        <div className="mx-auto grid max-w-shell gap-6 px-gutter pb-16 pt-6 sm:pb-[72px] lg:grid-cols-2 lg:gap-8">
          <div className="flex flex-col gap-[18px] rounded-tile border border-line-warm bg-paper p-6 sm:p-7">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[18px] font-semibold">Before</span>
              <span className="text-[13px] font-medium text-loss">Money leaks at every hand-off</span>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2">
              {PROBLEMS.map((p) => (
                <li key={p} className="flex items-start gap-2.5 text-[15px] leading-[1.35] text-body">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-[2px] bg-loss" aria-hidden="true" />
                  <span>{p}</span>
                </li>
              ))}
            </ul>
            <div className="mt-auto rounded-[10px] bg-loss-tint p-4 text-[14px] leading-[1.45] text-loss-ink">
              <strong>Illustrative leak.</strong> A plant taking in 10,000 litres a day that loses 0.5% between centre and plant, at ₹50
              a litre, loses about ₹9 lakh a year.{' '}
              <a href="#calculator" className="font-semibold underline underline-offset-2">
                Replace with your own numbers in the calculator.
              </a>
            </div>
          </div>
          <div className="flex flex-col gap-[18px] rounded-tile bg-ink p-6 text-cloud sm:p-7">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[18px] font-semibold">After</span>
              <span className="text-[13px] font-medium text-ok-glow">One record from slip to invoice</span>
            </div>
            <ul className="flex flex-col gap-2.5">
              {FIXES.map((f) => (
                <li key={f.left} className="flex flex-wrap justify-between gap-x-4 gap-y-1 rounded-control bg-ink-4 px-3.5 py-3 text-[15px]">
                  <span>{f.left}</span>
                  <span className="text-right text-ok-glow">{f.right}</span>
                </li>
              ))}
            </ul>
            <p className="mt-auto text-[14px] leading-[1.45] text-muted-dark">
              Every figure on the owner&apos;s screen opens to the farmers, tanks, batches and invoices behind it, in three clicks or fewer.
            </p>
          </div>
        </div>
      </section>

      {/* CALCULATOR */}
      <section id="calculator" aria-labelledby="calc-title" className="mx-auto max-w-shell px-gutter py-16 sm:py-[88px]">
        <div className="mb-9 max-w-[820px]">
          <div className="eyebrow mb-3.5">Your numbers</div>
          <h2 id="calc-title" className="h-display text-[34px] leading-[1.08] sm:text-[46px]">
            What does shrinkage cost your plant?
          </h2>
        </div>
        <LeakCalculator />
      </section>

      {/* LEDGER */}
      <section id="ledger" aria-labelledby="ledger-title" className="mx-auto flex max-w-shell flex-col gap-9 px-gutter pb-20 pt-4 sm:pb-24">
        <div className="max-w-[860px]">
          <div className="eyebrow mb-3.5">The Milk and Solids Ledger</div>
          <h2 id="ledger-title" className="h-display text-[34px] leading-[1.08] sm:text-[46px]">
            Every movement keeps its quantity, fat, SNF and cost.
          </h2>
          <p className="mt-4 text-[17px] leading-[1.5] text-body sm:text-[18px]">
            Like double-entry accounting for milk: nothing is created or destroyed without an entry, so a litre from a farmer can be
            followed to ghee, khoya, sweets, waste or rework.
          </p>
        </div>
        <ol className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:flex lg:gap-0">
          {STAGES.map((s, i) => (
            <li key={s.kind} className="flex items-center lg:flex-1">
              <div className="flex min-h-[132px] flex-1 flex-col gap-1.5 rounded-card border border-line bg-white px-3.5 py-4 lg:min-h-[150px]">
                <div className="label-mono">{s.kind}</div>
                <div className="text-[16px] font-semibold">{s.name}</div>
                <div className="mt-auto font-mono text-[12px] leading-normal text-body">{s.line}</div>
              </div>
              {i < STAGES.length - 1 && (
                <span aria-hidden="true" className="hidden w-[18px] text-center text-muted lg:block">
                  ›
                </span>
              )}
            </li>
          ))}
        </ol>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            { c: 'border-fat', t: 'Fat', d: 'Tracked to two decimals through every split' },
            { c: 'border-snf', t: 'SNF', d: 'Follows the milk into skim, khoya and whey' },
            { c: 'border-cost', t: 'Cost', d: 'Farmer rate, chilling, labour and packing per kilogram' },
            { c: 'border-loss', t: 'Loss', d: 'Every unexplained gram gets its own line' },
          ].map((q) => (
            <div key={q.t} className={`border-l-4 ${q.c} px-3.5 py-1.5`}>
              <div className="font-semibold">{q.t}</div>
              <div className="text-[14px] text-body">{q.d}</div>
            </div>
          ))}
        </div>
        <Link href="/app/ledger/" className="inline-flex items-center gap-2 self-start text-[15px] font-semibold underline-offset-4 hover:underline">
          Explore a real batch back to its farmers <Icon name="arrow" size={18} />
        </Link>
      </section>

      {/* MODULES */}
      <section id="modules" aria-labelledby="modules-title" className="bg-paper-2">
        <div className="mx-auto flex max-w-shell flex-col gap-9 px-gutter py-16 sm:py-[72px]">
          <h2 id="modules-title" className="h-display max-w-[860px] text-[34px] leading-[1.08] sm:text-[46px]">
            One spine, seven modules, none of them a generic ERP.
          </h2>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {MODULES.map((m) => (
              <li key={m.tag} className="flex min-h-[200px] flex-col gap-2.5 rounded-card border border-line bg-white p-5 lg:min-h-[224px]">
                <div className="label-mono">{m.tag}</div>
                <div className="text-[18px] font-semibold">{m.name}</div>
                <div className="text-[14px] leading-[1.45] text-body">{m.body}</div>
                <div className="mt-auto text-[13px] text-snf">{m.solves}</div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* AI */}
      <section id="ai" aria-labelledby="ai-title" className="bg-ink text-cloud">
        <div className="mx-auto grid max-w-shell gap-12 px-gutter py-16 sm:py-20 lg:grid-cols-[540px_minmax(0,1fr)] lg:gap-14">
          <div className="flex flex-col gap-[18px]">
            <div className="font-mono text-[13px] uppercase tracking-[0.08em] text-muted-dark">Five agents on one ledger</div>
            <h2 id="ai-title" className="h-display text-[34px] leading-[1.08] sm:text-[44px]">
              They recommend. You approve.
            </h2>
            <ul className="mt-2 flex flex-col">
              {AGENTS.map((a) => (
                <li key={a.name} className="flex flex-col gap-1 border-t border-ink-rule py-3 sm:flex-row sm:gap-3.5">
                  <div className="w-[130px] shrink-0 font-semibold">{a.name}</div>
                  <div className="text-[14px] leading-[1.45] text-muted-dark">{a.does}</div>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col gap-4 rounded-tile bg-paper p-5 text-ink sm:p-7">
            <div className="flex items-center justify-between">
              <span className="font-display text-[24px]">Today at Plant A</span>
              <span className="text-[12px] text-muted">Sample screen</span>
            </div>
            <div className="flex flex-col gap-3">
              <Answer label="WHAT HAPPENED">{SAMPLE.happened}</Answer>
              <Answer label="WHAT CHANGED">{SAMPLE.changed}</Answer>
              <Answer label="NEEDS ATTENTION" tone="loss">
                {SAMPLE.attention}
              </Answer>
              <Answer label="DO NEXT" tone="ok">
                {SAMPLE.next}
              </Answer>
            </div>
            <div className="mt-auto flex flex-wrap gap-2.5">
              <Link href="/app/executive/" className="btn-primary !min-h-[44px] !px-4 !text-[14px]">
                Approve actions
              </Link>
              <Link href="/app/executive/" className="btn-secondary !min-h-[44px] !px-4 !text-[14px]">
                Ask why
              </Link>
              <span className="self-center text-[13px] text-muted">Both open the live demo with its own numbers filled in.</span>
            </div>
          </div>
        </div>
      </section>

      {/* APPS + PRICING */}
      <section id="apps" aria-labelledby="apps-title" className="mx-auto flex max-w-shell flex-col gap-8 px-gutter py-16 sm:py-[72px]">
        <h2 id="apps-title" className="h-display max-w-[820px] text-[34px] leading-[1.08] sm:text-[44px]">
          A screen for everyone who touches the milk.
        </h2>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {APPS.map((a) => (
            <li key={a.name}>
              <Link href={a.href} className="group flex h-full flex-col gap-2 rounded-card border border-line bg-white p-5 transition-colors hover:border-ink">
                <div className="flex items-center justify-between text-[17px] font-semibold">
                  {a.name}
                  <Icon name="arrow" size={18} className="text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-ink" />
                </div>
                <div className="text-[14px] leading-[1.45] text-body">{a.body}</div>
              </Link>
            </li>
          ))}
        </ul>
        <div id="pricing" className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[15px] text-body">
          <span className="font-semibold text-ink">Plans</span>
          <span>Starter for collection and farmer billing</span>
          <span aria-hidden="true">·</span>
          <span>Growth for the full plant</span>
          <span aria-hidden="true">·</span>
          <span>Pro for multi-plant groups</span>
          <span aria-hidden="true">·</span>
          <span>{SITE.pricePerPlant} per plant per month</span>
        </div>
      </section>

      {/* CTA */}
      <section id="demo" aria-labelledby="demo-title" className="mx-auto max-w-shell px-gutter">
        <div className="flex flex-col items-start justify-between gap-8 rounded-[20px] bg-fat p-7 text-ink sm:p-14 lg:flex-row lg:items-center lg:gap-10">
          <div className="max-w-[700px]">
            <h2 id="demo-title" className="h-display text-[32px] leading-[1.08] sm:text-[44px]">
              Send us one week of slips. We will show you where the solids went.
            </h2>
            <p className="mt-3.5 text-[17px] leading-[1.5]">A 60-day pilot on one centre or one product line, set up by people who run a plant.</p>
          </div>
          <BookingButton className="btn-primary !min-h-[56px] !shrink-0 !rounded-[10px] !px-[30px] !text-[17px]">Book a plant walkthrough</BookingButton>
        </div>
      </section>
    </>
  );
}

function Answer({ label, tone, children }: { label: string; tone?: 'loss' | 'ok'; children: React.ReactNode }) {
  const box = tone === 'loss' ? 'border-loss-edge bg-loss-tint' : tone === 'ok' ? 'border-ok-edge bg-ok-tint' : 'border-line bg-white';
  const lab = tone === 'loss' ? 'text-loss-ink' : tone === 'ok' ? 'text-ok' : 'text-muted';
  return (
    <div className={`rounded-[10px] border px-4 py-3.5 ${box}`}>
      <div className={`mb-1 text-[12px] ${lab}`}>{label}</div>
      <div className="text-[15px] leading-[1.45]">{children}</div>
    </div>
  );
}
