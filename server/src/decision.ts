// Enregistrement de la décision dans un fichier JSON partagé entre
// le script des agents (qui écrit) et le serveur web (qui lit).
// Doc du module fs : https://nodejs.org/api/fs.html
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

export type Decision = { emplacementId: string; raison: string; date: string };

// path.resolve part du dossier où tu lances la commande : lance-la depuis "server".
// Doc : https://nodejs.org/api/path.html#pathresolvepaths
const DOSSIER = path.resolve("data");
const FICHIER = path.join(DOSSIER, "decision.json");

export function sauverDecision(d: Decision): void {
  mkdirSync(DOSSIER, { recursive: true }); // crée le dossier s'il n'existe pas
  writeFileSync(FICHIER, JSON.stringify(d, null, 2), "utf-8");
}

export function lireDecision(): Decision | null {
  if (!existsSync(FICHIER)) return null;
  return JSON.parse(readFileSync(FICHIER, "utf-8")) as Decision;
}

// Efface l'ancienne décision (sinon une décision périmée resterait affichée).
export function effacerDecision(): void {
  rmSync(FICHIER, { force: true }); // force: pas d'erreur si le fichier n'existe pas
}