import Link from "next/link";
import { requireStaff } from "@/lib/guards";
import { ROLE_LABELS } from "@/lib/constants";
import { getTaskCounts } from "@/lib/task-counts";
import LogoutButton from "@/components/LogoutButton";
import NavLink from "@/components/NavLink";
import NavDropdown from "@/components/NavDropdown";
import BrandMark from "@/components/BrandMark";

function TopSearchForm({ action, placeholder }: { action: string; placeholder: string }) {
  return (
    <form action={action} className="relative">
      <svg
        className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/50"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m21 21-4.3-4.3" />
      </svg>
      <input
        type="text"
        name="q"
        placeholder={placeholder}
        className="w-36 rounded-full border border-white/15 bg-white/10 py-1.5 pl-8 pr-3 text-xs text-white placeholder:text-white/50 transition-all duration-200 focus:w-52 focus:border-white/30 focus:bg-white/15 focus:outline-none"
      />
    </form>
  );
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireStaff();
  const isAdmin = session.user.role === "ADMIN";
  const taskCounts = await getTaskCounts(session.user);

  const atsItems = [
    {
      href: "/admin/consultants",
      label: "Tous les candidats",
      description: "Liste du vivier, création manuelle ou par IA",
    },
    {
      href: "/admin/consultants/recherche",
      label: "Recherche avancée",
      description: "Filtrer par compétences, mobilité, séniorité…",
    },
  ];

  const links = [
    { href: "/admin/crm", label: "CRM" },
    { href: "/admin/demandes", label: "Demandes" },
    ...(isAdmin
      ? [
          { href: "/admin/referentiels", label: "Référentiels" },
          { href: "/admin/utilisateurs", label: "Utilisateurs" },
          { href: "/admin/journaux", label: "Journaux" },
        ]
      : []),
  ];

  const initials = session.user.name
    ? session.user.name
        .split(" ")
        .map((p) => p[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "?";

  return (
    <div className="min-h-screen flex flex-col">
      <header className="topbar-gradient sticky top-0 z-20 shadow-[0_4px_20px_-8px_rgba(34,45,60,0.45)]">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <BrandMark className="text-white" />
            <div className="leading-tight">
              <div className="text-sm font-semibold text-white">Back-office</div>
              <div className="text-[11px] uppercase tracking-wide text-white/55">
                Bibliothèque de compétences
              </div>
            </div>
          </div>

          <nav className="flex flex-1 flex-wrap items-center gap-1 pt-1">
            <span className="relative">
              <NavLink href="/admin" exact>
                Tableau de bord
              </NavLink>
              {taskCounts.enRetard > 0 && (
                <span
                  className="absolute -right-1 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white"
                  title={`${taskCounts.enRetard} tâche(s) en retard`}
                >
                  {taskCounts.enRetard > 99 ? "99+" : taskCounts.enRetard}
                </span>
              )}
            </span>
            <NavDropdown label="ATS" items={atsItems} />
            {links.map((l) => (
              <NavLink key={l.href} href={l.href}>
                {l.label}
              </NavLink>
            ))}
            <span className="ml-auto flex items-center gap-2">
              <TopSearchForm action="/admin/consultants" placeholder="Chercher un candidat…" />
              <TopSearchForm action="/admin/crm" placeholder="Chercher un client/contact…" />
            </span>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/admin/profil"
              className="hidden items-center gap-2 rounded-full bg-white/10 py-1 pl-1 pr-3 transition-colors hover:bg-white/20 sm:flex"
              title="Mon compte"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-blue-light text-[11px] font-semibold text-brand-ink">
                {initials}
              </span>
              <div className="text-left leading-tight">
                <div className="text-xs font-medium text-white">{session.user.name}</div>
                <div className="text-[10px] text-white/55">
                  {ROLE_LABELS[session.user.role as keyof typeof ROLE_LABELS] ?? session.user.role}
                </div>
              </div>
            </Link>
            <LogoutButton dark />
          </div>
        </div>
      </header>
      <main className="animate-fade-in flex-1 mx-auto w-full max-w-7xl px-4 py-8 pb-24 sm:px-6">
        {children}
      </main>
    </div>
  );
}
