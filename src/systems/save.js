// Save / load via localStorage.
import { Game } from '../core/state.js';
import { HAIR_COLORS } from '../player/character.js';

const KEY = 'shahar-himoyachisi-save-v1';

export function initSave() {
  const S = {
    exists() {
      try { return !!localStorage.getItem(KEY); } catch { return false; }
    },

    save() {
      const p = Game.player.pos();
      const data = {
        v: 1,
        stats: Game.stats,
        settings: Game.settings,
        unlockedCommands: Game.unlockedCommands,
        skills: Game.skills,
        gear: Game.gear,
        hair: Game.hair,
        achievements: Game.achievements,
        quests: Game.quests.map((q) => ({ id: q.id, state: q.state, readyToTurnIn: q.readyToTurnIn })),
        day: Game.day,
        timeOfDay: Game.timeOfDay,
        missionCount: Game.missionCount,
        bossDefeated: Game.bossDefeated,
        tutorialDone: Game.tutorialDone,
        pos: { x: p.x, z: p.z },
        hackedLocs: Game.locations.filter((l) => l.hacked).map((l) => l.id),
      };
      try {
        localStorage.setItem(KEY, JSON.stringify(data));
      } catch { /* storage unavailable */ }
    },

    auto() {
      this.save();
    },

    // apply a saved game after the world is built
    load() {
      let data;
      try { data = JSON.parse(localStorage.getItem(KEY)); } catch { return false; }
      if (!data) return false;

      Object.assign(Game.stats, data.stats);
      Object.assign(Game.settings, data.settings);
      Game.unlockedCommands = data.unlockedCommands || Game.unlockedCommands;
      Game.skills = data.skills || [];
      Object.assign(Game.gear, data.gear);
      Object.assign(Game.hair, data.hair);
      Game.achievements = data.achievements || [];
      Game.day = data.day || 1;
      Game.timeOfDay = data.timeOfDay ?? 9;
      Game.missionCount = data.missionCount || 0;
      Game.bossDefeated = !!data.bossDefeated;
      Game.tutorialDone = !!data.tutorialDone;

      // quests: restore state; re-spawn pickup for an unfinished phone quest
      Game.quests = [];
      for (const q of data.quests || []) {
        if (q.state === 'active' && q.id === 'phone' && !q.readyToTurnIn) {
          Game.actions.startQuest('phone');
        } else if (q.state === 'active' && q.id === 'usb') {
          Game.actions.startQuest('usb');
        } else {
          Game.quests.push({ id: q.id, state: q.state, readyToTurnIn: q.readyToTurnIn });
        }
      }

      for (const id of data.hackedLocs || []) {
        const l = Game.locations.find((x) => x.id === id);
        if (l) l.hacked = true;
      }

      if (data.pos) Game.player.pos().set(data.pos.x, 0.1, data.pos.z);
      Game.inside = null;
      Game.player.setHair(Game.hair.style, HAIR_COLORS[Game.hair.color]);
      if (Game.audio) Game.audio.setVolume(Game.settings.volume);
      return true;
    },

    reset() {
      try { localStorage.removeItem(KEY); } catch { /* ignore */ }
    },
  };
  Game.save = S;
  return S;
}
