import type { Signal } from "@/types";

interface Props {
  signal: Signal;
  label?: string;
}

const CLASSES: Record<Signal, string> = {
  baik:      "badge-green",
  tidak_baik: "badge-red",
  netral:    "badge-gray",
};

const ICON: Record<Signal, string> = {
  baik:      "↑",
  tidak_baik: "↓",
  netral:    "–",
};

const TEXT: Record<Signal, string> = {
  baik:      "Baik",
  tidak_baik: "Tidak Baik",
  netral:    "Netral",
};

export function SignalBadge({ signal, label }: Props) {
  return (
    <span className={`inline-flex items-center gap-1 ${CLASSES[signal]}`}>
      <span aria-hidden>{ICON[signal]}</span>
      {label ?? TEXT[signal]}
    </span>
  );
}
