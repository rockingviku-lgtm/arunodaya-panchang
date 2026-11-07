// "पंचपक्षी शास्त्र" टूल (#/panchapakshi): जन्म-पक्षी, चंद्र नक्षत्र, पक्ष, तिथि, सूर्योदय-सूर्यास्त और दिन-रात के भाग; Excel-जैसी शीट में।
import { istToMs, fmtIST, moonInfo, dayTimes, birthBird, fivePeriods, TABLES_STATUS } from './panchapakshi-engine.js';
import { BIRDS, ACTIVITY, PROFILES, timetable, currentFor } from './panchapakshi-schedule.js';
import { RASHI_HI } from './graha-engine.js';
import { DEFAULT_PLACE } from './festival-calendar.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const letter = i => String.fromCharCode(65 + i);
export const PANCHAPAKSHI_TITLES = { panchapakshi: 'पंचपक्षी शास्त्र' };
const TOOL_INFO = { panchapakshi: ['पंचपक्षी शास्त्र', 'जन्म-पक्षी, नक्षत्र, पक्ष, दिन-रात की गतिविधि-सारणी'] };

const todayIST = () => new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10);
const ST = { date: '', time: '18:30', run: null };

const CSS = `<style>
.pp-root{font:14px/1.5 "Noto Sans Devanagari",system-ui,sans-serif;color:#1f2328}
.pp-root h2{font-size:17px;margin:12px 0 6px}
.pp-form{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:8px 0}
.pp-form input,.pp-form button{font:inherit;padding:6px 10px;border:1px solid #d0d5dd;border-radius:4px;background:#fff;color:inherit}
.pp-form button{background:#1d6f42;color:#fff;border-color:#1d6f42;cursor:pointer}
.pp-sheet{border:1px solid #d0d5dd;border-radius:4px;overflow:auto;background:#fff;margin:8px 0}
.pp-sheet table{border-collapse:separate;border-spacing:0;width:max-content;min-width:100%;font-variant-numeric:tabular-nums}
.pp-sheet th,.pp-sheet td{border-right:1px solid #d0d5dd;border-bottom:1px solid #d0d5dd;padding:6px 10px;text-align:left;white-space:nowrap;vertical-align:top}
.pp-sheet thead th{background:#eef1f5;font-weight:600}
.pp-sheet thead tr.letters th{font-weight:500;color:#6b7280;text-align:center;font-size:11px}
.pp-sheet th.rn,.pp-sheet td.rn{text-align:center;background:#eef1f5;color:#6b7280;min-width:34px}
.pp-sheet td.wrap{white-space:normal;min-width:240px}
.pp-cap{font-weight:600;margin:10px 0 0}
.pp-note{margin:6px 0;font-size:12px;opacity:.85}
</style>`;

function sheet(headers, rows) {
  const head = `<thead><tr class="letters"><th class="rn"></th>${headers.map((_, i) => `<th>${letter(i)}</th>`).join('')}</tr><tr><th class="rn">#</th>${headers.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead>`;
  const body = rows.map((r, i) => `<tr><td class="rn">${i + 1}</td>${r.map((v, j) => `<td${j === r.length - 1 && headers.length === 2 ? ' class="wrap"' : ''}>${esc(v)}</td>`).join('')}</tr>`).join('');
  return `<div class="pp-sheet"><table>${head}<tbody>${body}</tbody></table></div>`;
}

