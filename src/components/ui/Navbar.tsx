import Link from "next/link";
import { TrendingUp, Upload } from "lucide-react";

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/8 bg-[#0f1117]/80 backdrop-blur-xl">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20 border border-emerald-500/30 group-hover:bg-emerald-500/30 transition-colors">
            <TrendingUp className="h-4 w-4 text-emerald-400" aria-hidden />
          </div>
          <div>
            <span className="font-bold text-white tracking-tight">
              Sulistiyo Cepet Sugih
            </span>
            <span className="ml-2 hidden text-xs font-normal text-gray-500 sm:inline">
              IDX Screener
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="text-sm text-gray-400 transition hover:text-gray-200"
          >
            Dashboard
          </Link>
          <Link
            href="/import"
            className="flex items-center gap-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 hover:bg-emerald-500/30 px-3.5 py-2 text-sm font-medium text-emerald-300 transition-all"
          >
            <Upload className="h-3.5 w-3.5" aria-hidden />
            Import Data
          </Link>
        </div>
      </nav>
    </header>
  );
}
