"use client";

import { usePathname, useRouter } from "next/navigation";

export default function BackButton() {
  const router = useRouter();
  const pathname = usePathname();

  if (pathname === "/") return null;

  function handleClick() {
    // If this tab has no prior in-app history (e.g. someone opened a direct
    // link as their first page), history.back() would silently do nothing —
    // fall back to home instead of leaving the button feeling broken.
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push("/");
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label="Go back"
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border text-foreground/80 transition-colors hover:border-accent-dark hover:text-accent-dark"
    >
      ←
    </button>
  );
}
