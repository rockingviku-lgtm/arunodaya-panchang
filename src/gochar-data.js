// गोचर-शीट का डेटा (2026–2100; एक बार में एक या कुछ वर्ष): वार्षिक फलादेश, मासिक कुंडली-ग्रह, और ग्रह-घटनाएँ। पेज और चैटबॉट दोनों इसी गणना से चलते हैं।
// भारी गणना है, इसलिए पेज इसे एक बार बनाकर cache करता है (buildGocharData)।
import { monthEvents, positionTable, chartFor, istNoon, dayLabel, daysIn } from './gochar-engine.js';
import { rashifal } from './rashifal.js';
import { RASHI_HI } from './graha-engine.js';

export const SHEET_YEARS = Array.from({ length: 2100 - 2026 + 1 }, (_, i) => 2026 + i); // 2026…2100
export const KIND_HI = { ingress: 'राशि-परिवर्तन', station: 'वक्री / मार्गी', vargottam: 'वर्गोत्तम' };
const pad = n => String(n).padStart(2, '0');
export const starStr = n => '★'.repeat(n) + '☆'.repeat(Math.max(0, 5 - n));
const short = (t, n = 140) => (t || '').length > n ? t.slice(0, n - 1) + '…' : (t || '');
const compact = c => ({ a: c.ascSign, a9: c.asc9, p: c.planets.map(q => [q.short, q.sign, q.d9]) });

// एक बार की गणना: place = { name, lat, lon }
// years: केवल वही वर्ष बनते हैं जो माँगे गए (पूरी 75 साल की गणना फ़ोन पर भारी पड़ती है)
export function buildGocharData(place, years = SHEET_YEARS) {
  const yearly = [], monthly = [], events = [];
  for (const y of years) {
    const r = rashifal('year', `${y}-01-01`);
    for (const s of r.signs) {
      yearly.push({ year: y, rashi: s.name, overall: starStr(s.stars.overall), career: starStr(s.stars.career), money: starStr(s.stars.money), love: starStr(s.stars.love), health: starStr(s.stars.health), note: short(s.notes?.[0] || 'कोई विशेष नोट नहीं।') });
    }
  }
  for (const y of years) for (let m = 1; m <= 12; m++) {
    const ms = istNoon(y, m, 1);
    const c = chartFor(ms, place.lat, place.lon);
    const tbl = positionTable(ms);
    const by = Object.fromEntries(tbl.map(x => [x.key, x]));
    const mr = rashifal('month', `${y}-${pad(m)}-01`);
    const best = [...mr.signs].sort((a, b) => b.stars.overall - a.stars.overall)[0];
    monthly.push({ month: `${y}-${pad(m)}`, lagna: RASHI_HI[c.ascSign], lagna9: RASHI_HI[c.asc9],
      sun: by.sun.rashi, moon: by.moon.rashi, mars: by.mars.rashi, mercury: by.mercury.rashi, jupiter: by.jupiter.rashi,
      venus: by.venus.rashi, saturn: by.saturn.rashi, rahu: by.rahu.rashi, ketu: by.ketu.rashi,
      retro: tbl.filter(x => x.retro).map(x => x.name).join(', ') || '—',
      vargottam: tbl.filter(x => x.vargottam).map(x => x.name).join(', ') || '—',
      best: `${best.name} ${starStr(best.stars.overall)}`, chart: compact(c) });
    for (const e of monthEvents(y, m)) {
      const eMs = istNoon(e.y, e.m, e.d);
      const on = positionTable(eMs).find(x => x.key === e.g);
      const si = on ? RASHI_HI.indexOf(on.rashi) : -1;
      events.push({ year: e.y, month: pad(e.m), date: `${pad(e.d)} ${e.m}/${e.y}`, dayLabel: dayLabel(e.y, e.m, e.d), planet: on ? on.name : e.g, kind: KIND_HI[e.kind], text: e.text, rashi: on ? on.rashi : '—', phal: si >= 0 ? starStr(mr.signs[si].stars.overall) : '—', chart: compact(chartFor(eMs, place.lat, place.lon)) });
    }
  }
  // वार्षिक पंक्ति पर उस साल की 1 जनवरी की कुंडली (लग्न वही)
  for (const r of yearly) r.chart = monthly.find(m => m.month === `${r.year}-01`).chart;
  return { yearly, monthly, events, place: place.name };
}

// चैट और पेज दोनों के लिए: किसी तारीख़ की कुंडली-सार (text) — चैटबॉट के टूल में काम आता है
export function daySummary(ms, place) {
  const tbl = positionTable(ms);
  const c = chartFor(ms, place.lat, place.lon);
  return { table: tbl, lagna: RASHI_HI[c.ascSign], lagna9: RASHI_HI[c.asc9] };
}
export { daysIn };
