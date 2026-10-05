import { DownloadButton } from './buttons';
import { ArrowIcon, CloudUpIcon, LockIcon, PersonIcon } from './icons';
import { Phone, Screen } from './phone';

const container = 'mx-auto max-w-[1280px] px-5 sm:px-8';
const sectionTitle = 'text-[clamp(2rem,4.2vw,3.25rem)] leading-[1.08] font-bold tracking-[-0.03em]';
const lead = 'text-lg leading-[1.6] text-ink-soft sm:text-[19px]';

const LESSON_SCREENS = [
  { name: 'meet', alt: 'Meeting “Buenos días” next to the message “Good morning” the learner wrote', caption: 'Meet each phrase beside the message you actually wrote.' },
  { name: 'build', alt: 'Building “good afternoon” in Spanish from word tiles', caption: 'Build it from word tiles.' },
  { name: 'type', alt: 'Typing “hola” for “hello”, marked correct', caption: 'Type it. Missing accents and small typos are forgiven, and you always see the exact form.' },
  { name: 'finish', alt: 'Lesson finished: five phrases learned, 100% right first time', caption: 'Finish the lesson; missed answers come back before the end.' },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" aria-labelledby="how-title" className={`${container} pt-28 sm:pt-36`}>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-end lg:gap-16">
        <h2 id="how-title" className={`${sectionTitle} max-w-[15ch]`}>
          Every lesson starts with something you said.
        </h2>
        <p className={`${lead} max-w-[50ch]`}>
          Cielo turns your top phrases into a path, grouped by topic: a few new ones each day and a recap to close it. There are five
          kinds of exercise: meet, pick, build, match and type.
        </p>
      </div>

      <ul className="-mx-5 mt-14 flex snap-x snap-mandatory gap-5 overflow-x-auto px-5 pb-4 sm:-mx-8 sm:px-8 lg:mx-0 lg:grid lg:grid-cols-4 lg:gap-8 lg:overflow-visible lg:px-0 lg:pb-0">
        {LESSON_SCREENS.map((s, i) => (
          <li key={s.name} className={`w-[68vw] max-w-[280px] shrink-0 snap-center lg:w-full lg:max-w-[250px] lg:justify-self-center ${i % 2 ? 'lg:mt-16' : ''}`}>
            <Phone>
              <Screen name={s.name} alt={s.alt} sizes="(min-width: 1024px) 280px, 68vw" />
            </Phone>
            <p className="mt-5 max-w-[30ch] text-[16px] leading-snug text-ink-soft">{s.caption}</p>
          </li>
        ))}
      </ul>

      <div className="mt-16 grid gap-x-12 gap-y-6 border-t border-hairline pt-8 sm:grid-cols-2">
        <p className="max-w-[52ch] text-[17px] leading-relaxed text-ink-soft">
          <strong className="font-bold text-ink">Spaced review.</strong> Every phrase gets a memory card (FSRS), so it comes back just
          before you would forget it, with a gentle daily streak.
        </p>
        <p className="max-w-[52ch] text-[17px] leading-relaxed text-ink-soft">
          <strong className="font-bold text-ink">A beginner day you can skip.</strong> “Primeros pasos” covers greetings first; if
          you know them, a short test lets you move straight to your own phrases.
        </p>
      </div>
    </section>
  );
}

const REPAIRS = [
  { from: 'omw', to: 'on my way', why: 'Texting shorthand is expanded.' },
  { from: 'tommorow', to: 'tomorrow', why: 'Typos are fixed with a 50,000-word dictionary.' },
  { from: 'loooove', to: 'love', why: 'Stretched words are shortened.' },
  { from: 'Kemi', to: 'Kemi', why: 'Names are never changed, and never taught.' },
];

export function HowYouText() {
  return (
    <section aria-labelledby="text-title" className={`${container} pt-28 sm:pt-36`}>
      <div className="grid items-center gap-14 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-20">
        <div>
          <h2 id="text-title" className={`${sectionTitle} max-w-[14ch]`}>
            It reads the way you text.
          </h2>
          <p className={`${lead} mt-6 max-w-[50ch]`}>
            Real chats are messy. Before counting anything, Cielo cleans each message: links, numbers and @mentions go, and the
            words are repaired so “omw” and “on my way” count as the same thing.
          </p>
          <dl className="mt-10 max-w-[560px] divide-y divide-hairline border-y border-hairline">
            {REPAIRS.map((r) => (
              <div key={r.from} className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1.1fr)] items-baseline gap-x-4 py-4 sm:grid-cols-[9rem_auto_9rem_minmax(0,1fr)]">
                {/* A repaired word is struck through; a name stays as it is. */}
                <dt className={`truncate text-[17px] text-ink-muted ${r.from === r.to ? '' : 'line-through decoration-ink-muted/60 decoration-1'}`}>
                  {r.from}
                </dt>
                <ArrowIcon size={16} className="self-center text-ink-muted" />
                <dd className="text-[17px] font-bold">{r.to}</dd>
                <dd className="col-span-3 mt-1 text-[15px] text-ink-muted sm:col-span-1 sm:mt-0">{r.why}</dd>
              </div>
            ))}
          </dl>
          <p className={`${lead} mt-8 max-w-[50ch]`}>
            Then it counts phrases up to six words long and ranks them by how often <em className="not-italic font-bold text-ink">you</em>{' '}
            use them. Out of the box it learns only from your own messages.
          </p>
        </div>
        <div className="mx-auto w-full max-w-[320px]">
          <Phone>
            <Screen name="words" alt="The Words tab: did you eat ×5, on my way ×4, call me when you’re free ×2, i love you ×3, each with its Spanish" sizes="320px" />
          </Phone>
        </div>
      </div>
    </section>
  );
}

