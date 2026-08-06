"use client";

import { useEffect, useState } from "react";
import { getUnannouncedCoupon, markCouponAnnounced } from "@/lib/coupons/actions";

export default function CouponAnnouncement() {
  const [coupon, setCoupon] = useState<{
    id: string;
    discountPercent: number | null;
    discountAmount: number | null;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    getUnannouncedCoupon().then((c) => {
      if (!cancelled) setCoupon(c);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!coupon) return null;

  function dismiss() {
    markCouponAnnounced(coupon!.id);
    setCoupon(null);
  }

  const discountLabel =
    coupon.discountPercent != null
      ? `${coupon.discountPercent}% off`
      : `$${coupon.discountAmount} off`;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4"
      onClick={dismiss}
    >
      <div
        className="w-full max-w-sm rounded-3xl border border-border bg-card p-8 text-center shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-2xl tracking-widest">🐾&nbsp;&nbsp;🫧&nbsp;&nbsp;🐾</div>
        <h2 className="mt-4 font-serif text-2xl text-foreground">
          You&apos;ve got a coupon!
        </h2>
        <p className="mt-3 text-muted">
          Enjoy{" "}
          <span className="font-semibold text-accent-dark">
            {discountLabel}
          </span>{" "}
          at your next visit.
        </p>
        <p className="mt-1 text-xs text-muted">
          Just select it at checkout when you book — no code needed.
        </p>
        <button
          type="button"
          onClick={dismiss}
          className="mt-6 rounded-full bg-accent px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-dark"
        >
          Yay, thank you! 🐾
        </button>
      </div>
    </div>
  );
}
