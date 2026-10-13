// =============================================================================
// Hivetown : serveur d'agents IA
// Flux : le chef établit un plan -> les agents exécutent les tâches
//        -> le chef rédige un rapport final.
// =============================================================================

// Charge les variables du fichier .env dans process.env (ANTHROPIC_API_KEY).
// Doc : https://github.com/motdotla/dotenv
import "dotenv/config";

// SDK officiel : lit automatiquement ANTHROPIC_API_KEY dans process.env.
// Doc : https://github.com/anthropics/anthropic-sdk-typescript
import Anthropic from "@anthropic-ai/sdk";

// État du monde partagé (stock, emplacement, maison) défini dans monde.ts.
// Si TypeScript ou tsx réclame l'extension, utilise "./monde.js".
import { monde, decrireMonde, verifierConstruction } from "./monde";
import { sauverDecision, effacerDecision, type Decision } from "./decision";

const client = new Anthropic();

// -----------------------------------------------------------------------------
// Types : ils décrivent la forme des objets manipulés.
// Doc : https://www.typescriptlang.org/docs/handbook/2/objects.html
// -----------------------------------------------------------------------------

// Un agent = un nom + un rôle (le "prompt système").
type Agent = { nom: string; role: string };

// Une ligne de conversation ou un résultat de tâche.
type Message = { auteur: string; texte: string };

// Une tâche assignée à un membre de l'équipe par le chef.
type Tache = { id: number; assigneA: string; description: string };

// -----------------------------------------------------------------------------
// Garde-fous (promesse du README : jamais de boucle infinie ni de dépense folle)
// -----------------------------------------------------------------------------
const MODELE = "claude-haiku-5-5"; // modèle léger et peu coûteux
const MAX_TACHES = 4;              // le chef ne peut pas créer plus de 4 tâches
const BUDGET_TOKENS = 15000;       // plafond de tokens pour tout le projet

// -----------------------------------------------------------------------------
// Les personnages. Le "prompt système" fixe le rôle et les contraintes.
// Doc : https://docs.claude.com/en/docs/build-with-claude/prompt-engineering/system-prompts
// -----------------------------------------------------------------------------

// Le chef : il découpe une demande en tâches.
const chef: Agent = {
  nom: "Lyra",
  role:
    "Tu es Lyra, cheffe de projet d'Hivetown. Tu découpes une demande en " +
    "tâches courtes, concrètes et réalistes. Tu n'inventes jamais de ressources.",
};

// Le même personnage, mais avec la mission de résumer le travail de l'équipe.
const redactrice: Agent = {
  nom: "Lyra",
  role:
    "Tu es Lyra, cheffe de projet. À partir des résultats de ton équipe, tu " +
    "rédiges un court rapport final (5 phrases maximum) : ce qui est décidé et " +
    "ce qui manque encore. Tu n'inventes rien.",
};

// Les membres de l'équipe qui reçoivent les tâches.
const orion: Agent = {
  nom: "Orion",
  role: "Tu es Orion, bâtisseur : tu construis et évalues la faisabilité technique.",
};

const maya: Agent = {
  nom: "Maya",
  role: "Tu es Maya, intendante : tu gères le stock de ressources et les récoltes.",
};

