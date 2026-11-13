// Generic panel + shop / cafe / barber / skill tree / home PC screens.
import { Game } from '../core/state.js';
import { SHOP_ITEMS, CAFE_MENU, SKILL_TREE } from '../data/items.js';
import { HAIR_STYLES, HAIR_COLORS } from '../player/character.js';
import { skipToMorning } from '../world/daynight.js';
import { exitPointerLock } from '../core/input.js';

const $ = (id) => document.getElementById(id);
let panel, titleEl, bodyEl;

export function initPanels() {
  panel = $('panel'); titleEl = $('panelTitle'); bodyEl = $('panelBody');
  $('panelClose').addEventListener('click', closePanel);

  Game.actions.openShop = openShop;
  Game.actions.openCafe = openCafe;
  Game.actions.openBarber = openBarber;
  Game.actions.skillTree = openSkillTree;
  Game.actions.homePC = openHomePC;
  Game.actions.sleep = sleep;
}

function openPanel(title) {
  if (Game.mode === 'combat') return false;
  Game.mode = 'panel';
  exitPointerLock();
  titleEl.textContent = title;
  bodyEl.innerHTML = '';
  panel.classList.remove('hidden');
  return true;
}

export function closePanel() {
  panel.classList.add('hidden');
  if (Game.mode === 'panel') Game.mode = 'play';
}

function row({ name, desc, btnText, disabled, onBuy, cls = '' }) {
  const d = document.createElement('div');
  d.className = `shop-item ${cls}`;
  d.innerHTML = `<div><div class="si-name">${name}</div><div class="si-desc">${desc}</div></div>`;
  const b = document.createElement('button');
  b.className = 'buy-btn';
  b.textContent = btnText;
  b.disabled = !!disabled;
  b.addEventListener('click', () => { onBuy(); });
  d.appendChild(b);
  bodyEl.appendChild(d);
}

function pay(price) {
  if (Game.stats.coins < price) {
    Game.hud.toast('Tangalar yetarli emas!', 'bad');
    if (Game.audio) Game.audio.sfx('error');
    return false;
  }
  Game.stats.coins -= price;
  if (Game.audio) Game.audio.sfx('coin');
  return true;
}

function addBuff(buff) {
  Game.buffs = Game.buffs.filter((b) => b.id !== buff.id);
  Game.buffs.push({ id: buff.id, label: buff.label, until: Game.elapsed + buff.dur, data: buff.data });
}

// ---------- Shop ----------
function openShop() {
  if (!openPanel("Gadjetlar do'koni")) return;
  for (const item of SHOP_ITEMS) {
    const lvl = item.id === 'scooter' ? (Game.gear.scooter ? 1 : 0)
      : item.consumable ? 0 : Game.gear[item.id];
    const maxed = !item.consumable && lvl >= item.maxLvl;
    const price = maxed ? 0 : item.prices[lvl];
    row({
      name: item.name + (item.maxLvl > 1 && lvl > 0 ? ` (${lvl}/${item.maxLvl})` : ''),
      desc: item.desc,
      btnText: maxed ? 'Olingan ✓' : `${price} ⬤`,
      disabled: maxed,
      onBuy: () => {
        if (maxed || !pay(price)) return;
        if (item.id === 'scooter') {
          Game.gear.scooter = true;
          Game.hud.toast('🛴 Skuter olindi! Ko‘chada R tugmasini bosing.', 'good');
        } else if (item.id === 'energy') {
          addBuff({ id: 'energy', label: '⚡ Tezlik', dur: 90, data: { speed: 1.25 } });
          Game.hud.toast('⚡ Energetik ichildi!', 'good');
        } else {
          Game.gear[item.id]++;
          Game.hud.toast(`✔ ${item.name} olindi!`, 'good');
        }
        openShop(); // refresh
      },
    });
  }
}

// ---------- Cafe ----------
function openCafe() {
  if (!openPanel('Choyxona menyusi')) return;
  for (const m of CAFE_MENU) {
    row({
      name: m.name, desc: m.desc, btnText: `${m.price} ⬤`,
      onBuy: () => {
        if (!pay(m.price)) return;
        if (m.hp) Game.player.heal(m.hp);
        if (m.buff) addBuff(m.buff);
        Game.hud.toast(`😋 ${m.name} — yoqimli ishtaha!`, 'good');
      },
    });
  }
}

// ---------- Barber ----------
function openBarber() {
  if (!openPanel('Sartaroshxona')) return;
  const info = document.createElement('p');
  info.style.cssText = 'margin-bottom:10px;color:#8fa6cc;font-size:13px';
  info.textContent = "Soch turmagi yoki rangini tanlang — har o'zgartirish 10 tanga.";
  bodyEl.appendChild(info);

  HAIR_STYLES.forEach((styleName, si) => {
    row({
      name: `Turmak: ${styleName}`,
      desc: si === Game.hair.style ? 'Hozirgi turmagingiz' : '',
      btnText: si === Game.hair.style ? '✓' : '10 ⬤',
      disabled: si === Game.hair.style,
      onBuy: () => {
        if (!pay(10)) return;
        Game.hair.style = si;
        Game.player.setHair(Game.hair.style, HAIR_COLORS[Game.hair.color]);
        Game.hud.toast('💈 Yangi turmak muborak!', 'good');
        openBarber();
      },
    });
  });

  const colorNames = ['Qora', 'Jigarrang', 'Sariq', 'Mis', "Ko'k", 'Yashil'];
  colorNames.forEach((cn, ci) => {
    row({
      name: `Rang: ${cn}`,
      desc: ci === Game.hair.color ? 'Hozirgi rang' : '',
      btnText: ci === Game.hair.color ? '✓' : '10 ⬤',
      disabled: ci === Game.hair.color,
      onBuy: () => {
        if (!pay(10)) return;
        Game.hair.color = ci;
        Game.player.setHair(Game.hair.style, HAIR_COLORS[Game.hair.color]);
        Game.hud.toast('🎨 Yangi rang muborak!', 'good');
        openBarber();
      },
    });
  });
}

