"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export default function NavDropdown({
  label,
  items,
}: {
  label: string;
  items: { href: string; label: string; description?: string }[];
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const active = items.some(
    (it) => pathname === it.href || pathname.startsWith(`${it.href}/`)
  );

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`relative flex items-center gap-1 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors duration-150 ${
          active
            ? "bg-white/15 text-white"
            : "text-white/70 hover:bg-white/10 hover:text-white"
        }`}
      >
        {label}
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
        {active && (
          <span className="absolute inset-x-3 -bottom-[9px] h-0.5 rounded-full bg-brand-blue-light" />
        )}
      </button>
      {open && (
        <div className="absolute left-0 top-[calc(100%+8px)] z-30 w-64 overflow-hidden rounded-xl border border-slate-100 bg-white py-1.5 shadow-lg">
          {items.map((it) => (
            <Link
              key={it.href}
              href={it.href}
              onClick={() => setOpen(false)}
              className="block px-4 py-2.5 text-sm text-brand-body transition-colors hover:bg-brand-blue-bg-soft hover:text-brand-ink"
            >
              <div className="font-medium">{it.label}</div>
              {it.description && (
                <div className="mt-0.5 text-xs text-brand-gray">{it.description}</div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
