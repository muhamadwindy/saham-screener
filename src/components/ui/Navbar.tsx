import Link from "next/link";
import { TrendingUp, Upload } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur-xl dark:border-white/8 dark:bg-[#0f1117]/80">
      <nav className="mx-auto flex max-w-[1680px] items-center justify-between px-4 py-3.5 sm:px-6 xl:px-8">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 border border-emerald-200 group-hover:bg-emerald-200 transition-colors dark:bg-emerald-500/20 dark:border-emerald-500/30 dark:group-hover:bg-emerald-500/30">
            <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden />
          </div>
          <div>
            <span className="font-bold text-slate-900 tracking-tight dark:text-white">
              Sulistiyo Cepet Sugih
            </span>
            <span className="ml-2 hidden text-xs font-normal text-slate-400 sm:inline dark:text-gray-500">
              IDX Screener
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            href="/"
            className="text-sm text-slate-500 transition hover:text-slate-900 dark:text-gray-400 dark:hover:text-gray-200"
          >
            Dashboard
          </Link>
          <Link
            href="/import"
            className="flex items-center gap-1.5 rounded-xl bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 px-3.5 py-2 text-sm font-medium text-emerald-700 transition-all dark:bg-emerald-500/20 dark:border-emerald-500/30 dark:hover:bg-emerald-500/30 dark:text-emerald-300"
          >
            <Upload className="h-3.5 w-3.5" aria-hidden />
            Import Data
          </Link>
        </div>
      </nav>
    </header>
  );
}
