import { SALES_TAX_PERCENT } from "@/lib/pricing/pricing";

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  unpaid: "Unpaid",
  deposit_paid: "Deposit paid",
  paid: "Paid",
  refunded: "Refunded",
};

// A read-only summary of what's already stored on the appointment — not a
// live calculator (that's still BookingFlow, behind the edit toggle). Just
// "what does this visit cost and what's the payment status," at a glance.
export default function PriceBreakdownCard({
  price,
  salesTax,
  paymentStatus,
  amountPaid,
}: {
  price: number;
  salesTax: number;
  paymentStatus: string;
  amountPaid: number;
}) {
  const subtotal = Math.round((price - salesTax) * 100) / 100;

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium uppercase tracking-wide text-accent-dark">
          Price
        </h2>
        <span
          className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
            paymentStatus === "paid"
              ? "bg-accent-tint text-accent-dark"
              : "bg-background text-muted"
          }`}
        >
          {PAYMENT_STATUS_LABELS[paymentStatus] ?? paymentStatus}
        </span>
      </div>
      <div className="mt-3 space-y-1 text-sm text-foreground/80">
        <div className="flex items-baseline justify-between">
          <span>Subtotal</span>
          <span>${subtotal}</span>
        </div>
        <div className="flex items-baseline justify-between">
          <span>Sales tax ({SALES_TAX_PERCENT}%)</span>
          <span>${salesTax}</span>
        </div>
        <div className="flex items-baseline justify-between border-t border-border/60 pt-2">
          <span className="font-serif text-base text-foreground">Total</span>
          <span className="font-serif text-2xl text-accent-dark">${price}</span>
        </div>
      </div>
      {paymentStatus === "deposit_paid" && (
        <p className="mt-2 text-xs text-muted">
          ${amountPaid} paid of ${price} — $
          {Math.round((price - amountPaid) * 100) / 100} remaining
        </p>
      )}
    </section>
  );
}
