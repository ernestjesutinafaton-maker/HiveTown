# 🌍 Hivetown

> Un monde 3D interactif où chaque utilisateur a son personnage, sa maison… et ses propres assistants IA qui travaillent ensemble.

![Statut](https://img.shields.io/badge/statut-en%20conception-orange)
![Stack](https://img.shields.io/badge/stack-TypeScript%20%7C%20Three.js%20%7C%20Node.js-blue)
![Contributions](https://img.shields.io/badge/contributions-bienvenues-brightgreen)

---

## 💡 L'idée

Imagine un petit monde en 3D, façon jeu, où :

- tu **crées et personnalises ton personnage** ;
- tu reçois une **maison sur une carte partagée** avec les autres utilisateurs ;
- dans ta maison, tu **recrutes des assistants IA** (Claude, GPT, Gemini…) à qui tu donnes un prénom, un rôle et des règles ;
- tu peux monter une **entreprise** : tu donnes une tâche, les IA s'organisent entre elles (méthode agile : découpage, réalisation, relecture) et te **livrent le résultat** ;
- tu gardes le contrôle : **limites de budget, nombre d'échanges plafonné, validation humaine** pour les actions importantes.

## 🚧 Où en est le projet ?

**Le projet est au tout début.** Il n'y a pas encore de version utilisable : on pose les bases.
C'est le meilleur moment pour participer, donner ton avis et influencer la direction.

## 🗺️ Feuille de route

- [ ] **Étape 1 : le monde 3D** : scène Three.js, sol, personnage déplaçable au clavier
- [x] **Étape 2 : premiers agents** : serveur Node.js, premier appel à une IA, deux agents qui dialoguent (bulles de dialogue)
- [ ] **Étape 3 : comptes et carte** : création de personnage, attribution d'une maison, multi-utilisateur (WebSocket)
- [ ] **Étape 4 : l'entreprise** : chef de projet IA, workflow agile, livrables
- [ ] **Plus tard** : modèles locaux (Ollama), connexion des comptes IA des utilisateurs, éditeur de personnage avancé

## 🧰 Technologies prévues

| Partie | Outils |
|---|---|
| Monde 3D | [Three.js](https://threejs.org/) |
| Outillage front | [Vite](https://vitejs.dev/) |
| Serveur | [Node.js](https://nodejs.org/) + [Express](https://expressjs.com/) |
| Temps réel | WebSocket |
| Langage | [TypeScript](https://www.typescriptlang.org/) |
| IA | API des fournisseurs (Anthropic, OpenAI…) via une couche « fournisseur » interchangeable |
| Données | SQLite au début |

## 🔐 Sécurité et transparence (priorités du projet)

- Les **clés API ne sont jamais envoyées au navigateur** ni écrites dans les logs.
- Chaque utilisateur sait **exactement ce qui est autorisé** et peut le retirer à tout moment.
- Chaque projet d'agents a un **plafond de coût** et un **nombre maximal d'échanges**.
- **Ne commit jamais** de fichier `.env` ni de clé API.

## 🤝 Contribuer

Tu débutes ou tu es expérimenté·e, il y a de la place pour toi. Voici des pistes :

- 🎨 **3D et design** : modèles de personnages et de maisons, décor, ambiance
- 🧠 **IA et agents** : orchestration, rôles, garde-fous, évaluation des réponses
- 🔧 **Code** : serveur, temps réel, TypeScript, tests
- 📝 **Documentation** : guides, traductions, tutoriels pour débutants
- 💬 **Idées et retours** : ouvre une *issue* pour proposer une fonctionnalité ou signaler un problème

**Pour proposer une modification :**

```bash
# 1. Fais un fork du dépôt depuis GitHub, puis clone ton fork
#    (remplace <ton-pseudo> par ton nom d'utilisateur GitHub)
git clone https://github.com/<ton-pseudo>/hivetown.git

# 2. Crée une branche pour ta modification
git checkout -b ma-fonctionnalite

# 3. Fais tes changements, puis enregistre-les
git add .
git commit -m "Description claire de la modification"

# 4. Envoie ta branche sur ton fork, puis ouvre une Pull Request depuis GitHub
git push origin ma-fonctionnalite
```

Doc officielle : [Contribuer à un projet](https://docs.github.com/fr/get-started/exploring-projects-on-github/contributing-to-a-project)

Les issues marquées `good first issue` seront réservées aux premières contributions.

## 🚀 Installation

*Bientôt disponible : le projet n'est pas encore exécutable.*

## 📄 Licence

À définir (une licence open source comme MIT est envisagée).

## 📬 Contact

Une question, une idée ? Ouvre une [issue](../../issues) ou contacte [@ernestjesutinafaton-maker](https://github.com/ernestjesutinafaton-maker).
