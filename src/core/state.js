// Central game state singleton. Modules register themselves here (Game.audio,
// Game.hud, ...) so cross-module calls never create circular imports.
export const Game = {
  mode: 'loading', // loading | title | play | dialogue | combat | panel | minigame | pause | map
  paused: false,
  timeScale: 1,
  elapsed: 0,

  // world clock
  timeOfDay: 9.0, // hours, 0..24
  day: 1,
  weather: 'clear', // clear | rain

  // player progress
  stats: {
    hp: 100, maxHp: 100,
    shield: 0, maxShield: 50,
    level: 1, xp: 0,
    coins: 60,
    trust: 70,
    skillPoints: 0,
    missionsWon: 0, missionsFailed: 0,
    bestCombo: 0,
  },

  settings: {
    volume: 0.7,
    sensitivity: 1.0,
    quality: 'yuqori', // yuqori | past
    difficulty: 'orta', // oson | orta | qiyin
    hints: true,
  },

  // unlocks & gear
  unlockedCommands: ['nmap', 'firewall --block', 'trace', 'ban', 'patch', 'sudo shield'],
  skills: [],          // learned skill ids
  gear: { laptop: 0, keyboard: 0, shieldExt: 0, scooter: false },
  hair: { style: 0, color: 0 },
  buffs: [],           // { id, label, until, data }
  achievements: [],    // achievement ids
  quests: [],          // { id, state: 'active'|'done' }
  dailyDone: 0,        // missions won today (daily challenge)

  // world registries (filled by world modules)
  colliders: [],       // { box: THREE.Box3, cx, cz } static solids
  interactables: [],   // { pos: Vector3, radius, label, action, enabled? }
  locations: [],       // attackable city spots
  interiors: {},       // id -> interior def
  inside: null,        // interior id or null
  mission: null,
  missionCount: 0,
  bossDefeated: false,
  tutorialDone: false,

  three: {},           // renderer, scene, camera, composer...
  camShake: 0,

  // module refs (set during init)
  player: null, cameraRig: null, hud: null, audio: null, terminal: null,
  combat: null, missions: null, dialogue: null, minimapCtx: null,
};

export function setMode(m) {
  Game.mode = m;
}

export function xpNeeded(level) {
  return Math.round(80 * Math.pow(level, 1.35));
}

export const DIFF = {
  oson: { time: 130, enemyHp: 0.75, enemyDmg: 0.7, hints: true },
  orta: { time: 100, enemyHp: 1.0, enemyDmg: 1.0, hints: true },
  qiyin: { time: 75, enemyHp: 1.3, enemyDmg: 1.35, hints: false },
};

export function diff() {
  return DIFF[Game.settings.difficulty] || DIFF.orta;
}
