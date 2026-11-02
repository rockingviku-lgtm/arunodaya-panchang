// ज्योतिष टूल का हिसाब (बिना DOM): बेबी नेम, वैदिक समय (घटी-पल), श्राद्ध तिथि, 1000 चंद्रोदय (सहस्र चंद्र दर्शन)।
// साइट के पेज (jyotish-pages.js) और चैटबॉट (functions/api/chat.js) दोनों यही फ़ाइल इस्तेमाल करते हैं।
import {
  DEFAULT_PLACE, NAKSHATRAS, WEEKDAYS_HI, MONTH_NAMES, moonSidereal, elongation, tithiAt, tithiName, lunarMonth, sunTimes, todayIST, shiftDate
} from './festival-calendar.js';
import { RASHI_HI } from './graha-engine.js';

const MIN = 60000, DAY = 86400000, IST = 330 * MIN;
export const istISO = ms => new Date(ms + IST).toISOString();
export const istDay = ms => istISO(ms).slice(0, 10);
export const istMs = (iso, hm = '12:00') => Date.parse(`${iso}T${hm.length === 4 ? '0' + hm : hm}:00+05:30`);
const MONTHS_HI = ['जनवरी', 'फ़रवरी', 'मार्च', 'अप्रैल', 'मई', 'जून', 'जुलाई', 'अगस्त', 'सितंबर', 'अक्टूबर', 'नवंबर', 'दिसंबर'];
export const fmtDay = iso => `${+iso.slice(8, 10)} ${MONTHS_HI[+iso.slice(5, 7) - 1]} ${iso.slice(0, 4)}`;
const wdOf = iso => WEEKDAYS_HI[new Date(`${iso}T12:00:00Z`).getUTCDay()];
const clock = ms => new Intl.DateTimeFormat('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' }).format(new Date(ms)).toUpperCase();
export const fmtDT = ms => `${fmtDay(istDay(ms))}, ${clock(ms)}`;

// ---------- 1. बेबी नेम: जन्म नक्षत्र और चरण से नाम का पहला अक्षर ----------
// परंपरागत 27 नक्षत्र × 4 चरण की तालिका (चूँकि क्षेत्रीय पद्धतियों में थोड़ा भेद संभव है, पंडित से पुष्टि उचित)
export const NAME_LETTERS = [
  ['चू', 'चे', 'चो', 'ला'], ['ली', 'लू', 'ले', 'लो'], ['अ', 'ई', 'उ', 'ए'], ['ओ', 'वा', 'वी', 'वू'], ['वे', 'वो', 'का', 'की'],
  ['कू', 'घ', 'ङ', 'छ'], ['के', 'को', 'हा', 'ही'], ['हू', 'हे', 'हो', 'डा'], ['डी', 'डू', 'डे', 'डो'], ['मा', 'मी', 'मू', 'मे'],
  ['मो', 'टा', 'टी', 'टू'], ['टे', 'टो', 'पा', 'पी'], ['पू', 'ष', 'ण', 'ठ'], ['पे', 'पो', 'रा', 'री'], ['रू', 'रे', 'रो', 'ता'],
  ['ती', 'तू', 'ते', 'तो'], ['ना', 'नी', 'नू', 'ने'], ['नो', 'या', 'यी', 'यू'], ['ये', 'यो', 'भा', 'भी'], ['भू', 'धा', 'फा', 'ढा'],
  ['भे', 'भो', 'जा', 'जी'], ['खी', 'खू', 'खे', 'खो'], ['गा', 'गी', 'गू', 'गे'], ['गो', 'सा', 'सी', 'सू'], ['से', 'सो', 'दा', 'दी'],
  ['दू', 'थ', 'झ', 'ञ'], ['दे', 'दो', 'चा', 'ची']
];
export function moonBirthInfo(ms) {
  const lon = moonSidereal(ms), w = 360 / 27;
  const nak = Math.floor(lon / w), pada = Math.floor((lon - nak * w) / (w / 4)) + 1;
  return { lon, nak, nakshatra: NAKSHATRAS[nak], pada, rashiIdx: Math.floor(lon / 30), rashi: RASHI_HI[Math.floor(lon / 30)] };
}
export function babyName(dateISO, timeHM = '12:00') {
  const ms = istMs(dateISO, timeHM), m = moonBirthInfo(ms), letters = NAME_LETTERS[m.nak];
  return { janm: `${fmtDay(dateISO)}, ${timeHM} (भारतीय समय)`, nakshatra: m.nakshatra, charan: m.pada, chandra_rashi: m.rashi, pehla_akshar: letters[m.pada - 1], charon_ke_akshar: letters, nak_index: m.nak };
}

