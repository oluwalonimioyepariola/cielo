import Image from 'next/image';

/** Screens are real captures from the app on an iPhone simulator, 640 × 1391. */
const SCREEN = { width: 640, height: 1391 };

type PhoneProps = {
  className?: string;
  children: React.ReactNode;
};

/** A plain device frame: dark bezel, rounded screen. Flat, like the rest of the page. */
export function Phone({ className = '', children }: PhoneProps) {
  return (
    <div className={`rounded-[44px] bg-[#1c1b1a] p-[9px] ring-1 ring-black/5 ${className}`}>
      <div className="relative overflow-hidden rounded-[36px] bg-canvas" style={{ aspectRatio: `${SCREEN.width} / ${SCREEN.height}` }}>
        {children}
      </div>
    </div>
  );
}

export function Screen({ name, alt, priority = false, sizes }: { name: string; alt: string; priority?: boolean; sizes: string }) {
  return (
    <Image
      src={`/screens/${name}.webp`}
      alt={alt}
      width={SCREEN.width}
      height={SCREEN.height}
      sizes={sizes}
      priority={priority}
      className="h-full w-full object-cover"
    />
  );
}
