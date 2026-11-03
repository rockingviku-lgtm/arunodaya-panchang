// हर "और देखें" का अपना पूरा पेज (Drik Panchang की तरह): ग्रह-घटनाएँ, पंचांग, कुंडली, त्योहार, राशिफल, चौघड़िया, होरा।
// केवल जोड़ा गया: main.js में 2 पंक्तियाँ — import { mountPages } from "./pages.js";  और अंत में mountPages();
// बटन पर data-more="events" आदि लगाने से पेज खुलता है; पता (URL) #/events जैसा बनता है, बैक बटन काम करता है।
import {
  DEFAULT_PLACE, todayIST, shiftDate, getPanchangDay, getDayTimes, getFestivalsForMonth, WEEKDAYS_HI, NAKSHATRAS
} from './festival-calendar.js';
import {
  grahaPositions, ascendantSidereal, chaughadiya, horas, planetaryEvents, RASHI_HI, GRAHA_ORDER
} from './graha-engine.js';
import { mountRashifal } from './rashifal.js';
import { swissPlanetaryEvents } from './swe-events.js';
import { EXTRA_TITLES, makeExtraPages, mountExtraTools } from './extra-pages.js';
import { MILAN_TITLES, MILAN_CSS, makePages, mountMilanTools } from './milan-pages.js';

const TZ = 'Asia/Kolkata', STORE = 'arunodaya.place';
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clock = d => new Intl.DateTimeFormat('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: TZ }).format(d).toUpperCase();
const mdt = (d, iso) => !d ? '—' : new Date(+d + 330 * 60000).toISOString().slice(0, 10) === iso ? clock(d) : new Intl.DateTimeFormat('hi-IN', { day: 'numeric', month: 'short', timeZone: TZ }).format(d) + ', ' + clock(d);
const istISO = ms => new Date(ms + 330 * 60000).toISOString();
const MON = ['जन॰', 'फ़र॰', 'मार्च', 'अप्रै॰', 'मई', 'जून', 'जुला॰', 'अग॰', 'सित॰', 'अक्टू॰', 'नव॰', 'दिस॰'];
const MONFULL = ['जनवरी', 'फ़रवरी', 'मार्च', 'अप्रैल', 'मई', 'जून', 'जुलाई', 'अगस्त', 'सितंबर', 'अक्टूबर', 'नवंबर', 'दिसंबर'];
const wdOf = iso => WEEKDAYS_HI[new Date(`${iso}T12:00:00Z`).getUTCDay()];
const dms = x => { const d = Math.floor(x), m = Math.floor((x - d) * 60), s = Math.floor(((x - d) * 60 - m) * 60); return `${d}°${String(m).padStart(2, '0')}′${String(s).padStart(2, '0')}″`; };
const fmtDT = ms => { const p = istISO(ms); return `${+p.slice(8, 10)} ${MONFULL[+p.slice(5, 7) - 1]} ${p.slice(0, 4)}, ${wdOf(p.slice(0, 10))}, ${clock(new Date(ms))}`; };

const PG = { 'सूर्य': '☉', 'चंद्र': '☽', 'मंगल': '♂', 'बुध': '☿', 'गुरु': '♃', 'शुक्र': '♀', 'शनि': '♄', 'राहु': '☊', 'केतु': '☋' };
const PC = { 'सूर्य': '#e07b00', 'चंद्र': '#7d8590', 'मंगल': '#d33a2f', 'बुध': '#2e9b4a', 'गुरु': '#c98f00', 'शुक्र': '#d6559a', 'शनि': '#557686', 'राहु': '#8c5f48', 'केतु': '#9b45be' };
const RG = '♈♉♊♋♌♍♎♏♐♑♒♓';
const RASHI_LORD = ['मंगल', 'शुक्र', 'बुध', 'चंद्र', 'सूर्य', 'बुध', 'शुक्र', 'मंगल', 'गुरु', 'शनि', 'शनि', 'गुरु'];
const NAK_LORD = ['केतु', 'शुक्र', 'सूर्य', 'चंद्र', 'मंगल', 'राहु', 'गुरु', 'शनि', 'बुध'];
const evGlyph = t => /युति/.test(t) ? '☌' : /60°/.test(t) ? '⚹' : /90°/.test(t) ? '□' : /120°/.test(t) ? '△' : /150°/.test(t) ? '⚻' : /180°/.test(t) ? '☍' : (PG[t.split(' ')[0]] || '●');

// ग्रह-घटनाएँ: पहले Swiss Ephemeris से (सटीक), विफल हो तो पुराना गणना-तरीका। पूरा होते ही पेज दोबारा बनता है।
const EVC = new Map(), EVP = new Set();
function eventsList(from, days) {
  const key = `${from}|${days}`;
  if (EVC.has(key)) return EVC.get(key);
  if (!EVP.has(key)) {
    EVP.add(key);
    swissPlanetaryEvents(from, days, 800)
      .then(l => EVC.set(key, l), () => EVC.set(key, planetaryEvents(from, days, 800)))
      .finally(() => refresh());
  }
  return null;
}

const TITLES = { events: 'आने वाली ग्रह-घटनाएँ', panchang: 'दैनिक पंचांग', kundli: 'लग्न कुंडली', festivals: 'व्रत और त्योहार', rashifal: 'राशिफल', chaughadiya: 'चौघड़िया', hora: 'होरा', ...MILAN_TITLES, ...EXTRA_TITLES };
const KEYS = Object.keys(TITLES);

// ---------- साझा स्थिति ----------
let place = DEFAULT_PLACE;
try { const s = JSON.parse(localStorage.getItem(STORE) || 'null'); if (s && isFinite(s.lat) && isFinite(s.lon)) place = s; } catch (e) { /* ignore */ }
const nowTime = () => new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: TZ }).format(new Date());
const S = { date: todayIST(), month: todayIST().slice(0, 7), time: nowTime(), style: 'north', hours: 12 };

