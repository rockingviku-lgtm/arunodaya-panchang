// पंचपक्षी गतिविधि-समय-सारणी: दिन और रात के पाँच-पाँच यम, हर पक्षी की गतिविधि।
// हर परंपरा (profile) अलग है और उसका स्रोत लिखा है। मिलाई नहीं जाती।
import { dayTimes, moonInfo } from './panchapakshi-engine.js';

export const BIRDS = ['गिद्ध', 'उल्लू', 'कौआ', 'मुर्गा', 'मोर'];
export const ACTIVITY = {
  Ruling: 'शासन (Arasu)', Eating: 'भोजन (Oon)', Walking: 'विचरण (Nadai)', Sleeping: 'शयन (Thuyil)', Dying: 'साव (Saavu)'
};

// --- परंपरा 1: VedAstro भाग 5, शुक्ल पक्ष (दर्पण-तालिका) ---
// स्रोत: VedAstro, "Pancha Pakshi Shastra Part 5: Mirror Bright Half", जो Pulippani, Biorhythms of Natal Moon, अध्याय 4 ("Mirror Tables (Bright Half)") का उद्धरण है।
// सत्यापन: Part 4 के रविवार वाले उदाहरण (पक्षी-क्रम) से मेल खाती है। Udaya के अनुसार यह तालिका उसकी PyJHora तालिका से संरचनात्मक रूप से अलग है (उसे अभी जाँचना बाकी है)।
// समूह: A = रविवार, मंगलवार; B = सोमवार, बुधवार, शनिवार; C = गुरुवार; D = शुक्रवार।
// हर पक्षी के लिए: day = यम 1–5 (सूर्योदय से), night = यम 6–10 (सूर्यास्त से)। क्रम BIRDS के अनुसार।
const V = (d, n) => ({ day: d, night: n });
const BRIGHT_GROUPS = {
  A: [V(['Eating', 'Walking', 'Ruling', 'Sleeping', 'Dying'], ['Dying', 'Ruling', 'Sleeping', 'Eating', 'Walking']),
      V(['Ruling', 'Dying', 'Eating', 'Walking', 'Sleeping'], ['Sleeping', 'Eating', 'Walking', 'Dying', 'Ruling']),
      V(['Walking', 'Sleeping', 'Dying', 'Ruling', 'Eating'], ['Eating', 'Walking', 'Ruling', 'Sleeping', 'Dying']),
      V(['Dying', 'Ruling', 'Sleeping', 'Eating', 'Walking'], ['Walking', 'Sleeping', 'Dying', 'Ruling', 'Eating']),
      V(['Sleeping', 'Eating', 'Walking', 'Dying', 'Ruling'], ['Ruling', 'Dying', 'Eating', 'Walking', 'Sleeping'])],
  B: [V(['Dying', 'Ruling', 'Sleeping', 'Eating', 'Walking'], ['Walking', 'Sleeping', 'Dying', 'Ruling', 'Eating']),
      V(['Eating', 'Walking', 'Ruling', 'Sleeping', 'Dying'], ['Dying', 'Ruling', 'Sleeping', 'Eating', 'Walking']),
      V(['Sleeping', 'Eating', 'Walking', 'Dying', 'Ruling'], ['Ruling', 'Dying', 'Eating', 'Walking', 'Sleeping']),
      V(['Walking', 'Sleeping', 'Dying', 'Ruling', 'Eating'], ['Eating', 'Walking', 'Ruling', 'Sleeping', 'Dying']),
      V(['Ruling', 'Dying', 'Eating', 'Walking', 'Sleeping'], ['Sleeping', 'Eating', 'Walking', 'Dying', 'Ruling'])],
  C: [V(['Sleeping', 'Eating', 'Walking', 'Dying', 'Ruling'], ['Ruling', 'Dying', 'Eating', 'Walking', 'Sleeping']),
      V(['Walking', 'Sleeping', 'Dying', 'Ruling', 'Eating'], ['Eating', 'Walking', 'Ruling', 'Sleeping', 'Dying']),
      V(['Eating', 'Walking', 'Ruling', 'Sleeping', 'Dying'], ['Dying', 'Ruling', 'Sleeping', 'Eating', 'Walking']),
      V(['Ruling', 'Dying', 'Eating', 'Walking', 'Sleeping'], ['Sleeping', 'Eating', 'Walking', 'Dying', 'Ruling']),
      V(['Dying', 'Ruling', 'Sleeping', 'Eating', 'Walking'], ['Walking', 'Sleeping', 'Dying', 'Ruling', 'Eating'])],
  D: [V(['Walking', 'Sleeping', 'Dying', 'Ruling', 'Eating'], ['Eating', 'Walking', 'Ruling', 'Sleeping', 'Dying']),
      V(['Dying', 'Ruling', 'Sleeping', 'Eating', 'Walking'], ['Walking', 'Sleeping', 'Dying', 'Ruling', 'Eating']),
      V(['Ruling', 'Dying', 'Eating', 'Walking', 'Sleeping'], ['Sleeping', 'Eating', 'Walking', 'Dying', 'Ruling']),
      V(['Eating', 'Walking', 'Ruling', 'Sleeping', 'Dying'], ['Dying', 'Ruling', 'Sleeping', 'Eating', 'Walking']),
      V(['Sleeping', 'Eating', 'Walking', 'Dying', 'Ruling'], ['Ruling', 'Dying', 'Eating', 'Walking', 'Sleeping'])]
};
// सप्ताह के दिन (0 = रविवार) → समूह
const GROUP_OF_WEEKDAY = ['A', 'B', 'A', 'B', 'C', 'D', 'B'];

