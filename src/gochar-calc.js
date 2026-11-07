// ग्रह गोचर का हिसाब (बिना DOM): किसी तारीख़ की ग्रह-स्थिति (राशि, नक्षत्र, वक्री/मार्गी, वर्गोत्तम),
// और किसी साल के राशि-परिवर्तन, वक्री-मार्गी तथा वर्गोत्तम की अवधियाँ। साल 2026 से 2099 तक।
// साइट के पेज (gochar-pages.js) और चैटबॉट (functions/api/chat.js) दोनों यही फ़ाइल इस्तेमाल करते हैं।
import { lonSidereal, grahaPositions, planetSign, RASHI_HI, GRAHA_HI, GRAHA_SHORT, GRAHA_ORDER } from './graha-engine.js';
import { NAKSHATRAS } from './festival-calendar.js';

export const GOCHAR_MIN = 2026, GOCHAR_MAX = 2099;
const MIN = 60000, HOUR = 3600000, DAY = 86400000, IST = 330 * MIN;
const wrap180 = x => ((x % 360) + 540) % 360 - 180;
const MONTHS_HI = ['जनवरी', 'फ़रवरी', 'मार्च', 'अप्रैल', 'मई', 'जून', 'जुलाई', 'अगस्त', 'सितंबर', 'अक्टूबर', 'नवंबर', 'दिसंबर'];
export { MONTHS_HI };

export const istMs = (y, m, d, h = 12, mi = 0) => Date.UTC(y, m - 1, d, h, mi) - IST;
export const istParts = ms => { const d = new Date(ms + IST); return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate() }; };
const clock = new Intl.DateTimeFormat('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' });
export const fmtDate = ms => { const p = istParts(ms); return `${p.d} ${MONTHS_HI[p.m - 1]} ${p.y}`; };
export const fmtDT = ms => `${fmtDate(ms)}, ${clock.format(new Date(ms)).toUpperCase()}`;
export const daysInMonth = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();

// नवांश राशि: 108 नवांश सतत मेष से चलते हैं; वर्गोत्तम = नवांश राशि == जन्म राशि
const navSign = lon => Math.floor(lon / (30 / 9)) % 12;
export const isVargottama = lon => navSign(lon) === Math.floor(lon / 30);

// ---------- 1. किसी क्षण की ग्रह-स्थिति ----------
export function positionsAt(ms) {
  const p = grahaPositions(ms);
  return GRAHA_ORDER.map(k => {
    const g = p[k], varg = isVargottama(g.lon);
    return {
      key: k, name: GRAHA_HI[k], short: GRAHA_SHORT[k], sign: g.sign, rashi: g.rashi, deg: g.deg, nakshatra: g.nakshatra, pada: g.pada,
      retro: g.retro, vargottama: varg, navamsa: RASHI_HI[navSign(g.lon)],
      chaal: k === 'rahu' || k === 'ketu' ? 'सदा वक्री' : (k === 'sun' || k === 'moon') ? 'सामान्य चाल' : (g.retro ? 'वक्री' : 'मार्गी')
    };
  });
}

// ---------- 2. साल भर का स्कैन (6 घंटे के कदम; घटनाओं का समय मिनट तक सटीक) ----------
const STATION = ['mars', 'mercury', 'jupiter', 'venus', 'saturn'];
const SCAN = ['sun', 'mars', 'mercury', 'jupiter', 'venus', 'saturn', 'rahu', 'ketu']; // चंद्रमा बहुत तेज़ है, साल-सूची में नहीं
const spd = (g, t) => wrap180(lonSidereal(g, t + 3 * HOUR) - lonSidereal(g, t - 3 * HOUR));
const cache = new Map();

function bisect(pred, lo, hi) { // pred(lo) != pred(hi); बदलाव का क्षण (30 सेकंड तक)
  const a = pred(lo);
  while (hi - lo > 30000) { const mid = (lo + hi) / 2; if (pred(mid) === a) lo = mid; else hi = mid; }
  return (lo + hi) / 2;
}

