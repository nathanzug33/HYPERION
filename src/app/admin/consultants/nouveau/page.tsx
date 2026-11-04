import { requireStaff } from "@/lib/guards";
import NouveauConsultantForm from "./nouveau-form";

export default async function NouveauConsultantPage() {
  await requireStaff();

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-brand-ink">
          Nouveau candidat
        </h1>
      </div>

      <NouveauConsultantForm />
    </div>
  );
}
