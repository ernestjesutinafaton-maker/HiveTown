// On importe toute la bibliothèque sous le nom THREE.
// Doc d'introduction : https://threejs.org/docs/#manual/en/introduction/Creating-a-scene
import * as THREE from "three";
import "./style.css"; // adapte le chemin si style.css est à côté de index.html

// 1) La SCÈNE : le "monde" qui contiendra tous les objets 3D.
const scene = new THREE.Scene();

// 2) La CAMÉRA : le point de vue.
//    PerspectiveCamera(champ de vision en degrés, ratio largeur/hauteur, plan proche, plan lointain)
//    Doc : https://threejs.org/docs/#api/en/cameras/PerspectiveCamera
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.z = 3; // on recule la caméra pour voir le cube au centre

// 3) Le RENDERER : il dessine la scène dans un <canvas> grâce à WebGL.
//    Doc : https://threejs.org/docs/#api/en/renderers/WebGLRenderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement); // ajoute le <canvas> à la page

// 4) Un OBJET 3D = une géométrie (la forme) + un matériau (l'apparence).
//    BoxGeometry : https://threejs.org/docs/#api/en/geometries/BoxGeometry
//    MeshNormalMaterial : https://threejs.org/docs/#api/en/materials/MeshNormalMaterial
//    (il colore selon l'orientation des faces, donc aucune lumière nécessaire)
const geometrie = new THREE.BoxGeometry(1, 1, 1);
const materiau = new THREE.MeshNormalMaterial();
const cube = new THREE.Mesh(geometrie, materiau);
scene.add(cube);

// 5) La BOUCLE d'animation : appelée environ 60 fois par seconde.
//    Doc : https://threejs.org/docs/#api/en/renderers/WebGLRenderer.setAnimationLoop
function animer() {
  cube.rotation.x += 0.01; // rotation en radians
  cube.rotation.y += 0.01;
  renderer.render(scene, camera); // dessine une image
}
renderer.setAnimationLoop(animer);