// Hacker-console command definitions. dmg scales with gear/combo in combat.js.
export const COMMANDS = [
  { cmd: 'nmap', dmg: 10, color: 0x33ddff, cd: 1.3, reveal: true, desc: 'skaner: yashirin xakerni ochadi' },
  { cmd: 'firewall --block', dmg: 4, color: 0xff9d3b, cd: 5, clears: true, desc: "barcha viruslarni yo'q qiladi" },
  { cmd: 'trace', dmg: 8, color: 0xffd34d, cd: 2.2, reveal: true, mark: true, desc: 'iz kuzatish: nishonni belgilaydi (krit +)' },
  { cmd: 'ban', dmg: 20, color: 0xff4455, cd: 3.2, desc: 'kuchli zarba' },
  { cmd: 'patch', dmg: 0, heal: 18, color: 0x33ff88, cd: 6, desc: 'tizimni yamash: HP +18' },
  { cmd: 'sudo shield', dmg: 0, shield: true, color: 0x9fe0ff, cd: 9, desc: 'himoya qalqoni' },
  { cmd: 'isolate', dmg: 6, stun: 2.5, color: 0x3b8cff, cd: 6, skill: 'isolate', desc: 'nishonni 2.5s muzlatadi' },
  { cmd: 'decrypt', dmg: 14, color: 0xb86bff, cd: 4, antiRansom: true, skill: 'decrypt', desc: 'shifrni ochadi (Ransomware x2.5)' },
  { cmd: 'kill -9', dmg: 34, color: 0xffeecc, cd: 8, skill: 'kill9', desc: 'juda kuchli zarba' },
  { cmd: 'emp', dmg: 18, area: true, color: 0x77aaff, cd: 10, skill: 'emp', desc: 'EMP portlash: hammaga zarar' },
  { cmd: 'freeze', dmg: 5, freeze: 4, color: 0x99eeff, cd: 12, skill: 'freeze', desc: 'hammani 4s sekinlashtiradi' },
  { cmd: 'chain', dmg: 16, chain: 3, color: 0xff66dd, cd: 7, skill: 'chain', desc: 'zanjir lazer: 3 nishonga sakraydi' },
];

export function findCommand(input) {
  const s = input.trim().toLowerCase().replace(/\s+/g, ' ');
  return COMMANDS.find((c) => c.cmd === s);
}

// fake phishing messages for the Phisher enemy + quiz
export const PHISH_MSGS = [
  "🎁 TABRIKLAYMIZ! Siz 10 000 000 so'm yutdingiz! Olish uchun havolani bosing: paylar-uz.xyz",
  "⚠ Bankingiz: kartangiz bloklandi! PIN kodingizni SMS qilib yuboring: 9999",
  "📦 Pochta: yetkazib berish uchun 5000 so'm to'lang: tez-pochta.click",
  "👑 Siz millioninchi foydalanuvchisiz! Sovg'angizni oling: super-sovga.win",
  "🔑 Hisobingiz buzildi! Parolni shu yerga yozing va tasdiqlang: xavfsiz-bank.net",
];
