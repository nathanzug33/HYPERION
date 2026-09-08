"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function NavLink({
  href,
  children,
  exact = false,
}: {
  href: string;
  children: React.ReactNode;
  exact?: boolean;
}) {
  const pathname = usePathname();
  const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      className={`relative rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors duration-150 ${
        active
          ? "bg-white/15 text-white"
          : "text-white/70 hover:bg-white/10 hover:text-white"
      }`}
    >
      {children}
      {active && (
        <span className="absolute inset-x-3 -bottom-[9px] h-0.5 rounded-full bg-brand-blue-light" />
      )}
    </Link>
  );
}
