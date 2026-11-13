// Hacker attack missions: random scheduling, phone notification, waypoint
// beacon, countdown, arrival detection, win/fail consequences.
import * as THREE from 'three';
import { Game, diff } from '../core/state.js';
import { choice, rand } from '../core/utils.js';

let beacon = null, beaconRing = null;
let nextAttackT = 18; // first attack (tutorial) shortly after start

const ATTACK_MSGS = [
  '⚠ Xaker hujumi! Joy: ',
  '⚠ Diqqat! Tizim buzilmoqda: ',
  '⚠ Favqulodda! Hujum aniqlandi: ',
];

export function initMissions(scene) {
  const M = {
    scene,

    start(loc, opts = {}) {
      if (Game.mission) return;
      loc = loc || pickLocation();
      if (!loc) return;
      const spec = opts.boss ? bossSpec() : enemySpec();
      Game.mission = {
        loc, spec,
        state: 'travel',
        timeLeft: opts.boss ? diff().time + 40 : diff().time,
        boss: !!opts.boss,
        quest: opts.quest || null,
      };
      makeBeacon(scene, loc.pos, opts.boss ? 0x9922ff : 0xff3322);
      Game.hud.phone(`${choice(ATTACK_MSGS)}${loc.name}!\nTezroq yetib boring!`);
      Game.hud.toast(opts.boss ? '☠ QORA SHLYAPA PAYDO BO‘LDI!' : `⚠ Hujum: ${loc.name}`, 'bad');
      if (Game.audio) Game.audio.sfx('alert');
      if (!Game.tutorialDone) {
        Game.hud.tutorial('📱 Birinchi vazifa! Qizil nishon tomon yuguring (minimapa va masofaga qarang). <b>Shift</b> — yugurish.');
      }
    },

    // combat module calls this on victory
    complete() {
      const m = Game.mission;
      if (!m) return;
      m.loc.hacked = false;
      restoreEffect(this.scene, m.loc.pos);
      Game.stats.missionsWon++;
      Game.missionCount++;
      Game.dailyDone++;
      removeBeacon(this.scene);
      if (m.quest && Game.actions.questCombatDone) Game.actions.questCombatDone(m.quest);
      Game.mission = null;
      scheduleNext();
      if (Game.save) Game.save.auto();
    },

    fail(reason = 'timeout') {
      const m = Game.mission;
      if (!m) return;
      removeBeacon(this.scene);
      m.loc.hacked = true;
      Game.stats.trust = Math.max(0, Game.stats.trust - 9);
      Game.stats.missionsFailed++;
      Game.missionCount++;
      Game.hud.toast(`✖ ${m.loc.name} buzib kirildi! Ishonch pasaydi.`, 'bad');
      if (Game.audio) Game.audio.sfx('fail');
      Game.mission = null;
      scheduleNext();
    },

    update(dt) {
      // schedule random attacks
      if (!Game.mission && (Game.mode === 'play' || Game.mode === 'dialogue')) {
        nextAttackT -= dt;
        if (nextAttackT <= 0) {
          // boss mission when ready, otherwise random location
          if (!Game.bossDefeated && Game.stats.level >= 5 && Game.stats.missionsWon >= 8) {
            this.start(Game.locations.find((l) => l.id === 'bank'), { boss: true });
          } else {
            this.start();
          }
        }
      }

      const m = Game.mission;
      if (!m) return;

      if (m.state === 'travel') {
        m.timeLeft -= dt;
        if (m.timeLeft <= 0) { this.fail(); return; }

        // beacon pulse
        if (beacon) {
          beacon.material.opacity = 0.35 + Math.sin(Game.elapsed * 5) * 0.2;
          beaconRing.scale.setScalar(1 + (Game.elapsed * 1.4 % 1) * 2.2);
          beaconRing.material.opacity = 0.8 - (Game.elapsed * 1.4 % 1) * 0.8;
        }

        // arrival
        if (!Game.inside) {
          const d = Game.player.pos().distanceTo(m.loc.pos);
          if (d < 8) {
            m.state = 'fight';
            removeBeacon(this.scene);
            if (Game.combat) {
              Game.combat.start(m);
            } else {
              // combat not built yet: auto-resolve (placeholder)
              setTimeout(() => this.complete(), 1500);
            }
          }
        }
      }
    },
  };

  Game.missions = M;
  scheduleNext(18);
  return M;
}

function scheduleNext(t) {
  nextAttackT = t !== undefined ? t : rand(45, 95);
}

function pickLocation() {
  const cands = Game.locations.filter((l) => !l.hacked || Math.random() < 0.4);
  return cands.length ? choice(cands) : choice(Game.locations);
}

// what enemies spawn, scaled by level
function enemySpec() {
  const lvl = Game.stats.level;
  const pool = ['kiddie'];
  if (lvl >= 2) pool.push('phisher');
  if (lvl >= 3) pool.push('botnet', 'thugs');
  if (lvl >= 4) pool.push('phantom');
  if (lvl >= 5) pool.push('ransom');
  const type = choice(pool);
  const extraThug = lvl >= 3 && Math.random() < 0.35;
  return { type, extraThug, level: lvl };
}

function bossSpec() {
  return { type: 'blackhat', extraThug: false, level: Game.stats.level };
}

function makeBeacon(scene, pos, color) {
  removeBeacon(scene);
  beacon = new THREE.Mesh(
    new THREE.CylinderGeometry(1.1, 1.6, 60, 12, 1, true),
    new THREE.MeshBasicMaterial({
      color, transparent: true, opacity: 0.4, side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }));
  beacon.position.set(pos.x, 30, pos.z);
  scene.add(beacon);

  beaconRing = new THREE.Mesh(
    new THREE.RingGeometry(1.4, 1.9, 24),
    new THREE.MeshBasicMaterial({
      color, transparent: true, opacity: 0.8,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    }));
  beaconRing.rotation.x = -Math.PI / 2;
  beaconRing.position.set(pos.x, 0.3, pos.z);
  scene.add(beaconRing);
}

function removeBeacon(scene) {
  if (beacon) { scene.remove(beacon); beacon.geometry.dispose(); beacon = null; }
  if (beaconRing) { scene.remove(beaconRing); beaconRing.geometry.dispose(); beaconRing = null; }
}

// green "system restored" effect
export function restoreEffect(scene, pos) {
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.5, 1.2, 32),
    new THREE.MeshBasicMaterial({
      color: 0x33ff88, transparent: true, opacity: 0.9,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    }));
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(pos.x, 0.4, pos.z);
  scene.add(ring);
  const pillar = new THREE.Mesh(
    new THREE.CylinderGeometry(1.8, 1.8, 24, 16, 1, true),
    new THREE.MeshBasicMaterial({
      color: 0x33ff88, transparent: true, opacity: 0.5,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    }));
  pillar.position.set(pos.x, 12, pos.z);
  scene.add(pillar);

  let t = 0;
  const iv = setInterval(() => {
    t += 0.05;
    ring.scale.setScalar(1 + t * 10);
    ring.material.opacity = Math.max(0, 0.9 - t);
    pillar.material.opacity = Math.max(0, 0.5 - t * 0.6);
    pillar.scale.x = pillar.scale.z = 1 + t * 0.6;
    if (t >= 1) {
      clearInterval(iv);
      scene.remove(ring, pillar);
      ring.geometry.dispose(); pillar.geometry.dispose();
    }
  }, 50);
  if (Game.audio) Game.audio.sfx('restore');
}
