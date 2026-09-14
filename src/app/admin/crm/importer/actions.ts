"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/guards";
import { entrepriseVisibilityWhere } from "@/lib/crm-access";
import { findContactDuplicates } from "@/lib/duplicate-detection";

export type ImportRow = {
  societeNom: string;
  ville?: string;
  siteWeb?: string;
  prenom?: string;
  nom?: string;
  fonction?: string;
  email?: string;
  telephone?: string;
};

export type ImportResult = {
  entreprisesCreees: number;
  entreprisesReutilisees: number;
  contactsCrees: number;
  contactsIgnores: number;
  lignesIgnorees: number;
};

/** Import en masse depuis un fichier Excel/CSV (colonnes mappées côté
 * client, voir import-form.tsx). Dédoublonne les sociétés par nom
 * (insensible à la casse, dans le périmètre visible de l'utilisateur) et
 * les contacts via le même détecteur que la saisie manuelle — jamais de
 * fusion/écrasement automatique, une ligne en doublon est simplement
 * ignorée pour que l'utilisateur vérifie lui-même dans le CRM. */
export async function importCrmRowsAction(rows: ImportRow[]): Promise<ImportResult> {
  const session = await requireStaff();

  const result: ImportResult = {
    entreprisesCreees: 0,
    entreprisesReutilisees: 0,
    contactsCrees: 0,
    contactsIgnores: 0,
    lignesIgnorees: 0,
  };

  // Une même société revient sur plusieurs lignes (un contact par ligne) —
  // on évite de la re-chercher/créer à chaque fois.
  const entrepriseIdParNom = new Map<string, string>();

  for (const row of rows) {
    const societeNom = (row.societeNom ?? "").trim();
    if (!societeNom) {
      result.lignesIgnorees += 1;
      continue;
    }

    const cle = societeNom.toLocaleLowerCase("fr-FR");
    let entrepriseId = entrepriseIdParNom.get(cle);

    if (!entrepriseId) {
      const existante = await prisma.entreprise.findFirst({
        where: {
          AND: [
            entrepriseVisibilityWhere(session.user),
            { nom: { equals: societeNom, mode: "insensitive" } },
          ],
        },
        select: { id: true },
      });

      if (existante) {
        entrepriseId = existante.id;
        result.entreprisesReutilisees += 1;
      } else {
        const cree = await prisma.entreprise.create({
          data: {
            nom: societeNom,
            ville: row.ville?.trim() || null,
            siteWeb: row.siteWeb?.trim() || null,
            businessManagerId: session.user.id,
          },
          select: { id: true },
        });
        entrepriseId = cree.id;
        result.entreprisesCreees += 1;
      }
      entrepriseIdParNom.set(cle, entrepriseId);
    }

    const prenom = (row.prenom ?? "").trim();
    const nom = (row.nom ?? "").trim();
    if (!prenom || !nom) continue;

    const email = row.email?.trim() || null;
    const doublons = await findContactDuplicates(entrepriseId, nom, prenom, email, "");
    if (doublons.length > 0) {
      result.contactsIgnores += 1;
      continue;
    }

    await prisma.contact.create({
      data: {
        entrepriseId,
        prenom,
        nom,
        fonction: row.fonction?.trim() || null,
        email,
        telephone: row.telephone?.trim() || null,
      },
    });
    result.contactsCrees += 1;
  }

  revalidatePath("/admin/crm");
  return result;
}
