// Combat terminal UI: input buffer, log, command hint chips, lock overlay.
import { Game } from '../core/state.js';
import { on } from '../core/events.js';
import { COMMANDS } from '../data/commands.js';

const $ = (id) => document.getElementById(id);
let root, logEl, hintsEl, inputEl, lockEl;
let buffer = '';

export function initTerminal() {
  root = $('terminal'); logEl = $('termLog'); hintsEl = $('termHints');
  inputEl = $('termInput'); lockEl = $('termLock');

  on('termKey', (e) => {
    if (Game.mode !== 'combat') return;
    if (e.code === 'Enter') {
      if (buffer.trim() && Game.combat) Game.combat.execute(buffer);
      buffer = '';
      render();
      e.preventDefault();
      return;
    }
    if (e.code === 'Backspace') {
      buffer = buffer.slice(0, -1);
      render();
      e.preventDefault();
      return;
    }
    if (e.key.length === 1 && /^[a-z0-9 \-/_.]$/i.test(e.key) && buffer.length < 40) {
      buffer += e.key.toLowerCase();
      if (Game.audio) Game.audio.sfx('key');
      render();
      if (e.code === 'Space') e.preventDefault();
    }
  });

  const T = {
    open() {
      buffer = '';
      logEl.innerHTML = '';
      root.classList.remove('hidden');
      render();
      T.log("Himoya terminali ishga tushdi. Buyruq yozing va Enter bosing.", 'sys');
      T.hints();
    },
    close() {
      root.classList.add('hidden');
      buffer = '';
    },
    log(msg, cls = '') {
      const d = document.createElement('div');
      if (cls) d.className = cls;
      d.textContent = msg;
      logEl.appendChild(d);
      while (logEl.children.length > 30) logEl.firstChild.remove();
      logEl.scrollTop = logEl.scrollHeight;
    },
    setLocked(v) {
      lockEl.classList.toggle('hidden', !v);
    },
    // called by mobile virtual keyboard
    submit(text) {
      if (Game.combat && text.trim()) Game.combat.execute(text);
    },
    hints(suggestion = null) {
      const showHints = Game.settings.hints && Game.settings.difficulty !== 'qiyin';
      hintsEl.innerHTML = '';
      if (!showHints) return;
      for (const c of COMMANDS) {
        if (!Game.unlockedCommands.includes(c.cmd)) continue;
        const chip = document.createElement('span');
        chip.className = 'hint-chip';
        const cd = Game.combat ? Game.combat.cooldownLeft(c.cmd) : 0;
        const star = suggestion === c.cmd ? '★ ' : '';
        chip.innerHTML = cd > 0 ? `${c.cmd} <b>${cd.toFixed(0)}s</b>` : `${star}<b>${c.cmd}</b>`;
        chip.style.opacity = cd > 0 ? 0.4 : 1;
        if (suggestion === c.cmd) chip.style.borderColor = '#ffd34d';
        chip.title = c.desc;
        chip.addEventListener('click', () => {
          buffer = c.cmd;
          render();
        });
        hintsEl.appendChild(chip);
      }
    },
  };

  function render() {
    inputEl.textContent = buffer;
  }

  Game.terminal = T;
  return T;
}
