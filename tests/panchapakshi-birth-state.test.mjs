// जन्म-समय की पंचपक्षी स्थिति के टेस्ट (सिंथेटिक डेटा)। अपेक्षित मान tests/independent-calc.mjs से स्वतंत्र रूप से निकाले जाते हैं।
// चलाने के लिए (रिपो के रूट से): node tests/panchapakshi-birth-state.test.mjs
import { birthStateFor, birthStateFromMs, birthStateHtml, NOT_VERIFIED } from '../src/panchapakshi-birth-state.js';
import { istToMs } from '../src/panchapakshi-engine.js';
import { independentMoon, independentSunTimes, jdOf } from './independent-calc.mjs';

let failed = 0;
const ok = (cond, msg) => { console.log((cond ? 'PASS ' : 'FAIL ') + msg); if (!cond) { failed++; process.exitCode = 1; } };
const near = (a, b, tol) => Math.abs(a - b) <= tol;

const PLACE = { name: 'Jaipur, Rajasthan, India', lat: 26.9124, lon: 75.7873 };
const WEEKDAYS_HI = ['रविवार', 'सोमवार', 'मंगलवार', 'बुधवार', 'गुरुवार', 'शुक्रवार', 'शनिवार'];
const weekdayOfDate = iso => new Date(`${iso}T12:00:00Z`).getUTCDay();
const prevDay = iso => new Date(Date.parse(`${iso}T12:00:00Z`) - 86400000).toISOString().slice(0, 10);

// स्वतंत्र यम-अपेक्षा: चक्र (सूर्योदय से अगला सूर्योदय) में दिए गए UTC ms के लिए यम संख्या और स्थिति
function independentYama(cycleDate, ms) {
  const sun = independentSunTimes(cycleDate, PLACE.lat, PLACE.lon);
  const next = independentSunTimes(nextDay(cycleDate), PLACE.lat, PLACE.lon);
  const dayLen = sun.sunset - sun.sunrise;
  const nightLen = next.sunrise - sun.sunset;
  if (ms < sun.sunset) {
    const idx = Math.min(4, Math.floor((ms - sun.sunrise) / (dayLen / 5)));
    const start = sun.sunrise + idx * (dayLen / 5);
    return { no: idx + 1, part: 'दिन', positionPct: ((ms - start) / (dayLen / 5)) * 100 };
  }
  const idx = Math.min(4, Math.floor((ms - sun.sunset) / (nightLen / 5)));
  const start = sun.sunset + idx * (nightLen / 5);
  return { no: idx + 6, part: 'रात', positionPct: ((ms - start) / (nightLen / 5)) * 100 };
}
function nextDay(iso) { return new Date(Date.parse(`${iso}T12:00:00Z`) + 86400000).toISOString().slice(0, 10); }

// ---------- केस A: सिंथेटिक फ़िक्सचर, दिन का समय ----------
{
  const s = birthStateFor('1998-08-15', '10:30', PLACE);
  ok(!s.error, 'केस A: 1998-08-15 10:30 की स्थिति बनी');
  const e = independentMoon('1998-08-15', '10:30');
  ok(s.nakshatra === e.nakName && s.pada === e.pada, `केस A: नक्षत्र ${e.nakName}, पाद ${e.pada} (स्वतंत्र) — मिले: ${s.nakshatra}, ${s.pada}`);
  ok(s.paksha === e.paksha && s.tithiInPaksha === e.tithiInPaksha, `केस A: पक्ष ${e.paksha}, तिथि ${e.tithiInPaksha} (स्वतंत्र) — मिले: ${s.paksha}, ${s.tithiInPaksha}`);
  ok(s.cycleDate === '1998-08-15' && s.weekday === WEEKDAYS_HI[weekdayOfDate('1998-08-15')], `केस A: चक्र 1998-08-15, वार ${WEEKDAYS_HI[weekdayOfDate('1998-08-15')]} — मिला: ${s.weekday}`);
  const y = independentYama('1998-08-15', e.ms);
  ok(s.yama.no === y.no && s.yama.part === y.part, `केस A: यम ${y.no} (${y.part}) स्वतंत्र गणना से — मिला: ${s.yama.no} (${s.yama.part})`);
  ok(near(s.yama.positionPct, y.positionPct, 0.5), `केस A: यम में स्थिति ${y.positionPct.toFixed(2)}% स्वतंत्र — मिली: ${s.yama.positionPct.toFixed(2)}%`);
  const sun = independentSunTimes('1998-08-15', PLACE.lat, PLACE.lon);
  ok(near(s.sunrise, sun.sunrise, 60000) && near(s.sunset, sun.sunset, 60000), 'केस A: सूर्योदय/सूर्यास्त सीमा (1 मिनट) में स्वतंत्र गणना से मेल');
  ok(s.bird && s.bird !== '—', `केस A: जन्म-पक्षी ${s.bird}`);
}

