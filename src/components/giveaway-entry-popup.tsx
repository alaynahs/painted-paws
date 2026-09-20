"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import PawIcon from "@/components/paw-icon";

const DISMISSED_KEY = "giveaway-popup-dismissed";

export default function GiveawayEntryPopup() {
  const pathname = usePathname();
  const router = useRouter();
  const [show, setShow] = useState(false);

  useEffect(() => {
    // No need to nudge someone toward the giveaway page while they're
    // already looking right at it.
    if (pathname === "/giveaway") return;

    let alreadySeen = false;
    try {
      alreadySeen = localStorage.getItem(DISMISSED_KEY) === "1";
    } catch {
      // Storage unavailable (private window, blocked, etc.) — just show it.
    }
    if (alreadySeen) return;
    const timer = setTimeout(() => setShow(true), 1200);
    return () => clearTimeout(timer);
  }, [pathname]);

  function dismiss() {
    setShow(false);
    try {
      localStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      // Nothing to do if storage isn't available.
    }
  }

  function goToForm() {
    dismiss();
    router.push("/giveaway#giveaway-form");
  }

  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 px-6"
      onClick={dismiss}
    >
      <div
        className="relative w-full max-w-sm rounded-2xl border-2 border-accent bg-card p-6 text-center shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          aria-label="Close"
          onClick={dismiss}
          className="absolute top-3 right-3 flex h-7 w-7 items-center justify-center rounded-full text-lg text-muted hover:bg-accent-tint"
        >
          ×
        </button>
        <div className="flex justify-center gap-2 text-2xl">🎉</div>
        <p className="mt-2 font-serif text-lg text-foreground">
          If you haven&apos;t already, sign up for our giveaway!
        </p>
        <p className="mt-1 text-sm text-muted">
          6 free grooms, plus 5 runner-up prizes. It only takes a minute.
        </p>
        <button
          type="button"
          onClick={goToForm}
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-accent px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-dark"
        >
          <PawIcon className="h-4 w-4" />
          Enter to Win
        </button>
      </div>
    </div>
  );
}
