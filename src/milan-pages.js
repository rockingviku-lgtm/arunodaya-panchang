// नाड़ी दोष · भकूट दोष · ग्रह मैत्री · गण मिलान — हर एक का अलग पेज (#/nadi, #/bhakoot, #/maitri, #/gana)
// और होम के "आपके उपयोगी टूल" में चार टूल-कार्ड। pages.js इसे import करता है; main.js में कोई बदलाव नहीं।
import { grahaPositions, RASHI_HI } from './graha-engine.js';
import { NAKSHATRAS } from './festival-calendar.js';
import { birthToUtc } from './kundli-doshas.js';
import { ashtakoota, verdict } from './gun-milan.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const MILAN_TITLES = { nadi: 'नाड़ी दोष', bhakoot: 'भकूट दोष', maitri: 'ग्रह मैत्री', gana: 'गण मिलान' };
const TOOL_INFO = {
  nadi: ['नाड़ी दोष', 'स्वास्थ्य और संतान की जाँच'],
  bhakoot: ['भकूट दोष', 'राशियों का आपसी संबंध'],
  maitri: ['ग्रह मैत्री', 'राशि स्वामियों की मित्रता'],
  gana: ['गण मिलान', 'देव, मनुष्य, राक्षस स्वभाव']
};

// ---------- सारणियाँ (gun-milan.js जैसी) ----------
const SIGN_LORD = ['मंगल', 'शुक्र', 'बुध', 'चंद्र', 'सूर्य', 'बुध', 'शुक्र', 'मंगल', 'गुरु', 'शनि', 'शनि', 'गुरु'];
const PL = ['सूर्य', 'चंद्र', 'मंगल', 'बुध', 'गुरु', 'शुक्र', 'शनि'];
const FRIEND = { सूर्य: ['चंद्र', 'मंगल', 'गुरु'], चंद्र: ['सूर्य', 'बुध'], मंगल: ['सूर्य', 'चंद्र', 'गुरु'], बुध: ['सूर्य', 'शुक्र'], गुरु: ['सूर्य', 'चंद्र', 'मंगल'], शुक्र: ['बुध', 'शनि'], शनि: ['बुध', 'शुक्र'] };
const ENEMY = { सूर्य: ['शुक्र', 'शनि'], चंद्र: [], मंगल: ['बुध'], बुध: ['चंद्र'], गुरु: ['बुध', 'शुक्र'], शुक्र: ['सूर्य', 'चंद्र'], शनि: ['सूर्य', 'चंद्र', 'मंगल'] };
const rel = (a, b) => a === b ? 2 : FRIEND[a].includes(b) ? 1 : ENEMY[a].includes(b) ? -1 : 0;
const REL_HI = { 2: 'स्वयं', 1: 'मित्र', 0: 'सम', '-1': 'शत्रु' };
function maitri(a, b) {
  if (a === b) return 5;
  const x = rel(a, b), y = rel(b, a), s = x + y;
  if (x === 1 && y === 1) return 5;
  if (s === 1) return 4;
  if (x === 0 && y === 0) return 3;
  if (s === 0 && x !== 0) return 1;
  if (s === -1) return .5;
  return 0;
}
const GANA_NAME = ['देव', 'मनुष्य', 'राक्षस'];
const GANA_OF_NAK = [0, 1, 2, 1, 0, 1, 0, 0, 2, 2, 1, 1, 0, 2, 0, 2, 0, 2, 2, 1, 1, 0, 2, 2, 1, 1, 0];
const GANA_M = [[6, 6, 1], [5, 6, 0], [1, 0, 6]];
const NADI_NAME = ['आदि (वात)', 'मध्य (पित्त)', 'अंत्य (कफ)'];
const NADI_OF_NAK = [0, 1, 2, 2, 1, 0, 0, 1, 2, 2, 1, 0, 0, 1, 2, 2, 1, 0, 0, 1, 2, 2, 1, 0, 0, 1, 2];
const BH_TYPES = [
  [1, 1, 'एक ही राशि (1/1)', true], [2, 12, 'द्विर्द्वादश (2/12)', false], [3, 11, 'तृतीय-एकादश (3/11)', true],
  [4, 10, 'चतुर्थ-दशम (4/10)', true], [5, 9, 'नवपंचम (5/9)', false], [6, 8, 'षडाष्टक (6/8)', false], [7, 7, 'समसप्तक (7/7)', true]
];

