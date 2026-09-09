"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function SidebarLink({
  href,
  children,
  exact = false,
  badge,
}: {
  href: string;
  children: React.ReactNode;
  exact?: boolean;
  badge?: number;
}) {
  const pathname = usePathname();
  const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      className={`relative flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150 ${
        active ? "bg-white/12 text-white" : "text-white/70 hover:bg-white/8 hover:text-white"
      }`}
    >
      <span className="flex items-center gap-2">
        {active && (
          <span className="absolute -left-3 top-1/2 h-5 w-1 -translate-y-1/2 rounded-full bg-brand-green-light" />
        )}
        {children}
      </span>
      {!!badge && badge > 0 && (
        <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </Link>
  );
}
