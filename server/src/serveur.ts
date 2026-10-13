// Petit serveur HTTP qui expose l'état du monde au client 3D.
// Doc Express : https://expressjs.com/fr/starter/hello-world.html
import express from "express";
// CORS : le navigateur bloque par défaut les requêtes entre deux origines différentes
// (ici le client sur le port 5173 et le serveur sur le port 3000).
// Doc : https://developer.mozilla.org/fr/docs/Web/HTTP/CORS
import cors from "cors";
import { monde } from "./monde";

const app = express();
const PORT = 3000;

// On autorise UNIQUEMENT le client local, pas tout Internet.
app.use(cors({ origin: "http://localhost:5174" }));

// Route GET /api/monde : renvoie l'état du monde en JSON.
// Doc res.json : https://expressjs.com/fr/api.html#res.json
// Ici, aucune donnée secrète : jamais d'accès à process.env ni à la clé API dans une route.
app.get("/api/monde", (_req, res) => {
  res.json(monde);
});

app.listen(PORT, () => {
  console.log(`Serveur Hivetown : http://localhost:${PORT}`);
});