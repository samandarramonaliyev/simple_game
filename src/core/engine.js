// Renderer, scene, camera, bloom composer and the main loop.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { Game } from './state.js';
import { clamp } from './utils.js';

let renderer, scene, camera, composer, bloom, clock;

export function initEngine(container) {
  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  container.appendChild(renderer.domElement);

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87c5eb);
  scene.fog = new THREE.Fog(0xaacdec, 70, 300);

  camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 900);
  camera.position.set(0, 3, 8);

  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.75, 0.5, 0.82);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  clock = new THREE.Clock();

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
  });

  Game.three = { renderer, scene, camera, composer, bloom };
  applyQuality();
  return Game.three;
}

export function applyQuality() {
  const high = Game.settings.quality !== 'past';
  renderer.shadowMap.enabled = high;
  renderer.setPixelRatio(high ? Math.min(window.devicePixelRatio, 2) : 1);
  scene.traverse((o) => { if (o.material && o.material.needsUpdate !== undefined) o.material.needsUpdate = true; });
}

export function startLoop(update) {
  renderer.setAnimationLoop(() => {
    let dt = clamp(clock.getDelta(), 0, 0.05);
    dt *= Game.timeScale;
    if (!Game.paused) {
      Game.elapsed += dt;
      update(dt);
    }
    // camera shake
    if (Game.camShake > 0.001) {
      camera.position.x += (Math.random() - 0.5) * Game.camShake;
      camera.position.y += (Math.random() - 0.5) * Game.camShake;
      Game.camShake *= Math.pow(0.0001, dt); // fast decay
    }
    if (Game.settings.quality !== 'past') composer.render();
    else renderer.render(scene, camera);
  });
}

export function shake(amount) {
  Game.camShake = Math.max(Game.camShake, amount);
}

export function slowMo(duration = 0.2, scale = 0.25) {
  Game.timeScale = scale;
  setTimeout(() => { Game.timeScale = 1; }, duration * 1000);
}
