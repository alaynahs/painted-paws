import Image from "next/image";
import Link from "next/link";

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
                width={40}
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
            </ul>
          </div>

          <div>
            <p className="text-sm font-medium text-foreground">
              Good to know
            </p>
            <p className="mt-2 text-sm text-muted">
              By appointment only — no walk-ins. Curbside hand-off: text on
              arrival and we&apos;ll meet you outside.
            </p>
            <p className="mt-4 text-sm text-muted">
              Questions? Email us at{" "}
              <a
                href="mailto:booking@paintedpawsaustin.com"
                className="text-accent-dark hover:underline"
              >
                booking@paintedpawsaustin.com
              </a>
            </p>
            {/* TODO: replace with the real Instagram handle URL */}
            <p className="mt-2 text-sm text-muted">
              <a
                href="#"
                className="text-accent-dark hover:underline"
              >
                Follow us on Instagram
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
