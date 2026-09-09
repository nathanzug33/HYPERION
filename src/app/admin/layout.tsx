import Link from "next/link";
import { requireStaff } from "@/lib/guards";
import { ROLE_LABELS } from "@/lib/constants";
import { getTaskCounts } from "@/lib/task-counts";
import LogoutButton from "@/components/LogoutButton";
import SidebarLink from "@/components/SidebarLink";
import GlobalSearch from "@/components/GlobalSearch";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireStaff();
  const isAdmin = session.user.role === "ADMIN";
  const taskCounts = await getTaskCounts(session.user);

  const initials = session.user.name
    ? session.user.name
        .split(" ")
        .map((p) => p[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "?";

  return (
    <div className="flex min-h-screen">
      <aside className="sidebar-gradient flex w-64 shrink-0 flex-col">
        <div className="px-4 pb-4 pt-5">
          <div className="flex h-12 items-center justify-center rounded-xl bg-white px-3 shadow-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo-hyperion-group.png"
              alt="Hyperion Group"
              className="h-full max-h-8 w-full object-contain"
            />
          </div>
        </div>
        <div className="px-5 pb-4">
          <span className="text-sm font-bold tracking-wide text-white">KERVIO</span>
          <div className="text-[11px] text-brand-green-light">by Hyperion Group</div>
        </div>

        <div className="px-4 pb-4">
          <GlobalSearch />
        </div>

        <nav className="flex-1 space-y-1 px-4">
          <SidebarLink href="/admin" exact badge={taskCounts.enRetard}>
            Tableau de bord
          </SidebarLink>
          <SidebarLink href="/admin/consultants">ATS</SidebarLink>
          <SidebarLink href="/admin/crm">CRM</SidebarLink>
          <SidebarLink href="/admin/demandes">Demandes</SidebarLink>
          {isAdmin && (
            <>
              <div className="my-2 border-t border-white/15" />
              <SidebarLink href="/admin/referentiels">Référentiels</SidebarLink>
              <SidebarLink href="/admin/utilisateurs">Utilisateurs</SidebarLink>
              <SidebarLink href="/admin/journaux">Journaux</SidebarLink>
            </>
          )}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-end gap-3 border-b border-slate-200 bg-white px-4 py-2.5 sm:px-6">
          <Link
            href="/admin/profil"
            className="flex items-center gap-2 rounded-full bg-slate-100 py-1 pl-1 pr-3 transition-colors hover:bg-slate-200"
            title="Mon compte"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-blue-light text-[11px] font-semibold text-brand-ink">
              {initials}
            </span>
            <div className="text-left leading-tight">
              <div className="text-xs font-medium text-brand-ink">{session.user.name}</div>
              <div className="text-[10px] text-brand-gray">
                {ROLE_LABELS[session.user.role as keyof typeof ROLE_LABELS] ?? session.user.role}
              </div>
            </div>
          </Link>
          <LogoutButton />
        </header>
        <main className="animate-fade-in flex-1 px-4 py-8 pb-24 sm:px-6">{children}</main>
      </div>
    </div>
  );
}
