import { Hero } from '@/components/hero';
import { HowItWorks } from '@/components/sections';
import { SiteHeader } from '@/components/site-header';

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main id="main">
        <Hero />
        <HowItWorks />
      </main>
    </>
  );
}
