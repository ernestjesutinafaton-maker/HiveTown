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

// Le "prompt système" fixe le rôle et les contraintes de chaque agent.
// Doc : https://docs.claude.com/en/docs/build-with-claude/prompt-engineering/system-prompts
const lyra: Agent = {
  nom: "Lyra",
  role:
    "Tu es Lyra, cheffe de projet prudente dans le monde d'Hivetown. " +
    "Tu proposes des plans simples et réalistes. " +
    "Tu refuses toute proposition exagérée. Réponds en 2 phrases maximum.",
};

const orion: Agent = {
  nom: "Orion",
  role:
    "Tu es Orion, bâtisseur dans le monde d'Hivetown. " +
    "Tu évalues la faisabilité de ce qu'on te propose et tu poses une question utile. " +
    "Réponds en 2 phrases maximum.",
};

// Fait parler UN agent et renvoie son texte + les tokens consommés.
// Promise<...> : le type de retour d'une fonction async.
// Doc : https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Global_Objects/Promise
async function faireParler(
  agent: Agent,
  sujet: string,
  historique: Message[]
): Promise<{ texte: string; tokens: number }> {
  // On transforme l'historique en texte : une ligne "Nom : phrase" par message.
  // Doc map/join : https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Global_Objects/Array/map
  const conversation = historique.map((m) => `${m.auteur} : ${m.texte}`).join("\n");

  const reponse = await client.messages.create({
    model: "claude-haiku-5-5",
    max_tokens: 800,
    system: agent.role,
    messages: [
      {
        role: "user",
        content:
          `Sujet : ${sujet}\n\n` +
          `Conversation jusqu'ici :\n${conversation || "(aucune)"}\n\n` +
          `À toi de parler, ${agent.nom}.`,
      },
    ],
  });
// stop_reason indique pourquoi le modèle s'est arrêté.
// "max_tokens" = la réponse a été coupée par notre limite.
// Doc : https://docs.claude.com/en/api/messages
if (reponse.stop_reason === "max_tokens") {
  console.warn(`[Attention] La réponse de ${agent.nom} a été coupée (max_tokens).`);
}
  // On récupère le texte des blocs de type "text".
  let texte = "";
  for (const bloc of reponse.content) {
    if (bloc.type === "text") texte += bloc.text;
  }

  return {
    texte,
    tokens: reponse.usage.input_tokens + reponse.usage.output_tokens,
  };
}

async function main(): Promise<void> {
  const sujet = "Organiser la construction d'une nouvelle maison sur la carte d'Hivetown.";
  const agents = [lyra, orion];
  const historique: Message[] = [];
  let tokensUtilises = 0;

  for (let tour = 0; tour < MAX_TOURS; tour++) {
    // Garde-fou n°2 : on s'arrête si le budget est dépassé.
    if (tokensUtilises >= BUDGET_TOKENS) {
      console.log("\n[Arrêt] Budget de tokens atteint.");
      break;
    }

    // L'opérateur % (reste) alterne entre 0 et 1 : Lyra, Orion, Lyra...
    // Doc : https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Operators/Remainder
    const agent = agents[tour % agents.length];

    const { texte, tokens } = await faireParler(agent, sujet, historique);
    historique.push({ auteur: agent.nom, texte });
    tokensUtilises += tokens;

    console.log(`${agent.nom} : ${texte}\n`);
  }

  console.log(`Tokens utilisés au total : ${tokensUtilises}`);
}

main().catch((erreur) => {
  console.error("Erreur :", erreur.message);
});