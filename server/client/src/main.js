// Doc d'introduction : https://threejs.org/docs/#manual/en/introduction/Creating-a-scene
import * as THREE from "three";

// OrbitControls : contrôle de la caméra à la souris (clic gauche = tourner,
// molette = zoom, clic droit = déplacer). Il vient des "addons" de Three.js.
// Doc : https://threejs.org/docs/#examples/en/controls/OrbitControls
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { chargerMonde, chargerDecision, estValide, RIVE_Z, ECHELLE } from "./donnees.js";
import "./style.css"; // adapte le chemin si besoin

// --- SCÈNE ---
const scene = new THREE.Scene();
// Couleur de fond : un ciel bleu clair. Doc : https://threejs.org/docs/#api/en/math/Color
scene.background = new THREE.Color(0x87ceeb);

// --- CAMÉRA ---
const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(5, 4, 8); // x (droite), y (haut), z (vers nous)

// --- RENDERER ---
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
// Limite la densité de pixels à 2 pour garder de bonnes performances sur les écrans très denses.
// Doc : https://developer.mozilla.org/fr/docs/Web/API/Window/devicePixelRatio
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
// On active le calcul des ombres. Doc : https://threejs.org/docs/#api/en/renderers/WebGLRenderer.shadowMap
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

// --- LUMIÈRES ---
// Lumière ambiante : éclaire tout uniformément (sans ombre).
// Doc : https://threejs.org/docs/#api/en/lights/AmbientLight
const ambiante = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambiante);

// Lumière directionnelle : comme le soleil, avec une direction. Elle projette des ombres.
// Doc : https://threejs.org/docs/#api/en/lights/DirectionalLight
const soleil = new THREE.DirectionalLight(0xffffff, 1.5);
soleil.position.set(5, 10, 5);
soleil.castShadow = true;
scene.add(soleil);

// --- SOL ---
// PlaneGeometry est vertical par défaut : on le tourne de -90° autour de l'axe X
// pour qu'il devienne horizontal. Les rotations sont en radians.
// Doc : https://threejs.org/docs/#api/en/geometries/PlaneGeometry
const sol = new THREE.Mesh(
  new THREE.PlaneGeometry(20, 20),
  new THREE.MeshStandardMaterial({ color: 0xc2b280 })
);
sol.rotation.x = -Math.PI / 2;
sol.receiveShadow = true; // le sol reçoit les ombres
scene.add(sol);

// --- EAU ---
// Un plan bleu juste au-dessus du sol (y = 0,02) pour éviter que les deux
// surfaces se superposent exactement (défaut visuel appelé "z-fighting").
const eau = new THREE.Mesh(
  new THREE.PlaneGeometry(20, 3),
  new THREE.MeshStandardMaterial({ color: 0x3d85c6 })
);
eau.rotation.x = -Math.PI / 2;
eau.position.set(0, 0.02, RIVE_Z - 1.5); // l'eau s'étend derrière la rive
scene.add(eau);

// --- EMPLACEMENTS ---
// On parcourt la liste de données et on crée une plaque 3D pour chaque entrée.
// Doc for...of : https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Statements/for...of
// --- EMPLACEMENTS (chargés depuis le serveur) ---
// Doc async/await : https://developer.mozilla.org/fr/docs/Learn/JavaScript/Asynchronous/Promises
// Position 3D d'un emplacement, calculée à partir de ses données.
function positionDe(emp) {
  return new THREE.Vector3(emp.x, 0, RIVE_Z + emp.distanceRiveM * ECHELLE);
}

async function afficherEmplacements() {
  try {
    const monde = await chargerMonde();
    for (const emp of monde.emplacements) {
      const parcelle = new THREE.Mesh(
        new THREE.BoxGeometry(3, 0.1, 3),
        new THREE.MeshStandardMaterial({
          color: estValide(emp, monde) ? 0x00e676 : 0xe74c3c,
        })
      );
      const pos = positionDe(emp);
      parcelle.position.set(pos.x, 0.05, pos.z);
      parcelle.receiveShadow = true;
      scene.add(parcelle);
    }

    // La décision des agents : si elle existe, on construit la maison.
    const decision = await chargerDecision();
    if (decision) {
      const emp = monde.emplacements.find((e) => e.id === decision.emplacementId);
      if (emp) {
        const maison = new THREE.Mesh(
          new THREE.BoxGeometry(1.8, 1.4, 1.8),
          new THREE.MeshStandardMaterial({ color: 0xc98b4a })
        );
        const pos = positionDe(emp);
        maison.position.set(pos.x, 0.8, pos.z); // posée sur la parcelle
        maison.castShadow = true;
        scene.add(maison);

        // Petit bandeau d'information en HTML par-dessus la scène.
        const info = document.createElement("div");
        info.id = "info";
        // textContent (et non innerHTML) : le texte vient d'une IA, on ne l'interprète
        // jamais comme du HTML. Doc : https://developer.mozilla.org/fr/docs/Web/API/Node/textContent
        info.textContent = `Orion a choisi « ${emp.nom} » : ${decision.raison}`;
        document.body.appendChild(info);
      }
    }
  } catch (erreur) {
    console.error("Impossible de charger le monde :", erreur);
  }
}
afficherEmplacements();

