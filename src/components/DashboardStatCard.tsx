import Link from "next/link";

const ACCENTS = {
  blue: { bg: "bg-brand-blue/10", text: "text-brand-blue-dark", bar: "bg-brand-blue" },
  green: { bg: "bg-brand-green/10", text: "text-brand-green", bar: "bg-brand-green" },
  amber: { bg: "bg-amber-100", text: "text-amber-700", bar: "bg-amber-400" },
  gray: { bg: "bg-slate-100", text: "text-brand-gray", bar: "bg-slate-300" },
} as const;

export default function StatCard({
  label,
  value,
  icon,
  accent,
  href,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  accent: keyof typeof ACCENTS;
  href?: string;
}) {
  const a = ACCENTS[accent];
  const content = (
    <>
      <span className={`absolute inset-x-0 top-0 h-1 ${a.bar}`} aria-hidden />
      <div className="flex items-start justify-between">
        <div className="text-3xl font-semibold text-brand-ink">{value}</div>
        <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${a.bg} ${a.text}`}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            {icon}
          </svg>
        </span>
      </div>
      <div className="mt-1 text-xs text-brand-gray">{label}</div>
    </>
  );

  if (href) {
    return (
      <Link href={href} className="card card-hover relative block overflow-hidden p-4">
        {content}
      </Link>
    );
  }

  return <div className="card relative overflow-hidden p-4">{content}</div>;
}
