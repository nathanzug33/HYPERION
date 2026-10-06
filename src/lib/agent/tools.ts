import type Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import { consultantVisibilityWhere } from "@/lib/consultant-access";
import { entrepriseVisibilityWhere } from "@/lib/crm-access";
import { computeRelanceFlags } from "@/lib/relance";
import { extractKeywords, buildCandidateKeywords } from "@/lib/poste-match";
import {
  DISPONIBILITE,
  DISPONIBILITE_LABELS,
  SUIVI_TYPE,
  SUIVI_TYPE_LABELS,
  SUIVI_COMMERCIAL_TYPE,
  SUIVI_COMMERCIAL_TYPE_LABELS,
  type Disponibilite,
  type SuiviType,
  type SuiviCommercialType,
} from "@/lib/constants";

type SessionUser = { id: string; role: string };

// ---------------------------------------------------------------------------
// Scoring de candidats par mots-clés libres — utilisé à la fois pour la
// recherche directe ("Python AWS data engineer") et pour le sourcing à
// partir d'une fiche de poste collée telle quelle (texte plus long, mêmes
// mots-clés extraits et comparés).
// ---------------------------------------------------------------------------

async function scoreCandidats(
  texte: string | undefined,
  user: SessionUser,
  limite: number,
  filtreSupplementaire?: { disponibiliteImmediate?: boolean; ville?: string }
) {
  const take = Math.min(Math.max(limite, 1), 25);
  const consultants = await prisma.consultant.findMany({
    where: {
      ...consultantVisibilityWhere(user),
      ...(filtreSupplementaire?.disponibiliteImmediate ? { disponibilite: DISPONIBILITE.IMMEDIATE } : {}),
      ...(filtreSupplementaire?.ville
        ? { villeRattachement: { contains: filtreSupplementaire.ville, mode: "insensitive" as const } }
        : {}),
    },
    select: {
      id: true,
      referenceAnonyme: true,
      intitulePoste: true,
      disponibilite: true,
      villeRattachement: true,
      rayonKm: true,
      statutPublication: true,
      secteurs: { select: { secteur: { select: { label: true } } } },
      expertises: { select: { expertise: { select: { label: true } } } },
      competences: { select: { competence: { select: { label: true } } } },
    },
    take: 400,
  });

  const keywords = texte ? extractKeywords(texte) : [];

  const scored = consultants.map((c) => {
    const competenceLabels = c.competences.map((x) => x.competence.label);
    const candidateKeywords = Array.from(
      new Set([
        ...buildCandidateKeywords({
          intitulePoste: c.intitulePoste,
          secteurLabels: c.secteurs.map((s) => s.secteur.label),
          expertiseLabels: c.expertises.map((e) => e.expertise.label),
        }),
        ...competenceLabels.flatMap(extractKeywords),
      ])
    );
    const motsTrouves =
      keywords.length > 0
        ? keywords.filter((k) => candidateKeywords.some((ck) => ck.includes(k) || k.includes(ck)))
        : [];
    return {
      c,
      competenceLabels,
      score: keywords.length > 0 ? motsTrouves.length : 1,
      motsTrouves,
    };
  });

  const filtres = keywords.length > 0 ? scored.filter((s) => s.score > 0) : scored;
  filtres.sort((a, b) => b.score - a.score);
  const top = filtres.slice(0, take);

  return {
    total_correspondant: filtres.length,
    resultats: top.map(({ c, competenceLabels, score, motsTrouves }) => ({
      reference: c.referenceAnonyme,
      poste: c.intitulePoste,
      disponibilite: c.disponibilite
        ? (DISPONIBILITE_LABELS[c.disponibilite as Disponibilite] ?? c.disponibilite)
        : null,
      ville: c.villeRattachement,
      rayon_km: c.rayonKm,
      competences: competenceLabels.slice(0, 10),
      statut_publication: c.statutPublication,
      mots_cles_trouves: motsTrouves,
      score,
    })),
  };
}

async function rechercherCandidats(
  input: { requete?: string; disponibilite_immediate?: boolean; ville?: string; limite?: number },
  user: SessionUser
) {
  return scoreCandidats(input.requete, user, input.limite ?? 10, {
    disponibiliteImmediate: input.disponibilite_immediate,
    ville: input.ville,
  });
}

async function sourcerPourPoste(input: { descriptif_poste: string; limite?: number }, user: SessionUser) {
  return scoreCandidats(input.descriptif_poste, user, input.limite ?? 10);
}

// ---------------------------------------------------------------------------
// Récap RDV / relances
// ---------------------------------------------------------------------------

