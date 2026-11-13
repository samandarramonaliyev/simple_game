// Street props: trees, lamps, benches, fountain, bus stop, bazaar stalls, traffic lights.
import * as THREE from 'three';
import { flatMat, nightGlow } from './buildings.js';
import { cityRand } from '../core/utils.js';

export const lampMats = []; // lamp head materials (emissive at night)
export const trafficLights = []; // for animation

export function makeTree() {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.28, 1.6, 6), flatMat(0x6a4a2a));
  trunk.position.y = 0.8; trunk.castShadow = true;
  const kind = cityRand();
  let crown;
  if (kind < 0.5) {
    crown = new THREE.Mesh(new THREE.IcosahedronGeometry(1.25, 0), flatMat(0x4a8a3a));
    crown.position.y = 2.4;
  } else {
    crown = new THREE.Mesh(new THREE.ConeGeometry(1.0, 2.6, 7), flatMat(0x3a7a4a));
    crown.position.y = 2.7;
  }
  crown.castShadow = true;
  g.add(trunk, crown);
  g.userData.solidRadius = 0.35;
  return g;
}

export function makeLamp() {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 4.6, 6), flatMat(0x3a4048));
  pole.position.y = 2.3; pole.castShadow = true;
  const headMat = new THREE.MeshLambertMaterial({ color: 0xfff2cc, emissive: 0xffdd88, emissiveIntensity: 0 });
  lampMats.push(headMat);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), headMat);
  head.position.y = 4.65;
  g.add(pole, head);
  return g;
}

export function makeBench() {
  const g = new THREE.Group();
  const seat = new THREE.Mesh(new THREE.BoxGeometry(2, 0.12, 0.6), flatMat(0x9a6a3a));
  seat.position.y = 0.5; seat.castShadow = true;
  const back = new THREE.Mesh(new THREE.BoxGeometry(2, 0.5, 0.1), flatMat(0x9a6a3a));
  back.position.set(0, 0.85, -0.26);
  for (const sx of [-0.8, 0.8]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.5, 0.5), flatMat(0x4a4a4a));
    leg.position.set(sx, 0.25, 0);
    g.add(leg);
  }
  g.add(seat, back);
  return g;
}

export function makeFountain() {
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.5, 0.7, 16), flatMat(0xbfc8d4));
  base.position.y = 0.35; base.castShadow = true; base.receiveShadow = true; base.userData.solid = true;
  const water = new THREE.Mesh(new THREE.CylinderGeometry(2.9, 2.9, 0.2, 16),
    new THREE.MeshLambertMaterial({ color: 0x3bb7ff, emissive: 0x1a5f9f, emissiveIntensity: 0.4, transparent: true, opacity: 0.85 }));
  water.position.y = 0.72;
  const column = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, 1.6, 10), flatMat(0xbfc8d4));
  column.position.y = 1.3;
  const top = new THREE.Mesh(new THREE.SphereGeometry(0.5, 10, 8),
    new THREE.MeshLambertMaterial({ color: 0x9fd8ff, emissive: 0x3bb7ff, emissiveIntensity: 0.5 }));
  top.position.y = 2.3;
  g.add(base, water, column, top);
  return g;
}

export function makeBusStop() {
  const g = new THREE.Group();
  const roof = new THREE.Mesh(new THREE.BoxGeometry(4, 0.15, 1.6), flatMat(0x3aa6a0));
  roof.position.y = 2.5; roof.castShadow = true;
  for (const sx of [-1.8, 1.8]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.5, 6), flatMat(0x4a4a4a));
    pole.position.set(sx, 1.25, -0.6);
    g.add(pole);
  }
  const bench = makeBench();
  bench.position.z = -0.4;
  g.add(roof, bench);
  return g;
}

export function makeStall(color = 0xe05a4a) {
  const g = new THREE.Group();
  const table = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.9, 1.3), flatMat(0x9a6a3a));
  table.position.y = 0.45; table.castShadow = true; table.userData.solid = true;
  const awning = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.1, 1.8), flatMat(color));
  awning.position.y = 2.2; awning.castShadow = true;
  for (const sx of [-1.2, 1.2]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.2, 5), flatMat(0x6a4a2a));
    pole.position.set(sx, 1.1, 0.7);
    g.add(pole);
  }
  // goods: little colored boxes
  for (let i = 0; i < 4; i++) {
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.3, 0.4),
      flatMat([0xffd34d, 0xe05a4a, 0x7ab87a, 0xff9d3b][i]));
    box.position.set(-0.8 + i * 0.55, 1.05, 0);
    g.add(box);
  }
  g.add(table, awning);
  return g;
}

export function makeTrafficLight() {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 4, 6), flatMat(0x3a4048));
  pole.position.y = 2;
  const box = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.3, 0.4), flatMat(0x222831));
  box.position.y = 4.2;
  g.add(pole, box);
  const lights = [];
  const colors = [0xff3333, 0xffcc33, 0x33ff55];
  for (let i = 0; i < 3; i++) {
    const lm = new THREE.MeshBasicMaterial({ color: colors[i] });
    const l = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), lm);
    l.position.set(0, 4.62 - i * 0.4, 0.24);
    g.add(l);
    lights.push(lm);
  }
  g.userData.lights = lights;
  g.userData.phase = Math.floor(cityRand() * 3);
  trafficLights.push(g);
  return g;
}

export function updateTrafficLights(elapsed, hacked = false) {
  for (const t of trafficLights) {
    const ls = t.userData.lights;
    if (hacked) {
      // all blink red when hacked
      const on = Math.floor(elapsed * 4) % 2 === 0;
      ls[0].color.setHex(on ? 0xff3333 : 0x441111);
      ls[1].color.setHex(0x443311);
      ls[2].color.setHex(0x114422);
      continue;
    }
    const cycle = (Math.floor(elapsed / 4) + t.userData.phase) % 3;
    ls[0].color.setHex(cycle === 0 ? 0xff3333 : 0x441111);
    ls[1].color.setHex(cycle === 1 ? 0xffcc33 : 0x443311);
    ls[2].color.setHex(cycle === 2 ? 0x33ff55 : 0x114422);
  }
}
