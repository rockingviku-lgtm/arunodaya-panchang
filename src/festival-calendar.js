// festival-calendar.js
// हर साल अपने-आप व्रत और त्योहार की तारीख़ निकालने वाला इंजन।
// - कोई बाहरी लाइब्रेरी या इंटरनेट नहीं चाहिए: सूर्य-चंद्र की स्थिति (Meeus) से तिथि और चांद्र मास निकलता है।
// - समय-क्षेत्र हमेशा Asia/Kolkata (UTC+05:30)।
// - अयनांश: लाहिरी (चित्रपक्ष)। चांद्र मास: अमांत, अधिक मास की पहचान के साथ।

export const IST_MINUTES = 330;
export const DEFAULT_PLACE = { name: 'Lucknow, India', lat: 26.8467, lon: 80.9462 };

const DAY = 86_400_000;
const MIN = 60_000;
const RAD = Math.PI / 180;
const norm = x => ((x % 360) + 360) % 360;
const wrap180 = d => ((((d + 180) % 360) + 360) % 360) - 180;
const sind = d => Math.sin(d * RAD);
const cosd = d => Math.cos(d * RAD);

export const MONTH_NAMES = ['चैत्र', 'वैशाख', 'ज्येष्ठ', 'आषाढ़', 'श्रावण', 'भाद्रपद', 'आश्विन', 'कार्तिक', 'मार्गशीर्ष', 'पौष', 'माघ', 'फाल्गुन'];
const TITHI_BASE = ['प्रतिपदा', 'द्वितीया', 'तृतीया', 'चतुर्थी', 'पंचमी', 'षष्ठी', 'सप्तमी', 'अष्टमी', 'नवमी', 'दशमी', 'एकादशी', 'द्वादशी', 'त्रयोदशी', 'चतुर्दशी'];

// index 1..30 -> "शुक्ल एकादशी", "पूर्णिमा", "अमावस्या"
export function tithiName(index) {
  if (index === 15) return 'पूर्णिमा';
  if (index === 30) return 'अमावस्या';
  const paksha = index < 15 ? 'शुक्ल' : 'कृष्ण';
  return `${paksha} ${TITHI_BASE[(index - 1) % 15]}`;
}

// ---------- समय और खगोल ----------
const jdUT = ms => ms / DAY + 2440587.5;
const deltaT = ms => { const t = 1970 + ms / (365.2425 * DAY) - 2000; return 62.92 + 0.32217 * t + 0.005589 * t * t; };
const centuries = ms => (jdUT(ms) + deltaT(ms) / 86400 - 2451545) / 36525;

function sunTrueLon(T) {
  const L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
  const M = 357.52911 + 35999.05029 * T - 0.0001537 * T * T;
  const C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * sind(M) + (0.019993 - 0.000101 * T) * sind(2 * M) + 0.000289 * sind(3 * M);
  return norm(L0 + C);
}

// लाहिरी अयनांश (औसत विषुव के सापेक्ष)
const ayanamsa = T => 23.85306 + 1.396888 * T + 0.000307 * T * T;

// चंद्रमा की रेखांश, Meeus अध्याय 47 (मुख्य पद)
const MOON_LON = [
  [0, 0, 1, 0, 6288774], [2, 0, -1, 0, 1274027], [2, 0, 0, 0, 658314], [0, 0, 2, 0, 213618], [0, 1, 0, 0, -185116],
  [0, 0, 0, 2, -114332], [2, 0, -2, 0, 58793], [2, -1, -1, 0, 57066], [2, 0, 1, 0, 53322], [2, -1, 0, 0, 45758],
  [0, 1, -1, 0, -40923], [1, 0, 0, 0, -34720], [0, 1, 1, 0, -30383], [2, 0, 0, -2, 15327], [0, 0, 1, 2, -12528],
  [0, 0, 1, -2, 10980], [4, 0, -1, 0, 10675], [0, 0, 3, 0, 10034], [4, 0, -2, 0, 8548], [2, 1, -1, 0, -7888],
  [2, 1, 0, 0, -6766], [1, 0, -1, 0, -5163], [1, 1, 0, 0, 4987], [2, -1, 1, 0, 4036], [2, 0, 2, 0, 3994],
  [4, 0, 0, 0, 3861], [2, 0, -3, 0, 3665], [0, 1, -2, 0, -2689], [2, 0, -1, 2, -2602], [2, -1, -2, 0, 2390],
  [1, 0, 1, 0, -2348], [2, -2, 0, 0, 2236], [0, 1, 2, 0, -2120], [0, 2, 0, 0, -2069], [2, -2, -1, 0, 2048],
  [2, 0, 1, -2, -1773], [2, 0, 0, 2, -1595], [4, -1, -1, 0, 1215], [0, 0, 2, 2, -1110], [3, 0, -1, 0, -892],
  [2, 1, 1, 0, -810], [4, -1, -2, 0, 759], [0, 2, -1, 0, -713], [2, 2, -1, 0, -700], [2, 1, -2, 0, 691],
  [2, -1, 0, -2, 596], [4, 0, 1, 0, 549], [0, 0, 4, 0, 537], [4, -1, 0, 0, 520], [1, 0, -2, 0, -487],
  [2, 1, 0, -2, -399], [0, 0, 2, -2, -381], [1, 1, 1, 0, 351], [3, 0, -2, 0, -340], [4, 0, -3, 0, 330],
  [2, -1, 2, 0, 327], [0, 2, 1, 0, -323], [1, 1, -1, 0, 299], [2, 0, 3, 0, 294]
];

function moonLon(T) {
  const T2 = T * T, T3 = T2 * T, T4 = T3 * T;
  const Lp = norm(218.3164477 + 481267.88123421 * T - 0.0015786 * T2 + T3 / 538841 - T4 / 65194000);
  const D = norm(297.8501921 + 445267.1114034 * T - 0.0018819 * T2 + T3 / 545868 - T4 / 113065000);
  const M = norm(357.5291092 + 35999.0502909 * T - 0.0001536 * T2 + T3 / 24490000);
  const Mp = norm(134.9633964 + 477198.8675055 * T + 0.0087414 * T2 + T3 / 69699 - T4 / 14712000);
  const F = norm(93.272095 + 483202.0175233 * T - 0.0036539 * T2 - T3 / 3526000 + T4 / 863310000);
  const E = 1 - 0.002516 * T - 0.0000074 * T2;
  let sum = 0;
  for (const [d, m, mp, f, c] of MOON_LON) {
    const arg = d * D + m * M + mp * Mp + f * F;
    const am = Math.abs(m);
    sum += c * (am === 1 ? E : am === 2 ? E * E : 1) * sind(arg);
  }
  const A1 = 119.75 + 131.849 * T, A2 = 53.09 + 479264.29 * T;
  sum += 3958 * sind(A1) + 1962 * sind(Lp - F) + 318 * sind(A2);
  return norm(Lp + sum / 1e6);
}

// चंद्रमा का शर (क्रांतिवृत्त से उत्तर-दक्षिण दूरी, डिग्री), Meeus अध्याय 47: ग्रहण पहचानने के लिए
const MOON_LAT = [
  [0, 0, 0, 1, 5128122], [0, 0, 1, 1, 280602], [0, 0, 1, -1, 277693], [2, 0, 0, -1, 173237], [2, 0, -1, 1, 55413],
  [2, 0, -1, -1, 46271], [2, 0, 0, 1, 32573], [0, 0, 2, 1, 17198], [2, 0, 1, -1, 9266], [0, 0, 2, -1, 8822],
  [2, -1, 0, -1, 8216], [2, 0, -2, -1, 4324], [2, 0, 1, 1, 4200], [2, 1, 0, -1, -3359], [2, -1, -1, 1, 2463],
  [2, -1, 0, 1, 2211], [2, -1, -1, -1, 2065], [0, 1, -1, -1, -1870], [4, 0, -1, -1, 1828], [0, 1, 0, 1, -1794],
  [0, 0, 0, 3, -1749], [0, 1, -1, 1, -1565], [1, 0, 0, 1, -1491], [0, 1, 1, 1, -1475], [0, 1, 1, -1, -1410],
  [0, 1, 0, -1, -1344], [1, 0, 0, -1, -1335], [0, 0, 3, 1, 1107], [4, 0, 0, -1, 1021], [4, 0, -1, 1, 833]
];
function moonLat(T) {
  const T2 = T * T;
  const Lp = norm(218.3164477 + 481267.88123421 * T - 0.0015786 * T2);
  const D = norm(297.8501921 + 445267.1114034 * T - 0.0018819 * T2);
  const M = norm(357.5291092 + 35999.0502909 * T - 0.0001536 * T2);
  const Mp = norm(134.9633964 + 477198.8675055 * T + 0.0087414 * T2);
  const F = norm(93.272095 + 483202.0175233 * T - 0.0036539 * T2);
  const E = 1 - 0.002516 * T - 0.0000074 * T2;
  let sum = 0;
  for (const [d, m, mp, f, c] of MOON_LAT) {
    const am = Math.abs(m);
    sum += c * (am === 1 ? E : am === 2 ? E * E : 1) * sind(d * D + m * M + mp * Mp + f * F);
  }
  const A1 = 119.75 + 131.849 * T, A3 = 313.45 + 481266.484 * T;
  sum += -2235 * sind(Lp) + 382 * sind(A3) + 175 * sind(A1 - F) + 175 * sind(A1 + F) + 127 * sind(Lp - Mp) - 115 * sind(Lp + Mp);
  return sum / 1e6;
}
export const moonLatitudeAt = ms => moonLat(centuries(ms));
// चंद्रमा की निरयण रेखांश
export const moonSidereal = ms => { const T = centuries(ms); return norm(moonLon(T) - ayanamsa(T)); };

