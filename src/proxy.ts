import { NextResponse } from "next/server";
import { auth } from "@/auth";

// Aucun contenu n'est visible sans authentification (§2.3). Le middleware
// protège toutes les routes applicatives et redirige selon le rôle.
export default auth((req) => {
  const { pathname } = req.nextUrl;
  const user = req.auth?.user;

  const isPublic =
    pathname === "/" ||
    pathname.startsWith("/connexion") ||
    pathname.startsWith("/mot-de-passe-oublie") ||
    pathname.startsWith("/reinitialiser") ||
    pathname.startsWith("/legal") ||
    pathname.startsWith("/api/auth");

  if (isPublic) return NextResponse.next();

  if (!user) {
    const url = new URL("/connexion", req.nextUrl.origin);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith("/admin") && user.role === "CLIENT") {
    return NextResponse.redirect(new URL("/bibliotheque", req.nextUrl.origin));
  }

  // Le staff (admin, directeur de BU, BM) peut prévisualiser l'espace
  // client ; seul CLIENT y a un accès natif.
  const STAFF_ROLES = ["ADMIN", "DIRECTEUR_BU", "BM"];
  if (
    pathname.startsWith("/bibliotheque") &&
    user.role !== "CLIENT" &&
    !STAFF_ROLES.includes(user.role as string)
  ) {
    return NextResponse.redirect(new URL("/connexion", req.nextUrl.origin));
  }

  if (
    (pathname.startsWith("/admin/utilisateurs") ||
      pathname.startsWith("/admin/referentiels") ||
      pathname.startsWith("/admin/journaux")) &&
    user.role !== "ADMIN"
  ) {
    return NextResponse.redirect(new URL("/admin", req.nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
