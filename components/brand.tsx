import clsx from 'clsx';

/** Drop with ledger lines: the litre and its bookkeeping. */
export function LogoMark({ size = 28, className, inverse = false }: { size?: number; className?: string; inverse?: boolean }) {
  const [ground, drop] = inverse ? ['#F6F3EC', '#11201B'] : ['#11201B', '#F6F3EC'];
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" aria-hidden="true" className={className}>
      <rect width="28" height="28" rx="7" fill={ground} />
      <path d="M14 5C14 5 8 12 8 16a6 6 0 0 0 12 0C20 12 14 5 14 5Z" fill={drop} />
      <path d="M10.5 17h7M10.5 19.5h5" stroke={ground} strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ className, light = false }: { className?: string; light?: boolean }) {
  return (
    <span className={clsx('inline-flex items-center gap-2.5', className)}>
      <LogoMark />
      <span className={clsx('font-display text-[22px] font-semibold tracking-[-0.01em]', light ? 'text-paper' : 'text-ink')}>DairyOS</span>
    </span>
  );
}

type IconName =
  | 'drop'
  | 'tank'
  | 'batch'
  | 'truck'
  | 'recall'
  | 'offline'
  | 'online'
  | 'check'
  | 'chevron'
  | 'printer'
  | 'sync'
  | 'scale'
  | 'flask'
  | 'menu'
  | 'close'
  | 'home'
  | 'list'
  | 'rupee'
  | 'star'
  | 'wrench'
  | 'box'
  | 'users'
  | 'arrow';

const PATHS: Record<IconName, React.ReactNode> = {
  drop: <path d="M12 3s-6 6.5-6 10.5a6 6 0 0 0 12 0C18 9.5 12 3 12 3Z" />,
  tank: (
    <>
      <rect x="5" y="4" width="14" height="16" rx="3" />
      <path d="M5 12h14" />
    </>
  ),
  batch: <path d="M4 7h16M4 12h16M4 17h10" />,
  truck: (
    <>
      <path d="M3 7h11v9H3zM14 10h4l3 3v3h-7" />
      <circle cx="7" cy="17" r="1.6" />
      <circle cx="17" cy="17" r="1.6" />
    </>
  ),
  recall: <path d="M4 12a8 8 0 1 0 3-6.2M4 4v4h4" />,
  offline: <path d="M3 3l18 18M8 8a7 7 0 0 1 9 1M5 11a11 11 0 0 1 4-2.5M9 15a4 4 0 0 1 5 0" />,
  online: <path d="M5 11a11 11 0 0 1 14 0M8 14a7 7 0 0 1 8 0M11 17.5a2 2 0 0 1 2 0" />,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  chevron: <path d="M9 6l6 6-6 6" />,
  printer: (
    <>
      <path d="M7 9V4h10v5M7 17H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2" />
      <path d="M7 14h10v6H7z" />
    </>
  ),
  sync: <path d="M20 11a8 8 0 0 0-14.3-4.9L4 8M4 4v4h4M4 13a8 8 0 0 0 14.3 4.9L20 16M20 20v-4h-4" />,
  scale: (
    <>
      <rect x="4" y="13" width="16" height="7" rx="2" />
      <path d="M8 13V9a4 4 0 0 1 8 0v4M12 9v2" />
    </>
  ),
  flask: <path d="M9 3h6M10 3v6L5 18a2 2 0 0 0 1.8 3h10.4A2 2 0 0 0 19 18l-5-9V3M7.5 14h9" />,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  home: <path d="M4 11l8-7 8 7v9a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1z" />,
  list: <path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" />,
  rupee: <path d="M7 4h10M7 9h10M7 4c6 0 6 10 0 10l7 7" />,
  star: <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.9z" />,
  wrench: <path d="M14.5 6.5a4 4 0 0 0-5.3 5.3L4 17l3 3 5.2-5.2a4 4 0 0 0 5.3-5.3l-2.5 2.5-2.5-.5-.5-2.5z" />,
  box: <path d="M3 7l9-4 9 4v10l-9 4-9-4zM3 7l9 4 9-4M12 11v10" />,
  users: (
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 20a6 6 0 0 1 12 0M16 4.5a3.2 3.2 0 0 1 0 6.3M21 20a6 6 0 0 0-3.5-5.5" />
    </>
  ),
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
};

export function Icon({
  name,
  size = 20,
  className,
  label,
  strokeWidth = 1.75,
}: {
  name: IconName;
  size?: number;
  className?: string;
  label?: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {PATHS[name]}
    </svg>
  );
}

export type Tone = 'ok' | 'variance' | 'loss' | 'synced' | 'queued' | 'running';

const TONES: Record<Tone, string> = {
  ok: 'bg-ok-tint text-ok',
  variance: 'bg-fat-tint text-fat-badge',
  loss: 'bg-loss-tint text-loss-ink',
  synced: 'bg-cost-tint text-cost',
  queued: 'bg-paper-4 text-body',
  running: 'bg-cost-tint text-cost',
};

export function Badge({ tone, children, className }: { tone: Tone; children: React.ReactNode; className?: string }) {
  return (
    <span className={clsx('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 text-[13px] font-medium', TONES[tone], className)}>
      {children}
    </span>
  );
}
