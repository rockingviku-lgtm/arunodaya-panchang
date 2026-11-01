// सात और पेज (हर एक का अलग लिंक): मंगल दोष #/mangal · काल सर्प #/kaalsarp · साढ़ेसाती-ढैया #/sadesati ·
// शुभ कार्य मुहूर्त #/shubh · ग्रहण #/grahan · पंचक-भद्रा #/panchak · चंद्रोदय-सूर्योदय #/chandrodaya
// pages.js इसे import करता है; होम के टूल-ग्रिड में कार्ड भी यहीं से जुड़ते हैं। main.js में कोई बदलाव नहीं।
import {
  DEFAULT_PLACE, NAKSHATRAS, WEEKDAYS_HI, getPanchangDay, getDayTimes, tithiAt, tithiName, moonSidereal, sunSidereal,
  elongation, lunarMonth, todayIST, shiftDate
} from './festival-calendar.js';
import { planetSign, grahaPositions, chaughadiya, RASHI_HI } from './graha-engine.js';
import { computeKundli, birthToUtc } from './kundli-doshas.js';
import { findEclipses } from './eclipse-engine.js';

const TZ = 'Asia/Kolkata', DAY = 86400000, MIN = 60000, HOUR = 3600000, NAK = 360 / 27;
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clock = ms => new Intl.DateTimeFormat('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: TZ }).format(new Date(ms)).toUpperCase();
const istISO = ms => new Date(ms + 330 * MIN).toISOString();
const MONFULL = ['जनवरी', 'फ़रवरी', 'मार्च', 'अप्रैल', 'मई', 'जून', 'जुलाई', 'अगस्त', 'सितंबर', 'अक्टूबर', 'नवंबर', 'दिसंबर'];
const MON = ['जन॰', 'फ़र॰', 'मार्च', 'अप्रै॰', 'मई', 'जून', 'जुला॰', 'अग॰', 'सित॰', 'अक्टू॰', 'नव॰', 'दिस॰'];
const wdIdx = iso => new Date(`${iso}T12:00:00Z`).getUTCDay();
const wdOf = iso => WEEKDAYS_HI[wdIdx(iso)];
const fmtDay = iso => `${+iso.slice(8, 10)} ${MONFULL[+iso.slice(5, 7) - 1]} ${iso.slice(0, 4)}`;
const fmtMs = ms => { const p = istISO(ms); return `${+p.slice(8, 10)} ${MON[+p.slice(5, 7) - 1]} ${p.slice(0, 4)}, ${clock(ms)}`; };
const fmtDMs = ms => { const p = istISO(ms); return `${+p.slice(8, 10)} ${MONFULL[+p.slice(5, 7) - 1]} ${p.slice(0, 4)}`; };
const dur = ms => { const m = Math.round(ms / MIN); return m >= 60 ? `${Math.floor(m / 60)} घं ${m % 60} मि` : `${m} मि`; };
const shiftMonth = (ym, n) => { const [y, m] = ym.split('-').map(Number), d = new Date(Date.UTC(y, m - 1 + n, 1)); return d.toISOString().slice(0, 7); };
const monthDays = ym => { const [y, m] = ym.split('-').map(Number), n = new Date(Date.UTC(y, m, 0)).getUTCDate(); return Array.from({ length: n }, (_, i) => `${ym}-${String(i + 1).padStart(2, '0')}`); };
const istMidnight = iso => { const [y, m, d] = iso.split('-').map(Number); return Date.UTC(y, m - 1, d) - 330 * MIN; };

export const EXTRA_TITLES = {
  mangal: 'मंगल दोष', kaalsarp: 'काल सर्प दोष', sadesati: 'साढ़ेसाती और ढैया', shubh: 'शुभ कार्य मुहूर्त',
  grahan: 'सूर्य-चंद्र ग्रहण', panchak: 'पंचक और भद्रा', chandrodaya: 'सूर्योदय-चंद्रोदय तालिका', timeline: 'पंचांग टाइमलाइन'
};
const TOOL_INFO = {
  mangal: ['मंगल दोष', 'मांगलिक जाँच और वर-वधू तुलना'],
  kaalsarp: ['काल सर्प दोष', 'राहु-केतु की धुरी और प्रकार'],
  sadesati: ['साढ़ेसाती और ढैया', 'शनि की दशा, तारीख़ों सहित'],
  shubh: ['शुभ कार्य मुहूर्त', 'विवाह, गृह प्रवेश, वाहन, नामकरण'],
  grahan: ['सूर्य-चंद्र ग्रहण', 'तारीख़, समय, सूतक और दृश्यता'],
  panchak: ['पंचक और भद्रा', 'महीने भर के समय'],
  chandrodaya: ['सूर्योदय-चंद्रोदय', 'महीने की पूरी तालिका'],
  timeline: ['पंचांग टाइमलाइन', 'पूरे दिन की तिथि, नक्षत्र, योग, करण एक रेखा पर']
};
const SIGN_OF = (p, g) => p[g].sign;

// ---------- स्थिति ----------
const B = { a: { date: '', time: '' }, b: { date: '', time: '' }, rashi: -1 };
const MU = { purpose: 'vivah', month: todayIST().slice(0, 7) };
const PK = { month: todayIST().slice(0, 7) };
const RT = { month: todayIST().slice(0, 7) };
const GR = { years: 3 };
const STATE = { mu: MU, pk: PK, rt: RT, gr: GR };

const kundliOf = (p, place) => {
  if (!p.date) return null;
  const ms = birthToUtc(p.date, p.time || '12:00');
  return computeKundli({ ms, lat: +place.lat, lon: +place.lon });
};
const needBirth = lab => `<div class="pg-box"><h2>${esc(lab)}</h2><p class="pg-note">ऊपर जन्म की तारीख़ और समय भरें, और जन्म-स्थान चुनें। समय न भरने पर दोपहर 12:00 माना जाता है, जिससे लग्न गलत आ सकता है। समय भारतीय समय में लिया जाता है।</p></div>`;
const yn = (v, a = 'हाँ', b = 'नहीं') => v ? `<b class="mp-bad">${a}</b>` : `<span class="mp-ok">${b}</span>`;
const kv = (k, v) => `<div class="pg-kv"><span>${k}</span><b>${v}</b></div>`;

// ---------- मंगल दोष ----------
const HOUSE_MEAN = { 1: 'स्वभाव और उग्रता', 2: 'परिवार और वाणी', 4: 'गृहस्थ सुख', 7: 'जीवनसाथी और दांपत्य', 8: 'आयु और अचानक बाधा', 12: 'शयन-सुख और व्यय' };
function mangalOf(r) {
  const p = r.pos, lagna = r.lagna, ms = p.mars.sign;
  const fl = ((ms - lagna + 12) % 12) + 1, fm = ((ms - p.moon.sign + 12) % 12) + 1, fv = ((ms - p.venus.sign + 12) % 12) + 1;
  const bad = [1, 2, 4, 7, 8, 12];
  const refs = [['लग्न से', fl], ['चंद्र से', fm], ['शुक्र से', fv]];
  const hits = refs.filter(([, h]) => bad.includes(h));
  const cancel = [];
  if ([0, 7].includes(ms)) cancel.push('मंगल स्वराशि (मेष/वृश्चिक) में है');
  if (ms === 9) cancel.push('मंगल उच्च राशि (मकर) में है');
  if ((fl === 1 && ms === 0) || (fl === 4 && ms === 7) || (fl === 7 && ms === 9) || (fl === 8 && ms === 3) || (fl === 12 && ms === 8)) cancel.push('मंगल उन भाव-राशि संयोगों में है जिनमें दोष शांत माना जाता है (1-मेष, 4-वृश्चिक, 7-मकर, 8-कर्क, 12-धनु)');
  const jr = ((p.jupiter.sign - ms + 12) % 12) + 1;
  if ([1, 5, 7, 9].includes(jr)) cancel.push('मंगल पर गुरु की दृष्टि या युति है');
  const strong = bad.includes(fl), present = hits.length > 0;
  const level = !present ? 'नहीं है' : strong ? (cancel.length ? 'है, पर परिहार प्राप्त' : 'है (प्रबल)') : (cancel.length ? 'आंशिक, परिहार प्राप्त' : 'आंशिक (सौम्य)');
  return { fl, fm, fv, refs, hits, cancel, strong, present, level, sign: ms, deg: p.mars.deg };
}
function mangalCompare(a, b) {
  if (a.present && b.present) return ['दोनों कुंडलियों में मंगल दोष है। परंपरा में दोनों के मांगलिक होने पर दोष परस्पर शांत माना जाता है।', true];
  if (!a.present && !b.present) return ['दोनों कुंडलियों में मंगल दोष नहीं है।', true];
  const w = a.present ? a : b;
  if (!w.strong || w.cancel.length) return ['एक कुंडली में मंगल दोष केवल सौम्य या परिहार सहित है। सामान्यतः यह बाधक नहीं माना जाता।', true];
  return ['केवल एक कुंडली में प्रबल मंगल दोष है, दूसरी में नहीं। इसे असंतुलन माना जाता है; विवाह से पहले ज्योतिषी से विश्लेषण और शांति के उपाय की सलाह लें।', false];
}
function mangalBox(lab, r) {
  const m = mangalOf(r);
  return `<div class="pg-box"><h2>${esc(lab)} · मंगल दोष ${esc(m.level)}</h2>
    ${kv('लग्न', RASHI_HI[r.lagna])}${kv('मंगल की राशि और अंश', `${RASHI_HI[m.sign]} ${m.deg.toFixed(1)}°`)}
    <div class="pg-wrap"><table class="pg-tbl"><tr><th>गणना का आधार</th><th>मंगल का भाव</th><th>दोष-भाव (1,2,4,7,8,12)?</th></tr>
    ${m.refs.map(([n, h]) => `<tr><td>${n}</td><td>${h}वाँ</td><td>${yn([1, 2, 4, 7, 8, 12].includes(h))}</td></tr>`).join('')}</table></div>
    ${m.hits.length ? `<p class="pg-note">मंगल ${m.hits.map(([n, h]) => `${n} ${h}वें भाव (${HOUSE_MEAN[h]})`).join('; ')} में है।</p>` : ''}
    <div class="pg-kv"><span>परिहार</span><b>${m.cancel.length ? 'मिले' : 'नहीं मिले'}</b></div>
    ${m.cancel.length ? `<p class="pg-note">${m.cancel.map(esc).join('<br>')}</p>` : ''}</div>`;
}
const MANGAL_RULES = `<div class="pg-box"><h2>मंगल दोष के नियम और उपाय</h2><div class="pg-wrap"><table class="pg-tbl"><tr><th>भाव</th><th>किस बात पर प्रभाव माना जाता है</th></tr>
  ${Object.entries(HOUSE_MEAN).map(([h, t]) => `<tr><td>${h}वाँ</td><td>${t}</td></tr>`).join('')}</table></div>
  <p class="pg-note">मंगल लग्न, चंद्र या शुक्र से इन भावों में हो तो मंगल दोष कहा जाता है। लग्न से बनने वाला दोष सबसे प्रबल माना जाता है। सामान्य परिहार: स्वराशि या उच्च का मंगल, गुरु की दृष्टि, कुछ विशेष भाव-राशि संयोग, और दोनों साथियों का मांगलिक होना। सामान्य उपाय: मंगलवार का व्रत, हनुमान चालीसा का पाठ, और ज्योतिषी की सलाह पर शांति-पूजा। यह मार्गदर्शन परंपरागत नियमों पर आधारित है, अंतिम निर्णय योग्य ज्योतिषी से कराएँ।</p></div>`;

// ---------- काल सर्प ----------
const KS_NAME = ['अनंत', 'कुलिक', 'वासुकि', 'शंखपाल', 'पद्म', 'महापद्म', 'तक्षक', 'कर्कोटक', 'शंखचूड़', 'घातक', 'विषधर', 'शेषनाग'];
const KS_AREA = ['स्वास्थ्य और व्यक्तित्व', 'धन, वाणी और परिवार', 'भाई-बहन और साहस', 'सुख, माता और संपत्ति', 'संतान और शिक्षा', 'शत्रु, रोग और ऋण', 'दांपत्य और साझेदारी', 'आयु और अचानक घटनाएँ', 'भाग्य और पिता', 'कर्म और पद', 'लाभ और इच्छापूर्ति', 'व्यय, विदेश और नींद'];
const P7 = ['sun', 'moon', 'mars', 'mercury', 'jupiter', 'venus', 'saturn'];
const PNAME = { sun: 'सूर्य', moon: 'चंद्र', mars: 'मंगल', mercury: 'बुध', jupiter: 'गुरु', venus: 'शुक्र', saturn: 'शनि', rahu: 'राहु', ketu: 'केतु' };
function kaalsarpBody(r) {
  const p = r.pos, rahu = p.rahu.lon, rel = g => (p[g].lon - rahu + 360) % 360;
  const first = P7.filter(g => rel(g) < 180), second = P7.filter(g => rel(g) >= 180);
  const full = first.length === 7 || second.length === 7, partial = !full && (first.length === 6 || second.length === 6);
  const rh = ((p.rahu.sign - r.lagna + 12) % 12) + 1, kh = ((p.ketu.sign - r.lagna + 12) % 12) + 1;
  const udit = full && first.length === 7;
  const outsider = partial ? (first.length === 6 ? second[0] : first[0]) : null;
  const state = full ? 'पूर्ण काल सर्प दोष' : partial ? 'आंशिक काल सर्प दोष' : 'काल सर्प दोष नहीं';
  return `<div class="pg-box"><h2>काल सर्प दोष · ${state}</h2>
    ${kv('राहु', `${RASHI_HI[p.rahu.sign]} ${p.rahu.deg.toFixed(1)}° · ${rh}वें भाव में`)}${kv('केतु', `${RASHI_HI[p.ketu.sign]} ${p.ketu.deg.toFixed(1)}° · ${kh}वें भाव में`)}
    ${full ? kv('प्रकार', `${KS_NAME[rh - 1]} काल सर्प योग (${KS_AREA[rh - 1]})`) : ''}${full ? kv('उदित या अनुदित', udit ? 'उदित (सब ग्रह राहु से केतु की ओर)' : 'अनुदित (सब ग्रह केतु से राहु की ओर)') : ''}
    ${partial ? kv('बाहर का ग्रह', `${PNAME[outsider]} (छह ग्रह एक ओर)`) : ''}
    <p class="pg-note">${full ? 'सातों ग्रह राहु-केतु की एक ही ओर हैं, इसलिए पूर्ण काल सर्प योग बनता है।' : partial ? 'छह ग्रह एक ओर और एक ग्रह दूसरी ओर है। इसे आंशिक काल सर्प योग माना जाता है, जिसका प्रभाव सामान्यतः हल्का होता है।' : 'ग्रह राहु-केतु की धुरी के दोनों ओर बँटे हैं, इसलिए काल सर्प दोष नहीं बनता।'}</p></div>
  <div class="pg-two"><div class="pg-box"><h2>राहु से ग्रहों की दूरी</h2><div class="pg-wrap"><table class="pg-tbl"><tr><th>ग्रह</th><th>राशि</th><th>राहु से (अंश)</th><th>ओर</th></tr>
    ${P7.map(g => `<tr><td>${PNAME[g]}</td><td>${RASHI_HI[p[g].sign]} ${p[g].deg.toFixed(1)}°</td><td>${rel(g).toFixed(1)}°</td><td>${rel(g) < 180 ? 'राहु से केतु' : 'केतु से राहु'}</td></tr>`).join('')}</table></div></div>
  <div class="pg-box"><h2>12 प्रकार (राहु जिस भाव में)</h2><div class="pg-wrap"><table class="pg-tbl"><tr><th>भाव</th><th>प्रकार</th><th>क्षेत्र</th></tr>
    ${KS_NAME.map((n, i) => `<tr${full && i === rh - 1 ? ' class="mp-on"' : ''}><td>${i + 1}</td><td>${n}</td><td>${KS_AREA[i]}</td></tr>`).join('')}</table></div></div></div>
  <div class="pg-box"><h2>नोट और उपाय</h2><p class="pg-note">काल सर्प दोष परंपरागत ज्योतिष की एक मान्यता है और सभी विद्वान इसे समान महत्त्व नहीं देते। सामान्य उपाय: नाग पंचमी पर पूजन, महामृत्युंजय या राहु-केतु मंत्र का जप, और ज्योतिषी की सलाह पर शांति-पूजा। गणना निरयण (लाहिरी) और मध्यम राहु से की गई है।</p></div>`;
}

// ---------- साढ़ेसाती / ढैया ----------
const satKey = new Map();
function satSegs(from, to) {
  const k = `${from}|${to}`;
  if (satKey.has(k)) return satKey.get(k);
  const segs = [];
  let t = from, cur = planetSign('saturn', t), start = from;
  while (t < to) {
    const n = Math.min(t + 3 * DAY, to), s = planetSign('saturn', n);
    if (s !== cur) {
      let lo = t, hi = n;
      while (hi - lo > 60000) { const mid = (lo + hi) / 2; if (planetSign('saturn', mid) === cur) lo = mid; else hi = mid; }
      segs.push({ sign: cur, start, end: hi }); cur = s; start = hi;
    }
    t = n;
  }
  segs.push({ sign: cur, start, end: to });
  satKey.set(k, segs);
  return segs;
}
function satPeriods(segs, moon, rels) {
  const out = [];
  for (const s of segs) {
    const rel = (s.sign - moon + 12) % 12;
    if (!rels.includes(rel)) continue;
    const last = out[out.length - 1];
    if (last && s.start - last.end <= 300 * DAY) { last.end = s.end; last.parts.push({ rel, start: s.start, end: s.end }); }
    else out.push({ start: s.start, end: s.end, parts: [{ rel, start: s.start, end: s.end }] });
  }
  return out;
}
const PH = { 11: 'प्रथम चरण (चंद्र से 12वीं राशि)', 0: 'द्वितीय चरण (चंद्र राशि)', 1: 'तृतीय चरण (चंद्र से दूसरी राशि)', 3: 'चंद्र से चौथी राशि', 7: 'चंद्र से आठवीं राशि' };
function sadesatiBody() {
  let moon = B.rashi, src = 'आपकी चुनी राशि';
  if (moon < 0 && B.a.date) { try { moon = grahaPositions(birthToUtc(B.a.date, B.a.time || '12:00')).moon.sign; src = 'जन्म विवरण का चंद्र'; } catch (e) { moon = -1; } }
  if (moon < 0) return `<div class="pg-box"><h2>साढ़ेसाती और ढैया</h2><p class="pg-note">ऊपर अपनी चंद्र राशि चुनें, या जन्म तारीख़ और समय भरें। चंद्र राशि वही है जिसमें जन्म के समय चंद्रमा था।</p></div>`;
  const now = Date.now(), from = Math.max(Date.UTC(1900, 0, 1), now - 36 * 365 * DAY), to = Math.min(Date.UTC(2049, 11, 31), now + 36 * 365 * DAY);
  const segs = satSegs(from, to), ok = p => p.start - from > DAY;
  const sade = satPeriods(segs, moon, [11, 0, 1]).filter(ok), dh4 = satPeriods(segs, moon, [3]).filter(ok), dh8 = satPeriods(segs, moon, [7]).filter(ok);
  const endTxt = ms => ms >= to - DAY ? 'आगे जारी (2049 के बाद)' : fmtDMs(ms);
  const nowSign = planetSign('saturn', now), rel = (nowSign - moon + 12) % 12;
  const status = [11, 0, 1].includes(rel) ? `साढ़ेसाती चल रही है: ${PH[rel]}` : rel === 3 ? 'छोटी ढैया चल रही है (चंद्र से चौथी राशि में शनि)' : rel === 7 ? 'बड़ी ढैया चल रही है (चंद्र से आठवीं राशि में शनि)' : 'अभी साढ़ेसाती या ढैया नहीं है';
  const cur = p => now >= p.start && now < p.end;
  const row = (lab, p) => `<tr${cur(p) ? ' class="mp-on"' : ''}><td>${lab}</td><td>${fmtDMs(p.start)}</td><td>${endTxt(p.end)}</td><td>${p.parts.map(x => `${RASHI_HI[(moon + x.rel) % 12]}: ${fmtDMs(x.start)} से ${endTxt(x.end)}`).join('<br>')}</td></tr>`;
  const tbl = (title, arr, lab) => `<div class="pg-box"><h2>${title}</h2>${arr.length ? `<div class="pg-wrap"><table class="pg-tbl"><tr><th>दौर</th><th>शुरू</th><th>समाप्त</th><th>शनि की राशि-अनुसार तारीख़ें</th></tr>${arr.map(p => row(lab, p)).join('')}</table></div>` : '<p class="pg-note">इस अवधि में कोई दौर नहीं।</p>'}</div>`;
  return `<div class="pg-box"><h2>साढ़ेसाती और ढैया · ${esc(status)}</h2>
    ${kv('चंद्र राशि', `${RASHI_HI[moon]} (${src})`)}${kv('शनि अभी', `${RASHI_HI[nowSign]} राशि में`)}
    ${kv('साढ़ेसाती की राशियाँ', `${RASHI_HI[(moon + 11) % 12]}, ${RASHI_HI[moon]}, ${RASHI_HI[(moon + 1) % 12]}`)}
    ${kv('ढैया की राशियाँ', `${RASHI_HI[(moon + 3) % 12]} (छोटी), ${RASHI_HI[(moon + 7) % 12]} (बड़ी)`)}</div>
  ${tbl('साढ़ेसाती के दौर', sade, 'साढ़ेसाती')}${tbl('छोटी ढैया (चंद्र से चौथी राशि)', dh4, 'छोटी ढैया')}${tbl('बड़ी ढैया (चंद्र से आठवीं राशि)', dh8, 'बड़ी ढैया')}
  <div class="pg-box"><h2>नोट</h2><p class="pg-note">शनि को एक राशि पार करने में लगभग ढाई वर्ष लगते हैं। चंद्र राशि से 12वीं, पहली और दूसरी राशि में शनि के रहने का काल साढ़ेसाती कहलाता है। वक्री होने पर शनि कभी-कभी पिछली राशि में लौटता है, इसलिए दौर जुड़े हुए दिखाए गए हैं। गणना निरयण (लाहिरी) में है; तारीख़ें 2049 तक ही दी जा सकती हैं। उपाय के लिए शनिवार का व्रत, शनि मंत्र और ज्योतिषी की सलाह उपयोगी मानी जाती है।</p></div>`;
}

// ---------- शुभ कार्य मुहूर्त ----------
const PURPOSES = {
  vivah: { name: 'विवाह', nak: [3, 4, 9, 11, 12, 14, 16, 18, 20, 25, 26], tithi: [2, 3, 5, 7, 10, 11, 13], wd: [0, 1, 3, 4, 5, 6], season: true, panchak: false },
  griha: { name: 'गृह प्रवेश', nak: [3, 4, 7, 11, 13, 16, 20], tithi: [2, 3, 5, 7, 10, 11, 13], wd: [1, 3, 4, 5, 6], season: true, panchak: true },
  vahan: { name: 'वाहन खरीद', nak: [0, 3, 4, 6, 7, 12, 13, 14, 16, 21], tithi: [2, 3, 5, 7, 10, 11, 13, 15], wd: [0, 1, 3, 4, 5], season: false, panchak: true },
  naam: { name: 'नामकरण', nak: [0, 3, 4, 6, 7, 11, 12, 13, 14, 16, 20, 21, 22, 23, 25, 26], tithi: [2, 3, 5, 7, 10, 11, 13], wd: [1, 3, 4, 5], season: false, panchak: false }
};
const tNum = idx => ((idx - 1) % 15) + 1;
const TNAME = ['', 'प्रतिपदा', 'द्वितीया', 'तृतीया', 'चतुर्थी', 'पंचमी', 'षष्ठी', 'सप्तमी', 'अष्टमी', 'नवमी', 'दशमी', 'एकादशी', 'द्वादशी', 'त्रयोदशी', 'चतुर्दशी', 'पूर्णिमा/अमावस्या'];
const listNak = a => a.map(i => NAKSHATRAS[i]).join(', ');
const listTithi = a => a.map(i => TNAME[i]).join(', ');
function shubhDay(iso, pu, place) {
  const wd = wdIdx(iso);
  if (!pu.wd.includes(wd)) return { iso, skip: `${WEEKDAYS_HI[wd]} इस कार्य के लिए शुभ वार नहीं` };
  const dt = getDayTimes(iso, place);
  if (!dt) return { iso, skip: 'सूर्योदय-सूर्यास्त उपलब्ध नहीं' };
  const sr = +dt.sunrise, ss = +dt.sunset;
  if (pu.season) {
    const sSign = Math.floor(sunSidereal(sr) / 30);
    if (sSign === 8 || sSign === 11) return { iso, skip: 'खरमास (सूर्य धनु/मीन राशि में)' };
    const lm = lunarMonth(sr).month, ti = tithiAt(sr).index;
    if ((lm === 4 && ti >= 11 && ti <= 15) || lm === 5 || lm === 6 || lm === 7 || (lm === 8 && ti <= 10)) return { iso, skip: 'चातुर्मास (देवशयन से देवोत्थान एकादशी)' };
  }
  const pd = getPanchangDay(iso, place);
  const cuts = new Set([sr, ss]);
  for (const arr of [pd.tithis, pd.nakshatras]) for (const s of arr) if (s.end && +s.end > sr && +s.end < ss) cuts.add(+s.end);
  const pts = [...cuts].sort((a, b) => a - b), wins = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1], mid = (a + b) / 2;
    const ti = tithiAt(mid).index, ml = moonSidereal(mid), nk = Math.floor(ml / NAK);
    if (ti === 30 || ti === 15 && pu.tithi.indexOf(15) < 0) continue;
    if (!pu.tithi.includes(tNum(ti)) || !pu.nak.includes(nk)) continue;
    if (pu.panchak && ml >= 300) continue;
    wins.push({ a, b, ti, nk });
  }
  // राहुकाल हटाएँ
  const rs = +dt.rahu.start, re = +dt.rahu.end, out = [];
  for (const w of wins) {
    if (re <= w.a || rs >= w.b) { out.push(w); continue; }
    if (rs > w.a) out.push({ ...w, b: rs });
    if (re < w.b) out.push({ ...w, a: re });
  }
  const good = out.filter(w => w.b - w.a >= 15 * MIN);
  return { iso, dt, wins: good, skip: good.length ? '' : 'तिथि और नक्षत्र का मेल नहीं बना' };
}
function shubhBody(place) {
  const pu = PURPOSES[MU.purpose], days = monthDays(MU.month);
  const rows = days.map(d => shubhDay(d, pu, place));
  const ok = rows.filter(r => r.wins?.length);
  const body = ok.length ? `<div class="pg-wrap"><table class="pg-tbl"><tr><th>तारीख़</th><th>वार</th><th>शुभ समय (IST)</th><th>तिथि और नक्षत्र</th><th>अभिजित</th></tr>
    ${ok.map(r => `<tr><td>${+r.iso.slice(8)} ${MONFULL[+r.iso.slice(5, 7) - 1]}</td><td>${wdOf(r.iso)}</td>
      <td>${r.wins.map(w => `${clock(w.a)} से ${clock(w.b)}`).join('<br>')}</td>
      <td>${r.wins.map(w => `${esc(tithiName(w.ti))} · ${esc(NAKSHATRAS[w.nk])}`).join('<br>')}</td>
      <td>${clock(+r.dt.abhijit.start)} से ${clock(+r.dt.abhijit.end)}</td></tr>`).join('')}</table></div>
    <p class="pg-note">इस महीने ${ok.length} दिन में शुभ समय मिला। समय में राहुकाल हटा दिया गया है और केवल सूर्योदय से सूर्यास्त के बीच के खंड दिखाए गए हैं।</p>`
    : '<p class="pg-note">इस महीने इस कार्य के लिए कोई शुभ दिन नहीं मिला।</p>';
  const reasons = {};
  rows.filter(r => !r.wins?.length).forEach(r => { (reasons[r.skip] ||= []).push(+r.iso.slice(8)); });
  const season = Object.keys(reasons).filter(k => /खरमास|चातुर्मास/.test(k));
  return `<div class="pg-box"><h2>${pu.name} के शुभ मुहूर्त · ${MONFULL[+MU.month.slice(5) - 1]} ${MU.month.slice(0, 4)} · ${esc(place.name)}</h2>${body}
    ${season.length ? `<p class="pg-note"><b>वर्जित काल:</b> ${season.map(k => `${esc(k)} (तारीख़ ${reasons[k].join(', ')})`).join('; ')}</p>` : ''}</div>
  <div class="pg-box"><h2>${pu.name} के नियम (जो यहाँ लगाए गए)</h2>
    ${kv('शुभ नक्षत्र', esc(listNak(pu.nak)))}${kv('शुभ तिथियाँ', esc(listTithi(pu.tithi)))}${kv('शुभ वार', esc(pu.wd.map(i => WEEKDAYS_HI[i]).join(', ')))}
    ${kv('अन्य शर्तें', esc([pu.season ? 'खरमास और चातुर्मास वर्जित' : '', pu.panchak ? 'पंचक वर्जित' : '', 'अमावस्या वर्जित', 'राहुकाल वर्जित'].filter(Boolean).join(', ')))}
    <p class="pg-note">ये परंपरागत सामान्य नियम हैं। क्षेत्र, परंपरा और व्यक्ति की जन्म-कुंडली के अनुसार नियम बदल सकते हैं। विवाह और गृह प्रवेश जैसे बड़े कार्यों में शुक्र-गुरु का अस्त, भद्रा और लग्न-शुद्धि भी देखी जाती है, जो यहाँ शामिल नहीं हैं। अंतिम तिथि तय करने से पहले किसी योग्य पंडित से पुष्टि कराएँ।</p></div>`;
}

