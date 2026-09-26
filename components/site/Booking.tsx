'use client';

import { useId, useRef, useState } from 'react';
import { Icon } from '@/components/brand';
import { SITE } from '@/lib/site';

type State = { kind: 'idle' } | { kind: 'sending' } | { kind: 'sent'; via: 'endpoint' | 'email' } | { kind: 'error'; message: string };

const PRODUCTS = ['Ghee', 'Khoya', 'Paneer', 'Sweets', 'Liquid milk'];

/**
 * The walkthrough request. It posts to NEXT_PUBLIC_BOOKING_ENDPOINT when one
 * is configured, otherwise opens an email to NEXT_PUBLIC_BOOKING_EMAIL. With
 * neither set it says so, rather than pretending the request went anywhere.
 */
export function BookingButton({ className, children }: { className?: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  const [state, setState] = useState<State>({ kind: 'idle' });

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data = {
      name: String(fd.get('name') ?? ''),
      dairy: String(fd.get('dairy') ?? ''),
      phone: String(fd.get('phone') ?? ''),
      city: String(fd.get('city') ?? ''),
      litres: String(fd.get('litres') ?? ''),
      products: fd.getAll('products').map(String),
      note: String(fd.get('note') ?? ''),
    };
    if (SITE.bookingEndpoint) {
      setState({ kind: 'sending' });
      try {
        const res = await fetch(SITE.bookingEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...data, source: 'website', at: new Date().toISOString() }),
        });
        if (!res.ok) throw new Error(`The server answered ${res.status}.`);
        setState({ kind: 'sent', via: 'endpoint' });
      } catch (err) {
        setState({ kind: 'error', message: err instanceof Error ? err.message : 'The request did not go through.' });
      }
      return;
    }
    if (SITE.email) {
      const body = [
        `Name: ${data.name}`,
        `Dairy: ${data.dairy}`,
        `Phone: ${data.phone}`,
        `City: ${data.city}`,
        `Milk per day: ${data.litres} L`,
        `Products: ${data.products.join(', ')}`,
        '',
        data.note,
      ].join('\n');
      window.location.href = `mailto:${SITE.email}?subject=${encodeURIComponent(`Plant walkthrough: ${data.dairy}`)}&body=${encodeURIComponent(body)}`;
      setState({ kind: 'sent', via: 'email' });
      return;
    }
    setState({ kind: 'error', message: 'Bookings are not connected on this copy of the site yet. Set NEXT_PUBLIC_BOOKING_ENDPOINT or NEXT_PUBLIC_BOOKING_EMAIL.' });
  }

  return (
    <>
      <button
        type="button"
        className={className}
        onClick={() => {
          setState({ kind: 'idle' });
          ref.current?.showModal();
        }}
      >
        {children}
      </button>
      <dialog
        ref={ref}
        aria-labelledby={`${id}-title`}
        className="w-[min(640px,calc(100vw-32px))] rounded-tile bg-paper p-0 text-ink backdrop:bg-ink/60"
        onClick={(e) => {
          if (e.target === ref.current) ref.current?.close();
        }}
      >
        <div className="max-h-[calc(100dvh-48px)] overflow-y-auto p-5 sm:p-8">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <div className="eyebrow">60-day pilot</div>
              <h2 id={`${id}-title`} className="h-display mt-1 text-[30px] leading-tight sm:text-[36px]">
                Book a plant walkthrough
              </h2>
            </div>
            <button type="button" aria-label="Close" onClick={() => ref.current?.close()} className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-control border border-line">
              <Icon name="close" />
            </button>
          </div>
          {state.kind === 'sent' ? (
            <div className="rounded-panel border border-ok-edge bg-ok-tint p-5 text-ok">
              <p className="font-semibold">{state.via === 'email' ? 'Your email app should now be open with the details filled in.' : 'Thank you. We have your request.'}</p>
              <p className="mt-1 text-[15px]">We will reply to arrange a day at your plant.</p>
            </div>
          ) : (
            <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
              <Field name="name" label="Your name" autoComplete="name" required />
              <Field name="phone" label="Phone" type="tel" autoComplete="tel" inputMode="tel" required />
              <Field name="dairy" label="Dairy or plant name" autoComplete="organization" required />
              <Field name="city" label="City or district" autoComplete="address-level2" />
              <Field name="litres" label="Milk handled per day (litres)" inputMode="numeric" />
              <fieldset className="sm:col-span-2">
                <legend className="mb-2 text-[14px] font-medium">What you make</legend>
                <div className="flex flex-wrap gap-2">
                  {PRODUCTS.map((p) => (
                    <label key={p} className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-control border border-line bg-white px-3.5 text-[15px] has-[:checked]:border-ink has-[:checked]:bg-paper-4">
                      <input type="checkbox" name="products" value={p} className="h-4 w-4 accent-[#11201B]" />
                      {p}
                    </label>
                  ))}
                </div>
              </fieldset>
              <label className="flex flex-col gap-1.5 text-[14px] font-medium sm:col-span-2">
                Anything we should know
                <textarea name="note" rows={3} className="rounded-control border border-line-strong bg-white px-3.5 py-2.5 text-[16px] font-normal" />
              </label>
              {state.kind === 'error' && (
                <p role="alert" className="rounded-card border border-loss-edge bg-loss-tint p-3.5 text-[14px] text-loss-ink sm:col-span-2">
                  {state.message}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
                <button type="submit" className="btn-primary" disabled={state.kind === 'sending'}>
                  {state.kind === 'sending' ? 'Sending…' : 'Request a walkthrough'}
                </button>
                <span className="text-[13px] text-muted">We use these details only to arrange the visit.</span>
              </div>
            </form>
          )}
        </div>
      </dialog>
    </>
  );
}

function Field({ label, name, ...rest }: { label: string; name: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex flex-col gap-1.5 text-[14px] font-medium">
      {label}
      <input name={name} className="min-h-[44px] rounded-control border border-line-strong bg-white px-3.5 py-2.5 text-[16px] font-normal" {...rest} />
    </label>
  );
}
