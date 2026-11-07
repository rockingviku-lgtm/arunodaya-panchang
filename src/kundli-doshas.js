// जन्म-विवरण से: कुंडली (राशि/नक्षत्र/पद/भाव), काल सर्प, पितृ, मंगल दोष, साढ़ेसाती, ढैया (तारीख़ों सहित) और कुंडली के योग।
// एक ही फ़ाइल: गणना (computeKundli) + पेज (mountKundliDoshas). ज़रूरत: graha-engine.js, festival-calendar.js
// नियम: निरयण (लाहिरी), संपूर्ण-राशि भाव, मध्यम राहु। फल-नियम परंपरा के अनुसार हैं; ज्योतिषियों में मतभेद रहता है।
import { grahaPositions, ascendantSidereal, RASHI_HI, GRAHA_ORDER } from './graha-engine.js';
import { NAKSHATRAS } from './festival-calendar.js';
import { parseBirthDateISO } from './birth-date.js';

const DAY = 86400000;
const NAK_LORD = ['केतु', 'शुक्र', 'सूर्य', 'चंद्र', 'मंगल', 'राहु', 'गुरु', 'शनि', 'बुध'];
const SIGN_LORD = ['mars', 'venus', 'mercury', 'moon', 'sun', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'saturn', 'jupiter'];
const NAME = { sun: 'सूर्य', moon: 'चंद्र', mars: 'मंगल', mercury: 'बुध', jupiter: 'गुरु', venus: 'शुक्र', saturn: 'शनि', rahu: 'राहु', ketu: 'केतु' };
const EXALT = { sun: 0, moon: 1, mars: 9, mercury: 5, jupiter: 3, venus: 11, saturn: 6 };
const OWN = { sun: [4], moon: [3], mars: [0, 7], mercury: [2, 5], jupiter: [8, 11], venus: [1, 6], saturn: [9, 10] };
const KS_NAME = ['अनंत', 'कुलिक', 'वासुकि', 'शंखपाल', 'पद्म', 'महापद्म', 'तक्षक', 'कर्कोटक', 'शंखचूड़', 'घातक', 'विषधर', 'शेषनाग'];
const SEVEN = ['sun', 'moon', 'mars', 'mercury', 'jupiter', 'venus', 'saturn'];

const dignity = (g, sign) => g === 'rahu' || g === 'ketu' ? '' : EXALT[g] === sign ? 'उच्च' : (EXALT[g] + 6) % 12 === sign ? 'नीच' : OWN[g].includes(sign) ? 'स्वराशि' : '';

// ---------- समय: स्थानीय जन्म-समय -> UTC ----------
function tzOffsetMin(tz, ms) {
  const p = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }).formatToParts(new Date(ms));
  const v = {}; p.forEach(x => (v[x.type] = +x.value));
  return (Date.UTC(v.year, v.month - 1, v.day, v.hour, v.minute, v.second) - Math.floor(ms / 1000) * 1000) / 60000;
}
export function birthToUtc(dateISO, timeHM, tz = 'Asia/Kolkata') {
  const [y, m, d] = dateISO.split('-').map(Number), [H, M] = timeHM.split(':').map(Number);
  const local = Date.UTC(y, m - 1, d, H, M);
  let ms = local - tzOffsetMin(tz, local) * 60000;
  ms = local - tzOffsetMin(tz, ms) * 60000;
  return ms;
}

// ---------- शनि का राशि-गोचर (साढ़ेसाती/ढैया की तारीख़ें) ----------
const saturnSign = ms => Math.floor(grahaPositions(ms).saturn.lon / 30);
function saturnSegments(from, to) {
  const segs = [];
  let t = from, cur = saturnSign(t), start = from;
  while (t < to) {
    const n = Math.min(t + 3 * DAY, to), s = saturnSign(n);
    if (s !== cur) {
      let lo = t, hi = n;
      while (hi - lo > 60000) { const mid = (lo + hi) / 2; if (saturnSign(mid) === cur) lo = mid; else hi = mid; }
      segs.push({ sign: cur, start, end: hi });
      cur = s; start = hi;
    }
    t = n;
  }
  segs.push({ sign: cur, start, end: to });
  return segs;
}
// segs में से चुने हुए rel-सेट वाले टुकड़े जोड़कर काल-खंड (बीच में 300 दिन तक का अंतर जुड़ा माना)
function periods(segs, moonSign, relSet, label) {
  const out = [];
  for (const s of segs) {
    const rel = (s.sign - moonSign + 12) % 12;
    if (!relSet.includes(rel)) continue;
    const last = out[out.length - 1];
    if (last && s.start - last.end <= 300 * DAY) { last.end = s.end; last.parts.push({ rel, start: s.start, end: s.end }); }
    else out.push({ start: s.start, end: s.end, label, parts: [{ rel, start: s.start, end: s.end }] });
  }
  return out;
}

