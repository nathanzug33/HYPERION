import Link from "next/link";
import { periodeToInputDefaults, type Periode } from "@/lib/periode";

export default function PeriodeSelector({
  basePath,
  extraParams = {},
  current,
}: {
  basePath: string;
  extraParams?: Record<string, string | undefined>;
  current: Periode;
}) {
  const extraEntries = Object.entries(extraParams).filter(
    (entry): entry is [string, string] => Boolean(entry[1])
  );
  const extraQuery = extraEntries.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&");
  const withExtra = (q: string) => `${basePath}?${[extraQuery, q].filter(Boolean).join("&")}`;

  const options: { value: "jour" | "semaine" | "mois"; label: string }[] = [
    { value: "jour", label: "Aujourd'hui" },
    { value: "semaine", label: "Cette semaine" },
    { value: "mois", label: "Ce mois-ci" },
  ];

  const customDefaults =
    current.periode === "custom" ? periodeToInputDefaults(current) : { debut: "", fin: "" };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {options.map((o) => (
        <Link
          key={o.value}
          href={withExtra(`periode=${o.value}`)}
          className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
            current.periode === o.value
              ? "bg-brand-blue text-white"
              : "bg-slate-100 text-brand-body hover:bg-brand-blue-bg-soft"
          }`}
        >
          {o.label}
        </Link>
      ))}
      <form method="get" action={basePath} className="flex items-center gap-1.5">
        {extraEntries.map(([k, v]) => (
          <input key={k} type="hidden" name={k} value={v} />
        ))}
        <input type="hidden" name="periode" value="custom" />
        <input
          type="date"
          name="debut"
          defaultValue={customDefaults.debut}
          required
          className="input h-8 py-1 text-xs"
        />
        <span className="text-xs text-brand-gray">→</span>
        <input
          type="date"
          name="fin"
          defaultValue={customDefaults.fin}
          required
          className="input h-8 py-1 text-xs"
        />
        <button type="submit" className="btn btn-secondary py-1 text-xs">
          Appliquer
        </button>
      </form>
      <span className="text-xs text-brand-gray">Période affichée : {current.label}</span>
    </div>
  );
}
