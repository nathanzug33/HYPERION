// Écran de chargement générique (Suspense fallback via loading.tsx) — affiché
// immédiatement au clic pendant que la page suivante récupère ses données
// côté serveur, pour que la navigation ne semble jamais figée. Volontairement
// générique (pas un skeleton par page) : le gain visé est le retour visuel
// instantané, pas une réplique exacte de chaque mise en page.
export default function PageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="h-7 w-56 animate-pulse rounded-md bg-slate-200" />
        <div className="h-4 w-80 animate-pulse rounded-md bg-slate-100" />
      </div>
      <div className="card space-y-3 p-5">
        {[92, 80, 88, 70, 84, 60].map((width, i) => (
          <div
            key={i}
            className="h-4 animate-pulse rounded-md bg-slate-100"
            style={{ width: `${width}%` }}
          />
        ))}
      </div>
    </div>
  );
}