// -----------------------------------------------------------------------------
// faireParler : fait parler UN agent à partir d'un historique de messages.
// Renvoie son texte et les tokens consommés.
// Promise<...> : type de retour d'une fonction async.
// Doc : https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Global_Objects/Promise
// -----------------------------------------------------------------------------
async function faireParler(
  agent: Agent,
  sujet: string,
  historique: Message[]
): Promise<{ texte: string; tokens: number }> {
  // Une ligne "Nom : phrase" par message.
  // Doc map : https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Global_Objects/Array/map
  // Doc join : https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Global_Objects/Array/join
  const conversation = historique.map((m) => `${m.auteur} : ${m.texte}`).join("\n");

  // Appel à l'API Messages. Doc : https://docs.claude.com/en/api/messages
  const reponse = await client.messages.create({
    model: MODELE,
    max_tokens: 800, // la réflexion interne compte dans cette limite
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

  // stop_reason = "max_tokens" signifie que la réponse a été coupée.
  if (reponse.stop_reason === "max_tokens") {
    console.warn(`[Attention] La réponse de ${agent.nom} a été coupée (max_tokens).`);
  }

  // La réponse est une liste de blocs : on concatène ceux de type "text".
  let texte = "";
  for (const bloc of reponse.content) {
    if (bloc.type === "text") texte += bloc.text;
  }

  return {
    texte,
    tokens: reponse.usage.input_tokens + reponse.usage.output_tokens,
  };
}

// -----------------------------------------------------------------------------
// lireJson : transforme le texte renvoyé par le chef en objet JavaScript.
// On retire d'abord d'éventuelles balises ```json que le modèle pourrait ajouter.
// Doc regex : https://developer.mozilla.org/fr/docs/Web/JavaScript/Guide/Regular_expressions
// Doc JSON.parse : https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Global_Objects/JSON/parse
// -----------------------------------------------------------------------------
function lireJson(texte: string): unknown {
  const nettoye = texte.replace(/```json|```/g, "").trim();
  return JSON.parse(nettoye); // lance une erreur si le JSON est invalide
}

// -----------------------------------------------------------------------------
// demanderPlan : le chef découpe la demande en tâches assignées à l'équipe.
// -----------------------------------------------------------------------------
async function demanderPlan(
  demande: string,
  equipe: Agent[]
): Promise<{ taches: Tache[]; tokens: number }> {
  // Liste lisible de l'équipe, incluse dans la consigne.
  const membres = equipe.map((a) => `- ${a.nom} : ${a.role}`).join("\n");

  const reponse = await client.messages.create({
    model: MODELE,
    max_tokens: 1500,
    system: chef.role + "\nTu réponds UNIQUEMENT avec du JSON valide, sans texte autour. Tu ne crées que des tâches réalisables avec les ressources et les règles de l'état du monde.",
    messages: [
      {
        role: "user",
        content:
          `Demande : ${demande}\n\nÉquipe disponible :\n${membres}\n\n` +
          `État du monde (données fiables) :\n${decrireMonde(monde)}\n\n` +
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
  // Doc Array.isArray : https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Global_Objects/Array/isArray
  if (!Array.isArray(brut.taches)) {
    throw new Error("Le chef n'a pas renvoyé une liste de tâches valide.");
  }

  const noms = equipe.map((a) => a.nom);
  const taches = brut.taches
    .slice(0, MAX_TACHES)                      // pas plus de MAX_TACHES
    .filter((t) => noms.includes(t.assigneA)); // seulement des membres existants

  return {
    taches,
    tokens: reponse.usage.input_tokens + reponse.usage.output_tokens,
  };
}

// -----------------------------------------------------------------------------
// executerTache : un agent exécute UNE tâche, avec l'état du monde et les
// résultats déjà produits par les autres agents.
// -----------------------------------------------------------------------------
async function executerTache(
  agent: Agent,
  tache: Tache,
  demande: string,
  resultats: string[]
): Promise<{ texte: string; tokens: number }> {
  // Pour la première tâche, il n'y a encore aucun résultat.
  const contexte =
    resultats.length > 0 ? resultats.join("\n\n") : "(aucun résultat pour le moment)";

  const reponse = await client.messages.create({
    model: MODELE,
    max_tokens: 800,
    system:
      agent.role +
      "\nUtilise UNIQUEMENT les données de l'état du monde et les résultats " +
      "déjà obtenus. Si une information manque, dis-le au lieu de l'inventer. " +
      "Réponds en 4 phrases maximum.",
    messages: [
      {
        role: "user",
        content:
          `Demande globale : ${demande}\n\n` +
          `État actuel du monde (données fiables) :\n${decrireMonde(monde)}\n\n` +
          `Résultats déjà obtenus :\n${contexte}\n\n` +
          `Ta tâche (#${tache.id}) : ${tache.description}`,
      },
    ],
  });

  if (reponse.stop_reason === "max_tokens") {
    console.warn(`[Attention] La réponse de ${agent.nom} a été coupée (max_tokens).`);
  }

  let texte = "";
  for (const bloc of reponse.content) {
    if (bloc.type === "text") texte += bloc.text;
  }

  return {
    texte,
    tokens: reponse.usage.input_tokens + reponse.usage.output_tokens,
  };
}
// Orion choisit un emplacement. Le modèle PROPOSE, le code VÉRIFIE.
async function demanderDecision(
  agent: Agent,
  demande: string,
  resultats: string[]
): Promise<{ decision: Decision | null; tokens: number }> {
  const reponse = await client.messages.create({
    model: MODELE,
    max_tokens: 800,
    system: agent.role + "\nTu réponds UNIQUEMENT avec du JSON valide, sans texte autour.",
    messages: [
      {
        role: "user",
        content:
          `Demande : ${demande}\n\n` +
          `État actuel du monde (données fiables) :\n${decrireMonde(monde)}\n\n` +
          `Résultats de l'équipe :\n${resultats.join("\n\n") || "(aucun)"}\n\n` +
          `Choisis UN emplacement de la liste qui respecte les règles. Format exact :\n` +
          `{"emplacementId":"X","raison":"une phrase"}`,
      },
    ],
  });

  let texte = "";
  for (const bloc of reponse.content) {
    if (bloc.type === "text") texte += bloc.text;
  }
  const tokens = reponse.usage.input_tokens + reponse.usage.output_tokens;

  // Le JSON peut être invalide : on le gère au lieu de planter.
  let brut: { emplacementId?: string; raison?: string };
  try {
    brut = lireJson(texte) as { emplacementId?: string; raison?: string };
  } catch {
    console.warn("[Refusé] Orion n'a pas renvoyé un JSON valide.");
    return { decision: null, tokens };
  }
  if (typeof brut.emplacementId !== "string") {
    console.warn("[Refusé] Aucun emplacement indiqué par Orion.");
    return { decision: null, tokens };
  }

  // Vérification par le code : on ne croit jamais le modèle sur parole.
  const erreur = verifierConstruction(monde, brut.emplacementId);
  if (erreur) {
    console.warn(`[Refusé] Choix d'Orion rejeté par le code : ${erreur}`);
    return { decision: null, tokens };
  }

  return {
    decision: {
      emplacementId: brut.emplacementId,
      raison: brut.raison ?? "", // ?? : valeur par défaut si undefined. Doc : https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Operators/Nullish_coalescing
      date: new Date().toISOString(),
    },
    tokens,
  };
}

// -----------------------------------------------------------------------------
// main : orchestre tout le flux.
// "async" permet d'utiliser "await" à l'intérieur.
// Doc : https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Statements/async_function
// -----------------------------------------------------------------------------
async function main(): Promise<void> {
  const demande = "Construire une petite maison à une pièce au bord du point d'eau.";
  const equipe = [orion, maya];
  let tokensTotal = 0;
  effacerDecision(); // chaque exécution repart d'une carte sans décision

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

    // Array.find renvoie le premier élément qui correspond (ou undefined).
    // Doc : https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Global_Objects/Array/find
    const agent = equipe.find((a) => a.nom === tache.assigneA);
    if (!agent) continue; // sécurité : déjà filtré dans demanderPlan

    const resultatsPrecedents = historique.map((m) => `${m.auteur} : ${m.texte}`);
    const { texte, tokens } = await executerTache(agent, tache, demande, resultatsPrecedents);
    tokensTotal += tokens;

    historique.push({ auteur: `${agent.nom} (tâche #${tache.id})`, texte });
    console.log(`#${tache.id} ${agent.nom} : ${texte}\n`);
  }
  // 2 bis) Orion choisit l'emplacement ; le code valide ; on enregistre.
  if (tokensTotal < BUDGET_TOKENS) {
    const resultats = historique.map((m) => `${m.auteur} : ${m.texte}`);
    const choix = await demanderDecision(orion, demande, resultats);
    tokensTotal += choix.tokens;

    if (choix.decision) {
      sauverDecision(choix.decision);
      console.log(`[Décision] Emplacement ${choix.decision.emplacementId} : ${choix.decision.raison}\n`);
    } else {
      console.log("[Aucune décision valide] Rien n'est enregistré.\n");
    }
  }

  // 3) Le chef rédige le rapport final (on réutilise faireParler).
  const rapport = await faireParler(redactrice, demande, historique);
  tokensTotal += rapport.tokens;
  console.log(`--- RAPPORT FINAL ---\n${rapport.texte}\n`);

  console.log(`Tokens utilisés au total : ${tokensTotal}`);
}

// Point d'entrée : on affiche seulement le message d'erreur, jamais la clé API.
// "instanceof Error" : en TypeScript strict, une erreur capturée est de type "unknown".
// Doc : https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Operators/instanceof
main().catch((erreur: unknown) => {
  console.error("Erreur :", erreur instanceof Error ? erreur.message : erreur);
});