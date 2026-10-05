import { DownloadButton } from './buttons';
import { SunMark } from './icons';
import { PORTFOLIO_URL, RELEASES_URL, REPO_URL } from './links';

export function SiteFooter() {
  return (
    <footer className="mx-auto mt-28 max-w-[1280px] px-5 pb-12 sm:mt-36 sm:px-8">
      <div className="flex flex-col items-start justify-between gap-8 border-t border-hairline pt-12 md:flex-row md:items-center">
        <div className="flex items-center gap-4">
          <SunMark size={44} />
          <div>
            <p className="text-[22px] leading-tight font-bold tracking-[-0.02em]">Cielo</p>
            <p className="text-ink-soft">Learn Spanish in your own words.</p>
          </div>
        </div>
        <DownloadButton />
      </div>
      <div className="mt-10 flex flex-col gap-4 text-[15px] text-ink-muted sm:flex-row sm:items-center sm:justify-between">
        <p>
          Designed and built by{' '}
          <a href={PORTFOLIO_URL} className="font-bold text-ink underline decoration-hairline hover:decoration-ink">
            Oluwalonimi Oyepariola
          </a>
          .
        </p>
        <ul className="flex flex-wrap gap-x-6 gap-y-2">
          <li>
            <a href={REPO_URL} className="hover:text-ink">
              Source on GitHub
            </a>
          </li>
          <li>
            <a href={RELEASES_URL} className="hover:text-ink">
              Releases
            </a>
          </li>
          <li>
            <a href={`${REPO_URL}/blob/main/LICENSE`} className="hover:text-ink">
              MIT licence
            </a>
          </li>
        </ul>
      </div>
    </footer>
  );
}
