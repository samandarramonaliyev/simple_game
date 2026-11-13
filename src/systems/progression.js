// XP, levels, coins, trust, achievements, daily challenge.
import { Game, xpNeeded } from '../core/state.js';
import { clamp } from '../core/utils.js';

export const ACHIEVEMENTS = [
  { id: 'firstwin', name: "Birinchi g'alaba", desc: 'Birinchi xakerni mag‘lub eting' },
  { id: 'wins5', name: 'Himoyachi', desc: '5 ta hujumni qaytaring' },
  { id: 'wins15', name: 'Shahar qalqoni', desc: '15 ta hujumni qaytaring' },
  { id: 'combo5', name: 'Kombo ustasi', desc: 'x1.75 kombo multiplikatoriga yeting' },
  { id: 'level5', name: 'Tajribali dasturchi', desc: '5-darajaga yeting' },
  { id: 'rich', name: 'Boy dasturchi', desc: '300 tanga yig‘ing' },
  { id: 'boss', name: 'Qora Shlyapa ovchisi', desc: 'Bosh xakerni mag‘lub eting' },
  { id: 'quests', name: 'Xalq xizmatida', desc: 'Barcha qo‘shimcha topshiriqlarni bajaring' },
  { id: 'scholar', name: 'Bilim izlovchi', desc: '4 ta yangi buyruq o‘rganing' },
];

export function initProgression() {
  const P = {
    reward(xp, coins, trust = 0) {
      // xp boost buffs
      for (const b of Game.buffs) if (b.data && b.data.xp) xp = Math.round(xp * b.data.xp);
      Game.stats.xp += xp;
      Game.stats.coins += coins;
      Game.stats.trust = clamp(Game.stats.trust + trust, 0, 100);
      this.checkLevel();

      // daily challenge: 3 wins in a day
      if (Game.dailyDone === 3) {
        Game.stats.coins += 40;
        Game.hud.toast('🎯 Kunlik vazifa bajarildi: 3 g‘alaba! +40 tanga', 'gold');
      }

      if (Game.stats.missionsWon >= 1) this.achieve('firstwin');
      if (Game.stats.missionsWon >= 5) this.achieve('wins5');
      if (Game.stats.missionsWon >= 15) this.achieve('wins15');
      if (Game.stats.bestCombo >= 5) this.achieve('combo5');
      if (Game.stats.coins >= 300) this.achieve('rich');
      if (Game.stats.trust < 25) {
        Game.hud.toast('⚠ Shahar ishonchi juda past! Hujumlarni qaytaring!', 'bad');
      }
    },

    checkLevel() {
      while (Game.stats.xp >= xpNeeded(Game.stats.level)) {
        Game.stats.xp -= xpNeeded(Game.stats.level);
        Game.stats.level++;
        Game.stats.skillPoints++;
        Game.stats.maxHp += 10;
        Game.stats.hp = Game.stats.maxHp;
        Game.hud.toast(`⬆ ${Game.stats.level}-daraja! +1 ko'nikma balli (kutubxonada sarflang)`, 'gold');
        if (Game.audio) Game.audio.sfx('levelup');
        if (Game.stats.level >= 5) this.achieve('level5');
      }
    },

    achieve(id) {
      if (Game.achievements.includes(id)) return;
      const a = ACHIEVEMENTS.find((x) => x.id === id);
      if (!a) return;
      Game.achievements.push(id);
      Game.hud.toast(`🏅 Yutuq: ${a.name}!`, 'gold');
      if (Game.audio) Game.audio.sfx('achieve');
    },
  };
  Game.progression = P;
  return P;
}
