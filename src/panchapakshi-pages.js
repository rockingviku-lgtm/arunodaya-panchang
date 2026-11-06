// "पंचपक्षी शास्त्र" टूल (#/panchapakshi): चंद्र नक्षत्र, पक्ष, तिथि और सूर्योदय-सूर्यास्त। पक्षी-तालिका स्रोत मिलने के बाद।
import { istToMs, fmtIST, moonInfo, dayTimes, birthBirds, fivePeriods, TABLES_STATUS } from './panchapakshi-engine.js';
import { RASHI_HI } from './graha-engine.js';
import { DEFAULT_PLACE } from './festival-calendar.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const PANCHAPAKSHI_TITLES = { panchapakshi: 'पंचपक्षी शास्त्र' };
const TOOL_INFO = { panchapakshi: ['पंचपक्षी शास्त्र', 'जन्म-पक्षी (दो परंपराएँ), नक्षत्र, पक्ष, दिन-रात के भाग'] };

const todayIST = () => new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10);
const ST = { date: '', time: '18:30', run: null };

const CSS = `<style>
.pp-root{font:14px/1.5 "Noto Sans Devanagari",system-ui,sans-serif;color:#3a1a00}
.pp-root h2{font-size:17px;margin:12px 0 6px}
.pp-form{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:8px 0}
.pp-form input,.pp-form button{font:inherit;padding:6px 10px;border:1px solid #d98a4c;border-radius:6px;background:#ffbb5f;color:inherit}
.pp-form button{background:#a80f0f;color:#fff;border-color:#a80f0f}
.pp-card{border:1px solid #d98a4c;border-radius:8px;padding:10px;background:#ffbb5f}
.pp-card dl{display:grid;grid-template-columns:auto 1fr;gap:4px 12px;margin:0}
.pp-card dt{font-weight:600}.pp-card dd{margin:0}
.pp-note{margin-top:10px;font-size:12px;opacity:.9}
</style>`;

function body(place) {
  const date = ST.date || todayIST();
  const form = `<div class="pp-form"><input type="date" data-pp-d value="${esc(date)}" aria-label="तारीख़"><input type="time" data-pp-t value="${esc(ST.time)}" aria-label="समय (IST)"><button type="button" data-pp-run>गणना करें</button></div>`;
  let out = '';
  if (ST.run) {
    const ms = istToMs(ST.run.date, ST.run.time);
    const mi = moonInfo(ms);
    const dt = dayTimes(ST.run.date, place);
    const rows = [
      ['चंद्र नक्षत्र', `${mi.nakshatra} (नक्षत्र ${mi.nakshatraNo}, चरण ${mi.pada})`],
      ['चंद्र राशि', RASHI_HI[mi.sign]],
      ['पक्ष और तिथि', `${mi.paksha} पक्ष, तिथि ${mi.tithiInPaksha}`],
      ['सूर्योदय (IST)', dt ? fmtIST(dt.sunrise) : 'इस स्थान पर उपलब्ध नहीं'],
      ['सूर्यास्त (IST)', dt ? fmtIST(dt.sunset) : 'इस स्थान पर उपलब्ध नहीं'],
      ['दिन की अवधि', dt ? `${Math.floor(dt.dayMin / 60)} घंटे ${dt.dayMin % 60} मिनट` : '—'],
      ['रात की अवधि', dt ? `${Math.floor(dt.nightMin / 60)} घंटे ${dt.nightMin % 60} मिनट` : '—']
    ];
    const bb = birthBirds(mi.nakshatraNo, mi.paksha);
    const birdRows = bb.rows.map(r => `<dt>जन्म-पक्षी (${esc(r.label)})</dt><dd>${esc(r.bird)}${r.paksha_dependent ? ' · पक्ष पर निर्भर' : ''} <a href="${esc(r.source)}" target="_blank" rel="noopener">स्रोत</a></dd>`).join('');
    const per = dt ? fivePeriods(dt) : null;
    const fmtP = arr => arr.map(([a, b], i) => `भाग ${i + 1}: ${fmtIST(a)}–${fmtIST(b)}`).join('<br>');
    out = `<div class="pp-card"><dl>${rows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}${birdRows}</dl>
      <p class="pp-note">${bb.conflict ? 'दोनों परंपराएँ इस नक्षत्र पर अलग पक्षी देती हैं। हर परंपरा का परिणाम ऊपर अलग दिखाया गया है; उन्हें मिलाया नहीं गया है।' : 'दोनों परंपराएँ एक ही पक्षी देती हैं।'}</p>
      ${per ? `<div class="pp-card"><dl><dt>दिन के पाँच बराबर भाग</dt><dd>${fmtP(per.day)}</dd><dt>रात के पाँच बराबर भाग</dt><dd>${fmtP(per.night)}</dd></dl><p class="pp-note">यह एक सेकेंडरी स्रोत (Hindu-blog) की विधि है।</p></div>` : ''}
      <p class="pp-note">स्थान: ${esc(place.name)} · ${esc(ST.run.date)} ${esc(ST.run.time)} IST</p></div>
      <p class="pp-note">${esc(TABLES_STATUS.reason)}</p>`;
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
