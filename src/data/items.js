// Shop items, cafe menu, and the skill tree.
export const SHOP_ITEMS = [
  {
    id: 'laptop', name: 'Yangi noutbuk', maxLvl: 3, prices: [120, 260, 450],
    desc: 'Lazer kuchi +20% (har daraja)',
  },
  {
    id: 'keyboard', name: 'Mexanik klaviatura', maxLvl: 2, prices: [100, 220],
    desc: 'Buyruqlar tezroq tayyor bo‘ladi (-15% kutish)',
  },
  {
    id: 'shieldExt', name: 'Qalqon kengaytirgichi', maxLvl: 2, prices: [90, 180],
    desc: 'Qalqon sig‘imi +20 (har daraja)',
  },
  {
    id: 'scooter', name: 'Skuter', maxLvl: 1, prices: [220],
    desc: 'Shaharda tez yurish (R tugmasi)',
  },
  {
    id: 'energy', name: 'Energetik ichimlik', consumable: true, prices: [25],
    desc: 'Tezlik +25% (90 soniya)',
  },
];

export const CAFE_MENU = [
  { id: 'choy', name: 'Bir piyola choy', price: 5, desc: 'HP +25', hp: 25 },
  { id: 'samsa', name: 'Issiq samsa', price: 12, desc: 'HP +50', hp: 50 },
  { id: 'qahva', name: 'Kod-kofe', price: 10, desc: 'Tezlik +15% (2 daqiqa)', buff: { id: 'qahva', label: '☕ Tezlik', dur: 120, data: { speed: 1.15 } } },
  { id: 'palov', name: 'Osh (palov)', price: 18, desc: 'XP +25% (5 daqiqa)', buff: { id: 'palov', label: '🍚 XP+', dur: 300, data: { xp: 1.25 } } },
];

// skill tree: cost in skill points; cmd skills unlock terminal commands
export const SKILL_TREE = [
  {
    tier: 1, items: [
      { id: 'isolate', name: 'isolate', cost: 1, cmd: 'isolate', desc: 'Yangi buyruq: nishonni 2.5s muzlatadi' },
      { id: 'decrypt', name: 'decrypt', cost: 1, cmd: 'decrypt', desc: 'Yangi buyruq: Ransomware’ga qarshi kuchli' },
      { id: 'shieldplus', name: 'Mustahkam qalqon', cost: 1, desc: 'sudo shield sig‘imi +25' },
    ],
  },
  {
    tier: 2, items: [
      { id: 'kill9', name: 'kill -9', cost: 2, cmd: 'kill -9', desc: 'Yangi buyruq: juda kuchli zarba' },
      { id: 'emp', name: 'emp', cost: 2, cmd: 'emp', desc: 'Yangi buyruq: hamma dushmanga zarar' },
      { id: 'typeboost', name: 'Tez barmoqlar', cost: 2, desc: 'Barcha buyruqlar -20% kutish vaqti' },
    ],
  },
  {
    tier: 3, items: [
      { id: 'freeze', name: 'freeze', cost: 2, cmd: 'freeze', desc: 'Yangi buyruq: hammani sekinlashtiradi' },
      { id: 'chain', name: 'chain', cost: 2, cmd: 'chain', desc: 'Yangi buyruq: zanjir lazer (3 nishon)' },
      { id: 'aim', name: 'Avto-nishon', cost: 2, desc: 'Kritik zarba ehtimoli +10%' },
    ],
  },
  {
    tier: 4, items: [
      { id: 'blackice', name: 'Qora Muz protokoli', cost: 3, desc: 'Barcha lazerlar +30% kuch' },
    ],
  },
];
