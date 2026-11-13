// Enemy types: hooded hacker figures, drones, street thugs, and the boss.
import * as THREE from 'three';
import { Game, diff } from '../core/state.js';
import { makePerson, animatePerson } from '../player/character.js';
import { rand, choice } from '../core/utils.js';
import { explosion, spawnSparks } from './lasers.js';

export const TYPE_DATA = {
  kiddie: { hp: 40, name: 'Script Kiddie', color: 0x55ff77, attackT: 3.4, xp: 22, coins: 12 },
  phisher: { hp: 55, name: 'Fisher', color: 0xffaa33, attackT: 4.4, xp: 32, coins: 18 },
  botnet: { hp: 34, name: 'Botnet markazi', color: 0xff5555, attackT: 5.5, xp: 40, coins: 22 },
  drone: { hp: 8, name: 'Bot', color: 0xff7777, attackT: 99, xp: 4, coins: 2 },
  phantom: { hp: 60, name: 'Fantom', color: 0xbb77ff, attackT: 3.0, xp: 48, coins: 26 },
  ransom: { hp: 110, name: 'Ransomware', color: 0xff33aa, attackT: 4.2, xp: 65, coins: 36 },
  thug: { hp: 36, name: 'Bezori', color: 0x888899, attackT: 1.4, xp: 18, coins: 10 },
  blackhat: { hp: 400, name: 'QORA SHLYAPA', color: 0xff2222, attackT: 2.6, xp: 300, coins: 220 },
};

function hackerMesh(color, scale = 1) {
  const g = new THREE.Group();
  // cloak
  const cloak = new THREE.Mesh(
    new THREE.ConeGeometry(0.55, 1.5, 7),
    new THREE.MeshLambertMaterial({ color: 0x1a1d26 }));
  cloak.position.y = 0.75;
  cloak.castShadow = true;
  // head + glowing visor
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.26, 10, 8),
    new THREE.MeshLambertMaterial({ color: 0x14161e }));
  head.position.y = 1.62;
  const visor = new THREE.Mesh(
    new THREE.BoxGeometry(0.4, 0.09, 0.2),
    new THREE.MeshBasicMaterial({ color }));
  visor.position.set(0, 1.64, 0.14);
  // floating laptop
  const lap = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.34, 0.05),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85 }));
  lap.position.set(0, 1.1, 0.55);
  lap.rotation.x = -0.4;
  g.add(cloak, head, visor, lap);
  g.userData.visor = visor;
  g.userData.lap = lap;
  g.scale.setScalar(scale);
  return g;
}

function droneMesh(color) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.3),
    new THREE.MeshBasicMaterial({ color }));
  body.position.y = 1;
  g.add(body);
  g.userData.spinner = body;
  return g;
}

function hpBarSprite() {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 10;
  const tex = new THREE.CanvasTexture(c);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  s.scale.set(1.3, 0.2, 1);
  s.userData = { c, tex };
  return s;
}

function drawHp(sprite, frac) {
  const { c, tex } = sprite.userData;
  const x = c.getContext('2d');
  x.clearRect(0, 0, 64, 10);
  x.fillStyle = 'rgba(0,0,0,0.6)';
  x.fillRect(0, 0, 64, 10);
  x.fillStyle = frac > 0.5 ? '#2bd66b' : frac > 0.25 ? '#ffd34d' : '#ff5f4d';
  x.fillRect(1, 1, 62 * Math.max(0, frac), 8);
  tex.needsUpdate = true;
}

export class Enemy {
  constructor(type, pos) {
    const d = TYPE_DATA[type];
    this.type = type;
    this.data = d;
    this.maxHp = Math.round(d.hp * diff().enemyHp * (1 + (Game.stats.level - 1) * 0.12));
    this.hp = this.maxHp;
    this.alive = true;
    this.revealed = type !== 'phantom';
    this.marked = false;
    this.stunT = 0;
    this.freezeT = 0;
    this.attackT = rand(1.2, d.attackT);
    this.specialT = rand(4, 8);
    this.phase = 1;
    this.bob = Math.random() * 6;
    this.spawnPos = pos.clone();

    if (type === 'thug') {
      const person = makePerson({ skin: 0xd9a06a, shirt: 0x3a3a44, pants: 0x222228, hairColor: 0x111111, hairStyle: 1 });
      this.group = person.group;
      this.parts = person.parts;
      this.walkPhase = 0;
    } else if (type === 'drone') {
      this.group = droneMesh(d.color);
    } else {
      this.group = hackerMesh(d.color, type === 'blackhat' ? 1.6 : 1);
    }
    this.group.position.copy(pos);
    this.group.position.y = 0.1;

    this.hpBar = hpBarSprite();
    this.hpBar.position.y = type === 'blackhat' ? 3.4 : 2.2;
    this.group.add(this.hpBar);
    drawHp(this.hpBar, 1);

    if (type === 'phantom') this.setCloak(true);
    Game.three.scene.add(this.group);
  }

  setCloak(on) {
    this.revealed = !on;
    this.group.traverse((o) => {
      if (o.material && !o.userData.keepVisible) {
        o.material.transparent = true;
        o.material.opacity = on ? 0.07 : 1;
      }
    });
    this.hpBar.material.opacity = on ? 0.1 : 1;
  }

