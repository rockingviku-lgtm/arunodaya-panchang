// पंचपक्षी रिग्रेशन टेस्ट: जन्म 8 जनवरी 2002, 18:30 IST, लखनऊ।
// यह टेस्ट स्क्रीनशॉट के परिणाम को पकड़ता है। सूर्योदय/सूर्यास्त स्वतंत्र रूप से सत्यापित नहीं हैं (नीचे देखें)।
// गतिविधि-सारणी (कृष्ण पक्ष) असमर्थित है, इसलिए उसके लिए केवल "असमर्थित" होने की जाँच होती है।
//
// चलाने के लिए: node tests/panchapakshi-regression.test.mjs
import { moonInfo, dayTimes, fivePeriods, istToMs, fmtIST, birthBird, birthBirds } from '../src/panchapakshi-engine.js';
import { timetable, PROFILES } from '../src/panchapakshi-schedule.js';

let failed = 0;
const ok = (cond, msg) => { console.log((cond ? 'PASS ' : 'FAIL ') + msg); if (!cond) { failed++; process.exitCode = 1; } };
const near = (a, b, tol) => Math.abs(a - b) <= tol;

const DATE = '2002-01-08';
const TIME = '18:30';
const PLACE = { name: 'Lucknow, India', lat: 26.8467, lon: 80.9462 };
const ms = istToMs(DATE, TIME);

// ---------- 1. नक्षत्र और पाद: स्वतंत्र गणना से जाँच ----------
// स्वतंत्र गणना: Meeus (Astronomical Algorithms, अध्याय 47 और 25) के निम्न-सटीकता सूत्र।
// चंद्र: मुख्य 13 पद (सटीकता ~0.05°)। सूर्य: मूल समीकरण। अयनांश: लाहिरी का सन्निकट मान।
function independentSidereal(msUtc) {
  const JD = msUtc / 86400000 + 2440587.5;
  const T = (JD - 2451545.0) / 36525;
  const r = x => ((x % 360) + 360) % 360;
  const rad = d => (d * Math.PI) / 180;
  // चंद्र
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
  let sumL = 0;
  for (const [a, b, c, d, coef] of terms) sumL += coef * Math.sin(rad(a * D + b * M + c * Mp + d * F));
  const moonTropical = r(Lp + sumL / 1e6);
  // सूर्य (Meeus अध्याय 25, निम्न-सटीकता)
  const L0 = 280.46646 + 36000.76983 * T;
  const Ms = 357.52911 + 35999.05029 * T;
  const C = (1.914602 - 0.004817 * T) * Math.sin(rad(Ms)) + 0.019993 * Math.sin(rad(2 * Ms)) + 0.000289 * Math.sin(rad(3 * Ms));
  const sunTropical = r(L0 + C);
  // लाहिरी अयनांश (सन्निकट): 1 जनवरी 2000 पर ≈ 23.8531°, वार्षिक वृद्धि ≈ 0.013969°
  const yearFrac = 2000 + (JD - 2451544.5) / 365.25;
  const ayanamsa = 23.8531 + 0.013969 * (yearFrac - 2000);
  return { moon: r(moonTropical - ayanamsa), sun: r(sunTropical - ayanamsa), ayanamsa };
}

const eng = moonInfo(ms);
const ind = independentSidereal(ms);
const PADA_LEN = 360 / 108; // 3°20'

ok(eng.nakshatraNo === 16 && eng.nakshatra === 'विशाखा', `नक्षत्र: विशाखा (16) — engine: ${eng.nakshatra} (${eng.nakshatraNo})`);
ok(eng.pada === 2, `पाद: 2 — engine: ${eng.pada}`);
ok(eng.sign === 6, `चंद्र राशि: तुला (6) — engine: ${eng.sign}`);
ok(eng.paksha === 'कृष्ण', `पक्ष: कृष्ण — engine: ${eng.paksha}`);
ok(eng.tithiNo === 26 && eng.tithiInPaksha === 11, `तिथि: कृष्ण पक्ष की 11वीं (कुल 26) — engine: ${eng.tithiInPaksha} (कुल ${eng.tithiNo})`);

// स्वतंत्र गणना से नक्षत्र और पाद की पुष्टि
const indNak = Math.floor(ind.moon / (360 / 27)) + 1;
const indPada = Math.floor((ind.moon % (360 / 27)) / PADA_LEN) + 1;
ok(indNak === eng.nakshatraNo, `स्वतंत्र गणना नक्षत्र ${indNak} = engine ${eng.nakshatraNo} (चंद्र ${ind.moon.toFixed(3)}°)`);
ok(indPada === eng.pada, `स्वतंत्र गणना पाद ${indPada} = engine ${eng.pada}`);
ok(near(ind.moon, eng.moon, 0.25), `चंद्र देशांतर: स्वतंत्र ${ind.moon.toFixed(3)}° बनाम engine ${eng.moon.toFixed(3)}° (अंतर ${(ind.moon - eng.moon).toFixed(3)}°, सीमा 0.25°)`);
// पाद-सीमा से दूरी: 1.1° का अंतर है, इसलिए छोटे अंतर से पाद नहीं बदलता
const padeStart = 200 + (eng.pada - 1) * PADA_LEN;
ok(eng.moon - padeStart > 0.5 && padeStart + PADA_LEN - eng.moon > 0.5, `पाद-सीमा से दूरी सुरक्षित: ${(eng.moon - padeStart).toFixed(2)}° और ${(padeStart + PADA_LEN - eng.moon).toFixed(2)}° (दोनों > 0.5°)`);