// सभी परंपराएँ अलग-अलग प्रोफ़ाइल हैं। किसी को दूसरी से मिलाया नहीं गया है।
export const PROFILES = {
  // 1. VedAstro भाग 5 (शुक्ल पक्ष): पूरी तालिका उपलब्ध; सत्यापित नहीं (नीचे विसंगतियाँ देखें)
  'vedastro-part5-bright': {
    id: 'vedastro-part5-bright', label: 'VedAstro भाग 5 (शुक्ल पक्ष, दर्पण-तालिका)', paksha: 'शुक्ल', status: 'unverified',
    source: 'https://vedastro.org/blog/Pancha-Pakshi-Part-5-Mirror-Bright-Half.html',
    sourceNote: 'VedAstro, Pulippani (अध्याय 4, "Mirror Tables (Bright Half)") का उद्धरण। Part 4 के रविवार उदाहरण से मेल। Udaya के अनुसार यह दर्पण-तालिका उसकी PyJHora तालिका से संरचनात्मक रूप से अलग है। सत्यापन बाकी।',
    groups: BRIGHT_GROUPS
  },
  // 2. VedAstro भाग 6 (कृष्ण पक्ष): असमर्थित। कुछ पंक्तियों में एक ही गतिविधि एक पक्षी के क्रम में दो बार आती है, जो संरचना के विपरीत है।
  'vedastro-part6-dark': {
    id: 'vedastro-part6-dark', label: 'VedAstro भाग 6 (कृष्ण पक्ष)', paksha: 'कृष्ण', status: 'unsupported',
    source: 'https://vedastro.org/blog/Pancha-Pakshi-Part-6-Mirror-Dark-Half.html',
    sourceNote: 'असमर्थित: इस पृष्ठ की तालिका में कुछ क्रम में एक गतिविधि दो बार है (जैसे मोर, गुरुवार/रात्रि)। साथ ही इसके समूह भाग 5 से अलग हैं (बुधवार अलग, सोमवार-शनिवार साथ)। मूल पुस्तक से जाँच बाकी।',
    groups: null
  },
  // 3. Udaya (PyJHora पर आधारित): असमर्थित। यह वार-आधारित नहीं, पक्ष-आधारित है, और उसका मूल गतिविधि-क्रम पूरे पाठ में नहीं मिला।
  'udaya-pyjhora': {
    id: 'udaya-pyjhora', label: 'Udaya (PyJHora आधारित)', paksha: 'दोनों', status: 'unsupported',
    source: 'https://udaya.app/method/',
    sourceNote: 'असमर्थित: यह मॉडल वार पर निर्भर नहीं; पूरे दिन-रात का पक्ष सूर्योदय के पक्ष से तय होता है। शुक्ल में क्रम आगे और कृष्ण में उलटा। मूल गतिविधि-क्रम (कौन सा पक्षी कौन सी गतिविधि से शुरू करता है) स्रोत में नहीं लिखा, इसलिए तालिका नहीं बनाई गई। PyJHora का स्रोत-कोड इस सत्र से नहीं खुला।',
    groups: null
  }
};

