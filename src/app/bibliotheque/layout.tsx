import Link from "next/link";
import { requireRole } from "@/lib/guards";
import { ROLES } from "@/lib/constants";
import LogoutButton from "@/components/LogoutButton";
import BrandMark from "@/components/BrandMark";
import NavLink from "@/components/NavLink";

export default async function BibliothequeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireRole(ROLES.CLIENT, ROLES.ADMIN, ROLES.BM);
  const isClient = session.user.role === ROLES.CLIENT;
  const isPreview = !isClient;

  const links = isClient
    ? [
        { href: "/bibliotheque", label: "Tableau de bord", exact: true },
        { href: "/bibliotheque/dossiers", label: "Dossiers" },
        { href: "/bibliotheque/demandes", label: "Demandes" },
        { href: "/bibliotheque/profil", label: "Mon profil" },
      ]
    : [{ href: "/bibliotheque/dossiers", label: "Dossiers" }];

  return (
    <div className="min-h-screen flex flex-col">
      <header className="topbar-gradient sticky top-0 z-20 shadow-[0_4px_20px_-8px_rgba(34,45,60,0.45)]">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3 sm:px-6">
          <Link href="/bibliotheque" className="flex items-center gap-3">
            <BrandMark className="text-white" />
            <div className="leading-tight">
              <div className="text-sm font-semibold text-white">
                Bibliothèque de compétences
              </div>
              <div className="text-[11px] uppercase tracking-wide text-white/55">
                Portail réservé
              </div>
            </div>
          </Link>

          <nav className="flex flex-1 flex-wrap items-center gap-1 pt-1">
            {links.map((l) => (
              <NavLink key={l.href} href={l.href} exact={l.exact}>
                {l.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            {isPreview && (
              <span className="hidden rounded-full bg-amber-400/15 px-3 py-1 text-xs font-medium text-amber-200 ring-1 ring-amber-300/30 sm:inline-block">
                Aperçu vue client (compte {session.user.role === ROLES.ADMIN ? "admin" : "BM"})
              </span>
            )}
            <div className="hidden text-right text-xs leading-tight text-white/70 sm:block">
              <div className="font-medium text-white">{session.user.name}</div>
            </div>
            <LogoutButton dark />
          </div>
        </div>
      </header>
      <main className="animate-fade-in flex-1 mx-auto w-full max-w-7xl px-4 py-8 pb-24 sm:px-6">
        {children}
      </main>
      <footer className="border-t border-brand-blue-bg py-5 text-center text-xs text-brand-gray">
        <Link href="/legal/mentions-legales" className="link-underline hover:text-brand-ink">
          Mentions légales
        </Link>{" "}
        ·{" "}
        <Link href="/legal/confidentialite" className="link-underline hover:text-brand-ink">
          Confidentialité
        </Link>
      </footer>
    </div>
  );
}