// ---------- ग्रहण ----------
const eclName = e => e.type === 'lunar' ? `चंद्र ग्रहण · ${{ total: 'पूर्ण', partial: 'आंशिक', penumbral: 'उपच्छाया' }[e.kind]}` : `सूर्य ग्रहण · ${{ total: 'पूर्ण', annular: 'कंकणाकृति (वलयाकार)', hybrid: 'संकर', partial: 'आंशिक' }[e.kind]}`;
let LAST = [];
const mapHtml = i => `<div style="padding:10px 14px"><button type="button" data-map="${i}" style="font:inherit;font-weight:600;padding:7px 14px;cursor:pointer">दुनिया का दृश्यता नक्शा देखें</button><div class="ex-mapbox"></div></div>`;
function eclipseBox(e, place, i) {
  const h = eclipseBoxInner(e, place);
  return h.replace(/<\/div>$/, mapHtml(i) + '</div>');
}
function eclipseBoxInner(e, place) {
  const mx = e.max, iso = istISO(mx).slice(0, 10), ml = moonSidereal(mx), sl = sunSidereal(mx), ti = tithiAt(mx - 30 * MIN).index;
  const head = `${eclName(e)} · ${fmtDay(iso)}, ${wdOf(iso)}`;
  const base = `${kv('तिथि', esc(tithiName(ti)))}${kv('चंद्र', `${RASHI_HI[Math.floor(ml / 30)]} राशि, ${esc(NAKSHATRAS[Math.floor(ml / NAK)])} नक्षत्र`)}${kv('सूर्य', `${RASHI_HI[Math.floor(sl / 30)]} राशि, ${esc(NAKSHATRAS[Math.floor(sl / NAK)])} नक्षत्र`)}`;
  if (e.type === 'lunar') {
    const L = [['p1', 'उपच्छाया शुरू'], ['u1', 'आंशिक ग्रहण शुरू'], ['u2', 'पूर्ण ग्रहण शुरू'], ['max', 'ग्रहण का मध्य'], ['u3', 'पूर्ण ग्रहण समाप्त'], ['u4', 'आंशिक ग्रहण समाप्त'], ['p4', 'उपच्छाया समाप्त']].filter(([k]) => e.pts[k] != null);
    const v = e.vis;
    const sutak = e.kind !== 'penumbral' && v.any ? `${fmtMs((e.pts.u1) - 9 * HOUR)} से ग्रहण समाप्ति (${clock(e.pts.u4)}) तक` : null;
    return `<div class="pg-box"><h2>${head}</h2>${base}
      ${kv('पूर्ण छाया कोटि', e.magU > 0 ? e.magU.toFixed(3) : 'छाया में प्रवेश नहीं')}${kv('उपच्छाया कोटि', e.magP.toFixed(3))}
      <div class="pg-wrap"><table class="pg-tbl"><tr><th>चरण</th><th>समय (IST)</th><th>${esc(place.name)} से</th></tr>
      ${L.map(([k, n]) => `<tr><td>${n}</td><td>${fmtMs(e.pts[k])}</td><td>${v.up[k] ? 'दिखेगा' : 'चंद्र क्षितिज से नीचे'}</td></tr>`).join('')}</table></div>
      ${kv('आपके स्थान से दृश्यता', v.all ? 'पूरा ग्रहण दिखेगा' : v.any ? 'ग्रहण का कुछ भाग दिखेगा' : 'दिखाई नहीं देगा')}
      ${kv('सूतक', sutak ? esc(sutak) : (e.kind === 'penumbral' ? 'उपच्छाया ग्रहण में सूतक नहीं माना जाता' : 'यहाँ से दृश्य न होने पर सूतक मान्य नहीं'))}</div>`;
  }
  const v = e.vis;
  let local;
  if (v && v.seen) {
    local = `${kv('आपके स्थान से', `दिखेगा, अधिकतम कोटि ${v.mag.toFixed(2)}`)}
      <div class="pg-wrap"><table class="pg-tbl"><tr><th>चरण</th><th>समय (IST)</th><th>सूर्य क्षितिज के ऊपर?</th></tr>
      ${[['c1', 'ग्रहण शुरू'], ['max', 'अधिकतम'], ['c4', 'ग्रहण समाप्त']].map(([k, n], i) => `<tr><td>${n}</td><td>${fmtMs(v.pts[k])}</td><td>${v.partsUp[i] ? 'हाँ' : 'नहीं'}</td></tr>`).join('')}</table></div>
      ${kv('सूतक', `${fmtMs(v.pts.c1 - 12 * HOUR)} से ग्रहण समाप्ति (${clock(v.pts.c4)}) तक`)}`;
  } else local = `${kv('आपके स्थान से दृश्यता', 'दिखाई नहीं देगा')}${kv('सूतक', 'यहाँ से दृश्य न होने पर सूतक मान्य नहीं')}`;
  return `<div class="pg-box"><h2>${head}</h2>${base}${kv('ग्रहण का मध्य (वैश्विक)', fmtMs(mx))}${kv('वैश्विक कोटि', e.magGlobal.toFixed(3))}${kv('गामा', e.gamma.toFixed(3))}${local}</div>`;
}
const GRAHAN_CACHE = new Map();
function grahanBody(place) {
  const now = Date.now(), key = `${GR.years}|${place.lat}|${place.lon}|${new Date().toDateString()}`;
  let list = GRAHAN_CACHE.get(key);
  if (!list) { list = findEclipses(now - 30 * DAY, now + GR.years * 365 * DAY, place); GRAHAN_CACHE.set(key, list); }
  LAST = list;
  const next = list.find(e => e.max > now);
  return `<div class="pg-box"><h2>आने वाले ग्रहण · ${esc(place.name)}</h2>
    <p class="pg-note">${next ? `अगला ग्रहण: ${esc(eclName(next))}, ${fmtDMs(next.max)}।` : 'चुनी अवधि में कोई ग्रहण नहीं मिला।'} नीचे पिछले 30 दिन के ग्रहण भी दिखते हैं। सभी समय भारतीय समय में हैं और दृश्यता चुने स्थान के अनुसार है।</p></div>
  ${list.map((e, i) => eclipseBox(e, place, i)).join('')}
  <div class="pg-box"><h2>नोट</h2><p class="pg-note">ग्रहण की गणना सूर्य-चंद्र की स्थिति से की गई है। समय सामान्यतः कुछ मिनट के भीतर सही रहता है, पर Drik या NASA के प्रकाशित समय से 1-3 मिनट का अंतर हो सकता है। सूतक चंद्र ग्रहण में 9 घंटे और सूर्य ग्रहण में 12 घंटे पहले से माना गया है, और केवल तब जब ग्रहण आपके स्थान से दिखे। दृश्यता केवल चुने हुए स्थान के लिए बताई गई है, पूरी दुनिया का नक्शा उपलब्ध नहीं है।</p></div>`;
}