// ---------- स्थिति ----------
const M = { g: { nak: 3, pada: 2, date: '', time: '' }, b: { nak: 21, pada: 1, date: '', time: '' } };
const WHO = { g: 'वर', b: 'वधू' };

function person(p) {
  if (p.date) {
    try {
      const m = grahaPositions(birthToUtc(p.date, p.time || '12:00')).moon;
      const nak = Math.floor(m.lon / (360 / 27));
      if (isFinite(nak)) return { nak, pada: m.pada, rashi: m.sign, deg: m.deg, src: 'जन्म विवरण से' };
    } catch (e) { /* हाथ से चुने नक्षत्र पर लौटें */ }
  }
  const idx = p.nak * 4 + p.pada - 1;
  return { nak: p.nak, pada: p.pada, rashi: Math.floor(idx / 9), deg: ((idx % 9) + .5) * (30 / 9), src: 'चुने नक्षत्र-चरण से' };
}

// ---------- साझा हिस्से ----------
const personFields = k => {
  const p = M[k];
  return `<span class="mp-grp"><b>${WHO[k]}</b>
    <select data-p="${k}" data-f="nak" aria-label="${WHO[k]} नक्षत्र">${NAKSHATRAS.map((n, i) => `<option value="${i}"${i === p.nak ? ' selected' : ''}>${esc(n)}</option>`).join('')}</select>
    <select data-p="${k}" data-f="pada" aria-label="${WHO[k]} चरण">${[1, 2, 3, 4].map(n => `<option value="${n}"${n === p.pada ? ' selected' : ''}>चरण ${n}</option>`).join('')}</select>
    <input type="date" data-p="${k}" data-f="date" value="${esc(p.date)}" aria-label="${WHO[k]} जन्म तारीख़">
    <input type="time" data-p="${k}" data-f="time" value="${esc(p.time)}" aria-label="${WHO[k]} जन्म समय"></span>`;
};
const toolbar = () => `${personFields('g')}${personFields('b')}<span class="mp-hint">तारीख़ भरने पर चंद्र का नक्षत्र अपने-आप निकलता है (भारतीय समय); न भरें तो ऊपर चुना नक्षत्र-चरण लिया जाता है।</span>`;

function summaryBox(g, b) {
  const row = (lab, f) => `<tr><td>${lab}</td><td>${f(g)}</td><td>${f(b)}</td></tr>`;
  return `<div class="pg-box"><h2>वर और वधू का जन्म-चंद्र</h2><div class="pg-wrap"><table class="pg-tbl">
    <tr><th></th><th>वर</th><th>वधू</th></tr>
    ${row('नक्षत्र / चरण', x => `${esc(NAKSHATRAS[x.nak])} / ${x.pada}`)}
    ${row('चंद्र राशि', x => `${RASHI_HI[x.rashi]} (${esc(SIGN_LORD[x.rashi])} स्वामी)`)}
    ${row('आधार', x => esc(x.src))}
  </table></div></div>`;
}
function allKoota(res, mark) {
  const v = verdict(res.total);
  return `<div class="pg-box"><h2>पूरा अष्टकूट मिलान · ${res.total} / 36</h2><div class="pg-wrap"><table class="pg-tbl">
    <tr><th>कूट</th><th>वर</th><th>वधू</th><th>प्राप्त</th><th>अधिकतम</th></tr>
    ${res.rows.map(r => `<tr${r.koota === mark ? ' class="mp-on"' : ''}><td>${esc(r.koota)}</td><td>${esc(r.g)}</td><td>${esc(r.b)}</td><td><b>${r.got}</b></td><td>${r.max}</td></tr>`).join('')}
    <tr class="mp-tot"><td colspan="3">कुल गुण</td><td><b>${res.total}</b></td><td>36</td></tr>
  </table></div><p class="pg-note"><b>${esc(v.text)}</b> — पूरे मिलान के लिए सामान्यतः 18 या अधिक गुण आवश्यक माने जाते हैं। अंतिम निर्णय से पहले किसी योग्य ज्योतिषी से कुंडली-विश्लेषण अवश्य कराएँ।</p></div>`;
}
const verdictLine = (ok, good, bad) => `<div class="pg-kv"><span>निष्कर्ष</span><b class="${ok ? 'mp-ok' : 'mp-bad'}">${esc(ok ? good : bad)}</b></div>`;
const yn = v => v ? '<b class="mp-ok">लागू</b>' : '<span class="mp-no">लागू नहीं</span>';
function matrix(rowsLbl, colsLbl, cell, curR, curC, corner) {
  return `<div class="pg-wrap"><table class="pg-tbl mp-mx"><tr><th>${esc(corner)}</th>${colsLbl.map(c => `<th>${esc(c)}</th>`).join('')}</tr>
    ${rowsLbl.map((r, i) => `<tr><th class="mp-rh">${esc(r)}</th>${colsLbl.map((_, j) => `<td class="${i === curR && j === curC ? 'mp-cur' : ''}">${cell(i, j)}</td>`).join('')}</tr>`).join('')}</table></div>`;
}
const listByGroup = (names, of, groups) => `<div class="pg-wrap"><table class="pg-tbl"><tr>${groups.map(n => `<th>${esc(n)}</th>`).join('')}</tr>
  <tr>${groups.map((_, gi) => `<td style="vertical-align:top">${names.map((n, i) => of[i] === gi ? esc(n) : '').filter(Boolean).join(' · ')}</td>`).join('')}</tr></table></div>`;

