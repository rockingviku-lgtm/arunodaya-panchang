// "गोचर और फलादेश" पेज (#/gochar): 2026–2031 की Excel-जैसी शीट: वार्षिक फलादेश, मासिक कुंडली-ग्रह, ग्रह-घटनाएँ।
// हर पंक्ति पर टैप करने से D1 राशि और D9 नवांश कुंडली दिखती है। रंग site के रंगों से मिलते हैं और हर बार बदल सकते हैं।
// pages.js इसे import करता है; होम के टूल-ग्रिड में कार्ड भी यहीं से जुड़ता है। हिसाब gochar-data.js और gochar-engine.js में है।
import { buildGocharData, SHEET_YEARS } from './gochar-data.js';
import { DEFAULT_PLACE } from './festival-calendar.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const letter = i => { let s = '', n = i + 1; while (n) { const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = Math.floor((n - 1) / 26); } return s; };

export const GOCHAR_TITLES = { gochar: 'गोचर और फलादेश' };
const TOOL_INFO = { gochar: ['गोचर, फलादेश और कुंडली', '2026–2031: ग्रह-गोचर, D1/D9 कुंडली, वक्री-मार्गी, वर्गोत्तम'] };

// site के रंग-परिवार (maroon header, cream band, orange panel); हर बार एक चुना जाता है और बटन से बदलता है
const PALETTES = [
  { hd: '#a80f0f', ht: '#ffffff', band: '#ffd79a', accent: '#8b1a00' },
  { hd: '#d98a4c', ht: '#3a1500', band: '#ffc874', accent: '#8b1a00' },
  { hd: '#8b1a00', ht: '#ffffff', band: '#ffd79a', accent: '#a80f0f' },
  { hd: '#5c5f63', ht: '#ffffff', band: '#ffe0b0', accent: '#8b1a00' },
  { hd: '#9f2b00', ht: '#ffffff', band: '#ffb95c', accent: '#111111' }
];

// स्थिति (पेज खुला रहने तक)
const ST = { tab: 'yearly', year: '', q: '', sel: 0, pal: Math.floor(Math.random() * PALETTES.length), data: null, busy: false, err: false };

const SHEETS = {
  yearly: { cols: [['वर्ष', 'year'], ['राशि', 'rashi'], ['समग्र', 'overall', 'star'], ['करियर', 'career', 'star'], ['धन', 'money', 'star'], ['प्रेम', 'love', 'star'], ['स्वास्थ्य', 'health', 'star'], ['मुख्य नोट', 'note', 'wrap']], chart: r => r.chart, title: r => `कुंडली: ${r.year} (${r.rashi}, 1 जनवरी)` },
  monthly: { cols: [['महीना', 'month'], ['लग्न (D1)', 'lagna'], ['लग्न (D9)', 'lagna9'], ['सूर्य', 'sun'], ['चंद्र', 'moon'], ['मंगल', 'mars'], ['बुध', 'mercury'], ['गुरु', 'jupiter'], ['शुक्र', 'venus'], ['शनि', 'saturn'], ['राहु', 'rahu'], ['केतु', 'ketu'], ['वक्री', 'retro', 'retro'], ['वर्गोत्तम', 'vargottam', 'wrap'], ['सबसे अच्छी राशि', 'best']], chart: r => r.chart, title: r => `कुंडली: ${r.month}` },
  events: { cols: [['वर्ष', 'year'], ['माह', 'month'], ['तारीख़', 'date'], ['ग्रह', 'planet'], ['प्रकार', 'kind'], ['घटना', 'text', 'wrap'], ['राशि', 'rashi'], ['फलादेश (माह)', 'phal', 'star']], chart: r => r.chart, title: r => `कुंडली: ${r.dayLabel} · ${r.planet}` }
};