// ---------- पंचक और भद्रा ----------
const PK_TYPE = { 0: 'रोग पंचक', 1: 'राज पंचक', 2: 'अग्नि पंचक', 5: 'चोर पंचक', 6: 'मृत्यु पंचक' };
const PK_ADVICE = { 0: 'रोग पंचक: शुभ कार्य टालें', 1: 'राज पंचक: सरकारी कार्य शुभ माने जाते हैं', 2: 'अग्नि पंचक: निर्माण और अग्नि संबंधी कार्य वर्जित', 5: 'चोर पंचक: यात्रा और लेन-देन में सावधानी', 6: 'मृत्यु पंचक: जोखिम भरे कार्य वर्जित' };
const BH_LOKA = ['स्वर्ग', 'स्वर्ग', 'स्वर्ग', 'भूलोक (पृथ्वी)', 'भूलोक (पृथ्वी)', 'पाताल', 'पाताल', 'स्वर्ग', 'पाताल', 'पाताल', 'भूलोक (पृथ्वी)', 'भूलोक (पृथ्वी)'];
const inPanchak = ms => moonSidereal(ms) >= 300;
const kIdx = ms => Math.floor(elongation(ms) / 6) + 1;
const inBhadra = ms => { const k = kIdx(ms); return k >= 2 && k <= 57 && (k - 2) % 7 === 6; };
function intervals(pred, from, to, step) {
  const out = [];
  let t = from, cur = pred(t), start = cur ? from : null;
  while (t < to) {
    const n = Math.min(t + step, to), v = pred(n);
    if (v !== cur) {
      let lo = t, hi = n;
      while (hi - lo > 30000) { const mid = (lo + hi) / 2; if (pred(mid) === cur) lo = mid; else hi = mid; }
      if (v) start = hi; else if (start != null) out.push({ start, end: hi }); else out.push({ start: null, end: hi });
      cur = v;
    }
    t = n;
  }
  if (cur && start != null) out.push({ start, end: to, open: true });
  return out;
}
const PKC = new Map();
function panchakBody() {
  const days = monthDays(PK.month), m0 = istMidnight(days[0]), m1 = istMidnight(days[days.length - 1]) + DAY;
  const key = PK.month;
  let c = PKC.get(key);
  if (!c) {
    c = { pk: intervals(inPanchak, m0 - 6 * DAY, m1 + 3 * DAY, HOUR), bh: intervals(inBhadra, m0 - 2 * DAY, m1 + DAY, 30 * MIN) };
    PKC.set(key, c);
  }
  const pk = c.pk.filter(x => x.start != null && x.end > m0 && x.start < m1), bh = c.bh.filter(x => x.start != null && x.end > m0 && x.start < m1);
  const now = Date.now();
  const nowPk = inPanchak(now), nowBh = inBhadra(now);
  const pkRow = x => { const wd = new Date(x.start + 330 * MIN).getUTCDay(); return `<tr${now >= x.start && now < x.end ? ' class="mp-on"' : ''}><td>${fmtMs(x.start)}</td><td>${fmtMs(x.end)}</td><td>${dur(x.end - x.start)}</td><td>${PK_TYPE[wd] ? esc(PK_TYPE[wd]) : 'बुध/गुरु से शुरू — विशेष नाम नहीं'}</td><td>${PK_ADVICE[wd] ? esc(PK_ADVICE[wd]) : 'दोष कम माना जाता है'}</td></tr>`; };
  const bhRow = x => { const ms = Math.floor(moonSidereal(x.start + MIN) / 30); return `<tr${now >= x.start && now < x.end ? ' class="mp-on"' : ''}><td>${fmtMs(x.start)}</td><td>${fmtMs(x.end)}</td><td>${dur(x.end - x.start)}</td><td>${RASHI_HI[ms]}</td><td>${BH_LOKA[ms]}${BH_LOKA[ms].startsWith('भूलोक') ? ' — अशुभ प्रभाव अधिक' : ''}</td></tr>`; };
  return `<div class="pg-box"><h2>अभी की स्थिति</h2>${kv('पंचक', nowPk ? '<span class="mp-bad">अभी पंचक चल रहा है</span>' : '<span class="mp-ok">अभी पंचक नहीं है</span>')}${kv('भद्रा (विष्टि करण)', nowBh ? '<span class="mp-bad">अभी भद्रा चल रही है</span>' : '<span class="mp-ok">अभी भद्रा नहीं है</span>')}</div>
  <div class="pg-box"><h2>पंचक · ${MONFULL[+PK.month.slice(5) - 1]} ${PK.month.slice(0, 4)}</h2>${pk.length ? `<div class="pg-wrap"><table class="pg-tbl"><tr><th>शुरू</th><th>समाप्त</th><th>अवधि</th><th>प्रकार</th><th>प्रभाव</th></tr>${pk.map(pkRow).join('')}</table></div>` : '<p class="pg-note">इस महीने कोई पंचक नहीं।</p>'}
    <p class="pg-note">चंद्रमा के धनिष्ठा के उत्तरार्ध से रेवती तक (कुंभ और मीन राशि) रहने का समय पंचक कहलाता है। इसमें दक्षिण दिशा की यात्रा, लकड़ी का संग्रह, छत डालना और अंतिम संस्कार जैसे कार्यों में विशेष सावधानी बताई गई है।</p></div>
  <div class="pg-box"><h2>भद्रा (विष्टि करण) · ${MONFULL[+PK.month.slice(5) - 1]} ${PK.month.slice(0, 4)}</h2>${bh.length ? `<div class="pg-wrap"><table class="pg-tbl"><tr><th>शुरू</th><th>समाप्त</th><th>अवधि</th><th>चंद्र राशि</th><th>भद्रा का वास</th></tr>${bh.map(bhRow).join('')}</table></div>` : '<p class="pg-note">इस महीने कोई भद्रा नहीं।</p>'}
    <p class="pg-note">भद्रा में विवाह, गृह प्रवेश, मुंडन और रक्षाबंधन जैसे शुभ कार्य वर्जित माने जाते हैं। चंद्रमा कर्क, सिंह, कुंभ या मीन में हो तो भद्रा भूलोक में मानी जाती है और अधिक अशुभ होती है। सभी समय भारतीय समय में हैं और स्थान पर निर्भर नहीं।</p></div>`;
}

