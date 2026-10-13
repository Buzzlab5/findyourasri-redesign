'use client';

import { useRef, useState } from 'react';

import { showreel } from '@/lib/content';
import { Play } from '@/components/Arrow';

/**
 * The Work page's showreel: a 16:9 poster with a play button. Nothing loads
 * until the visitor asks (preload="none", no autoplay), and once asked it
 * plays with its controls, sound included.
 */
export default function Showreel() {
  const [playing, setPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  return (
    <div className="reel-frame clip-reveal">
      {playing ? (
        <video
          ref={videoRef}
          src={showreel.src}
          poster={showreel.poster}
          controls
          autoPlay
          playsInline
          preload="none"
        />
      ) : (
        <button
          type="button"
          className="reel-frame__play"
          aria-label={showreel.label}
          data-track="cta_click"
          data-cta-location="showreel"
          onClick={() => setPlaying(true)}
        >
          <img src={showreel.poster} alt="" width={1600} height={900} loading="lazy" />
          <span className="reel-frame__button" aria-hidden="true">
            <Play />
          </span>
        </button>
      )}
    </div>
  );
}
