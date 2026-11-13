// Keyboard / mouse / touch input. During combat the letter keys belong to the
// terminal, so movement switches to the arrow keys (documented in-game).
import { Game } from './state.js';
import { emit } from './events.js';

const keys = new Set();

export const Input = {
  mouseDX: 0, mouseDY: 0,
  wheel: 0,
  pointerLocked: false,
  joy: { x: 0, y: 0 },        // mobile joystick, -1..1
  lookDX: 0, lookDY: 0,       // mobile camera drag
  mobRun: false,

  isDown(code) { return keys.has(code); },

  consumeMouse() {
    const d = { x: this.mouseDX + this.lookDX, y: this.mouseDY + this.lookDY };
    this.mouseDX = 0; this.mouseDY = 0; this.lookDX = 0; this.lookDY = 0;
    return d;
  },

  consumeWheel() { const w = this.wheel; this.wheel = 0; return w; },

  moveVector() {
    let x = 0, y = 0;
    const typing = Game.mode === 'combat'; // letters reserved for the terminal
    if (!typing) {
      if (keys.has('KeyW')) y += 1;
      if (keys.has('KeyS')) y -= 1;
      if (keys.has('KeyA')) x -= 1;
      if (keys.has('KeyD')) x += 1;
    }
    if (keys.has('ArrowUp')) y += 1;
    if (keys.has('ArrowDown')) y -= 1;
    if (keys.has('ArrowLeft')) x -= 1;
    if (keys.has('ArrowRight')) x += 1;
    x += this.joy.x; y += this.joy.y;
    const len = Math.hypot(x, y);
    if (len > 1) { x /= len; y /= len; }
    return { x, y };
  },

  runHeld() {
    return keys.has('ShiftLeft') || keys.has('ShiftRight') || this.mobRun;
  },
};

export function initInput(canvas) {
  document.addEventListener('keydown', (e) => {
    if (e.repeat) {
      if (Game.mode === 'combat' && e.code === 'Backspace') emit('termKey', e);
      return;
    }
    keys.add(e.code);

    // combat typing gets first dibs on printable keys
    if (Game.mode === 'combat') {
      const printable = e.key.length === 1 || e.code === 'Backspace' || e.code === 'Enter';
      if (printable) { emit('termKey', e); }
      if (e.code === 'Space') e.preventDefault();
    }

    switch (e.code) {
      case 'KeyE': if (Game.mode === 'play') emit('interact'); break;
      case 'Space':
        // in combat, space belongs to the terminal (commands contain spaces)
        if (Game.mode === 'play') { emit('jump'); e.preventDefault(); }
        break;
      case 'KeyJ': if (Game.mode === 'play') emit('melee'); break;
      case 'ControlLeft': case 'ControlRight':
        if (Game.mode === 'play' || Game.mode === 'combat') { emit('dodge'); e.preventDefault(); }
        break;
      case 'KeyR': if (Game.mode === 'play') emit('scooter'); break;
      case 'KeyM': if (Game.mode === 'play' || Game.mode === 'map') emit('toggleMap'); break;
      case 'Escape': emit('escape'); break;
      case 'Tab': e.preventDefault(); break;
    }
  });

  document.addEventListener('keyup', (e) => keys.delete(e.code));
  window.addEventListener('blur', () => keys.clear());

  canvas.addEventListener('click', () => {
    if ((Game.mode === 'play' || Game.mode === 'combat') && !Input.pointerLocked && !('ontouchstart' in window)) {
      canvas.requestPointerLock();
    }
    if (Game.mode === 'play' || Game.mode === 'combat') emit('melee');
  });

  document.addEventListener('pointerlockchange', () => {
    Input.pointerLocked = document.pointerLockElement === canvas;
  });

  document.addEventListener('mousemove', (e) => {
    if (Input.pointerLocked) {
      Input.mouseDX += e.movementX;
      Input.mouseDY += e.movementY;
    }
  });

  document.addEventListener('wheel', (e) => { Input.wheel += Math.sign(e.deltaY); }, { passive: true });
}

export function exitPointerLock() {
  if (document.pointerLockElement) document.exitPointerLock();
}
