// ग्रह-घटनाओं की पहचान (राशि/नक्षत्र प्रवेश, वक्री/मार्गी, क्रांतिवृत्त पारगमन, युति और कोण)।
// यह फ़ाइल किसी खास ephemeris पर निर्भर नहीं: lonOf(g, ms) और latOf(g, ms) बाहर से दिए जाते हैं।
import { GRAHA_HI, RASHI_HI } from './graha-engine.js';
import { NAKSHATRAS } from './festival-calendar.js';

const DAY = 86400000;
const wrap180 = d => ((((d + 180) % 360) + 360) % 360) - 180;
export const EV_ALL = ['sun', 'mars', 'mercury', 'venus', 'jupiter', 'saturn', 'rahu', 'ketu'];
const EV_PAIR = ['sun', 'mars', 'mercury', 'venus', 'jupiter', 'saturn'];
const EV_ANGLES = [0, 60, 90, 120, 150, 180, 210, 240, 270, 300];
const EV_STEP = 6 * 3600000;
const EV_LAT = ['mars', 'mercury', 'venus', 'jupiter', 'saturn'];

export function detectEvents({ fromMs, days = 60, limit = 12, lonOf, latOf }) {
  const n = Math.ceil((days * DAY) / EV_STEP), snaps = [];
  for (let i = 0; i <= n; i++) {
    const t = fromMs + i * EV_STEP, lon = {}, spd = {}, lat = {};
    for (const g of EV_ALL) {
      lon[g] = lonOf(g, t);
      if (EV_LAT.includes(g) && latOf) lat[g] = latOf(g, t);
      spd[g] = wrap180(lonOf(g, t + EV_STEP / 2) - lonOf(g, t - EV_STEP / 2));
    }
    snaps.push({ t, lon, spd, lat });
  }
  const refine = (f, lo, hi) => {
    const slo = f(lo) < 0;
    while (hi - lo > 30000) { const mid = (lo + hi) / 2; if ((f(mid) < 0) === slo) lo = mid; else hi = mid; }
    return (lo + hi) / 2;
  };
  const out = [];
  for (let i = 1; i < snaps.length; i++) {
    const a = snaps[i - 1], b = snaps[i];
    for (const g of EV_ALL) {
      const sa = Math.floor(a.lon[g] / 30), sb = Math.floor(b.lon[g] / 30);
      if (sa !== sb) {
        const t = refine(ms => { const s = Math.floor(lonOf(g, ms) / 30); return s === sa ? -1 : 1; }, a.t, b.t);
        out.push({ ms: t, kind: 'ingress', text: `${GRAHA_HI[g]} ${RASHI_HI[sa]} से ${RASHI_HI[sb]} में` });
      }
      if (g !== 'rahu' && g !== 'ketu') {
        const na = Math.floor(a.lon[g] / (360 / 27)), nb = Math.floor(b.lon[g] / (360 / 27));
        if (na !== nb && sa === sb) {
          const t = refine(ms => Math.floor(lonOf(g, ms) / (360 / 27)) === na ? -1 : 1, a.t, b.t);
          out.push({ ms: t, kind: 'nakshatra', text: `${GRAHA_HI[g]} ${NAKSHATRAS[nb % 27]} नक्षत्र में` });
        }
      }
      if (!['sun', 'rahu', 'ketu'].includes(g) && (a.spd[g] < 0) !== (b.spd[g] < 0)) {
        const t = refine(ms => wrap180(lonOf(g, ms + EV_STEP / 2) - lonOf(g, ms - EV_STEP / 2)), a.t, b.t);
        out.push({ ms: t, kind: 'station', text: `${GRAHA_HI[g]} ${b.spd[g] < 0 ? 'वक्री' : 'मार्गी'} होता है` });
      }
    }
    if (latOf) for (const g of EV_LAT) {
      if (a.lat[g] == null || b.lat[g] == null) continue;
      if ((a.lat[g] < 0) !== (b.lat[g] < 0) && Math.abs(a.lat[g]) < 5) {
        const t = refine(ms => latOf(g, ms), a.t, b.t);
        out.push({ ms: t, kind: 'ecliptic', text: `${GRAHA_HI[g]} क्रांतिवृत्त पार करता है (${b.lat[g] > 0 ? 'दक्षिण से उत्तर' : 'उत्तर से दक्षिण'})` });
      }
    }
    for (let x = 0; x < EV_PAIR.length; x++) for (let y = x + 1; y < EV_PAIR.length; y++) {
      const g1 = EV_PAIR[x], g2 = EV_PAIR[y];
      for (const T of EV_ANGLES) {
        const f = ms => wrap180(lonOf(g2, ms) - lonOf(g1, ms) - T);
        const fa = wrap180(a.lon[g2] - a.lon[g1] - T), fb = wrap180(b.lon[g2] - b.lon[g1] - T);
        if ((fa < 0) !== (fb < 0) && Math.abs(fa) < 40 && Math.abs(fb) < 40) {
          const ang = Math.min(T, 360 - T), t = refine(f, a.t, b.t);
          out.push({ ms: t, kind: 'aspect', text: ang === 0 ? `${GRAHA_HI[g1]}-${GRAHA_HI[g2]} युति` : `${GRAHA_HI[g1]} और ${GRAHA_HI[g2]} ${ang}° पर` });
        }
      }
    }
  }
  return out.filter(e => e.ms >= fromMs).sort((p, q) => p.ms - q.ms).slice(0, limit);
}
