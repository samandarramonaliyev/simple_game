// Touch controls: virtual joystick, look-drag, action buttons, and a native
// input field for typing commands in combat (works as a Telegram Mini App too).
import { Game } from '../core/state.js';
import { Input } from '../core/input.js';
import { emit } from '../core/events.js';
import { isTouch } from '../core/utils.js';

const $ = (id) => document.getElementById(id);

export function initMobile() {
  if (!isTouch()) return { update() {} };

  const ui = $('mobileUI');
  ui.classList.remove('hidden');

  // ---- joystick ----
  const zone = $('joyZone');
  const knob = $('joyKnob');
  let joyId = null;
  const zoneRect = () => zone.getBoundingClientRect();

  zone.addEventListener('touchstart', (e) => {
    joyId = e.changedTouches[0].identifier;
    e.preventDefault();
  }, { passive: false });

  const joyMove = (e) => {
    for (const t of e.changedTouches) {
      if (t.identifier !== joyId) continue;
      const r = zoneRect();
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      let dx = (t.clientX - cx) / (r.width / 2);
      let dy = (t.clientY - cy) / (r.height / 2);
      const len = Math.hypot(dx, dy);
      if (len > 1) { dx /= len; dy /= len; }
      Input.joy.x = dx;
      Input.joy.y = -dy;
      knob.style.left = `${50 + dx * 32}%`;
      knob.style.top = `${50 + dy * 32}%`;
      e.preventDefault();
    }
  };
  zone.addEventListener('touchmove', joyMove, { passive: false });
  const joyEnd = (e) => {
    for (const t of e.changedTouches) {
      if (t.identifier !== joyId) continue;
      joyId = null;
      Input.joy.x = 0; Input.joy.y = 0;
      knob.style.left = '50%'; knob.style.top = '50%';
    }
  };
  zone.addEventListener('touchend', joyEnd);
  zone.addEventListener('touchcancel', joyEnd);

  // ---- camera look: drag anywhere on the canvas ----
  const canvas = Game.three.renderer.domElement;
  let lookId = null, lastX = 0, lastY = 0;
  canvas.addEventListener('touchstart', (e) => {
    const t = e.changedTouches[0];
    if (lookId === null) {
      lookId = t.identifier;
      lastX = t.clientX; lastY = t.clientY;
    }
  }, { passive: true });
  canvas.addEventListener('touchmove', (e) => {
    for (const t of e.changedTouches) {
      if (t.identifier !== lookId) continue;
      Input.lookDX += (t.clientX - lastX) * 2.4;
      Input.lookDY += (t.clientY - lastY) * 2.4;
      lastX = t.clientX; lastY = t.clientY;
    }
  }, { passive: true });
  const lookEnd = (e) => {
    for (const t of e.changedTouches) if (t.identifier === lookId) lookId = null;
  };
  canvas.addEventListener('touchend', lookEnd);
  canvas.addEventListener('touchcancel', lookEnd);

  // ---- buttons ----
  const press = (id, fn) => {
    $(id).addEventListener('touchstart', (e) => { e.preventDefault(); fn(); }, { passive: false });
  };
  press('mbJump', () => emit('jump'));
  press('mbAct', () => emit('interact'));
  press('mbMelee', () => emit('melee'));
  $('mbRun').addEventListener('touchstart', (e) => {
    e.preventDefault();
    Input.mobRun = !Input.mobRun;
    $('mbRun').style.background = Input.mobRun ? 'rgba(40,120,220,.8)' : 'rgba(12,30,60,.6)';
  }, { passive: false });

  // ---- combat command input ----
  const cmdInput = $('mobCmdInput');
  cmdInput.addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.key === 'Enter') {
      if (Game.terminal) Game.terminal.submit(cmdInput.value);
      cmdInput.value = '';
    }
  });

  return {
    update() {
      const inCombat = Game.mode === 'combat';
      cmdInput.classList.toggle('hidden', !inCombat);
    },
  };
}
