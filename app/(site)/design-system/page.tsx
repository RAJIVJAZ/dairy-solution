import type { Metadata } from 'next';
import { Badge, Icon } from '@/components/brand';

export const metadata: Metadata = {
  title: 'Brand and design system',
  description: 'Logo, colour, type, components and rules behind every DairyOS screen.',
};

const COLOURS = [
  { name: 'Ink', hex: '#11201B', use: 'Text, primary buttons' },
  { name: 'Paper', hex: '#F6F3EC', use: 'Page ground' },
  { name: 'Fat', hex: '#C9821A', use: 'Fat quantities' },
  { name: 'SNF', hex: '#2A7A73', use: 'SNF quantities' },
  { name: 'Cost', hex: '#23446B', use: 'Rupees and cost' },
  { name: 'Loss', hex: '#B4432A', use: 'Loss, variance, alerts' },
  { name: 'Balanced', hex: '#1F5A38', use: 'Reconciled, healthy' },
];

const ICONS = [
  ['drop', 'Milk drop'],
  ['tank', 'Tank'],
  ['batch', 'Batch'],
  ['truck', 'Truck'],
  ['recall', 'Recall'],
  ['offline', 'Offline'],
] as const;

export default function DesignSystem() {
  return (
    <div className="mx-auto flex max-w-shell flex-col gap-16 px-gutter py-12 sm:py-[72px]">
      <header className="flex flex-col gap-3">
        <div className="eyebrow">Brand and design system</div>
        <h1 className="h-display text-[40px] leading-[1.05] sm:text-[56px]">Clean, industrial, data-first.</h1>
        <p className="max-w-[760px] text-[18px] leading-[1.5] text-body">
          A warm paper ground and deep ink green, with one colour per measured quantity so fat, SNF, cost and loss are recognisable at a
          glance on every screen.
        </p>
      </header>

      <section aria-labelledby="logo" className="flex flex-col gap-5">
        <h2 id="logo" className="text-[22px] font-semibold">
          Logo concepts
        </h2>
        <div className="grid gap-5 lg:grid-cols-3">
          <div className="card flex flex-col gap-[18px] p-7">
            <div className="flex h-[120px] items-center gap-3.5">
              <svg width="64" height="64" viewBox="0 0 28 28" aria-hidden="true">
                <rect width="28" height="28" rx="7" fill="#11201B" />
                <path d="M14 5C14 5 8 12 8 16a6 6 0 0 0 12 0C20 12 14 5 14 5Z" fill="#F6F3EC" />
                <path d="M10.5 17h7M10.5 19.5h5" stroke="#11201B" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
              <span className="font-display text-[36px] font-semibold tracking-[-0.01em]">DairyOS</span>
            </div>
            <p className="text-[14px] leading-[1.45] text-body">
              <strong>Drop with ledger lines.</strong> A milk drop cut by two ledger rules: the litre and its bookkeeping. In use across this
              site and the app.
            </p>
          </div>
          <div className="flex flex-col gap-[18px] rounded-panel bg-ink p-7 text-paper">
            <div className="flex h-[120px] items-center gap-3.5">
              <svg width="64" height="64" viewBox="0 0 64 64" aria-hidden="true">
                <rect x="6" y="8" width="52" height="12" rx="3" fill="#F6F3EC" />
                <rect x="6" y="26" width="38" height="12" rx="3" fill="#C9821A" />
                <rect x="6" y="44" width="24" height="12" rx="3" fill="#2A7A73" />
              </svg>
              <span className="font-display text-[36px] font-semibold">DairyOS</span>
            </div>
            <p className="text-[14px] leading-[1.45] text-muted-dark">
              <strong className="text-paper">Stacked solids.</strong> Three bars that shrink like a mass balance: milk, fat, SNF.
            </p>
          </div>
          <div className="card flex flex-col gap-[18px] p-7">
            <div className="flex h-[120px] items-center gap-3.5">
              <svg width="64" height="64" viewBox="0 0 64 64" aria-hidden="true">
                <circle cx="32" cy="32" r="26" fill="none" stroke="#11201B" strokeWidth="5" />
                <path d="M32 6v52" stroke="#C9821A" strokeWidth="5" />
                <circle cx="32" cy="32" r="8" fill="#11201B" />
              </svg>
              <span className="font-display text-[36px] font-semibold">DairyOS</span>
            </div>
            <p className="text-[14px] leading-[1.45] text-body">
              <strong>Separator disc.</strong> A cream separator seen from above: one input, two outputs, nothing lost.
            </p>
          </div>
        </div>
      </section>

      <section aria-labelledby="colour" className="flex flex-col gap-5">
        <h2 id="colour" className="text-[22px] font-semibold">
          Colour: one colour per measured quantity
        </h2>
        <ul className="grid grid-cols-2 gap-3.5 sm:grid-cols-4 lg:grid-cols-7">
          {COLOURS.map((c) => (
            <li key={c.name} className="overflow-hidden rounded-card border border-line bg-white">
              <div className="h-24" style={{ background: c.hex }} />
              <div className="flex flex-col gap-0.5 px-3.5 py-3">
                <div className="text-[15px] font-semibold">{c.name}</div>
                <div className="font-mono text-[12px] text-muted">{c.hex}</div>
                <div className="text-[12px] leading-[1.35] text-muted">{c.use}</div>
              </div>
            </li>
          ))}
        </ul>
        <p className="text-[14px] text-muted">
          Text on amber uses ink, never white. Fat, SNF, cost and loss also differ in lightness and always carry a text label, so colour is
          never the only signal.
        </p>
      </section>

      <section aria-labelledby="type" className="flex flex-col gap-5">
        <h2 id="type" className="text-[22px] font-semibold">
          Typography
        </h2>
        <div className="grid gap-5 lg:grid-cols-3">
          <div className="card p-6">
            <div className="mb-2.5 font-mono text-[12px] text-muted">DISPLAY: FRAUNCES</div>
            <div className="font-display text-[44px] leading-[1.05] tracking-[-0.02em]">Every litre, reconciled.</div>
          </div>
          <div className="card p-6">
            <div className="mb-2.5 font-mono text-[12px] text-muted">INTERFACE: INSTRUMENT SANS</div>
            <div className="mb-1.5 text-[26px] font-semibold">Farmer payments, Sep 1-15</div>
            <div className="text-[16px] leading-[1.5] text-body">Body text at 16 px with 1.5 line height for dense tables and forms.</div>
          </div>
          <div className="card p-6">
            <div className="mb-2.5 font-mono text-[12px] text-muted">NUMBERS: JETBRAINS MONO</div>
            <div className="font-mono text-[26px] leading-[1.4]">
              1,000.0 kg
              <br />
              FAT 60.00 · SNF 90.00
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="components" className="flex flex-col gap-5">
        <h2 id="components" className="text-[22px] font-semibold">
          Component library
        </h2>
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="card flex flex-col gap-4 p-6">
            <div className="font-mono text-[12px] text-muted">BUTTONS AND BADGES</div>
            <div className="flex flex-wrap items-center gap-3">
              <button type="button" className="btn-primary">
                Primary
              </button>
              <button type="button" className="btn-secondary">
                Secondary
              </button>
              <button type="button" className="btn-amber">
                Approve
              </button>
              <button type="button" className="btn-danger">
                Hold dispatch
              </button>
            </div>
            <div className="flex flex-wrap gap-2.5">
              <Badge tone="ok">Balanced</Badge>
              <Badge tone="variance">Variance under 1%</Badge>
              <Badge tone="loss">Unexplained loss</Badge>
              <Badge tone="synced">Synced</Badge>
              <Badge tone="queued">Queued offline</Badge>
            </div>
          </div>

          <div className="card flex flex-col gap-3.5 p-6">
            <div className="font-mono text-[12px] text-muted">KPI TILES</div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                ['Fat recovered', '99.92%', 'border-fat'],
                ['SNF recovered', '99.88%', 'border-snf'],
                ['Cost per kg', '₹178.24', 'border-cost'],
                ['Unexplained loss', '0.05 kg', 'border-loss'],
              ].map(([l, v, c]) => (
                <div key={l} className={`rounded-[10px] border-t-[3px] bg-paper p-3.5 ${c}`}>
                  <div className="text-[12px] text-muted">{l}</div>
                  <div className="font-display text-[26px] sm:text-[30px]">{v}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="card flex flex-col gap-2.5 p-6">
            <div className="font-mono text-[12px] text-muted">LEDGER ROW</div>
            <div className="grid grid-cols-[1.6fr_1fr_1fr_1fr] px-3 font-mono text-[12px] text-muted">
              <span>ENTRY</span>
              <span className="text-right">KG</span>
              <span className="text-right">FAT</span>
              <span className="text-right">SNF</span>
            </div>
            <div className="grid grid-cols-[1.6fr_1fr_1fr_1fr] rounded-control bg-paper p-3 font-mono text-[14px]">
              <span className="font-sans">Cream out</span>
              <span className="text-right">150.0</span>
              <span className="text-right text-fat-text">54.00</span>
              <span className="text-right text-snf-text">8.70</span>
            </div>
            <div className="grid grid-cols-[1.6fr_1fr_1fr_1fr] rounded-control border border-dashed border-loss p-3 font-mono text-[14px] text-loss-ink">
              <span className="font-sans">Unexplained loss</span>
              <span className="text-right">0.0</span>
              <span className="text-right">0.05</span>
              <span className="text-right">0.10</span>
            </div>
          </div>

          <div className="card flex flex-col gap-3 p-6">
            <div className="font-mono text-[12px] text-muted">FORM FIELD AND ALERT</div>
            <label className="flex flex-col gap-1.5 text-[14px] font-medium">
              Fat percent (from analyzer)
              <input defaultValue="6.0" inputMode="decimal" className="field" />
            </label>
            <div className="rounded-[10px] border border-loss-edge bg-loss-tint px-3.5 py-3 text-[14px] leading-[1.45] text-loss-ink">
              <strong>Centre B shrinkage is above its 30-day average.</strong> Review weighing at the next collection.
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-2" aria-label="Icons and rules">
        <div className="card flex flex-col gap-3.5 p-6">
          <div className="font-mono text-[12px] text-muted">ICON SET: 1.75 PX STROKE, 24 PX GRID</div>
          <div className="flex flex-wrap items-center gap-6">
            {ICONS.map(([n, l]) => (
              <Icon key={n} name={n} size={32} label={l} />
            ))}
          </div>
        </div>
        <div className="card flex flex-col gap-2 p-6 text-[15px] leading-[1.5] text-body">
          <div className="font-mono text-[12px] text-muted">RULES</div>
          <p>Spacing on a 4 px scale; radius 8 px controls, 12-16 px cards.</p>
          <p>Numbers always in mono, right-aligned, with units in the header.</p>
          <p>Touch targets 44 px or larger; Hindi labels first on field apps.</p>
          <p>Every figure is a link to the entries behind it.</p>
        </div>
      </section>
    </div>
  );
}
