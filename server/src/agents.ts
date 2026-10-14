// Les personnages et le client API, partagés par le script des agents
// et par le serveur web.

// Charge .env AVANT de créer le client (qui lit ANTHROPIC_API_KEY).
// Doc : https://github.com/motdotla/dotenv
import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";

// Un agent = un nom + un rôle (le "prompt système").
export type Agent = { nom: string; role: string };

export const client = new Anthropic();
export const MODELE = "claude-haiku-5-5"; // modèle léger et peu coûteux

// La cheffe de projet : elle découpe une demande en tâches.
export const chef: Agent = {
  nom: "Lyra",
  role:
    "Tu es Lyra, cheffe de projet d'Hivetown. Tu découpes une demande en " +
    "tâches courtes, concrètes et réalistes. Tu n'inventes jamais de ressources.",
};

// Le même personnage, avec la mission de résumer le travail de l'équipe.
export const redactrice: Agent = {
  nom: "Lyra",
  role:
    "Tu es Lyra, cheffe de projet. À partir des résultats de ton équipe, tu " +
    "rédiges un court rapport final (5 phrases maximum) : ce qui est décidé et " +
    "ce qui manque encore. Tu n'inventes rien.",
};

export const orion: Agent = {
  nom: "Orion",
  role: "Tu es Orion, bâtisseur : tu construis et évalues la faisabilité technique.",
};

export const maya: Agent = {
  nom: "Maya",
  role: "Tu es Maya, intendante : tu gères le stock de ressources et les récoltes.",
};

// Les personnages avec lesquels un visiteur peut discuter.
export const PERSONNAGES: Agent[] = [chef, orion, maya];