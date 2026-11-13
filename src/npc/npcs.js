// Citizens: wandering street NPCs, sitters, and service NPCs inside interiors.
import * as THREE from 'three';
import { Game } from '../core/state.js';
import { makePerson, animatePerson, HAIR_COLORS } from '../player/character.js';
import { startDialogue } from './dialogue.js';
import { choice, rand } from '../core/utils.js';

const npcs = [];

const NAMES = ['Olim aka', 'Zulfiya opa', 'Jasur', 'Madina', 'Bek aka', 'Sardor', 'Gulnoza', 'Botir aka', 'Nilufar', 'Aziz', 'Kamola', 'Rustam aka'];
const SKINS = [0xe8b88a, 0xd9a06a, 0xc98a5a, 0xf0c89a];
const SHIRTS = [0x2f6fba, 0xe05a4a, 0x3aa6a0, 0x7b4dff, 0xb08a4a, 0x7ab87a, 0xc94a7a, 0x555f6e];
const PANTS = [0x30405c, 0x4a3a2a, 0x3a3a3a, 0x5a4a6a];

function makeNpc(scene, { name, dialogueId, pos, wander = true, sit = false, ry = 0 }) {
  const person = makePerson({
    skin: choice(SKINS), shirt: choice(SHIRTS), pants: choice(PANTS),
    hairColor: choice(HAIR_COLORS), hairStyle: Math.random() < 0.25 ? 3 : 0,
    scale: 0.92 + Math.random() * 0.14,
  });
  const g = person.group;
  g.position.copy(pos);
  g.position.y = 0.1;
  g.rotation.y = ry;
  if (sit) {
    g.position.y = 0.35;
    person.parts.legL.rotation.x = -1.4;
    person.parts.legR.rotation.x = -1.4;
  }
  scene.add(g);

  const npc = {
    name, dialogueId, group: g, parts: person.parts,
    wander: wander && !sit, sit,
    target: null, pauseT: rand(0.5, 3), walkPhase: 0,
    home: pos.clone(),
  };
  npcs.push(npc);

  Game.interactables.push({
    pos: g.position,
    radius: 2.3,
    label: () => `${name} bilan gaplashish`,
    action: () => {
      // face each other
      const pp = Game.player.pos();
      g.rotation.y = Math.atan2(pp.x - g.position.x, pp.z - g.position.z);
      const dlgId = npc.getDialogue ? npc.getDialogue() : npc.dialogueId;
      startDialogue(name, dlgId.id || dlgId, dlgId.node || 'start');
    },
  });
  return npc;
}

