"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { Horizon } from "@/types";
import { HORIZON_LABELS } from "@/lib/scoring/weights";

const HORIZONS: Horizon[] = ["harian", "3hari", "5hari"];

export function HorizonSelector({ current }: { current: Horizon }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const onChange = (h: Horizon) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("horizon", h);
    router.push(`/?${params.toString()}`);
  };

  return (
    <div className="flex gap-1 rounded-xl border border-slate-200 bg-slate-100/80 p-1 backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
      {HORIZONS.map((h) => (
        <button
          key={h}
          onClick={() => onChange(h)}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
            h === current
              ? "bg-emerald-100 text-emerald-700 border border-emerald-200 shadow-sm dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30 dark:shadow-emerald-500/10"
              : "text-slate-500 hover:text-slate-800 hover:bg-white dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-white/5"
          }`}
        >
          {HORIZON_LABELS[h]}
        </button>
      ))}
    </div>
  );
}
