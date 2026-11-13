// Side quests: lost phone, USB delivery, cafe Wi-Fi check.
import * as THREE from 'three';
import { Game } from '../core/state.js';

export const QUEST_DEFS = {
  phone: {
    title: 'Yo‘qolgan telefon',
    desc: 'Mohira xolaning telefonini parkdan toping va qaytaring.',
    rewardCoins: 30, rewardXp: 40,
  },
  usb: {
    title: 'USB yetkazish',
    desc: 'Muallim Anvarning USB-fleshkasini kutubxonachiga yetkazing.',
    rewardCoins: 25, rewardXp: 35,
  },
  wifi: {
    title: 'Kafe Wi-Fi muammosi',
    desc: 'Choyxona tarmog‘idagi xakerni toping va yo‘q qiling.',
    rewardCoins: 40, rewardXp: 50,
  },
};

let phoneObj = null;

export function initQuests(scene) {
  Game.questMarkers = [];

  Game.actions.startQuest = (id) => {
    if (Game.quests.find((q) => q.id === id)) return;
    Game.quests.push({ id, state: 'active', readyToTurnIn: false });
    Game.hud.toast(`📜 Yangi topshiriq: ${QUEST_DEFS[id].title}`, 'gold');
    if (Game.audio) Game.audio.sfx('quest');

    if (id === 'phone') {
      // glowing phone near the park fountain
      const park = Game.mapBlocks.find((b) => b.type === 'park');
      const pos = new THREE.Vector3(park.x + 4.5, 0.4, park.z - 3);
      phoneObj = new THREE.Group();
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(0.22, 0.05, 0.4),
        new THREE.MeshBasicMaterial({ color: 0x222831 }));
      const glow = new THREE.Mesh(
        new THREE.SphereGeometry(0.4, 10, 8),
        new THREE.MeshBasicMaterial({ color: 0x66ffcc, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false }));
      phoneObj.add(body, glow);
      phoneObj.position.copy(pos);
      scene.add(phoneObj);
      Game.questMarkers.push({ x: pos.x, z: pos.z, quest: 'phone' });
      Game.interactables.push({
        id: 'phonePickup',
        pos, radius: 2, label: 'Telefonni olish',
        action: () => {
          scene.remove(phoneObj);
          phoneObj = null;
          Game.questMarkers = Game.questMarkers.filter((m) => m.quest !== 'phone');
          Game.interactables = Game.interactables.filter((i) => i.id !== 'phonePickup');
          const q = Game.quests.find((x) => x.id === 'phone');
          if (q) q.readyToTurnIn = true;
          Game.hud.toast('📱 Telefon topildi! Mohira xolaga qaytaring.', 'good');
          if (Game.audio) Game.audio.sfx('coin');
        },
        onlyOutside: true,
      });
    }

    if (id === 'usb') {
      const lib = Game.locations.find((l) => l.id === 'library');
      if (lib) Game.questMarkers.push({ x: lib.pos.x, z: lib.pos.z, quest: 'usb' });
    }

    if (id === 'wifi') {
      // trigger a hacker attack at the cafe
      const cafe = Game.locations.find((l) => l.id === 'cafe');
      if (cafe && !Game.mission && Game.missions) {
        Game.missions.start(cafe, { quest: 'wifi' });
      }
    }
  };

  Game.actions.finishQuest = (id) => {
    const q = Game.quests.find((x) => x.id === id);
    if (!q || q.state === 'done') return;
    q.state = 'done';
    Game.questMarkers = Game.questMarkers.filter((m) => m.quest !== id);
    const def = QUEST_DEFS[id];
    if (Game.progression) Game.progression.reward(def.rewardXp, def.rewardCoins, 2);
    Game.hud.toast(`✔ Topshiriq bajarildi: ${def.title}! +${def.rewardCoins} tanga`, 'gold');
    if (Game.audio) Game.audio.sfx('win');
    if (Object.keys(QUEST_DEFS).every((k) => {
      const qq = Game.quests.find((x) => x.id === k);
      return qq && qq.state === 'done';
    })) {
      if (Game.progression) Game.progression.achieve('quests');
    }
  };

  // mission tied to a quest finished
  Game.actions.questCombatDone = (questId) => {
    if (questId === 'wifi') Game.actions.finishQuest('wifi');
  };
}

export function renderQuestLog() {
  const active = Game.quests.filter((q) => q.state === 'active');
  const done = Game.quests.filter((q) => q.state === 'done');
  let html = '<h4>Faol topshiriqlar</h4>';
  if (!active.length) html += '<p style="color:#7f96bd">Hozircha faol topshiriq yo‘q. Shahar aholisi bilan gaplashing!</p>';
  for (const q of active) {
    const d = QUEST_DEFS[q.id];
    html += `<div class="quest-item"><b>${d.title}</b><br><span style="color:#9fb4d8">${d.desc}</span></div>`;
  }
  html += '<h4>Bajarilgan</h4>';
  if (!done.length) html += '<p style="color:#7f96bd">—</p>';
  for (const q of done) {
    const d = QUEST_DEFS[q.id];
    html += `<div class="quest-item done"><b>✔ ${d.title}</b></div>`;
  }
  return html;
}