export function spawnNpcs(scene) {
  const pts = Game.npcPoints;

  // wandering citizens
  const genericDialogues = ['citizen1', 'citizen2', 'citizen3', 'citizen4', 'citizen5'];
  for (let i = 0; i < 16; i++) {
    const p = choice(pts);
    makeNpc(scene, {
      name: NAMES[i % NAMES.length],
      dialogueId: genericDialogues[i % genericDialogues.length],
      pos: p.clone(),
    });
  }

  // bus stop sitter
  if (Game.busStopPos) {
    makeNpc(scene, {
      name: 'Tohir aka', dialogueId: 'citizen5',
      pos: Game.busStopPos.clone().add(new THREE.Vector3(0, 0, -0.4)),
      wander: false, sit: true, ry: Math.PI,
    });
  }

  // quest givers near landmarks
  const parkBlock = Game.mapBlocks.find((b) => b.type === 'park');
  if (parkBlock) {
    const q = makeNpc(scene, {
      name: 'Mohira xola', dialogueId: 'quest_phone',
      pos: new THREE.Vector3(parkBlock.x + 5, 0, parkBlock.z + 8), wander: false,
    });
    q.getDialogue = () => ({ id: 'quest_phone', node: questNode('phone') });
    Game.questGivers = Game.questGivers || {};
    Game.questGivers.phone = q;
  }
  const schoolBlock = Game.mapBlocks.find((b) => b.type === 'school');
  if (schoolBlock) {
    const q = makeNpc(scene, {
      name: "Muallim Anvar", dialogueId: 'quest_usb',
      pos: new THREE.Vector3(schoolBlock.x - 6, 0, schoolBlock.z + 12), wander: false,
    });
    q.getDialogue = () => ({ id: 'quest_usb', node: questNode('usb') });
  }

  // interior service NPCs
  const inBack = (id, dx, dz) => Game.interiors[id].origin.clone().add(new THREE.Vector3(dx, 0, dz));
  if (Game.interiors.barber) {
    makeNpc(scene, { name: 'Usta Karim', dialogueId: 'barber_npc', pos: inBack('barber', 1.6, -3.2), wander: false, ry: 2.4 });
  }
  if (Game.interiors.shop) {
    makeNpc(scene, { name: 'Sotuvchi Dilshod', dialogueId: 'shop_npc', pos: inBack('shop', 4, 1.6), wander: false, ry: Math.PI });
  }
  if (Game.interiors.library) {
    const q = makeNpc(scene, { name: 'Kutubxonachi Nodira', dialogueId: 'librarian', pos: inBack('library', -2, -3.5), wander: false, ry: Math.PI });
    q.getDialogue = () => {
      const usb = Game.quests.find((x) => x.id === 'usb');
      if (usb && usb.state === 'active') {
        return { id: 'quest_usb_turnin', node: 'start' };
      }
      return { id: 'librarian', node: 'start' };
    };
  }
  if (Game.interiors.cafe) {
    const q = makeNpc(scene, { name: 'Choyxonachi Hasan', dialogueId: 'cafe_npc', pos: inBack('cafe', 0, -4.2), wander: false, ry: Math.PI });
    q.getDialogue = () => {
      const wifi = Game.quests.find((x) => x.id === 'wifi');
      if (!wifi) return { id: 'quest_wifi', node: 'start' };
      if (wifi.state === 'active') return { id: 'quest_wifi', node: 'active' };
      return { id: 'cafe_npc', node: 'start' };
    };
    // seated customers
    makeNpc(scene, { name: 'Mijoz Akmal', dialogueId: 'citizen1', pos: inBack('cafe', -4, -1.2), wander: false, sit: true, ry: Math.PI / 2 });
    makeNpc(scene, { name: 'Mijoz Lola', dialogueId: 'citizen4', pos: inBack('cafe', 4.8, -2), wander: false, sit: true, ry: -Math.PI / 2 });
  }
}

function questNode(id) {
  const q = Game.quests.find((x) => x.id === id);
  if (!q) return 'start';
  if (q.state === 'active') return q.readyToTurnIn ? 'done' : 'active';
  if (q.state === 'done') return 'after';
  return 'start';
}

export function updateNpcs(dt) {
  for (const n of npcs) {
    if (n.sit) continue;

    // face the player when close (friendly feel)
    const pp = Game.player ? Game.player.pos() : null;
    const d = pp ? pp.distanceTo(n.group.position) : 99;

    if (!n.wander) {
      if (d < 4) {
        const ty = Math.atan2(pp.x - n.group.position.x, pp.z - n.group.position.z);
        n.group.rotation.y += (ty - n.group.rotation.y) * Math.min(1, dt * 5);
      }
      animatePerson(n.parts, Game.elapsed * 1.5 + n.home.x, 0.04, dt);
      continue;
    }

    // wandering along sidewalk points
    if (d < 2.6 && Game.mode === 'dialogue') continue; // stand still while talking

    if (!n.target) {
      n.pauseT -= dt;
      if (n.pauseT <= 0) {
        // pick an axis-aligned nearby point so NPCs walk along sidewalks
        const cands = Game.npcPoints.filter((p) => {
          const dx = Math.abs(p.x - n.group.position.x);
          const dz = Math.abs(p.z - n.group.position.z);
          const dd = n.group.position.distanceTo(p);
          return dd > 4 && dd < 46 && (dx < 3 || dz < 3);
        });
        n.target = cands.length ? choice(cands) : choice(Game.npcPoints);
      } else {
        animatePerson(n.parts, 0, 0, dt);
        continue;
      }
    }

    const dir = new THREE.Vector3().subVectors(n.target, n.group.position);
    dir.y = 0;
    const dist = dir.length();
    if (dist < 0.6) {
      n.target = null;
      n.pauseT = rand(1.5, 6);
      continue;
    }
    dir.normalize();
    const sp = 1.6;
    n.group.position.addScaledVector(dir, sp * dt);
    const ty = Math.atan2(dir.x, dir.z);
    let diff = ty - n.group.rotation.y;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    n.group.rotation.y += diff * Math.min(1, dt * 8);
    n.walkPhase += dt * 6;
    animatePerson(n.parts, n.walkPhase, 0.5, dt);
  }
}
