// Shared form fields for "% off" vs "$ off" coupons — used by both the
// single-customer and give-to-a-group coupon forms so they can't drift.
export default function CouponDiscountInputs() {
  return (
    <>
      <select
        name="discountType"
        defaultValue="percent"
        className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent-dark"
      >
        <option value="percent">% off</option>
        <option value="amount">$ off</option>
      </select>
      <input
        type="number"
        name="discountValue"
        min={1}
        step={1}
        required
        placeholder="Amount"
        className="w-24 rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent-dark"
      />
      <input
        type="text"
        name="note"
        placeholder="Email subject to customer (optional)"
        className="min-w-[140px] flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent-dark"
      />
    </>
  );
}
