import { DownloadButton } from './buttons';
import { CheckIcon, PlayIcon } from './icons';
import { Cloud, CloudEdge, Sun } from './sky';

/*
 * Every word below comes from the app: messages from its built-in sample chat (Sam to Alex),
 * counts from its Words tab, Spanish and notes from its phrase bank, and the lesson's layout.
 */
const MESSAGES = [
  { before: '', mark: 'omw', after: ' to the office, call me when you’re free', time: '12:31' },
  { before: '', mark: 'Did you eat', after: '? Don’t skip lunch', time: '12:45' },
  { before: 'I’m home. ', mark: 'I miss you', after: ' so much', time: '19:15' },
  { before: 'Good night, ', mark: 'I love you', after: '', time: '22:10' },
];

const PHRASES = [
  { en: 'did you eat', count: 5 },
  { en: 'on my way', count: 4, from: 'omw' },
  { en: 'i miss you', count: 3 },
  { en: 'i love you', count: 3 },
];

const SPANISH = [
  { es: '¿Ya comiste?', en: 'did you eat', note: 'The “ya” makes it sound caring.' },
  { es: 'Voy en camino', en: 'on my way' },
  { es: 'Te extraño', en: 'i miss you' },
  { es: 'Te quiero', en: 'i love you' },
];

// The phrases float in Spanish the way they do on the app's sign-in screen, tilted a little.
const FLOATING = [
  { es: '¿Ya comiste?', en: 'did you eat?', className: 'top-2 left-6 -rotate-[4deg]' },
  { es: 'Te extraño', en: 'I miss you', className: 'top-[34%] right-0 rotate-[3deg]' },
  { es: 'Voy en camino', en: 'on my way', className: 'bottom-4 left-0 -rotate-[2deg]' },
];

export function Hero() {
  return (
    <section id="top" aria-labelledby="hero-title" className="mx-auto max-w-[1280px] px-5 pt-12 sm:px-8 sm:pt-16">
      <div className="relative">
        <h1 id="hero-title" className="text-[clamp(3rem,7.2vw,6rem)] leading-[0.98] font-bold tracking-[-0.04em]">
          Learn Spanish in <br className="hidden sm:block" />
          <mark className="marker bg-transparent text-ink" style={{ '--m': -3 } as React.CSSProperties}>
            your own words.
          </mark>
        </h1>

        <div className="mt-8 max-w-[580px] sm:mt-10">
          <p className="max-w-[50ch] text-lg leading-[1.6] text-ink-soft sm:text-[20px]">
            Cielo reads the WhatsApp chat you have with your favourite person, finds the things you say most, and teaches you the
            Spanish for exactly those. The chat never leaves your phone.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-x-7 gap-y-4">
            <DownloadButton className="w-full sm:w-auto" />
            <a href="#demo" className="group inline-flex items-center gap-3 text-[15px] font-bold text-ink">
              <span className="grid size-10 place-items-center rounded-full border border-ink/25 transition-colors group-hover:border-primary group-hover:bg-primary group-hover:text-on-primary">
                <PlayIcon size={14} />
              </span>
              <span className="underline decoration-hairline underline-offset-4 group-hover:decoration-primary">
                Watch the 43-second demo
              </span>
            </a>
          </div>
          <p className="mt-5 text-sm text-ink-muted">Free Android app. No account needed.</p>
        </div>

        {/* Some of "your" phrases, already in Spanish: the promise, shown rather than told. */}
        <ul aria-label="Phrases Cielo teaches from the sample chat" className="absolute top-[26%] right-0 hidden h-[56%] w-[330px] lg:block xl:right-8">
          {FLOATING.map((b) => (
            <li key={b.es} className={`absolute flex items-center gap-3 rounded-[16px] rounded-br-[8px] border border-hairline bg-surface px-4 py-3 ${b.className}`}>
              <span>
                <span lang="es" className="block text-[19px] leading-tight font-bold">
                  {b.es}
                </span>
                <span className="text-[13px] text-ink-muted">{b.en}</span>
              </span>
              <CheckIcon size={18} className="text-primary" />
            </li>
          ))}
        </ul>
      </div>

      <Pipeline />
    </section>
  );
}

