import type { MetadataRoute } from 'next';
import { SITE } from '@/lib/site';

export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
  return ['/', '/design-system/', '/privacy/'].map((path) => ({ url: `${SITE.url}${path}`, changeFrequency: 'monthly' }));
}
