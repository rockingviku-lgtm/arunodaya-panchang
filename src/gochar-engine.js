// गोचर-गणना (2026–2100): ग्रहों का राशि-परिवर्तन, वक्री/मार्गी और वर्गोत्तम। केवल गणना, बिना I/O। पेज: gochar-pages.js
// दिन-स्तर पर नमूने (IST दोपहर 12 बजे) लेकर घटनाएँ पहचानी जाती हैं; इसलिए तारीख़ एक दिन की सटीकता की है।
import { grahaPositions, ascendantSidereal, GRAHA_HI, GRAHA_SHORT, RASHI_HI, GRAHA_ORDER } from './graha-engine.js';

export const YEAR_MIN = 2026, YEAR_MAX = 2100;
const IST_OFFSET = 330 * 60000;
const MONTHS_HI = ['जन॰', 'फ़र॰', 'मार्च', 'अप्रैल', 'मई', 'जून', 'जुला॰', 'अग॰', 'सितं॰', 'अक्टू॰', 'नव॰', 'दिस॰'];
const PLANETS = GRAHA_ORDER.filter((g) => g !== 'moon'); // चंद्र रोज़ राशि बदलता है, इसलिए गोचर-सूची से बाहर
const NODES = new Set(['rahu', 'ketu']); // राहु-केतु हमेशा वक्री गिने जाते हैं, उनका वक्री/मार्गी नहीं होता

// IST के उस दिन की दोपहर 12 बजे (UTC ms)
export const istNoon = (y, m, d) => Date.UTC(y, m - 1, d) - IST_OFFSET + 12 * 3600000;
export const daysIn = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();
export const validYear = (y) => Number.isInteger(y) && y >= YEAR_MIN && y <= YEAR_MAX;

// वर्गोत्तम: नवांश राशि = जन्म-राशि के समान। चर राशि (मेष, कर्क, तुला, मकर) से नवांश उसी से; स्थिर (वृषभ, सिंह, वृश्चिक, कुंभ) से नौवीं से; द्विस्वभाव से पाँचवीं से।
const MOVABLE = [0, 3, 6, 9], FIXED = [1, 4, 7, 10];
export function navamshaSign(lon) {
  const sign = Math.floor(lon / 30);
  const idx = Math.floor((lon - sign * 30) / (10 / 3)); // 0..8
  const start = MOVABLE.includes(sign) ? sign : FIXED.includes(sign) ? (sign + 8) % 12 : (sign + 4) % 12;
  return (start + idx) % 12;
}

// एक क्षण की स्थिति (चंद्र को छोड़कर, राहु-केतु सहित)
export function snapshot(ms) {
  const p = grahaPositions(ms), out = {};
  for (const g of PLANETS) {
    const v = p[g];
    out[g] = { lon: v.lon, sign: v.sign, retro: NODES.has(g) ? false : !!v.retro, vargottam: navamshaSign(v.lon) === v.sign };
  }
  return out;
}

// किसी तारीख़ की पूरी ग्रह-तालिका (सभी 9 ग्रह, चंद्र सहित)
export function positionTable(ms) {
  const p = grahaPositions(ms);
  return GRAHA_ORDER.map((g) => {
    const v = p[g];
    const retro = !NODES.has(g) && !!v.retro; // राहु-केतु पर वक्री/मार्गी लागू नहीं
    return { key: g, name: GRAHA_HI[g], rashi: RASHI_HI[v.sign], deg: (v.lon - v.sign * 30).toFixed(2), nakshatra: v.nakshatra, pada: v.pada, retro, vargottam: g === 'moon' ? null : navamshaSign(v.lon) === v.sign };
  });
}

// एक महीने की घटनाएँ, तारीख़ के हिसाब से
export function monthEvents(y, m) {
  if (!validYear(y) || m < 1 || m > 12) return [];
  const out = [];
  let prev = null;
  for (let d = 1; d <= daysIn(y, m); d++) {
    const cur = snapshot(istNoon(y, m, d));
    if (prev) {
      for (const g of PLANETS) {
        const a = prev[g], b = cur[g], name = GRAHA_HI[g];
        const base = { y, m, d, g };
        if (a.sign !== b.sign) out.push({ ...base, kind: 'ingress', text: `${name} ${RASHI_HI[a.sign]} से ${RASHI_HI[b.sign]} में प्रवेश करता है` });
        if (a.retro !== b.retro) out.push({ ...base, kind: 'station', text: `${name} ${b.retro ? 'वक्री' : 'मार्गी'} होता है` });
        if (a.vargottam !== b.vargottam) out.push({ ...base, kind: 'vargottam', text: b.vargottam ? `${name} वर्गोत्तम हुआ (${RASHI_HI[b.sign]})` : `${name} वर्गोत्तम से बाहर हुआ` });
      }
    }
    prev = cur;
  }
  return out;
}

export const dayLabel = (y, m, d) => `${d} ${MONTHS_HI[m - 1]} ${y}`;

// कुंडली-डेटा (D1 = राशि/लग्न चक्र, D9 = नवांश चक्र) किसी क्षण और स्थान के लिए। लग्न स्थान पर निर्भर है।
export function chartFor(ms, lat, lon) {
  const p = grahaPositions(ms);
  const asc = ascendantSidereal(ms, lat, lon);
  const planets = GRAHA_ORDER.map((g) => ({ key: g, short: GRAHA_SHORT[g], sign: p[g].sign, d9: navamshaSign(p[g].lon), retro: NODES.has(g) ? false : !!p[g].retro }));
  return { ascSign: Math.floor(asc / 30), asc9: navamshaSign(asc), planets };
}
