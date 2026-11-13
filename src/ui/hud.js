// HUD: top bars, vitals, toasts, prompts, mission banner, phone popup, buffs.
import { Game, xpNeeded } from '../core/state.js';
import { fmtTime } from '../core/utils.js';

const $ = (id) => document.getElementById(id);

export function initHud() {
  const els = {
    hud: $('hud'), level: $('statLevel'), xp: $('xpFill'), coins: $('statCoins'),
    trust: $('trustFill'), clock: $('statClock'), day: $('statDay'),
    hp: $('hpFill'), shield: $('shieldFill'), buffs: $('buffsRow'),
    banner: $('missionBanner'), mName: $('missionName'), mTimer: $('missionTimer'), mDist: $('missionDist'),
    prompt: $('prompt'), toasts: $('toasts'), combo: $('combo'),
    phone: $('phonePopup'), phoneText: $('phoneText'),
    tutorial: $('tutorial'), tutText: $('tutText'),
    glitch: $('glitch'), fade: $('fade'),
  };

  $('phoneOk').addEventListener('click', () => els.phone.classList.add('hidden'));

  const hud = {
    show() { els.hud.classList.remove('hidden'); },
    hide() { els.hud.classList.add('hidden'); },

    toast(msg, kind = '') {
      const d = document.createElement('div');
      d.className = `toast ${kind}`;
      d.textContent = msg;
      els.toasts.appendChild(d);
      setTimeout(() => { d.style.opacity = '0'; d.style.transition = 'opacity .5s'; }, 3400);
      setTimeout(() => d.remove(), 4000);
      while (els.toasts.children.length > 5) els.toasts.firstChild.remove();
    },

    phone(msg) {
      els.phoneText.textContent = msg;
      els.phone.classList.remove('hidden');
      if (Game.audio) Game.audio.sfx('phone');
      clearTimeout(hud._phoneT);
      hud._phoneT = setTimeout(() => els.phone.classList.add('hidden'), 6500);
    },

    prompt(text) {
      if (text) {
        els.prompt.innerHTML = text;
        els.prompt.classList.remove('hidden');
      } else els.prompt.classList.add('hidden');
    },

    combo(mult) {
      if (mult > 1) {
        els.combo.textContent = `x${mult.toFixed(1)}`;
        els.combo.classList.remove('hidden');
        els.combo.style.transform = `rotate(-6deg) scale(${1 + mult * 0.06})`;
      } else els.combo.classList.add('hidden');
    },

    tutorial(text) {
      if (text) {
        els.tutText.innerHTML = text;
        els.tutorial.classList.remove('hidden');
      } else els.tutorial.classList.add('hidden');
    },

    glitch(duration = 400) {
      els.glitch.classList.remove('hidden');
      clearTimeout(hud._glitchT);
      hud._glitchT = setTimeout(() => els.glitch.classList.add('hidden'), duration);
    },

    flashDamage() {
      els.fade.style.background = '#a00';
      els.fade.style.opacity = '0.28';
      setTimeout(() => {
        els.fade.style.opacity = '0';
        setTimeout(() => { els.fade.style.background = '#000'; }, 380);
      }, 90);
    },

    fadeInOut(midFn, done) {
      els.fade.classList.add('on');
      setTimeout(() => {
        if (midFn) midFn();
        setTimeout(() => {
          els.fade.classList.remove('on');
          if (done) done();
        }, 120);
      }, 380);
    },

    update() {
      const s = Game.stats;
      els.level.textContent = `${s.level}-daraja`;
      els.xp.style.width = `${Math.min(100, (s.xp / xpNeeded(s.level)) * 100)}%`;
      els.coins.textContent = s.coins;
      els.trust.style.width = `${s.trust}%`;
      els.trust.style.background = s.trust < 30 ? '#ff5f4d' : '';
      els.clock.textContent = fmtTime(Game.timeOfDay);
      els.day.textContent = `${Game.day}-kun`;
      els.hp.style.width = `${(s.hp / s.maxHp) * 100}%`;
      els.shield.style.width = `${Math.min(100, (s.shield / s.maxShield) * 100)}%`;

      // mission banner
      if (Game.mission && Game.mission.state === 'travel') {
        els.banner.classList.remove('hidden');
        els.mName.textContent = Game.mission.loc.name;
        els.mTimer.textContent = Math.max(0, Math.ceil(Game.mission.timeLeft));
        if (Game.inside) {
          els.mDist.textContent = 'Tashqariga chiqing!';
        } else {
          const p = Game.player.pos();
          const d = p.distanceTo(Game.mission.loc.pos);
          els.mDist.textContent = `${Math.round(d)}m`;
        }
      } else {
        els.banner.classList.add('hidden');
      }

      // buffs
      const now = Game.elapsed;
      Game.buffs = Game.buffs.filter((b) => b.until > now);
      els.buffs.innerHTML = Game.buffs
        .map((b) => `<span class="buff-chip">${b.label} ${Math.ceil(b.until - now)}s</span>`)
        .join('');
    },
  };

  Game.hud = hud;
  return hud;
}
