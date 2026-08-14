import Link from "next/link";
import PawIcon from "@/components/paw-icon";
import { getActivePromotion } from "@/lib/promotions/actions";
import { getFeaturedCouponCode } from "@/lib/coupons/actions";

function couponBannerText(coupon: {
  code: string;
  discountPercent: number | null;
  discountAmount: number | null;
}): string {
  const discountLabel =
    coupon.discountPercent != null
      ? `${coupon.discountPercent}% off`
      : `$${coupon.discountAmount} off`;
  return `Use code ${coupon.code} for ${discountLabel} — book now!`;
}

export default async function PromoBanner() {
  // An automatic promotion (discounts everyone, no code needed) takes
  // priority if one is running; otherwise fall back to announcing a
  // featured coupon code (discount only unlocks if actually redeemed).
  const promo = await getActivePromotion();
  let message: string | null = promo
    ? promo.bannerMessage ||
      (promo.discountPercent > 0
        ? `Limited-Time Offer: ${promo.discountPercent}% Off Any Groom${
            promo.remaining != null
              ? ` — Only ${promo.remaining} spot${promo.remaining === 1 ? "" : "s"} left, book now`
              : ", book now"
          }`
        : null)
    : null;

  if (!message) {
    const coupon = await getFeaturedCouponCode();
    if (coupon) message = couponBannerText(coupon);
  }

  if (!message) return null;

  return (
    <Link
      href="/book"
      className="flex items-center justify-center gap-2 bg-accent-dark px-4 py-2.5 text-center text-sm font-medium text-white transition-colors hover:bg-accent sm:text-base"
    >
      <PawIcon className="h-4 w-4 shrink-0 sm:h-5 sm:w-5" />
      <span>{message}</span>
      <PawIcon className="h-4 w-4 shrink-0 sm:h-5 sm:w-5" />
    </Link>
  );
}