// संदर्भ-स्रोत (तालिका नहीं, केवल जाँच के लिए): तमिल पंचपक्षी शास्त्रम्, अध्याय 5 (1879 मद्रास संस्करण, VedicReader)।
// केवल रात्रि के भोजन/मृत्यु-पक्षी दिए गए हैं, पूरा क्रम नहीं। VedAstro भाग 5 से पूरी तरह मेल नहीं खाता, इसलिए इसे किसी तालिका में नहीं मिलाया गया।
export const REFERENCE_TAMIL_CH5 = {
  id: 'tamil-shastram-ch5-1879', status: 'partial-reference',
  source: 'https://vedicreader.com/s/shl?s=b9ce5675625&sec=%E0%AE%AA%E0%AE%BE%E0%AE%9F%E0%AE%B2%E0%AF%8D+1',
  nightEatingDying: {
    'रविवार': ['गिद्ध', 'कौआ'], 'सोमवार': ['मुर्गा', 'उल्लू'], 'मंगलवार': ['गिद्ध', 'गिद्ध'], 'बुधवार': ['उल्लू', 'मोर'],
    'गुरुवार': ['कौआ', 'मुर्गा'], 'शुक्रवार': ['मोर', 'मोर'], 'शनिवार': ['मुर्गा', 'मुर्गा']
  }
};

// सप्ताह का दिन (IST की तारीख़ से; समय-क्षेत्र पर निर्भर नहीं): 0 = रविवार
export const weekdayOf = dateISO => {
  const [y, m, d] = dateISO.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
};

// किसी तारीख़ और पक्ष की 10 यम-समय-सारणी (दिन 1–5 सूर्योदय से, रात 1–5 सूर्यास्त से)
export function timetable(dateISO, place, profile = PROFILES['vedastro-part5-bright']) {
  if (profile.status === 'unsupported' || !profile.groups) return { supported: false, profile: profile.id, reason: profile.sourceNote };
  const t = dayTimes(dateISO, place);
  if (!t) return { supported: false, profile: profile.id, reason: 'इस स्थान पर सूर्योदय-सूर्यास्त उपलब्ध नहीं' };
  const grp = profile.groups[GROUP_OF_WEEKDAY[weekdayOf(dateISO)]];
  const dLen = (t.sunset - t.sunrise) / 5, nLen = (t.nextSunrise - t.sunset) / 5;
  const slots = [];
  for (let i = 0; i < 5; i++) slots.push({ part: 'दिन', yama: i + 1, start: t.sunrise + i * dLen, end: t.sunrise + (i + 1) * dLen, activities: BIRDS.map((b, k) => ({ bird: b, key: grp[k].day[i], activity: ACTIVITY[grp[k].day[i]] })) });
  for (let j = 0; j < 5; j++) slots.push({ part: 'रात', yama: j + 6, start: t.sunset + j * nLen, end: t.sunset + (j + 1) * nLen, activities: BIRDS.map((b, k) => ({ bird: b, key: grp[k].night[j], activity: ACTIVITY[grp[k].night[j]] })) });
  return { supported: true, profile: profile.id, label: profile.label, source: profile.source, sourceNote: profile.sourceNote, weekday: weekdayOf(dateISO), group: GROUP_OF_WEEKDAY[weekdayOf(dateISO)], slots };
}

// किसी क्षण पर एक पक्षी की गतिविधि, शेष समय और अगली गतिविधि
export function currentFor(ms, tt, bird) {
  if (!tt || !tt.supported) return null;
  const i = tt.slots.findIndex(s => ms >= s.start && ms < s.end);
  if (i < 0) return null;
  const s = tt.slots[i], nx = tt.slots[i + 1];
  const cur = s.activities.find(a => a.bird === bird);
  const nxt = nx ? nx.activities.find(a => a.bird === bird) : null;
  return { bird, part: s.part, yama: s.yama, activity: cur.activity, start: s.start, end: s.end, remainingMin: Math.round((s.end - ms) / 60000), next: nxt ? { activity: nxt.activity, start: nx.start } : null };
}

// जन्म-पक्षी के लिए पक्ष पहचानना (खगोल-गणना से)
export const parkshaAt = ms => moonInfo(ms).paksha;