function body(place) {
  const date = ST.date || todayIST();
  const form = `<div class="pp-form"><input type="date" data-pp-d value="${esc(date)}" aria-label="तारीख़"><input type="time" data-pp-t value="${esc(ST.time)}" aria-label="समय (IST)"><button type="button" data-pp-run>गणना करें</button></div>`;
  let out = '';
  if (ST.run) {
    const ms = istToMs(ST.run.date, ST.run.time);
    const mi = moonInfo(ms);
    const dt = dayTimes(ST.run.date, place);
    const bird = birthBird(mi.nakshatraNo, mi.paksha) || '—';
    const summary = [
      ['जन्म-पक्षी', bird],
      ['चंद्र नक्षत्र', `${mi.nakshatra} (नक्षत्र ${mi.nakshatraNo})`],
      ['नक्षत्र चरण', String(mi.pada)],
      ['चंद्र राशि', RASHI_HI[mi.sign]],
      ['पक्ष और तिथि', `${mi.paksha} पक्ष, तिथि ${mi.tithiInPaksha}`],
      ['सूर्योदय (IST)', dt ? fmtIST(dt.sunrise) : 'उपलब्ध नहीं'],
      ['सूर्यास्त (IST)', dt ? fmtIST(dt.sunset) : 'उपलब्ध नहीं'],
      ['दिन की अवधि', dt ? `${Math.floor(dt.dayMin / 60)} घंटे ${dt.dayMin % 60} मिनट` : '—'],
      ['रात की अवधि', dt ? `${Math.floor(dt.nightMin / 60)} घंटे ${dt.nightMin % 60} मिनट` : '—']
    ];
    let periods = '';
    if (dt) {
      const per = fivePeriods(dt);
      const f = t => fmtIST(t);
      const rows = [
        ...per.day.map(([a, b], i) => ['दिन', `भाग ${i + 1}`, f(a), f(b)]),
        ...per.night.map(([a, b], i) => ['रात', `भाग ${i + 1}`, f(a), f(b)])
      ];
      periods = `<p class="pp-cap">दिन-रात के पाँच-पाँच बराबर भाग</p>${sheet(['अवधि', 'भाग', 'शुरू (IST)', 'समाप्त (IST)'], rows)}`;
    }
    // गतिविधि-सारणी: शुक्ल पक्ष में VedAstro भाग 5 (असत्यापित); कृष्ण पक्ष में असमर्थित
    const profile = mi.paksha === 'शुक्ल' ? PROFILES['vedastro-part5-bright'] : PROFILES['vedastro-part6-dark'];
    const tt = timetable(ST.run.date, place, profile);
    let sched = '';
    if (tt.supported) {
      const rows = tt.slots.map(sl => [`${sl.part} ${sl.yama}`, `${fmtIST(sl.start)}–${fmtIST(sl.end)}`, ...sl.activities.map(a => a.activity)]);
      const cur = currentFor(ms, tt, bird);
      const curHtml = cur
        ? `<p class="pp-cap">जन्म-समय पर ${esc(bird)} की गतिविधि</p>${sheet(['पक्षी', 'अभी', 'शुरू (IST)', 'समाप्त (IST)', 'शेष (मिनट)', 'अगली'], [[cur.bird, cur.activity, fmtIST(cur.start), fmtIST(cur.end), String(cur.remainingMin), cur.next ? cur.next.activity : '—']])}`
        : `<p class="pp-note">जन्म-समय इस तारीख़ की सारणी के भीतर नहीं है।</p>`;
      sched = `<p class="pp-cap">दिन-रात की गतिविधि-सारणी (शुक्ल पक्ष, सत्यापन बाकी)</p>${sheet(['भाग', 'समय (IST)', ...BIRDS], rows)}${curHtml}
`;
    } else {
      sched = `<p class="pp-cap">गतिविधि-सारणी उपलब्ध नहीं</p><p class="pp-note">इस पक्ष की गतिविधि-सारणी अभी सत्यापित नहीं है।</p>`;
    }
    out = `<p class="pp-cap">गणना: ${esc(ST.run.date)} ${esc(ST.run.time)} IST · ${esc(place.name)}</p>
      ${sheet(['श्रेणी', 'मान'], summary)}
      ${periods}
      ${sched}
      <p class="pp-note">${esc(TABLES_STATUS.reason)}</p>
      <p class="pp-note">जन्म-पक्षी एक पारंपरिक तालिका पर आधारित है। अलग परंपराओं में परिणाम अलग हो सकता है। यह मार्गदर्शन है, गारंटी नहीं।</p>`;
  } else {
    out = `<p class="pp-note">तारीख़ और समय चुनकर "गणना करें" दबाएँ।</p>`;
  }
  return `${CSS}<div class="pp-root"><h2>पंचपक्षी शास्त्र</h2>${form}${out}<p class="pp-note">सभी समय भारतीय समय (IST) में। स्थान: ${esc(place.name)}।</p></div>`;
}

export function makePanchapakshiPages({ refresh, getPlace }) {
  const bind = root => {
    root.querySelectorAll('[data-pp-run]').forEach(b => b.addEventListener('click', () => {
      const d = root.querySelector('[data-pp-d]'), t = root.querySelector('[data-pp-t]');
      ST.date = d ? d.value : ST.date; ST.time = t ? t.value : ST.time;
      ST.run = { date: ST.date || todayIST(), time: ST.time || '12:00' };
      refresh();
    }));
  };
  return {
    panchapakshi: {
      tool: () => '',
      body: () => body(getPlace() || DEFAULT_PLACE),
      bind
    }
  };
}

export function mountPanchapakshiTools() {
  const add = () => {
    const grid = document.querySelector('.tool-grid');
    if (!grid || grid.dataset.panchapakshi) return;
    grid.dataset.panchapakshi = '1';
    for (const k of Object.keys(PANCHAPAKSHI_TITLES)) {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'tool-card'; b.dataset.more = k;
      b.innerHTML = `<span class="tool-icon"></span><b>${esc(TOOL_INFO[k][0])}</b><small>${esc(TOOL_INFO[k][1])}</small><span class="tool-arrow">↗</span>`;
      grid.appendChild(b);
    }
  };
  add();
  if (!document.querySelector('.tool-grid[data-panchapakshi]')) {
    const mo = new MutationObserver(() => { add(); if (document.querySelector('.tool-grid[data-panchapakshi]')) mo.disconnect(); });
    mo.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => mo.disconnect(), 30000);
  }
}
