import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import AuthStatus from "@/components/auth-status";
import DecorativeBackground from "@/components/decorative-background";

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
  title: "Painted Paws | Boutique Dog Grooming in Austin, TX",
  description:
    "One-on-one, in-home dog grooming in Austin, TX. No kennels, no crowds — just your dog and a dedicated groomer, by appointment.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
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
        <SiteHeader
          authSlotDesktop={
            <AuthStatus className="text-sm text-foreground/80 transition-colors hover:text-accent-dark" />
          }
          authSlotMobile={
            <AuthStatus className="block py-2 text-sm text-foreground/80" />
          }
        />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