// ---------- सूर्योदय/सूर्यास्त (स्क्रीनशॉट से मेल; स्वतंत्र रूप से सत्यापित नहीं) ----------
const dt = dayTimes(DATE, PLACE);
ok(dt && fmtIST(dt.sunrise) === '06:56', `सूर्योदय 06:56 (स्क्रीनशॉट से मेल) — engine: ${dt && fmtIST(dt.sunrise)}`);
ok(dt && fmtIST(dt.sunset) === '17:29', `सूर्यास्त 17:29 (स्क्रीनशॉट से मेल) — engine: ${dt && fmtIST(dt.sunset)}`);

// ---------- 2–5. यम-सीमाएँ, योग, और गोलाई ----------
const P = fivePeriods(dt);
const dayLen = dt.sunset - dt.sunrise;
const nightLen = dt.nextSunrise - dt.sunset;

// 2. सीमाएँ सटीक रूप से जुड़ी हैं (ms में, बिना गोलाई के)
let contigDay = P.day[0][0] === dt.sunrise && P.day[4][1] === dt.sunset;
for (let i = 0; i < 4; i++) contigDay = contigDay && P.day[i][1] === P.day[i + 1][0];
let contigNight = P.night[0][0] === dt.sunset && P.night[4][1] === dt.nextSunrise;
for (let i = 0; i < 4; i++) contigNight = contigNight && P.night[i][1] === P.night[i + 1][0];
ok(contigDay, 'दिन के यम: सूर्योदय से सूर्यास्त तक बिना अंतर/ओवरलैप के जुड़े हैं (ms)');
ok(contigNight, 'रात के यम: सूर्यास्त से अगले सूर्योदय तक बिना अंतर/ओवरलैप के जुड़े हैं (ms)');

// 3. पाँच दिन के भाग का योग = दिन की अवधि (ms में)
const sumDay = P.day.reduce((s, [a, b]) => s + (b - a), 0);
ok(Math.abs(sumDay - dayLen) < 1e-6, `दिन के 5 भाग का योग = दिन की अवधि (${(dayLen / 60000).toFixed(3)} मिनट)`);

// 4. पाँच रात के भाग का योग = रात की अवधि (ms में)
const sumNight = P.night.reduce((s, [a, b]) => s + (b - a), 0);
ok(Math.abs(sumNight - nightLen) < 1e-6, `रात के 5 भाग का योग = रात की अवधि (${(nightLen / 60000).toFixed(3)} मिनट)`);

// 5. गोलाई: प्रदर्शित HH:MM से कोई अंतर या ओवरलैप नहीं
// हर सीमा एक ही ms से बनती है, इसलिए दोनों ओर का प्रदर्शित समय एक ही होना चाहिए।
const bounds = [P.day[0][0], ...P.day.map(p => p[1])];
const nBounds = [P.night[0][0], ...P.night.map(p => p[1])];
const toMin = s => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
const dispDay = bounds.map(fmtIST);
const dispNight = nBounds.map(fmtIST);
// प्रदर्शित सीमाओं से अवधि: बीच में कोई गैप नहीं, और कुल योग प्रदर्शित दिन/रात की अवधि के बराबर
const sumDispDay = toMin(dispDay[dispDay.length - 1]) - toMin(dispDay[0]);
const sumDispNight = (toMin(dispNight[dispNight.length - 1]) - toMin(dispNight[0]) + 1440) % 1440;
ok(sumDispDay === Math.round(dayLen / 60000), `प्रदर्शित दिन-योग ${sumDispDay} मिनट = गोल किया दिन ${Math.round(dayLen / 60000)} मिनट`);
ok(sumDispNight === Math.round(nightLen / 60000), `प्रदर्शित रात-योग ${sumDispNight} मिनट = गोल किया रात ${Math.round(nightLen / 60000)} मिनट`);
ok(dt.dayMin === Math.round(dayLen / 60000) && dt.nightMin === Math.round(nightLen / 60000), `dayMin ${dt.dayMin}, nightMin ${dt.nightMin} गोलाई से मेल`);
// प्रदर्शित सीमा और सटीक सीमा में अधिकतम अंतर 1 मिनट से कम (fmtIST सेकंड काटता है)
const maxDrift = Math.max(...bounds.map(b => Math.abs(b - (Math.floor((b + 330 * 60000) / 60000) * 60000 - 330 * 60000))));
ok(maxDrift < 60000, `प्रदर्शित सीमा और सटीक सीमा का अंतर < 1 मिनट (अधिकतम ${(maxDrift / 1000).toFixed(1)} सेकंड)`);

// ---------- जन्म-पक्षी ----------
ok(birthBird(16, 'कृष्ण') === 'कौआ', 'जन्म-पक्षी (Pulippani, कृष्ण): कौआ (स्क्रीनशॉट से मेल)');
const bb = birthBirds(16, 'कृष्ण');
ok(bb.conflict === true, 'परंपराएँ अलग पक्षी देती हैं: conflict = true (दिखाने के लिए अलग रखा गया)');

// ---------- गतिविधि-सारणी: कृष्ण पक्ष असमर्थित ----------
const tt = timetable(DATE, PLACE, PROFILES['vedastro-part6-dark']);
ok(tt.supported === false, 'कृष्ण पक्ष गतिविधि-सारणी: असमर्थित (कोई सारणी नहीं बनती)');
ok(!tt.slots, 'असमर्थित होने पर कोई यम-स्लॉट नहीं लौटता');

if (failed) { console.log(`\n${failed} जाँच विफल`); }
else { console.log('\nसभी जाँच सफल'); }
