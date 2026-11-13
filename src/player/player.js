// Player: movement, jumping, dodge, melee, scooter, laptop combat pose.
import * as THREE from 'three';
import { Game } from '../core/state.js';
import { Input } from '../core/input.js';
import { on } from '../core/events.js';
import { collideMove } from '../world/city.js';
import { makePerson, animatePerson, HAIR_COLORS } from './character.js';

const GROUND_Y = 0.1;
const GRAV = 22;

export function createPlayer(scene) {
  const person = makePerson({
    skin: 0xe8b88a, shirt: 0x2f6fba, pants: 0x30405c,
    hairColor: HAIR_COLORS[Game.hair.color], hairStyle: Game.hair.style,
  });
  const g = person.group;
  g.position.set(Game.homePos ? Game.homePos.x : 0, GROUND_Y, Game.homePos ? Game.homePos.z + 2 : 20);

  // backpack
  const pack = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.5, 0.2),
    new THREE.MeshLambertMaterial({ color: 0xc9502e }));
  pack.position.set(0, 1.1, -0.27);
  pack.castShadow = true;
  g.add(pack);

  // laptop (hidden until combat)
  const laptop = new THREE.Group();
  const lBase = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.04, 0.36),
    new THREE.MeshLambertMaterial({ color: 0x222831 }));
  const lScreen = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.34, 0.03),
    new THREE.MeshLambertMaterial({ color: 0x222831 }));
  lScreen.position.set(0, 0.18, -0.17);
  lScreen.rotation.x = -0.35;
  const lGlow = new THREE.Mesh(new THREE.PlaneGeometry(0.44, 0.28),
    new THREE.MeshBasicMaterial({ color: 0x33ff88 }));
  lGlow.position.set(0, 0.18, -0.15);
  lGlow.rotation.x = -0.35;
  laptop.add(lBase, lScreen, lGlow);
  laptop.position.set(0, 1.12, 0.42);
  laptop.visible = false;
  g.add(laptop);

  // floating holographic screen (combat)
  const holo = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.7),
    new THREE.MeshBasicMaterial({ color: 0x1affc6, transparent: true, opacity: 0.22, side: THREE.DoubleSide }));
  holo.position.set(0, 1.75, 0.65);
  holo.visible = false;
  g.add(holo);

  // scooter (hidden until bought + toggled)
  const scooter = new THREE.Group();
  const deck = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.08, 1.1),
    new THREE.MeshLambertMaterial({ color: 0xffd34d }));
  deck.position.y = 0.18;
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.0, 6),
    new THREE.MeshLambertMaterial({ color: 0x888888 }));
  bar.position.set(0, 0.68, 0.5);
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.4, 6),
    new THREE.MeshLambertMaterial({ color: 0x333333 }));
  handle.rotation.z = Math.PI / 2;
  handle.position.set(0, 1.18, 0.5);
  for (const z of [-0.45, 0.52]) {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.06, 10),
      new THREE.MeshLambertMaterial({ color: 0x222222 }));
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(0, 0.12, z);
    scooter.add(wheel);
  }
  scooter.add(deck, bar, handle);
  scooter.visible = false;
  g.add(scooter);

  scene.add(g);

  const P = {
    group: g, parts: person.parts, setHair: person.setHair,
    laptop, holo, pack, scooterMesh: scooter,
    vy: 0, onGround: true, walkPhase: 0,
    facing: 0, speedNow: 0,
    scooterOn: false,
    dodgeCd: 0, dodgeTime: 0, dodgeDir: new THREE.Vector3(),
    meleeCd: 0, meleeTime: 0,
    iframes: 0,
    stepTimer: 0,

    pos() { return g.position; },

    setCombatPose(onPose) {
      laptop.visible = onPose;
      holo.visible = onPose;
      if (onPose) {
        person.parts.armL.rotation.set(-1.15, 0, 0.25);
        person.parts.armR.rotation.set(-1.15, 0, -0.25);
        this.setScooter(false);
      } else {
        person.parts.armL.rotation.set(0, 0, 0);
        person.parts.armR.rotation.set(0, 0, 0);
      }
    },

    setScooter(onS) {
      if (onS && (!Game.gear.scooter || Game.inside || Game.mode === 'combat')) return;
      this.scooterOn = onS;
      scooter.visible = onS;
    },

    heal(v) {
      Game.stats.hp = Math.min(Game.stats.maxHp, Game.stats.hp + v);
    },

    damage(v, source = '') {
      if (this.iframes > 0) return;
      if (Game.stats.shield > 0) {
        const absorbed = Math.min(Game.stats.shield, v);
        Game.stats.shield -= absorbed;
        v -= absorbed;
        if (Game.audio) Game.audio.sfx('shieldHit');
      }
      if (v > 0) {
        Game.stats.hp -= v;
        if (Game.audio) Game.audio.sfx('hurt');
        if (Game.hud) Game.hud.flashDamage();
        if (Game.stats.hp <= 0) {
          Game.stats.hp = 0;
          if (Game.combat) Game.combat.onPlayerDown(source);
        }
      }
    },
  };

  on('jump', () => {
    if (P.onGround && (Game.mode === 'play' || Game.mode === 'combat')) {
      P.vy = 8;
      P.onGround = false;
      if (Game.audio) Game.audio.sfx('jump');
    }
  });

  on('dodge', () => {
    if (P.dodgeCd > 0) return;
    const mv = Input.moveVector();
    const yaw = Game.cameraRig ? Game.cameraRig.yaw : 0;
    let dx = mv.x * Math.cos(yaw) - mv.y * Math.sin(yaw);
    let dz = -mv.x * Math.sin(yaw) - mv.y * Math.cos(yaw);
    if (Math.hypot(dx, dz) < 0.1) { dx = Math.sin(P.facing); dz = Math.cos(P.facing); }
    const len = Math.hypot(dx, dz) || 1;
    P.dodgeDir.set(dx / len, 0, dz / len);
    P.dodgeTime = 0.22;
    P.dodgeCd = 1.6;
    P.iframes = 0.4;
    if (Game.audio) Game.audio.sfx('dash');
  });

  on('melee', () => {
    if (P.meleeCd > 0 || Game.mode === 'dialogue' || Game.mode === 'panel') return;
    P.meleeCd = 0.55;
    P.meleeTime = 0.25;
    if (Game.audio) Game.audio.sfx('swing');
    if (Game.combat) Game.combat.meleeHit();
  });

  on('scooter', () => P.setScooter(!P.scooterOn));

  Game.player = P;
  return P;
}

