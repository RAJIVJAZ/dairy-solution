/**
 * Facts about the company that only its owner can supply. Anything still in
 * [BRACKETS] renders as written, so the page never states something invented.
 */
export const SITE = {
  name: 'DairyOS',
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://dairyos.example',
  tagline: 'The operating system for milk solids',
  description:
    'DairyOS follows every litre, every kilogram of fat and SNF, from the farmer’s slip to the ghee tin and the dealer’s invoice, so the owner can see where the money went before the day ends.',
  base: 'Built in Prayagraj for dairies and sweet makers.',
  /** shown in the pricing line */
  pricePerPlant: '[YOUR PRICE]',
  /** walkthrough requests are emailed here when no endpoint is set */
  email: process.env.NEXT_PUBLIC_BOOKING_EMAIL ?? '',
  /** optional: a URL that accepts the walkthrough form as JSON (POST) */
  bookingEndpoint: process.env.NEXT_PUBLIC_BOOKING_ENDPOINT ?? '',
};
