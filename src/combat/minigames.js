// Mini-games: decrypt puzzle (boss/ransomware), phishing quiz (educational),
// password memory game (home PC).
import { Game } from '../core/state.js';
import { choice } from '../core/utils.js';
import { PHISH_MSGS } from '../data/commands.js';
import { exitPointerLock } from '../core/input.js';

const $ = (id) => document.getElementById(id);
let modal, titleEl, bodyEl;
let prevMode = 'play';

const CYBER_WORDS = ['xavfsizlik', 'parol', 'tarmoq', 'server', 'antivirus', 'dasturchi', 'internet', 'klaviatura'];

const SAFE_MSGS = [
  'Onam: Bolam, kechki ovqatga kelasanmi? Osh damlayapman 😊',
  "Do'stingiz Jasur: Ertaga futbol o'ynaymizmi? Soat 5da maydonda.",
  'Kutubxona: Olgan kitobingizni qaytarish muddati ertaga tugaydi.',
  "Ustoz: Darsga 10 daqiqa erta keling, yangi mavzu boshlaymiz.",
];

function openModal(title) {
  prevMode = Game.mode === 'combat' ? 'combat' : 'play';
  Game.mode = 'minigame';
  exitPointerLock();
  titleEl.textContent = title;
  bodyEl.innerHTML = '';
  modal.classList.remove('hidden');
}

function closeModal() {
  modal.classList.add('hidden');
  Game.mode = prevMode;
}

export function initMinigames() {
  modal = $('minigame'); titleEl = $('mgTitle'); bodyEl = $('mgBody');

  // ---- decrypt puzzle: unscramble a word under time pressure ----
  Game.actions.decryptPuzzle = (cb) => {
    openModal('🔐 SHIFRNI BUZING!');
    const word = choice(CYBER_WORDS);
    const scrambled = word.split('').sort(() => Math.random() - 0.5).join('');
    let timeLeft = 15;
    let finished = false;

    bodyEl.innerHTML = `
      <p>Harflar chalkashtirilgan. To'g'ri so'zni yozing:</p>
      <div class="mg-big">${scrambled.toUpperCase()}</div>
      <input id="mgInput" autocomplete="off" spellcheck="false" />
      <p style="text-align:center;margin-top:10px">⏱ <span id="mgTimer">15</span> soniya</p>`;
    const input = $('mgInput');
    setTimeout(() => input.focus(), 50);

    const finish = (ok) => {
      if (finished) return;
      finished = true;
      clearInterval(iv);
      closeModal();
      if (Game.audio) Game.audio.sfx(ok ? 'win' : 'error');
      cb(ok);
    };

    const iv = setInterval(() => {
      timeLeft--;
      const t = $('mgTimer');
      if (t) t.textContent = timeLeft;
      if (timeLeft <= 0) finish(false);
    }, 1000);

    input.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') {
        finish(input.value.trim().toLowerCase() === word);
      }
    });
  };

  // ---- phishing quiz (from the librarian) ----
  Game.actions.phishQuiz = () => {
    openModal('📩 Fishingni toping!');
    let roundN = 0, score = 0;

    const round = () => {
      roundN++;
      if (roundN > 3) {
        bodyEl.innerHTML = `<p style="text-align:center;font-size:16px">
          Natija: <b>${score}/3</b> to'g'ri!<br><br>
          ${score === 3 ? "🏅 A'lo! Sizni aldash qiyin ekan. +20 tanga" : score === 2 ? '👍 Yaxshi! +10 tanga' : '📖 Yana mashq qiling. +3 tanga'}<br><br>
          <i style="color:#8fa6cc">Eslatma: haqiqiy hayotda ham shaxsiy ma'lumot, parol va PIN kodni HECH KIMGA yubormang!</i></p>`;
        const btn = document.createElement('button');
        btn.className = 'mbtn small';
        btn.style.cssText = 'display:block;margin:12px auto 0';
        btn.textContent = 'Yopish';
        btn.addEventListener('click', closeModal);
        bodyEl.appendChild(btn);
        const coins = score === 3 ? 20 : score === 2 ? 10 : 3;
        Game.stats.coins += coins;
        if (Game.audio) Game.audio.sfx('coin');
        return;
      }
      const phish = choice(PHISH_MSGS);
      const safe = choice(SAFE_MSGS);
      const msgs = Math.random() < 0.5 ? [phish, safe] : [safe, phish];
      bodyEl.innerHTML = `<p>${roundN}/3: Qaysi xabar <b>FISHING</b> (firibgarlik)?</p>`;
      msgs.forEach((m) => {
        const b = document.createElement('button');
        b.className = 'mg-opt';
        b.textContent = m;
        b.addEventListener('click', () => {
          if (m === phish) {
            score++;
            Game.hud.toast("✔ To'g'ri topdingiz!", 'good');
          } else {
            Game.hud.toast('✖ Bu oddiy xabar edi!', 'bad');
          }
          round();
        });
        bodyEl.appendChild(b);
      });
    };
    round();
  };

  // ---- password memory game (home PC) ----
  Game.actions.passwordGame = () => {
    openModal('⌨ Parol mashqi');
    const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
    const len = 5 + Math.min(3, Math.floor(Game.stats.level / 2));
    let pwd = '';
    for (let i = 0; i < len; i++) pwd += chars[Math.floor(Math.random() * chars.length)];

    bodyEl.innerHTML = `
      <p>Parolni eslab qoling (3 soniya):</p>
      <div class="mg-big" id="mgPwd">${pwd}</div>`;

    setTimeout(() => {
      bodyEl.innerHTML = `
        <p>Endi parolni yozing:</p>
        <input id="mgInput" autocomplete="off" spellcheck="false" />`;
      const input = $('mgInput');
      input.focus();
      input.addEventListener('keydown', (e) => {
        e.stopPropagation();
        if (e.key === 'Enter') {
          const ok = input.value.trim() === pwd;
          const coins = ok ? 5 + len : 0;
          closeModal();
          if (ok) {
            Game.stats.coins += coins;
            Game.hud.toast(`✔ To'g'ri! +${coins} tanga`, 'good');
            if (Game.audio) Game.audio.sfx('coin');
          } else {
            Game.hud.toast(`✖ Noto'g'ri. Parol: ${pwd}`, 'bad');
          }
        }
      });
    }, 3000);
  };
}
