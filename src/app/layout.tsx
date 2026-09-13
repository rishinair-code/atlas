import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Atlas — Plan your next adventure",
  description:
    "Discover places, plan weather-aware itineraries, budget every trip, and keep a lifetime travel timeline.",
};

export const viewport: Viewport = {
  themeColor: "#020617",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh flex flex-col">
        <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0 z-20">
          <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
            <a href="/" className="font-semibold tracking-tight text-lg">
              🧭 Atlas
            </a>
            <nav className="flex gap-5 text-sm text-slate-300">
              <a href="/" className="hover:text-white">
                Home
              </a>
              <a href="/explore" className="hover:text-white">
                Explore
              </a>
            </nav>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-slate-800 py-6 text-center text-xs text-slate-500">
          Atlas — separate project, separate database. 🧭
        </footer>
      </body>
    </html>
  );
}