// ---------- सूर्योदय-चंद्रोदय तालिका ----------
function riseBody(place) {
  const days = monthDays(RT.month), today = todayIST();
  const rows = days.map(iso => {
    const pd = getPanchangDay(iso, place), dt = getDayTimes(iso, place);
    return { iso, pd, dt };
  });
  const t = (d, iso) => !d ? '—' : istISO(+d).slice(0, 10) === iso ? clock(+d) : `${+istISO(+d).slice(8, 10)} ${MON[+istISO(+d).slice(5, 7) - 1]}, ${clock(+d)}`;
  return `<div class="pg-box"><h2>${MONFULL[+RT.month.slice(5) - 1]} ${RT.month.slice(0, 4)} · ${esc(place.name)}</h2><div class="pg-wrap"><table class="pg-tbl">
    <tr><th>तारीख़</th><th>वार</th><th>सूर्योदय</th><th>सूर्यास्त</th><th>दिनमान</th><th>चंद्रोदय</th><th>चंद्रास्त</th><th>तिथि (सूर्योदय पर)</th></tr>
    ${rows.map(({ iso, pd, dt }) => `<tr${iso === today ? ' class="mp-on"' : ''}><td>${+iso.slice(8)} ${MON[+iso.slice(5, 7) - 1]}</td><td>${wdOf(iso)}</td><td>${t(dt?.sunrise, iso)}</td><td>${t(dt?.sunset, iso)}</td><td>${dt ? dur(dt.dayLengthMin * MIN) : '—'}</td><td>${t(pd.moonrise, iso)}</td><td>${t(pd.moonset, iso)}</td><td>${esc(pd.tithis[0]?.label || '')}</td></tr>`).join('')}</table></div>
    <p class="pg-note">जिस दिन चंद्रमा का उदय या अस्त उसी तारीख़ में नहीं पड़ता (चंद्रोदय हर दिन लगभग 50 मिनट देर से होता है, इसलिए कभी-कभी एक दिन छूट जाता है), वहाँ अगले दिन का समय तारीख़ के साथ दिखाया गया है। सभी समय भारतीय समय में, चुने स्थान के अनुसार हैं। सूर्योदय-सूर्यास्त उदय के ऊपरी किनारे और वायुमंडलीय अपवर्तन के साथ गिने गए हैं।</p></div>`;
}


