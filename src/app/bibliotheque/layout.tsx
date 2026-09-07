import Link from "next/link";
import { requireRole } from "@/lib/guards";
import { ROLES } from "@/lib/constants";
import LogoutButton from "@/components/LogoutButton";

export default async function BibliothequeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireRole(ROLES.CLIENT, ROLES.ADMIN, ROLES.BM);
  const isPreview = session.user.role !== ROLES.CLIENT;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between gap-4">
          <Link href="/bibliotheque" className="font-semibold text-slate-900">
            Bibliothèque de compétences
          </Link>
          <div className="flex items-center gap-3">
            {isPreview && (
              <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
                Aperçu vue client (compte {session.user.role === ROLES.ADMIN ? "admin" : "BM"})
              </span>
            )}
            <div className="text-right text-xs text-slate-500">
              <div className="font-medium text-slate-700">{session.user.name}</div>
            </div>
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="flex-1 mx-auto w-full max-w-6xl px-4 py-6 pb-20">
        {children}
      </main>
      <footer className="border-t border-slate-200 py-4 text-center text-xs text-slate-400">
        <Link href="/legal/mentions-legales" className="underline">
          Mentions légales
        </Link>{" "}
        ·{" "}
        <Link href="/legal/confidentialite" className="underline">
          Confidentialité
        </Link>
      </footer>
    </div>
  );
}