function Pipeline() {
  return (
    <figure className="on-sky relative mt-10 overflow-hidden rounded-[24px] bg-sky px-5 pt-8 pb-28 text-on-sky sm:mt-12 sm:px-9 sm:pt-9 lg:pb-32">
      <Cloud width={58} className="top-[6%] left-[46%] hidden opacity-35 lg:block" />
      <Cloud width={44} className="top-[6%] left-[62%] hidden opacity-25 lg:block" />
      <Sun size={86} className="-top-10 -right-6 origin-top-right scale-[0.55] sm:-right-2 sm:scale-100" />

      <figcaption className="relative mb-7 max-w-[52ch] pr-12 text-[17px] leading-relaxed text-on-sky-soft sm:pr-0">
        <span className="font-bold text-on-sky">Your chat becomes your course.</span> Here is how Cielo turns four messages from its
        sample chat into a lesson.
      </figcaption>

      <ol className="relative grid gap-9 pl-7 lg:grid-cols-4 lg:gap-5 lg:pl-0">
        <Stage index={0} title="Your chat">
          <div className="flex flex-col items-end gap-2">
            {MESSAGES.map((m, i) => (
              <p key={m.time} className="max-w-[94%] rounded-[16px] rounded-br-[8px] bg-surface-muted px-3 py-2 text-[14.5px] leading-snug text-ink">
                {m.before}
                <mark className="marker bg-transparent text-ink" style={{ '--m': i } as React.CSSProperties}>
                  {m.mark}
                </mark>
                {m.after}
                <span className="ml-2 align-baseline text-[11px] text-ink-muted">{m.time}</span>
              </p>
            ))}
          </div>
        </Stage>

        <Stage index={1} title="What you say most">
          <ul className="divide-y divide-hairline">
            {PHRASES.map((p) => (
              <li key={p.en} className="flex items-baseline justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                <span className="text-[16px] font-bold">
                  {p.en}
                  {p.from ? <span className="ml-2 text-[13px] font-normal text-ink-muted">from “{p.from}”</span> : null}
                </span>
                <span className="text-[14px] font-bold text-primary tabular-nums">×{p.count}</span>
              </li>
            ))}
          </ul>
        </Stage>

        <Stage index={2} title="In Spanish">
          <ul className="divide-y divide-hairline">
            {SPANISH.map((s) => (
              <li key={s.es} className="py-2.5 first:pt-0 last:pb-0">
                <span lang="es" className="block text-[17px] leading-tight font-bold">
                  {s.es}
                </span>
                <span className="text-[13px] text-ink-muted">{s.note ?? s.en}</span>
              </li>
            ))}
          </ul>
        </Stage>

        <Stage index={3} title="Your lesson" last>
          <LessonCard />
        </Stage>
      </ol>

      <CloudEdge />
    </figure>
  );
}

/*
 * Each stage draws its own piece of the route, from its dot to the next stage's dot (across the
 * column gap on wide screens, down the gap on phones), so the line is continuous through every dot.
 * The title sits on a patch of sky, so the line passes behind it rather than through it.
 */
function Stage({ index, title, last = false, children }: { index: number; title: string; last?: boolean; children: React.ReactNode }) {
  return (
    <li className="stage relative flex flex-col" style={{ '--i': index } as React.CSSProperties}>
      {last ? null : (
        <span
          aria-hidden
          className="absolute top-[11px] -left-[23px] h-[calc(100%+2.25rem)] w-[2px] bg-on-sky/40 lg:top-[9px] lg:left-[6px] lg:h-[2px] lg:w-[calc(100%+1.25rem)]"
        />
      )}
      <h2 className="relative mb-4 flex w-fit items-center gap-2.5 bg-sky pr-3 text-[15px] font-bold text-on-sky">
        <span aria-hidden className="-ml-7 size-3 shrink-0 rounded-full bg-sun ring-4 ring-sky lg:ml-0" />
        {title}
      </h2>
      <div className="relative flex-1 rounded-[16px] bg-surface p-4 text-ink">{children}</div>
    </li>
  );
}

/** The app's "build it" exercise, mid-lesson, answered correctly. */
function LessonCard() {
  return (
    <div className="flex h-full flex-col">
      <div aria-hidden className="h-1.5 overflow-hidden rounded-full bg-surface-muted">
        <div className="h-full w-[62%] rounded-full bg-primary" />
      </div>
      <p className="mt-4 text-[11px] font-bold tracking-[0.08em] text-ink-muted uppercase">Build it in Spanish</p>
      <p className="mt-1 text-[19px] leading-tight font-bold">“did you eat”</p>
      <div className="mt-3 flex gap-2 border-b border-hairline pb-3" lang="es">
        {['¿Ya', 'comiste?'].map((w) => (
          <span key={w} className="rounded-[16px] border border-hairline bg-surface px-3.5 py-1.5 text-[15px] font-bold">
            {w}
          </span>
        ))}
      </div>
      <div className="mt-auto pt-4">
        <p className="flex items-center gap-2 rounded-[16px] bg-success-soft px-3 py-2.5 text-[15px] font-bold text-success">
          <CheckIcon size={16} />
          <span lang="es">¡Perfecto!</span>
        </p>
      </div>
    </div>
  );
}
