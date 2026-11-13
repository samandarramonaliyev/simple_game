// Procedural city: 7x7 block grid with roads between blocks, landmark buildings,
// props, colliders, mission locations and NPC sidewalk waypoints.
import * as THREE from 'three';
import { Game } from '../core/state.js';
import { cityRand } from '../core/utils.js';
import {
  makeHouse, makeApartment, makeMosque, makeBank, makeHospital, makeSchool,
  makeLibrary, makePolice, makeCafe, makeBarber, makeShop, makeHome, flatMat,
} from './buildings.js';
import {
  makeTree, makeLamp, makeBench, makeFountain, makeBusStop, makeStall, makeTrafficLight,
} from './props.js';

export const CELL = 38;
export const BLOCK = 30;
export const GRID = 7;
export const CITY_HALF = (GRID * CELL) / 2;

// Hand-authored block layout (z rows, x cols)
const LAYOUT = [
  ['park', 'apt', 'house', 'mosque', 'house', 'apt', 'park'],
  ['house', 'cafe', 'house', 'house', 'school', 'house', 'apt'],
  ['apt', 'house', 'bazaar', 'bank', 'house', 'library', 'house'],
  ['house', 'barber', 'plaza', 'home', 'shop', 'house', 'apt'],
  ['apt', 'house', 'hospital', 'cafe2', 'police', 'house', 'house'],
  ['house', 'apt', 'house', 'busstop', 'house', 'apt', 'house'],
  ['park', 'house', 'apt', 'house', 'house', 'house', 'park'],
];

export const blockColor = {
  park: '#2e5d33', house: '#7a6a4a', apt: '#5a6474', mosque: '#3aa6a0', school: '#b08a4a',
  bazaar: '#b05a3a', bank: '#4a5a8a', library: '#8a6a3a', barber: '#3a6a9a', plaza: '#4a4f58',
  home: '#c0a040', shop: '#3a7a3a', cafe: '#a0503a', cafe2: '#a0503a', hospital: '#9aa4b0',
  police: '#30405c', busstop: '#6a6a5a',
};

function blockCenter(gx, gz) {
  return { x: (gx - (GRID - 1) / 2) * CELL, z: (gz - (GRID - 1) / 2) * CELL };
}

function addColliders(group) {
  group.updateWorldMatrix(true, true);
  group.traverse((o) => {
    if (o.userData.solid) {
      const box = new THREE.Box3().setFromObject(o);
      Game.colliders.push({ box, cx: (box.min.x + box.max.x) / 2, cz: (box.min.z + box.max.z) / 2 });
    }
    if (o.userData.solidRadius) {
      const p = new THREE.Vector3();
      o.getWorldPosition(p);
      const r = o.userData.solidRadius;
      const box = new THREE.Box3(
        new THREE.Vector3(p.x - r, 0, p.z - r),
        new THREE.Vector3(p.x + r, 3, p.z + r));
      Game.colliders.push({ box, cx: p.x, cz: p.z });
    }
  });
}

function addLoc(id, name, x, z, extra = {}) {
  Game.locations.push({ id, name, pos: new THREE.Vector3(x, 0, z), hacked: false, ...extra });
}

