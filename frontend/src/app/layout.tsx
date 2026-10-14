import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Outfit } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { MobileNav } from "@/components/layout/MobileNav";
import { Providers } from "@/components/providers";
import { SITE_CONFIG } from "@/lib/constants";

const sansFont = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const displayFont = Outfit({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: `${SITE_CONFIG.name} — Discover & Track Anime`,
    template: `%s | ${SITE_CONFIG.name}`,
  },
  description: SITE_CONFIG.description,
  keywords: ["anime", "tracker", "anilist", "streaming", "manga", "watchlist", "otaku"],
  authors: [{ name: SITE_CONFIG.author }],
  openGraph: {
    title: SITE_CONFIG.name,
    description: SITE_CONFIG.description,
    siteName: SITE_CONFIG.name,
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${sansFont.variable} ${displayFont.variable} dark`}>
      <body className="min-h-screen bg-[#0a0a0c] text-zinc-100 flex flex-col font-sans selection:bg-[var(--accent)] selection:text-white antialiased">
        <Providers>
          <Navbar />
          <main className="flex-1 w-full relative z-10 overflow-x-clip">{children}</main>
          <Footer />
          <MobileNav />
        </Providers>
      </body>
    </html>
  );
}
