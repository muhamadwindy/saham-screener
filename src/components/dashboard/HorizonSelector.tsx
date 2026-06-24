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
    <div className="flex gap-1 rounded-xl border border-white/10 bg-white/5 p-1 backdrop-blur-sm">
      {HORIZONS.map((h) => (
        <button
          key={h}
          onClick={() => onChange(h)}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
            h === current
              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm shadow-emerald-500/10"
              : "text-gray-400 hover:text-gray-200 hover:bg-white/5"
          }`}
        >
          {HORIZON_LABELS[h]}
        </button>
      ))}
    </div>
  );
}