const PROMISES = [
  {
    icon: LockIcon,
    title: 'Read on your phone',
    body: 'The export is parsed on the device and kept in Cielo’s private storage. No server ever receives it.',
  },
  {
    icon: PersonIcon,
    title: 'Your messages, not theirs',
    body: 'By default Cielo learns only from what you wrote. Your person’s messages are used only if you switch that on.',
  },
  {
    icon: CloudUpIcon,
    title: 'Backup without message text',
    body: 'The optional backup keeps progress only: phrases, finished lessons, memory cards and your streak. The server rebuilds every upload from known fields, so nothing else can ride along.',
  },
];

export function Privacy() {
  return (
    <section id="privacy" aria-labelledby="privacy-title" className={`${container} pt-28 sm:pt-36`}>
      <div className="on-sky relative overflow-hidden rounded-[24px] bg-night px-6 py-14 text-on-sky sm:px-12 sm:py-20">
        <NightSky />
        <div className="relative grid gap-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-20">
          <div>
            <h2 id="privacy-title" className={`${sectionTitle} max-w-[13ch]`}>
              Your chat never leaves your phone.
            </h2>
            <p className="mt-6 max-w-[42ch] text-lg leading-[1.6] text-on-sky-soft">
              A chat with your favourite person is private. Cielo is built so it can teach you without ever uploading it.
            </p>
            <p className="mt-6 max-w-[42ch] text-[15px] text-on-sky-soft">Sign-in and backup are switched off in the current Android build.</p>
          </div>
          <ul className="divide-y divide-white/15 border-y border-white/15">
            {PROMISES.map(({ icon: Icon, title, body }) => (
              <li key={title} className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-5 py-6">
                <span className="mt-0.5 grid size-10 place-items-center rounded-full bg-white/10 text-sun">
                  <Icon size={20} />
                </span>
                <div>
                  <h3 className="text-[19px] font-bold">{title}</h3>
                  <p className="mt-1.5 max-w-[54ch] text-[16px] leading-relaxed text-on-sky-soft">{body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

/** The app's night: a crescent moon and a few four-point stars. */
function NightSky() {
  const stars = [
    { left: '8%', top: '14%', size: 7 },
    { left: '38%', top: '8%', size: 5 },
    { left: '58%', top: '20%', size: 8 },
    { left: '90%', top: '62%', size: 6 },
    { left: '30%', top: '88%', size: 5 },
  ];
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <span className="absolute -top-6 right-10 size-24 rounded-full bg-sun/95 sm:right-16">
        <span className="absolute -top-3 -left-4 size-24 rounded-full bg-night" />
      </span>
      {stars.map((s) => (
        <span key={s.left} className="absolute rotate-45 rounded-[1px] bg-white/80" style={{ left: s.left, top: s.top, width: s.size, height: s.size }} />
      ))}
    </div>
  );
}

export function Demo() {
  return (
    <section id="demo" aria-labelledby="demo-title" className={`${container} pt-28 sm:pt-36`}>
      <div className="grid items-center gap-14 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-20">
        <div className="mx-auto w-full max-w-[340px] lg:order-2 lg:mx-0 lg:justify-self-center">
          <Phone>
            <video
              className="h-full w-full object-cover"
              controls
              playsInline
              preload="none"
              poster="/demo-poster.webp"
              aria-label="Cielo demo: importing the sample chat and finishing the first lesson">
              <source src="/demo.mp4" type="video/mp4" />
              <a href="/demo.mp4">Download the demo video</a>
            </video>
          </Phone>
        </div>
        <div className="lg:order-1">
          <h2 id="demo-title" className={`${sectionTitle} max-w-[12ch]`}>
            See it in 43 seconds.
          </h2>
          <p className={`${lead} mt-6 max-w-[46ch]`}>
            From opening the app and importing the sample chat to finishing the first lesson, recorded on an iPhone simulator with
            nothing sped up but the pauses.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <DownloadButton />
          </div>
          <p className="mt-4 text-sm text-ink-muted">The APK installs on Android phones. An iPhone version needs an App Store release first.</p>
        </div>
      </div>
    </section>
  );
}

