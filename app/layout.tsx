import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CookieConsentBanner } from "@/components/marketing/cookie-consent-banner";
import { GoogleAnalytics } from "@/components/marketing/google-analytics";
import { SITE_URL } from "@/lib/utils/site-url";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const title = "Formation — Esports Team Management Software";
const description =
  "Formation is esports team management software for scheduling, rosters, availability, and recruitment — built for competitive organizations.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: title, template: "%s | Formation" },
  description,
  robots: { index: true, follow: true },
  openGraph: {
    title,
    description,
    url: SITE_URL,
    siteName: "Formation",
    type: "website",
    images: [{ url: "/marketing/preview-dashboard.png", width: 1440, height: 960, alt: "The Formation dashboard" }],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/marketing/preview-dashboard.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <TooltipProvider>
            {children}
            <Toaster richColors position="top-right" />
            <CookieConsentBanner />
          </TooltipProvider>
        </ThemeProvider>
        <GoogleAnalytics />
      </body>
    </html>
  );
}
