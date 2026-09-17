"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export type ScoreBarDatum = { name: string; value: number; color: string };

/** Petit histogramme (une barre par indicateur, couleur libre par barre) —
 * utilisé pour les scores hebdomadaires CRM/ATS du tableau de bord. Volontairement
 * minimaliste (pas de légende ni d'axe Y à graduations lourdes) : l'objectif est un
 * repère visuel rapide, pas une analyse fine.
 *
 * L'échelle est fixée à `minMax` (10 par défaut) plutôt que calée sur le
 * maximum réel des données : avec seulement quelques RDV, un axe auto-ajusté
 * (0 à 4, par ex.) rend les barres visuellement pleines même pour de petits
 * nombres, ce qui écrase toute lecture de progression semaine après semaine.
 * L'échelle grandit au-delà de `minMax` si une valeur le dépasse. */
export default function ScoreBarChart({
  data,
  height = 200,
  minMax = 10,
}: {
  data: ScoreBarDatum[];
  height?: number;
  minMax?: number;
}) {
  const domainMax = Math.max(minMax, ...data.map((d) => d.value));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="#eef2f7" />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 11, fill: "#64748b" }}
          axisLine={{ stroke: "#e2e8f0" }}
          tickLine={false}
          interval={0}
        />
        <YAxis
          allowDecimals={false}
          domain={[0, domainMax]}
          tick={{ fontSize: 11, fill: "#64748b" }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          cursor={{ fill: "#f1f5f9" }}
          contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }}
        />
        <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={56}>
          {data.map((d) => (
            <Cell key={d.name} fill={d.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
