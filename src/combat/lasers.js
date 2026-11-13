// Neon laser beams, muzzle flashes, impact sparks, particles, shield bubble.
// Bright additive colors push past the bloom threshold for the glow.
import * as THREE from 'three';
import { Game } from '../core/state.js';
import { shake } from '../core/engine.js';

const effects = []; // { obj(s), life, maxLife, kind, update }
let glowTex = null;

function getGlowTex() {
  if (glowTex) return glowTex;
  const c = document.createElement('canvas');
  c.width = 64; c.height = 64;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(32, 32, 2, 32, 32, 30);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.35, 'rgba(255,255,255,0.45)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g;
  x.fillRect(0, 0, 64, 64);
  glowTex = new THREE.CanvasTexture(c);
  return glowTex;
}

function sprite(color, size) {
  const m = new THREE.Sprite(new THREE.SpriteMaterial({
    map: getGlowTex(), color, transparent: true,
    blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  m.scale.setScalar(size);
  return m;
}

export function fireBeam(from, to, colorHex, { width = 0.07, crit = false } = {}) {
  const scene = Game.three.scene;
  const dir = new THREE.Vector3().subVectors(to, from);
  const len = dir.length();
  const mid = new THREE.Vector3().addVectors(from, to).multiplyScalar(0.5);

  const w = crit ? width * 2.6 : width;
  const color = new THREE.Color(colorHex);
  const bright = color.clone().multiplyScalar(2.2); // push into bloom

  // core beam + outer glow cylinder
  const core = new THREE.Mesh(
    new THREE.CylinderGeometry(w, w, len, 6, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false }));
  const glow = new THREE.Mesh(
    new THREE.CylinderGeometry(w * 3.2, w * 3.2, len, 6, 1, true),
    new THREE.MeshBasicMaterial({ color: bright, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }));

  for (const m of [core, glow]) {
    m.position.copy(mid);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
    scene.add(m);
  }

  // muzzle flash + impact flash
  const muzzle = sprite(bright, crit ? 1.6 : 1.0);
  muzzle.position.copy(from);
  const impact = sprite(bright, crit ? 2.4 : 1.5);
  impact.position.copy(to);
  scene.add(muzzle, impact);

  effects.push({
    kind: 'beam', life: 0, maxLife: crit ? 0.34 : 0.22,
    objs: [core, glow, muzzle, impact],
    update(dt, t) {
      const k = 1 - t;
      core.material.opacity = k;
      glow.material.opacity = 0.55 * k;
      core.scale.x = core.scale.z = Math.max(0.05, k);
      glow.scale.x = glow.scale.z = Math.max(0.05, k);
      muzzle.material.opacity = k;
      impact.material.opacity = k;
      impact.scale.setScalar((crit ? 2.4 : 1.5) * (1 + t * 2));
    },
  });

  spawnSparks(to, colorHex, crit ? 22 : 10, crit ? 8 : 5);
  shake(crit ? 0.14 : 0.05);
}

export function spawnSparks(pos, colorHex, count = 10, speed = 5) {
  const scene = Game.three.scene;
  const geo = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const vels = [];
  for (let i = 0; i < count; i++) {
    positions[i * 3] = pos.x;
    positions[i * 3 + 1] = pos.y;
    positions[i * 3 + 2] = pos.z;
    vels.push(new THREE.Vector3(
      (Math.random() - 0.5) * speed,
      Math.random() * speed * 0.8,
      (Math.random() - 0.5) * speed));
  }
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({
    color: new THREE.Color(colorHex).multiplyScalar(2), size: 0.14,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  scene.add(pts);

  effects.push({
    kind: 'sparks', life: 0, maxLife: 0.6, objs: [pts],
    update(dt, t) {
      const p = geo.attributes.position;
      for (let i = 0; i < count; i++) {
        vels[i].y -= 14 * dt;
        p.setXYZ(i,
          p.getX(i) + vels[i].x * dt,
          Math.max(0.05, p.getY(i) + vels[i].y * dt),
          p.getZ(i) + vels[i].z * dt);
      }
      p.needsUpdate = true;
      pts.material.opacity = 1 - t;
    },
  });
}

export function explosion(pos, colorHex, size = 1) {
  const flash = sprite(new THREE.Color(colorHex).multiplyScalar(2.4), size * 3);
  flash.position.copy(pos);
  Game.three.scene.add(flash);
  effects.push({
    kind: 'boom', life: 0, maxLife: 0.4, objs: [flash],
    update(dt, t) {
      flash.material.opacity = 1 - t;
      flash.scale.setScalar(size * 3 * (1 + t * 1.6));
    },
  });
  spawnSparks(pos, colorHex, 18, 7);
  shake(0.1 * size);
}

// --- shield bubble (persistent while shield > 0) ---
let bubble = null;

export function updateShieldBubble() {
  const P = Game.player;
  if (!P) return;
  const want = Game.stats.shield > 0;
  if (want && !bubble) {
    bubble = new THREE.Mesh(
      new THREE.SphereGeometry(1.35, 20, 14),
      new THREE.MeshBasicMaterial({
        color: 0x55bbff, transparent: true, opacity: 0.18,
        blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
      }));
    Game.three.scene.add(bubble);
  }
  if (!want && bubble) {
    Game.three.scene.remove(bubble);
    bubble = null;
  }
  if (bubble) {
    const p = P.pos();
    bubble.position.set(p.x, p.y + 1.1, p.z);
    bubble.material.opacity = 0.14 + Math.sin(Game.elapsed * 6) * 0.05;
  }
}

export function updateLasers(dt) {
  for (let i = effects.length - 1; i >= 0; i--) {
    const e = effects[i];
    e.life += dt;
    const t = e.life / e.maxLife;
    if (t >= 1) {
      for (const o of e.objs) {
        Game.three.scene.remove(o);
        if (o.geometry) o.geometry.dispose();
        if (o.material) o.material.dispose();
      }
      effects.splice(i, 1);
    } else {
      e.update(dt, t);
    }
  }
  updateShieldBubble();
}
