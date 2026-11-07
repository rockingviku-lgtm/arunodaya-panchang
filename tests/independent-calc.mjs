// स्वतंत्र गणना (टेस्ट के लिए): engine से अलग, Meeus (Astronomical Algorithms, अध्याय 25 और 47) के निम्न-सटीकता सूत्र
// और NOAA-शैली सूर्योदय/सूर्यास्त (ज़ेनिथ 90.833°)। इनसे अपेक्षित मान निकाले जाते हैं; engine के मान इन्हीं से मिलाए जाते हैं।
// सटीकता: चंद्र ~0.05°, सूर्योदय ~1 मिनट। पाद-सीमा के बहुत पास के मामलों में यह निर्णायक नहीं है।

export const r360 = x => ((x % 360) + 360) % 360;
const rad = d => (d * Math.PI) / 180;
const deg = r => (r * 180) / Math.PI;

export const jdOf = ms => ms / 86400000 + 2440587.5;

// IST की तारीख़ और HH:MM से UTC ms (IST = UTC+05:30)
export function istMs(dateISO, hhmm) {
  const [y, m, d] = dateISO.split('-').map(Number);
  const [h, mi] = hhmm.split(':').map(Number);
  return Date.UTC(y, m - 1, d, h, mi) - 330 * 60000;
}

// लाहिरी अयनांश (सन्निकट): 1 जनवरी 2000 ≈ 23.8531°, वार्षिक वृद्धि ≈ 0.013969°
export function ayanamsaAt(jd) {
  const year = 2000 + (jd - 2451544.5) / 365.25;
  return 23.8531 + 0.013969 * (year - 2000);
}

// चंद्र का तात्कालिक (tropical) देशांतर
export function moonTropical(jd) {
  const T = (jd - 2451545.0) / 36525;
  const Lp = 218.3164477 + 481267.88123421 * T;
  const D = 297.8501921 + 445267.1114034 * T;
  const M = 357.5291092 + 35999.0502909 * T;
  const Mp = 134.9633964 + 477198.8675055 * T;
  const F = 93.2720950 + 483202.0175233 * T;
  const terms = [
    [0, 0, 1, 0, 6288774], [2, 0, -1, 0, 1274027], [2, 0, 0, 0, 658314], [0, 0, 2, 0, 213618],
    [0, 1, 0, 0, -185116], [0, 0, 0, 2, -114332], [2, 0, -2, 0, 58793], [2, -1, -1, 0, 57066],
    [2, 0, 1, 0, 53322], [2, -1, 0, 0, 45758], [0, 1, -1, 0, -40923], [1, 0, 0, 0, -34720], [0, 1, 1, 0, -30383]
  ];
  let s = 0;
  for (const [a, b, c, d, k] of terms) s += k * Math.sin(rad(a * D + b * M + c * Mp + d * F));
  return r360(Lp + s / 1e6);
}

// सूर्य का तात्कालिक देशांतर, घोषणा और समय-समीकरण (मिनट)
export function sunParts(jd) {
  const T = (jd - 2451545.0) / 36525;
  const L0 = r360(280.46646 + 36000.76983 * T);
  const M = r360(357.52911 + 35999.05029 * T);
  const e = 0.016708634 - 0.000042037 * T;
  const C = (1.914602 - 0.004817 * T) * Math.sin(rad(M)) + 0.019993 * Math.sin(rad(2 * M)) + 0.000289 * Math.sin(rad(3 * M));
  const omega = 125.04 - 1934.136 * T;
  const lambda = L0 + C - 0.00569 - 0.00478 * Math.sin(rad(omega));
  const eps = 23.439291 - 0.0130042 * T + 0.00256 * Math.cos(rad(omega));
  const decl = deg(Math.asin(Math.sin(rad(eps)) * Math.sin(rad(lambda))));
  const y = Math.tan(rad(eps / 2)) ** 2;
  const E = 4 * deg(y * Math.sin(2 * rad(L0)) - 2 * e * Math.sin(rad(M)) + 4 * e * y * Math.sin(rad(M)) * Math.cos(2 * rad(L0))
    - 0.5 * y * y * Math.sin(4 * rad(L0)) - 1.25 * e * e * Math.sin(2 * rad(M)));
  return { lambda, decl, E };
}

