import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/guards";

export const dynamic = "force-dynamic";

export default async function JournauxPage() {
  await requireAdmin();

  const [connexions, consultations, demandes] = await Promise.all([
    prisma.loginLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { user: true },
    }),
    prisma.consultationLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { user: true, consultant: true },
    }),
    prisma.contactRequest.count(),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-brand-ink">
          Journaux et traçabilité
        </h1>
      </div>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-brand-ink">
            Connexions
          </h2>
          <a
            href="/admin/journaux/export/connexions"
            className="link-underline text-sm text-brand-blue-dark"
          >
            Exporter en CSV
          </a>
        </div>
        <LogTable
          rows={connexions.map((c) => [
            new Date(c.createdAt).toLocaleString("fr-FR"),
            c.user.name,
            c.user.email,
          ])}
          headers={["Date", "Utilisateur", "Email"]}
        />
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-brand-ink">
            Fiches consultées
          </h2>
          <a
            href="/admin/journaux/export/consultations"
            className="link-underline text-sm text-brand-blue-dark"
          >
            Exporter en CSV
          </a>
        </div>
        <LogTable
          rows={consultations.map((c) => [
            new Date(c.createdAt).toLocaleString("fr-FR"),
            c.user.name,
            c.consultant.referenceAnonyme,
          ])}
          headers={["Date", "Client", "Profil consulté"]}
        />
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-brand-ink">
            Demandes de contact ({demandes} au total)
          </h2>
          <a
            href="/admin/journaux/export/demandes"
            className="link-underline text-sm text-brand-blue-dark"
          >
            Exporter en CSV
          </a>
        </div>
        <p className="text-sm text-brand-gray">
          Le détail des demandes se gère dans{" "}
          <a href="/admin/demandes" className="underline">
            Demandes de contact
          </a>
          .
        </p>
      </section>
    </div>
  );
}

function LogTable({ headers, rows }: { headers: string[]; rows: (string | null)[][] }) {
  return (
    <div className="card overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b border-slate-100 bg-brand-blue-bg-soft text-left text-xs font-semibold uppercase tracking-wide text-brand-gray">
          <tr>
            {headers.map((h) => (
              <th key={h} className="px-4 py-2">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row, i) => (
            <tr key={i} className="transition-colors hover:bg-brand-blue-bg-soft">
              {row.map((cell, j) => (
                <td key={j} className="px-4 py-2 text-brand-body whitespace-nowrap">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={headers.length} className="px-4 py-6 text-center text-brand-gray">
                Aucune entrée.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
