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
import { buildInteriors } from './world/interiors.js';
import { initInteract, updateInteract } from './systems/interact.js';
import { initDialogue } from './npc/dialogue.js';
import { spawnNpcs, updateNpcs } from './npc/npcs.js';
import { initMissions } from './systems/missions.js';
import { initTerminal } from './ui/terminal.js';
import { initCombat } from './combat/combat.js';
import { initProgression } from './systems/progression.js';
import { initPanels } from './ui/panels.js';
import { initQuests } from './systems/quests.js';
import { initMinigames } from './combat/minigames.js';
import { initAudio } from './systems/audio.js';
import { initSave } from './systems/save.js';
import { initMenus } from './ui/menus.js';
import { initMobile } from './ui/mobile.js';

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

  setLoad(85, 'Shahar jonlanmoqda...');
  await tick();
  initInteract();
  buildInteriors(scene);
  initDialogue();
  spawnNpcs(scene);
  const missions = initMissions(scene);
  initTerminal();
  const combat = initCombat();
  initProgression();
  initPanels();
  initQuests(scene);
  initMinigames();
  initAudio();
  initSave();
  const menus = initMenus();
  const mobile = initMobile();

  setLoad(100, 'Tayyor!');
  await tick();

  $('loading').classList.add('hidden');
  menus.showTitle();

  startLoop((dt) => {
    if (Game.mode === 'title') return;
    updatePlayer(player, dt);
    updateCamera(rig, dt);
    updateDayNight(dt, scene, player.pos());
    updateNpcs(dt);
    updateInteract();
    missions.update(dt);
    combat.update(dt);
    hud.update();
    updateMinimap();
    mobile.update();
  });
}

const tick = () => new Promise((r) => setTimeout(r, 30));

boot().catch((err) => {
  console.error(err);
  $('loadingText').textContent = 'Xatolik: ' + err.message;
});
