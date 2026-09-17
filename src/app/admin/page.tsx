import { redirect } from "next/navigation";

// Ancien tableau de bord unique (ATS + CRM) — désormais scindé en deux pages
// dédiées pour l'alléger : /admin/tableau-de-bord/recrutement (ATS) et
// /admin/tableau-de-bord/commerce (CRM). Cette route reste l'atterrissage
// par défaut après connexion (liens existants vers /admin conservés).
export default function AdminDashboardRedirectPage() {
  redirect("/admin/tableau-de-bord/recrutement");
}
