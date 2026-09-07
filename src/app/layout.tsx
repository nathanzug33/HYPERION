import type { Metadata } from "next";
import "./globals.css";
import CookieBanner from "@/components/CookieBanner";

export const metadata: Metadata = {
  title: "Bibliothèque de dossiers de compétences",
  description:
    "Portail client réservé — bibliothèque de profils de consultants anonymisés.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900 font-sans">
        {children}
        <CookieBanner />
      </body>
    </html>
  );
}
