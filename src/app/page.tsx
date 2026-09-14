import { redirect } from "next/navigation";
import { auth } from "@/auth";

export default async function Home() {
  const session = await auth();
  if (!session?.user) redirect("/connexion?next=/admin");
  redirect(session.user.role === "CLIENT" ? "/bibliotheque" : "/admin");
}
