// Entry point: boot sequence and the main update loop.
import { initEngine, startLoop } from './core/engine.js';
import { Game } from './core/state.js';
import { initInput } from './core/input.js';
import { buildCity } from './world/city.js';
import { initDayNight, updateDayNight } from './world/daynight.js';
import { createPlayer, updatePlayer } from './player/player.js';
import { initCamera, updateCamera } from './player/camera.js';
import { initHud } from './ui/hud.js';
import { initMinimap, updateMinimap } from './ui/minimap.js';

const $ = (id) => document.getElementById(id);

function setLoad(pct, text) {
  $('loadingBar').style.width = `${pct}%`;
  if (text) $('loadingText').textContent = text;
}

async function boot() {
  setLoad(10, 'Dvigatel ishga tushmoqda...');
  const { scene, renderer } = initEngine($('app'));
  initInput(renderer.domElement);

  setLoad(35, 'Shahar qurilmoqda...');
  await tick();
  buildCity(scene);

  setLoad(60, 'Quyosh chiqmoqda...');
  await tick();
  initDayNight(scene);

  setLoad(75, 'Qahramon uyg‘onmoqda...');
  await tick();
  const player = createPlayer(scene);
  const rig = initCamera();
  const hud = initHud();
  initMinimap();

  setLoad(100, 'Tayyor!');
  await tick();

  $('loading').classList.add('hidden');
  hud.show();
  Game.mode = 'play';
  hud.toast('Xush kelibsiz! Harakat: WASD, kamera: sichqoncha', 'good');

  startLoop((dt) => {
    updatePlayer(player, dt);
    updateCamera(rig, dt);
    updateDayNight(dt, scene, player.pos());
    hud.update();
    updateMinimap();
  });
}

const tick = () => new Promise((r) => setTimeout(r, 30));

boot().catch((err) => {
  console.error(err);
  $('loadingText').textContent = 'Xatolik: ' + err.message;
});
