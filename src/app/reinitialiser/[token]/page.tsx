import ResetForm from "./reset-form";

export default async function ResetPasswordPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="topbar-gradient absolute inset-0" />
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4">
        <div className="animate-fade-in w-full max-w-sm rounded-2xl bg-white p-7 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.35)]">
          <h1 className="text-lg font-semibold text-brand-ink mb-4">
            Nouveau mot de passe
          </h1>
          <ResetForm token={token} />
        </div>
      </div>
    </div>
  );
}
