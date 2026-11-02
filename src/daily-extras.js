// होम "डैशबोर्ड": दिन की समय-रेखा + कार्ड (पंचांग, कुंडली D1, ग्रह स्थिति, चंद्र कला, घटी घड़ी, त्योहार,
// राशिफल, चौघड़िया, होरा, आने वाली ग्रह-घटनाएँ)। हर दिन अपने-आप; स्थान डिफ़ॉल्ट Lucknow, GPS मिलते ही बदल जाता है।
// हर कार्ड के नीचे "और देखें →" (data-page) आपके मौजूदा main.js के पेज/सेक्शन खोलता है। नई CSS फ़ाइल की ज़रूरत नहीं।
import { DEFAULT_PLACE, todayIST, shiftDate, getPanchangDay, getDayTimes, getFestivalsForDate, getUpcomingFestivals, WEEKDAYS_HI } from './festival-calendar.js';
import { swissPlanetaryEvents } from './swe-events.js';
import { grahaPositions, ascendantSidereal, moonPhase, chaughadiya, horas, planetaryEvents, RASHI_HI, GRAHA_ORDER } from './graha-engine.js';
import { rashifal } from './rashifal.js';

import { mountPages } from './pages.js';
const TZ = 'Asia/Kolkata';
const STORE = 'arunodaya.place';
const NAVY = 'var(--navy, #10264a)';
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clock = d => new Intl.DateTimeFormat('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: TZ }).format(d);
const mdt = (d, iso) => !d ? '—' : new Date(+d + 330 * 60000).toISOString().slice(0, 10) === iso ? clock(d) : new Intl.DateTimeFormat('hi-IN', { day: 'numeric', month: 'short', timeZone: TZ }).format(d) + ', ' + clock(d);
const dayOf = d => new Date(d.getTime() + 330 * 60000).toISOString().slice(0, 10);
const MON = ['जन॰', 'फ़र॰', 'मार्च', 'अप्रै॰', 'मई', 'जून', 'जुला॰', 'अग॰', 'सित॰', 'अक्टू॰', 'नव॰', 'दिस॰'];
const MONFULL = ['जनवरी', 'फ़रवरी', 'मार्च', 'अप्रैल', 'मई', 'जून', 'जुलाई', 'अगस्त', 'सितंबर', 'अक्टूबर', 'नवंबर', 'दिसंबर'];
const stamp = d => { const [y, m, dd] = dayOf(d).split('-').map(Number); return `${dd} ${MONFULL[m - 1]} ${y}, ${clock(d)}`; };
const dms = x => { const d = Math.floor(x), m = Math.floor((x - d) * 60); return `${d}°${String(m).padStart(2, '0')}′`; };
const shortDate = d => { const [, m, dd] = dayOf(d).split('-').map(Number); return `${dd} ${MON[m - 1]}, ${clock(d)}`; };
const wdOf = iso => WEEKDAYS_HI[new Date(`${iso}T12:00:00Z`).getUTCDay()];

let place = DEFAULT_PLACE;
try { const s = JSON.parse(localStorage.getItem(STORE) || 'null'); if (s && isFinite(s.lat) && isFinite(s.lon)) place = s; } catch (e) { /* ignore */ }

// ---------- उत्तर भारतीय D1 चार्ट (SVG) ----------
const HOUSE_CENTER = [[150, 70], [75, 30], [30, 75], [70, 150], [30, 225], [75, 270], [150, 230], [225, 270], [270, 225], [230, 150], [270, 75], [225, 30]];
function chartSvg(lagnaSign, pos) {
  const byHouse = Array.from({ length: 12 }, () => []);
  for (const g of GRAHA_ORDER) byHouse[(pos[g].sign - lagnaSign + 12) % 12].push(pos[g]);
  let t = '';
  for (let h = 0; h < 12; h++) {
    const [cx, cy] = HOUSE_CENTER[h];
    t += `<text x="${cx}" y="${cy - 14}" font-size="10" text-anchor="middle" opacity=".55">${((lagnaSign + h) % 12) + 1}</text>`;
    const items = byHouse[h].map(g => g.short + (g.retro && g.key !== 'rahu' && g.key !== 'ketu' ? '(व)' : ''));
    for (let i = 0; i < items.length; i += 3) t += `<text x="${cx}" y="${cy + 2 + (i / 3) * 14}" font-size="12" font-weight="700" text-anchor="middle">${esc(items.slice(i, i + 3).join(' '))}</text>`;
  }
  return `<svg viewBox="0 0 300 300" width="100%" style="max-width:300px;display:block;margin:6px auto;color:#1b2150" role="img" aria-label="D1 कुंडली">
    <polygon points="150,0 225,75 150,150 75,75" fill="#ffe3c4"/>
    <g fill="none" stroke="#1f2a5a" stroke-width="1.5"><rect x="1" y="1" width="298" height="298"/><line x1="0" y1="0" x2="300" y2="300"/><line x1="300" y1="0" x2="0" y2="300"/><polygon points="150,0 300,150 150,300 0,150"/></g>
    <g fill="#1b2150">${t}</g></svg>`;
}

// ---------- कार्ड / पंक्ति ----------
const ROW_BASE = 'display:flex;flex-direction:row;align-items:flex-start;justify-content:flex-start;gap:10px;padding:8px 10px;margin:6px 0;border:1px solid #e1e4ee;border-radius:12px;background:#fff;';
const row = (icon, title, sub, hl) => `
  <div class="timing-item" style="${ROW_BASE}${hl ? 'outline:2px solid #e0771f;outline-offset:-2px;' : ''}">
    <span class="timing-icon" style="flex:0 0 auto;width:24px;text-align:center;line-height:1.4">${icon}</span>
    <div style="text-align:left;flex:1;min-width:0"><b style="display:block;font-size:.95em">${esc(title)}</b>${sub ? `<small style="display:block;line-height:1.6;color:#4b5563">${sub}</small>` : ''}</div>
  </div>`;
const kv = (k, v, last) => `<div style="display:flex;justify-content:space-between;gap:12px;padding:9px 0;${last ? '' : 'border-bottom:1px solid #e7e9f3'}"><span style="color:#5b6283">${esc(k)}</span><b style="text-align:right">${v}</b></div>`;
const card = (title, body, more, right = '') => `
  <section class="dx-p"><h3 class="dx-h"><span>${title}</span>${right ? `<small>${right}</small>` : ''}</h3>
    <div class="dx-b">${body}</div>
    ${more ? `<button type="button" class="dx-more" data-more="${more[0]}">${esc(more[1])} →</button>` : ''}</section>`;
const PG = { 'सूर्य': '☉', 'चंद्र': '☽', 'मंगल': '♂', 'बुध': '☿', 'गुरु': '♃', 'शुक्र': '♀', 'शनि': '♄', 'राहु': '☊', 'केतु': '☋' };
const PC = { 'सूर्य': '#e07b00', 'चंद्र': '#8a8f98', 'मंगल': '#d33a2f', 'बुध': '#2e9b4a', 'गुरु': '#d49a00', 'शुक्र': '#e0609f', 'शनि': '#6b8794', 'राहु': '#a0765f', 'केतु': '#a14fc4' };
const RG = '♈♉♊♋♌♍♎♏♐♑♒♓';
const evGlyph = t => /युति/.test(t) ? '☌' : /60°/.test(t) ? '⚹' : /90°/.test(t) ? '□' : /120°/.test(t) ? '△' : /150°/.test(t) ? '⚻' : /180°/.test(t) ? '☍' : (PG[t.split(' ')[0]] || '●');
const DXCSS = `<style>
#home-extras-section{width:100vw;max-width:none;margin-left:calc(50% - 50vw);margin-right:0;padding:0;border:0;border-radius:0;background:transparent}
#home-extras-section>.section-heading{padding:10px max(16px,env(safe-area-inset-left,0px))}
#home-extras-section #home-extras-result{padding:0;border:0;background:transparent;max-width:none}
.dx-top{display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;padding:8px max(16px,env(safe-area-inset-left,0px));border-bottom:1px solid var(--line,#d9d2cc)}
.dx-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));border-left:1px solid var(--pborder,#5c5f63);border-top:1px solid var(--pborder,#5c5f63);align-items:stretch}
.dx-p{background:var(--dcard,#fff);color:var(--dtxt,#2b2b2b);border-right:1px solid var(--pborder,#5c5f63);border-bottom:1px solid var(--pborder,#5c5f63);display:flex;flex-direction:column;min-width:0}
.dx-h{margin:0;background:var(--dhead,#4d5157);color:var(--dheadtx,#fff);font-size:15px;font-weight:600;padding:9px 14px;display:flex;justify-content:space-between;gap:8px;line-height:1.4}
body:not(.dash-on) .dx-h{background:#4d5157}.dx-h small{font-weight:400;opacity:.85;color:inherit}
.dx-b{flex:1;min-width:0;padding:4px 0 8px}.dx-b>.dx-pad{padding:0 14px}
.dx-more{align-self:flex-end;background:none;border:0;padding:8px 14px;color:var(--dacc,#b0550a);font:inherit;font-size:12px;font-weight:700;letter-spacing:.06em;cursor:pointer}
.dx-kv{display:flex;justify-content:space-between;gap:14px;padding:6px 14px;border-bottom:1px dotted var(--line,#d9d2cc)}.dx-kv span{opacity:.7;flex:none}.dx-kv b{text-align:right;font-weight:600;color:var(--dacc,#b0550a)}
.dx-gr{display:grid;grid-template-columns:24px 52px 1fr 52px 50px;gap:6px;align-items:center;padding:6px 14px;border-bottom:1px dotted var(--line,#d9d2cc);font-size:13px}.dx-gr i{font:700 19px/1 serif;font-style:normal}.dx-gr em{font-style:normal}.dx-gr small{grid-column:2/-1;opacity:.7;margin-top:-4px}
.dx-ev{display:flex;gap:12px;align-items:center;padding:8px 14px;border-bottom:1px solid var(--line,#d9d2cc)}.dx-ev i{flex:none;width:30px;text-align:center;font:400 23px/1 serif;font-style:normal}.dx-ev b{display:block;color:var(--dacc,#b0550a);font-weight:600}.dx-ev small{opacity:.7}
.dx-ra{display:grid;grid-template-columns:90px 1fr auto;gap:8px;padding:7px 14px;border-bottom:1px solid var(--line,#d9d2cc);align-items:center}.dx-ra .s{color:#e0771f;letter-spacing:.1em}.dx-ra small{background:#f6e5c3;color:#1b2150;padding:1px 9px}
.dx-ch{display:flex;justify-content:space-between;gap:8px;padding:7px 14px;border-bottom:1px solid rgba(255,255,255,.6);color:#1b2150}.dx-ch.g{background:#e1f2e8}.dx-ch.r{background:#fbe3df}.dx-ch.h1{background:#fdf0d5}.dx-ch.h2{background:#e8e6f3}.dx-ch.now{outline:2px solid #e0771f;outline-offset:-2px}
.dx-sub{padding:5px 14px;background:rgba(128,128,128,.18);font-size:12px}
.dx-fill{display:flex;flex-direction:column;height:100%}.dx-fill>.dx-ev,.dx-fill>.dx-ra{flex:1 1 auto}
.dash-card{border-radius:0!important}.dash-two{gap:0!important}
@media(max-width:1000px){.dx-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:680px){.dx-grid{grid-template-columns:1fr}.dx-gr{grid-template-columns:24px 48px 1fr 48px}}
</style>`;

// ---------- दिन में एक बार निकलने वाली गणनाएँ (कैश) ----------
const memo = { key: '', data: null };
function dayData(today) {
  const key = today + '|' + place.lat + '|' + place.lon;
  if (memo.key === key && memo.data) return memo.data;
  const d = {};
  try { d.pd = getPanchangDay(today, place); } catch (e) { console.error(e); }
  try { d.dt = getDayTimes(today, place); } catch (e) { console.error(e); }
  try { d.todayFest = getFestivalsForDate(today, place); d.upcoming = getUpcomingFestivals(today, 30, place); } catch (e) { console.error(e); d.todayFest = []; d.upcoming = []; }
  try { d.rashi = rashifal('day', today).signs; } catch (e) { console.error(e); d.rashi = []; }
  memo.key = key; memo.data = d;
  return d;
}
let evMemo = { hour: -1, list: [] }, evBusy = -1;
// Swiss Ephemeris से (पेज वाली सूची जैसी); तैयार होने तक पुराना तरीका, और अगले टिक पर नई सूची
function eventsNow(ms) {
  const hour = Math.floor(ms / 3600000);
  if (evMemo.hour !== hour && evBusy !== hour) {
    evBusy = hour;
    swissPlanetaryEvents(ms, 60, 8)
      .then(list => { evMemo = { hour, list }; })
      .catch(() => { try { evMemo = { hour, list: planetaryEvents(ms, 60, 8) }; } catch (e) { console.error(e); evMemo = { hour, list: [] }; } });
  }
  return evMemo.list;
}

function render(container) {
  const now = new Date(), ms = now.getTime(), today = todayIST();
  const D = dayData(today), pd = D.pd, dt = D.dt;
  const pos = grahaPositions(ms), asc = ascendantSidereal(ms, place.lat, place.lon), lagnaSign = Math.floor(asc / 30), ph = moonPhase(ms);

  let ch = { day: [], night: [] }, prevNight = [], hr = [], prevHr = [];
  try { ch = chaughadiya(today, place); prevNight = chaughadiya(shiftDate(today, -1), place).night; hr = horas(today, place); prevHr = horas(shiftDate(today, -1), place).slice(12); } catch (e) { console.error(e); }
  const inRange = x => ms >= x.start.getTime() && ms < x.end.getTime();
  const curCh = [...prevNight, ...ch.day, ...ch.night].find(inRange), curHr = [...prevHr, ...hr].find(inRange);

  let h = DXCSS + `<div class="dx-top"><small>${esc(place.name)} · ${esc(stamp(now))} IST</small>
    <button id="extras-gps" type="button" style="font:inherit;font-size:.8em;padding:6px 12px;cursor:pointer">मेरी लोकेशन</button></div>`;
  const cards = [];
  const chain = list => list.map(s => esc(s.label) + (s.end ? ' · ' + (dayOf(s.end) === today ? clock(s.end) : shortDate(s.end)) + ' तक' : '')).join('<br>');
  const dk = (k, v) => `<div class="dx-kv"><span>${esc(k)}</span><b>${v}</b></div>`;

  // आज का पंचांग
  if (pd) {
    let b = dk('वार · पक्ष', `${esc(pd.weekday)} · ${esc(pd.paksha)}`) + dk('तिथि', chain(pd.tithis)) + dk('नक्षत्र', chain(pd.nakshatras)) + dk('योग', chain(pd.yogas)) + dk('करण', chain(pd.karanas))
      + dk('चंद्र राशि', chain(pd.moonRashi)) + dk('सूर्य राशि · नक्षत्र', `${esc(pd.sunRashi)} · ${esc(pd.sunNakshatra)}`)
      + dk('चांद्र मास', `अमांत ${esc(pd.amantaMonth)} · पूर्णिमांत ${esc(pd.purnimantaMonth)}`)
      + dk('सूर्योदय / सूर्यास्त', `${clock(pd.sunrise)} / ${clock(pd.sunset)}`) + dk('चंद्रोदय / चंद्रास्त', `${mdt(pd.moonrise, pd.date)} / ${mdt(pd.moonset, pd.date)}`)
      + dk('संवत', `विक्रम ${pd.vikramSamvat} · शक ${pd.shakaSamvat} · गुजराती ${pd.gujaratiSamvat}`);
    if (dt) b += dk('राहुकाल', `${clock(dt.rahu.start)} – ${clock(dt.rahu.end)}`) + dk('यमगंड', `${clock(dt.yama.start)} – ${clock(dt.yama.end)}`) + dk('गुलिक काल', `${clock(dt.gulika.start)} – ${clock(dt.gulika.end)}`) + dk('अभिजीत मुहूर्त', `${clock(dt.abhijit.start)} – ${clock(dt.abhijit.end)}`) + dk('ब्रह्म मुहूर्त', `${clock(dt.brahma.start)} – ${clock(dt.brahma.end)}`);
    cards.push(card('आज का पंचांग', b, ['panchang', 'और देखें'], esc(pd.weekday)));
  }

  // लग्न कुंडली + ग्रह (चिह्नों के साथ)
  const grows = GRAHA_ORDER.map(k => { const g = pos[k]; return `<div class="dx-gr"><i style="color:${PC[g.name]}">${PG[g.name]}</i><span>${esc(g.name)}</span><em>${RG[g.sign]} ${esc(g.rashi)}</em><b>${dms(g.deg)}</b><u style="text-decoration:none;opacity:.7">${k === 'rahu' || k === 'ketu' ? 'वक्री' : g.retro ? 'वक्री' : 'मार्गी'}</u><small>${esc(g.nakshatra)} पद ${g.pada}</small></div>`; }).join('');
  cards.push(card('लग्न कुंडली (D1) और ग्रह', chartSvg(lagnaSign, pos) + grows, ['kundli', 'और देखें'], `लग्न ${esc(RASHI_HI[lagnaSign])} ${dms(asc % 30)}`));

  // आने वाली ग्रह-घटनाएँ (चिह्नों के साथ)
  {
    const ev = eventsNow(ms);
    const body = ev.length ? `<div class="dx-fill">${ev.map(e => { const first = e.text.split(' ')[0].split('-')[0]; return `<div class="dx-ev"><i style="color:${PC[first] && !/°|युति/.test(e.text) ? PC[first] : 'inherit'}">${evGlyph(e.text)}</i><div style="min-width:0"><b>${esc(e.text)}</b><small>${esc(shortDate(new Date(e.ms)))} · ${Math.max(0, Math.floor((e.ms - ms) / 86400000)) === 0 ? 'आज' : Math.floor((e.ms - ms) / 86400000) + ' दिन बाद'}</small></div></div>`; }).join('')}</div>` : '<p class="dx-pad">अगले 60 दिनों में कोई प्रमुख ग्रह-घटना नहीं।</p>';
    cards.push(card('आने वाली ग्रह-घटनाएँ', body, ['events', 'और देखें'], 'राशि · नक्षत्र · वक्री · कोण'));
  }

  // आज का राशिफल
  if (D.rashi && D.rashi.length) {
    const word = n => n >= 4 ? 'शुभ' : n === 3 ? 'मिला-जुला' : 'सावधानी';
    cards.push(card('आज का राशिफल', `<div class="dx-fill">${D.rashi.map(s => { const n = s.stars.overall; return `<div class="dx-ra"><b>${esc(s.sym || '')} ${esc(s.name)}</b><span class="s" aria-label="${n} में से 5">${'★'.repeat(n)}${'☆'.repeat(5 - n)}</span><small>${word(n)}</small></div>`; }).join('')}</div>`, ['rashifal', 'और देखें'], 'चंद्र राशि के अनुसार'));
  }

  // चौघड़िया
  if (ch.day.length) {
    const list = (t, arr) => `<div class="dx-sub">${t}</div>` + arr.map(c => `<div class="dx-ch ${c.good ? 'g' : 'r'}${c === curCh ? ' now' : ''}"><b>${esc(c.name)}${c === curCh ? ' · अभी' : ''}</b><span>${clock(c.start)} – ${clock(c.end)}</span></div>`).join('');
    cards.push(card('चौघड़िया' + (curCh ? ' · अभी ' + esc(curCh.name) : ''), list('दिन', ch.day) + list('रात', ch.night), ['chaughadiya', 'और देखें'], esc(place.name.split(',')[0])));
  }

  // होरा
  if (hr.length) cards.push(card('होरा' + (curHr ? ' · अभी ' + esc(curHr.lord) : ''), hr.map(x => `<div class="dx-ch ${x.night ? 'h2' : 'h1'}${x === curHr ? ' now' : ''}"><b style="color:${PC[x.lord]}">${PG[x.lord]} ${esc(x.lord)}</b><span>${clock(x.start)} – ${clock(x.end)}</span></div>`).join(''), ['hora', 'और देखें']));

  // चंद्र कला
  cards.push(card('चंद्र कला', dk('प्रकाशित भाग', `${ph.illumination.toFixed(0)}%`) + dk('पक्ष', `${esc(ph.paksha)} · दिन ${ph.pakshaDay}/15`), null));

  h += `<div class="dx-grid">${cards.join('')}</div>`;
  container.innerHTML = h;
  const btn = container.querySelector('#extras-gps');
  if (btn) btn.onclick = () => locate(container, true);
}

// ---------- स्थान: GPS अनुमति मिलते ही उसी स्थान के हिसाब से ----------
function locate(container, userAsked) {
  if (!navigator.geolocation) { if (userAsked) alert('इस ब्राउज़र में GPS उपलब्ध नहीं है।'); return; }
  navigator.geolocation.getCurrentPosition(p => {
    place = { name: `आपकी लोकेशन (${p.coords.latitude.toFixed(2)}°, ${p.coords.longitude.toFixed(2)}°)`, lat: p.coords.latitude, lon: p.coords.longitude };
    try { localStorage.setItem(STORE, JSON.stringify(place)); } catch (e) { /* ignore */ }
    render(container);
  }, () => { if (userAsked) alert('GPS स्थान नहीं मिल सका। ब्राउज़र में लोकेशन की अनुमति दें।'); }, { enableHighAccuracy: false, timeout: 12000, maximumAge: 600000 });
}

export function mountDailyExtras(container) {
  mountPages(); // "और देखें" बटन के पूरे पेज
  if (!container || container.dataset.extrasMounted === '1') return; // main.js में दो बार बुलाने पर दोहराव नहीं
  container.dataset.extrasMounted = '1';
  try { render(container); } catch (e) { console.error('Daily extras failed:', e); container.innerHTML = '<p>कुंडली और ग्रह स्थिति लोड नहीं हो सकी।</p>'; return; }
  if (navigator.permissions && navigator.permissions.query) {
    navigator.permissions.query({ name: 'geolocation' }).then(st => {
      if (st.state === 'granted') locate(container, false);
      st.onchange = () => { if (st.state === 'granted') locate(container, false); };
    }).catch(() => {});
  }
  setInterval(() => { try { render(container); } catch (e) { console.error(e); } }, 60000); // हर मिनट: अभी का लग्न/चौघड़िया/होरा/घटी और तारीख़ बदलना
}
