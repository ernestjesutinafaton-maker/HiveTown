// Données du monde, séparées du code d'affichage.
// "export" rend une valeur importable depuis un autre fichier.
// Doc : https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Statements/export

// Règles du monde (les mêmes que côté serveur pour l'instant).


// Conversion données -> 3D : la rive est à z = RIVE_Z, et 1 mètre de distance
// à la rive vaut ECHELLE unités dans la scène.
export const RIVE_Z = -7;
export const ECHELLE = 0.4;

// Récupère l'état du monde depuis le serveur.
// Doc fetch : https://developer.mozilla.org/fr/docs/Web/API/Fetch_API/Using_Fetch
export async function chargerMonde() {
  const reponse = await fetch("http://localhost:3000/api/monde");
  if (!reponse.ok) throw new Error(`Erreur serveur : ${reponse.status}`);
  return reponse.json();
}

// Un emplacement est valide si la marge au-dessus de la crue est suffisante.
// Les règles viennent maintenant du serveur (objet "monde").
export function estValide(emplacement, monde) {
  return emplacement.hauteurAuDessusEauM - monde.crueMaxM >= monde.margeCrueMinM;
}