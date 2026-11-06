// पंचपक्षी: खगोल-गणना का हिस्सा (चंद्र नक्षत्र, पक्ष, तिथि, सूर्योदय-सूर्यास्त)। यह किसी परंपरा पर निर्भर नहीं है।
// पक्षी, गतिविधि और यम की तालिकाएँ यहाँ नहीं हैं: प्रामाणिक मूल स्रोत मिलने के बाद ही जुड़ेंगी (docs/panchapakshi-sources.md देखें)।
import { moonSidereal, sunSidereal, sunTimes, shiftDate, NAKSHATRAS } from './festival-calendar.js';

export const TABLES_STATUS = {
  birdTable: 'secondary-two-traditions',
  activityTable: 'pending',
  yama: 'secondary-one-tradition',
  reason: 'पक्षी की तालिका दो सेकेंडरी स्रोतों से है और वे आपस में अलग हैं, इसलिए दोनों अलग-अलग दिखाए जाते हैं। पक्षी-गतिविधि का वार और दिन-रात वाला क्रम किसी स्रोत में पूरा नहीं मिला, इसलिए वह नहीं दिखाया जाता।'
};

const norm = x => ((x % 360) + 360) % 360;
const IST_MIN = 330;

// IST तारीख़ और समय (HH:MM) से UTC ms
export function istToMs(dateISO, time) {
  const [y, m, d] = dateISO.split('-').map(Number);
  const [h, mi] = (time || '12:00').split(':').map(Number);
  return Date.UTC(y, m - 1, d, h, mi) - IST_MIN * 60000;
}

// UTC ms को IST का HH:MM
export const fmtIST = ms => {
  const d = new Date(ms + IST_MIN * 60000);
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
};

// चंद्र नक्षत्र, चरण, पक्ष और तिथि (सायडेरियल, लाहिरी; मौजूदा गणना से)
export function moonInfo(ms) {
  const moon = moonSidereal(ms), sun = sunSidereal(ms);
  const nk = Math.floor(moon / (360 / 27));
  const pada = Math.floor((moon % (360 / 27)) / (360 / 108)) + 1;
  const elong = norm(moon - sun);
  const tithiNo = Math.floor(elong / 12) + 1; // 1..30
  return {
    moon, sign: Math.floor(moon / 30), nakshatra: NAKSHATRAS[nk], nakshatraNo: nk + 1, pada,
    paksha: elong < 180 ? 'शुक्ल' : 'कृष्ण', tithiNo, tithiInPaksha: ((tithiNo - 1) % 15) + 1
  };
}

// दिन का सूर्योदय-सूर्यास्त और अगले दिन का सूर्योदय (UTC ms), तथा दिन-रात की अवधि (मिनट)
export function dayTimes(dateISO, place) {
  const t = sunTimes(dateISO, place), n = sunTimes(shiftDate(dateISO, 1), place);
  if (!t.sunrise || !t.sunset || !n.sunrise) return null;
  return {
    sunrise: t.sunrise, sunset: t.sunset, nextSunrise: n.sunrise,
    dayMin: Math.round((t.sunset - t.sunrise) / 60000), nightMin: Math.round((n.sunrise - t.sunset) / 60000)
  };
}