// ---------- मुख्य गणना ----------
export function computeKundli({ ms, lat, lon, now = Date.now() }) {
  const pos = grahaPositions(ms);
  const asc = ascendantSidereal(ms, lat, lon);
  const lagna = Math.floor(asc / 30);
  const house = g => ((pos[g].sign - lagna + 12) % 12) + 1;
  const lordOf = h => SIGN_LORD[(lagna + h - 1) % 12];
  const signOf = g => pos[g].sign;
  const sameSign = (a, b) => signOf(a) === signOf(b);

  const rows = [{ key: 'lagna', name: 'लग्न', rashi: RASHI_HI[lagna], deg: asc % 30, nakshatra: NAKSHATRAS[Math.floor(asc / (360 / 27))], pada: Math.floor((asc % (360 / 27)) / (360 / 108)) + 1, lord: NAK_LORD[Math.floor(asc / (360 / 27)) % 9], bhava: 1, dignity: '', retro: false }];
  for (const g of GRAHA_ORDER) {
    const p = pos[g], nk = NAKSHATRAS.indexOf(p.nakshatra);
    rows.push({ key: g, name: NAME[g], rashi: p.rashi, deg: p.deg, nakshatra: p.nakshatra, pada: p.pada, lord: NAK_LORD[nk % 9], bhava: house(g), dignity: dignity(g, p.sign), retro: p.retro });
  }

  const res = { pos, asc, lagna, rows, doshas: [], yogas: [] };

  // --- मंगल दोष ---
  {
    const bad = [1, 2, 4, 7, 8, 12];
    const fromLagna = house('mars');
    const fromMoon = ((pos.mars.sign - pos.moon.sign + 12) % 12) + 1;
    const fromVenus = ((pos.mars.sign - pos.venus.sign + 12) % 12) + 1;
    const cancel = [];
    if (OWN.mars.includes(pos.mars.sign) || EXALT.mars === pos.mars.sign) cancel.push('मंगल स्वराशि/उच्च राशि में है');
    const jRel = ((pos.jupiter.sign - pos.mars.sign + 12) % 12) + 1;
    if ([1, 5, 7, 9].includes(jRel)) cancel.push('मंगल पर गुरु की दृष्टि/युति है');
    const hits = [];
    if (bad.includes(fromLagna)) hits.push(`लग्न से ${fromLagna}वें भाव में`);
    if (bad.includes(fromMoon)) hits.push(`चंद्र से ${fromMoon}वें भाव में`);
    if (bad.includes(fromVenus)) hits.push(`शुक्र से ${fromVenus}वें भाव में`);
    const present = hits.length > 0;
    const strong = bad.includes(fromLagna);
    res.doshas.push({
      key: 'mangal', name: 'मंगल दोष (मांगलिक)', present,
      level: !present ? '' : strong ? (cancel.length ? 'है (परिहार के संकेत)' : 'है') : 'सौम्य/आंशिक',
      detail: present ? `मंगल ${RASHI_HI[pos.mars.sign]} में, ${hits.join('; ')}.` + (cancel.length ? ' परिहार: ' + cancel.join('; ') + '.' : '') : `मंगल लग्न से ${fromLagna}वें, चंद्र से ${fromMoon}वें, शुक्र से ${fromVenus}वें भाव में है — दोष नहीं बनता.`
    });
  }

  // --- काल सर्प दोष ---
  {
    const r = pos.rahu.lon;
    const rel = g => ((pos[g].lon - r + 360) % 360);
    const inFirst = SEVEN.filter(g => rel(g) < 180), inSecond = SEVEN.filter(g => rel(g) >= 180);
    const full = inFirst.length === 7 || inSecond.length === 7;
    const partial = !full && (inFirst.length === 6 || inSecond.length === 6);
    const rh = house('rahu');
    const outsider = partial ? (inFirst.length === 6 ? inSecond[0] : inFirst[0]) : null;
    res.doshas.push({
      key: 'kaalsarp', name: 'काल सर्प दोष', present: full || partial,
      level: full ? 'है' : partial ? 'आंशिक' : '',
      detail: full ? `सातों ग्रह राहु-केतु के एक ही ओर हैं। राहु ${rh}वें भाव में → "${KS_NAME[rh - 1]} काल सर्प योग".`
        : partial ? `छह ग्रह एक ओर हैं, केवल ${NAME[outsider]} बाहर है → आंशिक (राहु ${rh}वें भाव में, "${KS_NAME[rh - 1]}" प्रकार).`
        : 'सातों ग्रह राहु-केतु के दोनों ओर बँटे हैं — काल सर्प दोष नहीं बनता.'
    });
  }

  // --- पितृ दोष (परंपरागत संकेत) ---
  {
    const why = [];
    for (const n of ['rahu', 'ketu']) if (sameSign('sun', n)) why.push(`सूर्य के साथ ${NAME[n]} है`);
    for (const n of ['rahu', 'ketu']) if (house(n) === 9) why.push(`${NAME[n]} नवम भाव में है`);
    if (sameSign('sun', 'saturn')) why.push('सूर्य-शनि की युति है');
    if (house('saturn') === 9) why.push('शनि नवम भाव में है');
    const l9 = lordOf(9);
    for (const n of ['rahu', 'ketu', 'saturn']) if (l9 !== n && sameSign(l9, n)) why.push(`नवमेश ${NAME[l9]} के साथ ${NAME[n]} है`);
    if (house('sun') === 9 && (sameSign('sun', 'rahu') || sameSign('sun', 'ketu'))) { /* ऊपर आ चुका */ }
    const uniq = [...new Set(why)];
    res.doshas.push({
      key: 'pitru', name: 'पितृ दोष', present: uniq.length > 0, level: uniq.length ? (uniq.length >= 2 ? 'है (प्रबल संकेत)' : 'संकेत मिले') : '',
      detail: uniq.length ? uniq.join('; ') + '.' : 'सूर्य/नवम भाव पर राहु-केतु-शनि का परंपरागत पितृ-दोष संयोग नहीं मिला.'
    });
  }

  // --- साढ़ेसाती / ढैया (तारीख़ों सहित) ---
  const moonSign = pos.moon.sign;
  const from = Math.max(Date.UTC(1860, 0, 1), ms - 9 * 365 * DAY), to = Math.min(Date.UTC(2050, 11, 31), Math.max(now + 9 * 365 * DAY, ms + 1));
  let segs = [];
  try { segs = saturnSegments(from, to); } catch (e) { console.error(e); }
  const sade = periods(segs, moonSign, [11, 0, 1], 'साढ़ेसाती');
  const dh4 = periods(segs, moonSign, [3], 'छोटी ढैया (चंद्र से चतुर्थ)');
  const dh8 = periods(segs, moonSign, [7], 'बड़ी ढैया (चंद्र से अष्टम)');
  const PH = { 11: 'प्रथम चरण (चंद्र से 12वीं राशि)', 0: 'द्वितीय चरण (चंद्र राशि पर)', 1: 'तृतीय चरण (चंद्र से 2री राशि)' };
  const nowRel = (saturnSign(now) - moonSign + 12) % 12;
  const statusNow = nowRel === 11 || nowRel === 0 || nowRel === 1 ? 'साढ़ेसाती — ' + PH[nowRel] : nowRel === 3 ? 'छोटी ढैया (चतुर्थ)' : nowRel === 7 ? 'बड़ी ढैया (अष्टम)' : '';
  res.sade = sade; res.dhaiya = [...dh4, ...dh8].sort((a, b) => a.start - b.start); res.saturnNow = { sign: RASHI_HI[saturnSign(now)], status: statusNow, PH };
  res.doshas.push({
    key: 'sade', name: 'साढ़ेसाती', present: nowRel === 11 || nowRel === 0 || nowRel === 1, level: nowRel === 11 || nowRel === 0 || nowRel === 1 ? 'अभी चल रही है' : 'अभी नहीं',
    detail: `जन्म चंद्र राशि ${RASHI_HI[moonSign]}; शनि अभी ${RASHI_HI[saturnSign(now)]} में है.`, periods: sade, kind: 'sade'
  });
  res.doshas.push({
    key: 'dhaiya', name: 'ढैया (छोटी/बड़ी)', present: nowRel === 3 || nowRel === 7, level: nowRel === 3 ? 'अभी छोटी ढैया' : nowRel === 7 ? 'अभी बड़ी ढैया' : 'अभी नहीं',
    detail: `चंद्र से 4वीं राशि ${RASHI_HI[(moonSign + 3) % 12]}, 8वीं राशि ${RASHI_HI[(moonSign + 7) % 12]} में शनि आने पर ढैया लगती है.`, periods: res.dhaiya, kind: 'dhaiya'
  });

  // --- योग ---
  const Y = res.yogas;
  const kendra = h => [1, 4, 7, 10].includes(h);
  const fromMoonHouse = g => ((pos[g].sign - pos.moon.sign + 12) % 12) + 1;
  const PM = { mars: ['रुचक', 'मंगल'], mercury: ['भद्र', 'बुध'], jupiter: ['हंस', 'गुरु'], venus: ['मालव्य', 'शुक्र'], saturn: ['शश', 'शनि'] };
  for (const g of Object.keys(PM)) if ((OWN[g].includes(pos[g].sign) || EXALT[g] === pos[g].sign) && kendra(house(g))) Y.push({ name: `${PM[g][0]} योग (पंच महापुरुष)`, good: true, why: `${NAME[g]} ${dignity(g, pos[g].sign)} राशि ${RASHI_HI[pos[g].sign]} में, केंद्र (${house(g)}वें) भाव में.` });
  if (kendra(fromMoonHouse('jupiter'))) Y.push({ name: 'गजकेसरी योग', good: true, why: `गुरु चंद्र से केंद्र (${fromMoonHouse('jupiter')}वें) में है.` });
  if (sameSign('sun', 'mercury')) Y.push({ name: 'बुधादित्य योग', good: true, why: `सूर्य-बुध ${RASHI_HI[pos.sun.sign]} में साथ हैं.` });
  if (sameSign('moon', 'mars')) Y.push({ name: 'चंद्र-मंगल (लक्ष्मी) योग', good: true, why: `चंद्र-मंगल ${RASHI_HI[pos.moon.sign]} में साथ हैं.` });
  // चंद्र से 2/12: सुनफा/अनफा/दुरुधरा/केमद्रुम
  {
    const o = ['mars', 'mercury', 'jupiter', 'venus', 'saturn'];
    const in2 = o.filter(g => fromMoonHouse(g) === 2), in12 = o.filter(g => fromMoonHouse(g) === 12), withM = o.filter(g => sameSign(g, 'moon'));
    if (in2.length && in12.length) Y.push({ name: 'दुरुधरा योग', good: true, why: `चंद्र से 2रे (${in2.map(g => NAME[g]).join(', ')}) और 12वें (${in12.map(g => NAME[g]).join(', ')}) में ग्रह हैं.` });
    else if (in2.length) Y.push({ name: 'सुनफा योग', good: true, why: `चंद्र से 2रे भाव में ${in2.map(g => NAME[g]).join(', ')}.` });
    else if (in12.length) Y.push({ name: 'अनफा योग', good: true, why: `चंद्र से 12वें भाव में ${in12.map(g => NAME[g]).join(', ')}.` });
    else if (!withM.length) Y.push({ name: 'केमद्रुम योग', good: false, why: 'चंद्र के साथ तथा उससे 2रे/12वें भाव में कोई ग्रह नहीं (सूर्य, राहु-केतु छोड़कर).' });
  }
  // वेशि/वाशि/उभयचरी (सूर्य से 2/12)
  {
    const o = ['mars', 'mercury', 'jupiter', 'venus', 'saturn'], fs = g => ((pos[g].sign - pos.sun.sign + 12) % 12) + 1;
    const a = o.filter(g => fs(g) === 2), b = o.filter(g => fs(g) === 12);
    if (a.length && b.length) Y.push({ name: 'उभयचरी योग', good: true, why: 'सूर्य से 2रे और 12वें दोनों में ग्रह हैं.' });
    else if (a.length) Y.push({ name: 'वेशि योग', good: true, why: `सूर्य से 2रे भाव में ${a.map(g => NAME[g]).join(', ')}.` });
    else if (b.length) Y.push({ name: 'वाशि योग', good: true, why: `सूर्य से 12वें भाव में ${b.map(g => NAME[g]).join(', ')}.` });
  }
  // राजयोग (केंद्र-त्रिकोण स्वामी की युति)
  {
    const seen = new Set();
    for (const k of [4, 7, 10]) for (const t of [5, 9]) {
      const K = lordOf(k), T = lordOf(t);
      if (K === T) { const id = 'yk' + K; if (!seen.has(id)) { seen.add(id); Y.push({ name: 'योगकारक ग्रह', good: true, why: `${NAME[K]} ${k}वें (केंद्र) और ${t}वें (त्रिकोण) दोनों भावों का स्वामी है.` }); } }
      else if (sameSign(K, T)) { const id = [K, T].sort().join(); if (!seen.has(id)) { seen.add(id); Y.push({ name: 'राजयोग (केंद्र-त्रिकोण युति)', good: true, why: `${k}वें भाव के स्वामी ${NAME[K]} और ${t}वें के स्वामी ${NAME[T]} ${RASHI_HI[pos[K].sign]} में साथ हैं.` }); } }
    }
  }
  // विपरीत राजयोग
  for (const [h, nm] of [[6, 'हर्ष'], [8, 'सरल'], [12, 'विमल']]) {
    const L = lordOf(h);
    if ([6, 8, 12].includes(house(L))) Y.push({ name: `${nm} विपरीत राजयोग`, good: true, why: `${h}वें भाव का स्वामी ${NAME[L]} दुःस्थान (${house(L)}वें) में है.` });
  }
  // धन योग
  { const a = lordOf(2), b = lordOf(11); if (a !== b && sameSign(a, b)) Y.push({ name: 'धन योग', good: true, why: `2रे के स्वामी ${NAME[a]} और 11वें के स्वामी ${NAME[b]} साथ हैं.` }); }
  // अशुभ संयोग
  if (sameSign('jupiter', 'rahu')) Y.push({ name: 'गुरु चांडाल योग', good: false, why: `गुरु-राहु ${RASHI_HI[pos.jupiter.sign]} में साथ हैं.` });
  for (const lum of ['sun', 'moon']) for (const n of ['rahu', 'ketu']) if (sameSign(lum, n)) Y.push({ name: lum === 'sun' ? 'सूर्य ग्रहण योग' : 'चंद्र ग्रहण योग', good: false, why: `${NAME[lum]} के साथ ${NAME[n]} है.` });
  if (sameSign('saturn', 'rahu')) Y.push({ name: 'श्रापित योग', good: false, why: 'शनि-राहु की युति है.' });
  if (sameSign('mars', 'rahu')) Y.push({ name: 'अंगारक योग', good: false, why: 'मंगल-राहु की युति है.' });
  if ([6, 8, 12].includes(fromMoonHouse('jupiter'))) Y.push({ name: 'शकट योग', good: false, why: `गुरु चंद्र से ${fromMoonHouse('jupiter')}वें भाव में है.` });
  return res;
}

