// Swiss Ephemeris (@swisseph/browser, लाहिरी निरयण) से ग्रह-घटनाएँ — वही पहचान-तर्क (event-core.js), पर सटीक स्थिति के साथ।
import { SwissEphemeris, Planet, LunarPoint, SiderealMode } from '@swisseph/browser';
import { detectEvents } from './event-core.js';

const norm = x => ((x % 360) + 360) % 360;
const BODY = { sun: Planet.Sun, mars: Planet.Mars, mercury: Planet.Mercury, venus: Planet.Venus, jupiter: Planet.Jupiter, saturn: Planet.Saturn };
let swePromise = null;
function getSwe() {
  if (!swePromise) swePromise = (async () => { const swe = new SwissEphemeris(); await swe.init(); swe.setSiderealMode(SiderealMode.Lahiri); return swe; })();
  return swePromise;
}

// सिर्फ़ एक ग्रह की निरयण रेखांश और क्रांतिवृत्त-अक्षांश (हर ग्रह के लिए अलग; cache सहित)
export async function swissPlanetaryEvents(fromMs, days = 30, limit = 800) {
  const swe = await getSwe();
  const cache = new Map();
  const at = (g, ms) => {
    const key = g + '|' + Math.round(ms / 60000);
    if (cache.has(key)) return cache.get(key);
    const jd = swe.dateToJulianDay(new Date(ms));
    const ay = swe.getAyanamsa(jd);
    let r;
    if (g === 'rahu' || g === 'ketu') {
      let node;
      try { node = swe.calculatePosition(jd, LunarPoint.MeanNode); } catch { node = swe.calculatePosition(jd, LunarPoint.TrueNode); }
      const rl = norm(node.longitude - ay);
      r = { lon: g === 'rahu' ? rl : norm(rl + 180), lat: 0 };
    } else {
      const p = swe.calculatePosition(jd, BODY[g]);
      r = { lon: norm(p.longitude - ay), lat: Number(p.latitude) };
    }
    // NaN आए तो चुपचाप खाली सूची न बने: त्रुटि फेंको, ताकि पुराना (fallback) तरीका चले
    if (!Number.isFinite(r.lon)) throw new Error('Swiss: अमान्य रेखांश ' + g);
    cache.set(key, r);
    if (cache.size > 50000) cache.clear();
    return r;
  };
  const list = detectEvents({
    fromMs, days, limit,
    lonOf: (g, ms) => at(g, ms).lon,
    latOf: (g, ms) => at(g, ms).lat
  });
  // खाली सूची का मतलब लगभग हमेशा गणना की गड़बड़ी है (महीने में कई घटनाएँ होती ही हैं)
  if (!list.length) throw new Error('Swiss: घटनाएँ नहीं मिलीं');
  return list;
}
