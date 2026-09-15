import Link from "next/link";
import type { SortState } from "@/lib/sort";

export default function SortableHeader({
  label,
  sortKey,
  current,
  href,
}: {
  label: string;
  sortKey: string;
  current: SortState;
  href: string;
}) {
  const active = current.key === sortKey;
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 hover:text-brand-ink"
      title={`Trier par ${label.toLowerCase()}`}
    >
      {label}
      <span aria-hidden className="text-[10px]">
        {active ? (current.dir === "asc" ? "▲" : "▼") : "⇅"}
      </span>
    </Link>
  );
}
