"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/guards";
import { canAccessEntreprise } from "@/lib/crm-access";
import { STATUT_BESOIN, STATUT_BESOIN_CANDIDAT, STATUT_MISSION } from "@/lib/constants";

async function assertEntrepriseAccess(entrepriseId: string) {
  const session = await requireStaff();
  const entreprise = await prisma.entreprise.findUnique({ where: { id: entrepriseId } });
  if (!entreprise) redirect("/admin/crm");
  if (!canAccessEntreprise(session.user, entreprise)) {
    redirect("/admin/crm");
  }
  return { session, entreprise };
}

async function assertBesoinAccess(besoinId: string) {
  const besoin = await prisma.besoin.findUnique({ where: { id: besoinId } });
  if (!besoin) redirect("/admin/crm");
  const { session } = await assertEntrepriseAccess(besoin.entrepriseId);
  return { session, besoin };
}

export async function createBesoinAction(formData: FormData) {
  const entrepriseId = String(formData.get("entrepriseId") ?? "");
  const { session } = await assertEntrepriseAccess(entrepriseId);

  const intitulePoste = String(formData.get("intitulePoste") ?? "").trim();
  if (!intitulePoste) return;
  const contactId = String(formData.get("contactId") ?? "") || null;
  const descriptifMissions = String(formData.get("descriptifMissions") ?? "").trim() || null;
  const seniorite = String(formData.get("seniorite") ?? "").trim() || null;
  const tjmCibleMinRaw = String(formData.get("tjmCibleMin") ?? "");
  const tjmCibleMaxRaw = String(formData.get("tjmCibleMax") ?? "");
  const localisation = String(formData.get("localisation") ?? "").trim() || null;
  const dateDemarrageRaw = String(formData.get("dateDemarrageSouhaitee") ?? "");
  const dureeEstimee = String(formData.get("dureeEstimee") ?? "").trim() || null;

  const besoin = await prisma.besoin.create({
    data: {
      entrepriseId,
      contactId,
      businessManagerId: session.user.id,
      intitulePoste,
      descriptifMissions,
      seniorite,
      tjmCibleMin: tjmCibleMinRaw ? Number(tjmCibleMinRaw) : null,
      tjmCibleMax: tjmCibleMaxRaw ? Number(tjmCibleMaxRaw) : null,
      localisation,
      dateDemarrageSouhaitee: dateDemarrageRaw ? new Date(dateDemarrageRaw) : null,
      dureeEstimee,
    },
  });

  revalidatePath(`/admin/crm/${entrepriseId}`);
  revalidatePath("/admin/crm/besoins");
  redirect(`/admin/crm/${entrepriseId}/besoins/${besoin.id}`);
}

export async function updateBesoinAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const { besoin } = await assertBesoinAccess(id);

  const intitulePoste = String(formData.get("intitulePoste") ?? "").trim();
  if (!intitulePoste) return;
  const contactId = String(formData.get("contactId") ?? "") || null;
  const descriptifMissions = String(formData.get("descriptifMissions") ?? "").trim() || null;
  const seniorite = String(formData.get("seniorite") ?? "").trim() || null;
  const tjmCibleMinRaw = String(formData.get("tjmCibleMin") ?? "");
  const tjmCibleMaxRaw = String(formData.get("tjmCibleMax") ?? "");
  const localisation = String(formData.get("localisation") ?? "").trim() || null;
  const dateDemarrageRaw = String(formData.get("dateDemarrageSouhaitee") ?? "");
  const dureeEstimee = String(formData.get("dureeEstimee") ?? "").trim() || null;

  await prisma.besoin.update({
    where: { id },
    data: {
      contactId,
      intitulePoste,
      descriptifMissions,
      seniorite,
      tjmCibleMin: tjmCibleMinRaw ? Number(tjmCibleMinRaw) : null,
      tjmCibleMax: tjmCibleMaxRaw ? Number(tjmCibleMaxRaw) : null,
      localisation,
      dateDemarrageSouhaitee: dateDemarrageRaw ? new Date(dateDemarrageRaw) : null,
      dureeEstimee,
    },
  });

  revalidatePath(`/admin/crm/${besoin.entrepriseId}/besoins/${id}`);
  revalidatePath("/admin/crm/besoins");
}

export async function marquerBesoinPerduAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const { besoin } = await assertBesoinAccess(id);

  await prisma.besoin.update({ where: { id }, data: { statut: STATUT_BESOIN.PERDU } });

  revalidatePath(`/admin/crm/${besoin.entrepriseId}/besoins/${id}`);
  revalidatePath("/admin/crm/besoins");
}

export async function reouvrirBesoinAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const { besoin } = await assertBesoinAccess(id);

  await prisma.besoin.update({ where: { id }, data: { statut: STATUT_BESOIN.OUVERT } });

  revalidatePath(`/admin/crm/${besoin.entrepriseId}/besoins/${id}`);
  revalidatePath("/admin/crm/besoins");
}