// ---- परंपराएँ (हर एक अलग; मिलाई नहीं जातीं) ----
// स्रोत: DekhoPanchang "Learn: Pancha Pakshi" (पक्ष-निरपेक्ष, नक्षत्र 1–27 की सीमाएँ)
// स्रोत: Hindu-blog, 2018 "Pacha Pakshi Shastra" (शुक्ल और कृष्ण पक्ष की अलग सूचियाँ)
const RANGES = (obj) => {
  const m = new Map();
  for (const [bird, [a, b]] of Object.entries(obj)) for (let n = a; n <= b; n++) m.set(n, bird);
  return m;
};
// नाम से नक्षत्र-सूची (पुस्तक की तालिका का रूप); नाम न मिले तो त्रुटि
const byName = (obj) => {
  const m = new Map();
  for (const [bird, names] of Object.entries(obj)) for (const nm of names) {
    const i = NAKSHATRAS.indexOf(nm);
    if (i < 0) throw new Error('नक्षत्र नहीं मिला: ' + nm);
    m.set(i + 1, bird);
  }
  return m;
};
export const BIRD_TRADITIONS = [
  {
    id: 'pulippani', label: 'Pulippani (पुस्तक तालिका, VedAstro द्वारा उद्धृत)', paksha: true,
    source: 'https://vedastro.org/blog/Pancha-Pakshi-Part-2-Finding-Your-Birth-Bird.html',
    shukla: byName({
      'गिद्ध': ['अश्विनी', 'भरणी', 'कृत्तिका', 'रोहिणी', 'मृगशिरा'],
      'उल्लू': ['आर्द्रा', 'पुनर्वसु', 'पुष्य', 'आश्लेषा', 'मघा'],
      'कौआ': ['पूर्वा फाल्गुनी', 'उत्तरा फाल्गुनी', 'हस्त', 'चित्रा', 'स्वाति'],
      'मुर्गा': ['विशाखा', 'अनुराधा', 'ज्येष्ठा', 'मूल', 'पूर्वाषाढ़ा'],
      'मोर': ['उत्तराषाढ़ा', 'श्रवण', 'धनिष्ठा', 'शतभिषा', 'पूर्वा भाद्रपद', 'उत्तरा भाद्रपद', 'रेवती']
    }),
    krishna: byName({
      'मोर': ['पुनर्वसु', 'आर्द्रा', 'मृगशिरा', 'रोहिणी', 'कृत्तिका', 'भरणी', 'अश्विनी'],
      'मुर्गा': ['उत्तरा फाल्गुनी', 'पूर्वा फाल्गुनी', 'मघा', 'आश्लेषा', 'पुष्य'],
      'कौआ': ['अनुराधा', 'विशाखा', 'स्वाति', 'चित्रा', 'हस्त'],
      'उल्लू': ['श्रवण', 'उत्तराषाढ़ा', 'पूर्वाषाढ़ा', 'मूल', 'ज्येष्ठा'],
      'गिद्ध': ['रेवती', 'उत्तरा भाद्रपद', 'पूर्वा भाद्रपद', 'शतभिषा', 'धनिष्ठा']
    })
  },
  {
    id: 'dekhopanchang', label: 'DekhoPanchang', paksha: false,
    source: 'https://dekhopanchang.com/en/learn/pancha-pakshi',
    map: RANGES({ 'गिद्ध': [1, 5], 'उल्लू': [6, 10], 'कौआ': [11, 15], 'मुर्गा': [16, 20], 'मोर': [21, 27] })
  },
  {
    id: 'hindu-blog', label: 'Hindu-blog (2018)', paksha: true,
    source: 'https://www.hindu-blog.com/2018/10/pacha-pakshi-shastra-hindu-astrology-birth-bird-astrology.html',
    shukla: RANGES({ 'गिद्ध': [1, 5], 'उल्लू': [6, 11], 'कौआ': [12, 16], 'मुर्गा': [17, 21], 'मोर': [22, 27] }),
    krishna: RANGES({ 'मोर': [1, 5], 'मुर्गा': [6, 11], 'कौआ': [12, 16], 'उल्लू': [17, 21], 'गिद्ध': [22, 27] })
  }
];

// जन्म-पक्षी: हर परंपरा का अलग परिणाम; conflict = परंपराएँ अलग पक्षी दें
export function birthBirds(nakshatraNo, paksha) {
  const out = BIRD_TRADITIONS.map(t => {
    const map = t.paksha ? (paksha === 'शुक्ल' ? t.shukla : t.krishna) : t.map;
    return { tradition: t.id, label: t.label, bird: map.get(nakshatraNo), source: t.source, paksha_dependent: t.paksha };
  });
  const distinct = new Set(out.map(o => o.bird));
  return { rows: out, conflict: distinct.size > 1 };
}

// दिन और रात के पाँच बराबर भाग (हिंदू-ब्लॉग: "हर दिन/रात पाँच बराबर भाग"; एक ही सेकेंडरी स्रोत)
export function fivePeriods(dt) {
  const parts = (from, len) => Array.from({ length: 5 }, (_, i) => [from + (len * i) / 5, from + (len * (i + 1)) / 5]);
  return { day: parts(dt.sunrise, dt.sunset - dt.sunrise), night: parts(dt.sunset, dt.nextSunrise - dt.sunset) };
}
