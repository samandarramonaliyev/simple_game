// Title screen, difficulty select, pause menu with tabs, settings.
import { Game } from '../core/state.js';
import { on, emit } from '../core/events.js';
import { applyQuality } from '../core/engine.js';
import { renderQuestLog } from '../systems/quests.js';
import { ACHIEVEMENTS } from '../systems/progression.js';
import { closePanel } from './panels.js';
import { exitPointerLock } from '../core/input.js';

const $ = (id) => document.getElementById(id);

export function initMenus() {
  const title = $('title');
  const pause = $('pauseMenu');
  const pauseBody = $('pauseBody');

  // ---------- title ----------
  const showTitle = () => {
    Game.mode = 'title';
    title.classList.remove('hidden');
    $('hud').classList.add('hidden');
    if (Game.save && Game.save.exists()) $('btnContinue').classList.remove('hidden');
  };

  const startPlay = (fresh) => {
    title.classList.add('hidden');
    $('diffRow').classList.add('hidden');
    $('helpPanel').classList.add('hidden');
    Game.hud.show();
    Game.mode = 'play';
    if (Game.audio) Game.audio.music('ambient');
    if (fresh) {
      Game.hud.toast('🏙 Shaharga xush kelibsiz! Atrofni aylaning, odamlar bilan gaplashing (E).', 'good');
      Game.hud.toast('📱 Tez orada birinchi xaker hujumi boshlanadi — tayyor turing!');
    } else {
      Game.hud.toast('✔ Saqlangan o‘yin yuklandi. Davom etamiz!', 'good');
    }
  };

  $('btnStart').addEventListener('click', () => {
    $('diffRow').classList.remove('hidden');
    if (Game.audio) Game.audio.sfx('ui');
  });
  for (const b of document.querySelectorAll('#diffRow [data-diff]')) {
    b.addEventListener('click', () => {
      Game.settings.difficulty = b.dataset.diff;
      if (Game.save) Game.save.reset();
      startPlay(true);
    });
  }
  $('btnContinue').addEventListener('click', () => {
    if (Game.save && Game.save.load()) startPlay(false);
    else startPlay(true);
  });
  $('btnHelp').addEventListener('click', () => {
    $('helpPanel').classList.toggle('hidden');
    if (Game.audio) Game.audio.sfx('ui');
  });
  $('btnHelpClose').addEventListener('click', () => $('helpPanel').classList.add('hidden'));
  $('btnTitleSettings').addEventListener('click', () => {
    openPause('sozlama', true);
  });

  // ---------- pause ----------
  let pauseFromTitle = false;

  function openPause(tab = 'davom', fromTitle = false) {
    pauseFromTitle = fromTitle;
    if (!fromTitle) {
      Game.paused = true;
      Game.mode = 'pause';
    }
    exitPointerLock();
    pause.classList.remove('hidden');
    selectTab(tab === 'davom' ? 'vazifa' : tab);
  }

  function closePause() {
    pause.classList.add('hidden');
    Game.paused = false;
    if (!pauseFromTitle && Game.mode === 'pause') {
      Game.mode = Game.combat && Game.combat.enemies.some((e) => e.alive) ? 'combat' : 'play';
    }
  }

  function selectTab(tab) {
    for (const b of pause.querySelectorAll('[data-tab]')) {
      b.classList.toggle('active', b.dataset.tab === tab);
    }
    if (tab === 'davom') { closePause(); return; }
    if (tab === 'xarita') {
      closePause();
      if (Game.mode === 'play') emit('toggleMap');
      return;
    }
    pauseBody.innerHTML = '';
    if (tab === 'vazifa') {
      pauseBody.innerHTML = renderQuestLog() + inventoryHtml();
    } else if (tab === 'yutuq') {
      pauseBody.innerHTML = '<h4>Yutuqlar</h4>' + ACHIEVEMENTS.map((a) => {
        const got = Game.achievements.includes(a.id);
        return `<span class="ach ${got ? 'got' : ''}" title="${a.desc}">${got ? '🏅' : '🔒'} ${a.name}</span>`;
      }).join('') + `<h4 style="margin-top:14px">Kunlik vazifa</h4>
        <p>Bugun 3 ta hujumni qaytaring (+40 tanga): <b>${Math.min(Game.dailyDone, 3)}/3</b></p>`;
    } else if (tab === 'sozlama') {
      renderSettings();
    } else if (tab === 'saqlash') {
      pauseBody.innerHTML = '<h4>Saqlash</h4><p>O‘yin jarayoni brauzer xotirasida saqlanadi.</p>';
      const b1 = document.createElement('button');
      b1.className = 'mbtn small';
      b1.textContent = '💾 Hozir saqlash';
      b1.addEventListener('click', () => {
        Game.save.save();
        Game.hud.toast('💾 Saqlandi!', 'good');
      });
      const b2 = document.createElement('button');
      b2.className = 'mbtn small';
      b2.style.marginLeft = '8px';
      b2.textContent = '🏠 Bosh menyu';
      b2.addEventListener('click', () => {
        Game.save.save();
        closePause();
        showTitle();
      });
      pauseBody.appendChild(b1);
      pauseBody.appendChild(b2);
    }
  }

  function inventoryHtml() {
    const g = Game.gear;
    const items = [];
    if (g.laptop > 0) items.push(`💻 Noutbuk ${g.laptop}-daraja`);
    if (g.keyboard > 0) items.push(`⌨ Klaviatura ${g.keyboard}-daraja`);
    if (g.shieldExt > 0) items.push(`🛡 Qalqon kengaytirgichi ${g.shieldExt}`);
    if (g.scooter) items.push('🛴 Skuter');
    let html = '<h4 style="margin-top:14px">Inventar</h4>';
    html += items.length
      ? items.map((i) => `<span class="ach got">${i}</span>`).join('')
      : '<p style="color:#7f96bd">Hali jihozlar yo‘q — do‘konga boring!</p>';
    html += `<h4 style="margin-top:14px">Buyruqlar</h4>` +
      Game.unlockedCommands.map((c) => `<span class="ach">${c}</span>`).join('');
    return html;
  }

  function renderSettings() {
    pauseBody.innerHTML = `
      <div class="set-row"><span>🔊 Ovoz balandligi</span>
        <input type="range" id="setVol" min="0" max="1" step="0.05" value="${Game.settings.volume}"></div>
      <div class="set-row"><span>🖱 Sichqoncha sezgirligi</span>
        <input type="range" id="setSens" min="0.3" max="2.5" step="0.1" value="${Game.settings.sensitivity}"></div>
      <div class="set-row"><span>🎨 Grafika sifati</span>
        <select id="setQual" style="padding:4px 8px;background:#0a1830;color:#cfe6ff;border:1px solid #2f6fba;border-radius:6px">
          <option value="yuqori" ${Game.settings.quality === 'yuqori' ? 'selected' : ''}>Yuqori (bloom + soyalar)</option>
          <option value="past" ${Game.settings.quality === 'past' ? 'selected' : ''}>Past (kuchsiz kompyuterlar)</option>
        </select></div>
      <div class="set-row"><span>💡 Buyruq maslahatlari</span>
        <input type="checkbox" id="setHints" ${Game.settings.hints ? 'checked' : ''}></div>
      <div class="set-row"><span>⚔ Qiyinlik</span><span>
        <button class="mbtn small ${Game.settings.difficulty === 'oson' ? 'active' : ''}" data-d="oson">Oson</button>
        <button class="mbtn small ${Game.settings.difficulty === 'orta' ? 'active' : ''}" data-d="orta">O'rta</button>
        <button class="mbtn small ${Game.settings.difficulty === 'qiyin' ? 'active' : ''}" data-d="qiyin">Qiyin</button>
      </span></div>`;
    $('setVol').addEventListener('input', (e) => Game.audio.setVolume(parseFloat(e.target.value)));
    $('setSens').addEventListener('input', (e) => { Game.settings.sensitivity = parseFloat(e.target.value); });
    $('setQual').addEventListener('change', (e) => {
      Game.settings.quality = e.target.value;
      applyQuality();
    });
    $('setHints').addEventListener('change', (e) => { Game.settings.hints = e.target.checked; });
    for (const b of pauseBody.querySelectorAll('[data-d]')) {
      b.addEventListener('click', () => {
        Game.settings.difficulty = b.dataset.d;
        Game.hud.toast(`Qiyinlik: ${b.textContent}`, 'good');
        renderSettings();
      });
    }
  }

  for (const b of pause.querySelectorAll('[data-tab]')) {
    b.addEventListener('click', () => {
      if (Game.audio) Game.audio.sfx('ui');
      selectTab(b.dataset.tab);
    });
  }

  // ---------- escape key routing ----------
  on('escape', () => {
    if (Game.mode === 'title' || Game.mode === 'minigame') return;
    if (!pause.classList.contains('hidden')) { closePause(); return; }
    if (Game.mode === 'panel') { closePanel(); return; }
    if (Game.mode === 'dialogue') { Game.dialogue.close(); return; }
    if (Game.mode === 'map') { emit('toggleMap'); return; }
    if (Game.mode === 'play' || Game.mode === 'combat') openPause();
  });

  return { showTitle };
}
