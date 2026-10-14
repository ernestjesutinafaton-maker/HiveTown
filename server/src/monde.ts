// État du monde partagé par tous les agents.
// Plus tard, ces données viendront du monde 3D et d'une base de données.

// "export" rend le type et les valeurs importables depuis un autre fichier.
// Doc : https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Statements/export

// Un emplacement candidat pour construire.
// Doc des types objet : https://www.typescriptlang.org/docs/handbook/2/objects.html
export type Emplacement = {
  id: string;
  nom: string;
  x: number;                   // position latérale sur la carte
  distanceRiveM: number;
  hauteurAuDessusEauM: number;
  sol: string;
};

// L'état complet du monde. Tous les champs sont au même niveau (structure "à plat") :
// le client 3D lit monde.crueMaxM et monde.emplacements directement.
export type EtatMonde = {
  stock: { bois: number; pierre: number; argile: number };         // en unités
  besoinsMaison: { bois: number; pierre: number; argile: number }; // coût de la maison, en unités
  crueMaxM: number;            // hauteur maximale de la crue, en mètres
  margeCrueMinM: number;       // marge minimale exigée au-dessus de la crue, en mètres
  emplacements: Emplacement[]; // les emplacements parmi lesquels choisir
  maison: { dimensionsM: string; modeConstruction: string };
  regles: string[];            // règles générales, en toutes lettres pour les agents
};

// Ces valeurs sont des exemples : change-les, ce sont les règles de TON monde.
export const monde: EtatMonde = {
  stock: { bois: 400, pierre: 250, argile: 1000 },
  besoinsMaison: { bois: 30, pierre: 20, argile: 8 },
  crueMaxM: 3,
  margeCrueMinM: 1,
  emplacements: [
    { id: "A", nom: "Berge basse", x: -4, distanceRiveM: 5,  hauteurAuDessusEauM: 2, sol: "sableux" },
    { id: "B", nom: "Replat",      x:  0, distanceRiveM: 15, hauteurAuDessusEauM: 3, sol: "argileux" },
    { id: "C", nom: "Colline",     x:  4, distanceRiveM: 25, hauteurAuDessusEauM: 5, sol: "rocheux" },
    { id: "D", nom: "Terrasse",    x: -4, distanceRiveM: 25, hauteurAuDessusEauM: 4, sol: "argileux" },
  ],
  maison: { dimensionsM: "4 x 4", modeConstruction: "murs en pierre, toit en bois" },
  regles: [
    "Les seules ressources de ce monde sont le bois, la pierre et l'argile.",
    "Les outils sont fournis gratuitement et il n'y a pas de nourriture à gérer.",
    "Seules les règles de ce monde comptent, pas les connaissances du monde réel.",
    "Toutes les quantités (stock et besoins) sont exprimées dans la même unité et sont directement comparables.",
    "Si la marge de crue n'est pas respectée, la seule solution est de choisir un autre emplacement : la surélévation n'existe pas dans ce monde.",
    "Pour construire, il faut choisir un emplacement de la liste « emplacements » qui respecte la marge de crue minimale.",
  ],
};

// Transforme l'état du monde en texte lisible, à insérer dans les prompts.
// JSON.stringify(valeur, null, 2) : le "2" ajoute une indentation lisible.
// Doc : https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify
export function decrireMonde(m: EtatMonde): string {
  return JSON.stringify(m, null, 2);
}
// Vérifie en CODE (pas par le modèle) qu'on peut construire à cet emplacement.
// Renvoie null si tout est valide, sinon un message d'erreur.
// Doc Array.find : https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Global_Objects/Array/find
export function verifierConstruction(m: EtatMonde, emplacementId: string): string | null {
  const emp = m.emplacements.find((e) => e.id === emplacementId);
  if (!emp) return `Emplacement inconnu : ${emplacementId}`;

  // Règle de crue : hauteur - crue max doit être >= marge minimale.
  if (emp.hauteurAuDessusEauM - m.crueMaxM < m.margeCrueMinM) {
    return `Marge de crue insuffisante pour « ${emp.nom} »`;
  }

  // Règle de stock : il faut assez de chaque ressource.
  const { stock, besoinsMaison: b } = m;
  if (stock.bois < b.bois || stock.pierre < b.pierre || stock.argile < b.argile) {
    return "Stock insuffisant pour construire la maison";
  }

  return null; // tout est valide
}