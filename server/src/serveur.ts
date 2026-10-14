// Petit serveur HTTP qui expose l'état du monde au client 3D.
// Doc Express : https://expressjs.com/fr/starter/hello-world.html
import express from "express";
// CORS : le navigateur bloque par défaut les requêtes entre deux origines différentes
// (ici le client sur le port 5173 et le serveur sur le port 3000).
// Doc : https://developer.mozilla.org/fr/docs/Web/HTTP/CORS
import cors from "cors";
import { monde, decrireMonde } from "./monde";
import { lireDecision } from "./decision";
import { client, MODELE, PERSONNAGES } from "./agents";



const app = express();
const PORT = 3000;

// On autorise UNIQUEMENT le client local, pas tout Internet.
app.use(cors({ origin: "http://localhost:5174" }));
// Permet de lire un corps de requête JSON. Limite à 2 ko : pas de gros envois.
// Doc : https://expressjs.com/fr/api.html#express.json
app.use(express.json({ limit: "2kb" }));

// Route GET /api/monde : renvoie l'état du monde en JSON.
// Doc res.json : https://expressjs.com/fr/api.html#res.json
// Ici, aucune donnée secrète : jamais d'accès à process.env ni à la clé API dans une route.
app.get("/api/monde", (_req, res) => {
  res.json(monde);
});
// --- Limite de débit : 10 requêtes par minute au total ---
// Cette route dépense ta clé API : on la protège contre les abus et les boucles.
const FENETRE_MS = 60_000; // le séparateur _ rend les grands nombres lisibles
const MAX_REQUETES = 10;
let horodatages: number[] = [];

function limiteAtteinte(): boolean {
  const maintenant = Date.now();
  // On ne garde que les requêtes de la dernière minute.
  horodatages = horodatages.filter((t) => maintenant - t < FENETRE_MS);
  if (horodatages.length >= MAX_REQUETES) return true;
  horodatages.push(maintenant);
  return false;
}

// --- Route POST /api/parler : un visiteur parle à un personnage ---
app.post("/api/parler", async (req, res) => {
  if (limiteAtteinte()) {
    res.status(429).json({ erreur: "Trop de requêtes, réessaie dans une minute." });
    return;
  }

  // Le corps de la requête vient du navigateur : on ne lui fait JAMAIS confiance.
  // Doc codes HTTP : https://developer.mozilla.org/fr/docs/Web/HTTP/Status
  const { agent: nomAgent, message } = req.body ?? {};
  if (
    typeof nomAgent !== "string" ||
    typeof message !== "string" ||
    message.trim() === "" ||
    message.length > 300
  ) {
    res.status(400).json({ erreur: "Requête invalide." });
    return;
  }

  const personnage = PERSONNAGES.find((p) => p.nom === nomAgent);
  if (!personnage) {
    res.status(404).json({ erreur: "Personnage inconnu." });
    return;
  }

  try {
    const reponse = await client.messages.create({
      model: MODELE,
      max_tokens: 600,
      system:
        personnage.role +
        "\nTu parles à un visiteur du monde d'Hivetown. Réponds en 3 phrases maximum, " +
        "en restant dans ton rôle. Utilise uniquement les données de l'état du monde " +
        "ci-dessous, sans rien inventer.\n\nÉtat du monde :\n" +
        decrireMonde(monde),
      // Le message du visiteur est traité comme une simple donnée de conversation.
      messages: [{ role: "user", content: message }],
    });

    let texte = "";
    for (const bloc of reponse.content) {
      if (bloc.type === "text") texte += bloc.text;
    }
    res.json({ reponse: texte });
  } catch (erreur) {
    // On journalise côté serveur, mais on ne renvoie jamais le détail au client.
    console.error("Erreur API Claude :", erreur instanceof Error ? erreur.message : erreur);
    res.status(500).json({ erreur: "Le personnage est indisponible pour le moment." });
  }
});

app.listen(PORT, () => {
  console.log(`Serveur Hivetown : http://localhost:${PORT}`);
});

// Renvoie la dernière décision (ou null s'il n'y en a pas).
app.get("/api/decision", (_req, res) => {
  res.json(lireDecision());
});