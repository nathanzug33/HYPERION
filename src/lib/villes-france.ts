// Référentiel statique de villes françaises (préfectures, sous-préfectures et
// principales agglomérations) avec coordonnées approximatives (centre-ville).
// Choix volontaire d'un jeu de données embarqué plutôt qu'un service de
// géocodage externe : fonctionne hors-ligne, aucune donnée envoyée à un tiers,
// et une précision "ville" (quelques km) est largement suffisante pour un
// filtre de recherche par rayon — on ne vise jamais l'adresse précise.
//
// Si une ville n'est pas dans cette liste, elle reste utilisable comme texte
// libre (affichage du dossier), mais ne participera pas à la recherche par
// rayon tant que ses coordonnées ne sont pas connues.

export type VilleRef = {
  nom: string;
  lat: number;
  lng: number;
  departement: string;
};

export const VILLES_FRANCE: VilleRef[] = [
  { nom: "Paris", lat: 48.8566, lng: 2.3522, departement: "75" },
  { nom: "Marseille", lat: 43.2965, lng: 5.3698, departement: "13" },
  { nom: "Lyon", lat: 45.764, lng: 4.8357, departement: "69" },
  { nom: "Toulouse", lat: 43.6047, lng: 1.4442, departement: "31" },
  { nom: "Nice", lat: 43.7102, lng: 7.262, departement: "06" },
  { nom: "Nantes", lat: 47.2184, lng: -1.5536, departement: "44" },
  { nom: "Montpellier", lat: 43.6108, lng: 3.8767, departement: "34" },
  { nom: "Strasbourg", lat: 48.5734, lng: 7.7521, departement: "67" },
  { nom: "Bordeaux", lat: 44.8378, lng: -0.5792, departement: "33" },
  { nom: "Lille", lat: 50.6292, lng: 3.0573, departement: "59" },
  { nom: "Rennes", lat: 48.1173, lng: -1.6778, departement: "35" },
  { nom: "Reims", lat: 49.2583, lng: 4.0317, departement: "51" },
  { nom: "Le Havre", lat: 49.4944, lng: 0.1079, departement: "76" },
  { nom: "Saint-Étienne", lat: 45.4397, lng: 4.3872, departement: "42" },
  { nom: "Toulon", lat: 43.1242, lng: 5.928, departement: "83" },
  { nom: "Grenoble", lat: 45.1885, lng: 5.7245, departement: "38" },
  { nom: "Dijon", lat: 47.322, lng: 5.0415, departement: "21" },
  { nom: "Angers", lat: 47.4784, lng: -0.5632, departement: "49" },
  { nom: "Nîmes", lat: 43.8367, lng: 4.3601, departement: "30" },
  { nom: "Villeurbanne", lat: 45.7667, lng: 4.8794, departement: "69" },
  { nom: "Saint-Denis", lat: 48.9362, lng: 2.3574, departement: "93" },
  { nom: "Le Mans", lat: 48.0061, lng: 0.1996, departement: "72" },
  { nom: "Aix-en-Provence", lat: 43.5297, lng: 5.4474, departement: "13" },
  { nom: "Clermont-Ferrand", lat: 45.7772, lng: 3.087, departement: "63" },
  { nom: "Brest", lat: 48.3904, lng: -4.4861, departement: "29" },
  { nom: "Tours", lat: 47.3941, lng: 0.6848, departement: "37" },
  { nom: "Limoges", lat: 45.8336, lng: 1.2611, departement: "87" },
  { nom: "Amiens", lat: 49.8942, lng: 2.2957, departement: "80" },
  { nom: "Annecy", lat: 45.8992, lng: 6.1294, departement: "74" },
  { nom: "Perpignan", lat: 42.6887, lng: 2.8948, departement: "66" },
  { nom: "Besançon", lat: 47.238, lng: 6.0243, departement: "25" },
  { nom: "Metz", lat: 49.1193, lng: 6.1757, departement: "57" },
  { nom: "Orléans", lat: 47.9029, lng: 1.909, departement: "45" },
  { nom: "Rouen", lat: 49.4431, lng: 1.0993, departement: "76" },
  { nom: "Mulhouse", lat: 47.7508, lng: 7.3359, departement: "68" },
  { nom: "Caen", lat: 49.1829, lng: -0.3707, departement: "14" },
  { nom: "Nancy", lat: 48.6921, lng: 6.1844, departement: "54" },
  { nom: "Saint-Denis (Réunion)", lat: -20.8823, lng: 55.4504, departement: "974" },
  { nom: "Argenteuil", lat: 48.9474, lng: 2.2482, departement: "95" },
  { nom: "Montreuil", lat: 48.8638, lng: 2.4485, departement: "93" },
  { nom: "Roubaix", lat: 50.6942, lng: 3.1746, departement: "59" },
  { nom: "Tourcoing", lat: 50.7236, lng: 3.1611, departement: "59" },
  { nom: "Avignon", lat: 43.9493, lng: 4.8055, departement: "84" },
  { nom: "Créteil", lat: 48.7904, lng: 2.4556, departement: "94" },
  { nom: "Poitiers", lat: 46.5802, lng: 0.3404, departement: "86" },
  { nom: "Dunkerque", lat: 51.0343, lng: 2.3768, departement: "59" },
  { nom: "Versailles", lat: 48.8049, lng: 2.1204, departement: "78" },
  { nom: "Colombes", lat: 48.9236, lng: 2.2544, departement: "92" },
  { nom: "Fort-de-France", lat: 14.6161, lng: -61.0588, departement: "972" },
  { nom: "Aulnay-sous-Bois", lat: 48.9339, lng: 2.4926, departement: "93" },
  { nom: "Rueil-Malmaison", lat: 48.8779, lng: 2.1807, departement: "92" },
  { nom: "Pau", lat: 43.2951, lng: -0.3708, departement: "64" },
  { nom: "Aubervilliers", lat: 48.9145, lng: 2.3833, departement: "93" },
  { nom: "Le Tampon", lat: -21.2789, lng: 55.5158, departement: "974" },
  { nom: "Champigny-sur-Marne", lat: 48.8172, lng: 2.5152, departement: "94" },
  { nom: "Antibes", lat: 43.5804, lng: 7.1251, departement: "06" },
  { nom: "La Rochelle", lat: 46.1603, lng: -1.1511, departement: "17" },
  { nom: "Saint-Maur-des-Fossés", lat: 48.7994, lng: 2.4914, departement: "94" },
  { nom: "Cannes", lat: 43.5528, lng: 7.0174, departement: "06" },
  { nom: "Calais", lat: 50.9513, lng: 1.8587, departement: "62" },
  { nom: "Béziers", lat: 43.3442, lng: 3.2158, departement: "34" },
  { nom: "Colmar", lat: 48.0794, lng: 7.3585, departement: "68" },
  { nom: "Drancy", lat: 48.9256, lng: 2.4453, departement: "93" },
  { nom: "Mérignac", lat: 44.8333, lng: -0.6425, departement: "33" },
  { nom: "Ajaccio", lat: 41.9192, lng: 8.7386, departement: "2A" },
  { nom: "Saint-Nazaire", lat: 47.2733, lng: -2.2137, departement: "44" },
  { nom: "Issy-les-Moulineaux", lat: 48.8243, lng: 2.2739, departement: "92" },
  { nom: "Noisy-le-Grand", lat: 48.848, lng: 2.5533, departement: "93" },
  { nom: "Villeneuve-d'Ascq", lat: 50.6294, lng: 3.1442, departement: "59" },
  { nom: "Évry-Courcouronnes", lat: 48.6289, lng: 2.4406, departement: "91" },
  { nom: "Vénissieux", lat: 45.6975, lng: 4.8867, departement: "69" },
  { nom: "Clichy", lat: 48.9042, lng: 2.3059, departement: "92" },
  { nom: "Cergy", lat: 49.0364, lng: 2.0777, departement: "95" },
  { nom: "Pessac", lat: 44.8058, lng: -0.6314, departement: "33" },
  { nom: "Bourges", lat: 47.081, lng: 2.3987, departement: "18" },
  { nom: "Ivry-sur-Seine", lat: 48.8137, lng: 2.3866, departement: "94" },
  { nom: "Levallois-Perret", lat: 48.8933, lng: 2.2875, departement: "92" },
  { nom: "Quimper", lat: 47.9961, lng: -4.1, departement: "29" },
  { nom: "Valence", lat: 44.9334, lng: 4.8924, departement: "26" },
  { nom: "Antony", lat: 48.7539, lng: 2.2975, departement: "92" },
  { nom: "La Seyne-sur-Mer", lat: 43.1, lng: 5.8833, departement: "83" },
  { nom: "Troyes", lat: 48.2973, lng: 4.0744, departement: "10" },
  { nom: "Neuilly-sur-Seine", lat: 48.8846, lng: 2.2694, departement: "92" },
  { nom: "Sarcelles", lat: 48.9967, lng: 2.3808, departement: "95" },
  { nom: "Chambéry", lat: 45.5646, lng: 5.9178, departement: "73" },
  { nom: "Niort", lat: 46.3238, lng: -0.4577, departement: "79" },
  { nom: "Sartrouville", lat: 48.9367, lng: 2.1642, departement: "78" },
  { nom: "Lorient", lat: 47.7482, lng: -3.3661, departement: "56" },
  { nom: "Villejuif", lat: 48.7936, lng: 2.3639, departement: "94" },
  { nom: "Hyères", lat: 43.1203, lng: 6.1286, departement: "83" },
  { nom: "Épinay-sur-Seine", lat: 48.9542, lng: 2.3106, departement: "93" },
  { nom: "Chalon-sur-Saône", lat: 46.78, lng: 4.8546, departement: "71" },
  { nom: "Beauvais", lat: 49.4295, lng: 2.0808, departement: "60" },
  { nom: "Meaux", lat: 48.9601, lng: 2.8783, departement: "77" },
  { nom: "Martigues", lat: 43.4055, lng: 5.0472, departement: "13" },
  { nom: "Chelles", lat: 48.8825, lng: 2.5942, departement: "77" },
  { nom: "Fréjus", lat: 43.4331, lng: 6.7367, departement: "83" },
  { nom: "Vitry-sur-Seine", lat: 48.7876, lng: 2.3931, departement: "94" },
  { nom: "Clamart", lat: 48.7997, lng: 2.2664, departement: "92" },
  { nom: "Bondy", lat: 48.9022, lng: 2.4808, departement: "93" },
  { nom: "Angoulême", lat: 45.6484, lng: 0.156, departement: "16" },
  { nom: "Sevran", lat: 48.9394, lng: 2.5297, departement: "93" },
  { nom: "Saint-Quentin", lat: 49.8489, lng: 3.2867, departement: "02" },
  { nom: "La Roche-sur-Yon", lat: 46.6705, lng: -1.4267, departement: "85" },
  { nom: "Charleville-Mézières", lat: 49.7716, lng: 4.7199, departement: "08" },
  { nom: "Saint-Malo", lat: 48.6493, lng: -2.0257, departement: "35" },
  { nom: "Arles", lat: 43.6766, lng: 4.6278, departement: "13" },
  { nom: "Vannes", lat: 47.6582, lng: -2.7603, departement: "56" },
  { nom: "Laval", lat: 48.0736, lng: -0.7708, departement: "53" },
  { nom: "Évreux", lat: 49.0269, lng: 1.1509, departement: "27" },
  { nom: "Chartres", lat: 48.4439, lng: 1.4894, departement: "28" },
  { nom: "Blois", lat: 47.5861, lng: 1.3359, departement: "41" },
  { nom: "Albi", lat: 43.9298, lng: 2.1479, departement: "81" },
  { nom: "Auxerre", lat: 47.7982, lng: 3.5731, departement: "89" },
  { nom: "Cholet", lat: 47.0605, lng: -0.8792, departement: "49" },
  { nom: "Compiègne", lat: 49.4179, lng: 2.826, departement: "60" },
  { nom: "Bayonne", lat: 43.4929, lng: -1.4749, departement: "64" },
  { nom: "Bastia", lat: 42.6976, lng: 9.4507, departement: "2B" },
  { nom: "Agen", lat: 44.2049, lng: 0.6212, departement: "47" },
  { nom: "Montauban", lat: 44.0181, lng: 1.3533, departement: "82" },
  { nom: "Périgueux", lat: 45.1848, lng: 0.7211, departement: "24" },
  { nom: "Roanne", lat: 46.0367, lng: 4.0708, departement: "42" },
  { nom: "Vichy", lat: 46.1275, lng: 3.4267, departement: "03" },
  { nom: "Épinal", lat: 48.1739, lng: 6.4497, departement: "88" },
  { nom: "Cherbourg-en-Cotentin", lat: 49.6337, lng: -1.6222, departement: "50" },
  { nom: "Tarbes", lat: 43.2333, lng: 0.0833, departement: "65" },
  { nom: "Châteauroux", lat: 46.8106, lng: 1.6917, departement: "36" },
  { nom: "Saint-Brieuc", lat: 48.5136, lng: -2.7653, departement: "22" },
  { nom: "Boulogne-Billancourt", lat: 48.8352, lng: 2.2415, departement: "92" },
  { nom: "Massy", lat: 48.7267, lng: 2.2831, departement: "91" },
  { nom: "Vincennes", lat: 48.8478, lng: 2.4378, departement: "94" },
  { nom: "Pontoise", lat: 49.0508, lng: 2.1006, departement: "95" },
  { nom: "Melun", lat: 48.5389, lng: 2.6597, departement: "77" },
  { nom: "Fontainebleau", lat: 48.404, lng: 2.7017, departement: "77" },
  { nom: "Douai", lat: 50.3714, lng: 3.0797, departement: "59" },
  { nom: "Lens", lat: 50.4322, lng: 2.8319, departement: "62" },
  { nom: "Arras", lat: 50.2919, lng: 2.7778, departement: "62" },
  { nom: "Boulogne-sur-Mer", lat: 50.7264, lng: 1.6147, departement: "62" },
  { nom: "Thionville", lat: 49.3579, lng: 6.1673, departement: "57" },
  { nom: "Belfort", lat: 47.6386, lng: 6.8631, departement: "90" },
  { nom: "Annemasse", lat: 46.1936, lng: 6.2358, departement: "74" },
  { nom: "Vienne", lat: 45.5256, lng: 4.8742, departement: "38" },
  { nom: "Salon-de-Provence", lat: 43.6406, lng: 5.0967, departement: "13" },
  { nom: "Gap", lat: 44.5594, lng: 6.0783, departement: "05" },
  { nom: "Digne-les-Bains", lat: 44.0919, lng: 6.2356, departement: "04" },
  { nom: "Mende", lat: 44.5178, lng: 3.5, departement: "48" },
  { nom: "Rodez", lat: 44.3506, lng: 2.575, departement: "12" },
  { nom: "Cahors", lat: 44.4478, lng: 1.4406, departement: "46" },
  { nom: "Foix", lat: 42.9647, lng: 1.6053, departement: "09" },
  { nom: "Guéret", lat: 46.17, lng: 1.8697, departement: "23" },
  { nom: "Nevers", lat: 46.9897, lng: 3.1592, departement: "58" },
  { nom: "Mâcon", lat: 46.3069, lng: 4.8281, departement: "71" },
  { nom: "Bourg-en-Bresse", lat: 46.2058, lng: 5.2258, departement: "01" },
  { nom: "Privas", lat: 44.735, lng: 4.6, departement: "07" },
  { nom: "Aurillac", lat: 44.9297, lng: 2.4436, departement: "15" },
  { nom: "Moulins", lat: 46.5658, lng: 3.3325, departement: "03" },
  { nom: "Le Puy-en-Velay", lat: 45.0431, lng: 3.8858, departement: "43" },
  { nom: "Alençon", lat: 48.4325, lng: 0.0917, departement: "61" },
  { nom: "Saint-Lô", lat: 49.1147, lng: -1.0847, departement: "50" },
  { nom: "Laon", lat: 49.5642, lng: 3.6222, departement: "02" },
  { nom: "Vesoul", lat: 47.6236, lng: 6.1553, departement: "70" },
  { nom: "Lons-le-Saunier", lat: 46.6742, lng: 5.5511, departement: "39" },
  { nom: "Chaumont", lat: 48.1119, lng: 5.1394, departement: "52" },
  { nom: "Bar-le-Duc", lat: 48.7719, lng: 5.1614, departement: "55" },
  { nom: "Tulle", lat: 45.2667, lng: 1.7717, departement: "19" },
  { nom: "Cusset", lat: 46.1319, lng: 3.4547, departement: "03" },
];

function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

/** Recherche approximative (insensible aux accents/casse) d'une ville par son nom. */
export function findVille(nom: string): VilleRef | null {
  const target = normalize(nom);
  if (!target) return null;
  const exact = VILLES_FRANCE.find((v) => normalize(v.nom) === target);
  if (exact) return exact;
  const partial = VILLES_FRANCE.find(
    (v) => normalize(v.nom).startsWith(target) || target.startsWith(normalize(v.nom))
  );
  return partial ?? null;
}

/** Suggestions pour une saisie partielle (autocomplétion). */
export function suggestVilles(query: string, limit = 8): VilleRef[] {
  const target = normalize(query);
  if (!target) return [];
  return VILLES_FRANCE.filter((v) => normalize(v.nom).includes(target)).slice(0, limit);
}

/** Distance à vol d'oiseau entre deux points (km), formule de haversine. */
export function distanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