// --- CONTRÔLES DE LA CAMÉRA ---
const controles = new OrbitControls(camera, renderer.domElement);
controles.target.set(0, 0.5, 0);  // la caméra regarde le cube
controles.enableDamping = true;   // mouvement fluide avec inertie
controles.update();

// --- REDIMENSIONNEMENT ---
// À chaque changement de taille de la fenêtre, on met à jour la caméra et le renderer.
// Doc événement : https://developer.mozilla.org/fr/docs/Web/API/Window/resize_event
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix(); // obligatoire après un changement d'aspect
  renderer.setSize(window.innerWidth, window.innerHeight);
});
// --- AVATAR DU JOUEUR ---
// Un Group rassemble plusieurs objets 3D qui bougent ensemble.
// Doc : https://threejs.org/docs/#api/en/objects/Group
const avatar = new THREE.Group();

// Corps : une capsule (rayon 0,3 ; longueur 0,6 => hauteur totale 1,2).
// Doc : https://threejs.org/docs/#api/en/geometries/CapsuleGeometry
const corps = new THREE.Mesh(
  new THREE.CapsuleGeometry(0.3, 0.6, 4, 8),
  new THREE.MeshStandardMaterial({ color: 0x7c4dff })
);
corps.castShadow = true;
avatar.add(corps);

// "Nez" : une petite sphère à l'avant, pour voir dans quelle direction il regarde.
const nez = new THREE.Mesh(
  new THREE.SphereGeometry(0.1, 12, 12),
  new THREE.MeshStandardMaterial({ color: 0xffeb3b })
);
nez.position.set(0, 0.3, 0.3);
avatar.add(nez);

avatar.position.set(0, 0.6, 3); // y = 0,6 : la moitié de la hauteur, il pose sur le sol
scene.add(avatar);

// --- CLAVIER ---
// On garde l'ensemble des touches actuellement enfoncées.
// Doc Set : https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Global_Objects/Set
const touches = new Set();
// Doc KeyboardEvent.key : https://developer.mozilla.org/fr/docs/Web/API/KeyboardEvent/key
window.addEventListener("keydown", (e) => touches.add(e.key.toLowerCase()));
window.addEventListener("keyup", (e) => touches.delete(e.key.toLowerCase()));

const VITESSE = 4; // unités de la scène par seconde

// Temps écoulé entre deux images, pour une vitesse identique quel que soit l'écran.
// Doc performance.now : https://developer.mozilla.org/fr/docs/Web/API/Performance/now
let dernierTemps = performance.now();

function deplacerAvatar(dt) {
  // Direction souhaitée selon les touches (ZQSD + flèches).
  const direction = new THREE.Vector3();
  if (touches.has("z") || touches.has("arrowup")) direction.z -= 1;
  if (touches.has("s") || touches.has("arrowdown")) direction.z += 1;
  if (touches.has("q") || touches.has("arrowleft")) direction.x -= 1;
  if (touches.has("d") || touches.has("arrowright")) direction.x += 1;

  if (direction.lengthSq() === 0) return; // aucune touche : on ne bouge pas

  // normalize : évite d'aller plus vite en diagonale.
  // Doc Vector3 : https://threejs.org/docs/#api/en/math/Vector3
  direction.normalize();

  // Nouvelle position, limitée aux bords du sol (20 x 20) et à la rive (pas dans l'eau).
  // Doc Math.max / Math.min : https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Global_Objects/Math/max
  const ancienne = avatar.position.clone();
  const nouvelle = ancienne.clone().addScaledVector(direction, VITESSE * dt);
  nouvelle.x = Math.max(-9.5, Math.min(9.5, nouvelle.x));
  nouvelle.z = Math.max(RIVE_Z + 0.5, Math.min(9.5, nouvelle.z));
  avatar.position.copy(nouvelle);

  // L'avatar se tourne vers sa direction de marche.
  // Doc Math.atan2 : https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Global_Objects/Math/atan2
  avatar.rotation.y = Math.atan2(direction.x, direction.z);

  // La caméra suit : on déplace la caméra ET sa cible du même vecteur.
  const delta = nouvelle.sub(ancienne);
  camera.position.add(delta);
  controles.target.add(delta);
}

// --- BOUCLE D'ANIMATION ---
renderer.setAnimationLoop(() => {
  const maintenant = performance.now();
  const dt = (maintenant - dernierTemps) / 1000; // en secondes
  dernierTemps = maintenant;

  deplacerAvatar(dt);
  controles.update();
  renderer.render(scene, camera);
});