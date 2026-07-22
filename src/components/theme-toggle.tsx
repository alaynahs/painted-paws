"use client";

import { useSyncExternalStore } from "react";

type Listener = () => void;
let listeners: Listener[] = [];

function getSnapshot() {
  return localStorage.getItem("theme") === "dark";
}

function getServerSnapshot() {
  return false;
}

function subscribe(listener: Listener) {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

function setDarkMode(dark: boolean) {
  localStorage.setItem("theme", dark ? "dark" : "light");
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  listeners.forEach((notify) => notify());
}

export default function ThemeToggle() {
  const dark = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        role="switch"
        aria-checked={dark}
        aria-label="Toggle dark mode"
        onClick={() => setDarkMode(!dark)}
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
          dark ? "bg-accent" : "bg-border"
        }`}
      >
        <span
          className={`absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${
            dark ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
      <span className="text-sm text-foreground/90">
        {dark ? "Dark mode on" : "Dark mode off"}
      </span>
    </div>
  );
}
