// Charge les variables du fichier .env dans process.env.
// Doc : https://github.com/motdotla/dotenv
import "dotenv/config";

// Le SDK officiel lit automatiquement ANTHROPIC_API_KEY dans process.env.
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

// On met le code dans une fonction async pour pouvoir utiliser "await".
// Doc : https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Statements/async_function
async function main(): Promise<void> {
  // Appel à l'API Messages.
  // Doc : https://docs.claude.com/en/api/messages
  const reponse = await client.messages.create({
    model: "claude-haiku-5-5", // modèle léger et peu coûteux pour les tests
    max_tokens: 200,           // plafond de longueur de la réponse
    messages: [
      { role: "user", content: "Présente-toi en une phrase, comme un personnage d'un monde 3D." },
    ],
  });

  // Le contenu est une liste de blocs ; on affiche les blocs de type "text".
  for (const bloc of reponse.content) {
    if (bloc.type === "text") {
      console.log(bloc.text);
    }
  }

  // L'API renvoie aussi le nombre de tokens consommés. C'est la base du
  // suivi de budget par agent dont on parlait au début.
  console.log("Tokens en entrée :", reponse.usage.input_tokens);
  console.log("Tokens en sortie :", reponse.usage.output_tokens);
}

main().catch((erreur) => {
  // On n'affiche jamais la clé API dans les logs.
  console.error("Erreur lors de l'appel à Claude :", erreur.message);
});