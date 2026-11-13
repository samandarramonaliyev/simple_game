// Enterable interiors. Each room is built far away from the city in the same
// scene; entering = fade + teleport (simple and fast, feels like a scene swap).
import * as THREE from 'three';
import { Game } from '../core/state.js';
import { flatMat } from './buildings.js';

const ORDER = ['home', 'cafe', 'barber', 'shop', 'library'];
const BASE = new THREE.Vector3(600, 0, 600);
const ROOM_W = 16, ROOM_D = 13, ROOM_H = 4;

const titles = {
  home: 'Mening uyim', cafe: 'Choyxona', barber: 'Sartaroshxona',
  shop: "Gadjetlar do'koni", library: 'Kutubxona',
};

function solid(m) { m.userData.solid = true; m.castShadow = true; m.receiveShadow = true; return m; }

function rugTexture() {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 96;
  const x = c.getContext('2d');
  x.fillStyle = '#8a2a2a'; x.fillRect(0, 0, 128, 96);
  x.strokeStyle = '#e8c870'; x.lineWidth = 5; x.strokeRect(8, 8, 112, 80);
  x.fillStyle = '#e8c870';
  for (let i = 0; i < 4; i++) {
    x.beginPath();
    x.arc(28 + i * 24, 48, 7, 0, Math.PI * 2);
    x.fill();
  }
  x.fillStyle = '#2a4a6a';
  x.fillRect(58, 40, 14, 14);
  return new THREE.CanvasTexture(c);
}

export function buildInteriors(scene) {
  Game.interiors = {};
  const group = new THREE.Group();
  group.name = 'interiors';

  ORDER.forEach((id, i) => {
    const origin = BASE.clone().add(new THREE.Vector3(i * 80, 0, 0));
    const room = new THREE.Group();
    room.position.copy(origin);

    // floor / walls / ceiling
    const floor = new THREE.Mesh(new THREE.BoxGeometry(ROOM_W, 0.2, ROOM_D),
      flatMat(id === 'home' ? 0xb08a5a : 0xcab793));
    floor.position.y = -0.1; floor.receiveShadow = true;
    room.add(floor);
    const wallMat = flatMat({
      home: 0xead9b0, cafe: 0xd9a06a, barber: 0x9ec4de, shop: 0xa8d4a8, library: 0xd8c6a2,
    }[id]);
    const mkWall = (w, h, d, x, y, z) => {
      const m = solid(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat));
      m.position.set(x, y, z);
      room.add(m);
      return m;
    };
    mkWall(ROOM_W, ROOM_H, 0.3, 0, ROOM_H / 2, -ROOM_D / 2);          // back
    mkWall(0.3, ROOM_H, ROOM_D, -ROOM_W / 2, ROOM_H / 2, 0);          // left
    mkWall(0.3, ROOM_H, ROOM_D, ROOM_W / 2, ROOM_H / 2, 0);           // right
    // front wall with doorway gap
    mkWall(ROOM_W / 2 - 1.1, ROOM_H, 0.3, -(ROOM_W / 4 + 0.55), ROOM_H / 2, ROOM_D / 2);
    mkWall(ROOM_W / 2 - 1.1, ROOM_H, 0.3, (ROOM_W / 4 + 0.55), ROOM_H / 2, ROOM_D / 2);
    mkWall(2.4, ROOM_H - 2.6, 0.3, 0, ROOM_H - 0.7, ROOM_D / 2);      // lintel
    const ceil = new THREE.Mesh(new THREE.BoxGeometry(ROOM_W, 0.2, ROOM_D), flatMat(0xf0ead8));
    ceil.position.y = ROOM_H;
    room.add(ceil);

    // warm light
    const light = new THREE.PointLight(0xffe0b0, 28, 26, 1.8);
    light.position.set(0, ROOM_H - 0.6, 0);
    room.add(light);
    const lampShade = new THREE.Mesh(new THREE.ConeGeometry(0.4, 0.3, 8),
      new THREE.MeshBasicMaterial({ color: 0xffe9c0 }));
    lampShade.position.set(0, ROOM_H - 0.45, 0);
    room.add(lampShade);

    // rug
    const rug = new THREE.Mesh(new THREE.PlaneGeometry(5, 3.6),
      new THREE.MeshLambertMaterial({ map: rugTexture() }));
    rug.rotation.x = -Math.PI / 2;
    rug.position.set(0, 0.02, 1);
    room.add(rug);

    furnish(room, id);
    group.add(room);

    const spawn = origin.clone().add(new THREE.Vector3(0, 0.1, ROOM_D / 2 - 2));
    Game.interiors[id] = { id, origin, spawn, title: titles[id] };

    // exit door interactable
    Game.interactables.push({
      pos: origin.clone().add(new THREE.Vector3(0, 0, ROOM_D / 2 + 0.2)),
      radius: 2.2,
      label: 'Tashqariga chiqish',
      action: () => exitInterior(),
      onlyInside: id,
    });
  });

  scene.add(group);

  // register exterior door interactables from city
  for (const d of Game.cityDoors) {
    Game.interactables.push({
      pos: d.pos, radius: 2.4, label: d.label,
      action: () => enterInterior(d.id),
      onlyOutside: true,
    });
  }

  // collect interior wall colliders
  group.updateWorldMatrix(true, true);
  group.traverse((o) => {
    if (o.userData.solid) {
      const box = new THREE.Box3().setFromObject(o);
      Game.colliders.push({ box, cx: (box.min.x + box.max.x) / 2, cz: (box.min.z + box.max.z) / 2 });
    }
  });
}

