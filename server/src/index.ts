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
const BUDGET_TOKENS = 10000;   // plafond de tokens pour toute la conversation
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

const maya: Agent = {
  nom: "Maya",
  role: "Tu es Maya, intendante : tu gères le stock de ressources et les récoltes.",
};


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
// Même personnage que le chef, mais avec une consigne différente : résumer.
const redactrice: Agent = {
  nom: "Lyra",
  role:
    "Tu es Lyra, cheffe de projet. À partir des résultats de ton équipe, tu " +
    "rédiges un court rapport final (5 phrases maximum) : ce qui est décidé et " +
    "ce qui manque encore. Tu n'inventes rien.",
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
// Un agent exécute UNE tâche en tenant compte des résultats déjà produits.
async function executerTache(
  agent: Agent,
  tache: Tache,
  demande: string,
  resultats: string[]
): Promise<{ texte: string; tokens: number }> {
  // Si c'est la première tâche, il n'y a encore aucun résultat.
  const contexte = resultats.length > 0 ? resultats.join("\n\n") : "(aucun résultat pour le moment)";

  const reponse = await client.messages.create({
    model: "claude-haiku-5-5",
    max_tokens: 800,
    // On interdit explicitement d'inventer des données : voir la remarque plus bas.
    system:
      agent.role +
      "\nSi une information te manque (stock, mesures...), dis-le clairement " +
      "au lieu de l'inventer. Réponds en 4 phrases maximum.",
    messages: [
      {
        role: "user",
        content:
          `Demande globale : ${demande}\n\n` +
          `Résultats déjà obtenus :\n${contexte}\n\n` +
          `Ta tâche (#${tache.id}) : ${tache.description}`,
      },
    ],
  });

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
  const demande = "Construire une petite maison à une pièce au bord du point d'eau.";
  const equipe = [orion, maya];
  let tokensTotal = 0;

  // 1) Le chef établit le plan.
  const plan = await demanderPlan(demande, equipe);
  tokensTotal += plan.tokens;

  // 2) Chaque tâche est exécutée par l'agent assigné, dans l'ordre.
  const historique: Message[] = [];
  for (const tache of plan.taches) {
    // Garde-fou : on s'arrête si le budget est atteint.
    if (tokensTotal >= BUDGET_TOKENS) {
      console.log("\n[Arrêt] Budget de tokens atteint.");
      break;
    }

    // Array.find renvoie le premier élément qui correspond.
    // Doc : https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Global_Objects/Array/find
    const agent = equipe.find((a) => a.nom === tache.assigneA);
    if (!agent) continue; // sécurité : ne devrait pas arriver (déjà filtré)

    const resultatsPrecedents = historique.map((m) => `${m.auteur} : ${m.texte}`);
    const { texte, tokens } = await executerTache(agent, tache, demande, resultatsPrecedents);
    tokensTotal += tokens;

    historique.push({ auteur: `${agent.nom} (tâche #${tache.id})`, texte });
    console.log(`#${tache.id} ${agent.nom} : ${texte}\n`);
  }

  // 3) Le chef rédige le rapport final (on réutilise faireParler).
  const rapport = await faireParler(redactrice, demande, historique);
  tokensTotal += rapport.tokens;
  console.log(`--- RAPPORT FINAL ---\n${rapport.texte}\n`);

  console.log(`Tokens utilisés au total : ${tokensTotal}`);
}

main().catch((erreur) => {
  console.error("Erreur :", erreur.message);
});

