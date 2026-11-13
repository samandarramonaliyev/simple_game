// Combat controller: typing commands fires lasers; enemies attack back with
// virus projectiles, phishing, command locks, drones and melee thugs.
import * as THREE from 'three';
import { Game, diff } from '../core/state.js';
import { findCommand, PHISH_MSGS } from '../data/commands.js';
import { Enemy, TYPE_DATA } from './enemies.js';
import { fireBeam, explosion, spawnSparks, updateLasers } from './lasers.js';
import { slowMo } from '../core/engine.js';
import { choice, rand, clamp } from '../core/utils.js';
import { exitPointerLock } from '../core/input.js';

const $ = (id) => document.getElementById(id);

export function initCombat() {
  const C = {
    enemies: [],
    projectiles: [],
    cooldowns: {},
    combo: 0,
    lastCorrect: -99,
    lockT: 0,
    phishActive: null,
    hintTimer: 0,
    mission: null,
    tutorialStep: 0,
    minigameOpen: false,

    start(mission) {
      this.mission = mission;
      this.enemies = [];
      this.projectiles = [];
      this.cooldowns = {};
      this.combo = 0;
      this.lockT = 0;
      Game.mode = 'combat';
      Game.player.setCombatPose(true);
      Game.terminal.open();
      if (Game.audio) { Game.audio.sfx('combatStart'); Game.audio.music('combat'); }

      const pos = mission.loc.pos;
      const spawn = (type, angle, r = 6) => {
        const p = new THREE.Vector3(pos.x + Math.cos(angle) * r, 0.1, pos.z + Math.sin(angle) * r);
        const e = new Enemy(type, p);
        this.enemies.push(e);
        return e;
      };

      const s = mission.spec;
      const lvl = s.level;
      switch (s.type) {
        case 'kiddie':
          spawn('kiddie', rand(0, 6.28));
          if (lvl >= 3) spawn('kiddie', rand(0, 6.28));
          break;
        case 'phisher':
          spawn('phisher', rand(0, 6.28));
          if (lvl >= 4) spawn('kiddie', rand(0, 6.28));
          break;
        case 'botnet':
          spawn('botnet', rand(0, 6.28), 8);
          break;
        case 'phantom':
          spawn('phantom', rand(0, 6.28));
          break;
        case 'ransom':
          spawn('ransom', rand(0, 6.28));
          if (lvl >= 6) spawn('kiddie', rand(0, 6.28));
          break;
        case 'thugs':
          spawn('thug', 0.5, 7);
          spawn('thug', 2.5, 7);
          spawn('kiddie', 4.5, 8);
          break;
        case 'blackhat':
          spawn('blackhat', 0, 8);
          Game.hud.toast('☠ QORA SHLYAPA: "Shahar meniki bo‘ladi, bolakay!"', 'bad');
          break;
      }
      if (s.extraThug) spawn('thug', rand(0, 6.28), 8);

      Game.hud.toast(`⚔ Jang boshlandi: ${mission.loc.name}`, 'bad');
      Game.terminal.log(`Dushman aniqlandi: ${this.enemies.map((e) => e.data.name).join(', ')}`, 'warn');
      if (this.enemies.some((e) => e.type === 'phantom')) {
        Game.terminal.log("Fantom ko'rinmas! Uni 'nmap' yoki 'trace' bilan oching.", 'warn');
      }
      if (!Game.tutorialDone) {
        this.tutorialStep = 1;
        Game.hud.tutorial("💻 Noutbuk ochildi! Terminalga <b>nmap</b> deb yozing va <b>Enter</b> bosing. (Jangda harakat: strelkalar)");
      }
    },

    cooldownLeft(cmd) {
      return Math.max(0, this.cooldowns[cmd] || 0);
    },

    comboMult() {
      return 1 + Math.min(this.combo, 8) * 0.15;
    },

    execute(input) {
      const txt = input.trim().toLowerCase();
      // phishing rejection via terminal
      if (this.phishActive && (txt === 'rad' || txt === 'rad etish')) {
        this.rejectPhish();
        return;
      }
      if (this.lockT > 0) {
        Game.terminal.log('🔒 Buyruqlar qulflangan! Kuting...', 'err');
        if (Game.audio) Game.audio.sfx('error');
        return;
      }
      const def = findCommand(txt);
      if (!def || !Game.unlockedCommands.includes(def.cmd)) {
        this.penalty(def ? "Bu buyruq hali o'rganilmagan!" : "Noto'g'ri buyruq!");
        return;
      }
      if (this.cooldownLeft(def.cmd) > 0) {
        Game.terminal.log(`'${def.cmd}' hali tayyor emas (${this.cooldownLeft(def.cmd).toFixed(1)}s)`, 'warn');
        return;
      }

      // combo: fast consecutive correct commands
      const now = Game.elapsed;
      this.combo = (now - this.lastCorrect < 6) ? this.combo + 1 : 0;
      this.lastCorrect = now;
      Game.stats.bestCombo = Math.max(Game.stats.bestCombo, this.combo + 1);
      Game.hud.combo(this.comboMult());

      // damage multipliers from gear/skills
      const dmgMult = this.comboMult()
        * (1 + Game.gear.laptop * 0.2)
        * (Game.skills.includes('blackice') ? 1.3 : 1);
      const cdMult = Math.max(0.4, 1 - Game.gear.keyboard * 0.15 - (Game.skills.includes('typeboost') ? 0.2 : 0));
      this.cooldowns[def.cmd] = def.cd * cdMult;

      const alive = this.enemies.filter((e) => e.alive);
      const ppos = Game.player.pos();
      const from = new THREE.Vector3(ppos.x, ppos.y + 1.35, ppos.z)
        .add(new THREE.Vector3(Math.sin(Game.player.facing), 0, Math.cos(Game.player.facing)).multiplyScalar(0.5));

      // reveal phantoms
      if (def.reveal) {
        for (const e of alive) if (e.type === 'phantom') { e.reveal(6); Game.terminal.log('👁 Fantom aniqlandi!', 'sys'); }
      }

      // utility effects
      if (def.heal) {
        Game.player.heal(def.heal + Game.stats.level * 2);
        fireBeam(from, from.clone().add(new THREE.Vector3(0, 4, 0)), def.color);
        Game.terminal.log(`✚ Tizim yamaldi: HP +${def.heal + Game.stats.level * 2}`, 'sys');
      }
      if (def.shield) {
        Game.stats.maxShield = 50 + Game.gear.shieldExt * 20 + (Game.skills.includes('shieldplus') ? 25 : 0);
        Game.stats.shield = Game.stats.maxShield;
        Game.terminal.log('🛡 Qalqon yoqildi!', 'sys');
        if (Game.audio) Game.audio.sfx('shieldUp');
      }
      if (def.clears) {
        for (const pr of this.projectiles) {
          explosion(pr.mesh.position.clone(), 0xff9d3b, 0.5);
          Game.three.scene.remove(pr.mesh);
        }
        this.projectiles = [];
        Game.terminal.log("🔥 Firewall: barcha virus paketlari yo'q qilindi!", 'sys');
      }
      if (def.freeze) {
        for (const e of alive) e.freezeT = def.freeze;
        Game.terminal.log('❄ Barcha dushmanlar sekinlashdi!', 'sys');
      }

      // pick target & apply damage
      const targets = alive.length ? (def.area ? alive : [this.nearestTarget(alive, ppos)]) : [];
      let anyHit = false;
      let hopFrom = from;
      const chainN = def.chain ? Math.min(def.chain, alive.length) : 0;

      if (chainN > 0) {
        // chain: jump between up to N nearest targets
        const sorted = [...alive].sort((a, b) =>
          a.group.position.distanceTo(ppos) - b.group.position.distanceTo(ppos));
        for (let i = 0; i < chainN; i++) {
          const t = sorted[i];
          const tp = t.group.position.clone().setY(1.2);
          const crit = this.rollCrit(t);
          fireBeam(hopFrom, tp, def.color, { crit });
          this.applyDamage(t, def, dmgMult * (crit ? 2 : 1) * Math.pow(0.8, i), crit);
          hopFrom = tp;
          anyHit = true;
        }
      } else {
        for (const t of targets) {
          if (!t) continue;
          const tp = t.group.position.clone().setY(t.type === 'blackhat' ? 2 : 1.2);
          const crit = this.rollCrit(t);
          fireBeam(from, tp, def.color, { crit });
          this.applyDamage(t, def, dmgMult * (crit ? 2 : 1), crit);
          if (def.stun) { t.stunT = def.stun; Game.terminal.log(`🧊 ${t.data.name} izolyatsiya qilindi!`, 'sys'); }
          if (def.mark) { t.marked = true; }
          anyHit = true;
        }
      }

      if (Game.audio) Game.audio.sfx(def.dmg > 20 ? 'laserBig' : 'laser');
      if (!anyHit && def.dmg > 0) Game.terminal.log('Nishon topilmadi...', 'warn');
      Game.terminal.hints(this.suggestion());

      // tutorial flow
      if (this.tutorialStep === 1 && def.cmd === 'nmap') {
        this.tutorialStep = 2;
        Game.hud.tutorial("Zo'r! Endi <b>ban</b> yozib kuchli zarba bering. Viruslardan qochish: strelkalar bilan harakatlaning!");
      } else if (this.tutorialStep === 2 && def.dmg >= 15) {
        this.tutorialStep = 3;
        Game.hud.tutorial("Ajoyib! Agar HP kamaysa — <b>patch</b>, himoya uchun <b>sudo shield</b>. Xakerni mag'lub eting!");
      }
    },

    rollCrit(target) {
      let chance = 0.12 + (Game.skills.includes('aim') ? 0.1 : 0) + (target.marked ? 0.25 : 0);
      const crit = Math.random() < chance;
      if (crit) {
        slowMo(0.2, 0.3);
        if (Game.audio) Game.audio.sfx('crit');
      }
      return crit;
    },

    applyDamage(t, def, mult, crit) {
      const dealt = t.damage(Math.round(def.dmg * mult), { fromDecrypt: !!def.antiRansom });
      if (dealt > 0) {
        Game.terminal.log(`${crit ? '💥 KRITIK! ' : '⚡ '}${t.data.name}: -${dealt} HP`, crit ? 'warn' : '');
        if (t.marked) t.marked = false;
      }
    },

    nearestTarget(alive, ppos) {
      let best = null, bd = Infinity;
      for (const e of alive) {
        const d = e.group.position.distanceTo(ppos);
        const dd = e.revealed ? d : d * 3; // prefer visible targets
        if (dd < bd) { bd = dd; best = e; }
      }
      return best;
    },

    suggestion() {
      const alive = this.enemies.filter((e) => e.alive);
      if (alive.some((e) => e.type === 'phantom' && !e.revealed)) return 'nmap';
      if (this.projectiles.length >= 3 && this.cooldownLeft('firewall --block') <= 0) return 'firewall --block';
      if (Game.stats.hp < Game.stats.maxHp * 0.4 && this.cooldownLeft('patch') <= 0) return 'patch';
      if (Game.stats.shield <= 0 && this.cooldownLeft('sudo shield') <= 0 && Game.stats.hp < Game.stats.maxHp * 0.7) return 'sudo shield';
      if (alive.some((e) => e.type === 'ransom') && Game.unlockedCommands.includes('decrypt') && this.cooldownLeft('decrypt') <= 0) return 'decrypt';
      if (this.cooldownLeft('ban') <= 0) return 'ban';
      return 'nmap';
    },

    penalty(msg) {
      this.combo = 0;
      Game.hud.combo(1);
      Game.terminal.log(`✖ ${msg}`, 'err');
      Game.hud.glitch(300);
      if (Game.stats.shield > 0) Game.stats.shield = Math.max(0, Game.stats.shield - 6);
      else Game.player.damage(3, 'typo');
      if (Game.audio) Game.audio.sfx('error');
    },

    // ---- enemy attack handling ----
    handleAttack(e, req) {
      const ppos = Game.player.pos();
      switch (req.kind) {
        case 'virus': {
          const fromE = e.group.position.clone().setY(1.3);
          const mesh = new THREE.Mesh(
            new THREE.SphereGeometry(0.16, 8, 6),
            new THREE.MeshBasicMaterial({ color: 0xff4433 }));
          mesh.position.copy(fromE);
          Game.three.scene.add(mesh);
          const dir = new THREE.Vector3(ppos.x, 1.1, ppos.z).sub(fromE).normalize();
          this.projectiles.push({ mesh, dir, speed: 7.5, dmg: req.dmg, life: 7 });
          if (Game.audio) Game.audio.sfx('virus');
          break;
        }
        case 'phish': this.showPhish(); break;
        case 'lock': {
          this.lockT = req.dur;
          Game.hud.glitch(500);
          Game.terminal.log('🔒 Xaker buyruqlaringizni qulfladi!', 'err');
          if (Game.audio) Game.audio.sfx('lock');
          break;
        }
        case 'spawnDrones': {
          for (let i = 0; i < req.n; i++) {
            const a = Math.random() * Math.PI * 2;
            const p = e.group.position.clone().add(new THREE.Vector3(Math.cos(a) * 2, 0, Math.sin(a) * 2));
            this.enemies.push(new Enemy('drone', p));
          }
          Game.terminal.log('🤖 Botlar chaqirildi!', 'warn');
          break;
        }
        case 'teleport': e.teleport(ppos); break;
        case 'punch':
          Game.player.damage(Math.round(req.dmg * diff().enemyDmg), 'punch');
          break;
        case 'droneBoom':
          explosion(e.group.position.clone().setY(1), 0xff5555, 1);
          if (Game.player.pos().distanceTo(e.group.position) < 2) {
            Game.player.damage(Math.round(req.dmg * diff().enemyDmg), 'drone');
          }
          break;
        case 'bossPhase': {
          if (req.phase === 2) {
            Game.hud.toast('☠ Qora Shlyapa g‘azablandi! 2-bosqich!', 'bad');
            e.teleport(ppos);
          } else {
            Game.hud.toast('☠ OXIRGI BOSQICH! Fayllaringiz shifrlanmoqda!', 'bad');
            if (Game.actions.decryptPuzzle && !this.minigameOpen) {
              this.minigameOpen = true;
              Game.actions.decryptPuzzle((ok) => {
                this.minigameOpen = false;
                if (ok) {
                  e.damage(80, { fromDecrypt: true });
                  Game.terminal.log('🔓 Shifr buzildi! Katta zarar yetkazildi!', 'sys');
                } else {
                  Game.player.damage(25, 'ransom');
                  Game.terminal.log('Fayllar shifrlandi! Katta zarar oldingiz.', 'err');
                }
              });
            } else {
              this.lockT = 4;
            }
          }
          if (Game.audio) Game.audio.sfx('alert');
          break;
        }
      }
    },

    showPhish() {
      if (this.phishActive) return;
      const popup = $('phishPopup');
      const body = $('phishBody');
      body.textContent = choice(PHISH_MSGS);
      popup.classList.remove('hidden');
      exitPointerLock();
      Game.terminal.log("📩 Soxta xabar keldi! 'rad' deb yozing yoki RAD ETISH tugmasini bosing!", 'warn');
      this.phishActive = {
        t: setTimeout(() => this.failPhish(), 7000),
      };
      if (Game.audio) Game.audio.sfx('phone');
    },

    rejectPhish() {
      if (!this.phishActive) return;
      clearTimeout(this.phishActive.t);
      this.phishActive = null;
      $('phishPopup').classList.add('hidden');
      Game.stats.coins += 5;
      Game.terminal.log('✔ Fishing rad etildi! +5 tanga (hushyorlik mukofoti)', 'sys');
      if (Game.audio) Game.audio.sfx('coin');
    },

    failPhish(accepted = false) {
      if (!this.phishActive) return;
      clearTimeout(this.phishActive.t);
      this.phishActive = null;
      $('phishPopup').classList.add('hidden');
      Game.stats.coins = Math.max(0, Game.stats.coins - 15);
      Game.player.damage(6, 'phish');
      Game.hud.glitch(600);
      Game.terminal.log(accepted
        ? '✖ Havolani ochdingiz! Bu fishing edi: -15 tanga. Hech qachon ochmang!'
        : '✖ Fishing xabariga javob bermadingiz: -15 tanga', 'err');
    },

    meleeHit() {
      if (Game.mode !== 'combat') return;
      const ppos = Game.player.pos();
      const fx = Math.sin(Game.player.facing), fz = Math.cos(Game.player.facing);
      for (const e of this.enemies) {
        if (!e.alive) continue;
        const d = e.group.position.distanceTo(ppos);
        if (d > 2.1) continue;
        const dx = (e.group.position.x - ppos.x) / d, dz = (e.group.position.z - ppos.z) / d;
        if (dx * fx + dz * fz < 0.2) continue;
        const dmg = 16 + Game.stats.level * 2;
        const dealt = e.damage(dmg, { melee: true });
        spawnSparks(e.group.position.clone().setY(1.2), 0xffd34d, 8, 4);
        if (Game.audio) Game.audio.sfx('punch');
        if (e.type === 'thug' && e.alive) {
          // knockback + brief stun
          e.group.position.x += dx * 1.2;
          e.group.position.z += dz * 1.2;
          e.stunT = Math.max(e.stunT, 0.5);
        }
        Game.terminal.log(`👊 ${e.data.name}: -${dealt} HP`, '');
        break;
      }
    },

    onPlayerDown(source) {
      Game.hud.toast("😵 Hushingizni yo'qotdingiz! Uyda uyg'ondingiz...", 'bad');
      const lost = Math.round(Game.stats.coins * 0.1);
      Game.stats.coins -= lost;
      if (lost > 0) Game.hud.toast(`-${lost} tanga yo'qoldi`, 'bad');
      this.endCombat(false);
      if (Game.missions) Game.missions.fail('down');
      Game.hud.fadeInOut(() => {
        const h = Game.homePos || new THREE.Vector3(0, 0, 0);
        Game.player.pos().set(h.x, 0.1, h.z);
        Game.inside = null;
        Game.stats.hp = Math.round(Game.stats.maxHp * 0.6);
        Game.stats.shield = 0;
      });
    },

    endCombat(won) {
      for (const e of this.enemies) if (e.alive) { e.alive = false; Game.three.scene.remove(e.group); }
      for (const pr of this.projectiles) Game.three.scene.remove(pr.mesh);
      this.projectiles = [];
      this.enemies = [];
      if (this.phishActive) { clearTimeout(this.phishActive.t); this.phishActive = null; $('phishPopup').classList.add('hidden'); }
      Game.terminal.close();
      Game.player.setCombatPose(false);
      Game.hud.combo(1);
      Game.hud.tutorial(null);
      if (Game.mode === 'combat') Game.mode = 'play';
      if (Game.audio) Game.audio.music('ambient');
      if (!Game.tutorialDone && won) {
        Game.tutorialDone = true;
        Game.hud.toast("🎓 O'quv jangi tugadi! Endi shahar sizning qo'lingizda.", 'good');
      }
    },

    victory() {
      const m = this.mission;
      let xp = 20, coins = 10;
      for (const e of this.enemies) {
        xp += e.data.xp;
        coins += e.data.coins;
      }
      const isBoss = m && m.spec.type === 'blackhat';
      this.endCombat(true);

      if (Game.progression) Game.progression.reward(xp, coins, isBoss ? 20 : 4);
      else {
        Game.stats.xp += xp; Game.stats.coins += coins;
        Game.stats.trust = clamp(Game.stats.trust + 4, 0, 100);
      }
      Game.hud.toast(`✔ ${m ? m.loc.name : 'Tizim'} himoya qilindi! +${xp} XP, +${coins} tanga`, 'good');
      if (Game.audio) Game.audio.sfx('win');

      if (isBoss) {
        Game.bossDefeated = true;
        Game.hud.toast('🏆 QORA SHLYAPA MAG‘LUB BO‘LDI! Shahar ozod!', 'gold');
        if (Game.progression) Game.progression.achieve('boss');
      }
      if (Game.missions) Game.missions.complete();
      this.mission = null;
    },

    update(dt) {
      updateLasers(dt);
      if (Game.mode !== 'combat' || this.minigameOpen) return;

      this.lockT = Math.max(0, this.lockT - dt);
      Game.terminal.setLocked(this.lockT > 0);
      for (const k in this.cooldowns) this.cooldowns[k] = Math.max(0, this.cooldowns[k] - dt);

      // combo decay
      if (this.combo > 0 && Game.elapsed - this.lastCorrect > 6) {
        this.combo = 0;
        Game.hud.combo(1);
      }

      // shield decay
      if (Game.stats.shield > 0) Game.stats.shield = Math.max(0, Game.stats.shield - dt * 3);

      // hint refresh
      this.hintTimer -= dt;
      if (this.hintTimer <= 0) {
        this.hintTimer = 0.5;
        Game.terminal.hints(this.suggestion());
      }

      const ppos = Game.player.pos();

      // enemies
      for (const e of [...this.enemies]) {
        const req = e.update(dt, ppos);
        if (req) this.handleAttack(e, req);
      }

      // projectiles (slight homing — dodge by moving)
      for (let i = this.projectiles.length - 1; i >= 0; i--) {
        const pr = this.projectiles[i];
        pr.life -= dt;
        const target = new THREE.Vector3(ppos.x, 1.1, ppos.z);
        const want = target.clone().sub(pr.mesh.position).normalize();
        pr.dir.lerp(want, dt * 1.1).normalize();
        pr.mesh.position.addScaledVector(pr.dir, pr.speed * dt);
        pr.mesh.scale.setScalar(1 + Math.sin(Game.elapsed * 12) * 0.2);
        const d = pr.mesh.position.distanceTo(target);
        if (d < 0.75) {
          Game.player.damage(Math.round(pr.dmg * diff().enemyDmg), 'virus');
          explosion(pr.mesh.position.clone(), 0xff4433, 0.6);
          Game.three.scene.remove(pr.mesh);
          this.projectiles.splice(i, 1);
        } else if (pr.life <= 0) {
          Game.three.scene.remove(pr.mesh);
          this.projectiles.splice(i, 1);
        }
      }

      // victory?
      if (this.enemies.length && this.enemies.every((e) => !e.alive)) {
        this.victory();
      }
    },
  };

  // phishing popup buttons
  $('phishReject').addEventListener('click', () => C.rejectPhish());
  $('phishAccept').addEventListener('click', () => C.failPhish(true));

  Game.combat = C;
  return C;
}