const CSS = `<style id="pg-style">
#pg-root{position:fixed;inset:0;z-index:9999;overflow-y:auto;background:var(--dbg,#efefef);color:var(--dtxt,#222);font:15px/1.55 inherit}
#pg-root *{box-sizing:border-box}
.pg-head{position:sticky;top:0;z-index:5;box-shadow:0 2px 8px #0003}
.pg-bar{background:var(--bar,#a80f0f);color:#fff;display:flex;align-items:center;gap:12px;padding:10px max(16px,env(safe-area-inset-left,0px))}
.pg-bar button{background:#fff;color:#a80f0f;border:0;padding:7px 14px;font:inherit;font-weight:700;cursor:pointer}
.pg-bar b{font-size:1.05rem;flex:1}
.pg-tabs{display:flex;flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none;background:var(--dhead,#5c5f63);padding:0 max(16px,env(safe-area-inset-left,0px))}
.pg-tabs::-webkit-scrollbar{display:none}
.pg-tabs button{background:none;border:0;color:var(--dheadtx,#fff);padding:10px 14px;font:inherit;cursor:pointer;opacity:.85;white-space:nowrap;flex:0 0 auto}
.pg-tabs button.on{background:rgba(255,255,255,.2);font-weight:700;opacity:1}
.pg-tool{display:flex;flex-wrap:wrap;gap:8px;align-items:center;padding:10px max(16px,env(safe-area-inset-left,0px));background:var(--tint,#e6e6e6);border-bottom:1px solid var(--pborder,#5c5f63)}
.pg-tool input,.pg-tool select,.pg-tool button{font:inherit;padding:6px 10px;border:1px solid var(--btnbd,#bbb);background:var(--btnbg,#fff);color:var(--dtxt,#222)}
.pg-tool button{cursor:pointer;color:var(--btntx,#a80f0f);font-weight:600}
.pg-tool button.on{background:var(--dhead,#5c5f63);color:var(--dheadtx,#fff)}
.pg-tool .pl{min-width:230px}
#pg-root .pg-box>h2,#pg-root .pg-bar b{color:var(--dheadtx,#fff)}
#pg-root .pg-bar b{color:#fff}
.pg-main{padding:0 max(16px,env(safe-area-inset-left,0px)) 40px}
.pg-box{background:var(--dcard,#fff);border:1px solid var(--pborder,#5c5f63);margin-top:14px}
.pg-box>h2{margin:0;background:var(--dhead,#5c5f63);color:var(--dheadtx,#fff);font-size:15px;font-weight:600;padding:9px 14px;text-align:center}
.pg-cols{column-count:2;column-gap:0}
.pg-ev{display:flex;gap:12px;align-items:center;padding:9px 14px;border-bottom:1px solid var(--line,#ddd);break-inside:avoid}
.pg-ev i{flex:none;width:30px;text-align:center;font:400 24px/1 serif;font-style:normal}
.pg-ev b{display:block;color:var(--dacc,#b8650b);font-weight:600}.pg-ev small{opacity:.75}
.pg-kv{display:flex;justify-content:space-between;gap:14px;padding:7px 14px;border-bottom:1px dotted var(--line,#ddd)}.pg-kv span{opacity:.7;flex:none}.pg-kv b{text-align:right;font-weight:600;color:var(--dacc,#b8650b)}
.pg-two{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0}.pg-two>.pg-box{margin-top:14px}
.pg-tbl{width:100%;border-collapse:collapse;font-size:13px}.pg-tbl th{background:var(--dhead,#5c5f63);color:var(--dheadtx,#fff);padding:7px 8px;text-align:left;white-space:nowrap}.pg-tbl td{padding:7px 8px;border-bottom:1px solid var(--line,#ddd);color:var(--dtxt,#222)}.pg-tbl tr:nth-child(even) td{background:rgba(128,128,128,.08)}
.pg-wrap{overflow-x:auto}
.pg-ch{display:flex;justify-content:space-between;gap:8px;padding:8px 14px;border-bottom:1px solid rgba(255,255,255,.6);color:#1b2150}.pg-ch.g{background:#e1f2e8}.pg-ch.r{background:#fbe3df}.pg-ch.h1{background:#fdf0d5}.pg-ch.h2{background:#e8e6f3}.pg-ch.now{outline:2px solid #e0771f;outline-offset:-2px}
.pg-fe{display:flex;gap:12px;align-items:center;padding:9px 14px;border-bottom:1px solid var(--line,#ddd);break-inside:avoid}.pg-fe .dt{flex:none;width:52px;text-align:center;padding:5px 0;line-height:1.1;color:#1b2150}.pg-fe .dt b{display:block;font-size:19px}.pg-fe b{color:var(--dacc,#b8650b)}.pg-fe small{display:block;opacity:.75}
.pg-note{padding:10px 14px;opacity:.75;font-size:13px}
.pg-d1{display:block;width:100%;max-width:380px;margin:10px auto}
@media(max-width:800px){.pg-cols{column-count:1}.pg-two{grid-template-columns:1fr}}
${MILAN_CSS}</style>`;

