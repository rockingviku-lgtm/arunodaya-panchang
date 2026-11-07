// पंचपक्षी: जन्म-समय की स्थिति। पक्ष, वार, जन्म-पक्षी, यम और उस समय की गतिविधि, सूर्योदय-सूर्यास्त की सीमाओं के साथ।
// यह "अभी की स्थिति" से अलग है। जो डेटा किसी सत्यापित स्रोत से नहीं मिला, वह "Data not verified" दिखता है; कुछ अनुमानित नहीं भरा जाता।
import { istToMs, fmtIST, moonInfo, dayTimes, fivePeriods, birthBird } from './panchapakshi-engine.js';
import { BIRDS, PROFILES, timetable, weekdayOf } from './panchapakshi-schedule.js';
import { shiftDate } from './festival-calendar.js';
import { parseBirthDateISO } from './birth-date.js';

export const NOT_VERIFIED = 'Data not verified';
const WEEKDAY_HI = ['रविवार', 'सोमवार', 'मंगलवार', 'बुधवार', 'गुरुवार', 'शुक्रवार', 'शनिवार'];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pct = x => `${Math.max(0, Math.min(100, x)).toFixed(2)}%`;

// IST में ms से तारीख़ (YYYY-MM-DD)
const istDateOf = ms => new Date(ms + 330 * 60000).toISOString().slice(0, 10);

// किसी सटीक क्षण (ms, UTC) की स्थिति। सूर्योदय से पहले का समय पिछले दिन के चक्र में आता है।
export function birthStateFromMs(ms, place) {
  if (!Number.isFinite(ms)) return { error: 'जन्म-समय सही नहीं है।' };
  if (!place || !Number.isFinite(place.lat) || !Number.isFinite(place.lon)) {
    return { error: 'स्थान के अक्षांश-देशांतर उपलब्ध नहीं हैं।' };
  }
  const day = istDateOf(ms);
  let cycleDate = day;
  let dt = dayTimes(cycleDate, place);
  if (!dt) return { error: 'इस स्थान पर सूर्योदय-सूर्यास्त उपलब्ध नहीं।' };
  if (ms < dt.sunrise) {
    cycleDate = shiftDate(day, -1);
    dt = dayTimes(cycleDate, place);
    if (!dt) return { error: 'इस स्थान पर सूर्योदय-सूर्यास्त उपलब्ध नहीं।' };
  }
  if (ms < dt.sunrise || ms >= dt.nextSunrise) return { error: 'जन्म-समय इस सूर्योदय-चक्र में नहीं मिला।' };

  const mi = moonInfo(ms);
  const bird = birthBird(mi.nakshatraNo, mi.paksha) || '—';
  const per = fivePeriods(dt);
  const cycleLen = dt.nextSunrise - dt.sunrise;
  const segments = [
    ...per.day.map(([a, b], i) => ({ no: i + 1, part: 'दिन', start: a, end: b })),
    ...per.night.map(([a, b], i) => ({ no: i + 6, part: 'रात', start: a, end: b }))
  ].map(s => ({ ...s, leftPct: ((s.start - dt.sunrise) / cycleLen) * 100, widthPct: ((s.end - s.start) / cycleLen) * 100 }));
  const seg = segments.find(s => ms >= s.start && ms < s.end) || segments[segments.length - 1];

  // गतिविधि केवल तभी, जब प्रोफ़ाइल सत्यापित हो और तालिका उपलब्ध हो। अन्यथा अनुमान नहीं।
  const profile = mi.paksha === 'शुक्ल' ? PROFILES['vedastro-part5-bright'] : PROFILES['vedastro-part6-dark'];
  let activity = NOT_VERIFIED;
  if (profile.status === 'verified') {
    const tt = timetable(cycleDate, place, profile);
    const bi = BIRDS.indexOf(bird);
    if (tt.supported && bi >= 0) activity = tt.slots[seg.no - 1].activities[bi].activity;
  }

  return {
    timeIST: fmtIST(ms),
    cycleDate,
    weekday: WEEKDAY_HI[weekdayOf(cycleDate)],
    paksha: mi.paksha,
    tithiInPaksha: mi.tithiInPaksha,
    nakshatra: mi.nakshatra,
    nakshatraNo: mi.nakshatraNo,
    pada: mi.pada,
    bird,
    yama: { no: seg.no, part: seg.part, start: seg.start, end: seg.end, positionPct: ((ms - seg.start) / (seg.end - seg.start)) * 100 },
    activity,
    activityVerified: activity !== NOT_VERIFIED,
    profileLabel: profile.label,
    sunrise: dt.sunrise,
    sunset: dt.sunset,
    nextSunrise: dt.nextSunrise,
    dayMin: dt.dayMin,
    nightMin: dt.nightMin,
    segments,
    birthPct: ((ms - dt.sunrise) / cycleLen) * 100,
    sunsetPct: ((dt.sunset - dt.sunrise) / cycleLen) * 100,
    place: { name: place.name, lat: place.lat, lon: place.lon }
  };
}

// तारीख़ (YYYY-MM-DD) और समय (HH:MM, IST) से; इनपुट की जाँच के साथ
export function birthStateFor(dateInput, timeInput, place) {
  const bd = parseBirthDateISO(dateInput);
  if (!bd.ok) return { error: bd.error };
  const tm = String(timeInput || '').match(/^(\d{2}):(\d{2})$/);
  if (!tm || Number(tm[1]) > 23 || Number(tm[2]) > 59) return { error: 'जन्म समय सही भरें।' };
  return birthStateFromMs(istToMs(bd.iso, timeInput), place);
}

