// All NPC dialogue trees. UI text in Uzbek (Latin). Node format:
// { text, opts: [{ t, next?, action?, arg?, end? }] }
export const DIALOGUES = {
  // ---- generic citizens (hints & gossip) ----
  citizen1: {
    start: {
      text: "Assalomu alaykum, uka! Eshitdingizmi? Kecha bankomatni xakerlar buzmoqchi bo'libdi. Yaxshiyamki, kimdir to'xtatibdi...",
      opts: [
        { t: "Bu men edim! 😎", next: "wow" },
        { t: "Xakerlar haqida nima bilasiz?", next: "hint" },
        { t: "Xayr, yaxshi kun!", end: true },
      ],
    },
    wow: {
      text: "Rostdanmi?! Barakalla! Shahar sizday yigitlar bilan faxrlanadi. Mana, choyxonada bir piyola choy mendan!",
      opts: [{ t: "Rahmat!", end: true }],
    },
    hint: {
      text: "Ular avval zaif tizimlarni qidirisharkan. 'nmap' degan buyruq bilan skaner qilsangiz, yashiringan xakerni ham topish mumkin deyishadi.",
      opts: [{ t: "Foydali maslahat, rahmat!", end: true }],
    },
  },
  citizen2: {
    start: {
      text: "Voy-bo', internetim yana uzilib qoldi! Bu xakerlar dastidan tinchlik yo'q. Siz dasturchimisiz?",
      opts: [
        { t: "Ha, shaharni himoya qilaman", next: "resp" },
        { t: "Yo'q, shunchaki sayr qilyapman", end: true },
      ],
    },
    resp: {
      text: "Unda sizga maslahat: jang paytida tez va xatosiz yozing! Qancha tez yozsangiz, 'kombo' shuncha oshadi. Katta kombo — kuchli lazer!",
      opts: [{ t: "Esda tutaman!", end: true }],
    },
  },
  citizen3: {
    start: {
      text: "Nevaram ham sizga o'xshab kompyuterchi. 'Sudo shield' degan narsani o'rgatdi menga. Nima o'zi bu?",
      opts: [
        { t: "Bu himoya qalqoni, jang paytida yozing", next: "ok" },
        { t: "Bilmayman, xayr", end: true },
      ],
    },
    ok: {
      text: "Qalqon? Zo'r-ku! Siz ham ishlating, bolam. Sog' bo'ling!",
      opts: [{ t: "Rahmat, siz ham!", end: true }],
    },
  },
  citizen4: {
    start: {
      text: "Kecha kutubxonada yangi buyruqlar kursini ochishibdi deyishdi. Ko'nikma ballaringiz bo'lsa, yangi lazer buyruqlarini o'rganish mumkin ekan!",
      opts: [
        { t: "Kutubxona qayerda?", next: "where" },
        { t: "Albatta boraman!", end: true },
      ],
    },
    where: {
      text: "Shimoli-sharq tomonda, 'KUTUBXONA' yozuvi bor katta bino. Xaritada (M) ham ko'rinadi.",
      opts: [{ t: "Rahmat!", end: true }],
    },
  },
  citizen5: {
    start: {
      text: "Hormang! Do'kondan skuter sotib oldingizmi? Hujum joyiga yugurib borguncha, skuterda uchib borasiz-da!",
      opts: [
        { t: "Yaxshi fikr!", end: true },
        { t: "Pulim yetmaydi hali...", next: "poor" },
      ],
    },
    poor: {
      text: "Xakerlarni yengsangiz tanga beradi. Yig'ib boring, uka. Mehnat — rohat!",
      opts: [{ t: "To'g'ri aytasiz", end: true }],
    },
  },
  // ---- quest givers ----
  quest_phone: {
    start: {
      text: "Voy dod! Telefonimni parkda yo'qotib qo'ydim. Ichida nevaralarimning rasmlari bor edi... Topib bera olasizmi?",
      opts: [
        { t: "Albatta topaman, xola!", action: "startQuest", arg: "phone", end: true },
        { t: "Hozir vaqtim yo'q", end: true },
      ],
    },
    active: {
      text: "Telefonim parkda, favvora atrofida tushib qolgan bo'lsa kerak. Sariq nuqta xaritada ko'rinadi.",
      opts: [{ t: "Qidiryapman", end: true }],
    },
    done: {
      text: "Telefonim! Rasmlar joyida! Katta rahmat, bolam! Mana sizga ozgina suyunchi.",
      opts: [{ t: "Arzimaydi!", action: "finishQuest", arg: "phone", end: true }],
    },
    after: {
      text: "Yana bir bor rahmat, bolam! Omadingizni bersin!",
      opts: [{ t: "Rahmat, xola!", end: true }],
    },
  },
  quest_usb: {
    start: {
      text: "Uka, muhim iltimos: mana bu USB-fleshkada maktab hujjatlari bor. Kutubxonachiga yetkazib bera olasizmi? Tezroq bo'lsa yaxshi edi.",
      opts: [
        { t: "Bo'ladi, hozir olib boraman", action: "startQuest", arg: "usb", end: true },
        { t: "Keyinroq", end: true },
      ],
    },
    active: {
      text: "USB kutubxonachiga berilishi kerak. Kutubxona ichida uni toping.",
      opts: [{ t: "Yo'ldaman", end: true }],
    },
    after: {
      text: "Hujjatlar yetib boribdi, rahmat! Sizga omad!",
      opts: [{ t: "Arzimaydi", end: true }],
    },
  },
  quest_wifi: {
    start: {
      text: "Kafemiz Wi-Fi'si juda sekin ishlayapti. Menimcha, kimdir tarmoqqa yashirin ulanib olgan... Tekshirib bera olasizmi?",
      opts: [
        { t: "Hozir tekshiraman", action: "startQuest", arg: "wifi", end: true },
        { t: "Band man hozir", end: true },
      ],
    },
    active: {
      text: "Tarmoqda g'alati harakat bor. Xaker yaqin atrofda bo'lishi kerak!",
      opts: [{ t: "Topaman uni", end: true }],
    },
    after: {
      text: "Wi-Fi yana uchyapti! Mijozlar xursand. Rahmat, do'stim!",
      opts: [{ t: "Doim xizmatdamiz", end: true }],
    },
  },
  quest_usb_turnin: {
    start: {
      text: "Bu maktabning hujjatlarimi? Juda yaxshi, rahmat! Muallim Anvarga salom ayting. Mana sizga minnatdorchilik.",
      opts: [{ t: "Marhamat!", action: "finishQuest", arg: "usb", end: true }],
    },
  },
  // ---- service NPCs ----
  barber_npc: {
    start: {
      text: "Keling, keling! Yangi soch turmagi kerakmi? Zamonaviy 'dasturchi' uslubi ham bor! Atigi 10 tanga.",
      opts: [
        { t: "Soch turmagini o'zgartirish (10 tanga)", action: "openBarber", end: true },
        { t: "Yangiliklar nima?", next: "gossip" },
        { t: "Keyinroq kelaman", end: true },
      ],
    },
    gossip: {
      text: "Eshitishimcha, 'Qora Shlyapa' degan bosh xaker shaharga ko'z tikkan emish. Hamma kichik hujumlar — uning sinovi deyishadi. Ehtiyot bo'ling!",
      opts: [
        { t: "Men unga ko'rsatib qo'yaman!", end: true },
        { t: "Soch turmagini o'zgartirish (10 tanga)", action: "openBarber", end: true },
      ],
    },
  },
  shop_npc: {
    start: {
      text: "Xush kelibsiz! Eng zo'r gadjetlar bizda: tezkor noutbuklar, mexanik klaviaturalar, hatto skuter ham bor!",
      opts: [
        { t: "Do'konni ko'rish", action: "openShop", end: true },
        { t: "Narxlar qanday?", next: "prices" },
        { t: "Shunchaki qarayapman", end: true },
      ],
    },
    prices: {
      text: "Sifatli mol arzon bo'lmaydi, uka! Lekin xakerlardan tushgan tangalaringizga arziydi. Qarang, tanlang!",
      opts: [
        { t: "Do'konni ko'rish", action: "openShop", end: true },
        { t: "Xayr", end: true },
      ],
    },
  },
  cafe_npc: {
    start: {
      text: "Keling, mehmon! Issiqqina choy, yangi samsa bor. Dasturchilarga maxsus 'kod-kofe' ham damlaymiz — tezlik beradi!",
      opts: [
        { t: "Menyuni ko'rish", action: "openCafe", end: true },
        { t: "Bu yerda Wi-Fi bormi?", next: "wifi" },
        { t: "Rahmat, shunchaki o'tiribman", end: true },
      ],
    },
    wifi: {
      text: "Bor, lekin oxirgi paytlarda xakerlar tez-tez buzishyapti. Siz kelganingizdan beri tinch, xayriyat!",
      opts: [
        { t: "Menyuni ko'rish", action: "openCafe", end: true },
        { t: "Xavotir olmang!", end: true },
      ],
    },
  },
  librarian: {
    start: {
      text: "Assalomu alaykum. Kutubxonamizda kiber-xavfsizlik bo'limi bor. Ko'nikma ballaringiz bo'lsa, yangi buyruqlarni o'rgataman.",
      opts: [
        { t: "Ko'nikmalar daraxtini ochish", action: "skillTree", end: true },
        { t: "Fishing nima degani?", next: "phish" },
        { t: "Rahmat", end: true },
      ],
    },
    phish: {
      text: "Fishing — soxta xabar orqali aldash. Masalan: 'Siz yutuq yutdingiz, havolani bosing!' — bunday xabarlarni DOIM rad eting. O'yinda ham, hayotda ham!",
      opts: [
        { t: "Sinov o'ynash (viktorina)", action: "phishQuiz", end: true },
        { t: "Tushunarli!", end: true },
      ],
    },
  },
};
