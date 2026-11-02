// "ज्योतिष टूल" पेज (#/jyotish): बेबी नेम, वैदिक समय (घटी-पल), श्राद्ध तिथि, 1000 चंद्रोदय।
// pages.js इसे import करता है; होम के टूल-ग्रिड में कार्ड भी यहीं से जुड़ता है। हिसाब jyotish-calc.js में है।
import { DEFAULT_PLACE, todayIST } from './festival-calendar.js';
import { babyName, vedicTime, clockFromGhati, shraddhaTithi, sahasraChandra, NAME_LETTERS } from './jyotish-calc.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nowHM = () => new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Kolkata' }).format(new Date());

export const JYOTISH_TITLES = { jyotish: 'ज्योतिष टूल' };
const TOOL_INFO = { jyotish: ['ज्योतिष टूल', 'बेबी नेम, श्राद्ध तिथि, वैदिक समय'] };

export const JY_STATE = {
  bn: { date: '', time: '12:00' },
  vt: { date: '', time: '', g: '', p: '', gdate: '' },
  sh: { date: '', time: '12:00' },
  sc: { date: '', time: '12:00' }
};

const CSS = `<style>.jy-f{display:flex;flex-wrap:wrap;gap:10px;padding:12px 14px;border-bottom:1px solid var(--line,#ddd)}.jy-f label{display:flex;flex-direction:column;gap:3px;font-size:12px;opacity:.9}.jy-f input{font:inherit;padding:6px 10px;border:1px solid var(--btnbd,#bbb);background:var(--btnbg,#fff);color:var(--dtxt,#222)}.jy-f button{font:inherit;font-weight:600;padding:6px 12px;border:1px solid var(--btnbd,#bbb);background:var(--btnbg,#fff);color:var(--btntx,#a80f0f);cursor:pointer;align-self:flex-end}.jy-lt{display:flex;flex-wrap:wrap;gap:8px;padding:10px 14px}.jy-lt span{min-width:44px;text-align:center;padding:6px 10px;border:1px solid var(--line,#ccc);font-size:18px}.jy-lt span.on{background:var(--dhead,#5c5f63);color:var(--dheadtx,#fff);font-weight:700}.jy-sub{padding:8px 14px 0;font-weight:700;color:var(--dacc,#b8650b)}</style>`;
const kv = (k, v) => `<div class="pg-kv"><span>${esc(k)}</span><b>${v}</b></div>`;
const inp = (path, label, type, val, extra = '') => `<label>${esc(label)}<input type="${type}" data-j="${path}" value="${esc(val)}" ${extra}></label>`;
const need = txt => `<p class="pg-note">${esc(txt)}</p>`;

function babyBox() {
  const s = JY_STATE.bn;
  let res = need('जन्म तारीख़ और समय भरें, फिर जन्म नक्षत्र, चरण और नाम का पहला अक्षर दिखेगा।');
  if (s.date) {
    const r = babyName(s.date, s.time || '12:00');
    res = kv('जन्म नक्षत्र', esc(r.nakshatra)) + kv('चरण', r.charan) + kv('चंद्र राशि', esc(r.chandra_rashi)) + kv('नाम का पहला अक्षर', `<span class="mp-ok">${esc(r.pehla_akshar)}</span>`)
      + `<div class="jy-sub">इस नक्षत्र के चारों चरणों के अक्षर</div><div class="jy-lt">${r.charon_ke_akshar.map((a, i) => `<span class="${i + 1 === r.charan ? 'on' : ''}">${esc(a)}</span>`).join('')}</div>`
      + `<p class="pg-note">समय भारतीय समय में लें। नक्षत्र जन्म के क्षण चंद्रमा की निरयण (लाहिरी) स्थिति से निकला है। अक्षर परंपरागत तालिका के हैं; कुछ क्षेत्रों में भेद हो सकता है, इसलिए नामकरण से पहले पंडित से पूछ लें।</p>`;
  }
  return `<div class="pg-box"><h2>बेबी नेम कैलकुलेटर</h2><div class="jy-f">${inp('bn.date', 'जन्म तारीख़', 'date', s.date)}${inp('bn.time', 'जन्म समय', 'time', s.time)}</div>${res}</div>`;
}

function vedicBox(place) {
  const s = JY_STATE.vt, date = s.date || todayIST(), time = s.time || nowHM();
  const f = vedicTime(date, time, place);
  let out = f.error ? need(f.error) : kv('घड़ी का समय', `${esc(date)} · ${esc(time)}`) + kv('वैदिक समय', `<span class="mp-ok">${esc(f.ghadi)}</span>`) + kv('गिनती कहाँ से', `${esc(f.din_ka_aarambh)} (${esc(f.suryoday)})`) + kv('वार', esc(f.vaar));
  const gd = s.gdate || date;
  let rev = need('घटी और पल भरें, तो उस दिन के सूर्योदय से गिनकर घड़ी का समय दिखेगा।');
  if (s.g !== '' && +s.g >= 0 && +s.g < 60) { const r = clockFromGhati(gd, +s.g, +(s.p || 0), place); rev = r.error ? need(r.error) : kv('घड़ी का समय', `<span class="mp-ok">${esc(r.samay)}</span>`) + kv('गिनती', esc(r.ghadi)); }
  return `<div class="pg-box"><h2>वैदिक समय (घटी-पल) · ${esc(place.name)}</h2>
    <div class="jy-f">${inp('vt.date', 'तारीख़', 'date', date)}${inp('vt.time', 'समय', 'time', time)}<button type="button" data-jnow="1">अभी</button></div>${out}
    <div class="jy-sub">उलटा: घटी-पल से घड़ी का समय</div>
    <div class="jy-f">${inp('vt.gdate', 'तारीख़', 'date', gd)}${inp('vt.g', 'घटी (0-59)', 'number', s.g, 'min="0" max="59" style="width:90px"')}${inp('vt.p', 'पल (0-59)', 'number', s.p, 'min="0" max="59" style="width:90px"')}</div>${rev}
    <p class="pg-note">1 घटी = 24 मिनट, 1 पल = 24 सेकंड, 1 विपल = 0.4 सेकंड। दिन सूर्योदय से अगले सूर्योदय तक 60 घटी का माना जाता है, इसलिए सूर्योदय से पहले का समय पिछले दिन की गिनती में आता है।</p></div>`;
}

