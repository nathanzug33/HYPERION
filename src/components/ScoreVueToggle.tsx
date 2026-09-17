import Link from "next/link";

export default function ScoreVueToggle({
  current,
  scoreVueQuery,
}: {
  current: "semaine" | "periode";
  scoreVueQuery: (v: "semaine" | "periode") => string;
}) {
  const options: { value: "semaine" | "periode"; label: string }[] = [
    { value: "semaine", label: "Semaine (S-1 / S / S+1)" },
    { value: "periode", label: "Période" },
  ];
  return (
    <div className="flex gap-2">
      {options.map((o) => (
        <Link
          key={o.value}
          href={scoreVueQuery(o.value)}
          className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
            current === o.value
              ? "bg-brand-blue text-white"
              : "bg-slate-100 text-brand-body hover:bg-brand-blue-bg-soft"
          }`}
        >
          {o.label}
        </Link>
      ))}
    </div>
  );
}
