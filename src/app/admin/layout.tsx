import { requireStaff } from "@/lib/guards";
import LogoutButton from "@/components/LogoutButton";
import NavLink from "@/components/NavLink";
import NavDropdown from "@/components/NavDropdown";
import BrandMark from "@/components/BrandMark";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireStaff();
  const isAdmin = session.user.role === "ADMIN";

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
            <NavLink href="/admin" exact>
              Tableau de bord
            </NavLink>
            <NavDropdown label="ATS" items={atsItems} />
            {links.map((l) => (
              <NavLink key={l.href} href={l.href}>
                {l.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 rounded-full bg-white/10 py-1 pl-1 pr-3 sm:flex">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-blue-light text-[11px] font-semibold text-brand-ink">
                {initials}
              </span>
              <div className="text-left leading-tight">
                <div className="text-xs font-medium text-white">{session.user.name}</div>
                <div className="text-[10px] text-white/55">
                  {session.user.role === "ADMIN" ? "Administrateur" : "Business manager"}
                </div>
              </div>
            </div>
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
