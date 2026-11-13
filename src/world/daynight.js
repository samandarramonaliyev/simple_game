// Day/night cycle, sky + fog colors, sun, street lamps, windows, rain weather.
import * as THREE from 'three';
import { Game } from '../core/state.js';
import { lerp, clamp } from '../core/utils.js';
import { nightGlow } from './buildings.js';
import { lampMats, updateTrafficLights } from './props.js';

const DAY_LENGTH = 480; // real seconds per 24h in-game

let sun, hemi, moonAmb, rain, rainGeo;
const skyDay = new THREE.Color(0x87c5eb);
const skyDawn = new THREE.Color(0xf4a265);
const skyNight = new THREE.Color(0x0a1030);
const tmp = new THREE.Color();

export function initDayNight(scene) {
  hemi = new THREE.HemisphereLight(0xcfe8ff, 0x4a5a3a, 0.75);
  scene.add(hemi);

  sun = new THREE.DirectionalLight(0xfff2dd, 1.6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const sc = sun.shadow.camera;
  sc.left = -55; sc.right = 55; sc.top = 55; sc.bottom = -55;
  sc.near = 10; sc.far = 220;
  sun.shadow.bias = -0.0004;
  scene.add(sun, sun.target);

  moonAmb = new THREE.AmbientLight(0x3a4a7a, 0);
  scene.add(moonAmb);

  // rain particle streaks
  const N = 1200;
  rainGeo = new THREE.BufferGeometry();
  const pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 70;
    pos[i * 3 + 1] = Math.random() * 30;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 70;
  }
  rainGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  rain = new THREE.Points(rainGeo, new THREE.PointsMaterial({
    color: 0x9fc8e8, size: 0.12, transparent: true, opacity: 0.7,
  }));
  rain.visible = false;
  scene.add(rain);

  Game.nextWeatherCheck = 120;
}

// 0 = full night, 1 = full day
export function dayFactor() {
  const h = Game.timeOfDay;
  if (h >= 7 && h <= 18) return 1;
  if (h > 18 && h < 21) return 1 - (h - 18) / 3;
  if (h > 5 && h < 7) return (h - 5) / 2;
  return 0;
}

export function updateDayNight(dt, scene, playerPos) {
  // advance clock
  Game.timeOfDay += (dt * 24) / DAY_LENGTH;
  if (Game.timeOfDay >= 24) {
    Game.timeOfDay -= 24;
    Game.day += 1;
    Game.dailyDone = 0;
    if (Game.hud) Game.hud.toast(`${Game.day}-kun boshlandi!`, 'gold');
  }

  const f = dayFactor();
  const dawnMix = clamp(1 - Math.abs(f - 0.5) * 2, 0, 1); // peaks at transitions

  // sky & fog
  tmp.copy(skyNight).lerp(skyDay, f).lerp(skyDawn, dawnMix * 0.45);
  scene.background.copy(tmp);
  scene.fog.color.copy(tmp);
  scene.fog.near = Game.weather === 'rain' ? 35 : 70;
  scene.fog.far = Game.weather === 'rain' ? 160 : 300;

  // sun orbit (relative to player so shadows stay near)
  const ang = ((Game.timeOfDay - 6) / 12) * Math.PI; // sunrise 6h, sunset 18h
  const sx = Math.cos(ang) * 80, sy = Math.sin(ang) * 80;
  sun.position.set(playerPos.x + sx, Math.max(sy, 2), playerPos.z + 40);
  sun.target.position.set(playerPos.x, 0, playerPos.z);
  const rainDim = Game.weather === 'rain' ? 0.45 : 1;
  sun.intensity = lerp(0.02, 1.6, f) * rainDim;
  hemi.intensity = lerp(0.1, 0.8, f) * rainDim;
  moonAmb.intensity = lerp(0.5, 0, f);

  // lamps + windows glow at night
  const glow = 1 - f;
  for (const m of lampMats) m.emissiveIntensity = glow * 1.8;
  for (const m of nightGlow) m.emissiveIntensity = glow * 0.9;

  // decorations
  if (Game.barberPole) Game.barberPole.rotation.y += dt * 3;
  if (Game.policeBeacon) {
    Game.policeBeacon.material.color.setHex(
      Math.floor(Game.elapsed * 2) % 2 === 0 ? 0x3355ff : 0xff3344);
  }
  const trafficHacked = Game.mission && Game.mission.loc.id === 'traffic' && Game.mission.state !== 'won';
  updateTrafficLights(Game.elapsed, trafficHacked || isHacked('traffic'));

  // weather
  Game.nextWeatherCheck -= dt;
  if (Game.nextWeatherCheck <= 0) {
    Game.nextWeatherCheck = 150 + Math.random() * 150;
    const wasRain = Game.weather === 'rain';
    Game.weather = Math.random() < (wasRain ? 0.65 : 0.25) ? 'rain' : 'clear';
    if (Game.weather === 'rain' && !wasRain && Game.hud) Game.hud.toast("Yomg'ir boshlandi ☔");
    if (Game.audio) Game.audio.setRain(Game.weather === 'rain' && !Game.inside);
  }
  rain.visible = Game.weather === 'rain' && !Game.inside;
  if (rain.visible) {
    rain.position.set(playerPos.x, 0, playerPos.z);
    const p = rainGeo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      let y = p.getY(i) - dt * 24;
      if (y < 0) y = 28;
      p.setY(i, y);
    }
    p.needsUpdate = true;
  }
}

function isHacked(id) {
  const l = Game.locations.find((l) => l.id === id);
  return l ? l.hacked : false;
}

export function skipToMorning() {
  Game.timeOfDay = 7.5;
  Game.day += 1;
  Game.dailyDone = 0;
}