// ---------- Skill tree ----------
function openSkillTree() {
  if (!openPanel("Ko'nikmalar daraxti")) return;
  const info = document.createElement('p');
  info.style.cssText = 'margin-bottom:10px;color:#b98bff;font-size:14px';
  info.textContent = `Ko'nikma ballari: ${Game.stats.skillPoints} (har darajada +1)`;
  bodyEl.appendChild(info);

  let learned = 0;
  for (const tier of SKILL_TREE) {
    const prevTierDone = tier.tier === 1 ||
      SKILL_TREE.find((t) => t.tier === tier.tier - 1).items.some((i) => Game.skills.includes(i.id));
    const h = document.createElement('h4');
    h.style.cssText = 'color:#b98bff;margin:8px 0 6px';
    h.textContent = `${tier.tier}-bosqich${prevTierDone ? '' : ' (avvalgi bosqichdan kamida bittasini o‘rganing)'}`;
    bodyEl.appendChild(h);

    for (const sk of tier.items) {
      const got = Game.skills.includes(sk.id);
      if (got && sk.cmd) learned++;
      row({
        cls: 'skill-node',
        name: sk.cmd ? `Buyruq: ${sk.name}` : sk.name,
        desc: sk.desc,
        btnText: got ? "O'rganilgan ✓" : `${sk.cost} ball`,
        disabled: got || !prevTierDone || Game.stats.skillPoints < sk.cost,
        onBuy: () => {
          if (Game.stats.skillPoints < sk.cost) return;
          Game.stats.skillPoints -= sk.cost;
          Game.skills.push(sk.id);
          if (sk.cmd && !Game.unlockedCommands.includes(sk.cmd)) {
            Game.unlockedCommands.push(sk.cmd);
            Game.hud.toast(`📘 Yangi buyruq o'rganildi: ${sk.cmd}`, 'gold');
          } else {
            Game.hud.toast(`📘 O'rganildi: ${sk.name}`, 'gold');
          }
          if (Game.audio) Game.audio.sfx('levelup');
          const cmdCount = Game.skills.filter((id) =>
            SKILL_TREE.some((t) => t.items.some((i) => i.id === id && i.cmd))).length;
          if (cmdCount >= 4 && Game.progression) Game.progression.achieve('scholar');
          openSkillTree();
        },
      });
    }
  }
}

// ---------- Home PC ----------
function openHomePC() {
  if (!openPanel('Shaxsiy kompyuter')) return;
  const s = Game.stats;
  const div = document.createElement('div');
  div.style.cssText = 'font-size:14px;line-height:1.9;margin-bottom:12px';
  div.innerHTML = `
    <b style="color:#6cf7ff">Statistika</b><br>
    Daraja: ${s.level} · XP: ${s.xp} · Tangalar: ${s.coins}<br>
    Shahar ishonchi: ${Math.round(s.trust)}%<br>
    G'alabalar: ${s.missionsWon} · Mag'lubiyatlar: ${s.missionsFailed}<br>
    Eng yaxshi kombo: x${(1 + Math.min(s.bestCombo, 8) * 0.15).toFixed(2)}<br>
    O'rganilgan buyruqlar: ${Game.unlockedCommands.length} ta<br>
    Yutuqlar: ${Game.achievements.length} ta`;
  bodyEl.appendChild(div);

  row({
    name: '💾 O‘yinni saqlash', desc: 'Jarayon localStorage’ga yoziladi',
    btnText: 'Saqlash',
    onBuy: () => {
      if (Game.save) Game.save.save();
      Game.hud.toast('💾 O‘yin saqlandi!', 'good');
    },
  });
  row({
    name: '⌨ Parol mashqi (mini-o‘yin)', desc: 'Ketma-ketlikni eslab qoling va yozing — tanga yutib oling',
    btnText: "O'ynash",
    onBuy: () => {
      closePanel();
      if (Game.actions.passwordGame) Game.actions.passwordGame();
    },
  });
}

// ---------- Sleep ----------
function sleep() {
  Game.hud.fadeInOut(() => {
    skipToMorning();
    Game.stats.hp = Game.stats.maxHp;
    if (Game.mission) Game.missions.fail('slept');
  }, () => {
    Game.hud.toast('🌅 Yaxshi dam oldingiz! HP to‘ldi.', 'good');
    if (Game.save) Game.save.auto();
  });
}