// ---------- 2. वैदिक समय: घड़ी का समय ↔ घटी-पल (सूर्योदय से गिनती) ----------
// 1 घटी = 24 मिनट, 1 पल = 24 सेकंड, 1 विपल = 0.4 सेकंड; दिन सूर्योदय से अगले सूर्योदय तक (60 घटी)
export function vedicTime(dateISO, timeHM, place = DEFAULT_PLACE) {
  const ms = istMs(dateISO, timeHM);
  let day = dateISO, sr = sunTimes(day, place).sunrise;
  if (sr == null) return { error: 'इस स्थान पर इस तारीख़ को सूर्योदय नहीं मिला' };
  if (ms < sr) { day = shiftDate(dateISO, -1); sr = sunTimes(day, place).sunrise; }
  const s = (ms - sr) / 1000, g = Math.floor(s / 1440), r = s - g * 1440, p = Math.floor(r / 24), v = Math.floor((r - p * 24) / 0.4);
  return { sthan: place.name, ghadi: `${g} घटी ${p} पल ${v} विपल`, ghati: g, pal: p, vipal: v, suryoday: clock(sr), din_ka_aarambh: `${fmtDay(day)} का सूर्योदय`, vaar: wdOf(day) };
}
export function clockFromGhati(dateISO, ghati, pal, place = DEFAULT_PLACE) {
  const sr = sunTimes(dateISO, place).sunrise;
  if (sr == null) return { error: 'सूर्योदय नहीं मिला' };
  const ms = sr + (ghati * 1440 + pal * 24) * 1000;
  return { sthan: place.name, samay: fmtDT(ms), ghadi: `${ghati} घटी ${pal} पल (${fmtDay(dateISO)} के सूर्योदय से)` };
}