// ---------- केस B: सूर्योदय से पहले का समय → पिछले दिन का रात्रि-चक्र ----------
{
  const s = birthStateFor('1998-08-15', '04:00', PLACE);
  ok(!s.error && s.cycleDate === '1998-08-14', `केस B: सूर्योदय से पहले 04:00 पिछले दिन (1998-08-14) के चक्र में — मिला: ${s.cycleDate}`);
  ok(s.weekday === WEEKDAYS_HI[weekdayOfDate('1998-08-14')], `केस B: वार पिछले दिन का (${WEEKDAYS_HI[weekdayOfDate('1998-08-14')]}) — मिला: ${s.weekday}`);
  const e = independentMoon('1998-08-15', '04:00');
  const y = independentYama('1998-08-14', e.ms);
  ok(s.yama.part === 'रात' && s.yama.no === y.no, `केस B: यम ${y.no} (${y.part}) स्वतंत्र — मिला: ${s.yama.no} (${s.yama.part})`);
  ok(near(s.yama.positionPct, y.positionPct, 0.5), `केस B: यम में स्थिति ${y.positionPct.toFixed(2)}% स्वतंत्र — मिली: ${s.yama.positionPct.toFixed(2)}%`);
}

// ---------- केस C: सूर्यास्त के बाद का समय → रात्रि यम ----------
{
  const s = birthStateFor('1998-08-15', '20:00', PLACE);
  const e = independentMoon('1998-08-15', '20:00');
  const y = independentYama('1998-08-15', e.ms);
  ok(s.cycleDate === '1998-08-15' && s.yama.part === 'रात', 'केस C: 20:00 उसी दिन के रात्रि-चक्र में');
  ok(s.yama.no === y.no && near(s.yama.positionPct, y.positionPct, 0.5), `केस C: यम ${y.no} स्वतंत्र — मिला ${s.yama.no}; स्थिति ${y.positionPct.toFixed(2)}% — मिली ${s.yama.positionPct.toFixed(2)}%`);
}

// ---------- केस D: सीमा के सटीक क्षण ----------
{
  const sun = independentSunTimes('1998-08-15', PLACE.lat, PLACE.lon);
  const atSunrise = birthStateFromMs(Math.round(sun.sunrise), PLACE);
  ok(!atSunrise.error && atSunrise.cycleDate === '1998-08-15' && atSunrise.yama.no === 1 && atSunrise.yama.positionPct < 1,
    `केस D: सूर्योदय के क्षण पर यम 1, शुरुआत पर (मिला: यम ${atSunrise.yama && atSunrise.yama.no}, ${atSunrise.yama && atSunrise.yama.positionPct.toFixed(3)}%)`);
  const atSunset = birthStateFromMs(Math.round(sun.sunset), PLACE);
  ok(!atSunset.error && atSunset.yama.part === 'रात' && atSunset.yama.no === 6, `केस D: सूर्यास्त के क्षण पर रात्रि यम 6 (मिला: ${atSunset.yama && atSunset.yama.no} ${atSunset.yama && atSunset.yama.part})`);
  const next = independentSunTimes(nextDay('1998-08-15'), PLACE.lat, PLACE.lon);
  const atNext = birthStateFromMs(Math.round(next.sunrise), PLACE);
  ok(!atNext.error && atNext.cycleDate === nextDay('1998-08-15') && atNext.yama.no === 1, 'केस D: अगले सूर्योदय के क्षण पर नया चक्र शुरू (यम 1)');
}

