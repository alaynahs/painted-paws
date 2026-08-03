import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import AuthStatus from "@/components/auth-status";
import AdminNavLinks from "@/components/admin-nav-links";
import DecorativeBackground from "@/components/decorative-background";
import PromoBanner from "@/components/promo-banner";
import { isCurrentUserAdmin } from "@/lib/supabase/is-admin";

const heading = Fraunces({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
});

const body = Inter({
  variable: "--font-body",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
  ),
  title: "Painted Paws | Boutique Dog Grooming in Austin, TX",
  description:
    "One-on-one, in-home dog grooming in Austin, TX. No kennels, no crowds. Just your dog and a dedicated groomer, by appointment.",
  openGraph: {
    title: "Painted Paws | Boutique Dog Grooming in Austin, TX",
    description:
      "One-on-one, in-home dog grooming in Austin, TX. No kennels, no crowds. Just your dog and a dedicated groomer, by appointment.",
    images: [{ url: "/og-image.jpg", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Painted Paws | Boutique Dog Grooming in Austin, TX",
    description:
      "One-on-one, in-home dog grooming in Austin, TX. No kennels, no crowds. Just your dog and a dedicated groomer, by appointment.",
    images: ["/og-image.jpg"],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isAdmin = await isCurrentUserAdmin();
  return (
    <html
      lang="en"
      className={`${heading.variable} ${body.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{if(localStorage.getItem('theme')==='dark'){document.documentElement.dataset.theme='dark';}}catch(e){}",
          }}
        />
        <DecorativeBackground />
        <PromoBanner />
        <SiteHeader
          isAdmin={isAdmin}
          authSlotDesktop={
            <AuthStatus className="whitespace-nowrap text-xs text-foreground/80 transition-colors hover:text-accent-dark lg:text-sm" />
          }
          authSlotMobile={
            <AuthStatus className="rounded-lg px-2 py-3 text-base text-foreground/90 hover:bg-accent-tint" />
          }
          adminSlotDesktop={
            <AdminNavLinks
              className="flex shrink-0 items-center gap-2.5 border-l border-border pl-3 lg:gap-4 lg:pl-4"
              linkClassName="whitespace-nowrap text-xs font-medium text-accent-dark transition-colors hover:text-accent lg:text-sm"
            />
          }
          adminSlotMobile={
            <AdminNavLinks
              className="mt-4 flex flex-col gap-1 border-t border-border pt-4"
              linkClassName="block rounded-lg px-2 py-3 text-base font-medium text-accent-dark hover:bg-accent-tint"
            />
          }
        />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
