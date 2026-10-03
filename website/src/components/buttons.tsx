import { AndroidIcon } from './icons';
import { APK_URL } from './links';

/**
 * Primary: the twilight 32px-radius button, the page's one saturated action.
 * Secondary: an outline pill. The radius difference is the hierarchy (DESIGN.md).
 */
const primary =
  'inline-flex h-12 items-center justify-center gap-2.5 rounded-[32px] bg-primary px-6 text-[15px] font-bold text-on-primary transition-colors duration-150 hover:bg-primary-pressed active:translate-y-px';
const secondary =
  'inline-flex h-12 items-center justify-center gap-2.5 rounded-full border border-ink/80 px-6 text-[15px] font-bold text-ink transition-colors duration-150 hover:bg-ink hover:text-canvas active:translate-y-px';

export function DownloadButton({ className = '' }: { className?: string }) {
  return (
    <a href={APK_URL} className={`${primary} ${className}`}>
      <AndroidIcon size={19} />
      Download for Android
    </a>
  );
}

export function SecondaryLink({ href, children, className = '' }: { href: string; children: React.ReactNode; className?: string }) {
  return (
    <a href={href} className={`${secondary} ${className}`}>
      {children}
    </a>
  );
}