// ---------- केस E: सत्यापन — गतिविधि और सामर्थ्य/संबंध ----------
{
  // शुक्ल और कृष्ण दोनों पक्षों की तारीख़ें मिलें (1998, अगस्त–सितंबर के बीच)
  let shukla = null, krishna = null;
  for (let d = 1; d <= 45 && (!shukla || !krishna); d++) {
    const iso = new Date(Date.parse('1998-08-01T12:00:00Z') + (d - 1) * 86400000).toISOString().slice(0, 10);
    const e = independentMoon(iso, '10:30');
    if (e.paksha === 'शुक्ल' && !shukla) shukla = iso;
    if (e.paksha === 'कृष्ण' && !krishna) krishna = iso;
  }
  ok(shukla && krishna, `केस E: शुक्ल (${shukla}) और कृष्ण (${krishna}) पक्ष की तारीख़ें मिलीं`);
  for (const iso of [shukla, krishna]) {
    const s = birthStateFor(iso, '10:30', PLACE);
    ok(!s.error && s.activity === NOT_VERIFIED && s.activityVerified === false, `केस E: ${iso} — गतिविधि "${NOT_VERIFIED}" (सत्यापित नहीं)`);
    ok(!('strength' in s) && !('relationship' in s), `केस E: ${iso} — सामर्थ्य और संबंध फ़ील्ड नहीं भरे गए`);
  }
}

// ---------- केस F: टाइमलाइन की संरचना ----------
{
  const s = birthStateFor('1998-08-15', '10:30', PLACE);
  ok(s.segments.length === 10, 'केस F: टाइमलाइन में 10 खंड');
  const totalW = s.segments.reduce((a, g) => a + g.widthPct, 0);
  ok(near(totalW, 100, 1e-6), `केस F: खंडों की चौड़ाई का योग 100% (मिला ${totalW.toFixed(6)})`);
  let contiguous = true;
  for (let i = 1; i < s.segments.length; i++) contiguous = contiguous && near(s.segments[i].leftPct, s.segments[i - 1].leftPct + s.segments[i - 1].widthPct, 1e-9);
  ok(contiguous && near(s.segments[0].leftPct, 0, 1e-9), 'केस F: खंड बिना गैप/ओवरलैप के जुड़े हैं');
  const active = s.segments.find(g => g.no === s.yama.no);
  ok(s.birthPct >= active.leftPct && s.birthPct < active.leftPct + active.widthPct, 'केस F: लाल रेखा (जन्म-समय) सक्रिय यम के भीतर है');
  ok(near(s.sunsetPct, s.segments[4].leftPct + s.segments[4].widthPct, 1e-6), 'केस F: सूर्यास्त की स्थिति पाँचवें दिन-खंड के अंत पर');
}

// ---------- केस G: गलत इनपुट ----------
{
  const bad = [
    ['', '10:30', 'खाली तारीख़'],
    ['2001-02-29', '10:30', 'गैर-लीप 29 फ़रवरी'],
    ['1998-08-15', '', 'खाली समय'],
    ['1998-08-15', '25:00', 'घंटा 25'],
    ['1998-08-15', '10:60', 'मिनट 60'],
    ['15-08-1998', '10:30', 'पुराना प्रारूप']
  ];
  for (const [d, t, label] of bad) {
    const s = birthStateFor(d, t, PLACE);
    ok(typeof s.error === 'string' && !s.timeIST, `केस G: गलत इनपुट रोका गया (${label})`);
  }
  const noPlace = birthStateFor('1998-08-15', '10:30', { name: 'x', lat: NaN, lon: 75 });
  ok(typeof noPlace.error === 'string', 'केस G: बिना वैध अक्षांश के स्थिति नहीं बनती');
}

// ---------- केस H: HTML में सार्वजनिक नाम और सत्यापन-चिह्न ----------
{
  const s = birthStateFor('1998-08-15', '10:30', PLACE);
  const html = birthStateHtml(s);
  ok(html.includes(NOT_VERIFIED), 'केस H: HTML में "Data not verified" दिखता है');
  ok(html.includes('aria-label') && html.includes('role="img"'), 'केस H: टाइमलाइन में पहुँच-योग्य लेबल');
  const forbidden = ['Swiss', 'swisseph', 'NOAA', 'IMD', 'astronomy-engine', 'Open-Meteo', 'VedAstro', 'Pulippani', 'DekhoPanchang', 'Hindu-blog', 'Udaya', 'PyJHora', 'http'];
  const leaked = forbidden.filter(w => html.includes(w));
  ok(leaked.length === 0, `केस H: सार्वजनिक HTML में आंतरिक/स्रोत नाम नहीं (मिले: ${leaked.join(', ') || 'कोई नहीं'})`);
}

if (failed) console.log(`\n${failed} जाँच विफल`);
else console.log('\nसभी जाँच सफल');
