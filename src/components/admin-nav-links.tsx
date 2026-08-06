import Link from "next/link";
import { isCurrentUserAdmin } from "@/lib/supabase/is-admin";

// Pricing, Manage Photos, and Coupons live as cards on the dashboard
// itself (/admin) instead of cluttering this header/hamburger nav.
const ADMIN_LINKS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/book", label: "Look Up a Customer" },
];

export default async function AdminNavLinks({
  className,
  linkClassName,
}: {
  className?: string;
  linkClassName?: string;
}) {
  const isAdmin = await isCurrentUserAdmin();
  if (!isAdmin) return null;

  return (
    <div className={className}>
      {ADMIN_LINKS.map((link) => (
        <Link key={link.href} href={link.href} className={linkClassName}>
          {link.label}
        </Link>
      ))}
    </div>
  );
}
