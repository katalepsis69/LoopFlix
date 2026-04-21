import type { Metadata, Viewport } from "next";
import { Share_Tech_Mono, VT323 } from "next/font/google";
import "./globals.css";

const shareTechMono = Share_Tech_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: "400",
  display: "swap",
});

const vt323 = VT323({
  subsets: ["latin"],
  variable: "--font-retro",
  weight: "400",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "LoopFlix // Archive",
    template: "%s — LoopFlix",
  },
  description:
    "Archiving cinematic records. Browse, discover, and stream movies and TV series.",
  keywords: [
    "movies",
    "tv shows",
    "streaming",
    "archive",
    "loopflix",
    "cinema",
  ],
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://loopflix.app"
  ),
  openGraph: {
    title: "LoopFlix // Archive",
    description: "Archiving cinematic records.",
    type: "website",
    siteName: "LoopFlix",
  },
  twitter: {
    card: "summary_large_image",
    title: "LoopFlix // Archive",
    description: "Archiving cinematic records.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0a0a0a",
};

import HydrationProvider from '@/components/HydrationProvider';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${shareTechMono.variable} ${vt323.variable}`} suppressHydrationWarning>
      <body className="bg-[#0A0A0A] text-[#B8B8B8] font-mono antialiased" suppressHydrationWarning>
        <HydrationProvider>
          {children}
        </HydrationProvider>
      </body>
    </html>
  );
}