export const NAKSHATRAS = ['अश्विनी', 'भरणी', 'कृत्तिका', 'रोहिणी', 'मृगशिरा', 'आर्द्रा', 'पुनर्वसु', 'पुष्य', 'आश्लेषा', 'मघा', 'पूर्वा फाल्गुनी', 'उत्तरा फाल्गुनी', 'हस्त', 'चित्रा', 'स्वाति', 'विशाखा', 'अनुराधा', 'ज्येष्ठा', 'मूल', 'पूर्वाषाढ़ा', 'उत्तराषाढ़ा', 'श्रवण', 'धनिष्ठा', 'शतभिषा', 'पूर्वा भाद्रपद', 'उत्तरा भाद्रपद', 'रेवती'];
export const YOGAS = ['विष्कुम्भ', 'प्रीति', 'आयुष्मान', 'सौभाग्य', 'शोभन', 'अतिगण्ड', 'सुकर्मा', 'धृति', 'शूल', 'गण्ड', 'वृद्धि', 'ध्रुव', 'व्याघात', 'हर्षण', 'वज्र', 'सिद्धि', 'व्यतीपात', 'वरीयान', 'परिघ', 'शिव', 'सिद्ध', 'साध्य', 'शुभ', 'शुक्ल', 'ब्रह्म', 'ऐन्द्र', 'वैधृति'];
const KARANA_CYCLE = ['बव', 'बालव', 'कौलव', 'तैतिल', 'गर', 'वणिज', 'विष्टि (भद्रा)'];
export const WEEKDAYS_HI = ['रविवार', 'सोमवार', 'मंगलवार', 'बुधवार', 'गुरुवार', 'शुक्रवार', 'शनिवार'];
function karanaName(k) { // k = 1..60
  if (k === 1) return 'किंस्तुघ्न';
  if (k === 58) return 'शकुनि';
  if (k === 59) return 'चतुष्पाद';
  if (k === 60) return 'नाग';
  return KARANA_CYCLE[(k - 2) % 7];
}

// चंद्र-सूर्य की कोणीय दूरी (0..360); हर 12 डिग्री पर एक तिथि
const SUN_ABERRATION = 0.00569;
export function elongation(ms) {
  const T = centuries(ms);
  return norm(moonLon(T) - sunTrueLon(T) + SUN_ABERRATION);
}
// निरयण (लाहिरी) सूर्य की रेखांश
export function sunSidereal(ms) {
  const T = centuries(ms);
  return norm(sunTrueLon(T) - SUN_ABERRATION - ayanamsa(T));
}

const MEAN_ELONG_RATE = 12.19; // डिग्री प्रति दिन
function solveElongation(target, guess) {
  let t = guess;
  for (let i = 0; i < 40; i++) {
    const d = wrap180(target - elongation(t));
    t += (d / MEAN_ELONG_RATE) * DAY;
    if (Math.abs(d) < 1e-6) break;
  }
  return t;
}
function solveSunSidereal(target, guess) {
  let t = guess;
  for (let i = 0; i < 40; i++) {
    const d = wrap180(target - sunSidereal(t));
    t += (d / 0.9856) * DAY;
    if (Math.abs(d) < 1e-6) break;
  }
  return t;
}

// ms पर चल रही तिथि: {index 1..30, start, end}
export function tithiAt(ms) {
  const e = elongation(ms);
  const k = Math.floor(e / 12);
  return {
    index: k + 1,
    start: solveElongation(12 * k, ms - ((e - 12 * k) / MEAN_ELONG_RATE) * DAY),
    end: solveElongation(12 * (k + 1), ms + ((12 * (k + 1) - e) / MEAN_ELONG_RATE) * DAY)
  };
}

// अमांत चांद्र मास: 1=चैत्र ... 12=फाल्गुन; अधिक मास की पहचान
export function lunarMonth(ms) {
  const e = elongation(ms);
  const start = solveElongation(0, ms - (e / MEAN_ELONG_RATE) * DAY);
  const end = solveElongation(360, ms + ((360 - e) / MEAN_ELONG_RATE) * DAY);
  const r1 = Math.floor(sunSidereal(start) / 30);
  const r2 = Math.floor(sunSidereal(end) / 30);
  return { month: ((r1 + 1) % 12) + 1, adhika: r1 === r2, monthStart: start, monthEnd: end };
}

// ---------- सूर्योदय / सूर्यास्त (NOAA विधि) ----------
function solarDeclEq(ms) {
  const T = centuries(ms) ; // सूर्योदय के लिए TT और UT का अंतर नगण्य
  const L0 = norm(280.46646 + T * (36000.76983 + T * 0.0003032));
  const M = 357.52911 + T * (35999.05029 - 0.0001537 * T);
  const e = 0.016708634 - T * (0.000042037 + 0.0000001267 * T);
  const C = sind(M) * (1.914602 - T * (0.004817 + 0.000014 * T)) + sind(2 * M) * (0.019993 - 0.000101 * T) + sind(3 * M) * 0.000289;
  const omega = 125.04 - 1934.136 * T;
  const lambda = L0 + C - 0.00569 - 0.00478 * sind(omega);
  const seconds = 21.448 - T * (46.815 + T * (0.00059 - T * 0.001813));
  const eps = 23 + (26 + seconds / 60) / 60 + 0.00256 * cosd(omega);
  const decl = Math.asin(sind(eps) * sind(lambda)) / RAD;
  const y = Math.tan((eps * RAD) / 2) ** 2;
  const eq = (4 / RAD) * (y * sind(2 * L0) - 2 * e * sind(M) + 4 * e * y * sind(M) * cosd(2 * L0) - 0.5 * y * y * sind(4 * L0) - 1.25 * e * e * sind(2 * M));
  return { decl, eq };
}
function hourAngle(lat, decl) {
  const c = (cosd(90.833) - sind(lat) * sind(decl)) / (cosd(lat) * cosd(decl));
  return Math.abs(c) > 1 ? null : Math.acos(c) / RAD;
}
const sunCache = new Map();
export function sunTimes(dateISO, place = DEFAULT_PLACE) {
  const key = `${dateISO}|${place.lat}|${place.lon}`;
  if (sunCache.has(key)) return sunCache.get(key);
  const [y, m, d] = dateISO.split('-').map(Number);
  const base = Date.UTC(y, m - 1, d);
  const { lat, lon } = place;
  const noonAt = ms => base + (720 - 4 * lon - solarDeclEq(ms).eq) * MIN;
  let noon = base + (720 - 4 * lon) * MIN;
  for (let i = 0; i < 3; i++) noon = noonAt(noon);
  const H0 = hourAngle(lat, solarDeclEq(noon).decl);
  let out;
  if (H0 == null) {
    out = { sunrise: null, sunset: null };
  } else {
    let rise = noon - H0 * 4 * MIN, set = noon + H0 * 4 * MIN;
    for (let i = 0; i < 2; i++) {
      const hr = hourAngle(lat, solarDeclEq(rise).decl), hs = hourAngle(lat, solarDeclEq(set).decl);
      rise = noonAt(rise) - hr * 4 * MIN;
      set = noonAt(set) + hs * 4 * MIN;
    }
    out = { sunrise: rise, sunset: set };
  }
  sunCache.set(key, out);
  return out;
}