// ---------- चार्ट (उत्तर / दक्षिण भारतीय) ----------
const HC = [[150, 70], [75, 30], [30, 75], [70, 150], [30, 225], [75, 270], [150, 230], [225, 270], [270, 225], [230, 150], [270, 75], [225, 30]];
function chartNorth(lagnaSign, items) {
  const by = Array.from({ length: 12 }, () => []);
  for (const it of items) by[(it.sign - lagnaSign + 12) % 12].push(it);
  let t = '';
  by.forEach((a, h) => {
    const [cx, cy] = HC[h];
    t += `<text x="${cx}" y="${cy - 14}" font-size="10" text-anchor="middle" fill="#888">${((lagnaSign + h) % 12) + 1}</text>`;
    a.forEach((g, i) => { t += `<text x="${cx + (a.length > 1 ? (i % 2 ? 14 : -14) : 0)}" y="${cy + 2 + Math.floor(i / 2) * 14}" font-size="12" font-weight="700" text-anchor="middle" fill="${g.color}">${esc(g.short)}</text>`; });
  });
  return `<svg viewBox="0 0 300 300" class="pg-d1"><polygon points="150,0 225,75 150,150 75,75" fill="#fde6c8"/><g fill="none" stroke="#7a2a20" stroke-width="1.3"><rect x="1" y="1" width="298" height="298"/><line x1="0" y1="0" x2="300" y2="300"/><line x1="300" y1="0" x2="0" y2="300"/><polygon points="150,0 300,150 150,300 0,150"/></g>${t}</svg>`;
}
const SOUTH = [[11, 0, 0], [0, 1, 0], [1, 2, 0], [2, 3, 0], [10, 0, 1], [3, 3, 1], [9, 0, 2], [4, 3, 2], [8, 0, 3], [7, 1, 3], [6, 2, 3], [5, 3, 3]];
function chartSouth(lagnaSign, items) {
  let t = '';
  for (const [sign, cx, cy] of SOUTH) {
    const x = cx * 75, y = cy * 75, here = items.filter(i => i.sign === sign);
    t += `<rect x="${x}" y="${y}" width="75" height="75" fill="${sign === lagnaSign ? '#fde6c8' : 'none'}" stroke="#7a2a20" stroke-width="1.3"/>`;
    if (sign === lagnaSign) t += `<line x1="${x}" y1="${y}" x2="${x + 14}" y2="${y}" stroke="#7a2a20" stroke-width="3"/><text x="${x + 4}" y="${y + 24}" font-size="10" fill="#7a2a20">ल</text>`;
    here.forEach((g, i) => { t += `<text x="${x + 6 + (i % 2) * 34}" y="${y + 42 + Math.floor(i / 2) * 14}" font-size="12" font-weight="700" fill="${g.color}">${esc(g.short)}</text>`; });
    t += `<text x="${x + 62}" y="${y + 70}" font-size="9" fill="#888" text-anchor="end">${RG[sign]}</text>`;
  }
  return `<svg viewBox="0 0 300 300" class="pg-d1">${t}</svg>`;
}
const chartOf = (lagnaSign, items) => (S.style === 'south' ? chartSouth : chartNorth)(lagnaSign, items);

