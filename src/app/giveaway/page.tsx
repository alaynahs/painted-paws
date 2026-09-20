import PawIcon from "@/components/paw-icon";
import RevealOnScroll from "@/components/reveal-on-scroll";
import GiveawayCountdown from "@/components/giveaway-countdown";
import GiveawayEntryPopup from "@/components/giveaway-entry-popup";
import {
  BUSINESS_NAME,
  BUSINESS_PHONE_DISPLAY,
  BUSINESS_PHONE_TEL,
} from "@/lib/notifications/templates";
import { centralWallClockToInstant } from "@/lib/format";
import { submitGiveawayEntry } from "@/app/giveaway/actions";

const ENTRY_DEADLINE_ISO = centralWallClockToInstant(
  "2026-09-25",
  23,
  59,
).toISOString();

export default async function GiveawayPage({
  searchParams,
}: {
  searchParams: Promise<{ entered?: string; error?: string }>;
}) {
  const { entered, error } = await searchParams;

  return (
    <div>
      <GiveawayEntryPopup />
      <div aria-hidden className="fixed inset-0 -z-20 bg-white" />
      <section className="mx-auto max-w-3xl px-6 pt-16 pb-10 text-center">
        <p className="text-sm font-semibold tracking-widest text-accent-dark uppercase">
          🎉 Giveaway 🎉
        </p>
        <h1 className="mt-3 font-serif text-4xl tracking-tight text-foreground sm:text-5xl">
          A Year of Free Grooms
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-muted">
          We&apos;re pampering one lucky pup for an entire year! Enter for a
          chance to win <strong>6 free Full-Service Grooming Sessions</strong>,
          customized to your pet&apos;s breed, weight, and coat needs, all
          year long. Plus, 5 runners-up will each win a prize of their own.
        </p>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-sm text-muted">
          <span className="rounded-full bg-pastel-yellow/70 px-3 py-1 font-semibold text-foreground/85">
            🐾 6 Free Grooms
          </span>
          <span className="rounded-full bg-pastel-mint/70 px-3 py-1 font-semibold text-foreground/85">
            💰 Up to $1,000 Value
          </span>
          <span className="rounded-full bg-pastel-pink/70 px-3 py-1 font-semibold text-foreground/85">
            🎁 +5 Runner-Up Prizes
          </span>
          <span className="rounded-full bg-pastel-lavender/70 px-3 py-1 font-semibold text-foreground/85">
            📅 Entries Close Sept 25
          </span>
        </div>

        <GiveawayCountdown deadlineIso={ENTRY_DEADLINE_ISO} />
      </section>

      <section id="giveaway-form" className="mx-auto max-w-xl px-6 pb-16">
        {entered && (
          <p className="mb-6 rounded-xl border border-accent/40 bg-accent-tint px-4 py-3 text-center text-sm font-medium text-foreground">
            🎉 You&apos;re entered! We&apos;ll reach out if your pup wins.
          </p>
        )}
        {error && (
          <p className="mb-6 rounded-xl border border-border bg-accent-tint px-4 py-3 text-center text-sm text-foreground">
            {error}
          </p>
        )}

        <RevealOnScroll className="rounded-2xl border-2 border-accent bg-card p-6 sm:p-8">
          <div className="flex items-center gap-2">
            <PawIcon className="h-5 w-5 text-accent-dark" />
            <h2 className="font-serif text-xl text-foreground">
              Enter to Win
            </h2>
          </div>
          <p className="mt-1 text-xs text-muted">
            Just share a few details about you and your furry friend below.
          </p>

          <form action={submitGiveawayEntry} className="mt-5 space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground" htmlFor="fullName">
                Your Name
              </label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                required
                className="mt-1.5 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:border-accent-dark"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-foreground" htmlFor="email">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  className="mt-1.5 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:border-accent-dark"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground" htmlFor="phone">
                  Phone
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  required
                  className="mt-1.5 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:border-accent-dark"
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-foreground" htmlFor="petName">
                  Pet&apos;s Name
                </label>
                <input
                  id="petName"
                  name="petName"
                  type="text"
                  required
                  className="mt-1.5 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:border-accent-dark"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground" htmlFor="breed">
                  Breed
                </label>
                <input
                  id="breed"
                  name="breed"
                  type="text"
                  required
                  className="mt-1.5 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:border-accent-dark"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground" htmlFor="zipCode">
                Zip Code
              </label>
              <input
                id="zipCode"
                name="zipCode"
                type="text"
                inputMode="numeric"
                required
                className="mt-1.5 w-full max-w-[10rem] rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:border-accent-dark"
              />
            </div>

            <label className="flex items-start gap-2.5 text-sm text-muted">
              <input
                type="checkbox"
                name="promoOptOut"
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-border text-accent focus:ring-accent-dark"
              />
              No, I do not want to receive occasional promotional emails from{" "}
              {BUSINESS_NAME}.
            </label>

            <button
              type="submit"
              className="w-full rounded-full bg-accent px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-accent-dark"
            >
              🐾 Enter to Win
            </button>
          </form>
        </RevealOnScroll>

        <details className="mt-8 rounded-xl border border-border bg-card p-5 text-xs text-muted">
          <summary className="cursor-pointer text-sm font-medium text-foreground">
            Official Rules
          </summary>
          <div className="mt-3 space-y-2">
            <p>
              <strong className="text-foreground/90">Sponsor:</strong> This
              giveaway is conducted by {BUSINESS_NAME}. Questions can be
              directed to{" "}
              <a
                href={`tel:${BUSINESS_PHONE_TEL}`}
                className="text-accent-dark hover:underline"
              >
                {BUSINESS_PHONE_DISPLAY}
              </a>{" "}
              or{" "}
              <a
                href="mailto:booking@paintedpawsaustin.com"
                className="text-accent-dark hover:underline"
              >
                booking@paintedpawsaustin.com
              </a>
              .
            </p>
            <p>NO PURCHASE NECESSARY. Making a purchase will not increase your chances of winning.</p>
            <p>
              <strong className="text-foreground/90">Eligibility:</strong> Open
              to Texas residents who are 18 years of age or older at the time
              of entry.
            </p>
            <p>
              <strong className="text-foreground/90">Timeline:</strong>{" "}
              Giveaway begins on September 20, 2026, and all entries must be
              submitted by September 25, 2026, at 11:59 PM CST.
            </p>
            <p>
              <strong className="text-foreground/90">The Prize:</strong> One
              (1) Grand Prize consisting of six (6) Full-Service Pet Grooming
              Sessions customized to the winning pet&apos;s breed and weight.
              Maximum Approximate Retail Value (ARV) is up to $1,000 total.
              Prize is non-transferable, cannot be redeemed for cash, and all
              6 grooms must be used within 12 months of the drawing date.
              Five (5) Runner-Up Prizes will also be awarded, each with an
              Approximate Retail Value (ARV) of up to $40. Runner-up prizes
              are non-transferable and cannot be redeemed for cash.
            </p>
            <p>
              <strong className="text-foreground/90">Minimum Entries:</strong>{" "}
              This giveaway requires a minimum of 50 valid entries. If fewer
              than 50 entries are received by the deadline, no winners will
              be selected and no prizes will be awarded.
            </p>
            <p>
              <strong className="text-foreground/90">Winner Selection:</strong>{" "}
              One Grand Prize winner and five (5) Runner-Up winners will be
              randomly selected from all valid form entries and notified
              directly via phone or email on September 28, 2026.
            </p>
            <p>
              <strong className="text-foreground/90">
                Winner Verification &amp; Alternate Winners:
              </strong>{" "}
              Potential winners must respond within 5 days of the first
              attempted contact to claim their prize. If a potential winner
              cannot be reached, does not respond in time, does not meet the
              eligibility requirements above, declines the prize, or if{" "}
              {BUSINESS_NAME} determines it cannot safely perform the
              grooming services on the winning pet, that entry will be
              disqualified and an alternate winner will be randomly selected
              from the remaining valid entries, at {BUSINESS_NAME}&apos;s
              sole discretion. {BUSINESS_NAME} will be the only party to
              contact winners to claim their prize — be cautious of any other
              communication claiming to be related to this giveaway.
            </p>
            <p>
              <strong className="text-foreground/90">
                Disqualification &amp; Technical Issues:
              </strong>{" "}
              {BUSINESS_NAME} reserves the right to disqualify any entrant
              who submits fraudulent, incomplete, or duplicate entries, or
              who otherwise fails to comply with these Official Rules.{" "}
              {BUSINESS_NAME} is not responsible for entries that are lost,
              delayed, or not received due to technical problems of any
              kind.
            </p>
            <p>
              <strong className="text-foreground/90">Privacy:</strong>{" "}
              Information collected through this giveaway may be used by{" "}
              {BUSINESS_NAME} to administer the giveaway, contact potential
              winners, and send business updates and promotional emails.
              Entrants may opt out of promotional emails at any time.{" "}
              {BUSINESS_NAME} does not sell your personal information.
            </p>
            <p>
              <strong className="text-foreground/90">Disclaimer:</strong> This
              promotion is in no way sponsored, endorsed, administered by, or
              associated with Instagram or Facebook. By entering, you
              completely release Meta of all liability.
            </p>
          </div>
        </details>
      </section>
    </div>
  );
}