// ---------- चार्ट (उत्तर-भारतीय हीरा) ----------
const FRAME = 'M5 5 L295 295 M295 5 L5 295 M150 5 L295 150 L150 295 L5 150 Z';
const CENTERS = [[150, 45], [78, 38], [38, 78], [45, 150], [38, 222], [78, 262], [150, 255], [222, 262], [262, 222], [255, 150], [262, 78], [222, 38]];
const RASHI = ['मेष', 'वृषभ', 'मिथुन', 'कर्क', 'सिंह', 'कन्या', 'तुला', 'वृश्चिक', 'धनु', 'मकर', 'कुंभ', 'मीन'];
function svgChart(title, asc, pl) {
  const by = Array.from({ length: 12 }, () => []);
  pl.forEach(p => by[(p.sign - asc + 12) % 12].push(p.short));
  const cells = CENTERS.map(([x, y], i) => {
    const sg = (asc + i) % 12, mk = i === 0 ? '<tspan class="gc-la">लग्न </tspan>' : '';
    return `<text x="${x}" y="${y - 9}" class="gc-sg">${mk}${sg + 1}</text><text x="${x}" y="${y + 10}" class="gc-pl">${esc(by[i].join(' '))}</text>`;
  }).join('');
  return `<figure class="gc-fig"><figcaption>${esc(title)}</figcaption><svg viewBox="0 0 300 300" role="img" aria-label="${esc(title)}"><rect x="5" y="5" width="290" height="290" class="gc-fr"/><path d="${FRAME}" class="gc-ln"/>${cells}</svg></figure>`;
}
function chartBlock(c, title, note) {
  const d1 = c.p.map(p => ({ short: p[0], sign: p[1] })), d9 = c.p.map(p => ({ short: p[0], sign: p[2] }));
  return `<div class="gc-kp"><h3>${esc(title)}</h3><div class="gc-charts">${svgChart('D1 राशि · लग्न ' + RASHI[c.a], c.a, d1)}${svgChart('D9 नवांश · लग्न ' + RASHI[c.a9], c.a9, d9)}</div>${note ? `<p class="gc-note">${esc(note)}</p>` : ''}</div>`;
}

// ---------- शीट ----------
function rowsOf(sheet, data) {
  const yr = ST.year, q = ST.q.trim().toLowerCase();
  return data[sheet].filter(r => (!yr || String(r.year ?? r.month).startsWith(yr)) && (!q || Object.values(r).join(' ').toLowerCase().includes(q)));
}
function sheetHtml(data) {
  const sh = SHEETS[ST.tab], items = rowsOf(ST.tab, data);
  if (ST.sel >= items.length) ST.sel = 0;
  const head = `<thead><tr class="letters"><th class="rn"></th>${sh.cols.map((_, i) => `<th>${letter(i)}</th>`).join('')}</tr><tr class="names"><th class="rn">#</th>${sh.cols.map(c => `<th>${esc(c[0])}</th>`).join('')}</tr></thead>`;
  const body = items.map((r, i) => `<tr data-gr="${i}"${i === ST.sel ? ' class="gc-pick"' : ''}><td class="rn">${i + 1}</td>${sh.cols.map(([, k, kind]) => {
    const v = esc(r[k] ?? '—');
    if (kind === 'star') return `<td class="gc-star">${v}</td>`;
    if (kind === 'wrap') return `<td class="gc-wrap">${v}</td>`;
    if (kind === 'retro') return `<td class="gc-retro">${r[k] && r[k] !== '—' ? v : '—'}</td>`;
    return `<td>${v}</td>`;
  }).join('')}</tr>`).join('');
  const table = `<div class="gc-sheet" role="region" aria-label="तालिका" tabindex="0"><table>${head}<tbody>${body || `<tr><td class="gc-empty" colspan="${sh.cols.length + 1}">कोई पंक्ति नहीं।</td></tr>`}</tbody></table></div>`;
  let panel = '';
  if (items.length) {
    const r = items[ST.sel];
    const note = ST.tab === 'events' ? r.text : 'दोपहर 12 बजे IST की स्थिति; स्थान: ' + data.place;
    panel = chartBlock(sh.chart(r), sh.title(r), note);
  }
  return { panel, table, count: `${items.length} पंक्तियाँ` };
}

