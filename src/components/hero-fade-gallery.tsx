"use client";

import { useEffect, useRef, useState } from "react";
import PawIcon from "./paw-icon";

export interface GalleryItem {
  src?: string;
  caption: string;
}

const DEFAULT_ITEMS: GalleryItem[] = [
  { src: "/portfolio/poodle-breed-standard.jpg", caption: "Standard Poodle · Bath & Full Groom" },
  { src: "/portfolio/bath-time.jpg", caption: "Aussiedoodle · In the Tub" },
  { src: "/portfolio/bichon-frise.jpg", caption: "Bichon Frise · Bath & Full Groom" },
  { src: "/portfolio/maltese.jpg", caption: "Maltese Mix · Bath & Full Groom" },
  { src: "/portfolio/husky-face.jpg", caption: "Husky · De-Shed Treatment" },
  { src: "/portfolio/corgi.jpg", caption: "Corgi · Bath & Blowout" },
  { src: "/portfolio/toy-poodle.jpg", caption: "Mini Goldendoodle · Bath & Full Groom" },
  { src: "/portfolio/australian-shepherd.jpg", caption: "Australian Shepherd · Bath & Blowout" },
  { src: "/portfolio/sheltie-mix.jpg", caption: "Mini Australian Shepherd · Bath & Brush" },
];

export default function HeroFadeGallery({
  items = DEFAULT_ITEMS,
}: {
  items?: GalleryItem[];
}) {
  const [index, setIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % items.length);
    }, 3500);
    return () => clearInterval(id);
  }, [items.length]);

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    const SWIPE_THRESHOLD = 40;
    if (deltaX > SWIPE_THRESHOLD) {
      setIndex((i) => (i - 1 + items.length) % items.length);
    } else if (deltaX < -SWIPE_THRESHOLD) {
      setIndex((i) => (i + 1) % items.length);
    }
    touchStartX.current = null;
  }

  return (
    <div
      className="relative aspect-square w-full touch-pan-y overflow-hidden rounded-3xl border border-border bg-card"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {items.map((item, i) => (
        <div
          key={i}
          aria-hidden={i !== index}
          className={`absolute inset-0 flex flex-col items-center justify-center gap-3 bg-accent-tint transition-opacity duration-1000 ease-in-out ${
            i === index ? "opacity-100" : "opacity-0"
          }`}
        >
          {item.src ? (
            // eslint-disable-next-line @next/next/no-img-element -- dynamic portfolio photos, not known at build time
            <img
              src={item.src}
              alt={item.caption}
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <>
              <PawIcon className="h-10 w-10 text-accent-dark/40" />
              <span className="px-6 text-center text-sm text-muted">
                {item.caption}
              </span>
            </>
          )}
        </div>
      ))}

      <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-1.5">
        {items.map((_, i) => (
          <span
            key={i}
            className={`h-1.5 w-1.5 rounded-full transition-colors ${
              i === index ? "bg-accent" : "bg-white/60"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
