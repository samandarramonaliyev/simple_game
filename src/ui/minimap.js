// Minimap (corner canvas) + full-screen map overlay.
import { Game } from '../core/state.js';
import { on } from '../core/events.js';
import { CITY_HALF, blockColor, BLOCK } from '../world/city.js';

let mini, miniCtx, big, bigCtx, staticMap;
const MM = 200; // minimap canvas px

const locLabels = {
  cafe: 'Choyxona', cafe2: 'Kafe', bank: 'Bank', traffic: 'Svetofor', barber: 'Sartarosh',
  library: 'Kutubxona', hospital: 'Shifoxona', school: 'Maktab', bazaar: 'Bozor', shop: "Do'kon",
};

export function initMinimap() {
  mini = document.getElementById('minimap');
  miniCtx = mini.getContext('2d');
  big = document.getElementById('bigmap');
  bigCtx = big.getContext('2d');

  // pre-render static city map
  staticMap = document.createElement('canvas');
  staticMap.width = MM; staticMap.height = MM;
  const ctx = staticMap.getContext('2d');
  ctx.fillStyle = '#20242b';
  ctx.fillRect(0, 0, MM, MM);
  const scale = MM / (CITY_HALF * 2 + 20);
  const toMap = (x, z) => [(x + CITY_HALF + 10) * scale, (z + CITY_HALF + 10) * scale];
  for (const b of Game.mapBlocks) {
    const [mx, mz] = toMap(b.x - BLOCK / 2, b.z - BLOCK / 2);
    ctx.fillStyle = blockColor[b.type] || '#555';
    ctx.fillRect(mx, mz, BLOCK * scale, BLOCK * scale);
  }
  Game._mapScale = scale;
  Game._toMap = toMap;

  const overlay = document.getElementById('mapOverlay');
  on('toggleMap', () => {
    if (Game.mode === 'play') {
      Game.mode = 'map';
      overlay.classList.remove('hidden');
      drawBig();
    } else if (Game.mode === 'map') {
      Game.mode = 'play';
      overlay.classList.add('hidden');
    }
  });
}

export function updateMinimap() {
  if (!miniCtx || Game.inside) {
    if (Game.inside && miniCtx) {
      miniCtx.fillStyle = '#10141c';
      miniCtx.fillRect(0, 0, MM, MM);
      miniCtx.fillStyle = '#6cf7ff';
      miniCtx.font = '14px sans-serif';
      miniCtx.textAlign = 'center';
      miniCtx.fillText('Ichkarida', MM / 2, MM / 2);
    }
    return;
  }
  miniCtx.drawImage(staticMap, 0, 0);
  const toMap = Game._toMap;

  // mission waypoint
  if (Game.mission && Game.mission.state === 'travel') {
    const [wx, wz] = toMap(Game.mission.loc.pos.x, Game.mission.loc.pos.z);
    const pulse = 4 + Math.sin(Game.elapsed * 6) * 2;
    miniCtx.strokeStyle = '#ff4433';
    miniCtx.lineWidth = 2;
    miniCtx.beginPath();
    miniCtx.arc(wx, wz, pulse + 3, 0, Math.PI * 2);
    miniCtx.stroke();
    miniCtx.fillStyle = '#ff4433';
    miniCtx.beginPath();
    miniCtx.arc(wx, wz, 3, 0, Math.PI * 2);
    miniCtx.fill();
  }

  // quest markers
  if (Game.questMarkers) {
    for (const q of Game.questMarkers) {
      const [qx, qz] = toMap(q.x, q.z);
      miniCtx.fillStyle = '#ffd34d';
      miniCtx.beginPath();
      miniCtx.arc(qx, qz, 3, 0, Math.PI * 2);
      miniCtx.fill();
    }
  }

  // player arrow
  const p = Game.player.pos();
  const [px, pz] = toMap(p.x, p.z);
  const a = Game.player.facing;
  miniCtx.save();
  miniCtx.translate(px, pz);
  miniCtx.rotate(-a + Math.PI);
  miniCtx.fillStyle = '#6cf7ff';
  miniCtx.beginPath();
  miniCtx.moveTo(0, -6);
  miniCtx.lineTo(4, 5);
  miniCtx.lineTo(-4, 5);
  miniCtx.closePath();
  miniCtx.fill();
  miniCtx.restore();
}

function drawBig() {
  const S = big.width;
  bigCtx.imageSmoothingEnabled = false;
  bigCtx.drawImage(staticMap, 0, 0, S, S);
  const k = S / MM;
  const toMap = Game._toMap;

  bigCtx.font = 'bold 14px sans-serif';
  bigCtx.textAlign = 'center';
  for (const loc of Game.locations) {
    const [lx, lz] = toMap(loc.pos.x, loc.pos.z);
    bigCtx.fillStyle = loc.hacked ? '#ff4433' : '#cfe6ff';
    bigCtx.fillText(locLabels[loc.id] || loc.name, lx * k, lz * k - 6);
    bigCtx.fillStyle = loc.hacked ? '#ff4433' : '#3bb7ff';
    bigCtx.beginPath();
    bigCtx.arc(lx * k, lz * k, 4, 0, Math.PI * 2);
    bigCtx.fill();
  }
  // home
  if (Game.homePos) {
    const [hx, hz] = toMap(Game.homePos.x, Game.homePos.z);
    bigCtx.fillStyle = '#ffd34d';
    bigCtx.fillText('🏠 Uy', hx * k, hz * k);
  }
  // player
  const p = Game.player.pos();
  const [px, pz] = toMap(p.x, p.z);
  bigCtx.fillStyle = '#6cf7ff';
  bigCtx.beginPath();
  bigCtx.arc(px * k, pz * k, 6, 0, Math.PI * 2);
  bigCtx.fill();
  bigCtx.fillText('SIZ', px * k, pz * k - 10);
  // mission
  if (Game.mission && Game.mission.state === 'travel') {
    const [wx, wz] = toMap(Game.mission.loc.pos.x, Game.mission.loc.pos.z);
    bigCtx.strokeStyle = '#ff4433';
    bigCtx.lineWidth = 3;
    bigCtx.beginPath();
    bigCtx.arc(wx * k, wz * k, 12, 0, Math.PI * 2);
    bigCtx.stroke();
  }
}