export function updatePlayer(P, dt) {
  const g = P.group;
  P.dodgeCd = Math.max(0, P.dodgeCd - dt);
  P.meleeCd = Math.max(0, P.meleeCd - dt);
  P.iframes = Math.max(0, P.iframes - dt);

  const canMove = Game.mode === 'play' || Game.mode === 'combat';
  const mv = canMove ? Input.moveVector() : { x: 0, y: 0 };
  const yaw = Game.cameraRig ? Game.cameraRig.yaw : 0;

  // camera-relative direction
  let dx = mv.x * Math.cos(yaw) - mv.y * Math.sin(yaw);
  let dz = -mv.x * Math.sin(yaw) - mv.y * Math.cos(yaw);

  let speed = Input.runHeld() ? 7.6 : 4.3;
  if (P.scooterOn) speed = 13;
  for (const b of Game.buffs) if (b.data && b.data.speed) speed *= b.data.speed;
  if (Game.mode === 'combat') speed = Math.min(speed, 6.5);

  const moving = Math.hypot(dx, dz) > 0.05;

  // dodge dash overrides
  if (P.dodgeTime > 0) {
    P.dodgeTime -= dt;
    dx = P.dodgeDir.x; dz = P.dodgeDir.z;
    speed = 20;
  }

  if (moving || P.dodgeTime > 0) {
    const np = collideMove(g.position, dx * speed * dt, dz * speed * dt);
    g.position.x = np.x;
    g.position.z = np.z;
    // face move direction
    const target = Math.atan2(dx, dz);
    let diff = target - P.facing;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    P.facing += diff * Math.min(1, dt * 12);
    g.rotation.y = P.facing;
    P.speedNow = speed;
  } else {
    P.speedNow = 0;
  }

  // keep inside city bounds (or interior room)
  if (!Game.inside) {
    const lim = 160;
    g.position.x = Math.max(-lim, Math.min(lim, g.position.x));
    g.position.z = Math.max(-lim, Math.min(lim, g.position.z));
  }

  // gravity
  P.vy -= GRAV * dt;
  g.position.y += P.vy * dt;
  if (g.position.y <= GROUND_Y) {
    g.position.y = GROUND_Y;
    P.vy = 0;
    P.onGround = true;
  }

  // animation
  if (Game.mode === 'combat' && !moving) {
    // typing pose handled by setCombatPose; small bob on holo
    P.holo.position.y = 1.75 + Math.sin(Game.elapsed * 2.4) * 0.03;
  } else if (P.scooterOn && moving) {
    P.parts.legL.rotation.x = 0.15;
    P.parts.legR.rotation.x = -0.3;
    P.parts.armL.rotation.x = -0.8;
    P.parts.armR.rotation.x = -0.8;
  } else if (!P.onGround) {
    P.parts.legL.rotation.x = 0.45;
    P.parts.legR.rotation.x = -0.35;
  } else if (moving) {
    P.walkPhase += dt * (P.speedNow > 6 ? 11 : 7.5);
    animatePerson(P.parts, P.walkPhase, P.speedNow > 6 ? 0.85 : 0.55, dt);
    if (Game.mode === 'combat') P.setCombatPose(true); // keep arms if re-overwritten
    P.stepTimer -= dt;
    if (P.stepTimer <= 0 && Game.audio) {
      Game.audio.sfx('step');
      P.stepTimer = P.speedNow > 6 ? 0.26 : 0.42;
    }
  } else if (Game.mode !== 'combat') {
    animatePerson(P.parts, 0, 0, dt);
    P.parts.torso.position.y = 1.06 + Math.sin(Game.elapsed * 1.8) * 0.012; // breathing
  }

  // melee swing animation
  if (P.meleeTime > 0) {
    P.meleeTime -= dt;
    P.parts.armR.rotation.x = -2.2 * (P.meleeTime / 0.25);
  }
}
