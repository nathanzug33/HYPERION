import ResetForm from "./reset-form";

export default async function ResetPasswordPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-blue-bg-soft px-4">
      <div className="w-full max-w-sm bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
        <h1 className="text-lg font-semibold text-brand-ink mb-4">
          Nouveau mot de passe
        </h1>
        <ResetForm token={token} />
      </div>
    </div>
  );
}