const CSS = `<style>
.gc-root{background:var(--gc-panel,#ffbb5f);color:var(--gc-ink,#3a1a00);font:14px/1.45 "Noto Sans Devanagari",system-ui,sans-serif}
.gc-root h2{font-size:17px;margin:12px 0 6px}
.gc-tools{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:8px 0}
.gc-tools button,.gc-tools select,.gc-tools input{font:inherit;padding:6px 10px;border:1px solid var(--gc-line,#d98a4c);border-radius:6px;background:var(--gc-panel,#ffbb5f);color:inherit;min-width:0}
.gc-tools button[aria-pressed="true"]{background:var(--gc-hd,#a80f0f);color:var(--gc-ht,#fff);border-color:var(--gc-hd,#a80f0f)}
.gc-tools input[type=search]{flex:1 1 180px}
.gc-count{font-size:12px;opacity:.8;font-variant-numeric:tabular-nums;margin:4px 0}
.gc-sheet{border:1px solid var(--gc-line,#d98a4c);border-radius:6px;overflow:auto;max-height:62vh;background:var(--gc-panel,#ffbb5f)}
.gc-sheet table{border-collapse:separate;border-spacing:0;width:max-content;min-width:100%;font-variant-numeric:tabular-nums}
.gc-sheet th,.gc-sheet td{border-right:1px solid var(--gc-line,#d98a4c);border-bottom:1px solid var(--gc-line,#d98a4c);padding:6px 9px;text-align:left;white-space:nowrap;vertical-align:top}
.gc-sheet thead th{position:sticky;top:0;z-index:2;background:var(--gc-hd,#a80f0f);color:var(--gc-ht,#fff);font-weight:600}
.gc-sheet thead tr.letters th{top:0;font-weight:500;font-size:11px;text-align:center;opacity:.8;padding:2px 6px}
.gc-sheet thead tr.names th{top:24px}
.gc-sheet th.rn,.gc-sheet td.rn{position:sticky;left:0;z-index:1;text-align:center;min-width:38px;background:var(--gc-band,#ffd79a);color:var(--gc-ink,#3a1a00)}
.gc-sheet thead th.rn{z-index:3;background:var(--gc-hd,#a80f0f);color:var(--gc-ht,#fff)}
.gc-sheet tbody tr:nth-child(even) td{background:var(--gc-band,#ffd79a)}
.gc-sheet tbody tr:nth-child(even) td.rn{background:var(--gc-band,#ffd79a)}
.gc-sheet tbody tr:hover td{background:#fff1c9}
.gc-sheet tbody tr.gc-pick td{background:#fff1c9;font-weight:600}
.gc-sheet tbody tr[data-gr]{cursor:pointer}
.gc-sheet td.gc-wrap{white-space:normal;min-width:240px;max-width:380px}
.gc-sheet td.gc-star{color:var(--gc-accent,#8b1a00);font-weight:700;letter-spacing:.5px}
.gc-sheet td.gc-retro{color:#a80f0f;font-weight:700}
.gc-empty{text-align:center;padding:16px}
.gc-kp{border:1px solid var(--gc-line,#d98a4c);border-radius:8px;padding:10px;margin:10px 0;background:var(--gc-panel,#ffbb5f)}
.gc-kp h3{font-size:15px;margin:0 0 8px}
.gc-charts{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px}
.gc-fig{margin:0}.gc-fig figcaption{font-weight:600;font-size:13px;margin-bottom:4px}
.gc-fig svg{width:100%;max-width:260px;height:auto;display:block;color:var(--gc-ink,#3a1a00)}
.gc-fr,.gc-ln{fill:none;stroke:currentColor;stroke-width:2}
.gc-sg{font-size:13px;fill:currentColor;opacity:.65;text-anchor:middle}
.gc-la{font-size:10px}
.gc-pl{font-size:16px;font-weight:700;fill:var(--gc-accent,#8b1a00);text-anchor:middle}
.gc-note{margin:8px 0 0;font-size:12px;opacity:.85}
.gc-load{padding:14px;opacity:.9}
</style>`;

