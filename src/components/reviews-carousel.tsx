"use client";

import { useEffect, useState } from "react";

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
      className={`h-3 w-3 ${filled ? "fill-accent-dark" : "fill-border"}`}
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
    <div className="mx-auto max-w-xl text-center">
      <div
        className={`transition-opacity duration-500 motion-reduce:transition-none ${
          visible ? "opacity-100" : "opacity-0"
        }`}
      >
        <div className="flex min-h-[4rem] items-center justify-center sm:min-h-[3.25rem]">
          <p className="font-serif text-base italic leading-snug text-foreground sm:text-lg">
            &ldquo;{current.quote}&rdquo;
          </p>
        </div>
        <div className="mt-2.5 flex items-center justify-center gap-0.5">
          {Array.from({ length: 5 }, (_, i) => (
            <StarIcon key={i} filled={i < current.rating} />
          ))}
        </div>
        <p className="mt-1.5 text-[11px] font-medium tracking-wide text-muted uppercase">
          {current.attribution}
        </p>
      </div>

      <div className="mt-4 flex items-center justify-center gap-1.5">
        {reviews.map((_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Show review ${i + 1} of ${reviews.length}`}
            onClick={() => goTo(i)}
            className={`h-1.5 w-1.5 rounded-full transition-colors ${
              i === index ? "bg-accent-dark" : "bg-border"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
