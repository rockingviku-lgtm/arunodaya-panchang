// "ग्रह गोचर" पेज (#/gochar): चुनी तारीख़ की ग्रह-स्थिति (कुंडली-चार्ट सहित), महीने के गोचर,
// साल भर के राशि-परिवर्तन, वक्री-मार्गी और वर्गोत्तम। साल 2026 से 2099 तक। हिसाब gochar-calc.js में है।
// pages.js इसे import करता है; होम के टूल-ग्रिड में कार्ड भी यहीं से जुड़ता है।
import { todayIST } from './festival-calendar.js';
import { RASHI_HI } from './graha-engine.js';
import { GOCHAR_MIN, GOCHAR_MAX, MONTHS_HI, istMs, istParts, fmtDate, fmtDT, daysInMonth, positionsAt, yearData, monthEvents } from './gochar-calc.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const GOCHAR_TITLES = { gochar: 'ग्रह गोचर' };
const TOOL_INFO = { gochar: ['ग्रह गोचर', 'वक्री-मार्गी, वर्गोत्तम और महीने की ग्रह-स्थिति'] };

const t0 = istParts(Date.now()), inRange = t0.y >= GOCHAR_MIN && t0.y <= GOCHAR_MAX;
export const GC_STATE = inRange ? { y: t0.y, m: t0.m, d: t0.d } : { y: GOCHAR_MIN, m: 1, d: 1 };

const CSS = `<style>
.gc-f{display:flex;flex-wrap:wrap;gap:10px;padding:12px 14px;border-bottom:1px solid var(--line,#ddd)}
.gc-f label{display:flex;flex-direction:column;gap:3px;font-size:12px;opacity:.9}
.gc-f select,.gc-f button{font:inherit;padding:6px 10px;border:1px solid var(--btnbd,#bbb);background:var(--btnbg,#fff);color:var(--dtxt,#222)}
.gc-f button{font-weight:700;color:var(--btntx,#a80f0f);cursor:pointer;align-self:flex-end}
.gc-chart{display:grid;grid-template-columns:repeat(4,1fr);grid-template-rows:repeat(4,minmax(72px,auto));max-width:440px;margin:12px auto;border:1px solid var(--line,#999)}
.gc-c{border:1px solid var(--line,#999);padding:3px 5px;font-size:13px;line-height:1.35;min-width:0}
.gc-c small{display:block;font-size:10.5px;opacity:.6}
.gc-c b{font-weight:700;margin-right:6px;white-space:nowrap;color:var(--dacc,#b8650b)}
.gc-c b.r{color:#c0392b}
.gc-mid{grid-area:2/2/4/4;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:8px;font-size:13px;border:1px solid var(--line,#999)}
.gc-mid strong{font-size:15px}
.gc-leg{font-size:12px;opacity:.85;padding:0 14px 10px}
.gc-t{width:100%;border-collapse:collapse;font-size:13.5px}
.gc-t th{text-align:left;padding:6px 10px;background:var(--dhead,#5c5f63);color:var(--dheadtx,#fff);font-weight:600;white-space:nowrap}
.gc-t td{padding:6px 10px;border-bottom:1px solid var(--line,#ddd);vertical-align:top}
.gc-w{overflow-x:auto}
.gc-tag{display:inline-block;padding:1px 7px;border:1px solid currentColor;border-radius:10px;font-size:11.5px;margin-left:4px;white-space:nowrap}
.gc-tag.r{color:#c0392b}.gc-rt{color:#c0392b}.gc-tag.v{color:var(--dacc,#b8650b)}
.gc-ev{display:flex;gap:10px;padding:7px 14px;border-bottom:1px solid var(--line,#ddd);font-size:13.5px}.gc-ev>span:first-child{flex:none;min-width:150px;opacity:.8}
.gc-d{border-bottom:1px solid var(--line,#ddd)}.gc-d summary{cursor:pointer;padding:8px 14px;font-weight:700}.gc-d>div{padding:0 14px 8px;font-size:13.5px}.gc-d p{margin:3px 0}
</style>`;

const POS = { 11: [1, 1], 0: [1, 2], 1: [1, 3], 2: [1, 4], 3: [2, 4], 4: [3, 4], 5: [4, 4], 6: [4, 3], 7: [4, 2], 8: [4, 1], 9: [3, 1], 10: [2, 1] }; // राशि → (पंक्ति, स्तंभ): दक्षिण भारतीय शैली

