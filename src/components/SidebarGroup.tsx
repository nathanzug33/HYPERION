"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

type Item = { href: string; label: string };

export default function SidebarGroup({
  label,
  href,
  items,
  badge,
}: {
  label: string;
  href: string;
  items: Item[];
  badge?: number;
}) {
  const pathname = usePathname();

  // Parmi le lien parent + les sous-liens, celui dont le chemin est le plus
  // long à matcher est le plus spécifique — évite qu'un sous-lien plus
  // court (ex. la racine CRM) s'allume à tort sur la page d'un sous-lien
  // plus profond (ex. /admin/crm/besoins).
  const candidats = [{ href, label: "" }, ...items];
  const matches = candidats.filter(
    (c) => pathname === c.href || pathname.startsWith(`${c.href}/`)
  );
  const actif = matches.length
    ? matches.reduce((a, b) => (b.href.length > a.href.length ? b : a))
    : null;
  const groupeActif = matches.length > 0;

  const [open, setOpen] = useState(groupeActif);
  // Réouvre automatiquement le groupe quand on navigue vers une page qui en
  // fait partie (même s'il avait été replié) — ajustement pendant le rendu
  // plutôt qu'un effet, cf. "Adjusting state based on a prop change".
  const [pathnamePrecedent, setPathnamePrecedent] = useState(pathname);
  if (pathname !== pathnamePrecedent) {
    setPathnamePrecedent(pathname);
    if (groupeActif) setOpen(true);
  }

  return (
    <div>
      <div className="relative flex items-center">
        <Link
          href={href}
          className={`flex flex-1 items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150 ${
            actif?.href === href ? "bg-white/12 text-white" : "text-white/70 hover:bg-white/8 hover:text-white"
          }`}
        >
          <span className="flex items-center gap-2">
            {groupeActif && (
              <span className="absolute -left-3 top-1/2 h-5 w-1 -translate-y-1/2 rounded-full bg-brand-green-light" />
            )}
            {label}
          </span>
          {!!badge && badge > 0 && (
            <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
              {badge > 99 ? "99+" : badge}
            </span>
          )}
        </Link>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="ml-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white/50 transition-colors hover:bg-white/8 hover:text-white"
          aria-label={open ? "Réduire" : "Développer"}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`transition-transform ${open ? "rotate-180" : ""}`}
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
      </div>
      {open && (
        <div className="ml-3 mt-0.5 space-y-0.5 border-l border-white/10 pl-3">
          {items.map((it) => (
            <Link
              key={it.href}
              href={it.href}
              className={`block rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors duration-150 ${
                actif?.href === it.href
                  ? "bg-white/12 text-white"
                  : "text-white/60 hover:bg-white/8 hover:text-white"
              }`}
            >
              {it.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
