// पंचपक्षी रिग्रेशन टेस्ट (सिंथेटिक फ़िक्सचर)। यह असली व्यक्ति का डेटा नहीं है।
// सभी अपेक्षित मान tests/independent-calc.mjs की स्वतंत्र गणना से रन-टाइम पर निकाले जाते हैं।
// चलाने के लिए (रिपो के रूट से): node tests/panchapakshi-regression.test.mjs
import { moonInfo, dayTimes, fivePeriods, istToMs, fmtIST, birthBird, birthBirds } from '../src/panchapakshi-engine.js';
import { timetable, PROFILES } from '../src/panchapakshi-schedule.js';
import { independentMoon, independentSunTimes } from './independent-calc.mjs';

let failed = 0;
const ok = (cond, msg) => { console.log((cond ? 'PASS ' : 'FAIL ') + msg); if (!cond) { failed++; process.exitCode = 1; } };
const near = (a, b, tol) => Math.abs(a - b) <= tol;

// ---------- सिंथेटिक फ़िक्सचर ----------
const FIXTURE = {
  name: 'Test User', dob: '1998-08-15', time: '10:30', tz: 'Asia/Kolkata',
  place: { name: 'Jaipur, Rajasthan, India', lat: 26.9124, lon: 75.7873 }
};
const DATE = FIXTURE.dob, TIME = FIXTURE.time, PLACE = FIXTURE.place;

// ---------- 1. स्वतंत्र अपेक्षित मान ----------
const exp = independentMoon(DATE, TIME);
const indSun = independentSunTimes(DATE, PLACE.lat, PLACE.lon);
exp.bird = exp.paksha === 'शुक्ल' ? (await import('./independent-calc.mjs')).PULIPPANI_SHUKLA[exp.nakNo]
  : (await import('./independent-calc.mjs')).PULIPPANI_KRISHNA[exp.nakNo];

console.log(`फ़िक्सचर: ${FIXTURE.name}, ${DATE} ${TIME} IST, ${PLACE.name}`);
console.log(`स्वतंत्र अपेक्षित मान: नक्षत्र ${exp.nakName} (${exp.nakNo}), पाद ${exp.pada}, राशि ${exp.sign}, पक्ष ${exp.paksha}, तिथि ${exp.tithiInPaksha} (कुल ${exp.tithiNo}), जन्म-पक्षी ${exp.bird}`);
console.log(`स्वतंत्र सूर्योदय ${fmtIST(indSun.sunrise)}, सूर्यास्त ${fmtIST(indSun.sunset)} (बाहरी स्रोत से सत्यापित नहीं)`);

// ---------- 2. नक्षत्र, पाद, राशि, पक्ष, तिथि ----------
const eng = moonInfo(istToMs(DATE, TIME));
ok(eng.nakshatraNo === exp.nakNo && eng.nakshatra === exp.nakName, `नक्षत्र: ${exp.nakName} (${exp.nakNo}) — engine: ${eng.nakshatra} (${eng.nakshatraNo})`);
ok(eng.pada === exp.pada, `पाद: ${exp.pada} — engine: ${eng.pada}`);
ok(eng.sign === exp.sign, `चंद्र राशि (स्वतंत्र): ${exp.sign} — engine: ${eng.sign}`);
ok(eng.paksha === exp.paksha, `पक्ष: ${exp.paksha} — engine: ${eng.paksha}`);
ok(eng.tithiNo === exp.tithiNo && eng.tithiInPaksha === exp.tithiInPaksha, `तिथि: ${exp.tithiInPaksha} (कुल ${exp.tithiNo}) — engine: ${eng.tithiInPaksha} (कुल ${eng.tithiNo})`);
ok(near(eng.moon, exp.moon, 0.25), `चंद्र देशांतर: स्वतंत्र ${exp.moon.toFixed(3)}° बनाम engine ${eng.moon.toFixed(3)}° (सीमा 0.25°)`);
const padeStart = (exp.nakNo - 1) * (360 / 27) + (exp.pada - 1) * (360 / 108);
const dStart = exp.moon - padeStart, dEnd = padeStart + 360 / 108 - exp.moon;
if (Math.min(dStart, dEnd) > 0.5) ok(true, `पाद-सीमा से दूरी सुरक्षित: ${dStart.toFixed(2)}° और ${dEnd.toFixed(2)}°`);
else console.log(`चेतावनी: पाद-सीमा से दूरी केवल ${Math.min(dStart, dEnd).toFixed(2)}° है। पाद सीमा-संवेदी है; पक्की पुष्टि के लिए उच्च-सटीकता ephemeris चाहिए।`);
ok(eng.pada === exp.pada, `पाद दोनों तरीकों से समान (engine ${eng.pada}, स्वतंत्र ${exp.pada})`);

// ---------- 3. सूर्योदय/सूर्यास्त ----------
const dt = dayTimes(DATE, PLACE);
ok(dt && near(dt.sunrise, indSun.sunrise, 60000), `सूर्योदय: engine ${dt && fmtIST(dt.sunrise)}, स्वतंत्र ${fmtIST(indSun.sunrise)} (सीमा 1 मिनट)`);
ok(dt && near(dt.sunset, indSun.sunset, 60000), `सूर्यास्त: engine ${dt && fmtIST(dt.sunset)}, स्वतंत्र ${fmtIST(indSun.sunset)} (सीमा 1 मिनट)`);

