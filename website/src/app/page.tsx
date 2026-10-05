import { Hero } from '@/components/hero';
import { Demo, HowItWorks, HowYouText, Privacy, UnderTheHood } from '@/components/sections';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';

export default function Home() {
  return (
    <>
      <a
        href="#main"
        className="sr-only z-50 rounded-full bg-primary px-4 py-2 font-bold text-on-primary focus:not-sr-only focus:fixed focus:top-3 focus:left-3">
        Skip to content
      </a>
      <SiteHeader />
      <main id="main">
        <Hero />
        <HowItWorks />
        <HowYouText />
        <Privacy />
        <Demo />
        <UnderTheHood />
      </main>
      <SiteFooter />
    </>
  );
}