// ---------- साझा टूलबार ----------
const placeBox = () => `<input class="pl" id="pg-place" value="${esc(place.name)}" aria-label="स्थान"><button type="button" id="pg-find">स्थान खोजें</button>`;
const kv = (k, v) => `<div class="pg-kv"><span>${esc(k)}</span><b>${v}</b></div>`;
const seg = (list, day0) => list.map(s => { const e = s.end ? +new Date(s.end) : 0, p = e ? istISO(e) : ''; return esc(s.label) + (e ? ' · ' + (p.slice(0, 10) === day0 ? clock(new Date(e)) : `${+p.slice(8, 10)} ${MON[+p.slice(5, 7) - 1]}, ${clock(new Date(e))}`) + ' तक' : ''); }).join('<br>');

// ---------- पेज ----------
const PAGES = {
  // ग्रह-घटनाएँ: पूरे महीने की सूची
  events: {
    tool: () => `<button type="button" data-nav="-1">‹ पिछला महीना</button><input type="month" id="pg-month" value="${S.month}"><button type="button" data-nav="0">इस महीने</button><button type="button" data-nav="1">अगला महीना ›</button>`,
    body: () => {
      const [y, m] = S.month.split('-').map(Number), days = new Date(Date.UTC(y, m, 0)).getUTCDate();
      const from = Date.parse(`${S.month}-01T00:00:00+05:30`), to = from + days * 86400000;
      const all = eventsList(from, days);
      if (!all) return `<div class="pg-box"><h2>${MONFULL[m - 1]} ${y} की ग्रह-घटनाएँ · ${esc(place.name)}</h2><p class="pg-note">Swiss Ephemeris से गणना हो रही है…</p></div>`;
      const ev = all.filter(e => e.ms < to);
      return `<div class="pg-box"><h2>${MONFULL[m - 1]} ${y} की ग्रह-घटनाएँ · ${esc(place.name)}</h2><div class="pg-cols">${ev.length ? ev.map(e => `<div class="pg-ev"><i style="color:${/°|युति/.test(e.text) ? 'inherit' : (PC[e.text.split(' ')[0]] || 'inherit')}">${evGlyph(e.text)}</i><div><b>${esc(e.text)}</b><small>${esc(fmtDT(e.ms))}</small></div></div>`).join('') : '<p class="pg-note">इस महीने कोई प्रमुख ग्रह-घटना नहीं।</p>'}</div>
        <p class="pg-note">घटनाओं में राशि-परिवर्तन, नक्षत्र-प्रवेश, वक्री/मार्गी, क्रांतिवृत्त पारगमन, युति और ग्रहों के आपसी कोण (60°, 90°, 120°, 150°, 180°) शामिल हैं। समय IST में, निरयण (लाहिरी)।</p></div>`;
    },
    bind: root => {
      const set = v => { S.month = v; refresh(); };
      root.querySelector('#pg-month')?.addEventListener('change', e => e.target.value && set(e.target.value));
      root.querySelectorAll('[data-nav]').forEach(b => b.addEventListener('click', () => {
        const n = +b.dataset.nav; if (!n) return set(todayIST().slice(0, 7));
        let [y, m] = S.month.split('-').map(Number); m += n; if (m < 1) { m = 12; y--; } if (m > 12) { m = 1; y++; }
        set(`${y}-${String(m).padStart(2, '0')}`);
      }));
    }
  },

  // दैनिक पंचांग
  panchang: {
    tool: () => `${placeBox()}<button type="button" data-d="-1">‹ पिछला दिन</button><input type="date" id="pg-date" value="${S.date}"><button type="button" data-d="0">आज</button><button type="button" data-d="1">अगला दिन ›</button>`,
    body: () => {
      const pd = getPanchangDay(S.date, place), dt = getDayTimes(S.date, place);
      const day0 = S.date;
      let a = kv('स्थान', esc(place.name)) + kv('वार', esc(pd.weekday)) + kv('पक्ष', esc(pd.paksha)) + kv('सूर्योदय', clock(pd.sunrise)) + kv('सूर्यास्त', clock(pd.sunset))
        + kv('चंद्रोदय', mdt(pd.moonrise, S.date)) + kv('चंद्रास्त', mdt(pd.moonset, S.date))
        + kv('तिथि', seg(pd.tithis, day0)) + kv('नक्षत्र', seg(pd.nakshatras, day0)) + kv('योग', seg(pd.yogas, day0)) + kv('करण', seg(pd.karanas, day0))
        + kv('चंद्र राशि', seg(pd.moonRashi, day0)) + kv('सूर्य राशि', esc(pd.sunRashi)) + kv('सूर्य नक्षत्र', esc(pd.sunNakshatra))
        + kv('अमांत मास', esc(pd.amantaMonth)) + kv('पूर्णिमांत मास', esc(pd.purnimantaMonth))
        + kv('विक्रम संवत', pd.vikramSamvat) + kv('शक संवत', pd.shakaSamvat) + kv('गुजराती संवत', pd.gujaratiSamvat);
      let b = '';
      if (dt) b = kv('राहुकाल', `${clock(dt.rahu.start)} – ${clock(dt.rahu.end)}`) + kv('यमगंड', `${clock(dt.yama.start)} – ${clock(dt.yama.end)}`) + kv('गुलिक काल', `${clock(dt.gulika.start)} – ${clock(dt.gulika.end)}`) + kv('अभिजीत मुहूर्त', `${clock(dt.abhijit.start)} – ${clock(dt.abhijit.end)}`) + kv('ब्रह्म मुहूर्त', `${clock(dt.brahma.start)} – ${clock(dt.brahma.end)}`) + kv('दिनमान', `${Math.floor(dt.dayLengthMin / 60)} घं ${dt.dayLengthMin % 60} मि`);
      const fest = (() => { try { return getFestivalsForMonth(+S.date.slice(0, 4), +S.date.slice(5, 7), place).find(x => x.date === S.date)?.items || []; } catch (e) { return []; } })();
      return `<div class="pg-two"><div class="pg-box"><h2>${+S.date.slice(8)} ${MONFULL[+S.date.slice(5, 7) - 1]} ${S.date.slice(0, 4)}, ${esc(pd.weekday)}</h2>${a}</div>
        <div><div class="pg-box"><h2>शुभ-अशुभ काल</h2>${b}</div>
        <div class="pg-box"><h2>आज के व्रत और त्योहार</h2>${fest.length ? fest.map(f => `<div class="pg-kv"><b style="text-align:left">${esc(f.name)}${f.dayNo ? ' · दिन ' + f.dayNo : ''}</b></div>`).join('') : '<p class="pg-note">आज कोई व्रत या त्योहार दर्ज नहीं है।</p>'}</div></div></div>`;
    },
    bind: bindDate
  },

  // लग्न कुंडली + नवांश + ग्रह-विवरण तालिका
  kundli: {
    tool: () => `${placeBox()}<input type="date" id="pg-date" value="${S.date}"><input type="time" id="pg-time" value="${S.time}"><button type="button" id="pg-now">अभी</button>
      <button type="button" data-style="north" class="${S.style === 'north' ? 'on' : ''}">उत्तर</button><button type="button" data-style="south" class="${S.style === 'south' ? 'on' : ''}">दक्षिण</button>`,
    body: () => {
      const ms = Date.parse(`${S.date}T${S.time || '00:00'}:00+05:30`), pos = grahaPositions(ms), asc = ascendantSidereal(ms, place.lat, place.lon), ls = Math.floor(asc / 30);
      const nav = lon => Math.floor(lon / (30 / 9)) % 12;
      const d1 = GRAHA_ORDER.map(k => ({ short: pos[k].short, sign: pos[k].sign, color: PC[pos[k].name] }));
      const d9 = GRAHA_ORDER.map(k => ({ short: pos[k].short, sign: nav(pos[k].lon), color: PC[pos[k].name] }));
      const row = (nm, lon, retro, glyph, col) => { const sign = Math.floor(lon / 30), nk = Math.floor(lon / (360 / 27)), pada = Math.floor((lon % (360 / 27)) / (360 / 108)) + 1; return `<tr><td><b style="color:${col}">${glyph} ${esc(nm)}${retro ? ' (व)' : ''}</b></td><td>${RG[sign]} ${esc(RASHI_HI[sign])}</td><td>${dms(lon % 30)}</td><td>${esc(NAKSHATRAS[nk])} · पद ${pada}</td><td>${NAK_LORD[nk % 9]}</td><td>${RASHI_LORD[sign]}</td><td>${(sign - ls + 12) % 12 + 1}</td><td>${RG[nav(lon)]} ${esc(RASHI_HI[nav(lon)])}</td></tr>`; };
      const rows = row('लग्न', asc, false, '↑', 'inherit') + GRAHA_ORDER.map(k => row(pos[k].name, pos[k].lon, pos[k].retro && k !== 'rahu' && k !== 'ketu', PG[pos[k].name], PC[pos[k].name])).join('');
      return `<div class="pg-two"><div class="pg-box"><h2>लग्न कुंडली (D1) · लग्न ${esc(RASHI_HI[ls])}</h2>${chartOf(ls, d1)}<p class="pg-note" style="text-align:center">शरीर, व्यक्तित्व और जीवन के सामान्य विषय</p></div>
        <div class="pg-box"><h2>नवांश कुंडली (D9) · लग्न ${esc(RASHI_HI[nav(asc)])}</h2>${chartOf(nav(asc), d9)}<p class="pg-note" style="text-align:center">जीवनसाथी, धर्म और ग्रहों का वास्तविक बल</p></div></div>
        <div class="pg-box"><h2>राशि चार्ट विवरण · ${esc(fmtDT(ms))} · ${esc(place.name)}</h2><div class="pg-wrap"><table class="pg-tbl"><thead><tr><th>ग्रह</th><th>राशि</th><th>अंश</th><th>नक्षत्र · पद</th><th>नक्षत्र स्वामी</th><th>राशि स्वामी</th><th>भाव</th><th>नवांश</th></tr></thead><tbody>${rows}</tbody></table></div>
        <p class="pg-note">निरयण (लाहिरी), संपूर्ण-राशि भाव पद्धति। (व) = वक्री। जन्म कुंडली के लिए तारीख़, समय और जन्म-स्थान चुनें।</p></div>`;
    },
    bind: root => {
      bindDate(root);
      root.querySelector('#pg-time')?.addEventListener('change', e => { S.time = e.target.value || S.time; refresh(); });
      root.querySelector('#pg-now')?.addEventListener('click', () => { S.date = todayIST(); S.time = nowTime(); refresh(); });
      root.querySelectorAll('[data-style]').forEach(b => b.addEventListener('click', () => { S.style = b.dataset.style; refresh(); }));
    }
  },

  // व्रत और त्योहार: पूरा महीना
  festivals: {
    tool: () => `${placeBox()}<button type="button" data-nav="-1">‹ पिछला महीना</button><input type="month" id="pg-month" value="${S.month}"><button type="button" data-nav="0">इस महीने</button><button type="button" data-nav="1">अगला महीना ›</button>`,
    body: () => {
      const [y, m] = S.month.split('-').map(Number), list = getFestivalsForMonth(y, m, place);
      const bgs = ['#f3d9a6', '#cfe8dc', '#f1cfe0', '#d7ddf3', '#f6cbb0', '#d9ecb8']; let n = 0;
      const today = todayIST();
      return `<div class="pg-box"><h2>${MONFULL[m - 1]} ${y} के व्रत और त्योहार · ${esc(place.name)}</h2><div class="pg-cols">${list.length ? list.map(({ date, items }) => items.map(f => `<div class="pg-fe"><div class="dt" style="background:${date === today ? '#f3a79d' : bgs[n++ % 6]}"><b>${+date.slice(8)}</b><small style="color:#1b2150">${MON[m - 1]}</small></div><div><b>${esc(f.name)}${f.dayNo ? ' · दिन ' + f.dayNo : ''}</b><small>${esc(wdOf(date))}${date === today ? ' · आज' : ''}</small></div></div>`).join('')).join('') : '<p class="pg-note">इस महीने कोई व्रत या त्योहार दर्ज नहीं है।</p>'}</div></div>`;
    },
    bind: root => PAGES.events.bind(root)
  },

  // राशिफल: मौजूदा पूरा राशिफल-टूल इसी पेज में
  rashifal: {
    tool: () => '', body: () => '<div class="pg-box"><h2>राशिफल: दैनिक, साप्ताहिक, मासिक, वार्षिक</h2><div id="pg-rashi" style="padding:10px 14px"></div></div>',
    bind: root => mountRashifal(root.querySelector('#pg-rashi'))
  },

  // चौघड़िया
  chaughadiya: {
    tool: () => `${placeBox()}<button type="button" data-d="-1">‹ पिछला दिन</button><input type="date" id="pg-date" value="${S.date}"><button type="button" data-d="0">आज</button><button type="button" data-d="1">अगला दिन ›</button>`,
    body: () => {
      const c = chaughadiya(S.date, place), ms = Date.now();
      const list = arr => arr.map(x => `<div class="pg-ch ${x.good ? 'g' : 'r'}${ms >= x.start && ms < x.end ? ' now' : ''}"><b>${esc(x.name)}${ms >= x.start && ms < x.end ? ' · अभी' : ''}</b><span>${clock(x.start)} – ${clock(x.end)}</span></div>`).join('');
      return `<div class="pg-two"><div class="pg-box"><h2>दिन का चौघड़िया · ${+S.date.slice(8)} ${MONFULL[+S.date.slice(5, 7) - 1]}, ${wdOf(S.date)}</h2>${list(c.day)}</div><div class="pg-box"><h2>रात का चौघड़िया</h2>${list(c.night)}</div></div>
        <p class="pg-note">शुभ: अमृत, शुभ, लाभ, चर। अशुभ: उद्वेग, रोग, काल। स्थान: ${esc(place.name)}</p>`;
    },
    bind: bindDate
  },

  // होरा
  hora: {
    tool: () => `${placeBox()}<button type="button" data-d="-1">‹ पिछला दिन</button><input type="date" id="pg-date" value="${S.date}"><button type="button" data-d="0">आज</button><button type="button" data-d="1">अगला दिन ›</button>`,
    body: () => {
      const h = horas(S.date, place), ms = Date.now();
      const list = arr => arr.map(x => `<div class="pg-ch ${x.night ? 'h2' : 'h1'}${ms >= x.start && ms < x.end ? ' now' : ''}"><b style="color:${PC[x.lord]}">${PG[x.lord]} ${esc(x.lord)} होरा${ms >= x.start && ms < x.end ? ' · अभी' : ''}</b><span>${clock(x.start)} – ${clock(x.end)}</span></div>`).join('');
      return `<div class="pg-two"><div class="pg-box"><h2>दिन की होरा · ${+S.date.slice(8)} ${MONFULL[+S.date.slice(5, 7) - 1]}, ${wdOf(S.date)}</h2>${list(h.filter(x => !x.night))}</div><div class="pg-box"><h2>रात की होरा</h2>${list(h.filter(x => x.night))}</div></div>`;
    },
    bind: bindDate
  }
};

