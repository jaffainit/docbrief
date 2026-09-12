import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Nav } from "@/components/Nav";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = "https://docbrief.wedgewerks.win";
const title = "DocBrief — Short YouTube documentaries without an editor";
const description =
  "A WedgeWerks™ product — brief → polished script, TTS voiceover, B-roll placeholders, captions, downloadable MP4.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title,
  description,
  applicationName: "DocBrief",
  authors: [{ name: "WedgeWerks" }],
  keywords: [
    "YouTube documentary",
    "faceless YouTube",
    "TTS captions",
    "short documentary",
    "WedgeWerks",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: "DocBrief",
    title,
    description,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={geistSans.variable + " " + geistMono.variable + " h-full antialiased"}
    >
      <body className="flex min-h-full flex-col bg-slate-50 text-slate-900">
        <Nav />
        <main className="flex-1">{children}</main>
        <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-400">
          <p>A WedgeWerks™ product · DocBrief</p>
          <p className="mt-2 space-x-3">
            <a href="/privacy" className="hover:text-slate-600 hover:underline">
              Privacy
            </a>
            <span aria-hidden="true">·</span>
            <a href="/terms" className="hover:text-slate-600 hover:underline">
              Terms
            </a>
          </p>
        </footer>
      </body>
    </html>
  );
}
