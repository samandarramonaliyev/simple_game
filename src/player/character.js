// Shared low-poly humanoid builder (used by the player and NPCs).
import * as THREE from 'three';

export const HAIR_COLORS = [0x1a1a1a, 0x4a2a12, 0xd8b060, 0xa03a20, 0x2255cc, 0x22aa55];
export const HAIR_STYLES = ['Oddiy', 'Baland', 'Moxok', "Do'ppi"];

function mat(color) { return new THREE.MeshLambertMaterial({ color }); }

export function makePerson({
  skin = 0xe8b88a, shirt = 0x2f6fba, pants = 0x30405c,
  hairColor = 0x1a1a1a, hairStyle = 0, scale = 1,
} = {}) {
  const g = new THREE.Group();

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.68, 0.32), mat(shirt));
  torso.position.y = 1.06;
  torso.castShadow = true;
  g.add(torso);

  const hips = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.18, 0.3), mat(pants));
  hips.position.y = 0.66;
  g.add(hips);

  const headG = new THREE.Group();
  headG.position.y = 1.56;
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.38), mat(skin));
  head.position.y = 0.2;
  head.castShadow = true;
  headG.add(head);

  // eyes
  for (const sx of [-0.09, 0.09]) {
    const eye = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.02), mat(0x111111));
    eye.position.set(sx, 0.24, 0.2);
    headG.add(eye);
  }

  const hairG = new THREE.Group();
  hairG.position.y = 0.36;
  headG.add(hairG);
  g.add(headG);

  // limbs: pivot groups at shoulder/hip so they swing
  function limb(w, len, color, px, py) {
    const pivot = new THREE.Group();
    pivot.position.set(px, py, 0);
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, len, w), mat(color));
    m.position.y = -len / 2;
    m.castShadow = true;
    pivot.add(m);
    g.add(pivot);
    return pivot;
  }
  const armL = limb(0.16, 0.62, shirt, -0.37, 1.36);
  const armR = limb(0.16, 0.62, shirt, 0.37, 1.36);
  const legL = limb(0.19, 0.62, pants, -0.15, 0.6);
  const legR = limb(0.19, 0.62, pants, 0.15, 0.6);

  g.scale.setScalar(scale);

  const parts = { torso, headG, hairG, armL, armR, legL, legR };

  function setHair(style, color) {
    hairG.clear();
    const c = mat(color);
    let h;
    if (style === 0) { // short
      h = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.12, 0.4), c);
      h.position.y = 0.02;
    } else if (style === 1) { // tall
      h = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.26, 0.4), c);
      h.position.y = 0.1;
    } else if (style === 2) { // mohawk
      h = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.3, 0.42), c);
      h.position.y = 0.12;
    } else { // do'ppi (traditional cap)
      h = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.26, 0.14, 4), c);
      h.position.y = 0.05;
      h.rotation.y = Math.PI / 4;
    }
    h.castShadow = true;
    hairG.add(h);
  }
  setHair(hairStyle, hairColor);

  return { group: g, parts, setHair };
}

// walking animation: swing limbs by phase
export function animatePerson(parts, phase, amp, dt) {
  const s = Math.sin(phase) * amp;
  parts.armL.rotation.x = s;
  parts.armR.rotation.x = -s;
  parts.legL.rotation.x = -s;
  parts.legR.rotation.x = s;
  parts.torso.rotation.y = Math.sin(phase * 0.5) * 0.03;
}
