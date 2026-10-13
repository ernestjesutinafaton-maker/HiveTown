// Charge .env dans process.env. Doc : https://github.com/motdotla/dotenv
import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

// Un "type" décrit la forme d'un objet.
// Doc : https://www.typescriptlang.org/docs/handbook/2/objects.html
type Agent = { nom: string; role: string };
type Message = { auteur: string; texte: string };

// --- Garde-fous (promesse du README : jamais de boucle infinie) ---
const MAX_TOURS = 6;          // nombre maximal de prises de parole
const BUDGET_TOKENS = 8000;   // plafond de tokens pour toute la conversation
  // --- Garde-fous du chef ---
const MAX_TACHES = 4; // le chef ne peut pas créer plus de 4 tâches

// Une tâche assignée à un membre de l'équipe.
type Tache = { id: number; assigneA: string; description: string };

// Le chef : son rôle ne parle que de planification.
const chef: Agent = {
  nom: "Lyra",
  role:
    "Tu es Lyra, cheffe de projet d'Hivetown. Tu découpes une demande en " +
    "tâches courtes, concrètes et réalistes. Tu n'inventes jamais de ressources.",
};

// Les membres de l'équipe qui recevront les tâches.
const orion: Agent = {
  nom: "Orion",
  role: "Tu es Orion, bâtisseur : tu construis et évalues la faisabilité technique.",
};
const maya: Agent = {
  nom: "Maya",
  role: "Tu es Maya, intendante : tu gères le stock de ressources et les récoltes.",
};

// Transforme le texte renvoyé par le chef en objet JavaScript.
// On retire d'abord d'éventuelles balises ```json que le modèle pourrait ajouter.
// Doc regex : https://developer.mozilla.org/fr/docs/Web/JavaScript/Guide/Regular_expressions
// Doc JSON.parse : https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Global_Objects/JSON/parse
function lireJson(texte: string): unknown {
  const nettoye = texte.replace(/```json|```/g, "").trim();
  return JSON.parse(nettoye); // lance une erreur si le JSON est invalide
}

// Demande au chef un plan de tâches pour une demande donnée.
async function demanderPlan(
  demande: string,
  equipe: Agent[]
): Promise<{ taches: Tache[]; tokens: number }> {
  // Liste lisible de l'équipe, incluse dans la consigne.
  const membres = equipe.map((a) => `- ${a.nom} : ${a.role}`).join("\n");

  const reponse = await client.messages.create({
    model: "claude-haiku-5-5",
    max_tokens: 1500,
    system:
      chef.role +
      "\nTu réponds UNIQUEMENT avec du JSON valide, sans texte autour.",
    messages: [
      {
        role: "user",
        content:
          `Demande : ${demande}\n\nÉquipe disponible :\n${membres}\n\n` +
          `Réponds avec ce format exact, ${MAX_TACHES} tâches maximum :\n` +
          `{"taches":[{"id":1,"assigneA":"Nom","description":"..."}]}`,
      },
    ],
  });

  if (reponse.stop_reason === "max_tokens") {
    console.warn("[Attention] Le plan du chef a été coupé (max_tokens).");
  }

  let texte = "";
  for (const bloc of reponse.content) {
    if (bloc.type === "text") texte += bloc.text;
  }

  // "as" indique à TypeScript la forme attendue (le contenu reste à vérifier).
  // Doc : https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#type-assertions
  const brut = lireJson(texte) as { taches?: Tache[] };

  // Garde-fou : on ne fait jamais confiance aveuglément à la sortie du modèle.
  if (!Array.isArray(brut.taches)) {
    throw new Error("Le chef n'a pas renvoyé une liste de tâches valide.");
  }
  const noms = equipe.map((a) => a.nom);
  const taches = brut.taches
    .slice(0, MAX_TACHES)                       // pas plus de MAX_TACHES
    .filter((t) => noms.includes(t.assigneA));  // seulement des membres existants

  return {
    taches,
    tokens: reponse.usage.input_tokens + reponse.usage.output_tokens,
  };
}

async function main(): Promise<void> {
  const demande = "Construire une petite maison à une pièce au bord du point d'eau.";
  const equipe = [orion, maya];

  const { taches, tokens } = await demanderPlan(demande, equipe);

  for (const t of taches) {
    console.log(`#${t.id} → ${t.assigneA} : ${t.description}`);
  }
  console.log(`\nTokens utilisés : ${tokens}`);
}

main().catch((erreur) => {
  console.error("Erreur :", erreur.message);
});