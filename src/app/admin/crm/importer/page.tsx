import Link from "next/link";
import { requireStaff } from "@/lib/guards";
import ImportForm from "./import-form";

export const dynamic = "force-dynamic";

export default async function ImporterCrmPage() {
  await requireStaff();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-brand-ink">
            Importer des sociétés &amp; contacts
          </h1>
          <p className="mt-1 text-sm text-brand-gray">
            À partir d&apos;un fichier Excel (.xlsx, .xls) ou CSV.
          </p>
        </div>
        <Link href="/admin/crm" className="link-underline text-sm text-brand-gray hover:text-brand-ink">
          ← Retour au CRM
        </Link>
      </div>

      <ImportForm />
    </div>
  );
}
