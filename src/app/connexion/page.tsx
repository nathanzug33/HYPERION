import { Suspense } from "react";
import LoginForm from "./login-form";

export default function ConnexionPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-blue-bg-soft px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-xl font-semibold text-brand-ink">
            Bibliothèque de dossiers de compétences
          </h1>
          <p className="mt-2 text-sm text-brand-gray">
            Accès réservé et journalisé. Chaque connexion est associée
            nominativement à votre compte.
          </p>
        </div>
        <Suspense>
          <LoginFormWrapper searchParams={searchParams} />
        </Suspense>
        <p className="mt-6 text-center text-xs text-brand-gray">
          Accès non ouvert ? Contactez votre business manager.
        </p>
      </div>
    </div>
  );
}

async function LoginFormWrapper({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  return <LoginForm next={params.next ?? "/"} />;
}
