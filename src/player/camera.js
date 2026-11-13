// Third-person orbit camera with smoothing and wheel zoom.
import * as THREE from 'three';
import { Game } from '../core/state.js';
import { Input } from '../core/input.js';
import { clamp, damp } from '../core/utils.js';

export function initCamera() {
  const rig = {
    yaw: Math.PI,       // behind player facing -z initially
    pitch: 0.32,        // elevation
    dist: 6,
    targetPos: new THREE.Vector3(),
  };
  Game.cameraRig = rig;
  return rig;
}

const desired = new THREE.Vector3();

export function updateCamera(rig, dt) {
  const cam = Game.three.camera;
  const P = Game.player;
  if (!P) return;

  if (Game.mode === 'play' || Game.mode === 'combat') {
    const m = Input.consumeMouse();
    const sens = 0.0023 * Game.settings.sensitivity;
    rig.yaw -= m.x * sens;
    rig.pitch = clamp(rig.pitch + m.y * sens, -0.25, 1.1);
    rig.dist = clamp(rig.dist + Input.consumeWheel() * 0.7, 3, 10);
  } else {
    Input.consumeMouse(); Input.consumeWheel();
  }

  const p = P.pos();
  rig.targetPos.lerp(new THREE.Vector3(p.x, p.y + 1.55, p.z), damp(10, dt));

  const cp = Math.cos(rig.pitch), sp = Math.sin(rig.pitch);
  desired.set(
    rig.targetPos.x + Math.sin(rig.yaw) * cp * rig.dist,
    rig.targetPos.y + sp * rig.dist,
    rig.targetPos.z + Math.cos(rig.yaw) * cp * rig.dist);

  // keep camera above ground
  desired.y = Math.max(desired.y, 0.6);

  cam.position.lerp(desired, damp(14, dt));
  cam.lookAt(rig.targetPos);
}