function chart(pos, label) {
  const by = {}; pos.forEach(p => (by[p.sign] = by[p.sign] || []).push(p));
  let h = '<div class="gc-chart" role="img" aria-label="ग्रह-स्थिति चार्ट">';
  for (let s = 0; s < 12; s++) {
    const [r, c] = POS[s];
    h += `<div class="gc-c" style="grid-area:${r}/${c}"><small>${RASHI_HI[s]}</small>${(by[s] || []).map(p => `<b class="${p.retro && p.key !== 'rahu' && p.key !== 'ketu' ? 'r' : ''}">${esc(p.short)}${p.retro && p.key !== 'rahu' && p.key !== 'ketu' ? '(व)' : ''}${p.vargottama ? '*' : ''}</b>`).join('')}</div>`;
  }
  return h + `<div class="gc-mid"><strong>ग्रह-स्थिति</strong><span>${esc(label)}</span><span style="opacity:.7">दोपहर 12 बजे (IST)</span></div></div>`
    + '<div class="gc-leg">(व) = वक्री &nbsp; * = वर्गोत्तम &nbsp; रा/के = राहु/केतु (सदा वक्री)</div>';
}

function selectHTML(path, opts, val) {
  return `<select data-g="${path}">${opts.map(([v, l]) => `<option value="${v}" ${+v === +val ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
}

function controls() {
  const { y, m, d } = GC_STATE, yrs = [], days = [];
  for (let i = GOCHAR_MIN; i <= GOCHAR_MAX; i++) yrs.push([i, i]);
  for (let i = 1; i <= daysInMonth(y, m); i++) days.push([i, i]);
  return `<div class="gc-f"><label>साल${selectHTML('y', yrs, y)}</label><label>महीना${selectHTML('m', MONTHS_HI.map((n, i) => [i + 1, n]), m)}</label><label>तारीख़${selectHTML('d', days, d)}</label><button type="button" data-gnow="1">आज</button></div>`;
}

function positionBox() {
  const { y, m, d } = GC_STATE, ms = istMs(y, m, d, 12, 0), pos = positionsAt(ms), lab = fmtDate(ms);
  const rows = pos.map(p => `<tr><td><b>${esc(p.name)}</b></td><td>${esc(p.rashi)} ${p.deg.toFixed(1)}°</td><td>${esc(p.nakshatra)} (चरण ${p.pada})</td><td>${p.retro && p.key !== 'rahu' && p.key !== 'ketu' ? '<b class="gc-rt">वक्री</b>' : esc(p.chaal)}${p.vargottama ? '<span class="gc-tag v">वर्गोत्तम</span>' : ''}</td><td>${esc(p.navamsa)}</td></tr>`).join('');
  return `<div class="pg-box"><h2>ग्रहों की स्थिति · ${esc(lab)}</h2>${controls()}${chart(pos, lab)}
    <div class="gc-w"><table class="gc-t"><thead><tr><th>ग्रह</th><th>राशि और अंश</th><th>नक्षत्र</th><th>चाल / स्थिति</th><th>नवांश राशि</th></tr></thead><tbody>${rows}</tbody></table></div>
    <p class="pg-note">निरयण (लाहिरी) गणना, भारतीय समय के दोपहर 12 बजे के लिए। वर्गोत्तम: ग्रह की राशि और नवांश राशि एक ही हो। चंद्रमा तेज़ चलता है, इसलिए दिन में उसकी राशि बदल सकती है।</p></div>`;
}

function monthBox() {
  const { y, m } = GC_STATE, ev = monthEvents(y, m);
  const rows = ev.length ? ev.map(e => `<div class="gc-ev"><span>${esc(fmtDT(e.ms))}</span><span>${esc(e.text)}</span></div>`).join('') : '<p class="pg-note">इस महीने कोई राशि-परिवर्तन, वक्री-मार्गी या वर्गोत्तम बदलाव नहीं है।</p>';
  return `<div class="pg-box"><h2>${esc(MONTHS_HI[m - 1])} ${y} के गोचर</h2>${rows}</div>`;
}

function retroBox(yd) {
  const per = a => `${a.from == null ? 'वर्ष के आरंभ' : fmtDate(a.from)} से ${a.to == null ? 'वर्ष के अंत के बाद तक' : fmtDate(a.to)}`;
  const names = { mars: 'मंगल', mercury: 'बुध', jupiter: 'गुरु', venus: 'शुक्र', saturn: 'शनि' };
  let rows = '';
  for (const g of ['mercury', 'venus', 'mars', 'jupiter', 'saturn']) {
    const r = yd.retro[g];
    rows += `<tr><td><b>${names[g]}</b></td><td>${r.length ? r.map(a => esc(per(a))).join('<br>') : 'इस वर्ष वक्री नहीं'}</td></tr>`;
  }
  return `<div class="pg-box"><h2>${yd.year} के वक्री और मार्गी</h2><div class="gc-w"><table class="gc-t"><thead><tr><th>ग्रह</th><th>वक्री अवधि (वक्री होने से मार्गी होने तक)</th></tr></thead><tbody>${rows}
    <tr><td><b>राहु-केतु</b></td><td>हमेशा वक्री चलते हैं (औसत गणना)</td></tr><tr><td><b>सूर्य-चंद्र</b></td><td>कभी वक्री नहीं होते</td></tr></tbody></table></div></div>`;
}

function ingressBox(yd) {
  const order = ['jupiter', 'saturn', 'rahu', 'ketu', 'mars', 'venus', 'mercury', 'sun'], nm = { jupiter: 'गुरु', saturn: 'शनि', rahu: 'राहु', ketu: 'केतु', mars: 'मंगल', venus: 'शुक्र', mercury: 'बुध', sun: 'सूर्य' };
  const body = order.map((g, i) => {
    const l = yd.ingress[g];
    return `<details class="gc-d" ${i < 4 ? 'open' : ''}><summary>${nm[g]} (${l.length} राशि-परिवर्तन)</summary><div>${l.length ? l.map(e => `<p>${esc(fmtDT(e.ms))} — ${esc(e.text)}</p>`).join('') : '<p>इस वर्ष राशि नहीं बदलती।</p>'}</div></details>`;
  }).join('');
  return `<div class="pg-box"><h2>${yd.year} के राशि-परिवर्तन (गोचर)</h2>${body}</div>`;
}

function vargBox(yd) {
  const order = ['jupiter', 'saturn', 'mars', 'venus', 'mercury', 'sun', 'rahu', 'ketu'], nm = { jupiter: 'गुरु', saturn: 'शनि', rahu: 'राहु', ketu: 'केतु', mars: 'मंगल', venus: 'शुक्र', mercury: 'बुध', sun: 'सूर्य' };
  const body = order.map(g => {
    const l = yd.varg[g];
    return `<details class="gc-d"><summary>${nm[g]} (${l.length} अवधि)</summary><div>${l.length ? l.map(w => `<p>${esc(w.rashi)} में: ${esc(w.from == null ? 'वर्ष के आरंभ' : fmtDT(w.from))} से ${esc(w.to == null ? 'वर्ष के अंत के बाद तक' : fmtDT(w.to))}</p>`).join('') : '<p>इस वर्ष वर्गोत्तम नहीं होता।</p>'}</div></details>`;
  }).join('');
  return `<div class="pg-box"><h2>${yd.year} के वर्गोत्तम ग्रह</h2>${body}<p class="pg-note">वर्गोत्तम ग्रह वह है जिसकी राशि और नवांश राशि एक ही हो; परंपरा में इसे बलवान माना जाता है। चंद्रमा की वर्गोत्तम अवधि बहुत छोटी होती है, इसलिए ऊपर की ग्रह-स्थिति तालिका में देखें।</p></div>`;
}

export function makeGocharPages({ refresh }) {
  const bind = root => {
    root.querySelectorAll('[data-g]').forEach(el => el.addEventListener('change', () => {
      const k = el.dataset.g; GC_STATE[k] = +el.value;
      GC_STATE.d = Math.min(GC_STATE.d, daysInMonth(GC_STATE.y, GC_STATE.m));
      refresh();
    }));
    root.querySelector('[data-gnow]')?.addEventListener('click', () => {
      const n = istParts(Date.now());
      if (n.y >= GOCHAR_MIN && n.y <= GOCHAR_MAX) Object.assign(GC_STATE, n); else Object.assign(GC_STATE, { y: GOCHAR_MIN, m: 1, d: 1 });
      refresh();
    });
  };
  return {
    gochar: {
      tool: () => '',
      body: () => {
        const yd = yearData(GC_STATE.y);
        const note = GC_STATE.y > 2050 ? '<p class="pg-note">2050 के बाद के ग्रह-स्थान अनुमानित गणना हैं; राशि-बदल और वक्री-मार्गी की तारीख़ें कुछ दिन आगे-पीछे हो सकती हैं।</p>' : '';
        return `${CSS}${positionBox()}${monthBox()}${retroBox(yd)}${ingressBox(yd)}${vargBox(yd)}${note}`;
      },
      bind
    }
  };
}

// ---------- होम के टूल-ग्रिड में कार्ड ----------
export function mountGocharTools() {
  const add = () => {
    const grid = document.querySelector('.tool-grid');
    if (!grid || grid.dataset.gochar) return;
    grid.dataset.gochar = '1';
    for (const k of Object.keys(GOCHAR_TITLES)) {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'tool-card'; b.dataset.more = k;
      b.innerHTML = `<span class="tool-icon"></span><b>${esc(TOOL_INFO[k][0])}</b><small>${esc(TOOL_INFO[k][1])}</small><span class="tool-arrow">↗</span>`;
      grid.appendChild(b);
    }
  };
  add();
  if (!document.querySelector('.tool-grid[data-gochar]')) {
    const mo = new MutationObserver(() => { add(); if (document.querySelector('.tool-grid[data-gochar]')) mo.disconnect(); });
    mo.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => mo.disconnect(), 30000);
  }
}
