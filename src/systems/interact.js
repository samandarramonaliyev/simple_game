// Finds the nearest interactable, shows the E-prompt and dispatches actions.
import { Game } from '../core/state.js';
import { on } from '../core/events.js';

let current = null;

export function initInteract() {
  Game.actions = Game.actions || {};
  on('interact', () => {
    if (current && Game.mode === 'play') {
      if (Game.audio) Game.audio.sfx('ui');
      current.action();
    }
  });
}

export function updateInteract() {
  current = null;
  if (Game.mode !== 'play') {
    Game.hud.prompt(null);
    return;
  }
  const p = Game.player.pos();
  let best = null, bestD = Infinity;
  for (const it of Game.interactables) {
    if (it.enabled === false) continue;
    if (it.onlyInside && Game.inside !== it.onlyInside) continue;
    if (it.onlyOutside && Game.inside) continue;
    const d = p.distanceTo(it.pos);
    if (d < it.radius && d < bestD) { best = it; bestD = d; }
  }
  current = best;
  Game.hud.prompt(best ? `<b>E</b> — ${typeof best.label === 'function' ? best.label() : best.label}` : null);
}
