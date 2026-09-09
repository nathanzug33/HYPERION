import type { Metadata } from "next";
import "./globals.css";
import CookieBanner from "@/components/CookieBanner";

export const metadata: Metadata = {
  title: "HYPERION",
  description:
    "Hyperion Group — pilotage ATS/CRM (interne) et bibliothèque de profils de consultants anonymisés (clients).",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-brand-blue-bg-soft text-brand-ink font-sans">
        {children}
        <CookieBanner />
      </body>
    </html>
  );
}