/** Associe un candidat du vivier ATS à ce besoin (statut initial : Proposé). */
export async function addBesoinCandidatAction(formData: FormData) {
  const besoinId = String(formData.get("besoinId") ?? "");
  const { session, besoin } = await assertBesoinAccess(besoinId);

  const consultantId = String(formData.get("consultantId") ?? "");
  if (!consultantId) return;

  await prisma.besoinCandidat.upsert({
    where: { besoinId_consultantId: { besoinId, consultantId } },
    update: {},
    create: {
      besoinId,
      consultantId,
      createdById: session.user.id,
    },
  });

  revalidatePath(`/admin/crm/${besoin.entrepriseId}/besoins/${besoinId}`);
}

export async function updateBesoinCandidatStatutAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const besoinCandidat = await prisma.besoinCandidat.findUnique({ where: { id } });
  if (!besoinCandidat) return;
  const { besoin } = await assertBesoinAccess(besoinCandidat.besoinId);

  const statut = String(formData.get("statut") ?? "");
  if (!(Object.values(STATUT_BESOIN_CANDIDAT) as string[]).includes(statut)) return;
  const dateRdvRaw = String(formData.get("dateRdvQualification") ?? "");

  await prisma.besoinCandidat.update({
    where: { id },
    data: {
      statut,
      dateRdvQualification: dateRdvRaw ? new Date(dateRdvRaw) : besoinCandidat.dateRdvQualification,
    },
  });

  revalidatePath(`/admin/crm/${besoin.entrepriseId}/besoins/${besoinCandidat.besoinId}`);
}

export async function removeBesoinCandidatAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const besoinCandidat = await prisma.besoinCandidat.findUnique({ where: { id } });
  if (!besoinCandidat) return;
  const { besoin } = await assertBesoinAccess(besoinCandidat.besoinId);

  await prisma.besoinCandidat.delete({ where: { id } });

  revalidatePath(`/admin/crm/${besoin.entrepriseId}/besoins/${besoinCandidat.besoinId}`);
}

/** Gagne le besoin avec le candidat retenu : crée la Mission, passe le
 * candidat retenu en STAFFE, écarte les autres candidats encore en lice. */
export async function marquerBesoinGagneAction(formData: FormData) {
  const besoinId = String(formData.get("besoinId") ?? "");
  const { session, besoin } = await assertBesoinAccess(besoinId);

  const besoinCandidatId = String(formData.get("besoinCandidatId") ?? "");
  const retenu = await prisma.besoinCandidat.findUnique({ where: { id: besoinCandidatId } });
  if (!retenu || retenu.besoinId !== besoinId) return;

  const tjmRaw = String(formData.get("tjm") ?? "");
  const dateDebutRaw = String(formData.get("dateDebut") ?? "");
  const dateFinPrevueRaw = String(formData.get("dateFinPrevue") ?? "");
  if (!dateDebutRaw) return;

  await prisma.$transaction([
    prisma.mission.create({
      data: {
        besoinId,
        entrepriseId: besoin.entrepriseId,
        consultantId: retenu.consultantId,
        businessManagerId: session.user.id,
        intitulePoste: besoin.intitulePoste,
        tjm: tjmRaw ? Number(tjmRaw) : null,
        dateDebut: new Date(dateDebutRaw),
        dateFinPrevue: dateFinPrevueRaw ? new Date(dateFinPrevueRaw) : null,
      },
    }),
    prisma.besoin.update({ where: { id: besoinId }, data: { statut: STATUT_BESOIN.GAGNE } }),
    prisma.besoinCandidat.update({
      where: { id: besoinCandidatId },
      data: { statut: STATUT_BESOIN_CANDIDAT.RETENU },
    }),
    prisma.besoinCandidat.updateMany({
      where: {
        besoinId,
        id: { not: besoinCandidatId },
        statut: { notIn: [STATUT_BESOIN_CANDIDAT.RETENU, STATUT_BESOIN_CANDIDAT.ECARTE] },
      },
      data: { statut: STATUT_BESOIN_CANDIDAT.ECARTE },
    }),
    prisma.consultant.update({
      where: { id: retenu.consultantId },
      data: { statutCandidatInterne: "STAFFE" },
    }),
  ]);

  revalidatePath(`/admin/crm/${besoin.entrepriseId}/besoins/${besoinId}`);
  revalidatePath("/admin/crm/besoins");
  revalidatePath("/admin/missions");
  revalidatePath(`/admin/consultants/${retenu.consultantId}`);
  revalidatePath("/admin/consultants");
  revalidatePath("/admin");
}

export async function terminerMissionAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const mission = await prisma.mission.findUnique({ where: { id } });
  if (!mission) return;
  await assertEntrepriseAccess(mission.entrepriseId);

  await prisma.mission.update({
    where: { id },
    data: { statut: STATUT_MISSION.TERMINEE, dateFinReelle: new Date() },
  });

  // Bascule automatique en Intercontrat si ce consultant n'a plus aucune
  // autre mission active — sans ça il resterait "Staffé" à tort (coût sans
  // TJM en face, § pilotage financier).
  const autreMissionActive = await prisma.mission.findFirst({
    where: { consultantId: mission.consultantId, statut: STATUT_MISSION.EN_COURS, id: { not: id } },
  });
  if (!autreMissionActive) {
    await prisma.consultant.update({
      where: { id: mission.consultantId },
      data: { statutCandidatInterne: "INTERCONTRAT" },
    });
  }

  revalidatePath("/admin/missions");
  revalidatePath(`/admin/consultants/${mission.consultantId}`);
}