function shraddhaBox(place) {
  const s = JY_STATE.sh;
  let res = need('मृत्यु की तारीख़ भरें (समय पता हो तो वह भी), फिर तिथि और आगे का श्राद्ध दिखेगा।');
  if (s.date) {
    const r = shraddhaTithi(s.date, s.time || '12:00', place);
    const nx = r.agla_varshik_shraddh, pt = r.pitru_paksha_shraddh;
    const blk = (t, x) => typeof x === 'string' ? kv(t, esc(x)) : kv(t, `<span class="mp-ok">${esc(x.tareekh)} (${esc(x.vaar)})</span>`) + kv('तिथि का समय', esc(x.tithi_samay)) + kv('अपराह्न', esc(x.aparahna_me)) + (x.note ? `<p class="pg-note">${esc(x.note)}</p>` : '');
    res = kv('मृत्यु की तिथि', esc(r.tithi)) + kv('पक्ष', esc(r.paksha)) + kv('मास', `${esc(r.maas_amant)} (अमांत) · ${esc(r.maas_purnimant)} (पूर्णिमांत)`)
      + `<div class="jy-sub">अगला वार्षिक श्राद्ध</div>${blk('तारीख़', nx)}<div class="jy-sub">पितृ पक्ष का श्राद्ध</div>${blk('तारीख़', pt)}<p class="pg-note">${esc(r.note)}</p>`;
  }
  return `<div class="pg-box"><h2>श्राद्ध तिथि कैलकुलेटर · ${esc(place.name)}</h2><div class="jy-f">${inp('sh.date', 'मृत्यु की तारीख़', 'date', s.date)}${inp('sh.time', 'मृत्यु का समय', 'time', s.time)}</div>${res}</div>`;
}

function sahasraBox() {
  const s = JY_STATE.sc;
  let res = need('जन्म की तारीख़ भरें, फिर 1000वीं पूर्णिमा (सहस्र चंद्र दर्शन) की तारीख़ दिखेगी।');
  if (s.date) {
    const r = sahasraChandra(s.date, s.time || '12:00');
    res = kv('1000वीं पूर्णिमा', `<span class="mp-ok">${esc(r.hazaarvi_purnima)}</span>`) + kv('वार', esc(r.vaar)) + kv('उम्र', esc(r.umra)) + `<p class="pg-note">${esc(r.note)}</p>`;
  }
  return `<div class="pg-box"><h2>1000 चंद्रोदय (सहस्र चंद्र दर्शन)</h2><div class="jy-f">${inp('sc.date', 'जन्म तारीख़', 'date', s.date)}${inp('sc.time', 'जन्म समय', 'time', s.time)}</div>${res}</div>`;
}

export function makeJyotishPages({ refresh, getPlace, placeBox }) {
  const bind = root => {
    root.querySelectorAll('[data-j]').forEach(el => el.addEventListener('change', () => {
      const [a, b] = el.dataset.j.split('.'); JY_STATE[a][b] = el.value; refresh();
    }));
    root.querySelector('[data-jnow]')?.addEventListener('click', () => { JY_STATE.vt.date = todayIST(); JY_STATE.vt.time = nowHM(); refresh(); });
  };
  return {
    jyotish: {
      tool: () => placeBox(),
      body: () => {
        const place = getPlace() || DEFAULT_PLACE;
        return `${CSS}${babyBox()}${vedicBox(place)}${shraddhaBox(place)}${sahasraBox()}`;
      },
      bind
    }
  };
}

// ---------- होम के टूल-ग्रिड में कार्ड ----------
export function mountJyotishTools() {
  const add = () => {
    const grid = document.querySelector('.tool-grid');
    if (!grid || grid.dataset.jyotish) return;
    grid.dataset.jyotish = '1';
    for (const k of Object.keys(JYOTISH_TITLES)) {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'tool-card'; b.dataset.more = k;
      b.innerHTML = `<span class="tool-icon"></span><b>${esc(TOOL_INFO[k][0])}</b><small>${esc(TOOL_INFO[k][1])}</small><span class="tool-arrow">↗</span>`;
      grid.appendChild(b);
    }
  };
  add();
  if (!document.querySelector('.tool-grid[data-jyotish]')) {
    const mo = new MutationObserver(() => { add(); if (document.querySelector('.tool-grid[data-jyotish]')) mo.disconnect(); });
    mo.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => mo.disconnect(), 30000);
  }
}
