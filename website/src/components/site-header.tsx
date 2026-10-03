import { GitHubIcon, SunMark } from './icons';
import { REPO_URL } from './links';

const NAV = [
  { href: '#how-it-works', label: 'How it works' },
  { href: '#privacy', label: 'Privacy' },
  { href: '#under-the-hood', label: 'Under the hood' },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-hairline/70 bg-canvas">
      <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between px-5 sm:px-8">
        <a href="#top" className="flex items-center gap-2.5 text-[19px] font-bold tracking-[-0.02em]">
          <SunMark size={30} />
          Cielo
        </a>
        <nav aria-label="Page sections" className="flex items-center gap-1">
          <ul className="hidden items-center gap-1 md:flex">
            {NAV.map((item) => (
              <li key={item.href}>
                <a href={item.href} className="rounded-full px-3.5 py-2 text-[15px] text-ink-soft transition-colors hover:bg-surface-muted hover:text-ink">
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
          <a
            href={REPO_URL}
            className="ml-1 inline-flex h-10 items-center gap-2 rounded-full border border-hairline bg-surface px-4 text-[15px] font-bold transition-colors hover:border-ink/40">
            <GitHubIcon size={18} />
            GitHub
          </a>
        </nav>
      </div>
    </header>
  );
}
