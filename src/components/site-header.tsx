"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import BackButton from "@/components/back-button";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/services", label: "Services" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/membership", label: "Membership" },
  { href: "/faq", label: "FAQ" },
];

export default function SiteHeader({
  authSlotDesktop,
  authSlotMobile,
  adminSlotDesktop,
  adminSlotMobile,
  isAdmin = false,
}: {
  authSlotDesktop: ReactNode;
  authSlotMobile: ReactNode;
  adminSlotDesktop: ReactNode;
  adminSlotMobile: ReactNode;
  isAdmin?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
    <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-6 py-4">
        <BackButton />
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2.5"
          onClick={() => setOpen(false)}
        >
          <Image
            src="/logo.png"
            alt="Painted Paws"
            width={30}
            height={40}
            className="h-8 w-auto lg:h-10"
            priority
          />
          <span className="font-serif text-lg italic tracking-tight text-foreground lg:text-xl">
            Painted Paws
          </span>
        </Link>

        <nav
          className={`hidden min-w-0 flex-1 items-center justify-end md:flex ${
            isAdmin ? "gap-2 lg:gap-3" : "gap-2.5 lg:gap-4"
          }`}
        >
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`whitespace-nowrap text-foreground/80 transition-colors hover:text-accent-dark ${
                isAdmin ? "text-xs lg:text-sm" : "text-sm lg:text-base"
              }`}
            >
              {link.label}
            </Link>
          ))}
          {authSlotDesktop}
          {adminSlotDesktop}
          {!isAdmin && (
            <Link
              href="/book"
              className="shrink-0 rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent-dark lg:px-5 lg:py-2 lg:text-base"
            >
              Book Now
            </Link>
          )}
        </nav>

        <button
          type="button"
          className="relative z-10 ml-auto flex h-10 w-10 shrink-0 flex-col items-center justify-center gap-1.5 md:hidden"
          aria-label="Toggle menu"
          aria-expanded={open}
          onClick={() => setOpen(true)}
        >
          <span className="h-0.5 w-6 bg-foreground" />
          <span className="h-0.5 w-6 bg-foreground" />
          <span className="h-0.5 w-6 bg-foreground" />
        </button>
      </div>
    </header>

    <div
      className={`fixed inset-0 z-[100] md:hidden ${open ? "" : "pointer-events-none"}`}
      aria-hidden={!open}
    >
      <div
        className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ease-in-out ${
          open ? "opacity-100" : "opacity-0"
        }`}
        onClick={() => setOpen(false)}
      />
      <div
        className={`absolute top-0 right-0 flex h-full w-72 max-w-[80vw] flex-col overflow-y-auto bg-background p-6 shadow-xl transition-transform duration-300 ease-in-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="font-serif text-lg italic text-foreground">
            Menu
          </span>
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="flex h-9 w-9 items-center justify-center rounded-full text-xl text-foreground/80 hover:bg-accent-tint"
          >
            ×
          </button>
        </div>

        <nav className="mt-6 flex flex-col gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-lg px-2 py-3 text-base text-foreground/90 hover:bg-accent-tint"
              onClick={() => setOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <div className="contents" onClick={() => setOpen(false)}>
            {authSlotMobile}
          </div>
        </nav>

        <div onClick={() => setOpen(false)}>{adminSlotMobile}</div>

        <Link
          href="/book"
          className="mt-6 rounded-full bg-accent px-5 py-3 text-center text-sm font-medium text-white"
          onClick={() => setOpen(false)}
        >
          Book Now
        </Link>
      </div>
    </div>
    </>
  );
}
