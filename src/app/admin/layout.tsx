import Link from "next/link";
import { requireStaff } from "@/lib/guards";
import LogoutButton from "@/components/LogoutButton";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireStaff();
  const isAdmin = session.user.role === "ADMIN";

  const links = [
    { href: "/admin", label: "Tableau de bord" },
    { href: "/admin/consultants", label: "Dossiers de compétences" },
    { href: "/admin/demandes", label: "Demandes de contact" },
    ...(isAdmin
      ? [
          { href: "/admin/referentiels", label: "Référentiels" },
          { href: "/admin/utilisateurs", label: "Utilisateurs" },
          { href: "/admin/journaux", label: "Journaux" },
        ]
      : []),
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <span className="font-semibold text-slate-900 whitespace-nowrap">
              Back-office
            </span>
            <nav className="flex gap-1 flex-wrap">
              {links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="rounded-md px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                >
                  {l.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right text-xs text-slate-500">
              <div className="font-medium text-slate-700">
                {session.user.name}
              </div>
              <div>{session.user.role === "ADMIN" ? "Administrateur" : "Business manager"}</div>
            </div>
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="flex-1 mx-auto w-full max-w-6xl px-4 py-6 pb-20">
        {children}
      </main>
    </div>
  );
}
