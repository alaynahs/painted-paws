import Link from "next/link";
import { isCurrentUserAdmin } from "@/lib/supabase/is-admin";

const ADMIN_LINKS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/book", label: "Look Up a Customer" },
  { href: "/admin/photos", label: "Manage Photos" },
  { href: "/admin/pricing", label: "Pricing" },
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
