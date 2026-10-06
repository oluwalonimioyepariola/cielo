'use client';

import { useRef, useState } from 'react';

import { PlayIcon } from './icons';

/**
 * The demo in its phone frame. Before playback it shows the poster and one Cielo play button
 * instead of the browser's controls; once it plays, the native controls take over.
 */
export function DemoVideo() {
  const video = useRef<HTMLVideoElement>(null);
  const [started, setStarted] = useState(false);

  const play = () => {
    setStarted(true);
    void video.current?.play();
  };

  return (
    <>
      <video
        ref={video}
        className="h-full w-full object-cover"
        controls={started}
        playsInline
        preload="none"
        poster="/demo-poster.webp"
        aria-label="Cielo demo: importing the sample chat and finishing the first lesson">
        <source src="/demo.mp4" type="video/mp4" />
        <a href="/demo.mp4">Download the demo video</a>
      </video>
      {started ? null : (
        <button
          type="button"
          onClick={play}
          className="group absolute inset-0 grid place-items-center"
          aria-label="Play the 43-second demo">
          <span className="grid size-[72px] place-items-center rounded-full bg-primary text-on-primary ring-8 ring-white/60 transition-transform duration-200 group-hover:scale-105 group-active:scale-95">
            <PlayIcon size={26} className="translate-x-[2px]" />
          </span>
        </button>
      )}
    </>
  );
}