// ---------- पंचांग टाइमलाइन (Drik जैसी: सूर्योदय से अगले सूर्योदय तक एक रेखा पर) ----------
function timelineBody(place, iso) {
  const pd = getPanchangDay(iso, place), dt = getDayTimes(iso, place), nx = getDayTimes(shiftDate(iso, 1), place);
  if (!dt || !nx) return '<div class="pg-box"><h2>टाइमलाइन</h2><p class="pg-note">इस स्थान और तारीख़ पर सूर्योदय-सूर्यास्त उपलब्ध नहीं है।</p></div>';
  const sr = +dt.sunrise, ss = +dt.sunset, sr2 = +nx.sunrise, d0 = istMidnight(iso);
  const T0 = d0 + Math.floor((sr - d0) / HOUR) * HOUR, T1 = T0 + 25 * HOUR;
  // viewBox पूरे बॉक्स की चौड़ाई में फ़िट होता है; किनारे पर लिखा हर शब्द viewBox के भीतर ही रखा जाता है
  const W = 1000, L = 26, R = 26, PW = W - L - R, X = ms => L + (ms - T0) / (T1 - T0) * PW;
  const AX = 96, rows = [['तिथि', pd.tithis, 176], ['नक्षत्र', pd.nakshatras, 246], ['योग', pd.yogas, 316], ['करण', pd.karanas, 386]], WK = 458, H = WK + 48;
  const hhmm = ms => clock(ms).replace(' AM', ' am').replace(' PM', ' pm');
  // पाठ को किनारों के भीतर रखने वाला x (text-anchor: middle के लिए)
  const cx = (x, str, fs) => { const half = str.length * fs * 0.55 + 4; return Math.min(W - half, Math.max(half, x)); };
  let g = '';
  g += `<rect x="${L}" y="20" width="${X(sr) - L}" height="${H - 20}" class="tl-night"/><rect x="${X(ss)}" y="20" width="${Math.min(X(sr2), L + PW) - X(ss)}" height="${H - 20}" class="tl-night"/><rect x="${Math.min(X(sr2), L + PW)}" y="20" width="${Math.max(0, L + PW - X(sr2))}" height="${H - 20}" class="tl-night"/>`;
  g += `<line x1="${L}" y1="${AX}" x2="${L + PW}" y2="${AX}" class="tl-axis"/>`;
  for (let t = T0; t <= T1; t += HOUR) {
    const hr = new Date(t + 330 * MIN).getUTCHours(), x = X(t);
    g += `<line x1="${x}" y1="${AX - 6}" x2="${x}" y2="${AX + 6}" class="tl-tick"/><text x="${x}" y="${AX + 26}" class="tl-t tl-hr" text-anchor="middle">${hr % 12 || 12}</text>`;
  }
  const sun = (ms, lab) => `<path d="M${X(ms) - 14} ${AX} A14 14 0 0 1 ${X(ms) + 14} ${AX} Z" class="tl-sun"/><text x="${cx(X(ms), lab, 15)}" y="${AX - 22}" class="tl-t tl-sm" text-anchor="middle">${lab}</text>`;
  g += sun(sr, hhmm(sr)) + sun(ss, hhmm(ss)) + (sr2 <= T1 ? sun(sr2, hhmm(sr2)) : '');
  for (const [d, lab] of [[pd.moonrise, 'चंद्रोदय'], [pd.moonset, 'चंद्रास्त']]) if (d && +d >= T0 && +d <= T1) {
    const t = `${lab} ${hhmm(+d)}`;
    g += `<circle cx="${X(+d)}" cy="${AX}" r="9" class="tl-moon"/><text x="${cx(X(+d), t, 15)}" y="${AX + 46}" class="tl-t tl-sm" text-anchor="middle">${t}</text>`;
  }
  if (iso === todayIST()) { const n = Date.now(); if (n >= T0 && n <= T1) g += `<line x1="${X(n)}" y1="${AX}" x2="${X(n)}" y2="${H - 34}" class="tl-now"/><circle cx="${X(n)}" cy="${AX}" r="10" class="tl-nowc"/>`; }
  const ev = [];
  const addEv = (list, kind) => list.forEach(s => { if (s.end && +s.end > sr && +s.end < sr2) ev.push({ t: +s.end, kind }); });
  addEv(pd.tithis, 'तिथि'); addEv(pd.nakshatras, 'नक्षत्र'); addEv(pd.yogas, 'योग'); addEv(pd.karanas, 'करण'); addEv(pd.moonRashi, 'चंद्र राशि');
  ev.sort((a, b) => a.t - b.t);
  const clusters = [];
  for (const e of ev) { const c = clusters[clusters.length - 1]; if (c && e.t - c.t <= 4 * MIN) c.kinds.push(e.kind); else clusters.push({ t: e.t, kinds: [e.kind] }); }
  clusters.forEach((c, i) => {
    const y1 = AX - 30 - (i % 2) * 16;
    g += `<line x1="${X(c.t)}" y1="${y1 + 8}" x2="${X(c.t)}" y2="${AX}" class="tl-tick"/><circle cx="${X(c.t)}" cy="${y1 - 4}" r="11" class="tl-badge"/><text x="${X(c.t)}" y="${y1}" class="tl-t tl-num" text-anchor="middle">${i + 1}</text>`;
  });
  for (const [name, list, y] of rows) {
    g += `<text x="${L}" y="${y - 10}" class="tl-t tl-rl">${name}</text><line x1="${X(sr)}" y1="${y}" x2="${X(sr2)}" y2="${y}" class="tl-row"/>`;
    let prev = sr;
    list.forEach(s => {
      const end = s.end ? +s.end : sr2, x0 = X(prev), x1 = X(Math.min(end, sr2));
      if (x1 - x0 > 40) g += `<text x="${cx((x0 + x1) / 2, s.label, 18)}" y="${y + 26}" class="tl-t tl-seg" text-anchor="middle">${esc(s.label)}</text>`;
      if (s.end && end < sr2 - 60000) {
        const et = hhmm(end);
        g += `<line x1="${x1}" y1="${AX}" x2="${x1}" y2="${y}" class="tl-dash"/><line x1="${x1}" y1="${y - 6}" x2="${x1}" y2="${y + 6}" class="tl-tick"/><text x="${cx(x1, et, 14)}" y="${y - 12}" class="tl-t tl-sm" text-anchor="middle">${et}</text>`;
      }
      prev = end;
    });
  }
  const ch = chaughadiya(iso, place), bad = [...ch.day, ...ch.night].filter(c => !c.good);
  g += `<text x="${L}" y="${WK - 10}" class="tl-t tl-rl">वार</text><line x1="${X(sr)}" y1="${WK}" x2="${X(sr2)}" y2="${WK}" class="tl-row"/>`;
  bad.forEach(c => {
    const a = X(+c.start), b = X(+c.end);
    g += `<line x1="${a}" y1="${WK - 9}" x2="${a}" y2="${WK + 9}" class="tl-tick"/><line x1="${b}" y1="${WK - 9}" x2="${b}" y2="${WK + 9}" class="tl-tick"/><line x1="${a}" y1="${WK}" x2="${b}" y2="${WK}" class="tl-bad"/><text x="${cx((a + b) / 2, c.name, 15)}" y="${WK - 14}" class="tl-t tl-sm" text-anchor="middle">${esc(c.name)}</text>`;
  });
  g += `<text x="${cx((X(sr) + X(sr2)) / 2, wdOf(iso), 18)}" y="${WK + 34}" class="tl-t tl-seg" text-anchor="middle">${esc(wdOf(iso))}</text>`;
  const svg = `<svg viewBox="0 0 ${W} ${H}" width="100%" style="display:block;height:auto;min-width:900px" role="img" aria-label="पंचांग टाइमलाइन"><style>.tl-t{fill:var(--dtxt,#111);font-family:inherit}.tl-night{fill:rgba(0,0,0,.10)}.tl-axis{stroke:var(--dtxt,#111);stroke-width:2.5}.tl-tick{stroke:var(--dtxt,#111);stroke-width:1.6}.tl-row{stroke:var(--dtxt,#111);stroke-width:1.2;opacity:.55}.tl-dash{stroke:var(--dtxt,#111);stroke-width:1.2;stroke-dasharray:5 5;opacity:.5}.tl-sun{fill:#f3a21b;stroke:#a35f00;stroke-width:1.2}.tl-moon{fill:#9aa1ab;stroke:#fff;stroke-width:2}.tl-now{stroke:var(--dtxt,#111);stroke-width:1.6;stroke-dasharray:4 4}.tl-nowc{fill:#fff;stroke:var(--dtxt,#111);stroke-width:2.5}.tl-bad{stroke:#b3261e;stroke-width:3}.tl-badge{fill:var(--dhead,#5c5f63)}.tl-hr{font-size:17px}.tl-sm{font-size:15px}.tl-seg{font-size:19px;font-weight:600}.tl-rl{font-size:17px;font-weight:700}.tl-num{font-size:14px;font-weight:700;fill:#fff}</style>${g}</svg>`;
  const foot = clusters.map((c, i) => `<span style="display:inline-block;margin:2px 16px 2px 0"><b>${i + 1}.</b> ${esc([...new Set(c.kinds)].join(', '))} <small>(${hhmm(c.t)})</small></span>`).join('');
  return `<div class="pg-box"><h2>टाइमलाइन · ${fmtDay(iso)}, ${wdOf(iso)} · ${esc(place.name)}</h2>
    <div style="padding:8px 8px 0;overflow-x:auto;-webkit-overflow-scrolling:touch">${svg}</div>
    <div style="padding:6px 14px 10px;font-size:14px">${foot}</div>
    <p class="pg-note" style="margin:0;padding:0 14px 12px">रेखा सूर्योदय (${hhmm(sr)}) से अगले सूर्योदय (${hhmm(sr2)}) तक है। गहरा भाग रात है। ऊपर के अंक उन क्षणों को बताते हैं जब कुछ बदलता है, नीचे सूची में नाम हैं। लाल पट्टियाँ अशुभ चौघड़िया हैं। भूरा गोला चंद्रोदय या चंद्रास्त है।</p></div>`;
}

