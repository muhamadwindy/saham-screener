"use client";

import { useState } from "react";
import { ExternalLink, Maximize2, Minimize2 } from "lucide-react";

interface Props {
  kode: string;
}

export function StockbitChart({ kode }: Props) {
  const [expanded, setExpanded] = useState(false);
  const url = `https://stockbit.com/symbol/${kode}/chartbit`;

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/20 border border-emerald-500/30">
            <svg className="h-3.5 w-3.5 text-emerald-400" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 3h18v18H3z M7 7h10v10H7z" opacity={0.3}/>
              <path d="M3 3l9 9M21 3l-9 9M3 21l9-9M21 21l-9-9" strokeWidth={2} stroke="currentColor" fill="none"/>
            </svg>
          </div>
          <div>
            <span className="text-sm font-semibold text-white">
              {kode} · Live Chart
            </span>
            <span className="ml-2 text-xs text-gray-500">via Stockbit</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-1.5 rounded-lg bg-white/5 hover:bg-white/10 px-3 py-1.5 text-xs font-medium text-gray-400 hover:text-gray-200 transition-all"
          >
            {expanded
              ? <><Minimize2 className="h-3 w-3" /> Perkecil</>
              : <><Maximize2 className="h-3 w-3" /> Perbesar</>
            }
          </button>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/25 px-3 py-1.5 text-xs font-medium text-emerald-300 transition-all"
          >
            Buka Stockbit
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>

      <div
        className={`w-full transition-all duration-300 ${
          expanded ? "h-[640px]" : "h-[420px]"
        }`}
      >
        <iframe
          src={url}
          title={`Chart ${kode} - Stockbit`}
          className="h-full w-full border-0"
          loading="lazy"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        />
      </div>
    </div>
  );
}