// ---------- पेज ----------
const TZ = 'Asia/Kolkata';
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fd = ms => new Intl.DateTimeFormat('hi-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: TZ }).format(new Date(ms));
const dms = x => { const d = Math.floor(x), m = Math.floor((x - d) * 60); return `${d}°${String(m).padStart(2, '0')}′`; };
const sec = t => `<p style="margin:16px 0 6px"><b>${esc(t)}</b></p>`;
const row = (icon, title, sub, hl) => `<div class="timing-item" style="display:flex;flex-direction:row;align-items:flex-start;justify-content:flex-start;gap:10px;padding:8px 10px;margin:6px 0;border:1px solid rgba(128,128,128,.28);border-radius:12px;${hl ? 'outline:2px solid #e0771f;outline-offset:-2px;' : ''}"><span class="timing-icon" style="flex:0 0 auto;width:24px;text-align:center;line-height:1.4">${icon}</span><div style="text-align:left;flex:1;min-width:0"><b style="display:block;font-size:.95em">${esc(title)}</b>${sub ? `<small style="display:block;line-height:1.6">${sub}</small>` : ''}</div></div>`;

const HOUSE_CENTER = [[150, 70], [75, 30], [30, 75], [70, 150], [30, 225], [75, 270], [150, 230], [225, 270], [270, 225], [230, 150], [270, 75], [225, 30]];
function chartSvg(k) {
  const by = Array.from({ length: 12 }, () => []);
  for (const g of GRAHA_ORDER) by[(k.pos[g].sign - k.lagna + 12) % 12].push(k.pos[g].short + (k.pos[g].retro && g !== 'rahu' && g !== 'ketu' ? '(व)' : ''));
  let t = '';
  for (let h = 0; h < 12; h++) {
    const [cx, cy] = HOUSE_CENTER[h];
    t += `<text x="${cx}" y="${cy - 14}" font-size="10" text-anchor="middle" opacity=".55">${((k.lagna + h) % 12) + 1}</text>`;
    for (let i = 0; i < by[h].length; i += 3) t += `<text x="${cx}" y="${cy + 2 + (i / 3) * 14}" font-size="12" font-weight="700" text-anchor="middle">${esc(by[h].slice(i, i + 3).join(' '))}</text>`;
  }
  return `<svg viewBox="0 0 300 300" width="100%" style="max-width:340px;display:block;margin:6px auto" role="img" aria-label="जन्म कुंडली D1"><polygon points="150,0 225,75 150,150 75,75" fill="currentColor" fill-opacity=".07"/><g fill="none" stroke="currentColor" stroke-width="1.4" stroke-opacity=".7"><rect x="1" y="1" width="298" height="298"/><line x1="0" y1="0" x2="300" y2="300"/><line x1="300" y1="0" x2="0" y2="300"/><polygon points="150,0 300,150 150,300 0,150"/></g>${t}</svg>`;
}

function periodsHtml(list, now, k) {
  if (!list || !list.length) return '<small>इस अवधि (जन्म से 2050 तक) में कोई काल-खंड नहीं मिला।</small>';
  return list.map(p => {
    const cur = now >= p.start && now < p.end;
    const parts = k.kind === 'sade' || p.parts.length ? p.parts.map(x => (k.PH ? k.PH[x.rel] : '') ).filter(Boolean) : [];
    return `<div style="margin:4px 0;${cur ? 'font-weight:700' : ''}">${cur ? '▶ ' : ''}${esc(p.label)}: ${fd(p.start)} से ${fd(p.end)} तक${cur ? ' (अभी चल रही)' : p.end < now ? ' (बीत चुकी)' : ''}</div>`;
  }).join('');
}

function render(container, state) {
  const k = state.k, now = Date.now();
  let h = '';
  h += sec(`जन्म कुंडली · लग्न ${RASHI_HI[k.lagna]} ${dms(k.asc % 30)}`);
  h += chartSvg(k);
  h += '<small style="display:block;text-align:center;opacity:.7">संख्या = राशि (1 मेष … 12 मीन) · (व) = वक्री</small>';

  h += sec('दोष और शनि की स्थिति');
  for (const d of k.doshas) {
    let sub = esc(d.detail);
    if (d.periods) {
      const PH = k.saturnNow.PH;
      sub += '<div style="margin-top:6px">' + (d.periods.length ? d.periods.map(p => {
        const cur = now >= p.start && now < p.end;
        const ph = d.key === 'sade' ? '<br><small style="opacity:.8">' + p.parts.map(x => `${PH[x.rel]}: ${fd(x.start)} – ${fd(x.end)}`).join('<br>') + '</small>' : '';
        return `<div style="margin:6px 0;${cur ? 'font-weight:700' : ''}">${cur ? '▶ ' : ''}${esc(p.label)}: ${fd(p.start)} से ${fd(p.end)} तक${cur ? ' (अभी)' : p.end < now ? ' (बीत चुकी)' : ''}${ph}</div>`;
      }).join('') : '<div>जन्म से 2050 तक कोई काल-खंड नहीं।</div>') + '</div>';
    }
    h += row(d.present ? '!' : '✓', `${d.name} — ${d.level || 'नहीं है'}`, sub);
  }

  h += sec('ग्रह: राशि · नक्षत्र · पद · भाव');
  h += k.rows.map(r => row('◉', `${r.name}${r.retro ? ' (वक्री)' : ''}${r.dignity ? ' · ' + r.dignity : ''}`,
    `${esc(r.rashi)} ${dms(r.deg)} · ${esc(r.nakshatra)} पद ${r.pada} (स्वामी ${esc(r.lord)}) · ${r.bhava}वाँ भाव`)).join('');

  h += sec('कुंडली में बने योग');
  h += k.yogas.length ? k.yogas.map(y => row(y.good ? '•' : '•', y.name, esc(y.why))).join('') : '<small>कोई प्रमुख योग नहीं मिला।</small>';

  h += '<p style="margin-top:14px"><small style="opacity:.75">गणना: निरयण (लाहिरी), संपूर्ण-राशि भाव, मध्यम राहु; 1860–2050 के बीच के जन्म के लिए। दोष-योग के नियम परंपरागत हैं और विद्वानों में मतभेद रहता है; महत्वपूर्ण निर्णय से पहले अनुभवी ज्योतिषी से मिलाएँ।</small></p>';
  state.out.innerHTML = h;
}

export function mountKundliDoshas(container, opts = {}) {
  if (!container) return;
  const geocode = opts.geocode || null; // async (cityText) -> {name, lat, lon, timezone}
  const state = { place: { name: 'Lucknow, India', lat: 26.8467, lon: 80.9462, timezone: TZ }, k: null, out: null };
  const inp = 'style="font:inherit;padding:6px;width:100%;box-sizing:border-box;margin:2px 0 8px"';
  container.innerHTML = `
<div style="margin-bottom:18px">
  <div style="font-size:.78rem;font-weight:700;letter-spacing:.12em;color:#64748b;text-transform:uppercase">KUNDLI DOSHAS &amp; YOGAS</div>
  <h2 style="margin:6px 0 0;font-size:1.5rem;line-height:1.35">जन्म कुंडली के दोष और योग</h2>
</div>
    <div>
      <label>
  जन्म तारीख़ (दिन/महीना/साल)
  <input id="kd-date" type="date" min="1900-01-01" max="2100-12-31" ${inp}>
</label>
      <label>जन्म समय<input id="kd-time" type="time" value="12:00" ${inp}></label>
      <label>जन्म स्थान (शहर)<input id="kd-city" value="Lucknow, India" placeholder="जैसे Lucknow, India" ${inp}></label>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button id="kd-gps" type="button" style="font:inherit;padding:6px 12px;cursor:pointer"> GPS से स्थान लें</button>
        <button id="kd-go" type="button" style="font:inherit;padding:6px 12px;cursor:pointer;font-weight:700">कुंडली बनाएँ</button>
      </div>
      <small id="kd-msg" style="display:block;margin-top:6px"></small>
    </div><div id="kd-out"></div>`;
  state.out = container.querySelector('#kd-out');
  const $ = s => container.querySelector(s), msg = t => { $('#kd-msg').textContent = t || ''; };

  $('#kd-gps').onclick = () => {
    if (!navigator.geolocation) { msg('इस ब्राउज़र में GPS उपलब्ध नहीं है।'); return; }
    msg('स्थान खोजा जा रहा है…');
    navigator.geolocation.getCurrentPosition(p => {
      state.place = { name: `GPS (${p.coords.latitude.toFixed(3)}°, ${p.coords.longitude.toFixed(3)}°)`, lat: p.coords.latitude, lon: p.coords.longitude, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || TZ };
      $('#kd-city').value = state.place.name; msg('GPS स्थान मिल गया।'); run();
    }, () => msg('GPS स्थान नहीं मिला; शहर का नाम लिखें।'), { timeout: 12000 });
  };

  const run = async () => {
    const dateText = $('#kd-date').value.trim();
const time = $('#kd-time').value || '12:00';
const city = $('#kd-city').value.trim();

const bd = parseBirthDateISO(dateText);
if (!bd.ok) {
  msg(bd.error);
  return;
}

const date = `${String(bd.day).padStart(2, '0')}-${String(bd.month).padStart(2, '0')}-${bd.year}`;
    try {
      let place = state.place && city === state.place.name ? state.place : null;
      if (!place) {
        if (!city) { msg('जन्म स्थान लिखें या GPS दबाएँ।'); return; }
        if (!geocode) { msg('शहर खोजने की सुविधा जुड़ी नहीं है; GPS दबाएँ।'); return; }
        msg('स्थान खोजा जा रहा है…'); place = await geocode(city); state.place = place;
      }
      const tz = place.timezone || TZ;
      const ms = birthToUtc(date, time, tz);
      state.k = computeKundli({ ms, lat: +place.lat, lon: +place.lon });
      msg(`${place.name} · ${date} ${time} (${tz})`);
      render(container, state);
    } catch (e) { console.error(e); msg('गणना नहीं हो सकी: ' + (e.message || e)); }
  };
  $('#kd-go').onclick = run;
  for (const id of ['#kd-date', '#kd-time', '#kd-city']) $(id).onchange = run; // भरते/बदलते ही अपने-आप
}