async function recapRdvAVenir(input: { jours?: number }, user: SessionUser) {
  const jours = Math.min(Math.max(input.jours ?? 14, 1), 60);
  const now = new Date();
  const fin = new Date(now.getTime() + jours * 86400000);

  const [rdvCandidats, rdvCommerciaux] = await Promise.all([
    prisma.suiviCandidat.findMany({
      where: {
        type: { in: [SUIVI_TYPE.RDV, SUIVI_TYPE.RAPPEL] },
        fait: false,
        dateProgrammee: { gte: now, lte: fin },
      },
      orderBy: { dateProgrammee: "asc" },
      include: { consultant: { select: { referenceAnonyme: true, prenom: true, nom: true } } },
      take: 50,
    }),
    prisma.suiviCommercial.findMany({
      where: {
        type: { in: [SUIVI_COMMERCIAL_TYPE.RDV, SUIVI_COMMERCIAL_TYPE.RDV_TECHNIQUE, SUIVI_COMMERCIAL_TYPE.RAPPEL] },
        fait: false,
        dateProgrammee: { gte: now, lte: fin },
        entreprise: entrepriseVisibilityWhere(user),
      },
      orderBy: { dateProgrammee: "asc" },
      include: { entreprise: { select: { nom: true } }, contact: { select: { prenom: true, nom: true } } },
      take: 50,
    }),
  ]);

  return {
    periode_jours: jours,
    rdv_candidats: rdvCandidats.map((r) => ({
      type: SUIVI_TYPE_LABELS[r.type as SuiviType] ?? r.type,
      date: r.dateProgrammee,
      candidat: `${r.consultant.prenom} ${r.consultant.nom} (${r.consultant.referenceAnonyme})`,
      titre: r.titre,
    })),
    rdv_commerciaux: rdvCommerciaux.map((r) => ({
      type: SUIVI_COMMERCIAL_TYPE_LABELS[r.type as SuiviCommercialType] ?? r.type,
      date: r.dateProgrammee,
      entreprise: r.entreprise.nom,
      contact: r.contact ? `${r.contact.prenom} ${r.contact.nom}` : null,
      titre: r.titre,
    })),
  };
}