function paletteVars() {
  const p = PALETTES[ST.pal];
  return `--gc-hd:${p.hd};--gc-ht:${p.ht};--gc-band:${p.band};--gc-accent:${p.accent};`;
}

function body(place) {
  const yearOpts = `<option value="">सभी वर्ष</option>` + SHEET_YEARS.map(y => `<option value="${y}"${String(y) === ST.year ? ' selected' : ''}>${y}</option>`).join('');
  const tabs = [['yearly', 'वार्षिक फलादेश'], ['monthly', 'मासिक कुंडली और ग्रह'], ['events', 'ग्रह-घटनाएँ']]
    .map(([k, l]) => `<button type="button" data-gs="${k}" aria-pressed="${ST.tab === k}">${l}</button>`).join('');
  const tools = `<div class="gc-tools">${tabs}</div>
    <div class="gc-tools"><select data-gy aria-label="वर्ष">${yearOpts}</select><input type="search" data-gq value="${esc(ST.q)}" placeholder="खोजें…" aria-label="खोजें"><button type="button" data-gp>रंग बदलें</button></div>`;
  let content;
  if (ST.err) content = `<p class="gc-load">इस समय शीट नहीं बन पाई। पेज दोबारा खोलें।</p>`;
  else if (!ST.data) content = `<p class="gc-load">कुंडली और फलादेश की गणना हो रही है… (पहली बार कुछ सेकंड लगते हैं)</p>`;
  else {
    const s = sheetHtml(ST.data);
    content = `${s.panel}<div class="gc-count">${s.count} · ${ST.tab === 'yearly' ? 'वार्षिक' : ST.tab === 'monthly' ? 'मासिक' : 'घटनाएँ'}</div>${s.table}
      <p class="gc-note">★ = फलादेश का स्तर (5 में से)। D1 = राशि चक्र, D9 = नवांश। स्थान: ${esc(place.name)}। तारीख़ दिन-स्तर पर।</p>`;
  }
  return `${CSS}<div class="gc-root" style="${paletteVars()}"><h2>गोचर, फलादेश और कुंडली (${SHEET_YEARS[0]}–${SHEET_YEARS[SHEET_YEARS.length - 1]})</h2>${tools}${content}</div>`;
}

// भारी गणना एक बार, पेज को बताए बिना नहीं चलती: पूरी होने पर refresh
function ensureData(place, refresh) {
  if (ST.data || ST.busy) return;
  ST.busy = true;
  setTimeout(() => {
    try { ST.data = buildGocharData(place); } catch (e) { ST.err = true; console.error(e); }
    ST.busy = false;
    refresh();
  }, 30);
}

export function makeGocharPages({ refresh, getPlace }) {
  const bind = root => {
    root.querySelectorAll('[data-gs]').forEach(b => b.addEventListener('click', () => { ST.tab = b.dataset.gs; ST.sel = 0; refresh(); }));
    root.querySelectorAll('[data-gy]').forEach(el => el.addEventListener('change', () => { ST.year = el.value; ST.sel = 0; refresh(); }));
    root.querySelectorAll('[data-gq]').forEach(el => el.addEventListener('change', () => { ST.q = el.value; ST.sel = 0; refresh(); }));
    root.querySelectorAll('[data-gp]').forEach(b => b.addEventListener('click', () => { ST.pal = (ST.pal + 1) % PALETTES.length; refresh(); }));
    root.querySelectorAll('[data-gr]').forEach(tr => tr.addEventListener('click', () => { ST.sel = +tr.dataset.gr; refresh(); }));
  };
  return {
    gochar: {
      tool: () => '',
      body: () => {
        const place = getPlace() || DEFAULT_PLACE;
        if (!ST.data && !ST.busy && !ST.err) ensureData(place, refresh);
        return body(place);
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
