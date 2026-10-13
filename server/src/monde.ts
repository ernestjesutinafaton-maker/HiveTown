// État du monde partagé par tous les agents.
// Plus tard, ces données viendront du monde 3D et d'une base de données.

// "export" rend le type et les valeurs importables depuis un autre fichier.
// Doc : https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Statements/export
export type EtatMonde = {
  stock: { bois: number; pierre: number; argile: number }; // en unités
  emplacement: {
    distanceRiveM: number;       // distance entre la rive et la zone choisie
    hauteurAuDessusEauM: number; // hauteur de la zone au-dessus du niveau d'eau actuel
    crueMaxM: number;            // hauteur maximale de l'eau observée au-dessus du niveau actuel
    sol: string;
      // Ce que coûte la construction de la maison (règle du monde).
  besoinsMaison: { bois: number; pierre: number; argile: number };
  // Marge minimale exigée entre la zone et la crue maximale, en mètres.
  margeCrueMinM: number;
  // Règles générales, écrites en toutes lettres pour les agents.
  regles: string[];
  };
  maison: { dimensionsM: string; modeConstruction: string };
};

// Ces valeurs sont des exemples : change-les, ce sont les règles de TON monde.
export const monde: EtatMonde = {
  stock: { bois: 400000, pierre: 250000, argile: 1000000 },
  emplacement: {
    distanceRiveM: 15,
    hauteurAuDessusEauM: 3,
    crueMaxM: 3,
    sol: "argileux, assez stable",
      besoinsMaison: { bois: 30, pierre: 20, argile: 8 },
  margeCrueMinM: 1,
  regles: [
    "Les seules ressources de ce monde sont le bois, la pierre et l'argile.",
    "Les outils sont fournis gratuitement et il n'y a pas de nourriture à gérer.",
    "Seules les règles de ce monde comptent, pas les connaissances du monde réel.",
    "Toutes les quantités (stock et besoins) sont exprimées dans la même unité et sont directement comparables.",
    "Si la marge de crue n'est pas respectée, la seule solution est de choisir un autre emplacement : la surélévation n'existe pas dans ce monde.",
  ],
  },
  maison: { dimensionsM: "4 x 4", modeConstruction: "murs en pierre, toit en bois" },
};

// Transforme l'état du monde en texte lisible, à insérer dans les prompts.
// JSON.stringify(valeur, null, 2) : le "2" ajoute une indentation lisible.
// Doc : https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify
export function decrireMonde(m: EtatMonde): string {
  return JSON.stringify(m, null, 2);
}