async function relancesPushSansReponse(user: SessionUser) {
  const propositions = await prisma.suiviCommercial.findMany({
    where: { type: SUIVI_COMMERCIAL_TYPE.PROPOSITION_ENVOYEE, entreprise: entrepriseVisibilityWhere(user) },
    select: {
      id: true,
      contactId: true,
      createdAt: true,
      entreprise: { select: { nom: true } },
      contact: { select: { prenom: true, nom: true } },
      consultant: { select: { referenceAnonyme: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 300,
  });
  const flags = await computeRelanceFlags(
    propositions.map((p) => ({ id: p.id, contactId: p.contactId, createdAt: p.createdAt }))
  );
  const aRelancer = propositions.filter((p) => flags.get(p.id));
  return {
    total: aRelancer.length,
    a_relancer: aRelancer.map((p) => ({
      candidat: p.consultant?.referenceAnonyme ?? null,
      entreprise: p.entreprise.nom,
      contact: p.contact ? `${p.contact.prenom} ${p.contact.nom}` : null,
      jours_depuis_envoi: Math.floor((Date.now() - p.createdAt.getTime()) / 86400000),
    })),
  };
}

async function relancesAppelsSansReponse(user: SessionUser) {
  // Vivier ATS partagé (pas de cloisonnement par référent) — cohérent avec
  // consultantVisibilityWhere ailleurs dans l'appli.
  void user;
  const appels = await prisma.suiviCandidat.findMany({
    where: { type: SUIVI_TYPE.APPEL_SANS_REPONSE },
    select: {
      id: true,
      consultantId: true,
      createdAt: true,
      consultant: { select: { referenceAnonyme: true, prenom: true, nom: true, telephone: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 300,
  });
  const consultantIds = Array.from(new Set(appels.map((a) => a.consultantId)));
  const latestParConsultant =
    consultantIds.length > 0
      ? await prisma.suiviCandidat.groupBy({
          by: ["consultantId"],
          where: { consultantId: { in: consultantIds } },
          _max: { createdAt: true },
        })
      : [];
  const latestMap = new Map(latestParConsultant.map((l) => [l.consultantId, l._max.createdAt]));
  const now = Date.now();
  const JOURS_MIN = 3;
  const aRelancer = appels.filter((a) => {
    const estDernier = latestMap.get(a.consultantId)?.getTime() === a.createdAt.getTime();
    return estDernier && now - a.createdAt.getTime() > JOURS_MIN * 86400000;
  });
  return {
    total: aRelancer.length,
    a_relancer: aRelancer.map((a) => ({
      candidat: `${a.consultant.prenom} ${a.consultant.nom} (${a.consultant.referenceAnonyme})`,
      telephone: a.consultant.telephone,
      jours_depuis_appel: Math.floor((now - a.createdAt.getTime()) / 86400000),
    })),
  };
}

// ---------------------------------------------------------------------------
// Push candidat — résolution/validation uniquement, aucun envoi ici (voir
// src/lib/agent/confirm-actions.ts pour l'envoi réel, après confirmation
// explicite de l'utilisateur dans l'interface).
// ---------------------------------------------------------------------------

async function preparerPushCandidat(
  input: { candidat_reference: string; entreprise_nom: string; contact_nom?: string; message?: string },
  user: SessionUser
) {
  const consultant = await prisma.consultant.findFirst({
    where: {
      ...consultantVisibilityWhere(user),
      referenceAnonyme: { contains: input.candidat_reference, mode: "insensitive" },
    },
    select: { id: true, referenceAnonyme: true, intitulePoste: true },
  });
  if (!consultant) {
    return { ok: false, erreur: `Aucun candidat trouvé pour la référence "${input.candidat_reference}".` };
  }

  const entreprises = await prisma.entreprise.findMany({
    where: { ...entrepriseVisibilityWhere(user), nom: { contains: input.entreprise_nom, mode: "insensitive" } },
    select: {
      id: true,
      nom: true,
      contacts: { select: { id: true, prenom: true, nom: true, email: true, principal: true } },
    },
  });
  if (entreprises.length === 0) {
    return { ok: false, erreur: `Aucune entreprise trouvée pour "${input.entreprise_nom}".` };
  }
  if (entreprises.length > 1) {
    return {
      ok: false,
      erreur: `Plusieurs entreprises correspondent à "${input.entreprise_nom}" : ${entreprises
        .map((e) => e.nom)
        .join(", ")}. Précise laquelle.`,
    };
  }
  const entreprise = entreprises[0];
  const contactsAvecEmail = entreprise.contacts.filter((c) => c.email);
  if (contactsAvecEmail.length === 0) {
    return { ok: false, erreur: `Aucun interlocuteur avec email chez ${entreprise.nom}.` };
  }

  let contact: (typeof contactsAvecEmail)[number];
  if (input.contact_nom) {
    const q = input.contact_nom.toLowerCase();
    const matches = contactsAvecEmail.filter((c) => `${c.prenom} ${c.nom}`.toLowerCase().includes(q));
    if (matches.length === 0) {
      return { ok: false, erreur: `Aucun interlocuteur nommé "${input.contact_nom}" chez ${entreprise.nom}.` };
    }
    if (matches.length > 1) {
      return {
        ok: false,
        erreur: `Plusieurs interlocuteurs correspondent à "${input.contact_nom}" chez ${entreprise.nom} : ${matches
          .map((m) => `${m.prenom} ${m.nom}`)
          .join(", ")}.`,
      };
    }
    contact = matches[0];
  } else if (contactsAvecEmail.length === 1) {
    contact = contactsAvecEmail[0];
  } else {
    const principal = contactsAvecEmail.find((c) => c.principal);
    if (!principal) {
      return {
        ok: false,
        erreur: `Plusieurs interlocuteurs chez ${entreprise.nom} (${contactsAvecEmail
          .map((c) => `${c.prenom} ${c.nom}`)
          .join(", ")}) — précise lequel.`,
      };
    }
    contact = principal;
  }

  return {
    ok: true,
    consultant_id: consultant.id,
    consultant_reference: consultant.referenceAnonyme,
    consultant_poste: consultant.intitulePoste,
    entreprise_id: entreprise.id,
    entreprise_nom: entreprise.nom,
    contact_id: contact.id,
    contact_nom: `${contact.prenom} ${contact.nom}`,
    message: input.message ?? null,
    note: "Proposition prête, en attente de confirmation explicite de l'utilisateur avant tout envoi réel.",
  };
}

// ---------------------------------------------------------------------------
// Déclaration des outils (schéma exposé au modèle) + dispatcher
// ---------------------------------------------------------------------------

export const AGENT_TOOLS: Anthropic.Tool[] = [
  {
    name: "rechercher_candidats",
    description:
      "Cherche des candidats du vivier ATS par mots-clés libres (compétences, techno, intitulé de poste), disponibilité et/ou ville. Utilise cet outil dès qu'on te demande de trouver un ou plusieurs candidats.",
    input_schema: {
      type: "object",
      properties: {
        requete: {
          type: "string",
          description: "Mots-clés libres : compétences, technologies, intitulé de poste (ex. 'Python AWS data engineer')",
        },
        disponibilite_immediate: { type: "boolean", description: "Filtrer uniquement les disponibles immédiatement" },
        ville: { type: "string", description: "Ville de rattachement recherchée" },
        limite: { type: "integer", description: "Nombre maximum de résultats (défaut 10, max 25)" },
      },
    },
  },
  {
    name: "sourcer_candidats_pour_poste",
    description:
      "Prend une fiche de poste collée telle quelle (texte libre, potentiellement long) et source les meilleurs candidats du vivier par recoupement de mots-clés. Utilise cet outil quand l'utilisateur colle une description de poste complète plutôt qu'une simple requête courte.",
    input_schema: {
      type: "object",
      properties: {
        descriptif_poste: { type: "string", description: "Texte complet de la fiche de poste" },
        limite: { type: "integer", description: "Nombre maximum de résultats (défaut 10, max 25)" },
      },
      required: ["descriptif_poste"],
    },
  },
  {
    name: "recap_rdv_a_venir",
    description:
      "Liste les RDV/entretiens/rappels programmés et non faits, côté candidats (ATS) et côté clients (CRM, dans la limite des entreprises visibles par l'utilisateur), sur une fenêtre de jours donnée.",
    input_schema: {
      type: "object",
      properties: {
        jours: { type: "integer", description: "Nombre de jours à venir à couvrir (défaut 14, max 60)" },
      },
    },
  },
  {
    name: "relances_push_sans_reponse",
    description:
      "Liste les propositions de candidats (push) envoyées à des contacts clients depuis plus de 7 jours sans aucun suivi enregistré depuis — donc à relancer.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "relances_appels_sans_reponse",
    description:
      "Liste les candidats dont le dernier événement enregistré est un appel resté sans réponse depuis plus de quelques jours — donc à rappeler.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "preparer_push_candidat",
    description:
      "Résout et valide une proposition de push d'un candidat vers un interlocuteur d'une entreprise cliente (par leurs noms), SANS envoyer quoi que ce soit. Utilise cet outil quand l'utilisateur demande de pousser/proposer un candidat à un client précis. L'envoi réel n'a lieu que si l'utilisateur confirme ensuite explicitement via le bouton affiché dans l'interface.",
    input_schema: {
      type: "object",
      properties: {
        candidat_reference: { type: "string", description: "Référence anonyme du candidat (ex. IND-017) ou fragment" },
        entreprise_nom: { type: "string", description: "Nom (ou fragment du nom) de l'entreprise cliente" },
        contact_nom: {
          type: "string",
          description: "Nom de l'interlocuteur visé, si précisé par l'utilisateur ou si l'entreprise en a plusieurs",
        },
        message: { type: "string", description: "Message d'accompagnement optionnel pour l'email de proposition" },
      },
      required: ["candidat_reference", "entreprise_nom"],
    },
  },
];

export async function executeAgentTool(name: string, input: unknown, user: SessionUser): Promise<unknown> {
  const params = (input ?? {}) as Record<string, unknown>;
  switch (name) {
    case "rechercher_candidats":
      return rechercherCandidats(
        {
          requete: typeof params.requete === "string" ? params.requete : undefined,
          disponibilite_immediate: Boolean(params.disponibilite_immediate),
          ville: typeof params.ville === "string" ? params.ville : undefined,
          limite: typeof params.limite === "number" ? params.limite : undefined,
        },
        user
      );
    case "sourcer_candidats_pour_poste":
      if (typeof params.descriptif_poste !== "string" || !params.descriptif_poste.trim()) {
        return { ok: false, erreur: "descriptif_poste manquant." };
      }
      return sourcerPourPoste(
        {
          descriptif_poste: params.descriptif_poste,
          limite: typeof params.limite === "number" ? params.limite : undefined,
        },
        user
      );
    case "recap_rdv_a_venir":
      return recapRdvAVenir({ jours: typeof params.jours === "number" ? params.jours : undefined }, user);
    case "relances_push_sans_reponse":
      return relancesPushSansReponse(user);
    case "relances_appels_sans_reponse":
      return relancesAppelsSansReponse(user);
    case "preparer_push_candidat":
      if (typeof params.candidat_reference !== "string" || typeof params.entreprise_nom !== "string") {
        return { ok: false, erreur: "candidat_reference et entreprise_nom sont requis." };
      }
      return preparerPushCandidat(
        {
          candidat_reference: params.candidat_reference,
          entreprise_nom: params.entreprise_nom,
          contact_nom: typeof params.contact_nom === "string" ? params.contact_nom : undefined,
          message: typeof params.message === "string" ? params.message : undefined,
        },
        user
      );
    default:
      return { ok: false, erreur: `Outil inconnu : ${name}.` };
  }
}