// ---------- IST तारीख़ के सहायक ----------
const istDate = ms => new Date(ms + IST_MINUTES * MIN).toISOString().slice(0, 10);
const istMidnight = dateISO => { const [y, m, d] = dateISO.split('-').map(Number); return Date.UTC(y, m - 1, d) - IST_MINUTES * MIN; };
export function shiftDate(dateISO, days) {
  const d = new Date(`${dateISO}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
const weekdayIST = dateISO => new Date(`${dateISO}T12:00:00Z`).getUTCDay(); // 0=रविवार

// ---------- पालन का दिन तय करने के नियम ----------
// हर नियम दिन के एक हिस्से (खिड़की) में तिथि की मौजूदगी देखता है
function ruleWindow(rule, dateISO, place) {
  const t = sunTimes(dateISO, place);
  if (t.sunrise == null) return null;
  const L = t.sunset - t.sunrise;
  switch (rule) {
    case 'sunrise': return [t.sunrise, t.sunrise + 1];
    case 'purvahna': return [t.sunrise, t.sunrise + 0.5 * L];
    case 'madhyahna': return [t.sunrise + 0.4 * L, t.sunrise + 0.6 * L];
    case 'aparahna': return [t.sunrise + 0.6 * L, t.sunrise + 0.8 * L];
    case 'sunset': return [t.sunset - 30 * MIN, t.sunset + 30 * MIN];
    case 'arunodaya': return [t.sunrise - 96 * MIN, t.sunrise];
    case 'pradosha': return [t.sunset, t.sunset + 144 * MIN];
    // करवा चौथ / संकष्टी: अपराह्न से चंद्रोदय (सूर्यास्त के ~3 घंटे बाद का मोटा अनुमान) तक
    case 'chandrodaya': return [t.sunrise + 0.6 * L, t.sunset + 180 * MIN];
    // सूर्यास्त से मध्यरात्रि तक (होलिका दहन के लिए)
    case 'night1': {
      const next = sunTimes(shiftDate(dateISO, 1), place);
      return [t.sunset, (t.sunset + next.sunrise) / 2];
    }
    case 'nishita': {
      const next = sunTimes(shiftDate(dateISO, 1), place);
      const mid = (t.sunset + next.sunrise) / 2;
      return [mid - 24 * MIN, mid + 24 * MIN];
    }
    default: return null;
  }
}

// पूर्णिमा का पहला आधा भाग हमेशा भद्रा (विष्टि करण) होता है; भद्रा तब ख़त्म होती है जब चंद्र-सूर्य दूरी 174° हो
function bhadraEnd(iv) {
  return solveElongation(174, (iv.start + iv.end) / 2);
}

// opts.prefer: 'first' (पहला दिन जिसमें तिथि खिड़की में मिले, डिफ़ॉल्ट) या 'max' (सबसे ज़्यादा मेल वाला दिन)
// opts.bhadra: भद्रा के बाद का हिस्सा ही गिनें (रक्षा बंधन, होलिका दहन)
// opts.fallbackRule: खिड़की में कहीं न मिले तो यह नियम आज़माएँ; opts.fallbackEnd: तब तिथि के अंतिम दिन पर रखें
function resolveDate(iv, rule, place, opts = {}) {
  const startsAt = opts.bhadra ? bhadraEnd(iv) : iv.start;
  const first = istDate(iv.start);
  const days = [];
  for (let day = first; day <= istDate(iv.end - 1); day = shiftDate(day, 1)) days.push(day);

  if (rule === 'ekadashi') {
    // स्मार्त नियम: सूर्योदय पर एकादशी हो और अरुणोदय (सूर्योदय से 96 मिनट पहले) पर दशमी न हो
    const hits = [];
    for (const day of days) {
      const t = sunTimes(day, place);
      if (t.sunrise == null) continue;
      if (iv.start <= t.sunrise && t.sunrise < iv.end) hits.push({ day, valid: iv.start <= t.sunrise - 96 * MIN });
    }
    const pick = hits.find(h => h.valid) || hits[0];
    return pick ? pick.day : first; // किसी सूर्योदय को न छुए (क्षय) तो जिस दिन शुरू हो
  }

  const tryRule = (r, from = startsAt) => {
    const cands = [];
    for (const day of days) {
      const w = ruleWindow(r, day, place);
      if (!w) continue;
      const ov = Math.max(0, Math.min(iv.end, w[1]) - Math.max(from, w[0]));
      if (ov <= 0) continue;
      // minFrac: तिथि खिड़की के कम-से-कम इतने हिस्से में हो, तभी वह दिन गिना जाए
      if (opts.minFrac && ov < opts.minFrac * (w[1] - w[0])) continue;
      cands.push({ day, ov });
    }
    if (!cands.length) return null;
    const top = Math.max(...cands.map(c => c.ov));
    if (opts.prefer === 'max') return cands.find(c => c.ov >= top - 1000).day;               // सबसे ज़्यादा मौजूदगी वाला दिन
    if (opts.prefer === 'last') return [...cands].reverse().find(c => c.ov >= top / 3).day;   // दोनों दिन तिथि हो तो दूसरा दिन
    return cands[0].day;                                                                     // पहला दिन जिसमें तिथि मिले
  };
  return tryRule(rule)
    // पूरी रात भद्रा रहे तो भद्रा-पुच्छ/भद्रा के बाद की विधि से पहली रात ही मानी जाती है
    || (opts.bhadra && opts.bhadraFallbackFirst && tryRule(rule, iv.start))
    || (opts.fallbackRule && tryRule(opts.fallbackRule))
    || (opts.fallbackEnd ? istDate(iv.end - 1) : first);
}

// ---------- एकादशी के नाम (अमांत मास के हिसाब से) ----------
const EKADASHI_SHUKLA = ['कामदा', 'मोहिनी', 'निर्जला', 'देवशयनी', 'पुत्रदा (श्रावण)', 'परिवर्तिनी', 'पापांकुशा', 'देवउठनी', 'मोक्षदा', 'पुत्रदा (पौष)', 'जया', 'आमलकी'];
const EKADASHI_KRISHNA = ['वरुथिनी', 'अपरा', 'योगिनी', 'कामिका', 'अजा', 'इंदिरा', 'रमा', 'उत्पन्ना', 'सफला', 'षटतिला', 'विजया', 'पापमोचनी'];

// संकष्टी चतुर्थी के नाम, अमांत मास के क्रम में (चैत्र..फाल्गुन); अधिक मास में 'विभुवन' (Drik 2026 से मिलाए गए)
const SANKASHTI = ['विकट', 'एकदंत', 'कृष्णपिंगल', 'गजानन', 'हेरंब', 'विघ्नराज', 'वक्रतुंड', 'गणाधिप', 'अखुरथ', 'लंबोदर', 'द्विजप्रिय', 'भालचंद्र'];
// विनायक (शुक्ल) चतुर्थी के नाम; जिनका नाम तय नहीं, उनमें सादा 'विनायक चतुर्थी'
const VINAYAKA = { 1: 'वासुदेव', 2: 'संकर्षण', 3: 'प्रद्युम्न', 5: 'दूर्वा गणपति', 7: 'कपर्दीश', 9: 'कृच्छ्र', 11: 'गौरी गणेश', 12: 'ढुंढिराज' };
const ORDINAL = ['प्रथम', 'द्वितीय', 'तृतीय', 'चतुर्थ', 'पंचम'];

// ---------- त्योहारों की सूची (अमांत मास; तिथि 1..30, 16 = कृष्ण प्रतिपदा, 30 = अमावस्या) ----------
// नियम: sunrise, purvahna, madhyahna, aparahna, sunset, pradosha, chandrodaya, night1, nishita, arunodaya, ekadashi
const FESTIVALS = [
  // चैत्र
  { id: 'ugadi', name: 'उगादि / गुड़ी पड़वा / नव संवत्सर', month: 1, tithi: 1, rule: 'sunrise' },
  { id: 'gangaur', name: 'गणगौर / गौरी तृतीया', month: 1, tithi: 3, rule: 'purvahna' },
  { id: 'yamuna-chhath', name: 'यमुना छठ', month: 1, tithi: 6, rule: 'sunrise' },
  { id: 'ram-navami', name: 'राम नवमी', month: 1, tithi: 9, rule: 'madhyahna' },
  { id: 'mahavir-jayanti', name: 'महावीर जयंती', month: 1, tithi: 13, rule: 'sunrise' },
  { id: 'hanuman-jayanti', name: 'हनुमान जयंती / चैत्र पूर्णिमा', month: 1, tithi: 15, rule: 'sunrise' },
  // वैशाख
  { id: 'narada-jayanti', name: 'नारद जयंती', month: 2, tithi: 16, rule: 'sunrise' },
  { id: 'parashurama-jayanti', name: 'परशुराम जयंती', month: 2, tithi: 3, rule: 'pradosha' },
  { id: 'akshaya-tritiya', name: 'अक्षय तृतीया', month: 2, tithi: 3, rule: 'purvahna', minFrac: 0.15 },
  { id: 'ganga-saptami', name: 'गंगा सप्तमी', month: 2, tithi: 7, rule: 'madhyahna' },
  { id: 'sita-navami', name: 'सीता नवमी', month: 2, tithi: 9, rule: 'madhyahna' },
  { id: 'narasimha-jayanti', name: 'नरसिंह जयंती', month: 2, tithi: 14, rule: 'sunset', prefer: 'last' },
  { id: 'buddha-purnima', name: 'बुद्ध पूर्णिमा', month: 2, tithi: 15, rule: 'sunrise' },
  { id: 'vat-savitri', name: 'वट सावित्री व्रत / शनि जयंती', month: 2, tithi: 30, rule: 'aparahna' },
  // ज्येष्ठ
  { id: 'mahesh-navami', name: 'महेश नवमी', month: 3, tithi: 9, rule: 'sunrise' },
  { id: 'ganga-dussehra', name: 'गंगा दशहरा', month: 3, tithi: 10, rule: 'sunrise' },
  { id: 'vat-purnima', name: 'वट पूर्णिमा व्रत / ज्येष्ठ पूर्णिमा', month: 3, tithi: 15, rule: 'aparahna' },
  // आषाढ़
  { id: 'rath-yatra', name: 'जगन्नाथ रथ यात्रा', month: 4, tithi: 2, rule: 'sunrise' },
  { id: 'guru-purnima', name: 'गुरु पूर्णिमा', month: 4, tithi: 15, rule: 'sunrise' },
  // श्रावण
  { id: 'hariyali-teej', name: 'हरियाली तीज', month: 5, tithi: 3, rule: 'purvahna' },
  { id: 'nag-panchami', name: 'नाग पंचमी', month: 5, tithi: 5, rule: 'madhyahna' },
  { id: 'raksha-bandhan', name: 'रक्षा बंधन', month: 5, tithi: 15, rule: 'aparahna', bhadra: true, fallbackRule: 'sunrise' },
  { id: 'kajari-teej', name: 'कजरी तीज', month: 5, tithi: 18, rule: 'sunrise' },
  { id: 'janmashtami', name: 'कृष्ण जन्माष्टमी', month: 5, tithi: 23, rule: 'sunrise' },
  // भाद्रपद
  { id: 'hartalika-teej', name: 'हरतालिका तीज', month: 6, tithi: 3, rule: 'sunrise' },
  { id: 'ganesh-chaturthi', name: 'गणेश चतुर्थी', month: 6, tithi: 4, rule: 'madhyahna' },
  { id: 'rishi-panchami', name: 'ऋषि पंचमी', month: 6, tithi: 5, rule: 'madhyahna' },
  { id: 'radha-ashtami', name: 'राधा अष्टमी', month: 6, tithi: 8, rule: 'sunrise' },
  { id: 'anant-chaturdashi', name: 'अनंत चतुर्दशी / गणेश विसर्जन', month: 6, tithi: 14, rule: 'sunrise' },
  { id: 'jivitputrika', name: 'जीवित्पुत्रिका व्रत (जितिया)', month: 6, tithi: 23, rule: 'sunrise' },
  { id: 'bhadrapada-purnima', name: 'भाद्रपद पूर्णिमा', month: 6, tithi: 15, rule: 'sunrise' },
  { id: 'sarva-pitru-amavasya', name: 'सर्वपितृ अमावस्या (महालय)', month: 6, tithi: 30, rule: 'aparahna' },
  // आश्विन
  { id: 'durga-ashtami', name: 'दुर्गा अष्टमी', month: 7, tithi: 8, rule: 'sunrise' },
  { id: 'maha-navami', name: 'महा नवमी', month: 7, tithi: 9, rule: 'aparahna' },
  { id: 'dussehra', name: 'दशहरा (विजयादशमी)', month: 7, tithi: 10, rule: 'aparahna' },
  { id: 'sharad-purnima', name: 'शरद पूर्णिमा (कोजागरी)', month: 7, tithi: 15, rule: 'nishita' },
  { id: 'karwa-chauth', name: 'करवा चौथ', month: 7, tithi: 19, rule: 'chandrodaya' },
  { id: 'ahoi-ashtami', name: 'अहोई अष्टमी', month: 7, tithi: 23, rule: 'pradosha' },
  { id: 'govatsa-dwadashi', name: 'गोवत्स द्वादशी', month: 7, tithi: 27, rule: 'pradosha' },
  { id: 'dhanteras', name: 'धनतेरस', month: 7, tithi: 28, rule: 'pradosha', prefer: 'max' },
  { id: 'kali-chaudas', name: 'काली चौदस / मासिक शिवरात्रि', month: 7, tithi: 29, rule: 'nishita' },
  { id: 'narak-chaturdashi', name: 'नरक चतुर्दशी (छोटी दिवाली)', month: 7, tithi: 29, rule: 'arunodaya' },
  { id: 'diwali', name: 'दीपावली (लक्ष्मी पूजन)', month: 7, tithi: 30, rule: 'pradosha', prefer: 'max' },
  // कार्तिक
  { id: 'govardhan-puja', name: 'गोवर्धन पूजा / अन्नकूट', month: 8, tithi: 1, rule: 'purvahna' },
  { id: 'bhai-dooj', name: 'भाई दूज', month: 8, tithi: 2, rule: 'aparahna', prefer: 'max' },
  { id: 'chhath', name: 'छठ पूजा (संध्या अर्घ्य)', month: 8, tithi: 6, rule: 'sunset' },
  { id: 'gopashtami', name: 'गोपाष्टमी', month: 8, tithi: 8, rule: 'purvahna' },
  { id: 'akshaya-navami', name: 'अक्षय नवमी (आंवला नवमी)', month: 8, tithi: 9, rule: 'purvahna' },
  { id: 'dev-uthani', name: 'देवउठनी एकादशी', month: 8, tithi: 11, rule: 'ekadashi' },
  { id: 'tulsi-vivah', name: 'तुलसी विवाह', month: 8, tithi: 12, rule: 'sunrise' },
  { id: 'vaikuntha-chaturdashi', name: 'वैकुंठ चतुर्दशी', month: 8, tithi: 14, rule: 'nishita' },
  { id: 'kartik-purnima', name: 'कार्तिक पूर्णिमा / गुरु नानक जयंती', month: 8, tithi: 15, rule: 'sunrise' },
  { id: 'dev-diwali', name: 'देव दिवाली', month: 8, tithi: 15, rule: 'pradosha', prefer: 'max' },
  { id: 'kalabhairav-jayanti', name: 'कालभैरव जयंती', month: 8, tithi: 23, rule: 'pradosha' },
  // मार्गशीर्ष
  { id: 'vivah-panchami', name: 'विवाह पंचमी', month: 9, tithi: 5, rule: 'madhyahna' },
  { id: 'gita-jayanti', name: 'गीता जयंती / मोक्षदा एकादशी', month: 9, tithi: 11, rule: 'ekadashi' },
  { id: 'dattatreya-jayanti', name: 'दत्तात्रेय जयंती / मार्गशीर्ष पूर्णिमा', month: 9, tithi: 15, rule: 'pradosha', prefer: 'max' },
  // पौष
  { id: 'pausha-purnima', name: 'पौष पूर्णिमा', month: 10, tithi: 15, rule: 'sunrise' },
  { id: 'sakat-chauth', name: 'सकट चौथ (तिलकुटा चतुर्थी)', month: 10, tithi: 19, rule: 'chandrodaya' },
  { id: 'mauni-amavasya', name: 'मौनी अमावस्या', month: 10, tithi: 30, rule: 'sunrise' },
  // माघ
  { id: 'ganesh-jayanti', name: 'गणेश जयंती (तिलकुंद चतुर्थी)', month: 11, tithi: 4, rule: 'sunrise' },
  { id: 'vasant-panchami', name: 'वसंत पंचमी', month: 11, tithi: 5, rule: 'purvahna' },
  { id: 'ratha-saptami', name: 'रथ सप्तमी', month: 11, tithi: 7, rule: 'sunrise' },
  { id: 'bhishma-ashtami', name: 'भीष्म अष्टमी', month: 11, tithi: 8, rule: 'madhyahna' },
  { id: 'magha-purnima', name: 'माघ पूर्णिमा', month: 11, tithi: 15, rule: 'sunrise' },
  { id: 'maha-shivaratri', name: 'महा शिवरात्रि', month: 11, tithi: 29, rule: 'nishita' },
  // फाल्गुन
  { id: 'holika-dahan', name: 'होलिका दहन', month: 12, tithi: 15, rule: 'night1', bhadra: true, bhadraFallbackFirst: true, fallbackEnd: true },
  { id: 'holi', name: 'होली (रंगवाली)', month: 12, tithi: 15, rule: 'night1', bhadra: true, bhadraFallbackFirst: true, fallbackEnd: true, offset: 1 },
  { id: 'rang-panchami', name: 'रंग पंचमी', month: 12, tithi: 20, rule: 'madhyahna' },
  { id: 'sheetala-ashtami', name: 'शीतला अष्टमी (बसौड़ा)', month: 12, tithi: 23, rule: 'purvahna' }
];

// कई दिन चलने वाले त्योहार: शुरू की तिथि से अंत की तिथि तक, हर दिन "दिन n/N" के साथ
const MULTI = [
  { id: 'chaitra-navratri', name: 'चैत्र नवरात्रि', month: 1, from: [1, 'sunrise'], to: [9, 'madhyahna'], toOffset: 0 },
  { id: 'ganeshotsav', name: 'गणेशोत्सव', month: 6, from: [4, 'madhyahna'], to: [14, 'sunrise'], toOffset: 0 },
  { id: 'pitru-paksha', name: 'पितृ पक्ष', month: 6, from: [16, 'aparahna'], to: [30, 'aparahna'], toOffset: 0 },
  { id: 'sharad-navratri', name: 'शारदीय नवरात्रि', month: 7, from: [1, 'sunrise'], to: [10, 'aparahna'], toOffset: -1 }
];

const SOLAR = [
  { id: 'makar-sankranti', name: 'मकर संक्रांति / पोंगल', target: 270, guess: '01-14' },
  { id: 'kumbha-sankranti', name: 'कुंभ संक्रांति', target: 300, guess: '02-13' },
  { id: 'meena-sankranti', name: 'मीन संक्रांति', target: 330, guess: '03-14' },
  { id: 'mesha-sankranti', name: 'मेष संक्रांति / बैसाखी', target: 0, guess: '04-14' },
  { id: 'vrishabha-sankranti', name: 'वृषभ संक्रांति', target: 30, guess: '05-15' },
  { id: 'mithuna-sankranti', name: 'मिथुन संक्रांति', target: 60, guess: '06-15' },
  { id: 'karka-sankranti', name: 'कर्क संक्रांति', target: 90, guess: '07-16' },
  { id: 'simha-sankranti', name: 'सिंह संक्रांति', target: 120, guess: '08-17' },
  { id: 'kanya-sankranti', name: 'कन्या संक्रांति / विश्वकर्मा पूजा', target: 150, guess: '09-17' },
  { id: 'tula-sankranti', name: 'तुला संक्रांति', target: 180, guess: '10-17' },
  { id: 'vrishchika-sankranti', name: 'वृश्चिक संक्रांति', target: 210, guess: '11-16' },
  { id: 'dhanu-sankranti', name: 'धनु संक्रांति', target: 240, guess: '12-16' }
];

const FIXED = [
  { md: '01-26', id: 'republic-day', name: 'गणतंत्र दिवस' },
  { md: '04-14', id: 'ambedkar-jayanti', name: 'आंबेडकर जयंती' },
  { md: '08-15', id: 'independence-day', name: 'स्वतंत्रता दिवस' },
  { md: '10-02', id: 'gandhi-jayanti', name: 'गांधी जयंती' },
  { md: '12-25', id: 'christmas', name: 'क्रिसमस' }
];

// ---------- ग्रहण की दृश्यता (मोटा अनुमान) ----------
// चंद्र ग्रहण (मध्य क्षण mx से ±2.5 घंटे) तब दिखता है जब वह रात के हिस्से को छुए, यानी चंद्रमा क्षितिज से ऊपर हो
function lunarEclipseSeen(mx, place) {
  const d = istDate(mx);
  const a = sunTimes(shiftDate(d, -1), place), b = sunTimes(d, place), c = sunTimes(shiftDate(d, 1), place);
  if ([a.sunset, b.sunrise, b.sunset, c.sunrise].some(x => x == null)) return true;
  const from = mx - 2.5 * 3600e3, to = mx + 2.5 * 3600e3;
  return [[a.sunset, b.sunrise], [b.sunset, c.sunrise]].some(([x, y]) => x < to && y > from);
}

// ---------- मुहूर्त (पूजा / पारण / चंद्रोदय के समय) ----------
// हर समय सूर्योदय-सूर्यास्त और तिथि की गणना से निकलता है। जो समय पक्का न निकले, वह दिखाया ही नहीं जाता।
const cutWin = (w, a, b) => { if (!w) return null; const s = Math.max(w[0], a), e = Math.min(w[1], b); return e > s ? [s, e] : null; };

// प्रदोष काल (Drik की परिभाषा): सूर्यास्त से रात्रि का पाँचवाँ भाग
function pradoshWindow(dateISO, place) {
  const t = sunTimes(dateISO, place), n = sunTimes(shiftDate(dateISO, 1), place);
  if (t.sunset == null || n.sunrise == null) return null;
  return [t.sunset, t.sunset + (n.sunrise - t.sunset) / 5];
}
// निशीथ काल: रात्रि के 15 मुहूर्तों में से आठवाँ, यानी ठीक मध्य में रात्रि/15 की अवधि
function nishitaWindow(dateISO, place) {
  const t = sunTimes(dateISO, place), n = sunTimes(shiftDate(dateISO, 1), place);
  if (t.sunset == null || n.sunrise == null) return null;
  const mid = (t.sunset + n.sunrise) / 2, half = (n.sunrise - t.sunset) / 30;
  return [mid - half, mid + half];
}
// एकादशी का पारण: द्वादशी में, हरि वासर (द्वादशी का पहला चौथाई) बीतने के बाद, सूर्योदय से दिन के पाँचवें भाग तक
// लौटाता है { day, hariVasaraEnd, dwadashiEnd, win } ; win = सुबह की पारण खिड़की (न बने तो null)
function paranaInfo(dateISO, place) {
  for (const off of [1, 2]) {
    const day = shiftDate(dateISO, off);
    const s = sunTimes(day, place);
    if (s.sunrise == null || s.sunset == null) return null;
    const dv = tithiAt(s.sunrise);
    if (dv.index === 11 || dv.index === 26) continue; // एकादशी अब भी चल रही है: अगला दिन देखें
    if (dv.index !== 12 && dv.index !== 27) return null;
    const hariVasaraEnd = dv.start + (dv.end - dv.start) / 4;
    const start = Math.max(s.sunrise, hariVasaraEnd);
    const end = Math.min(dv.end, s.sunrise + 0.2 * (s.sunset - s.sunrise));
    return { day, hariVasaraEnd, dwadashiEnd: dv.end, win: end > start ? [start, end] : null };
  }
  return null;
}

// चंद्रमा की ऊँचाई (डिग्री), स्थान (lat, lon) के लिए
function moonAltitude(ms, lat, lon) {
  const T = centuries(ms);
  const lam = moonLon(T), beta = moonLat(T), eps = 23.439291 - 0.0130042 * T;
  const dec = Math.asin(sind(beta) * cosd(eps) + cosd(beta) * sind(eps) * sind(lam));
  const ra = Math.atan2(sind(lam) * cosd(eps) - Math.tan(beta * RAD) * sind(eps), cosd(lam));
  const gmst = norm(280.46061837 + 360.98564736629 * (jdUT(ms) - 2451545));
  const H = (gmst + lon) * RAD - ra;
  const phi = lat * RAD;
  return Math.asin(Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(H)) / RAD;
}
const MOON_H0 = 0.125; // 0.7275 × औसत लंबन (0.9507°) − वायुमंडलीय अपवर्तन (0.5667°)
// उस दिन दोपहर के बाद पहला चंद्रोदय (ms), न मिले तो null
function moonrise(dateISO, place) {
  const s = sunTimes(dateISO, place);
  if (s.sunrise == null || s.sunset == null) return null;
  const lat = +place.lat, lon = +place.lon;
  const alt = ms => moonAltitude(ms, lat, lon) - MOON_H0;
  const from = s.sunrise + 0.5 * (s.sunset - s.sunrise), to = from + 24 * 3600e3;
  let prev = from, pa = alt(prev);
  for (let t = from + 10 * MIN; t <= to; t += 10 * MIN) {
    const a = alt(t);
    if (pa < 0 && a >= 0) {
      let lo = prev, hi = t;
      for (let i = 0; i < 40; i++) { const mid = (lo + hi) / 2; if (alt(mid) < 0) lo = mid; else hi = mid; }
      return hi;
    }
    prev = t; pa = a;
  }
  return null;
}

const PRADOSH_LABEL = { diwali: 'प्रदोष काल (लक्ष्मी पूजन)', dhanteras: 'प्रदोष काल (धनतेरस पूजा)', pradosh: 'प्रदोष काल (पूजा)', 'govatsa-dwadashi': 'प्रदोष काल (गोवत्स पूजा)', 'dev-diwali': 'प्रदोष काल (दीपदान)' };
const NISHITA_LABEL = { 'maha-shivaratri': 'निशीथ काल पूजा', 'masik-shivaratri': 'निशीथ काल पूजा', 'kali-chaudas': 'निशीथ काल पूजा', janmashtami: 'निशीथ पूजा समय', 'vaikuntha-chaturdashi': 'निशीथ काल', 'sharad-purnima': 'निशीथ काल (कोजागरा पूजा)' };

// किसी व्रत/त्योहार (id) के लिए उसके मुहूर्त: { muhurtas: [{label, start, end|null}], muhurta: पहला }
// तिथि का प्रारंभ-समाप्ति हर item में tithiStart / tithiEnd के रूप में पहले से रहता है।
function muhurtaInfo(id, rule, date, iv, place) {
  const out = [];
  const mk = (label, st, en = null) => out.push({ label, start: new Date(st), end: en == null ? null : new Date(en) });
  try {
    if (PRADOSH_LABEL[id]) {
      const w = pradoshWindow(date, place);
      if (cutWin(w, iv.start, iv.end)) mk(PRADOSH_LABEL[id], w[0], w[1]);
    }
    if (NISHITA_LABEL[id]) {
      const w = nishitaWindow(date, place);
      if (cutWin(w, iv.start, iv.end)) mk(NISHITA_LABEL[id], w[0], w[1]);
    }
    if (rule === 'ekadashi') {
      const pi = paranaInfo(date, place);
      if (pi && pi.win) mk('पारण समय (अगले दिन)', pi.win[0], pi.win[1]);
      else if (pi && pi.hariVasaraEnd < pi.dwadashiEnd) {
        mk('हरि वासर समाप्ति (पारण इसके बाद)', pi.hariVasaraEnd);
        mk('द्वादशी समाप्ति (पारण इससे पहले)', pi.dwadashiEnd);
      }
    }
    if (id === 'raksha-bandhan') {
      const after = bhadraEnd(iv), sun = sunTimes(date, place);
      // अपराह्न, न मिले तो प्रदोष, वह भी न मिले तो पूर्णिमा समाप्त होने से पहले की सुबह
      const w = cutWin(ruleWindow('aparahna', date, place), after, iv.end) || cutWin(pradoshWindow(date, place), after, iv.end)
        || (sun.sunrise != null ? cutWin([sun.sunrise, iv.end], after, iv.end) : null);
      if (w) mk('राखी बाँधने का समय (भद्रा के बाद)', w[0], w[1]);
    }
    if (id === 'holika-dahan') {
      // प्रदोष में भद्रा के बाद; न मिले तो भद्रा समाप्त होने से रात्रि के मध्य तक
      const a = Math.max(iv.start, bhadraEnd(iv));
      const w = cutWin(pradoshWindow(date, place), a, iv.end) || cutWin(ruleWindow('night1', date, place), a, iv.end);
      if (w) mk('होलिका दहन मुहूर्त (भद्रा के बाद)', w[0], w[1]);
    }
    if (id === 'karwa-chauth') {
      const sun = sunTimes(date, place), mr = moonrise(date, place);
      if (mr != null && sun.sunrise != null) { mk('उपवास काल (सूर्योदय से चंद्रोदय)', sun.sunrise, mr); mk('चंद्रोदय', mr); }
    }
    if (id === 'sankashti') {
      const mr = moonrise(date, place);
      if (mr != null) mk('चंद्रोदय', mr);
    }
    if (id === 'chhath') {
      const sun = sunTimes(date, place);
      if (sun.sunset != null) mk('सूर्यास्त (संध्या अर्घ्य)', sun.sunset);
    }
  } catch { /* कोई समय न निकले तो चुपचाप छोड़ दें */ }
  return out.length ? { muhurtas: out, muhurta: out[0] } : {};
}

// ---------- साल भर की गणना ----------
const yearCache = new Map();

function intervalsForYear(year) {
  const ivs = [];
  let t = istMidnight(`${year - 1}-12-01`);
  const endT = istMidnight(`${year + 1}-01-31`);
  while (t < endT) {
    const iv = tithiAt(t);
    const lm = lunarMonth((iv.start + iv.end) / 2);
    ivs.push({ ...iv, month: lm.month, adhika: lm.adhika });
    t = iv.end + 1000;
  }
  return ivs;
}

export function getFestivalCalendar(year, place = DEFAULT_PLACE) {
  const key = `${year}|${place.lat}|${place.lon}`;
  if (yearCache.has(key)) return yearCache.get(key);

  const byDate = new Map();
  const taken = new Set(); // `${date}|${tithi}`: नामी त्योहार वाली तिथि पर सामान्य व्रत दोबारा न दिखे
  const add = (date, item) => {
    if (!date.startsWith(String(year))) return;
    if (!byDate.has(date)) byDate.set(date, []);
    byDate.get(date).push(item);
  };
  const ivs = intervalsForYear(year);
  const tithiInfo = iv => ({ tithiIndex: iv.index, tithiLabel: tithiName(iv.index), tithiStart: new Date(iv.start), tithiEnd: new Date(iv.end) });

  for (const iv of ivs) {
    if (!iv.adhika) {
      for (const f of FESTIVALS) {
        if (f.month !== iv.month || f.tithi !== iv.index) continue;
        let base = resolveDate(iv, f.rule, place, f);
        // पूर्णिमा पर चंद्र ग्रहण हो तो होलिका दहन ग्रहण-समाप्ति के बाद, यानी तिथि के आख़िरी दिन (2026: 3 मार्च)
        if (f.id.startsWith('holi') && Math.abs(moonLatitudeAt(iv.end)) < 1.0 && lunarEclipseSeen(iv.end, place)) base = istDate(iv.end - 1);
        const date = f.offset ? shiftDate(base, f.offset) : base;
        taken.add(`${date}|${iv.index}`);
        add(date, { id: f.id, name: f.name, kind: 'festival', ...tithiInfo(iv), ...muhurtaInfo(f.id, f.rule, date, iv, place) });
      }
    }
  }

  // कई दिन के त्योहार
  for (const m of MULTI) {
    for (const iv of ivs) {
      if (iv.adhika || iv.month !== m.month || iv.index !== m.from[0]) continue;
      const endIv = ivs.find(x => x.start > iv.start && x.month === m.month && !x.adhika && x.index === m.to[0]);
      if (!endIv) continue;
      const startDate = resolveDate(iv, m.from[1], place);
      const endDate = shiftDate(resolveDate(endIv, m.to[1], place), m.toOffset);
      if (endDate < startDate) continue;
      const total = Math.round((istMidnight(endDate) - istMidnight(startDate)) / DAY) + 1;
      for (let i = 0, d = startDate; d <= endDate; i++, d = shiftDate(d, 1)) {
        add(d, { id: m.id, name: m.name, kind: 'festival', dayNo: i + 1, dayTotal: total });
      }
    }
  }

  // सामान्य (हर महीने के) व्रत
  // नियम हर व्रत के लिए Drik Panchang 2026 की तारीख़ों से मिलाकर चुने गए।
  // own: true = नामी त्योहार उसी तिथि पर पड़े तो भी यह व्रत अलग से दिखे (Drik भी दोनों दिखाता है)
  const WD_PRADOSH = ['रवि', 'सोम', 'भौम', 'बुध', 'गुरु', 'शुक्र', 'शनि'];
  for (const iv of ivs) {
    const tithi = iv.index;
    const mname = `${iv.adhika ? 'अधिक ' : ''}${MONTH_NAMES[iv.month - 1]}`;
    let spec = null;
    if (tithi === 11 || tithi === 26) {
      const shukla = tithi === 11;
      const name = iv.adhika ? (shukla ? 'पद्मिनी' : 'परमा') : (shukla ? EKADASHI_SHUKLA : EKADASHI_KRISHNA)[iv.month - 1];
      spec = { id: iv.adhika ? (shukla ? 'padmini-ekadashi' : 'parama-ekadashi') : 'ekadashi', name: `${name} एकादशी`, rule: 'ekadashi' };
    } else if (tithi === 15) spec = { id: 'purnima', name: `${mname} पूर्णिमा`, rule: 'sunrise' };
    else if (tithi === 30) spec = { id: 'amavasya', name: `${mname} अमावस्या`, rule: 'aparahna', own: true };
    else if (tithi === 13 || tithi === 28) spec = { id: 'pradosh', name: 'प्रदोष व्रत', rule: 'pradosha', prefer: 'max', own: true };
    else if (tithi === 19) spec = { id: 'sankashti', name: `${iv.adhika ? 'विभुवन' : SANKASHTI[iv.month - 1]} संकष्टी चतुर्थी`, rule: 'chandrodaya', own: true };
    else if (tithi === 4) spec = { id: 'vinayaka', name: `${iv.adhika ? 'वरद' : VINAYAKA[iv.month] || 'विनायक'} चतुर्थी`, rule: 'madhyahna' };
    else if (tithi === 6) spec = { id: 'skanda-sashti', name: 'स्कंद षष्ठी', rule: 'pradosha', prefer: 'max', own: true };
    else if (tithi === 8) spec = { id: 'masik-durgashtami', name: 'मासिक दुर्गाष्टमी', rule: 'sunrise', own: true };
    else if (tithi === 23) spec = { id: 'kalashtami', name: 'कालाष्टमी (मासिक कृष्ण जन्माष्टमी)', rule: 'pradosha', own: true };
    else if (tithi === 29) spec = { id: 'masik-shivaratri', name: iv.month === 4 && !iv.adhika ? 'सावन शिवरात्रि (मासिक शिवरात्रि)' : 'मासिक शिवरात्रि', rule: 'nishita', own: true };
    if (!spec) continue;
    const date = resolveDate(iv, spec.rule, place, spec);
    if (!spec.own && taken.has(`${date}|${tithi}`)) continue;
    let name = spec.name;
    if (spec.id === 'pradosh') name = `${WD_PRADOSH[weekdayIST(date)]} प्रदोष व्रत`;
    if (spec.id === 'sankashti' && weekdayIST(date) === 2) name = 'अंगारकी ' + name;
    if (spec.id === 'amavasya' && weekdayIST(date) === 1) name = 'सोमवती अमावस्या';
    if (spec.id === 'vinayaka' && weekdayIST(date) === 3) name += ' (बुधवार)';
    // ऊपर के नामी त्योहार में यही तिथि पहले से हो (जैसे महा शिवरात्रि) तो मासिक शिवरात्रि न दोहराएँ
    if (spec.id === 'masik-shivaratri' && taken.has(`${date}|${tithi}`)) continue;
    // 'अमावस्या' नाम का कोई त्योहार (मौनी, सर्वपितृ, हरियाली...) पहले से हो तो दोहराएँ नहीं
    if (spec.id === 'amavasya' && (byDate.get(date) || []).some(i => i.name.includes('अमावस्या'))) continue;
    add(date, { id: spec.id, name, kind: 'vrat', ...tithiInfo(iv), ...muhurtaInfo(spec.id, spec.rule, date, iv, place) });
  }

  // दिन-दर-दिन वाले व्रत: सूर्योदय पर नक्षत्र (रोहिणी व्रत, ओणम) और श्रावण के सोमवार/मंगलवार
  {
    const ords = { mon: 0, tue: 0 };
    let onamDone = false;
    for (let day = `${year}-01-01`; day.startsWith(String(year)); day = shiftDate(day, 1)) {
      const sun = sunTimes(day, place);
      if (sun.sunrise == null) continue;
      const moonSid = moonSidereal(sun.sunrise);
      const nak = Math.floor(moonSid / (360 / 27));
      if (nak === 3) {
        // सूर्योदय के आधे घंटे के भीतर रोहिणी ख़त्म हो जाए तो व्रत पिछले दिन माना जाता है (Drik, 28 जनवरी 2026)
        const hoursLeft = (4 * (360 / 27) - moonSid) / (13.176 / 24);
        const nakS = solveLongitude(moonSidereal, 3 * NAK, sun.sunrise - (((moonSid - 3 * NAK) / 13.176) * DAY), 13.176);
        const nakE = solveLongitude(moonSidereal, 4 * NAK, sun.sunrise + (((4 * NAK - moonSid) / 13.176) * DAY), 13.176);
        const rohini = { label: 'रोहिणी नक्षत्र', start: new Date(nakS), end: new Date(nakE) };
        add(hoursLeft < 0.5 ? shiftDate(day, -1) : day, { id: 'rohini-vrat', name: 'रोहिणी व्रत', kind: 'vrat', note: 'रोहिणी नक्षत्र', muhurtas: [rohini], muhurta: rohini });
      }
      const sSun = sunSidereal(sun.sunrise);
      if (!onamDone && nak === 21 && sSun >= 120 && sSun < 150) {
        add(day, { id: 'onam', name: 'ओणम (थिरुवोणम)', kind: 'festival' });
        onamDone = true;
      }
      const iv = ivs.find(x => x.start <= sun.sunrise && sun.sunrise < x.end);
      const shravanNorth = iv && !iv.adhika && ((iv.month === 4 && iv.index >= 16) || (iv.month === 5 && iv.index <= 15));
      if (shravanNorth) {
        const wd = weekdayIST(day);
        if (wd === 1) add(day, { id: 'shravan-somvar', name: `${ORDINAL[ords.mon++]} श्रावण सोमवार व्रत`, kind: 'vrat' });
        if (wd === 2) add(day, { id: 'mangala-gauri', name: `${ORDINAL[ords.tue++]} मंगला गौरी व्रत`, kind: 'vrat' });
      }
    }
  }

  // सौर संक्रांति: क्षण सूर्यास्त से पहले हो तो उसी दिन, वरना अगले दिन
  for (const s of SOLAR) {
    const guess = istMidnight(`${year}-${s.guess}`);
    const t = solveSunSidereal(s.target, guess);
    let date = istDate(t);
    const sun = sunTimes(date, place);
    if (s.id === 'makar-sankranti' && sun.sunset != null && t > sun.sunset) date = shiftDate(date, 1); // पुण्यकाल अगले दिन
    const hhmm = new Date(t + IST_MINUTES * MIN).toISOString().slice(11, 16);
    if (s.id === 'makar-sankranti') add(shiftDate(date, -1), { id: 'lohri', name: 'लोहड़ी', kind: 'festival' });
    const sk = { label: 'संक्रांति क्षण', start: new Date(t), end: null };
    add(date, { id: s.id, name: s.name, kind: 'festival', note: `संक्रांति क्षण: ${istDate(t).slice(8)}-${istDate(t).slice(5, 7)} ${hhmm} IST`, sankrantiAt: new Date(t), muhurtas: [sk], muhurta: sk });
  }

  // ग्रहण: अमावस्या के अंत पर सूर्य ग्रहण, पूर्णिमा के अंत पर चंद्र ग्रहण; चंद्रमा का शर छोटा हो तो ही
  for (const iv of ivs) {
    if (iv.index !== 15 && iv.index !== 30) continue;
    const lat = Math.abs(moonLatitudeAt(iv.end));
    const date = istDate(iv.end);
    if (iv.index === 30 && lat < 1.5) add(date, { id: 'surya-grahan', name: 'सूर्य ग्रहण', kind: 'grahan', note: 'दृश्यता स्थान के अनुसार; स्थानीय पंचांग देखें' });
    if (iv.index === 15 && lat < 1.58) add(date, { id: 'chandra-grahan', name: lat < 1.0 ? 'चंद्र ग्रहण' : 'चंद्र ग्रहण (उपच्छाया)', kind: 'grahan', note: lunarEclipseSeen(iv.end, place) ? 'इस स्थान से दिखाई देगा' : 'इस स्थान से दिखाई नहीं देगा' });
  }

  for (const f of FIXED) add(`${year}-${f.md}`, { id: f.id, name: f.name, kind: 'national' });

  const order = { festival: 0, grahan: 1, national: 2, vrat: 3 };
  for (const list of byDate.values()) list.sort((a, b) => order[a.kind] - order[b.kind]);
  yearCache.set(key, byDate);
  return byDate;
}

// उस तारीख़ (YYYY-MM-DD, IST) के व्रत-त्योहार; कुछ न हो तो खाली सूची
export function getFestivalsForDate(dateISO, place = DEFAULT_PLACE) {
  return getFestivalCalendar(Number(dateISO.slice(0, 4)), place).get(dateISO) || [];
}

// किसी महीने (1..12) की सभी तारीख़ें और उनके त्योहार: [{date, items}]
export function getFestivalsForMonth(year, month, place = DEFAULT_PLACE) {
  const prefix = `${year}-${String(month).padStart(2, '0')}-`;
  return [...getFestivalCalendar(year, place).entries()]
    .filter(([d]) => d.startsWith(prefix))
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([date, items]) => ({ date, items }));
}

// आने वाले दिनों के व्रत-त्योहार: fromDateISO के बाद के `days` दिन (opts.includeStart: true तो fromDateISO समेत)।
// जिस दिन कुछ न हो वह दिन सूची में नहीं आता। हर प्रविष्टि: { date, daysAway, weekday, items }
export function getUpcomingFestivals(fromDateISO, days = 30, place = DEFAULT_PLACE, opts = {}) {
  const out = [];
  for (let n = opts.includeStart ? 0 : 1; n <= days; n++) {
    const date = shiftDate(fromDateISO, n);
    const items = getFestivalsForDate(date, place);
    if (items.length) out.push({ date, daysAway: n, weekday: WEEKDAYS_HI[weekdayIST(date)], items });
  }
  return out;
}

// दिन की पूरी जानकारी (सूर्योदय के समय की स्थिति): वार, तिथि, नक्षत्र, योग, करण, चांद्र मास, संवत
function solveLongitude(fn, target, guess, ratePerDay) {
  let t = guess;
  for (let i = 0; i < 40; i++) {
    const d = wrap180(target - fn(t));
    t += (d / ratePerDay) * DAY;
    if (Math.abs(d) < 1e-6) break;
  }
  return t;
}
const NAK = 360 / 27;

export function getDayBasics(dateISO, place = DEFAULT_PLACE) {
  const t = sunTimes(dateISO, place);
  const ref = t.sunrise ?? istMidnight(dateISO) + 6 * 3600e3;

  const iv = tithiAt(ref);
  const lm = lunarMonth(ref);
  const shukla = iv.index <= 15;

  const moon = moonSidereal(ref);
  const nk = Math.floor(moon / NAK);
  const nakEnd = solveLongitude(moonSidereal, ((nk + 1) * NAK) % 360, ref + ((((nk + 1) * NAK - moon) / 13.176) * DAY), 13.176);

  const yogaVal = ms => norm(moonSidereal(ms) + sunSidereal(ms));
  const yv = yogaVal(ref);
  const yk = Math.floor(yv / NAK);
  const yogaEnd = solveLongitude(yogaVal, ((yk + 1) * NAK) % 360, ref + ((((yk + 1) * NAK - yv) / 14.162) * DAY), 14.162);

  const e = elongation(ref);
  const kn = Math.floor(e / 6) + 1; // 1..60
  const karanaEnd = solveElongation((kn * 6) % 360, ref + ((((kn * 6) - e) / MEAN_ELONG_RATE) * DAY));

  const purnimantaMonth = shukla ? lm.month : (lm.month % 12) + 1;
  const [gy, gm] = dateISO.split('-').map(Number);
  const beforeNewYear = gm <= 6 && lm.month >= 10; // चैत्र शुक्ल प्रतिपदा से पहले
  return {
    date: dateISO,
    weekday: WEEKDAYS_HI[weekdayIST(dateISO)],
    sunrise: t.sunrise == null ? null : new Date(t.sunrise),
    sunset: t.sunset == null ? null : new Date(t.sunset),
    tithiIndex: iv.index,
    tithiLabel: tithiName(iv.index),
    paksha: shukla ? 'शुक्ल पक्ष' : 'कृष्ण पक्ष',
    tithiEnd: new Date(iv.end),
    nakshatra: NAKSHATRAS[nk],
    nakshatraEnd: new Date(nakEnd),
    yoga: YOGAS[yk],
    yogaEnd: new Date(yogaEnd),
    karana: karanaName(kn),
    karanaEnd: new Date(karanaEnd),
    amantaMonth: `${lm.adhika ? 'अधिक ' : ''}${MONTH_NAMES[lm.month - 1]}`,
    purnimantaMonth: `${lm.adhika ? 'अधिक ' : ''}${MONTH_NAMES[purnimantaMonth - 1]}`,
    vikramSamvat: gy + (beforeNewYear ? 56 : 57),
    shakaSamvat: gy - (beforeNewYear ? 79 : 78)
  };
}
export function todayIST() { return istDate(Date.now()); }

// ---------- आज का पूरा पंचांग (सूर्योदय से अगले सूर्योदय तक, Drik जैसी सूची) ----------
function dayRises(dateISO, place, from, to) {
  const lat = +place.lat, lon = +place.lon;
  const alt = ms => moonAltitude(ms, lat, lon) - MOON_H0;
  const cross = (a0, b0, up) => {
    let prev = a0, pa = alt(prev);
    for (let t = a0 + 10 * MIN; t <= b0; t += 10 * MIN) {
      const a = alt(t);
      if (up ? (pa < 0 && a >= 0) : (pa >= 0 && a < 0)) {
        let lo = prev, hi = t;
        for (let i = 0; i < 40; i++) { const mid = (lo + hi) / 2; if ((alt(mid) < 0) === up) lo = mid; else hi = mid; }
        return hi;
      }
      prev = t; pa = a;
    }
    return null;
  };
  // Drik की तरह: उसी कैलेंडर-दिन (00:00–24:00 IST) में जो चंद्रोदय/चंद्रास्त पड़े
  return { rise: cross(from, to, true), set: cross(from, to, false) };
}

// [{label, end:Date|null}] : start से end तक जो-जो मान बदलते हैं
function segments(start, end, fn) {
  const out = [];
  let ms = start;
  for (let i = 0; i < 8; i++) {
    const v = fn(ms);
    out.push({ label: v.label, end: v.end >= end ? null : new Date(v.end) });
    if (v.end >= end) break;
    ms = v.end + MIN;
  }
  return out;
}

export function getPanchangDay(dateISO, place = DEFAULT_PLACE) {
  const base = getDayBasics(dateISO, place);
  const t = sunTimes(dateISO, place);
  const next = sunTimes(shiftDate(dateISO, 1), place);
  const start = t.sunrise ?? istMidnight(dateISO) + 6 * 3600e3;
  const end = next.sunrise ?? start + DAY;

  const tithis = segments(start, end, ms => { const iv = tithiAt(ms); return { label: tithiName(iv.index), end: iv.end }; });
  const nakshatras = segments(start, end, ms => {
    const m = moonSidereal(ms), k = Math.floor(m / NAK);
    return { label: NAKSHATRAS[k], end: solveLongitude(moonSidereal, ((k + 1) * NAK) % 360, ms + ((((k + 1) * NAK - m) / 13.176) * DAY), 13.176) };
  });
  const yogaVal = ms => norm(moonSidereal(ms) + sunSidereal(ms));
  const yogas = segments(start, end, ms => {
    const v = yogaVal(ms), k = Math.floor(v / NAK);
    return { label: YOGAS[k], end: solveLongitude(yogaVal, ((k + 1) * NAK) % 360, ms + ((((k + 1) * NAK - v) / 14.162) * DAY), 14.162) };
  });
  const karanas = segments(start, end, ms => {
    const e = elongation(ms), kn = Math.floor(e / 6) + 1;
    return { label: karanaName(kn), end: solveElongation((kn * 6) % 360, ms + ((kn * 6 - e) / MEAN_ELONG_RATE) * DAY) };
  });
  const RASHI = ['मेष', 'वृषभ', 'मिथुन', 'कर्क', 'सिंह', 'कन्या', 'तुला', 'वृश्चिक', 'धनु', 'मकर', 'कुंभ', 'मीन'];
  const moonRashi = segments(start, end, ms => {
    const m = moonSidereal(ms), k = Math.floor(m / 30);
    return { label: RASHI[k], end: solveLongitude(moonSidereal, ((k + 1) * 30) % 360, ms + ((((k + 1) * 30 - m) / 13.176) * DAY), 13.176) };
  });
  const sv = sunSidereal(start);

  const mr = dayRises(dateISO, place, istMidnight(dateISO), istMidnight(dateISO) + DAY);
  if (mr.rise == null || mr.set == null) { // उस दिन न पड़े तो अगले दिन का समय (Drik जैसा, तारीख़ के साथ दिखाया जाएगा)
    const nx = dayRises(dateISO, place, istMidnight(dateISO) + DAY, istMidnight(dateISO) + 2 * DAY);
    if (mr.rise == null) mr.rise = nx.rise;
    if (mr.set == null) mr.set = nx.set;
  }
  const lm = lunarMonth(start);
  const shukla = base.tithiIndex <= 15;
  const gujarati = (lm.month > 8 || (lm.month === 8 && shukla)) ? base.vikramSamvat : base.vikramSamvat - 1;
  return {
    ...base,
    start: new Date(start), end: new Date(end),
    moonrise: mr.rise == null ? null : new Date(mr.rise),
    moonset: mr.set == null ? null : new Date(mr.set),
    tithis, nakshatras, yogas, karanas, moonRashi,
    sunRashi: RASHI[Math.floor(sv / 30)],
    sunNakshatra: NAKSHATRAS[Math.floor(sv / NAK)],
    gujaratiSamvat: gujarati
  };
}
export { ayanamsa, centuries, jdUT };

// ---------- दिन के शुभ-अशुभ काल: राहुकाल, यमगंड, गुलिक, अभिजीत, ब्रह्म मुहूर्त ----------
// दिन (सूर्योदय-सूर्यास्त) को 8 बराबर भाग; वार के अनुसार कौन-सा भाग (1..8)
const RAHU_PART = [8, 2, 7, 5, 6, 4, 3];   // रवि..शनि
const YAMA_PART = [5, 4, 3, 2, 1, 7, 6];
const GULIKA_PART = [7, 6, 5, 4, 3, 2, 1];
export function getDayTimes(dateISO, place = DEFAULT_PLACE) {
  const t = sunTimes(dateISO, place);
  if (t.sunrise == null || t.sunset == null) return null;
  const wd = weekdayIST(dateISO), L = t.sunset - t.sunrise, eighth = L / 8, fifteenth = L / 15;
  const part = n => ({ start: new Date(t.sunrise + (n - 1) * eighth), end: new Date(t.sunrise + n * eighth) });
  return {
    sunrise: new Date(t.sunrise), sunset: new Date(t.sunset),
    rahu: part(RAHU_PART[wd]), yama: part(YAMA_PART[wd]), gulika: part(GULIKA_PART[wd]),
    abhijit: { start: new Date(t.sunrise + 7 * fifteenth), end: new Date(t.sunrise + 8 * fifteenth) },
    brahma: { start: new Date(t.sunrise - 96 * MIN), end: new Date(t.sunrise - 48 * MIN) },
    dayLengthMin: Math.round(L / MIN)
  };
}
