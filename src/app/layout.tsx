import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/ui/Navbar";

export const metadata: Metadata = {
  title: "Sulistiyo Cepet Sugih — IDX Stock Screener",
  description:
    "Screening saham IDX non-bank syariah untuk konfirmasi entry jangka pendek/swing.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        {/* Prevent flash: set theme class before first paint */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem('theme')||'light';if(t==='dark')document.documentElement.classList.add('dark');})();`,
          }}
        />
      </head>
      <body>
        <Navbar />
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </body>
    </html>
  );
}