function furnish(room, id) {
  const add = (m, x, z, ry = 0, y = 0) => {
    m.position.set(x, y, z);
    m.rotation.y = ry;
    room.add(m);
    return m;
  };

  const table = (w = 1.6, d = 1) => {
    const g = new THREE.Group();
    const top = solid(new THREE.Mesh(new THREE.BoxGeometry(w, 0.1, d), flatMat(0x9a6a3a)));
    top.position.y = 0.78;
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.78, 0.09), flatMat(0x6a4a2a));
      leg.position.set(sx * (w / 2 - 0.1), 0.39, sz * (d / 2 - 0.1));
      g.add(leg);
    }
    g.add(top);
    return g;
  };
  const chair = (color = 0x7a5a3a) => {
    const g = new THREE.Group();
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 0.5), flatMat(color));
    seat.position.y = 0.45;
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.55, 0.08), flatMat(color));
    back.position.set(0, 0.75, -0.22);
    const legs = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.45, 0.42), flatMat(0x4a3a2a));
    legs.position.y = 0.22;
    g.add(seat, back, legs);
    return g;
  };
  const shelf = (color = 0x8a6a3a, goods = true) => {
    const g = new THREE.Group();
    const body = solid(new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.2, 0.5), flatMat(color)));
    body.position.y = 1.1;
    g.add(body);
    if (goods) {
      for (let i = 0; i < 6; i++) {
        const b = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.34, 0.2),
          flatMat([0xe05a4a, 0x3aa6a0, 0xffd34d, 0x7b4dff, 0x7ab87a, 0xff9d3b][i]));
        b.position.set(-0.9 + (i % 3) * 0.9, 0.75 + Math.floor(i / 3) * 0.75, 0.3);
        g.add(b);
      }
    }
    return g;
  };

  switch (id) {
    case 'home': {
      // bed
      const bed = new THREE.Group();
      const frame = solid(new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.4, 2.4), flatMat(0x6a4a2a)));
      frame.position.y = 0.2;
      const mattress = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.2, 2.2), flatMat(0xe8e0d0));
      mattress.position.y = 0.48;
      const blanket = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.1, 1.4), flatMat(0x3aa6a0));
      blanket.position.set(0, 0.56, -0.3);
      const pillow = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.14, 0.5), flatMat(0xffffff));
      pillow.position.set(0, 0.6, 0.8);
      bed.add(frame, mattress, blanket, pillow);
      add(bed, -ROOM_W / 2 + 1.6, -ROOM_D / 2 + 2.2);
      Game.interactables.push({
        pos: room.position.clone().add(new THREE.Vector3(-ROOM_W / 2 + 2.6, 0, -ROOM_D / 2 + 2.2)),
        radius: 2, label: 'Uxlash (ertalabgacha)',
        action: () => Game.actions.sleep && Game.actions.sleep(),
        onlyInside: 'home',
      });
      // desk with PC
      const desk = table(1.8, 0.9);
      add(desk, ROOM_W / 2 - 2, -ROOM_D / 2 + 1.6);
      const monitor = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.5, 0.06), flatMat(0x222831));
      monitor.position.set(ROOM_W / 2 - 2, 1.15, -ROOM_D / 2 + 1.4);
      const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.4),
        new THREE.MeshBasicMaterial({ color: 0x33ff88 }));
      screen.position.set(ROOM_W / 2 - 2, 1.15, -ROOM_D / 2 + 1.44);
      room.add(monitor, screen);
      add(chair(0x2f6fba), ROOM_W / 2 - 2, -ROOM_D / 2 + 2.6);
      Game.interactables.push({
        pos: room.position.clone().add(new THREE.Vector3(ROOM_W / 2 - 2, 0, -ROOM_D / 2 + 2.4)),
        radius: 2, label: 'Kompyuter (statistika / saqlash)',
        action: () => Game.actions.homePC && Game.actions.homePC(),
        onlyInside: 'home',
      });
      add(shelf(0x8a6a3a, false), -ROOM_W / 2 + 1.5, 3, Math.PI / 2);
      break;
    }
    case 'cafe': {
      for (const [tx, tz] of [[-4, -2], [0, -2.5], [4, -2], [-3.5, 2.5], [3.5, 2.5]]) {
        add(table(1.3, 1.3), tx, tz);
        add(chair(), tx - 1, tz, Math.PI / 2);
        add(chair(), tx + 1, tz, -Math.PI / 2);
      }
      // counter
      const counter = solid(new THREE.Mesh(new THREE.BoxGeometry(4.5, 1.05, 0.9), flatMat(0x7a4a2a)));
      counter.position.set(0, 0.52, -ROOM_D / 2 + 1.3);
      room.add(counter);
      // samovar
      const samovar = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.38, 0.7, 10), flatMat(0xc9a227));
      samovar.position.set(1.4, 1.4, -ROOM_D / 2 + 1.3);
      room.add(samovar);
      break;
    }
    case 'barber': {
      // barber chair + big mirror
      const bchair = chair(0xe05a4a);
      bchair.scale.setScalar(1.25);
      add(bchair, 0, -2, Math.PI);
      const mirror = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.6),
        new THREE.MeshBasicMaterial({ color: 0xbfe8f4 }));
      mirror.position.set(0, 1.7, -ROOM_D / 2 + 0.36);
      room.add(mirror);
      const mshelf = solid(new THREE.Mesh(new THREE.BoxGeometry(3, 0.9, 0.6), flatMat(0x5a7a9a)));
      mshelf.position.set(0, 0.45, -ROOM_D / 2 + 0.7);
      room.add(mshelf);
      add(chair(), -4, 3.5, Math.PI / 3);
      add(chair(), -3, 3.8, Math.PI / 2);
      break;
    }
    case 'shop': {
      add(shelf(0x5a7a5a), -4, -ROOM_D / 2 + 1.2);
      add(shelf(0x5a7a5a), 0, -ROOM_D / 2 + 1.2);
      add(shelf(0x5a7a5a), 4, -ROOM_D / 2 + 1.2);
      add(shelf(0x5a7a5a), -ROOM_W / 2 + 1.2, 1, Math.PI / 2);
      const counter = solid(new THREE.Mesh(new THREE.BoxGeometry(3, 1.05, 0.9), flatMat(0x4a6a4a)));
      counter.position.set(4, 0.52, 3);
      room.add(counter);
      break;
    }
    case 'library': {
      for (const x of [-5, -2.5, 2.5, 5]) add(shelf(0x7a5a3a), x, -ROOM_D / 2 + 1.2);
      add(table(2.2, 1.2), -2, 2);
      add(table(2.2, 1.2), 2.8, 2);
      add(chair(), -2, 3.2, Math.PI);
      add(chair(), 2.8, 3.2, Math.PI);
      // skill terminal
      const term = solid(new THREE.Mesh(new THREE.BoxGeometry(1, 1.6, 0.7), flatMat(0x30405c)));
      term.position.set(ROOM_W / 2 - 1.6, 0.8, -1);
      const tscreen = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.6),
        new THREE.MeshBasicMaterial({ color: 0x7b4dff }));
      tscreen.position.set(ROOM_W / 2 - 1.96, 1.1, -1);
      tscreen.rotation.y = -Math.PI / 2;
      room.add(term, tscreen);
      Game.interactables.push({
        pos: room.position.clone().add(new THREE.Vector3(ROOM_W / 2 - 2.4, 0, -1)),
        radius: 2, label: "Ko'nikmalar terminali",
        action: () => Game.actions.skillTree && Game.actions.skillTree(),
        onlyInside: 'library',
      });
      break;
    }
  }
}

export function enterInterior(id) {
  const it = Game.interiors[id];
  if (!it || Game.inside) return;
  if (Game.audio) Game.audio.sfx('door');
  Game.lastDoorPos = Game.player.pos().clone();
  Game.hud.fadeInOut(() => {
    Game.player.setScooter(false);
    Game.player.pos().copy(it.spawn);
    Game.inside = id;
    if (Game.audio) Game.audio.setRain(false);
    if (Game.onEnterInterior) Game.onEnterInterior(id);
  });
}

export function exitInterior() {
  if (!Game.inside) return;
  if (Game.audio) Game.audio.sfx('door');
  Game.hud.fadeInOut(() => {
    const back = Game.lastDoorPos || Game.homePos || new THREE.Vector3(0, 0.1, 20);
    Game.player.pos().set(back.x, 0.1, back.z);
    Game.inside = null;
    if (Game.audio) Game.audio.setRain(Game.weather === 'rain');
  });
}