  damage(amount, { fromDecrypt = false, melee = false } = {}) {
    if (!this.alive) return 0;
    let dmg = amount;
    if (this.type === 'ransom' && fromDecrypt) dmg *= 2.5;
    if (this.type !== 'thug' && melee) dmg *= 0.5;
    if (this.type === 'phantom' && !this.revealed) dmg *= 0.25;
    dmg = Math.round(dmg);
    this.hp -= dmg;
    drawHp(this.hpBar, this.hp / this.maxHp);

    // hit flash
    const visor = this.group.userData.visor;
    if (visor) {
      visor.scale.setScalar(1.8);
      setTimeout(() => visor.scale.setScalar(1), 90);
    }
    // phantom uncloaks briefly when hit hard
    if (this.type === 'phantom' && !this.revealed && dmg > 10) this.reveal(2.5);

    if (this.hp <= 0) this.die();
    return dmg;
  }

  reveal(dur = 6) {
    if (this.type !== 'phantom') { this.revealed = true; return; }
    this.setCloak(false);
    clearTimeout(this._cloakT);
    this._cloakT = setTimeout(() => { if (this.alive) this.setCloak(true); }, dur * 1000);
  }

  die() {
    this.alive = false;
    clearTimeout(this._cloakT);
    const p = this.group.position.clone();
    p.y += 1;
    explosion(p, this.data.color, this.type === 'blackhat' ? 2.6 : 1.2);
    if (Game.audio) Game.audio.sfx(this.type === 'thug' ? 'arrest' : 'enemyDown');
    if (this.type === 'thug') {
      // cartoon arrest: stars + sink into ground
      spawnSparks(p, 0xffd34d, 14, 4);
    }
    Game.three.scene.remove(this.group);
  }

  // returns an attack request or null; combat.js executes it
  update(dt, playerPos) {
    if (!this.alive) return null;
    const speedK = this.freezeT > 0 ? 0.4 : 1;
    this.freezeT = Math.max(0, this.freezeT - dt);
    this.stunT = Math.max(0, this.stunT - dt);
    this.bob += dt * 2;

    const g = this.group;

    // face player
    const dx = playerPos.x - g.position.x, dz = playerPos.z - g.position.z;
    g.rotation.y = Math.atan2(dx, dz);

    if (this.type === 'thug') {
      // chase and punch
      const dist = Math.hypot(dx, dz);
      if (this.stunT > 0) {
        animatePerson(this.parts, 0, 0, dt);
        return null;
      }
      if (dist > 1.5) {
        const sp = 3.6 * speedK;
        g.position.x += (dx / dist) * sp * dt;
        g.position.z += (dz / dist) * sp * dt;
        this.walkPhase += dt * 8;
        animatePerson(this.parts, this.walkPhase, 0.7, dt);
      }
      this.attackT -= dt * speedK;
      if (this.attackT <= 0 && dist < 1.9) {
        this.attackT = this.data.attackT;
        this.parts.armR.rotation.x = -2.1;
        setTimeout(() => { if (this.alive) this.parts.armR.rotation.x = 0; }, 200);
        return { kind: 'punch', dmg: 10 };
      }
      return null;
    }

    if (this.type === 'drone') {
      // swarm toward player, explode on contact
      const dist = Math.hypot(dx, dz);
      const sp = 2.8 * speedK;
      if (this.stunT <= 0) {
        g.position.x += (dx / dist) * sp * dt;
        g.position.z += (dz / dist) * sp * dt;
      }
      g.userData.spinner.rotation.y += dt * 6;
      g.userData.spinner.position.y = 1 + Math.sin(this.bob * 2) * 0.15;
      if (dist < 0.9) {
        this.die();
        return { kind: 'droneBoom', dmg: 7 };
      }
      return null;
    }

    // hovering hackers
    g.position.y = 0.1 + Math.sin(this.bob) * 0.12;
    const lap = g.userData.lap;
    if (lap) lap.rotation.z = Math.sin(this.bob * 1.6) * 0.1;

    if (this.stunT > 0) return null;

    this.attackT -= dt * speedK;
    this.specialT -= dt * speedK;

    // boss phase logic
    if (this.type === 'blackhat') {
      const frac = this.hp / this.maxHp;
      if (frac < 0.66 && this.phase === 1) {
        this.phase = 2;
        return { kind: 'bossPhase', phase: 2 };
      }
      if (frac < 0.33 && this.phase === 2) {
        this.phase = 3;
        return { kind: 'bossPhase', phase: 3 };
      }
    }

    if (this.attackT <= 0) {
      this.attackT = this.data.attackT * rand(0.8, 1.2);
      return { kind: 'virus', dmg: this.type === 'blackhat' ? 14 : 8 };
    }

    if (this.specialT <= 0) {
      this.specialT = rand(7, 11);
      switch (this.type) {
        case 'phisher': return { kind: 'phish' };
        case 'ransom': return { kind: 'lock', dur: 2.6 };
        case 'botnet': return { kind: 'spawnDrones', n: 3 };
        case 'blackhat': {
          const opts = this.phase >= 3 ? ['lock', 'spawnDrones', 'teleport', 'phish']
            : this.phase === 2 ? ['teleport', 'spawnDrones', 'lock'] : ['lock', 'phish'];
          const k = choice(opts);
          if (k === 'lock') return { kind: 'lock', dur: this.phase >= 3 ? 3.2 : 2.2 };
          if (k === 'spawnDrones') return { kind: 'spawnDrones', n: 2 };
          if (k === 'teleport') return { kind: 'teleport' };
          return { kind: 'phish' };
        }
      }
    }
    return null;
  }

  teleport(playerPos) {
    const a = Math.random() * Math.PI * 2;
    const r = rand(5, 9);
    this.group.position.set(playerPos.x + Math.cos(a) * r, 0.1, playerPos.z + Math.sin(a) * r);
    explosion(this.group.position.clone().setY(1), this.data.color, 0.8);
  }
}