export function yearData(year) {
  year = Math.min(GOCHAR_MAX, Math.max(GOCHAR_MIN, year | 0));
  if (cache.has(year)) return cache.get(year);
  const start = istMs(year, 1, 1, 0, 0), end = istMs(year + 1, 1, 1, 0, 0), STEP = 6 * HOUR;
  const events = [], retro = {}, varg = {}, ingress = {};
  const state = {};
  for (const g of SCAN) {
    const lon = lonSidereal(g, start);
    state[g] = { sign: Math.floor(lon / 30), v: isVargottama(lon), r: STATION.includes(g) ? spd(g, start) < 0 : (g === 'rahu' || g === 'ketu') };
    retro[g] = []; varg[g] = []; ingress[g] = [];
    if (state[g].r && STATION.includes(g)) retro[g].push({ from: null, to: null });
    if (state[g].v) varg[g].push({ from: null, to: null });
  }
  for (let t = start + STEP; t <= end; t += STEP) {
    const a = t - STEP;
    for (const g of SCAN) {
      const s = state[g], lon = lonSidereal(g, t), sg = Math.floor(lon / 30);
      if (sg !== s.sign) {
        const ti = bisect(x => planetSign(g, x), a, t), back = g !== 'rahu' && g !== 'ketu' && s.r;
        const ev = { ms: ti, kind: 'ingress', g, from: RASHI_HI[s.sign], to: RASHI_HI[sg], back,
          text: `${GRAHA_HI[g]} ${RASHI_HI[s.sign]} से ${RASHI_HI[sg]} में${back ? ' (वक्री चाल से पीछे)' : ''}` };
        events.push(ev); ingress[g].push(ev); s.sign = sg;
      }
      if (STATION.includes(g)) {
        const r = spd(g, t) < 0;
        if (r !== s.r) {
          const ts = bisect(x => spd(g, x) < 0, a, t), l = lonSidereal(g, ts), rs = RASHI_HI[Math.floor(l / 30)], dg = (l % 30).toFixed(1);
          events.push({ ms: ts, kind: r ? 'retro' : 'direct', g, text: `${GRAHA_HI[g]} ${r ? 'वक्री' : 'मार्गी'} होता है (${rs} ${dg}°)` });
          if (r) retro[g].push({ from: ts, to: null }); else { const last = retro[g][retro[g].length - 1]; if (last) last.to = ts; }
          s.r = r;
        }
      }
      const v = isVargottama(lon);
      if (v !== s.v) {
        const tv = bisect(x => isVargottama(lonSidereal(g, x)), a, t), rs = RASHI_HI[Math.floor(lonSidereal(g, tv + (v ? 60000 : -60000)) / 30)];
        events.push({ ms: tv, kind: v ? 'varg-start' : 'varg-end', g, text: `${GRAHA_HI[g]} ${v ? 'वर्गोत्तम होता है' : 'वर्गोत्तम नहीं रहता'} (${rs})` });
        if (v) varg[g].push({ from: tv, to: null, rashi: rs }); else { const last = varg[g][varg[g].length - 1]; if (last) { last.to = tv; last.rashi = last.rashi || rs; } }
        s.v = v;
      }
    }
  }
  for (const g of SCAN) for (const w of varg[g]) if (!w.rashi) w.rashi = RASHI_HI[Math.floor(lonSidereal(g, (w.from ?? start) + HOUR) / 30)];
  events.sort((x, y) => x.ms - y.ms);
  const out = { year, start, end, events, retro, varg, ingress, scan: SCAN };
  cache.set(year, out);
  return out;
}

export function monthEvents(year, month) {
  const y = yearData(year), a = istMs(year, month, 1, 0, 0), b = istMs(month === 12 ? year + 1 : year, month === 12 ? 1 : month + 1, 1, 0, 0);
  return y.events.filter(e => e.ms >= a && e.ms < b);
}

// ---------- 3. चैटबॉट के लिए छोटा सार ----------
export function gocharSummary({ year, month, day, scope } = {}) {
  year = +year; if (!(year >= GOCHAR_MIN && year <= GOCHAR_MAX)) return { error: `साल ${GOCHAR_MIN} से ${GOCHAR_MAX} के बीच का चाहिए` };
  const out = { varsh: year };
  if (month) {
    month = +month; if (!(month >= 1 && month <= 12)) return { error: 'महीना 1 से 12 के बीच का चाहिए' };
    const d = Math.min(Math.max(+day || 1, 1), daysInMonth(year, month)), ms = istMs(year, month, d, 12, 0);
    out.tareekh = fmtDate(ms) + ' (दोपहर 12 बजे, भारतीय समय)';
    out.grah_sthiti = positionsAt(ms).map(p => `${p.name}: ${p.rashi} ${p.deg.toFixed(1)}° · ${p.nakshatra} चरण ${p.pada} · ${p.chaal}${p.vargottama ? ' · वर्गोत्तम' : ''}`);
    out.is_mahine_ke_gochar = monthEvents(year, month).map(e => `${fmtDT(e.ms)}: ${e.text}`);
  }
  if (!month || scope === 'varsh') {
    const y = yearData(year), per = a => `${a.from == null ? 'वर्ष के आरंभ' : fmtDate(a.from)} से ${a.to == null ? 'वर्ष के अंत के बाद तक' : fmtDate(a.to)}`;
    out.vakri_margi = y.scan.filter(g => y.retro[g].length).map(g => `${GRAHA_HI[g]} वक्री: ` + y.retro[g].map(per).join('; '));
    out.rashi_parivartan = y.scan.filter(g => ['jupiter', 'saturn', 'rahu', 'ketu', 'mars'].includes(g)).flatMap(g => y.ingress[g].map(e => `${fmtDT(e.ms)}: ${e.text}`));
    out.rahu_ketu = 'राहु-केतु हमेशा वक्री चलते हैं (औसत गणना)';
  }
  if (scope === 'vargottama' || scope === 'varsh') {
    const y = yearData(year);
    out.vargottama = y.scan.filter(g => !['rahu', 'ketu'].includes(g)).map(g => `${GRAHA_HI[g]}: ` + (y.varg[g].map(w => `${w.rashi} में ${w.from == null ? 'वर्ष के आरंभ' : fmtDate(w.from)} से ${w.to == null ? 'वर्ष के अंत के बाद तक' : fmtDate(w.to)}`).join('; ') || 'इस वर्ष नहीं'));
  }
  out.note = year > 2050 ? '2050 के बाद के ग्रह-स्थान अनुमानित गणना हैं; तारीख़ें कुछ दिन आगे-पीछे हो सकती हैं।' : undefined;
  return out;
}
