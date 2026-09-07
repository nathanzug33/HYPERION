import Link from "next/link";

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <div className="space-y-4 text-sm leading-6 text-brand-body [&_h1]:text-xl [&_h1]:font-semibold [&_h1]:text-brand-ink [&_h2]:mt-6 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-brand-ink">
        {children}
      </div>
      <div className="mt-10">
        <Link href="/" className="text-sm text-brand-gray underline">
          Retour
        </Link>
      </div>
    </div>
  );
}
