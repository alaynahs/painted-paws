import Image from "next/image";
import Link from "next/link";
import {
  BUSINESS_PHONE_DISPLAY,
  BUSINESS_PHONE_TEL,
} from "@/lib/notifications/templates";

export default function SiteFooter() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid gap-10 sm:grid-cols-3">
          <div>
            <div className="flex items-center gap-2.5">
              <Image
                src="/logo.png"
                alt="Painted Paws"
                width={27}
                height={36}
                className="h-9 w-auto"
              />
              <p className="font-serif text-lg italic text-foreground">
                Painted Paws
              </p>
            </div>
            <p className="mt-2 text-sm text-muted">
              Boutique in-home dog grooming.
              <br />
              Austin, TX
            </p>
          </div>

          <div>
            <p className="text-sm font-medium text-foreground">Explore</p>
            <ul className="mt-2 space-y-2 text-sm text-muted">
              <li>
                <Link href="/services" className="hover:text-accent-dark">
                  Services
                </Link>
              </li>
              <li>
                <Link href="/portfolio" className="hover:text-accent-dark">
                  Portfolio
                </Link>
              </li>
              <li>
                <Link href="/membership" className="hover:text-accent-dark">
                  Membership
                </Link>
              </li>
              <li>
                <Link href="/book" className="hover:text-accent-dark">
                  Book Now
                </Link>
              </li>
              <li>
                <Link href="/faq" className="hover:text-accent-dark">
                  FAQ
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <p className="text-sm font-medium text-foreground">
              Good to know
            </p>
            <p className="mt-2 text-sm text-muted">
              By appointment only. No walk-ins. Curbside hand-off: text on
              arrival and we&apos;ll meet you outside.
            </p>
            <p className="mt-4 text-sm text-muted">
              Questions? Call or text{" "}
              <a
                href={`tel:${BUSINESS_PHONE_TEL}`}
                className="text-accent-dark hover:underline"
              >
                {BUSINESS_PHONE_DISPLAY}
              </a>
              , or email{" "}
              <a
                href="mailto:booking@paintedpawsaustin.com"
                className="text-accent-dark hover:underline"
              >
                booking@paintedpawsaustin.com
              </a>
            </p>
            <p className="mt-2 text-sm text-muted">
              <a
                href="https://www.facebook.com/profile.php?id=61592446209105"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent-dark hover:underline"
              >
                Follow us on Facebook
              </a>
            </p>
            <p className="mt-2 text-sm text-muted">
              <a
                href="https://www.instagram.com/paintedpawsaustin"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent-dark hover:underline"
              >
                Follow us on Instagram
              </a>
            </p>
            {/* TODO: replace with the real YouTube channel URL */}
            <p className="mt-2 text-sm text-muted">
              <a
                href="#"
                className="text-accent-dark hover:underline"
              >
                Subscribe on YouTube
              </a>
            </p>
          </div>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-6 text-xs text-muted">
          <p>© {new Date().getFullYear()} Painted Paws. All rights reserved.</p>
          <Link href="/privacy" className="hover:text-accent-dark">
            Privacy Policy
          </Link>
        </div>
      </div>
    </footer>
  );
}