export function buildCity(scene) {
  Game.colliders = [];
  Game.locations = [];
  Game.cityDoors = [];
  Game.npcPoints = [];
  Game.mapBlocks = [];
  const city = new THREE.Group();
  city.name = 'city';

  // ground = asphalt everywhere; blocks get raised sidewalk plates
  const groundSize = GRID * CELL + 60;
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(groundSize, groundSize),
    flatMat(0x3c4046));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  city.add(ground);

  // road center dashes (instanced)
  const dashGeo = new THREE.BoxGeometry(0.25, 0.02, 1.6);
  const dashMat = new THREE.MeshBasicMaterial({ color: 0xcfd4da });
  const dashes = [];
  for (let i = 0; i <= GRID; i++) {
    const line = (i - GRID / 2) * CELL; // road centerlines between blocks
    for (let t = -CITY_HALF; t < CITY_HALF; t += 5) {
      dashes.push([line, t, 0]);      // vertical road
      dashes.push([t, line, Math.PI / 2]); // horizontal road
    }
  }
  const dashInst = new THREE.InstancedMesh(dashGeo, dashMat, dashes.length);
  const dm = new THREE.Matrix4();
  dashes.forEach((d, i) => {
    dm.makeRotationY(d[2]);
    dm.setPosition(d[0], 0.02, d[1]);
    dashInst.setMatrixAt(i, dm);
  });
  city.add(dashInst);

  // instanced trees
  const treeSpots = [];

  for (let gz = 0; gz < GRID; gz++) {
    for (let gx = 0; gx < GRID; gx++) {
      const type = LAYOUT[gz][gx];
      const { x, z } = blockCenter(gx, gz);
      Game.mapBlocks.push({ x, z, type });

      // sidewalk plate
      const plate = new THREE.Mesh(
        new THREE.BoxGeometry(BLOCK + 3, 0.22, BLOCK + 3),
        flatMat(type === 'park' ? 0x5a8a4a : 0x8c8f94));
      plate.position.set(x, 0.1, z);
      plate.receiveShadow = true;
      city.add(plate);

      // NPC waypoints at block corners (on the sidewalk ring)
      const c = (BLOCK + 3) / 2 - 1;
      Game.npcPoints.push(
        new THREE.Vector3(x - c, 0, z - c), new THREE.Vector3(x + c, 0, z - c),
        new THREE.Vector3(x - c, 0, z + c), new THREE.Vector3(x + c, 0, z + c));

      // lamps at two opposite corners
      for (const [sx, sz] of [[-1, -1], [1, 1]]) {
        const lamp = makeLamp();
        lamp.position.set(x + sx * (BLOCK / 2 + 0.8), 0.2, z + sz * (BLOCK / 2 + 0.8));
        city.add(lamp);
      }

      buildBlock(city, type, x, z, treeSpots);
    }
  }

  // trees (instanced-ish: groups are cheap enough at this count, keep simple)
  for (const [tx, tz] of treeSpots) {
    const tree = makeTree();
    tree.position.set(tx, 0.2, tz);
    city.add(tree);
  }

  // traffic lights at the 4 corners of the central intersection (hackable)
  const tlOff = CELL / 2;
  const tlx = 0 - CELL / 2, tlz = 0 - CELL / 2; // intersection between plaza/home blocks
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const tl = makeTrafficLight();
    tl.position.set(tlx + sx * 5, 0, tlz + sz * 5);
    tl.rotation.y = Math.atan2(-sx, -sz);
    city.add(tl);
  }
  addLoc('traffic', 'Svetofor tizimi', tlx, tlz + 8);

  scene.add(city);
  addColliders(city);
  Game.cityGroup = city;
  return city;
}