export const BIRTH_STATE_CSS = `
.pp-bs{border:1px solid #d0d5dd;border-radius:6px;padding:12px;margin:12px 0;background:#fffdf7;max-width:100%;box-sizing:border-box}
.pp-bs h2{font-size:16px;margin:0 0 4px}
.pp-bs-list{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.3fr);gap:6px 12px;margin:8px 0}
.pp-bs-list dt{color:#4b5563;font-size:13px}
.pp-bs-list dd{margin:0;font-weight:600;overflow-wrap:anywhere}
.pp-bs-list dd.nv{color:#9a3412;font-weight:500}
.pp-tl{position:relative;display:flex;width:100%;height:48px;border-radius:6px;overflow:hidden;margin:18px 0 4px;box-sizing:border-box}
.pp-seg{min-width:0;display:flex;align-items:center;justify-content:center;font-size:11px;color:#fff;border-right:1px solid rgba(255,255,255,.7);overflow:hidden}
.pp-seg.day{background:#c98a14}
.pp-seg.night{background:#3b4a78}
.pp-seg.on{box-shadow:inset 0 -5px 0 #fff;font-weight:700}
.pp-mark{position:absolute;top:-9px;bottom:-9px;width:3px;margin-left:-1.5px;background:#d1242f;border-radius:2px;z-index:2}
.pp-axis{position:relative;height:20px;font-size:11px;color:#4b5563;width:100%}
.pp-axis span{position:absolute;white-space:nowrap;top:0}
.pp-axis .ax-l{left:0}
.pp-axis .ax-r{right:0}
.pp-axis .ax-m{transform:translateX(-50%)}
.pp-bs-legend{font-size:12px;color:#4b5563;margin:6px 0 0}
@media (max-width:420px){
  .pp-bs{padding:10px}
  .pp-bs-list{grid-template-columns:minmax(0,1fr)}
  .pp-bs-list dd{margin-bottom:4px}
  .pp-seg{font-size:10px}
  .pp-axis{font-size:10px}
}`;

// स्क्रीन पर दिखने वाला HTML। सामर्थ्य और संबंध सत्यापित स्रोत में नहीं हैं, इसलिए दिखाए नहीं जाते।
export function birthStateHtml(s) {
  const row = (k, v, nv = false) => `<dt>${esc(k)}</dt><dd${nv ? ' class="nv"' : ''}>${esc(v)}</dd>`;
  const segs = s.segments.map(g => {
    const on = g.no === s.yama.no ? ' on' : '';
    return `<div class="pp-seg ${g.part === 'दिन' ? 'day' : 'night'}${on}" style="width:${pct(g.widthPct)}" title="यम ${g.no} (${g.part})">${g.no}</div>`;
  }).join('');
  const label = `जन्म-समय ${s.timeIST} IST, यम ${s.yama.no} (${s.yama.part}), यम में ${Math.round(s.yama.positionPct)}% पर`;
  return `<section class="pp-bs" aria-label="जन्म-समय की पंचपक्षी स्थिति">
  <h2>जन्म-समय की पंचपक्षी स्थिति</h2>
  <p class="pp-note">यह केवल जन्म-समय की गणना है। यह "अभी की स्थिति" नहीं है।</p>
  <dl class="pp-bs-list">
    ${row('जन्म-समय (IST)', s.timeIST)}
    ${row('सूर्योदय-चक्र', `${s.cycleDate} के सूर्योदय से अगले सूर्योदय तक`)}
    ${row('वार', s.weekday)}
    ${row('पक्ष और तिथि', `${s.paksha} पक्ष, तिथि ${s.tithiInPaksha}`)}
    ${row('नक्षत्र और चरण', `${s.nakshatra} (${s.nakshatraNo}), चरण ${s.pada}`)}
    ${row('जन्म-पक्षी', s.bird)}
    ${row('यम', `यम ${s.yama.no} (${s.yama.part})`)}
    ${row('यम का समय (IST)', `${fmtIST(s.yama.start)} – ${fmtIST(s.yama.end)}`)}
    ${row('गतिविधि', s.activity, !s.activityVerified)}
    ${row('सामर्थ्य और संबंध', NOT_VERIFIED, true)}
  </dl>
  <div class="pp-tl" role="img" aria-label="${esc(label)}">${segs}<div class="pp-mark" style="left:${pct(s.birthPct)}"></div></div>
  <div class="pp-axis">
    <span class="ax-l">${fmtIST(s.sunrise)}</span>
    <span class="ax-m" style="left:${pct(s.sunsetPct)}">${fmtIST(s.sunset)}</span>
    <span class="ax-r">${fmtIST(s.nextSunrise)}</span>
  </div>
  <p class="pp-bs-legend">दिन के यम 1–5 सूर्योदय से और रात के यम 6–10 सूर्यास्त से। लाल रेखा जन्म-समय है। दिन की अवधि ${Math.floor(s.dayMin / 60)} घंटे ${s.dayMin % 60} मिनट, रात की ${Math.floor(s.nightMin / 60)} घंटे ${s.nightMin % 60} मिनट।</p>
  <p class="pp-note">सूर्योदय और सूर्यास्त स्थान और तारीख़ के आधार पर स्थानीय गणना से निकाले गए हैं; किसी बाहरी स्रोत से सत्यापित नहीं हैं। समय भारतीय मानक समय (IST) में लिया गया है।</p>
  <p class="pp-note">${s.activityVerified ? 'गतिविधि सत्यापित तालिका से है।' : 'इस पक्ष की गतिविधि-तालिका सत्यापित नहीं है, इसलिए गतिविधि नहीं दिखाई गई।'} सामर्थ्य और संबंध का सत्यापित स्रोत उपलब्ध नहीं है।</p>
</section>`;
}