// ---------- फ्रेम: टूलबार, बाइंडिंग, पेज ----------
const birthFields = (k, lab) => `<span class="mp-grp"><b>${lab}</b><input type="date" data-b="${k}" data-f="date" value="${esc(B[k].date)}" aria-label="${lab} जन्म तारीख़"><input type="time" data-b="${k}" data-f="time" value="${esc(B[k].time)}" aria-label="${lab} जन्म समय"></span>`;
const monthTool = (k, S) => `<button type="button" data-mv="${k}:-1">‹ पिछला</button><input type="month" data-s="${k}" data-f="month" value="${S.month}"><button type="button" data-mv="${k}:0">इस माह</button><button type="button" data-mv="${k}:1">अगला ›</button>`;

export function makeExtraPages({ refresh, getPlace, placeBox, S, bindDate }) {
  const bind = root => {
    root.querySelectorAll('[data-b][data-f]').forEach(el => el.addEventListener('change', () => { B[el.dataset.b][el.dataset.f] = el.value; refresh(); }));
    root.querySelectorAll('[data-map]').forEach(b => b.addEventListener('click', async () => {
      const e = LAST[+b.dataset.map], box = b.nextElementSibling;
      if (!e || !box) return;
      b.disabled = true; b.textContent = 'नक्शा बन रहा है...';
      try {
        const { drawEclipseMap, legendFor } = await import('./eclipse-map.js');
        box.innerHTML = '<canvas width="1440" height="720" style="width:100%;height:auto;display:block;margin-top:10px;border:1px solid var(--pborder,#5c5f63)"></canvas><div class="ex-leg" style="display:flex;flex-wrap:wrap;gap:6px 18px;margin-top:8px;font-size:13px"></div><p class="pg-note" style="padding:6px 0 0"></p>';
        const r = await drawEclipseMap(box.querySelector('canvas'), e, getPlace());
        box.querySelector('.ex-leg').innerHTML = legendFor(e).map(([c, t]) => `<span style="display:inline-flex;align-items:center;gap:6px"><i style="width:16px;height:12px;background:${c};border:1px solid rgba(0,0,0,.35);display:inline-block"></i>${esc(t)}</span>`).join('') + '<span style="display:inline-flex;align-items:center;gap:6px"><i style="width:12px;height:12px;border-radius:50%;background:#c0141c;display:inline-block"></i>आपका स्थान</span>';
        box.querySelector('.pg-note').textContent = r.hasLand ? 'नक्शे में रंग पूरे ग्रहण के दौरान की स्थिति दिखाते हैं। खाने 4 अंश के हैं, इसलिए सीमाओं पर थोड़ा अंतर हो सकता है।' : 'तट-रेखाएँ लोड नहीं हो सकीं (इंटरनेट या CDN की समस्या), इसलिए केवल अक्षांश-देशांतर रेखाओं पर नक्शा दिखाया गया है।';
        b.remove();
      } catch (err) { console.error(err); b.disabled = false; b.textContent = 'नक्शा नहीं बन सका, फिर कोशिश करें'; }
    }));
    root.querySelector('#ex-rashi')?.addEventListener('change', e => { B.rashi = +e.target.value; refresh(); });
    root.querySelectorAll('[data-s][data-f]').forEach(el => el.addEventListener('change', () => { const v = el.value; if (v) { STATE[el.dataset.s][el.dataset.f] = el.dataset.f === 'years' ? +v : v; refresh(); } }));
    root.querySelectorAll('[data-mv]').forEach(b => b.addEventListener('click', () => {
      const [k, n] = b.dataset.mv.split(':'); STATE[k].month = +n ? shiftMonth(STATE[k].month, +n) : todayIST().slice(0, 7); refresh();
    }));
  };
  const kundliPage = (lab, withB, render) => ({
    tool: () => `${placeBox()}${birthFields('a', withB ? 'वर / पहला' : 'जन्म')}${withB ? birthFields('b', 'वधू / दूसरा') : ''}`,
    body: () => {
      const place = getPlace(), ra = kundliOf(B.a, place), rb = withB ? kundliOf(B.b, place) : null;
      if (!ra && !rb) return needBirth(lab);
      return render(ra, rb);
    },
    bind
  });
  return {
    mangal: kundliPage('मंगल दोष', true, (ra, rb) => {
      const a = ra && mangalOf(ra), b = rb && mangalOf(rb);
      const cmp = a && b ? mangalCompare(a, b) : null;
      return `${ra ? mangalBox('पहला (वर)', ra) : ''}${rb ? mangalBox('दूसरा (वधू)', rb) : ''}
        ${cmp ? `<div class="pg-box"><h2>वर-वधू की तुलना</h2><div class="pg-kv"><span>निष्कर्ष</span><b class="${cmp[1] ? 'mp-ok' : 'mp-bad'}">${esc(cmp[0])}</b></div></div>` : (a && !b ? '<p class="pg-note">तुलना के लिए दूसरे साथी की जन्म तारीख़ और समय भी भरें।</p>' : '')}${MANGAL_RULES}`;
    }),
    kaalsarp: kundliPage('काल सर्प दोष', false, ra => ra ? kaalsarpBody(ra) : needBirth('काल सर्प दोष')),
    sadesati: {
      tool: () => `${birthFields('a', 'जन्म')}<span class="mp-grp"><b>या चंद्र राशि</b><select id="ex-rashi" aria-label="चंद्र राशि"><option value="-1">जन्म विवरण से</option>${RASHI_HI.map((r, i) => `<option value="${i}"${B.rashi === i ? ' selected' : ''}>${r}</option>`).join('')}</select></span>`,
      body: () => sadesatiBody(), bind
    },
    shubh: {
      tool: () => `${placeBox()}<select data-s="mu" data-f="purpose" aria-label="कार्य">${Object.entries(PURPOSES).map(([k, v]) => `<option value="${k}"${MU.purpose === k ? ' selected' : ''}>${v.name}</option>`).join('')}</select>${monthTool('mu', MU)}`,
      body: () => shubhBody(getPlace()), bind
    },
    grahan: {
      tool: () => `${placeBox()}<select data-s="gr" data-f="years" aria-label="अवधि">${[1, 2, 3, 5].map(y => `<option value="${y}"${GR.years === y ? ' selected' : ''}>अगले ${y} वर्ष</option>`).join('')}</select>`,
      body: () => grahanBody(getPlace()), bind
    },
    panchak: { tool: () => monthTool('pk', PK), body: () => panchakBody(), bind },
    timeline: {
      tool: () => `${placeBox()}<button type="button" data-d="-1">‹ पिछला दिन</button><input type="date" id="pg-date" value="${S.date}"><button type="button" data-d="0">आज</button><button type="button" data-d="1">अगला दिन ›</button>`,
      body: () => timelineBody(getPlace(), S.date), bind: bindDate
    },
    chandrodaya: { tool: () => `${placeBox()}${monthTool('rt', RT)}`, body: () => riseBody(getPlace()), bind }
  };
}

export const EXTRA_CSS = '';

// ---------- होम के टूल-ग्रिड में सात कार्ड ----------
export function mountExtraTools() {
  const add = () => {
    const grid = document.querySelector('.tool-grid');
    if (!grid || grid.dataset.extra) return;
    grid.dataset.extra = '1';
    for (const k of Object.keys(EXTRA_TITLES)) {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'tool-card'; b.dataset.more = k;
      b.innerHTML = `<span class="tool-icon"></span><b>${esc(TOOL_INFO[k][0])}</b><small>${esc(TOOL_INFO[k][1])}</small><span class="tool-arrow">↗</span>`;
      grid.appendChild(b);
    }
  };
  add();
  if (!document.querySelector('.tool-grid[data-extra]')) {
    const mo = new MutationObserver(() => { add(); if (document.querySelector('.tool-grid[data-extra]')) mo.disconnect(); });
    mo.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => mo.disconnect(), 30000);
  }
}