// ---------- 4. यम-सीमाएँ, योग, गोलाई ----------
const P = fivePeriods(dt);
const dayLen = dt.sunset - dt.sunrise;
const nightLen = dt.nextSunrise - dt.sunset;
let contigDay = P.day[0][0] === dt.sunrise && P.day[4][1] === dt.sunset;
for (let i = 0; i < 4; i++) contigDay = contigDay && P.day[i][1] === P.day[i + 1][0];
let contigNight = P.night[0][0] === dt.sunset && P.night[4][1] === dt.nextSunrise;
for (let i = 0; i < 4; i++) contigNight = contigNight && P.night[i][1] === P.night[i + 1][0];
ok(contigDay, 'दिन के 5 यम: सूर्योदय से सूर्यास्त तक बिना गैप/ओवरलैप के जुड़े हैं (ms)');
ok(contigNight, 'रात के 5 यम: सूर्यास्त से अगले सूर्योदय तक बिना गैप/ओवरलैप के जुड़े हैं (ms)');
const sumDay = P.day.reduce((s, [a, b]) => s + (b - a), 0);
ok(Math.abs(sumDay - dayLen) < 1e-6, `दिन के 5 भाग का योग = दिन की अवधि (${(dayLen / 60000).toFixed(3)} मिनट)`);
const sumNight = P.night.reduce((s, [a, b]) => s + (b - a), 0);
ok(Math.abs(sumNight - nightLen) < 1e-6, `रात के 5 भाग का योग = रात की अवधि (${(nightLen / 60000).toFixed(3)} मिनट)`);
const bounds = [P.day[0][0], ...P.day.map(p => p[1])];
const nBounds = [P.night[0][0], ...P.night.map(p => p[1])];
const toMin = s => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
const sumDispDay = toMin(fmtIST(bounds[5])) - toMin(fmtIST(bounds[0]));
const sumDispNight = (toMin(fmtIST(nBounds[5])) - toMin(fmtIST(nBounds[0])) + 1440) % 1440;
ok(Math.abs(sumDispDay - dayLen / 60000) < 1, `प्रदर्शित दिन-योग ${sumDispDay} मिनट ≈ दिन ${(dayLen / 60000).toFixed(2)} मिनट`);
ok(Math.abs(sumDispNight - nightLen / 60000) < 1, `प्रदर्शित रात-योग ${sumDispNight} मिनट ≈ रात ${(nightLen / 60000).toFixed(2)} मिनट`);
ok(dt.dayMin === Math.round(dayLen / 60000) && dt.nightMin === Math.round(nightLen / 60000), `dayMin ${dt.dayMin}, nightMin ${dt.nightMin} गोलाई से मेल`);

// ---------- 5. जन्म-पक्षी ----------
ok(birthBird(eng.nakshatraNo, eng.paksha) === exp.bird, `जन्म-पक्षी (Pulippani): स्वतंत्र ${exp.bird} — engine ${birthBird(eng.nakshatraNo, eng.paksha)}`);
const bb = birthBirds(eng.nakshatraNo, eng.paksha);
const distinctBirds = new Set(bb.rows.map(r => r.bird)).size;
ok(bb.conflict === (distinctBirds > 1), `परंपराओं में मतभेद का झंडा सही: conflict = ${bb.conflict} (अलग पक्षी: ${distinctBirds})`);

// ---------- 6. गतिविधि-सारणी ----------
ok(timetable(DATE, PLACE, PROFILES['vedastro-part6-dark']).supported === false, 'कृष्ण पक्ष गतिविधि-सारणी: असमर्थित');
const tt = timetable(DATE, PLACE, PROFILES['vedastro-part5-bright']);
ok(tt.supported === true && tt.slots.length === 10, '10 यम-स्लॉट बने (दिन 5 + रात 5)');
const all10 = [...P.day, ...P.night];
let chain10 = all10[0][0] === dt.sunrise && all10[9][1] === dt.nextSunrise;
for (let i = 0; i < 9; i++) chain10 = chain10 && all10[i][1] === all10[i + 1][0];
ok(chain10, '10 यम सूर्योदय से अगले सूर्योदय तक बिना गैप/ओवरलैप के जुड़े हैं');
const cycle = dt.nextSunrise - dt.sunrise;
const sum10 = all10.reduce((s, [a, b]) => s + (b - a), 0);
ok(Math.abs(sum10 - cycle) < 1e-6, `10 यम का कुल योग = पूरा दिन-रात चक्र (${(cycle / 60000).toFixed(3)} मिनट)`);
const slotsChain = tt.slots.every((s, i) => i === 0 || tt.slots[i - 1].end === s.start);
ok(slotsChain && tt.slots[0].start === dt.sunrise && tt.slots[9].end === dt.nextSunrise, 'गतिविधि-सारणी के स्लॉट भी उसी क्रम में जुड़े हैं');

if (failed) console.log(`\n${failed} जाँच विफल`);
else console.log('\nसभी जाँच सफल');
