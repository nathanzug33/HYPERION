import { signOut } from "@/auth";

// Route Handler dédiée à la déconnexion (plutôt qu'une Server Action liée à
// un <form>) : évite toute ambiguïté de résolution de Server Action sur les
// pages qui combinent plusieurs formulaires (ex. LogoutButton + un formulaire
// piloté par useActionState sur la même page).
export async function POST() {
  await signOut({ redirectTo: "/connexion" });
}
