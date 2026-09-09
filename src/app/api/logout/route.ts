import { auth, signOut } from "@/auth";

// Route Handler dédiée à la déconnexion (plutôt qu'une Server Action liée à
// un <form>) : évite toute ambiguïté de résolution de Server Action sur les
// pages qui combinent plusieurs formulaires (ex. LogoutButton + un formulaire
// piloté par useActionState sur la même page).
export async function POST() {
  // Renvoie vers la page de connexion branded pour l'espace quitté (KERVIO
  // pour le staff, Bibliothèque pour un client) plutôt que systématiquement
  // vers la version client par défaut.
  const session = await auth();
  const redirectTo = session?.user && session.user.role !== "CLIENT" ? "/connexion?next=/admin" : "/connexion";
  await signOut({ redirectTo });
}
