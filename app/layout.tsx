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

export const metadata: Metadata = {
  title: "DocBrief — Short YouTube documentaries without an editor",
  description:
    "A WedgeWerks™ product — brief → polished script, TTS voiceover, B-roll placeholders, captions, downloadable MP4 or asset zip.",
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
          A WedgeWerks™ product · DocBrief
        </footer>
      </body>
    </html>
  );
}
