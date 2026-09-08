import { prisma } from "@/lib/prisma";
import { requireAdminOrDirecteur } from "@/lib/guards";
import { ROLES } from "@/lib/constants";
import TransferForm from "./transfer-form";

export const dynamic = "force-dynamic";

export default async function TransfertPortefeuillePage() {
  await requireAdminOrDirecteur();

  const bms = await prisma.user.findMany({
    where: { role: ROLES.BM, active: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-brand-ink">Transfert de portefeuille</h1>
        <p className="mt-1 text-sm text-brand-gray">
          Transfère en une fois tous les candidats (BM référent) et toutes
          les entreprises CRM d&apos;un business manager vers un autre —
          utile en cas de départ ou de changement de périmètre. Le vivier
          candidats reste de toute façon commun à tout le monde ; ce
          transfert ne change que le nom du référent affiché.
        </p>
      </div>

      <TransferForm bms={bms} />
    </div>
  );
}
