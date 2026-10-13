// Doc d'introduction : https://threejs.org/docs/#manual/en/introduction/Creating-a-scene
import * as THREE from "three";

// OrbitControls : contrôle de la caméra à la souris (clic gauche = tourner,
// molette = zoom, clic droit = déplacer). Il vient des "addons" de Three.js.
// Doc : https://threejs.org/docs/#examples/en/controls/OrbitControls
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { chargerMonde, estValide, RIVE_Z, ECHELLE } from "./donnees.js";
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
      parcelle.position.set(emp.x, 0.05, RIVE_Z + emp.distanceRiveM * ECHELLE);
      parcelle.receiveShadow = true;
      scene.add(parcelle);
    }
  } catch (erreur) {
    // Serveur éteint ou erreur réseau : on le signale sans casser la scène.
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

// --- BOUCLE D'ANIMATION ---
renderer.setAnimationLoop(() => {
  controles.update(); // nécessaire quand enableDamping est activé
  renderer.render(scene, camera);
});  