function buildBlock(city, type, x, z, treeSpots) {
  const put = (group, ox = 0, oz = 0, ry = 0) => {
    group.position.set(x + ox, 0.2, z + oz);
    group.rotation.y = ry;
    city.add(group);
    return group;
  };

  switch (type) {
    case 'park': {
      put(makeFountain());
      for (let i = 0; i < 7; i++) {
        treeSpots.push([x + (cityRand() - 0.5) * BLOCK * 0.85, z + (cityRand() - 0.5) * BLOCK * 0.85]);
      }
      const b1 = makeBench(); put(b1, -5, 4, Math.PI / 6);
      const b2 = makeBench(); put(b2, 5, -4, -Math.PI / 2);
      break;
    }
    case 'plaza': {
      put(makeFountain());
      const b = makeBench(); put(b, 6, 6, Math.PI);
      const b2 = makeBench(); put(b2, -6, 6, 0);
      treeSpots.push([x - 9, z - 9], [x + 9, z - 9]);
      break;
    }
    case 'house': {
      const n = 1 + Math.floor(cityRand() * 2);
      for (let i = 0; i < n; i++) {
        const h = makeHouse(Math.floor(cityRand() * 4));
        const ox = n === 1 ? 0 : (i === 0 ? -7 : 7);
        put(h, ox, (cityRand() - 0.5) * 6);
      }
      treeSpots.push([x + (cityRand() - 0.5) * 20, z + 11]);
      break;
    }
    case 'apt': {
      put(makeApartment(), 0, -2);
      treeSpots.push([x - 10, z + 9], [x + 10, z + 9]);
      break;
    }
    case 'mosque': put(makeMosque()); break;
    case 'school': {
      put(makeSchool(), 0, -2);
      addLoc('school', 'Maktab serveri', x, z + 8);
      break;
    }
    case 'bazaar': {
      for (let i = 0; i < 5; i++) {
        const s = makeStall([0xe05a4a, 0xffd34d, 0x3aa6a0, 0xff9d3b, 0x7ab87a][i]);
        put(s, -9 + (i % 3) * 9, i < 3 ? -5 : 6, i < 3 ? 0 : Math.PI);
      }
      addLoc('bazaar', "Bozor to'lov terminali", x, z + 12);
      break;
    }
    case 'bank': {
      const b = put(makeBank(), 0, -2);
      addLoc('bank', 'Bank bankomati', x + 7, z + 6, { screen: b.userData.screen });
      break;
    }
    case 'library': {
      const b = put(makeLibrary(), 0, -2);
      addLoc('library', 'Kutubxona tizimi', x, z + 8);
      Game.cityDoors.push({ id: 'library', label: 'Kutubxonaga kirish', pos: posFront(b) });
      break;
    }
    case 'barber': {
      const b = put(makeBarber(), 0, -2);
      Game.barberPole = b.userData.spin;
      addLoc('barber', 'Sartaroshxona navbat tizimi', x, z + 7);
      Game.cityDoors.push({ id: 'barber', label: 'Sartaroshxonaga kirish', pos: posFront(b) });
      break;
    }
    case 'shop': {
      const b = put(makeShop(), 0, -2);
      addLoc('shop', "Do'kon kassa tizimi", x, z + 7);
      Game.cityDoors.push({ id: 'shop', label: "Do'konga kirish", pos: posFront(b) });
      break;
    }
    case 'home': {
      const b = put(makeHome(), 0, -2);
      Game.homePos = new THREE.Vector3(x, 0, z + 9);
      Game.cityDoors.push({ id: 'home', label: 'Uyga kirish', pos: posFront(b) });
      break;
    }
    case 'cafe': {
      const b = put(makeCafe('CHOYXONA'), 0, -2);
      addLoc('cafe', 'Choyxona Wi-Fi', x, z + 8);
      Game.cityDoors.push({ id: 'cafe', label: 'Choyxonaga kirish', pos: posFront(b) });
      break;
    }
    case 'cafe2': {
      put(makeCafe('KAFE "BAXT"'), 0, -2);
      addLoc('cafe2', 'Kafe "Baxt" Wi-Fi', x, z + 8);
      break;
    }
    case 'hospital': {
      put(makeHospital(), 0, -2);
      addLoc('hospital', 'Shifoxona bazasi', x, z + 8);
      break;
    }
    case 'police': {
      const b = put(makePolice(), 0, -2);
      Game.policeBeacon = b.userData.beacon;
      break;
    }
    case 'busstop': {
      const h = makeHouse(1); put(h, -7, -3);
      const bs = makeBusStop(); put(bs, 6, BLOCK / 2 - 1, Math.PI);
      Game.busStopPos = new THREE.Vector3(x + 6, 0, z + BLOCK / 2 - 1);
      break;
    }
  }
}

function posFront(buildingGroup) {
  // world position just in front of the building door (buildings face +z)
  const p = buildingGroup.position.clone();
  const d = buildingGroup.userData.doorLocal || new THREE.Vector3(0, 0, 4.5);
  p.add(d); p.y = 0;
  return p;
}

// cheap cylinder-vs-AABB collision, axis separated; returns corrected position
const PLAYER_R = 0.4;
export function collideMove(pos, dx, dz, radius = PLAYER_R) {
  let nx = pos.x + dx;
  if (hitsAny(nx, pos.z, pos.y, radius)) nx = pos.x;
  let nz = pos.z + dz;
  if (hitsAny(nx, nz, pos.y, radius)) nz = pos.z;
  return { x: nx, z: nz };
}

function hitsAny(x, z, y, r) {
  for (const c of Game.colliders) {
    if (Math.abs(x - c.cx) > 22 || Math.abs(z - c.cz) > 22) continue;
    const b = c.box;
    if (x > b.min.x - r && x < b.max.x + r &&
        z > b.min.z - r && z < b.max.z + r &&
        y < b.max.y - 0.1 && y + 1.7 > b.min.y) return true;
  }
  return false;
}
