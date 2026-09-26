'use client';

import { useEffect, useRef, useState } from 'react';

/*
 * The problem, told by scrolling: a desk of chat messages, paper slips, a
 * spreadsheet and a notebook, all about the same truck of milk, slides together
 * and collapses into the one ledger row that answers the question. Progress is
 * written to a CSS variable; every transform is computed in CSS from it.
 */
export function ScrollDesk() {
  const wrap = useRef<HTMLDivElement>(null);
  const [motion, setMotion] = useState(false);

  useEffect(() => {
    const allowed = document.documentElement.dataset.motion === '1';
    setMotion(allowed);
    const el = wrap.current;
    if (!allowed || !el) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const span = r.height - window.innerHeight;
      const p = span > 0 ? Math.min(1, Math.max(0, -r.top / span)) : 1;
      el.style.setProperty('--p', p.toFixed(4));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div ref={wrap} className={motion ? 'desk-scroll h-[190vh]' : ''} style={{ ['--p' as string]: motion ? 0 : 1 }}>
      <div className={motion ? 'sticky top-[72px] flex h-[calc(100svh-72px)] items-start pt-6 lg:items-center lg:pt-0' : 'py-4'}>
        <div className="desk relative mx-auto h-[440px] w-full max-w-[1248px] overflow-hidden rounded-tile border border-line-warm bg-[#E4DECF] sm:h-[480px]">
          <p className="desk-caption-before absolute left-5 top-4 font-mono text-[12px] uppercase tracking-[0.08em] text-body sm:left-7 sm:top-6">
            Before: one truck of milk, five places to look
          </p>
          <p className="desk-caption-after absolute left-5 top-4 font-mono text-[12px] uppercase tracking-[0.08em] text-ok sm:left-7 sm:top-6">
            After: one ledger row
          </p>

          {/* chat */}
          <div className="desk-item" style={{ ['--x' as string]: '-330px', ['--y' as string]: '-95px', ['--r' as string]: '-5deg' }}>
            <div className="w-[250px] rounded-[14px] bg-[#DCEBDD] p-3.5 text-[13px] leading-snug shadow-[0_8px_24px_-12px_rgba(17,32,27,0.35)]">
              <div className="mb-1 font-semibold text-ok">Centre B supervisor</div>
              Truck left with 812 kg this morning. Plant says only 803 came in?
              <div className="mt-1 text-right font-mono text-[11px] text-muted">06:12 ✓✓</div>
            </div>
          </div>

          {/* paper slip */}
          <div className="desk-item" style={{ ['--x' as string]: '320px', ['--y' as string]: '-100px', ['--r' as string]: '6deg' }}>
            <div className="w-[210px] border border-[#D8CFB5] bg-[#FFFDF6] p-3.5 font-display text-[15px] italic leading-relaxed text-body shadow-[0_8px_24px_-12px_rgba(17,32,27,0.35)]">
              <div className="border-b border-dashed border-[#D8CFB5] pb-1 font-mono text-[10px] not-italic text-muted">SLIP 0412 · CENTRE B</div>
              Farmer 0142 · 12.5 L<br />
              Fat 6.1 · SNF <span className="text-loss">?</span>
              <br />
              Amt ₹ ______
            </div>
          </div>

          {/* spreadsheet */}
          <div className="desk-item" style={{ ['--x' as string]: '-300px', ['--y' as string]: '120px', ['--r' as string]: '3deg' }}>
            <div className="w-[270px] overflow-hidden rounded-[6px] border border-[#C8D1CC] bg-white font-mono text-[11px] shadow-[0_8px_24px_-12px_rgba(17,32,27,0.35)]">
              <div className="grid grid-cols-[28px_1fr_1fr_1fr] bg-[#EEF1EF] text-center text-muted">
                <span />
                <span>A</span>
                <span>B</span>
                <span>C</span>
              </div>
              {[
                ['1', 'Centre', 'Sent', 'Recd'],
                ['2', 'B AM', '812', '803'],
                ['3', 'Fat kg', '=B2*6%', '#REF!'],
              ].map((r) => (
                <div key={r[0]} className="grid grid-cols-[28px_1fr_1fr_1fr] border-t border-[#E1E6E3]">
                  {r.map((c, i) => (
                    <span key={i} className={i === 0 ? 'bg-[#EEF1EF] text-center text-muted' : c === '#REF!' ? 'px-1.5 text-loss' : 'px-1.5'}>
                      {c}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* notebook */}
          <div className="desk-item" style={{ ['--x' as string]: '310px', ['--y' as string]: '115px', ['--r' as string]: '-4deg' }}>
            <div
              className="w-[220px] bg-[#FBF7EA] px-4 py-3 font-display text-[15px] italic leading-[26px] text-body shadow-[0_8px_24px_-12px_rgba(17,32,27,0.35)]"
              style={{ backgroundImage: 'repeating-linear-gradient(transparent 0 25px, #D9E3EA 25px 26px)' }}
            >
              Khoya batch 7, yield low?
              <br />
              Ask karigar tomorrow.
              <br />
              Tally: re-key Friday
            </div>
          </div>

          {/* phone call note */}
          <div className="desk-item" style={{ ['--x' as string]: '0px', ['--y' as string]: '-150px', ['--r' as string]: '-2deg' }}>
            <div className="w-[200px] bg-fat-tint p-3 text-[13px] leading-snug text-fat-ink shadow-[0_8px_24px_-12px_rgba(17,32,27,0.35)]">
              Call Dealer 03 about ₹4.3 lakh due. Again.
            </div>
          </div>

          {/* the answer */}
          <div className="desk-answer absolute left-1/2 top-1/2 w-[min(760px,calc(100%-32px))]">
            <div className="rounded-[14px] bg-ink-2 p-4 text-cloud shadow-[0_24px_60px_-24px_rgba(17,32,27,0.6)] sm:p-5">
              <div className="mb-2 flex items-center justify-between gap-3 font-mono text-[11px] text-muted-dark sm:text-[12px]">
                <span>TRIP TR-B-26-AM · CENTRE B TO PLANT A</span>
                <span className="rounded-full bg-[#3A1F18] px-2.5 py-0.5 font-sans text-loss-glow">Shrinkage above average</span>
              </div>
              <div className="grid grid-cols-[1.4fr_1fr_1fr_1fr] gap-1 px-1 font-mono text-[10px] text-muted-dark sm:text-[11px]">
                <span>ENTRY</span>
                <span className="text-right">KG</span>
                <span className="text-right">FAT KG</span>
                <span className="text-right">SNF KG</span>
              </div>
              <div className="mt-1 grid grid-cols-[1.4fr_1fr_1fr_1fr] gap-1 rounded-control bg-ink-3 px-3 py-3 font-mono text-[12px] sm:text-[14px]">
                <span className="font-sans">Received at plant</span>
                <span className="text-right">803.0</span>
                <span className="text-right text-fat-glow">48.92</span>
                <span className="text-right text-snf-glow">69.87</span>
              </div>
              <div className="mt-1.5 grid grid-cols-[1.4fr_1fr_1fr_1fr] gap-1 rounded-control border border-dashed border-loss-dash px-3 py-3 font-mono text-[12px] text-loss-glow sm:text-[14px]">
                <span className="font-sans">Shrinkage in transit</span>
                <span className="text-right">9.0</span>
                <span className="text-right">0.55</span>
                <span className="text-right">0.78</span>
              </div>
              <div className="mt-2 text-[12px] text-muted-dark">
                Opens to the farmer slips behind it, the truck, the scale&apos;s last calibration and every batch the milk went into.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
