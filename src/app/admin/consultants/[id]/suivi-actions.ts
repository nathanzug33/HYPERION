"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/guards";
import { canAccessConsultant } from "@/lib/consultant-access";
import {
  SUIVI_TYPE_SAISISSABLES,
  SUIVI_TYPE,
  STATUT_CANDIDAT_INTERNE,
  STATUT_CANDIDAT_INTERNE_LABELS,
  MODALITE_RDV,
  formatSalutationNom,
} from "@/lib/constants";
import { getValidAccessToken } from "@/lib/google-oauth";
import { createCalendarEvent, deleteCalendarEvent } from "@/lib/google-calendar";
import { sendGmailMessage, buildMeetInviteHtml } from "@/lib/google-gmail";
import { sendRdvPhysiqueConfirmation } from "@/lib/mail";

async function assertConsultantAccess(consultantId: string) {
  const session = await requireStaff();
  const consultant = await prisma.consultant.findUnique({ where: { id: consultantId } });
  if (!consultant) redirect("/admin/consultants");
  if (!(await canAccessConsultant(session.user, consultant))) {
    redirect("/admin/consultants");
  }
  return { session, consultant };
}

export async function createSuiviAction(formData: FormData) {
  const consultantId = String(formData.get("consultantId") ?? "");
  const { session, consultant } = await assertConsultantAccess(consultantId);

  const type = String(formData.get("type") ?? "");
  if (!SUIVI_TYPE_SAISISSABLES.includes(type as (typeof SUIVI_TYPE_SAISISSABLES)[number])) {
    return;
  }
  const titre = String(formData.get("titre") ?? "").trim();
  if (!titre) return;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const dateProgrammeeRaw = String(formData.get("dateProgrammee") ?? "");
  const dateProgrammee = dateProgrammeeRaw ? new Date(dateProgrammeeRaw) : null;
  const modaliteRaw = String(formData.get("modalite") ?? "");
  const modalite =
    modaliteRaw && (Object.values(MODALITE_RDV) as string[]).includes(modaliteRaw)
      ? modaliteRaw
      : null;
  // Adresse du RDV physique — ressaisie à chaque fois (agences/locaux du
  // candidat variables, futures agences HYPERION…).
  const adresseRaw = String(formData.get("adresse") ?? "").trim();
  const adresse =
    type === SUIVI_TYPE.RDV && modalite === MODALITE_RDV.PHYSIQUE ? adresseRaw || null : null;

  // Visio : demande un lien Google Meet et envoie l'invitation par email au
  // candidat, depuis l'adresse Gmail pro du créateur. Physique : l'adresse
  // saisie ci-dessus est reprise comme lieu de l'événement Google Agenda
  // (pas besoin de revenir sur HYPERION pour la retrouver) et envoie une
  // confirmation par email.
  const avecMeet =
    formData.get("avecMeet") === "on" &&
    type === SUIVI_TYPE.RDV &&
    modalite === MODALITE_RDV.VISIO;
  const avecConfirmationAdresse =
    formData.get("avecConfirmationAdresse") === "on" &&
    type === SUIVI_TYPE.RDV &&
    modalite === MODALITE_RDV.PHYSIQUE &&
    Boolean(adresse);

  // Réplique en miroir dans Google Agenda si le créateur a connecté son
  // compte — best-effort, ne bloque jamais la création du suivi.
  let googleEventId: string | null = null;
  let lieuNote = "";
  if (
    dateProgrammee &&
    (type === SUIVI_TYPE.RDV || type === SUIVI_TYPE.RAPPEL)
  ) {
    const accessToken = await getValidAccessToken(session.user.id);
    if (accessToken) {
      const event = await createCalendarEvent(accessToken, {
        summary: titre,
        description: notes ?? undefined,
        start: dateProgrammee,
        withMeet: avecMeet,
        location: adresse ?? undefined,
      });
      googleEventId = event?.eventId ?? null;
      if (event?.meetLink) {
        lieuNote = `Lien Google Meet : ${event.meetLink}\n\n`;
        if (consultant.email) {
          await sendGmailMessage(accessToken, {
            to: consultant.email,
            subject: titre,
            bodyHtml: buildMeetInviteHtml({
              destinataire: formatSalutationNom(consultant),
              nature: "entretien",
              date: dateProgrammee,
              meetLink: event.meetLink,
              auteur: session.user.name ?? "L'équipe HYPERION",
            }),
          });
        }
      }
    }
  }

  if (adresse) {
    lieuNote = `Adresse : ${adresse}\n\n`;
    if (avecConfirmationAdresse && dateProgrammee && consultant.email) {
      await sendRdvPhysiqueConfirmation(
        consultant.email,
        {
          destinataire: formatSalutationNom(consultant),
          nature: "entretien",
          date: dateProgrammee,
          adresse,
          auteur: session.user.name ?? "L'équipe HYPERION",
        },
        session.user.id
      );
    }
  }

  // Un candidat "plus disponible" ou en "refus" n'est plus à proposer :
  // on repasse automatiquement son statut interne en Indisponible (sauf
  // s'il est déjà staffé chez un client — ce suivi ATS n'a alors plus de
  // sens pour son statut interne, on ne l'écrase pas).
  const doitPasserIndisponible =
    (type === SUIVI_TYPE.PLUS_DISPONIBLE || type === SUIVI_TYPE.REFUS) &&
    consultant.statutCandidatInterne !== STATUT_CANDIDAT_INTERNE.STAFFE &&
    consultant.statutCandidatInterne !== STATUT_CANDIDAT_INTERNE.INDISPONIBLE;

  await prisma.$transaction([
    prisma.suiviCandidat.create({
      data: {
        consultantId,
        type,
        modalite,
        adresse,
        titre,
        notes: lieuNote ? `${lieuNote}${notes ?? ""}`.trim() : notes,
        dateProgrammee,
        googleEventId,
        createdById: session.user.id,
      },
    }),
    ...(doitPasserIndisponible
      ? [
          prisma.consultant.update({
            where: { id: consultantId },
            data: { statutCandidatInterne: STATUT_CANDIDAT_INTERNE.INDISPONIBLE },
          }),
          prisma.suiviCandidat.create({
            data: {
              consultantId,
              type: SUIVI_TYPE.STATUT,
              titre: `Statut candidat : ${
                STATUT_CANDIDAT_INTERNE_LABELS[
                  consultant.statutCandidatInterne as keyof typeof STATUT_CANDIDAT_INTERNE_LABELS
                ] ?? consultant.statutCandidatInterne
              } → ${STATUT_CANDIDAT_INTERNE_LABELS.INDISPONIBLE}`,
              fait: true,
              createdById: session.user.id,
            },
          }),
        ]
      : []),
  ]);

  revalidatePath(`/admin/consultants/${consultantId}`);
}

export async function toggleSuiviFaitAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const suivi = await prisma.suiviCandidat.findUnique({ where: { id } });
  if (!suivi) return;
  await assertConsultantAccess(suivi.consultantId);

  await prisma.suiviCandidat.update({
    where: { id },
    data: { fait: !suivi.fait },
  });

  revalidatePath(`/admin/consultants/${suivi.consultantId}`);
  revalidatePath("/admin");
}

export async function deleteSuiviAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const suivi = await prisma.suiviCandidat.findUnique({ where: { id } });
  if (!suivi) return;
  await assertConsultantAccess(suivi.consultantId);

  await prisma.suiviCandidat.delete({ where: { id } });

  // L'événement vit dans l'agenda du créateur, pas forcément celui de la
  // personne qui supprime (vue globale admin/directeur) — on utilise donc
  // le token du créateur, seul habilité à agir sur son propre agenda.
  if (suivi.googleEventId) {
    const accessToken = await getValidAccessToken(suivi.createdById);
    if (accessToken) await deleteCalendarEvent(accessToken, suivi.googleEventId);
  }

  revalidatePath(`/admin/consultants/${suivi.consultantId}`);
  revalidatePath("/admin");
}