// ---------- चारों पेज ----------
export function makePages(refresh) {
  const bind = root => {
    root.querySelectorAll('[data-p][data-f]').forEach(el => el.addEventListener('change', () => {
      const f = el.dataset.f;
      M[el.dataset.p][f] = (f === 'nak' || f === 'pada') ? +el.value : el.value;
      refresh();
    }));
  };
  const ctx = () => { const g = person(M.g), b = person(M.b); return { g, b, res: ashtakoota(g, b) }; };
  const page = body => ({ tool: toolbar, body: () => { const c = ctx(); return body(c); }, bind });

  return {
    gana: page(({ g, b, res }) => {
      const gg = GANA_OF_NAK[g.nak], gb = GANA_OF_NAK[b.nak], sc = GANA_M[gg][gb];
      const lg = SIGN_LORD[g.rashi], lb = SIGN_LORD[b.rashi];
      const friendly = lg === lb || (rel(lg, lb) >= 1 && rel(lb, lg) >= 1), mt = maitri(lg, lb);
      const dosha = sc === 0;
      return `${summaryBox(g, b)}
      <div class="pg-box"><h2>गण मिलान · ${sc} / 6</h2>
        <div class="pg-kv"><span>वर का गण</span><b>${GANA_NAME[gg]} (${esc(NAKSHATRAS[g.nak])})</b></div>
        <div class="pg-kv"><span>वधू का गण</span><b>${GANA_NAME[gb]} (${esc(NAKSHATRAS[b.nak])})</b></div>
        <div class="pg-kv"><span>प्राप्त गुण</span><b>${sc} / 6</b></div>
        ${verdictLine(sc >= 5, sc === 6 ? 'गण पूरी तरह अनुकूल' : 'गण स्वीकार्य', sc === 0 ? 'गण दोष — स्वभाव में टकराव की आशंका' : 'गण कमज़ोर — कम अंक')}
        <p class="pg-note">देव गण सात्त्विक और सौम्य, मनुष्य गण व्यावहारिक और संतुलित, राक्षस गण दृढ़ और उग्र स्वभाव का माना जाता है। एक ही गण में सबसे अच्छा तालमेल रहता है; देव-राक्षस और मनुष्य-राक्षस में स्वभावगत टकराव अधिक देखा जाता है।</p></div>
      <div class="pg-two"><div class="pg-box"><h2>गण अंक-सारणी (पंक्ति वर, स्तंभ वधू)</h2>${matrix(GANA_NAME, GANA_NAME, (i, j) => GANA_M[i][j], gg, gb, 'वर \\ वधू')}</div>
      <div class="pg-box"><h2>परिहार (दोष-शमन) की जाँच</h2>
        <div class="pg-kv"><span>गण दोष है?</span><b>${dosha ? 'हाँ' : 'नहीं'}</b></div>
        <div class="pg-kv"><span>दोनों राशियों के स्वामी (${esc(lg)} / ${esc(lb)}) एक या परस्पर मित्र</span>${yn(friendly)}</div>
        <div class="pg-kv"><span>ग्रह मैत्री में 4 या अधिक अंक (${mt})</span>${yn(mt >= 4)}</div>
        <div class="pg-kv"><span>भकूट शुभ (7 अंक)</span>${yn(res.rows[6].got === 7)}</div>
        <p class="pg-note">${dosha ? (friendly || mt >= 4 ? 'राशि-स्वामियों की मित्रता से गण दोष का परिहार माना जा सकता है।' : 'परिहार के स्पष्ट आधार नहीं मिले; किसी ज्योतिषी से कुंडली देखकर सलाह लें।') : 'गण दोष नहीं है, इसलिए परिहार की आवश्यकता नहीं।'}</p></div></div>
      <div class="pg-box"><h2>नक्षत्रों के गण</h2>${listByGroup(NAKSHATRAS, GANA_OF_NAK, GANA_NAME)}</div>
      ${allKoota(res, 'गण')}`;
    }),

    nadi: page(({ g, b, res }) => {
      const ng = NADI_OF_NAK[g.nak], nb = NADI_OF_NAK[b.nak], dosha = ng === nb;
      const lg = SIGN_LORD[g.rashi], lb = SIGN_LORD[b.rashi];
      const p1 = g.rashi === b.rashi && g.nak !== b.nak, p2 = g.nak === b.nak && g.pada !== b.pada, p3 = lg === lb && g.rashi !== b.rashi;
      return `${summaryBox(g, b)}
      <div class="pg-box"><h2>नाड़ी दोष · ${dosha ? '0' : '8'} / 8</h2>
        <div class="pg-kv"><span>वर की नाड़ी</span><b>${NADI_NAME[ng]}</b></div>
        <div class="pg-kv"><span>वधू की नाड़ी</span><b>${NADI_NAME[nb]}</b></div>
        <div class="pg-kv"><span>नाड़ी दोष</span><b class="${dosha ? 'mp-bad' : 'mp-ok'}">${dosha ? 'है — दोनों की नाड़ी एक' : 'नहीं है — नाड़ी भिन्न'}</b></div>
        ${verdictLine(!dosha, 'नाड़ी अनुकूल, पूरे 8 गुण', 'नाड़ी दोष: स्वास्थ्य और संतान पक्ष पर ध्यान आवश्यक')}
        <p class="pg-note">अष्टकूट में नाड़ी का भार सबसे अधिक (8 गुण) है। एक ही नाड़ी होने पर दोनों की प्रकृति (वात/पित्त/कफ) समान मानी जाती है, जिसे स्वास्थ्य और संतान के लिए अनुकूल नहीं माना गया।</p></div>
      <div class="pg-two"><div class="pg-box"><h2>नाड़ी अंक-सारणी (पंक्ति वर, स्तंभ वधू)</h2>${matrix(NADI_NAME, NADI_NAME, (i, j) => i === j ? 0 : 8, ng, nb, 'वर \\ वधू')}</div>
      <div class="pg-box"><h2>परिहार (दोष-शमन) की जाँच</h2>
        <div class="pg-kv"><span>राशि एक, पर नक्षत्र अलग</span>${yn(dosha && p1)}</div>
        <div class="pg-kv"><span>नक्षत्र एक, पर चरण अलग</span>${yn(dosha && p2)}</div>
        <div class="pg-kv"><span>राशियाँ अलग पर राशि-स्वामी एक (${esc(lg)}) — कुछ मतों में</span>${yn(dosha && p3)}</div>
        <p class="pg-note">${!dosha ? 'नाड़ी दोष नहीं है, इसलिए परिहार की आवश्यकता नहीं।' : (p1 || p2 || p3 ? 'ऊपर लागू परिहार के आधार पर नाड़ी दोष का शमन माना जा सकता है।' : 'कोई सामान्य परिहार लागू नहीं हुआ। शास्त्रोक्त उपाय और कुंडली के अन्य योग देखने के लिए ज्योतिषी से सलाह लें।')}</p></div></div>
      <div class="pg-box"><h2>नक्षत्रों की नाड़ी</h2>${listByGroup(NAKSHATRAS, NADI_OF_NAK, NADI_NAME)}</div>
      ${allKoota(res, 'नाड़ी')}`;
    }),

    bhakoot: page(({ g, b, res }) => {
      const d = ((g.rashi - b.rashi + 12) % 12) + 1, dd = ((b.rashi - g.rashi + 12) % 12) + 1;
      const cur = BH_TYPES.findIndex(([x, y]) => (d === x && dd === y) || (d === y && dd === x));
      const t = BH_TYPES[cur] || [0, 0, `${d}/${dd}`, true], dosha = !t[3];
      const lg = SIGN_LORD[g.rashi], lb = SIGN_LORD[b.rashi];
      const same = lg === lb, friend = rel(lg, lb) >= 1 && rel(lb, lg) >= 1;
      return `${summaryBox(g, b)}
      <div class="pg-box"><h2>भकूट दोष · ${dosha ? '0' : '7'} / 7</h2>
        <div class="pg-kv"><span>वर की राशि</span><b>${RASHI_HI[g.rashi]}</b></div>
        <div class="pg-kv"><span>वधू की राशि</span><b>${RASHI_HI[b.rashi]}</b></div>
        <div class="pg-kv"><span>वर से वधू / वधू से वर की दूरी</span><b>${d} / ${dd}</b></div>
        <div class="pg-kv"><span>संबंध</span><b>${esc(t[2])}</b></div>
        <div class="pg-kv"><span>भकूट दोष</span><b class="${dosha ? 'mp-bad' : 'mp-ok'}">${dosha ? 'है' : 'नहीं है'}</b></div>
        ${verdictLine(!dosha, 'भकूट अनुकूल, पूरे 7 गुण', 'भकूट दोष: परिवार, धन और आपसी प्रेम पर प्रभाव की आशंका')}
        <p class="pg-note">द्विर्द्वादश (2/12), नवपंचम (5/9) और षडाष्टक (6/8) को भकूट दोष माना जाता है। शेष संबंध शुभ गिने जाते हैं।</p></div>
      <div class="pg-two"><div class="pg-box"><h2>राशि-संबंध सारणी</h2><div class="pg-wrap"><table class="pg-tbl"><tr><th>संबंध</th><th>स्थिति</th></tr>
        ${BH_TYPES.map((x, i) => `<tr${i === cur ? ' class="mp-on"' : ''}><td>${esc(x[2])}</td><td>${x[3] ? 'शुभ (7 गुण)' : 'दोष (0 गुण)'}</td></tr>`).join('')}</table></div></div>
      <div class="pg-box"><h2>परिहार (दोष-शमन) की जाँच</h2>
        <div class="pg-kv"><span>दोनों राशियों के स्वामी (${esc(lg)} / ${esc(lb)}) एक ही</span>${yn(dosha && same)}</div>
        <div class="pg-kv"><span>दोनों स्वामी परस्पर मित्र</span>${yn(dosha && friend)}</div>
        <div class="pg-kv"><span>ग्रह मैत्री के अंक</span><b>${res.rows[4].got} / 5</b></div>
        <div class="pg-kv"><span>नाड़ी दोष का न होना</span>${yn(res.rows[7].got === 8)}</div>
        <p class="pg-note">${!dosha ? 'भकूट दोष नहीं है, इसलिए परिहार की आवश्यकता नहीं।' : (same || friend ? 'राशि-स्वामियों के एक/मित्र होने से भकूट दोष का परिहार माना जा सकता है।' : 'राशि-स्वामी मित्र नहीं हैं; परिहार के लिए ज्योतिषी से कुंडली का विश्लेषण कराएँ।')}</p></div></div>
      ${allKoota(res, 'भकूट')}`;
    }),

    maitri: page(({ g, b, res }) => {
      const lg = SIGN_LORD[g.rashi], lb = SIGN_LORD[b.rashi], sc = maitri(lg, lb);
      const scale = [[5, 'दोनों परस्पर मित्र, या एक ही स्वामी'], [4, 'एक मित्र और दूसरा सम'], [3, 'दोनों सम'], [1, 'एक मित्र और दूसरा शत्रु'], [.5, 'एक सम और दूसरा शत्रु'], [0, 'दोनों परस्पर शत्रु']];
      return `${summaryBox(g, b)}
      <div class="pg-box"><h2>ग्रह मैत्री · ${sc} / 5</h2>
        <div class="pg-kv"><span>वर की राशि का स्वामी</span><b>${esc(lg)} (${RASHI_HI[g.rashi]})</b></div>
        <div class="pg-kv"><span>वधू की राशि का स्वामी</span><b>${esc(lb)} (${RASHI_HI[b.rashi]})</b></div>
        <div class="pg-kv"><span>${esc(lg)} की दृष्टि में ${esc(lb)}</span><b>${REL_HI[rel(lg, lb)]}</b></div>
        <div class="pg-kv"><span>${esc(lb)} की दृष्टि में ${esc(lg)}</span><b>${REL_HI[rel(lb, lg)]}</b></div>
        <div class="pg-kv"><span>प्राप्त गुण</span><b>${sc} / 5</b></div>
        ${verdictLine(sc >= 4, sc === 5 ? 'मानसिक तालमेल उत्तम' : 'मानसिक तालमेल अच्छा', sc >= 3 ? 'मानसिक तालमेल सामान्य' : 'मानसिक तालमेल कमज़ोर — विचारों में अंतर संभव')}
        <p class="pg-note">ग्रह मैत्री दोनों के चंद्र-राशि स्वामियों की आपसी मित्रता देखती है और विवाह में मानसिक व वैचारिक तालमेल का संकेत देती है।</p></div>
      <div class="pg-two"><div class="pg-box"><h2>अंक देने का नियम</h2><div class="pg-wrap"><table class="pg-tbl"><tr><th>स्थिति</th><th>गुण</th></tr>
        ${scale.map(([n, t]) => `<tr${n === sc ? ' class="mp-on"' : ''}><td>${esc(t)}</td><td><b>${n}</b></td></tr>`).join('')}</table></div></div>
      <div class="pg-box"><h2>ग्रहों की मैत्री-सारणी (पंक्ति वर-स्वामी, स्तंभ वधू-स्वामी)</h2>${matrix(PL, PL, (i, j) => maitri(PL[i], PL[j]), PL.indexOf(lg), PL.indexOf(lb), 'वर \\ वधू')}</div></div>
      ${allKoota(res, 'ग्रह मैत्री')}`;
    })
  };
}

