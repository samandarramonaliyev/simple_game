// Procedural low-poly building factories. Every mesh flagged userData.solid
// becomes a collider. Window planes are registered for night-time emissive glow.
import * as THREE from 'three';
import { cityRand } from '../core/utils.js';

export const nightGlow = []; // materials whose emissiveIntensity toggles at night

const mats = new Map();
export function flatMat(color, opts = {}) {
  const key = color + JSON.stringify(opts);
  if (!mats.has(key)) {
    mats.set(key, new THREE.MeshLambertMaterial({ color, ...opts }));
  }
  return mats.get(key);
}

export function textTexture(text, { fg = '#fffbe8', bg = 'rgba(10,20,40,0.92)', size = 46, w = 512, h = 96 } = {}) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = fg; ctx.lineWidth = 4; ctx.strokeRect(4, 4, w - 8, h - 8);
  ctx.fillStyle = fg;
  ctx.font = `bold ${size}px 'Segoe UI', sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, w / 2, h / 2 + 2);
  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 4;
  return tex;
}

export function makeSign(text, width = 6) {
  const tex = textTexture(text);
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: false });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(width, width * 96 / 512), mat);
  return m;
}

// transparent plane with a window grid; glows at night
function windowPlane(w, h, cols, rows, litColor = '#ffd98a') {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 256;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, 256, 256);
  const cw = 256 / cols, ch = 256 / rows;
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      ctx.fillStyle = cityRand() < 0.72 ? litColor : '#30405c';
      ctx.fillRect(i * cw + cw * 0.22, j * ch + ch * 0.22, cw * 0.56, ch * 0.56);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  const mat = new THREE.MeshLambertMaterial({
    map: tex, transparent: true, emissive: 0xffc966, emissiveMap: tex, emissiveIntensity: 0,
  });
  nightGlow.push(mat);
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  return mesh;
}

function doorMesh(w = 1.3, h = 2.2, color = 0x5a3b22) {
  const g = new THREE.Group();
  const frame = new THREE.Mesh(new THREE.BoxGeometry(w + 0.3, h + 0.15, 0.12), flatMat(0x3b2a18));
  const door = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.14), flatMat(color));
  frame.position.y = h / 2; door.position.y = h / 2; door.position.z = 0.02;
  g.add(frame, door);
  return g;
}

function solid(mesh) { mesh.userData.solid = true; mesh.castShadow = true; mesh.receiveShadow = true; return mesh; }

// Generic box building with roof, windows on front/back, door and optional sign.
export function makeBuilding({
  w = 10, d = 9, h = 7, color = 0xd8c6a2, roofColor = 0x9c5a3c,
  sign = null, signColor, flatRoof = false, winCols = 3, winRows = 2, hasDoor = true,
}) {
  const g = new THREE.Group();
  const body = solid(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), flatMat(color)));
  body.position.y = h / 2;
  g.add(body);

  if (flatRoof) {
    const roof = new THREE.Mesh(new THREE.BoxGeometry(w + 0.5, 0.4, d + 0.5), flatMat(roofColor));
    roof.position.y = h + 0.2; roof.castShadow = true;
    g.add(roof);
  } else {
    const roof = new THREE.Mesh(new THREE.ConeGeometry(Math.max(w, d) * 0.72, h * 0.42, 4), flatMat(roofColor));
    roof.position.y = h + h * 0.21;
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    g.add(roof);
  }

  // windows front + back
  for (const s of [1, -1]) {
    const wp = windowPlane(w * 0.8, h * 0.52, winCols, winRows);
    wp.position.set(0, h * 0.58, s * (d / 2 + 0.03));
    if (s < 0) wp.rotation.y = Math.PI;
    g.add(wp);
  }

  if (hasDoor) {
    const dm = doorMesh();
    dm.position.set(0, 0, d / 2 + 0.05);
    g.add(dm);
    g.userData.doorLocal = new THREE.Vector3(0, 0, d / 2 + 1.2);
  }

  if (sign) {
    const s = makeSign(sign, Math.min(w * 0.85, 7));
    s.position.set(0, h + (flatRoof ? 1.1 : h * 0.1), d / 2 + 0.08);
    g.add(s);
    if (signColor) s.material.color = new THREE.Color(signColor);
  }
  return g;
}

export function makeHouse(variant = 0) {
  const palettes = [
    [0xe8d9b8, 0xa05a38], [0xd9c08f, 0x8a4a3a], [0xcfd8d0, 0x6a7a8a], [0xe2cfa8, 0x7a5a3a],
  ];
  const [c, r] = palettes[variant % palettes.length];
  const w = 6.5 + cityRand() * 2, d = 6 + cityRand() * 2, h = 3.6 + cityRand() * 1.2;
  const g = makeBuilding({ w, d, h, color: c, roofColor: r, winCols: 2, winRows: 1 });
  // small courtyard wall (uzbek hovli style)
  const wall = new THREE.Mesh(new THREE.BoxGeometry(w + 4, 1.1, 0.3), flatMat(0xcbb389));
  wall.position.set(0, 0.55, d / 2 + 3.4);
  wall.castShadow = true;
  g.add(wall);
  return g;
}

export function makeApartment() {
  const h = 14 + cityRand() * 8;
  const g = makeBuilding({
    w: 11, d: 9, h, color: 0xbfc8d4, roofColor: 0x707a88, flatRoof: true,
    winCols: 4, winRows: Math.round(h / 3), hasDoor: true,
  });
  return g;
}

export function makeMosque() {
  const g = new THREE.Group();
  const base = solid(new THREE.Mesh(new THREE.BoxGeometry(13, 6, 11), flatMat(0xeae2cf)));
  base.position.y = 3;
  g.add(base);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(4.6, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2), flatMat(0x3aa6a0));
  dome.position.y = 6; dome.castShadow = true;
  g.add(dome);
  for (const sx of [-1, 1]) {
    const minaret = solid(new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.9, 13, 8), flatMat(0xe0d6bd)));
    minaret.position.set(sx * 7.6, 6.5, 3.5);
    g.add(minaret);
    const top = new THREE.Mesh(new THREE.ConeGeometry(1.1, 1.8, 8), flatMat(0x3aa6a0));
    top.position.set(sx * 7.6, 13.9, 3.5); top.castShadow = true;
    g.add(top);
  }
  const arch = doorMesh(2, 3.4, 0x2a5a58);
  arch.position.set(0, 0, 5.6);
  g.add(arch);
  return g;
}

export function makeBank() {
  const g = makeBuilding({ w: 12, d: 10, h: 9, color: 0xd9dde4, roofColor: 0x4a5668, flatRoof: true, sign: '🏦 BANK', winCols: 4, winRows: 3 });
  for (const sx of [-1, 0, 1]) {
    const col = solid(new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 6.5, 8), flatMat(0xf0f0ea)));
    col.position.set(sx * 3.4, 3.25, 5.4);
    g.add(col);
  }
  // ATM box outside (mission target visual)
  const atm = solid(new THREE.Mesh(new THREE.BoxGeometry(1.2, 2, 0.9), flatMat(0x2f6fba)));
  atm.position.set(7.2, 1, 5.2);
  g.add(atm);
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.6),
    new THREE.MeshBasicMaterial({ color: 0x6cf7ff }));
  scr.position.set(7.2, 1.35, 5.66);
  g.add(scr);
  g.userData.screen = scr;
  return g;
}

export function makeHospital() {
  const g = makeBuilding({ w: 14, d: 11, h: 11, color: 0xf0f4f2, roofColor: 0x8a94a0, flatRoof: true, sign: 'SHIFOXONA', winCols: 5, winRows: 4 });
  const cross = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.7, 0.2), new THREE.MeshBasicMaterial({ color: 0xff4444 }));
  const cross2 = new THREE.Mesh(new THREE.BoxGeometry(0.7, 2.2, 0.2), new THREE.MeshBasicMaterial({ color: 0xff4444 }));
  cross.position.set(0, 8.6, 5.65); cross2.position.set(0, 8.6, 5.65);
  g.add(cross, cross2);
  return g;
}

export function makeSchool() {
  return makeBuilding({ w: 15, d: 10, h: 7, color: 0xf2dcae, roofColor: 0x8a5a3a, flatRoof: true, sign: 'MAKTAB', winCols: 6, winRows: 2 });
}

export function makeLibrary() {
  const g = makeBuilding({ w: 12, d: 10, h: 7.5, color: 0xd8c6a2, roofColor: 0x6a4a2a, sign: 'KUTUBXONA', winCols: 4, winRows: 2 });
  return g;
}

export function makePolice() {
  const g = makeBuilding({ w: 11, d: 9, h: 7, color: 0xc2cbd8, roofColor: 0x3a4454, flatRoof: true, sign: 'POLITSIYA', winCols: 4, winRows: 2 });
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 6), new THREE.MeshBasicMaterial({ color: 0x3355ff }));
  beacon.position.set(0, 8, 0);
  g.add(beacon);
  g.userData.beacon = beacon;
  return g;
}

export function makeCafe(name = 'CHOYXONA') {
  const g = makeBuilding({ w: 9, d: 8, h: 4.6, color: 0xc96a4a, roofColor: 0x7a3a2a, sign: name, winCols: 3, winRows: 1 });
  // terrace tables
  for (const sx of [-1, 1]) {
    const table = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.1, 10), flatMat(0xdeb887));
    table.position.set(sx * 3, 0.8, 6.2);
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.8, 6), flatMat(0x6a4a2a));
    leg.position.set(sx * 3, 0.4, 6.2);
    const umb = new THREE.Mesh(new THREE.ConeGeometry(1.4, 0.6, 8), flatMat(sx > 0 ? 0xe05a4a : 0x3aa6a0));
    umb.position.set(sx * 3, 2.2, 6.2);
    umb.castShadow = true;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.6, 5), flatMat(0x888888));
    pole.position.set(sx * 3, 1.4, 6.2);
    g.add(table, leg, umb, pole);
  }
  return g;
}

export function makeBarber() {
  const g = makeBuilding({ w: 8, d: 7, h: 4.2, color: 0x6a9ac9, roofColor: 0x3a5a7a, sign: 'SARTAROSHXONA', winCols: 2, winRows: 1 });
  // spinning barber pole
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 1.6, 10),
    new THREE.MeshBasicMaterial({ color: 0xff6b6b }));
  pole.position.set(2.6, 2.6, 3.65);
  g.add(pole);
  g.userData.spin = pole;
  return g;
}

export function makeShop() {
  return makeBuilding({ w: 9, d: 8, h: 4.8, color: 0x7ab87a, roofColor: 0x3a6a3a, sign: "DO'KON · GADJETLAR", winCols: 3, winRows: 1 });
}

export function makeHome() {
  const g = makeBuilding({ w: 7.5, d: 7, h: 4.4, color: 0xf0e0b8, roofColor: 0xb06a3a, sign: 'MENING UYIM', winCols: 2, winRows: 1 });
  return g;
}
