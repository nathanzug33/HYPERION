import { Suspense } from "react";
import LoginForm from "./login-form";

export default function ConnexionPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="topbar-gradient absolute inset-0" />
      <div
        className="pointer-events-none absolute -left-24 top-1/3 h-96 w-96 rounded-full bg-brand-blue-light/20 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-16 -top-16 h-80 w-80 rounded-full bg-brand-green-light/25 blur-3xl"
        aria-hidden
      />

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-12">
        <div className="grid w-full max-w-4xl gap-10 lg:grid-cols-[1fr_400px] lg:items-center">
          <div className="hidden text-white lg:block animate-fade-in">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/80 ring-1 ring-white/20">
              Accès réservé
            </span>
            <h1 className="mt-5 text-3xl font-semibold leading-tight text-white xl:text-4xl">
              Bibliothèque de dossiers
              <br />
              de compétences
            </h1>
            <p className="mt-4 max-w-sm text-sm leading-6 text-white/70">
              Consultez les profils de consultants anonymisés, suivez vos
              dossiers et vos demandes de contact — chaque connexion est
              journalisée et associée nominativement à votre compte.
            </p>
          </div>

          <div className="animate-fade-in w-full rounded-2xl bg-white p-7 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.35)] sm:p-8">
            <div className="mb-6 text-center lg:hidden">
              <h1 className="text-lg font-semibold text-brand-ink">
                Bibliothèque de dossiers de compétences
              </h1>
              <p className="mt-2 text-sm text-brand-gray">
                Accès réservé et journalisé.
              </p>
            </div>
            <div className="mb-6 hidden text-center lg:block">
              <h2 className="text-lg font-semibold text-brand-ink">Se connecter</h2>
              <p className="mt-1 text-sm text-brand-gray">
                Utilisez vos identifiants professionnels.
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