// ---------- 3. श्राद्ध तिथि ----------
function aparahna(day, place) {
  const t = sunTimes(day, place);
  if (t.sunrise == null) return null;
  const L = t.sunset - t.sunrise;
  return [t.sunrise + 0.6 * L, t.sunrise + 0.8 * L];
}
// मास (अमांत 1..12), तिथि (1..30) वाला दिन खोजे: अपराह्न में तिथि हो (बीच में, न मिले तो खिड़की के किसी भी हिस्से में)
function findTithiDay(fromISO, days, month, idx, place) {
  const hits = [];
  for (let i = 0; i < days; i++) {
    const day = shiftDate(fromISO, i), w = aparahna(day, place);
    if (!w) continue;
    const mid = (w[0] + w[1]) / 2, lm = lunarMonth(mid);
    if (lm.month !== month || lm.adhika) continue;
    const at = ms => tithiAt(ms).index === idx;
    if (at(mid)) hits.push({ day, strong: true });
    else if (at(w[0]) || at(w[1])) hits.push({ day, strong: false });
  }
  if (!hits.length) return null;
  const pick = hits.find(h => h.strong) || hits[0];
  const t = tithiAt(istMs(pick.day, '15:00'));
  return { tareekh: pick.day, vaar: wdOf(pick.day), tithi_samay: `${fmtDT(t.start)} से ${fmtDT(t.end)} तक`, aparahna_me: pick.strong ? 'हाँ, अपराह्न में तिथि है' : 'अपराह्न में तिथि आंशिक (क्षय/वृद्धि वाली स्थिति)' };
}
export function shraddhaTithi(deathISO, deathHM = '12:00', place = DEFAULT_PLACE, fromISO = todayIST()) {
  const ms = istMs(deathISO, deathHM), t = tithiAt(ms), lm = lunarMonth(ms), idx = t.index;
  const out = {
    mrityu: `${fmtDay(deathISO)}, ${deathHM} (भारतीय समय)`,
    tithi: tithiName(idx), paksha: idx <= 15 ? 'शुक्ल पक्ष' : 'कृष्ण पक्ष',
    maas_amant: MONTH_NAMES[lm.month - 1] + (lm.adhika ? ' (अधिक मास)' : ''), maas_purnimant: MONTH_NAMES[(idx > 15 ? lm.month % 12 : lm.month - 1)]
  };
  const next = findTithiDay(fromISO, 400, lm.month, idx, place);
  out.agla_varshik_shraddh = next || 'अगले 400 दिनों में नहीं मिला (मृत्यु अधिक मास में हुई हो तो पंडित से पूछें)';
  const kr = idx === 15 ? 15 : idx === 30 ? 30 : (idx <= 15 ? 15 + idx : idx);
  const pit = findTithiDay(fromISO, 400, 6, kr, place);
  out.pitru_paksha_shraddh = pit ? { ...pit, note: idx === 15 ? 'पूर्णिमा का श्राद्ध पितृ पक्ष शुरू होने से एक दिन पहले' : idx === 30 ? 'सर्वपितृ अमावस्या' : 'शुक्ल पक्ष में मृत्यु हो तो भी पितृ पक्ष में उसी तिथि-संख्या का (कृष्ण पक्ष) श्राद्ध किया जाता है' } : 'अगले 400 दिनों में नहीं मिला';
  out.note = 'यह गणना अपराह्न काल के नियम से है। अधिक मास, क्षय/वृद्धि तिथि और कुल-परंपरा के भेद हो सकते हैं, इसलिए अंतिम निर्णय कुल-पुरोहित से पक्का करें।';
  return out;
}

// ---------- 4. 1000 चंद्रोदय (सहस्र चंद्र दर्शन): जन्म के बाद 1000वीं पूर्णिमा ----------
const fFull = ms => (((elongation(ms) - 180 + 540) % 360) - 180); // पूर्णिमा पर 0 से गुज़रता है
function nextFull(from) {
  const e = elongation(from), g = from + (((180 - e + 360) % 360) / 12.19) * DAY;
  return solveFull(g);
}
function solveFull(guess) {
  let a = guess - 2 * DAY, b = guess + 2 * DAY;
  for (let i = 0; i < 4 && !(fFull(a) < 0 && fFull(b) >= 0); i++) { a -= DAY; b += DAY; }
  for (let i = 0; i < 40; i++) { const m = (a + b) / 2; if (fFull(m) < 0) a = m; else b = m; }
  return (a + b) / 2;
}
export function sahasraChandra(dobISO, timeHM = '12:00') {
  const birth = istMs(dobISO, timeHM);
  let t = nextFull(birth);
  for (let n = 1; n < 1000; n++) t = solveFull(t + 29.530588 * DAY);
  const d = istDay(t), b = new Date(birth + IST), e = new Date(t + IST);
  let y = e.getUTCFullYear() - b.getUTCFullYear(), m = e.getUTCMonth() - b.getUTCMonth(), dd = e.getUTCDate() - b.getUTCDate();
  if (dd < 0) { m--; dd += 30; } if (m < 0) { y--; m += 12; }
  return {
    janm: `${fmtDay(dobISO)}, ${timeHM}`, hazaarvi_purnima: fmtDT(t), tareekh: d, vaar: wdOf(d), umra: `${y} वर्ष ${m} माह ${dd} दिन (लगभग)`,
    note: 'सहस्र चंद्र दर्शन की सही तारीख़ परंपरा के अनुसार 1-2 दिन आगे-पीछे हो सकती है (पूर्णिमा तिथि दो दिन पड़ सकती है)। पुरोहित से पुष्टि करें।'
  };
}
