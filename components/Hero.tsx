"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import HeroMedia from "@/components/HeroMedia";
import { motionIsOff } from "@/lib/gsap";
import { Arrow } from '@/components/Arrow';

const ROTATION = ["Story.", "Audience.", "Asri."] as const;

// Typewriter pacing, in ms.
const TYPE_MS = 85;
const DELETE_MS = 40;
const HOLD_MS = 2200;
const GAP_MS = 380;

/**
 * The opening frame: the headline, one line of copy and two
 * calls to action, in one centred stack, so the photograph carries the rest.
 *
 * The frame wipes open and the photograph drifts on scroll (Motion.tsx); the
 * word after "Find Your" is typed out, held, deleted and replaced by the
 * next, with a caret after it. It renders "Story." in full on the server, so
 * the first paint is a whole headline; the loop starts by holding that word.
 * Under reduced motion it simply stays on "Story.".
 */
export default function Hero() {
  const [text, setText] = useState<string>(ROTATION[0]);
  const [typing, setTyping] = useState(false);

  useEffect(() => {
    if (motionIsOff()) return;

    let index = 0;
    let length = ROTATION[0].length;
    let deleting = true;
    let timer: number;

    const tick = () => {
      const word = ROTATION[index];
      if (deleting) {
        length -= 1;
        setText(word.slice(0, length));
        if (length === 0) {
          deleting = false;
          index = (index + 1) % ROTATION.length;
          timer = window.setTimeout(tick, GAP_MS);
          return;
        }
        timer = window.setTimeout(tick, DELETE_MS);
      } else {
        length += 1;
        setText(word.slice(0, length));
        if (length === word.length) {
          deleting = true;
          setTyping(false);
          timer = window.setTimeout(start, HOLD_MS);
          return;
        }
        // A little jitter so it reads as typed, not ticked.
        timer = window.setTimeout(tick, TYPE_MS + Math.random() * 60 - 20);
      }
    };
    const start = () => {
      setTyping(true);
      tick();
    };

    timer = window.setTimeout(start, HOLD_MS);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    // Full bleed, under the header, as a proposal's cover page is: the
    // spacing and the pull-up live in app/brand.css.
    <section id="top" className="hero">
      <div className="hero__frame clip-reveal">
        <div className="hero__media media-zoom">
          <HeroMedia />
        </div>
        <div className="hero__scrim" aria-hidden="true" />

        <div className="hero__bottom">
          {/* "Find Your" stays put; only the word after it is typed and
              retyped. Screen readers get the whole slogan once. */}
          <h1 className="hero__title">
            <span className="hero__sr">
              Find Your Story, Find Your Audience, Find Your Asri.
            </span>
            <span aria-hidden="true">
              Find Your{" "}
              <span className={`hero__typer${typing ? " is-typing" : ""}`}>
                <span className="hero__highlight">{text}</span>
                <span className="hero__caret" />
              </span>
            </span>
          </h1>

          <div className="hero__aside">
            <p className="hero__lede reveal">
              Award winning production house and marketing agency built by
              the operators, creators, and strategists themselves.
            </p>
            <div className="hero__actions">
              <Link
                href="/contact/"
                className="pill pill--light reveal magnetic"
                data-track="cta_click"
                data-cta-location="hero"
              >
                Start a conversation
                <span className="pill__arrow" aria-hidden="true">
                  <Arrow />
                </span>
              </Link>
              <Link
                href="/work/production/"
                className="pill pill--ghost reveal magnetic"
                data-track="cta_click"
                data-cta-location="hero"
              >
                See the work
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
