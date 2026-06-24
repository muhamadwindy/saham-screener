"use client";

import { formatSkor } from "@/lib/utils/format";

interface Props {
  skor: number | null;
  label?: string;
  size?: "sm" | "md" | "lg";
}

function skorGradient(skor: number | null): string {
  if (skor === null) return "text-gray-500";
  const s = skor * 100;
  if (s >= 70) return "text-emerald-300";
  if (s >= 50) return "text-blue-300";
  if (s >= 30) return "text-amber-300";
  return "text-red-400";
}

function skorBg(skor: number | null): string {
  if (skor === null) return "bg-white/5 border-white/10";
  const s = skor * 100;
  if (s >= 70) return "bg-emerald-500/15 border-emerald-500/25";
  if (s >= 50) return "bg-blue-500/15 border-blue-500/25";
  if (s >= 30) return "bg-amber-500/15 border-amber-500/25";
  return "bg-red-500/15 border-red-500/25";
}

export function ScoreBadge({ skor, label, size = "md" }: Props) {
  const display = formatSkor(skor);
  const color = skorGradient(skor);
  const bg = skorBg(skor);

  const sizeClass = {
    sm: "text-xs px-1.5 py-0.5 gap-1",
    md: "text-sm px-2 py-1 gap-1.5",
    lg: "text-lg px-3 py-1.5 gap-2 font-bold",
  }[size];

  return (
    <span
      className={`inline-flex items-center rounded-lg border font-mono font-semibold ${sizeClass} ${color} ${bg}`}
      title={label ? `${label}: ${display}` : undefined}
    >
      {label && (
        <span className="text-gray-500 font-sans font-normal text-xs">{label}</span>
      )}
      {display}
    </span>
  );
}