// सूर्योदय और सूर्यास्त (UTC ms) उस कैलेंडर-तारीख़ के लिए जो IST में दी गई है
export function independentSunTimes(dateISO, lat, lon) {
  const [y, m, d] = dateISO.split('-').map(Number);
  const { decl, E } = sunParts(jdOf(Date.UTC(y, m - 1, d, 12, 0)));
  const noonUT = 720 - 4 * lon - E;
  const cosH = (Math.cos(rad(90.833)) - Math.sin(rad(lat)) * Math.sin(rad(decl))) / (Math.cos(rad(lat)) * Math.cos(rad(decl)));
  const H = deg(Math.acos(cosH)) * 4;
  const base = Date.UTC(y, m - 1, d);
  return { sunrise: base + (noonUT - H) * 60000, sunset: base + (noonUT + H) * 60000 };
}

// स्वतंत्र पंचांग-अपेक्षा: चंद्र नक्षत्र, पाद, राशि, पक्ष, तिथि (IST समय के लिए)
export function independentMoon(dateISO, hhmm) {
  const ms = istMs(dateISO, hhmm);
  const jd = jdOf(ms);
  const ay = ayanamsaAt(jd);
  const moon = r360(moonTropical(jd) - ay);
  const sun = r360(sunParts(jd).lambda - ay);
  const elong = r360(moon - sun);
  const nakNo = Math.floor(moon / (360 / 27)) + 1;
  const pada = Math.floor((moon % (360 / 27)) / (360 / 108)) + 1;
  const tithiNo = Math.floor(elong / 12) + 1;
  return {
    ms, moon, nakNo, nakName: NAK_NAMES[nakNo - 1], pada, sign: Math.floor(moon / 30),
    paksha: elong < 180 ? 'शुक्ल' : 'कृष्ण', tithiNo, tithiInPaksha: ((tithiNo - 1) % 15) + 1
  };
}

// Pulippani तालिका (नक्षत्र 1–27), इस फ़ाइल में अलग से लिखी गई प्रति (स्रोत-दस्तावेज़ से)
export const PULIPPANI_SHUKLA = {
  1: 'गिद्ध', 2: 'गिद्ध', 3: 'गिद्ध', 4: 'गिद्ध', 5: 'गिद्ध', 6: 'उल्लू', 7: 'उल्लू', 8: 'उल्लू', 9: 'उल्लू', 10: 'उल्लू',
  11: 'कौआ', 12: 'कौआ', 13: 'कौआ', 14: 'कौआ', 15: 'कौआ', 16: 'मुर्गा', 17: 'मुर्गा', 18: 'मुर्गा', 19: 'मुर्गा', 20: 'मुर्गा',
  21: 'मोर', 22: 'मोर', 23: 'मोर', 24: 'मोर', 25: 'मोर', 26: 'मोर', 27: 'मोर'
};
export const PULIPPANI_KRISHNA = {
  1: 'मोर', 2: 'मोर', 3: 'मोर', 4: 'मोर', 5: 'मोर', 6: 'मोर', 7: 'मोर', 8: 'मुर्गा', 9: 'मुर्गा', 10: 'मुर्गा',
  11: 'मुर्गा', 12: 'मुर्गा', 13: 'कौआ', 14: 'कौआ', 15: 'कौआ', 16: 'कौआ', 17: 'कौआ', 18: 'उल्लू', 19: 'उल्लू', 20: 'उल्लू',
  21: 'उल्लू', 22: 'उल्लू', 23: 'गिद्ध', 24: 'गिद्ध', 25: 'गिद्ध', 26: 'गिद्ध', 27: 'गिद्ध'
};
export const NAK_NAMES = ['अश्विनी', 'भरणी', 'कृत्तिका', 'रोहिणी', 'मृगशिरा', 'आर्द्रा', 'पुनर्वसु', 'पुष्य', 'आश्लेषा', 'मघा',
  'पूर्वा फाल्गुनी', 'उत्तरा फाल्गुनी', 'हस्त', 'चित्रा', 'स्वाति', 'विशाखा', 'अनुराधा', 'ज्येष्ठा', 'मूल', 'पूर्वाषाढ़ा',
  'उत्तराषाढ़ा', 'श्रवण', 'धनिष्ठा', 'शतभिषा', 'पूर्वा भाद्रपद', 'उत्तरा भाद्रपद', 'रेवती'];
