import Link from "next/link";
import Image from "next/image";
import { requireStaff } from "@/lib/guards";
import { ROLE_LABELS } from "@/lib/constants";
import { getTaskCounts } from "@/lib/task-counts";
import LogoutButton from "@/components/LogoutButton";
import SidebarLink from "@/components/SidebarLink";
import SidebarGroup from "@/components/SidebarGroup";
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
      <aside className="sidebar-gradient sticky top-0 flex h-screen w-64 shrink-0 flex-col">
        <div className="px-5 pb-6 pt-8">
          <Image
            src="/kervyo-sidebar-dark.png"
            alt="KERVYO by Hyperion Group"
            width={1424}
            height={288}
            className="h-9 w-auto"
            priority
          />
        </div>

        <div className="px-4 pb-4">
          <GlobalSearch />
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-4">
          <SidebarGroup
            label="Tableau de bord"
            href="/admin/tableau-de-bord/recrutement"
            badge={taskCounts.enRetard}
            items={[
              { href: "/admin/tableau-de-bord/recrutement", label: "Recrutement" },
              { href: "/admin/tableau-de-bord/commerce", label: "Commerce" },
            ]}
          />
          <SidebarGroup
            label="ATS"
            href="/admin/consultants"
            items={[
              { href: "/admin/consultants", label: "Tous les candidats" },
              { href: "/admin/consultants/recherche", label: "Recherche avancée" },
              { href: "/admin/consultants/intercontrat", label: "Intercontrat / ED" },
              { href: "/admin/offres", label: "Offres" },
            ]}
          />
          <SidebarGroup
            label="CRM"
            href="/admin/crm"
            items={[
              { href: "/admin/crm", label: "Entreprises" },
              { href: "/admin/crm/contacts", label: "Contacts" },
              { href: "/admin/crm/besoins", label: "Besoins" },
            ]}
          />
          <SidebarGroup
            label="Centre de profit"
            href="/admin/missions/marge"
            items={[
              { href: "/admin/missions/marge", label: "CA & Marge" },
              { href: "/admin/missions", label: "Portefeuille missions" },
            ]}
          />
          <SidebarLink href="/admin/listes">Listes</SidebarLink>
          <SidebarLink href="/admin/rapports">Rapports</SidebarLink>
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

        <div className="mt-auto space-y-1 border-t border-white/15 px-4 py-4">
          <Link
            href="/admin/profil"
            className="flex items-center gap-2 rounded-lg px-3 py-2 transition-colors duration-150 hover:bg-white/8"
            title="Mon compte"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-blue-light text-[11px] font-semibold text-brand-ink">
              {initials}
            </span>
            <div className="min-w-0 flex-1 text-left leading-tight">
              <div className="truncate text-sm font-medium text-white">{session.user.name}</div>
              <div className="truncate text-[11px] text-white/55">
                {ROLE_LABELS[session.user.role as keyof typeof ROLE_LABELS] ?? session.user.role}
              </div>
            </div>
          </Link>
          <LogoutButton sidebar />
        </div>
      </aside>

      <main className="animate-fade-in min-w-0 flex-1 px-4 py-8 pb-24 sm:px-6">{children}</main>
    </div>
  );
}
