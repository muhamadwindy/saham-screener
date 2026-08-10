"use client";

import { useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import type { Horizon } from "@/types";
import { HORIZON_LABELS } from "@/lib/scoring/weights";

const HORIZONS: Horizon[] = ["harian", "3hari", "5hari"];

export function HorizonSelector({ current }: { current: Horizon }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const onChange = (h: Horizon) => {
    if (h === current) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("horizon", h);
    startTransition(() => {
      router.push(`/?${params.toString()}`);
    });
  };

  return (
    <div className="flex items-center gap-2">
      {isPending && (
        <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-500 dark:text-emerald-400" aria-label="Memuat" />
      )}
      <div
        aria-busy={isPending}
        className={`flex gap-1 rounded-xl border border-slate-200 bg-slate-100/80 p-1 backdrop-blur-sm transition-opacity dark:border-white/10 dark:bg-white/5 ${
          isPending ? "opacity-60" : ""
        }`}
      >
        {HORIZONS.map((h) => (
          <button
            key={h}
            onClick={() => onChange(h)}
            disabled={isPending}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200 disabled:cursor-wait ${
              h === current
                ? "bg-emerald-100 text-emerald-700 border border-emerald-200 shadow-sm dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30 dark:shadow-emerald-500/10"
                : "text-slate-500 hover:text-slate-800 hover:bg-white dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-white/5"
            }`}
          >
            {HORIZON_LABELS[h]}
          </button>
        ))}
      </div>
    </div>
  );
}
