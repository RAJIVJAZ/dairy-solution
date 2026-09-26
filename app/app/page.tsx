import type { Metadata } from 'next';
import { Launcher } from '@/components/app/Launcher';

export const metadata: Metadata = { title: 'Choose a screen' };

export default function Page() {
  return <Launcher />;
}
