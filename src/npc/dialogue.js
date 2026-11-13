// Dialogue runtime: typewriter text, branching options, action dispatch.
import { Game } from '../core/state.js';
import { DIALOGUES } from '../data/dialogues.js';
import { exitPointerLock } from '../core/input.js';

const $ = (id) => document.getElementById(id);
let box, nameEl, textEl, optsEl;
let typeTimer = null;

export function initDialogue() {
  box = $('dialogue'); nameEl = $('dlgName'); textEl = $('dlgText'); optsEl = $('dlgOpts');
  Game.dialogue = { start: startDialogue, close: closeDialogue };
}

export function startDialogue(npcName, dialogueId, nodeId = 'start') {
  const tree = DIALOGUES[dialogueId];
  if (!tree) return;
  Game.mode = 'dialogue';
  exitPointerLock();
  box.classList.remove('hidden');
  nameEl.textContent = npcName;
  showNode(npcName, dialogueId, tree[nodeId] ? nodeId : 'start');
}

function showNode(npcName, dialogueId, nodeId) {
  const tree = DIALOGUES[dialogueId];
  const node = tree[nodeId];
  if (!node) { closeDialogue(); return; }

  // typewriter effect
  clearInterval(typeTimer);
  textEl.textContent = '';
  optsEl.innerHTML = '';
  let i = 0;
  typeTimer = setInterval(() => {
    i += 2;
    textEl.textContent = node.text.slice(0, i);
    if (Game.audio && i % 6 === 0) Game.audio.sfx('talk');
    if (i >= node.text.length) {
      clearInterval(typeTimer);
      renderOpts(npcName, dialogueId, node);
    }
  }, 16);

  // click text to skip typing
  textEl.onclick = () => {
    clearInterval(typeTimer);
    textEl.textContent = node.text;
    renderOpts(npcName, dialogueId, node);
  };
}

function renderOpts(npcName, dialogueId, node) {
  optsEl.innerHTML = '';
  for (const opt of node.opts) {
    const b = document.createElement('button');
    b.className = 'dlg-opt';
    b.textContent = opt.t;
    b.addEventListener('click', () => {
      if (Game.audio) Game.audio.sfx('ui');
      if (opt.action && Game.actions[opt.action]) {
        closeDialogue();
        Game.actions[opt.action](opt.arg);
        return;
      }
      if (opt.end) { closeDialogue(); return; }
      if (opt.next) showNode(npcName, dialogueId, opt.next);
    });
    optsEl.appendChild(b);
  }
}

export function closeDialogue() {
  clearInterval(typeTimer);
  box.classList.add('hidden');
  if (Game.mode === 'dialogue') Game.mode = 'play';
}
