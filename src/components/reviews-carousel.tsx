"use client";

import { useEffect, useState } from "react";
import PawIcon from "@/components/paw-icon";

interface Review {
  quote: string;
  attribution: string;
  rating: number;
}

const AUTO_ADVANCE_MS = 6000;
const FADE_MS = 500;

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      className={`h-4 w-4 ${filled ? "fill-accent-dark" : "fill-border"}`}
    >
      <path d="M10 1.2l2.7 5.7 6.2.6-4.6 4.2 1.3 6.2L10 14.8l-5.6 3.1 1.3-6.2-4.6-4.2 6.2-.6L10 1.2z" />
    </svg>
  );
}

// Auto-advancing, cross-fading testimonial — one review at a time rather
// than a static grid, since a wall of quotes is harder to actually read
// than one at a time.
export default function ReviewsCarousel({ reviews }: { reviews: Review[] }) {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  function goTo(next: number) {
    setVisible(false);
    setTimeout(() => {
      setIndex(next);
      setVisible(true);
    }, FADE_MS);
  }

  useEffect(() => {
    const timer = setInterval(() => {
      goTo((index + 1) % reviews.length);
    }, AUTO_ADVANCE_MS);
    return () => clearInterval(timer);
  }, [index, reviews.length]);

  const current = reviews[index];

  return (
    <div className="mx-auto max-w-2xl text-center">
      <div
        className={`transition-opacity duration-500 motion-reduce:transition-none ${
          visible ? "opacity-100" : "opacity-0"
        }`}
      >
        <PawIcon className="mx-auto h-5 w-5 text-accent-dark" />
        <p className="mt-4 min-h-[5.5rem] font-serif text-xl italic text-foreground sm:text-2xl">
          &ldquo;{current.quote}&rdquo;
        </p>
        <div className="mt-4 flex items-center justify-center gap-1">
          {Array.from({ length: 5 }, (_, i) => (
            <StarIcon key={i} filled={i < current.rating} />
          ))}
        </div>
        <p className="mt-3 text-xs font-medium tracking-wide text-muted uppercase">
          {current.attribution}
        </p>
      </div>

      <div className="mt-8 flex items-center justify-center gap-2">
        {reviews.map((_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Show review ${i + 1} of ${reviews.length}`}
            onClick={() => goTo(i)}
            className={`h-2 w-2 rounded-full transition-colors ${
              i === index ? "bg-accent-dark" : "bg-border"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
