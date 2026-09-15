"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/guards";
import { canAccessEntreprise } from "@/lib/crm-access";
import {
  SUIVI_COMMERCIAL_TYPE_SAISISSABLES,
  SUIVI_COMMERCIAL_TYPE,
  MODALITE_RDV,
  formatSalutationNom,
} from "@/lib/constants";
import { saveCrmFile, deleteCrmFile } from "@/lib/crm-storage";
import { getValidAccessToken } from "@/lib/google-oauth";
import { createCalendarEvent, deleteCalendarEvent } from "@/lib/google-calendar";
import { sendGmailMessage, buildMeetInviteHtml } from "@/lib/google-gmail";
import {
  sendRdvPhysiqueConfirmation,
  sendRtClientEmail,
  sendRtCandidatEmail,
  type RtLieu,
} from "@/lib/mail";

async function assertEntrepriseAccess(entrepriseId: string) {
  const session = await requireStaff();
  const entreprise = await prisma.entreprise.findUnique({ where: { id: entrepriseId } });
  if (!entreprise) redirect("/admin/crm");
  if (!canAccessEntreprise(session.user, entreprise)) {
    redirect("/admin/crm");
  }
  return { session, entreprise };
}

export async function createSuiviCommercialAction(formData: FormData) {
  const entrepriseId = String(formData.get("entrepriseId") ?? "");
  const { session } = await assertEntrepriseAccess(entrepriseId);

  const type = String(formData.get("type") ?? "");
  if (
    !SUIVI_COMMERCIAL_TYPE_SAISISSABLES.includes(
      type as (typeof SUIVI_COMMERCIAL_TYPE_SAISISSABLES)[number]
    )
  ) {
    return;
  }
  const titre = String(formData.get("titre") ?? "").trim();
  if (!titre) return;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const dateProgrammeeRaw = String(formData.get("dateProgrammee") ?? "");
  const dateProgrammee = dateProgrammeeRaw ? new Date(dateProgrammeeRaw) : null;
  // Chaque action est désormais rattachée à un interlocuteur précis — elle
  // se saisit depuis la fiche de ce dernier, jamais depuis la fiche
  // entreprise (seul le log automatique de changement de statut reste
  // sans interlocuteur, voir updateEntrepriseAction).
  const contactId = String(formData.get("contactId") ?? "");
  if (!contactId) return;
  const modaliteRaw = String(formData.get("modalite") ?? "");
  const modalite =
    modaliteRaw && (Object.values(MODALITE_RDV) as string[]).includes(modaliteRaw)
      ? modaliteRaw
      : null;
  const estRdvOuRt =
    type === SUIVI_COMMERCIAL_TYPE.RDV || type === SUIVI_COMMERCIAL_TYPE.RDV_TECHNIQUE;

  // Rendez-vous technique (RT) : rencontre client/candidat, nécessite donc
  // un candidat du vivier ATS associé (recherché côté formulaire, voir
  // suivi-section.tsx) — sans lui, le RT n'a pas de sens.
  let consultant: { id: string; referenceAnonyme: string; intitulePoste: string | null; prenom: string; nom: string; civilite: string | null; email: string | null } | null = null;
  if (type === SUIVI_COMMERCIAL_TYPE.RDV_TECHNIQUE) {
    const consultantIdRaw = String(formData.get("consultantId") ?? "");
    if (!consultantIdRaw || !modalite) return;
    consultant = await prisma.consultant.findUnique({
      where: { id: consultantIdRaw },
      select: {
        id: true,
        referenceAnonyme: true,
        intitulePoste: true,
        prenom: true,
        nom: true,
        civilite: true,
        email: true,
      },
    });
    if (!consultant) return;
  }
  const consultantId = consultant?.id ?? null;

  // Adresse du RDV physique — ressaisie à chaque fois (le site industriel du
  // RDV n'est pas forcément le siège renseigné sur la fiche entreprise).
  const adresseRaw = String(formData.get("adresse") ?? "").trim();
  const adresse = estRdvOuRt && modalite === MODALITE_RDV.PHYSIQUE ? adresseRaw || null : null;

  // Visio : demande un lien Google Meet et envoie l'invitation par email —
  // à l'interlocuteur seul pour un RDV classique, à l'interlocuteur ET au
  // candidat pour un RT. Physique : l'adresse saisie ci-dessus est reprise
  // comme lieu de l'événement Google Agenda et envoie une confirmation par
  // email.
  const avecMeet =
    formData.get("avecMeet") === "on" && estRdvOuRt && modalite === MODALITE_RDV.VISIO;
  const avecConfirmationAdresse =
    formData.get("avecConfirmationAdresse") === "on" &&
    estRdvOuRt &&
    modalite === MODALITE_RDV.PHYSIQUE &&
    Boolean(adresse);

  const fichier = formData.get("fichier");
  const savedFichier =
    fichier instanceof File && fichier.size > 0 ? await saveCrmFile(fichier) : null;

  // Réplique en miroir dans Google Agenda si le créateur a connecté son
  // compte — best-effort, ne bloque jamais la création du suivi.
  let googleEventId: string | null = null;
  let meetLink: string | null = null;
  if (
    dateProgrammee &&
    (estRdvOuRt || type === SUIVI_COMMERCIAL_TYPE.RAPPEL)
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
      meetLink = event?.meetLink ?? null;

      if (meetLink && type === SUIVI_COMMERCIAL_TYPE.RDV) {
        const contact = await prisma.contact.findUnique({ where: { id: contactId } });
        if (contact?.email) {
          await sendGmailMessage(accessToken, {
            to: contact.email,
            subject: titre,
            bodyHtml: buildMeetInviteHtml({
              destinataire: formatSalutationNom(contact),
              nature: "rendez-vous",
              date: dateProgrammee,
              meetLink,
              auteur: session.user.name ?? "L'équipe HYPERION",
            }),
          });
        }
      }
    }
  }

  const lieuNote = meetLink
    ? `Lien Google Meet : ${meetLink}\n\n`
    : adresse
      ? `Adresse : ${adresse}\n\n`
      : "";

  if (type === SUIVI_COMMERCIAL_TYPE.RDV_TECHNIQUE && consultant && dateProgrammee) {
    const lieu: RtLieu | null = meetLink
      ? { visio: true, lien: meetLink }
      : adresse
        ? { visio: false, adresse }
        : null;
    if (lieu && (avecMeet || avecConfirmationAdresse)) {
      const auteur = session.user.name ?? "L'équipe HYPERION";
      const [contact, entreprise] = await Promise.all([
        prisma.contact.findUnique({ where: { id: contactId } }),
        prisma.entreprise.findUnique({ where: { id: entrepriseId }, select: { nom: true } }),
      ]);
      if (contact?.email) {
        await sendRtClientEmail(
          contact.email,
          {
            destinataire: formatSalutationNom(contact),
            date: dateProgrammee,
            candidatReference: consultant.referenceAnonyme,
            candidatPoste: consultant.intitulePoste,
            lieu,
            auteur,
          },
          session.user.id
        );
      }
      if (consultant.email && entreprise) {
        await sendRtCandidatEmail(
          consultant.email,
          {
            destinataire: formatSalutationNom(consultant),
            date: dateProgrammee,
            entrepriseNom: entreprise.nom,
            lieu,
            auteur,
          },
          session.user.id
        );
      }
    }
  } else if (
    type === SUIVI_COMMERCIAL_TYPE.RDV &&
    adresse &&
    avecConfirmationAdresse &&
    dateProgrammee
  ) {
    const contact = await prisma.contact.findUnique({ where: { id: contactId } });
    if (contact?.email) {
      await sendRdvPhysiqueConfirmation(
        contact.email,
        {
          destinataire: formatSalutationNom(contact),
          nature: "rendez-vous",
          date: dateProgrammee,
          adresse,
          auteur: session.user.name ?? "L'équipe HYPERION",
        },
        session.user.id
      );
    }
  }

  await prisma.suiviCommercial.create({
    data: {
      entrepriseId,
      contactId,
      consultantId,
      type,
      modalite,
      adresse,
      titre,
      notes: lieuNote ? `${lieuNote}${notes ?? ""}`.trim() : notes,
      dateProgrammee,
      googleEventId,
      fichierUrl: savedFichier?.storedName ?? null,
      fichierNomOriginal: savedFichier?.originalName ?? null,
      createdById: session.user.id,
    },
  });

  revalidatePath(`/admin/crm/${entrepriseId}/contacts/${contactId}`);
  revalidatePath("/admin/crm/activites");
  revalidatePath("/admin");
  if (consultantId) revalidatePath(`/admin/consultants/${consultantId}`);
}

export async function toggleSuiviCommercialFaitAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const suivi = await prisma.suiviCommercial.findUnique({ where: { id } });
  if (!suivi) return;
  await assertEntrepriseAccess(suivi.entrepriseId);

  await prisma.suiviCommercial.update({
    where: { id },
    data: { fait: !suivi.fait },
  });

  if (suivi.contactId) {
    revalidatePath(`/admin/crm/${suivi.entrepriseId}/contacts/${suivi.contactId}`);
  }
  revalidatePath("/admin/crm/activites");
  revalidatePath("/admin");
}

export async function deleteSuiviCommercialAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const suivi = await prisma.suiviCommercial.findUnique({ where: { id } });
  if (!suivi) return;
  await assertEntrepriseAccess(suivi.entrepriseId);

  await prisma.suiviCommercial.delete({ where: { id } });
  await deleteCrmFile(suivi.fichierUrl);

  if (suivi.googleEventId) {
    const accessToken = await getValidAccessToken(suivi.createdById);
    if (accessToken) await deleteCalendarEvent(accessToken, suivi.googleEventId);
  }

  if (suivi.contactId) {
    revalidatePath(`/admin/crm/${suivi.entrepriseId}/contacts/${suivi.contactId}`);
  }
  revalidatePath("/admin/crm/activites");
  revalidatePath("/admin");
}
