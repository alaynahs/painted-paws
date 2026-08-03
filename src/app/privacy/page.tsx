export const metadata = {
  title: "Privacy Policy | Painted Paws",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <p className="text-sm font-medium tracking-wide text-accent-dark uppercase">
        Legal
      </p>
      <h1 className="mt-3 font-serif text-3xl text-foreground">
        Privacy Policy
      </h1>
      <p className="mt-2 text-sm text-muted">Last updated: July 2026</p>

      <div className="mt-8 space-y-8 text-sm text-foreground/90">
        <section>
          <h2 className="font-serif text-lg text-foreground">
            What We Collect
          </h2>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-muted">
            <li>Contact info: your name, phone number, and email</li>
            <li>
              Pet info: name, breed, weight, coat type, birth date,
              health/behavioral notes, and rabies vaccination records
            </li>
            <li>
              Appointment details: services booked, notes for your groomer,
              and photos you upload for haircut inspiration
            </li>
            <li>
              Payment status (whether an appointment is paid or unpaid). We
              do not store your card number; payments are processed securely
              by Stripe
            </li>
            <li>
              Photos of your pet, only if you opt in via the waiver&apos;s
              photo consent checkbox
            </li>
          </ul>
        </section>

        <section>
          <h2 className="font-serif text-lg text-foreground">
            How We Use It
          </h2>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-muted">
            <li>To schedule and manage your appointments</li>
            <li>
              To send booking confirmations, appointment reminders, and
              pickup updates by email and text
            </li>
            <li>To process payments through Stripe</li>
            <li>
              To follow up after your visit (review requests, rebooking
              reminders) and, if you&apos;ve opted in, occasional
              marketing/photo use
            </li>
          </ul>
        </section>

        <section>
          <h2 className="font-serif text-lg text-foreground">
            Text Messages (SMS)
          </h2>
          <p className="mt-3 text-muted">
            By providing your phone number, you consent to receive
            appointment-related texts (confirmations, reminders, pickup
            updates). Message frequency varies. Message and data rates may
            apply. Reply STOP to a text at any time to opt out.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-lg text-foreground">
            Who We Share Data With
          </h2>
          <p className="mt-3 text-muted">
            We use trusted third-party services to run the business:
            Supabase (data storage), Stripe (payments), Resend (email), and
            Twilio (text messages). Each only receives what they need to do
            their job (e.g., Stripe never sees your pet&apos;s name; Twilio
            never sees your payment info).
          </p>
        </section>

        <section>
          <h2 className="font-serif text-lg text-foreground">
            Your Choices
          </h2>
          <p className="mt-3 text-muted">
            You can update or delete your contact and pet info anytime from
            your account, and opt out of texts by replying STOP. To request
            full account deletion, email us.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-lg text-foreground">Security</h2>
          <p className="mt-3 text-muted">
            Your data is stored with industry-standard encryption and access
            controls. We never sell your information.
          </p>
        </section>

        <section>
          <h2 className="font-serif text-lg text-foreground">Contact</h2>
          <p className="mt-3 text-muted">
            Questions about this policy? Email{" "}
            <a
              href="mailto:booking@paintedpawsaustin.com"
              className="text-accent-dark hover:underline"
            >
              booking@paintedpawsaustin.com
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