Object.assign(PAGES, makePages(() => refresh()));
Object.assign(PAGES, makeExtraPages({ refresh: () => refresh(), getPlace: () => place, placeBox, S, bindDate }));

function bindDate(root) {
  root.querySelector('#pg-date')?.addEventListener('change', e => { if (e.target.value) { S.date = e.target.value; refresh(); } });
  root.querySelectorAll('[data-d]').forEach(b => b.addEventListener('click', () => { const n = +b.dataset.d; S.date = n ? shiftDate(S.date, n) : todayIST(); refresh(); }));
}

// ---------- ढाँचा: ऊपर की पट्टी, टैब, टूलबार, सामग्री ----------
let cur = null;
function refresh() {
  const root = document.getElementById('pg-root');
  if (!root || !cur) return;
  const pg = PAGES[cur], keep = root.scrollTop;
  let html = '';
  try { html = pg.body(); } catch (e) { console.error(e); html = '<p class="pg-note">यह पेज लोड नहीं हो सका।</p>'; }
  root.innerHTML = `${CSS}
    <div class="pg-head"><div class="pg-bar"><button type="button" id="pg-back">← होम</button><b>${esc(TITLES[cur])}</b></div>
    <div class="pg-tabs">${KEYS.map(k => `<button type="button" data-more="${k}" class="${k === cur ? 'on' : ''}">${esc(TITLES[k])}</button>`).join('')}</div></div>
    <div class="pg-tool">${pg.tool()}</div><div class="pg-main">${html}</div>`;
  root.querySelector('#pg-back').onclick = () => closePage();
  root.querySelector('#pg-find')?.addEventListener('click', async () => {
    const q = root.querySelector('#pg-place').value;
    try { const { geocodePanchangPlace } = await import('./panchak-engine.js'); place = await geocodePanchangPlace(q); try { localStorage.setItem(STORE, JSON.stringify(place)); } catch (e) { /* ignore */ } refresh(); } catch (e) { alert(e.message || 'स्थान नहीं मिला'); }
  });
  pg.bind(root);
  root.scrollTop = keep;
}

function openPage(key) {
  if (!PAGES[key]) return;
  cur = key;
  if (!document.getElementById('pg-root')) { const r = document.createElement('div'); r.id = 'pg-root'; document.body.appendChild(r); }
  document.body.style.overflow = 'hidden';
  refresh();
  document.getElementById('pg-root').scrollTop = 0;
}
function closePage() {
  cur = null;
  document.getElementById('pg-root')?.remove();
  document.body.style.overflow = '';
  if (location.hash.startsWith('#/')) history.pushState('', document.title, location.pathname + location.search);
}
function sync() {
  const m = location.hash.match(/^#\/([a-z]+)$/);
  if (m && PAGES[m[1]]) openPage(m[1]);
  else if (cur) { cur = null; document.getElementById('pg-root')?.remove(); document.body.style.overflow = ''; }
}

export function mountPages() {
  if (window.__pgMounted) return;
  window.__pgMounted = true;
  mountMilanTools();
  mountExtraTools();
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-more]');
    if (!b || !PAGES[b.dataset.more]) return;
    e.preventDefault(); e.stopPropagation();
    location.hash = '#/' + b.dataset.more;
  }, true);
  window.addEventListener('hashchange', sync);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && cur) closePage(); });
  sync();
}