// ---------- होम के "आपके उपयोगी टूल" में चार कार्ड ----------
export const MILAN_CSS = `
.mp-grp{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-right:10px}.mp-grp>b{min-width:38px}
.mp-hint{flex-basis:100%;font-size:12.5px;opacity:.75}
.pg-tbl tr.mp-on td,.pg-tbl tr.mp-tot td,.pg-tbl td.mp-cur{background:var(--tint,#f3e3c8)!important;font-weight:700}
.pg-tbl td.mp-cur{outline:2px solid var(--dacc,#b8650b);outline-offset:-2px}
.mp-mx td,.mp-mx th{text-align:center}.mp-mx th.mp-rh{text-align:left}
.pg-kv b.mp-ok,.mp-ok{color:#1d7a3a}.pg-kv b.mp-bad,.mp-bad{color:#b3261e}.mp-no{opacity:.6}
`;

export function mountMilanTools() {
  const add = () => {
    const grid = document.querySelector('.tool-grid');
    if (!grid || grid.dataset.milan) return;
    grid.dataset.milan = '1';
    for (const k of Object.keys(MILAN_TITLES)) {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'tool-card'; b.dataset.more = k;
      b.innerHTML = `<span class="tool-icon"></span><b>${esc(TOOL_INFO[k][0])}</b><small>${esc(TOOL_INFO[k][1])}</small><span class="tool-arrow">↗</span>`;
      grid.appendChild(b);
    }
  };
  add();
  if (!document.querySelector('.tool-grid[data-milan]')) {
    const mo = new MutationObserver(() => { add(); if (document.querySelector('.tool-grid[data-milan]')) mo.disconnect(); });
    mo.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => mo.disconnect(), 30000);
  }
}
