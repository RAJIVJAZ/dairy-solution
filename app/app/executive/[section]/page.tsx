import type { Metadata } from 'next';
import { ExecSection } from '@/components/app/executive';
import { SECTIONS, type SectionKey } from '@/lib/sections';

export const dynamicParams = false;

export function generateStaticParams() {
  return Object.keys(SECTIONS).map((section) => ({ section }));
}

export function generateMetadata({ params }: { params: { section: SectionKey } }): Metadata {
  return { title: SECTIONS[params.section] };
}

export default function Page({ params }: { params: { section: SectionKey } }) {
  return <ExecSection section={params.section} />;
}
