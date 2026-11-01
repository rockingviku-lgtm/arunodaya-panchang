// Cloudflare Pages Function: /api/chat  (EK HI FILE - koi doosri functions file nahi chahiye)
// Secret: GEMINI_API_KEY. Optional: GEMINI_MODEL. Engines: repo ke src/ folder se.
import { getPanchangDay, getDayTimes, getFestivalsForDate, getUpcomingFestivals, moonSidereal, NAKSHATRAS } from "../../src/festival-calendar.js";
import { chaughadiya, horas, ascendantSidereal, planetaryEvents, grahaPositions, planetSign, RASHI_HI } from "../../src/graha-engine.js";
import { rashifal } from "../../src/rashifal.js";
import { findEclipses } from "../../src/eclipse-engine.js";
import { computeKundli, birthToUtc } from "../../src/kundli-doshas.js";
import { ashtakoota, verdict } from "../../src/gun-milan.js";
import { calculateVimshottariDasha } from "../../src/dasha-engine.js";
import { nameNumbers, personal, reduce } from "../../src/numerology.js";

const TZ = "Asia/Kolkata";
const MIN = 60000, DAY = 86400000;
const clock = new Intl.DateTimeFormat("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true, timeZone: TZ });
const full = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true, timeZone: TZ });
const dayKey = (d) => new Date(d.getTime() + 330 * MIN).toISOString().slice(0, 10);
const T = (d, base) => (!d ? null : (dayKey(d) === base ? "" : dayKey(d) + " ") + clock.format(d));
const F = (ms) => full.format(new Date(ms));
const span = (s, e, base) => `${T(new Date(s), base)} - ${T(new Date(e), base)}`;
const chain = (list, base) => list.map((x) => (x.end ? `${x.label} (${T(x.end, base)} तक)` : `${x.label} (अगले दिन तक)`));
const istDate = (ms = Date.now()) => new Date(ms + 330 * MIN).toISOString().slice(0, 10);
const okDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s || "") && !isNaN(Date.parse(s));
const dateOr = (s) => (okDate(s) ? s : istDate());
const noon = (iso) => Date.parse(iso + "T06:30:00Z"); // 12:00 IST

const RASHI_EN = { aries: "मेष", taurus: "वृषभ", gemini: "मिथुन", cancer: "कर्क", leo: "सिंह", virgo: "कन्या", libra: "तुला", scorpio: "वृश्चिक", sagittarius: "धनु", capricorn: "मकर", aquarius: "कुंभ", pisces: "मीन" };
const rashiIndex = (r) => {
  const s = String(r || "").trim();
  const hi = RASHI_HI.indexOf(s.replace("कुम्भ", "कुंभ"));
  if (hi >= 0) return hi;
  const en = RASHI_EN[s.toLowerCase()];
  return en ? RASHI_HI.indexOf(en) : -1;
};

const needCity = { error: "शहर का नाम चाहिए" };
const notFound = { error: "यह शहर इंजन में नहीं मिला", search: true };

// ---------- 1. पंचांग ----------
function panchang(place, dateISO) {
  const p = getPanchangDay(dateISO, place), t = getDayTimes(dateISO, place), c = chaughadiya(dateISO, place);
  const b = p.date || dateISO;
  const ch = (arr) => arr.map((x) => `${x.name} ${x.good ? "(शुभ)" : "(अशुभ)"} ${span(x.start, x.end, b)}`);
  return {
    sthan: place.name, tareekh: dateISO, vaar: p.weekday, paksha: p.paksha,
    suryoday_suryast: `${T(p.sunrise, b)} / ${T(p.sunset, b)}`, chandroday_chandrast: `${T(p.moonrise, b)} / ${T(p.moonset, b)}`,
    tithi: chain(p.tithis, b), nakshatra: chain(p.nakshatras, b), yog: chain(p.yogas, b), karan: chain(p.karanas, b), chandra_rashi: chain(p.moonRashi, b),
    maas: `अमांत ${p.amantaMonth} · पूर्णिमांत ${p.purnimantaMonth}`, sooryarashi: p.sunRashi, samvat: `विक्रम ${p.vikramSamvat} · शक ${p.shakaSamvat}`,
    rahukaal: t && span(t.rahu.start, t.rahu.end, b), yamganda: t && span(t.yama.start, t.yama.end, b), gulika: t && span(t.gulika.start, t.gulika.end, b),
    abhijit: t && span(t.abhijit.start, t.abhijit.end, b), brahma_muhurat: t && span(t.brahma.start, t.brahma.end, b),
    choghadiya_din: ch(c.day), choghadiya_raat: ch(c.night),
    vrat_tyohar: getFestivalsForDate(dateISO, place).map((x) => x.name + (x.tithiLabel ? ` (${x.tithiLabel})` : "")),
  };
}

// ---------- 2. पंचक और भद्रा ----------
function panchakBhadra(place, dateISO) {
  const inP = (ms) => moonSidereal(ms) >= 300; // कुंभ-मीन = पंचक
  const t0 = noon(dateISO), step = 30 * MIN;
  let s = t0, e = t0;
  if (inP(t0)) { while (inP(s - step) && t0 - s < 8 * DAY) s -= step; while (inP(e + step) && e - t0 < 8 * DAY) e += step; }
  const out = { sthan: place.name, tareekh: dateISO };
  if (inP(t0)) out.panchak = `चल रहा है (लगभग ${F(s)} से ${F(e)} तक)`;
  else { let n = t0; while (!inP(n) && n - t0 < 40 * DAY) n += step; let m = n; while (inP(m + step)) m += step; out.panchak = `इस दिन नहीं; अगला लगभग ${F(n)} से ${F(m)} तक`; }
  const p = getPanchangDay(dateISO, place), b = p.date || dateISO;
  let prev = p.start;
  const bh = [];
  for (const k of p.karanas) {
    const end = k.end || p.end;
    if (String(k.label).includes("विष्टि")) bh.push(span(prev.getTime(), end.getTime(), b));
    prev = end;
  }
  out.bhadra = bh.length ? bh : "इस दिन (सूर्योदय से सूर्योदय) भद्रा/विष्टि करण नहीं है";
  return out;
}

// ---------- 3. होरा ----------
function horaTable(place, dateISO) {
  const b = dateISO;
  return { sthan: place.name, tareekh: dateISO, hora: horas(dateISO, place).map((h) => `${h.lord} ${span(h.start, h.end, b)}${h.night ? " (रात)" : ""}`) };
}

// ---------- 4. लग्न (उस दिन के लग्न-परिवर्तन) ----------
function lagnaDay(place, dateISO) {
  const start = Date.parse(dateISO + "T00:00:00Z") - 330 * MIN, out = [];
  let cur = Math.floor(ascendantSidereal(start, place.lat, place.lon) / 30), from = start;
  for (let t = start + 2 * MIN; t <= start + DAY; t += 2 * MIN) {
    const l = Math.floor(ascendantSidereal(t, place.lat, place.lon) / 30);
    if (l !== cur) { out.push(`${RASHI_HI[cur]} लग्न: ${span(from, t, dateISO)}`); cur = l; from = t; }
  }
  out.push(`${RASHI_HI[cur]} लग्न: ${span(from, start + DAY, dateISO)}`);
  return { sthan: place.name, tareekh: dateISO, lagna_ka_samay: out };
}

// ---------- 5. व्रत-त्योहार ----------
function festivals(fromISO, days) {
  const n = Math.min(Math.max(parseInt(days) || 30, 1), 120);
  return {
    se: fromISO, dino_tak: n,
    suchi: getUpcomingFestivals(fromISO, n, undefined, { includeStart: true }).slice(0, 25)
      .map((d) => `${d.date} (${d.weekday}): ` + d.items.map((x) => x.name + (x.tithiLabel ? ` [${x.tithiLabel}]` : "")).join(", ")),
  };
}

// ---------- 6. राशिफल / साढ़ेसाती-ढैया ----------
function rashifalTool(args) {
  const idx = rashiIndex(args.rashi);
  if (idx < 0) return { error: "राशि का नाम समझ नहीं आया (मेष, वृषभ, मिथुन, कर्क, सिंह, कन्या, तुला, वृश्चिक, धनु, मकर, कुंभ, मीन)" };
  const kind = { day: "day", week: "week", month: "month", year: "year" }[args.period] || "day";
  const iso = dateOr(args.date), r = rashifal(kind, iso), s = r.signs[idx];
  const out = {
    rashi: s.name, avadhi: kind, tareekh: iso,
    sitare_1_se_5: { samanya: s.stars.overall, career: s.stars.career, dhan: s.stars.money, prem: s.stars.love, swasthya: s.stars.health },
    shubh_ank: s.lucky.num, shubh_rang: s.lucky.color,
    sade_sati_dhaiya: s.notes.length ? s.notes : "इस अवधि में साढ़ेसाती या ढैया नहीं",
  };
  if (kind === "day") out.grah_prabhav = s.influences.slice(0, 9).map((i) => `${i.label} — ${i.fav ? "अनुकूल" : "कमज़ोर"}`);
  else out.grah_charan = (s.rows || []).slice(0, 10).map((x) => x.label);
  if (kind === "week" && s.dayRows) out.din_wise = s.dayRows.map((d) => `${d.iso}: ${d.stars.overall}★`);
  if (kind === "month" && s.weekRows) out.hafte_wise = s.weekRows.map((w) => `${w.from}..${w.to}: ${w.stars.overall}★`);
  return out;
}

// ---------- 7. ग्रहण ----------
const KIND_HI = { total: "पूर्ण", annular: "वलयाकार", partial: "आंशिक", penumbral: "उपछाया", hybrid: "संकर" };
function eclipses(place, fromISO, months) {
  const m = Math.min(Math.max(parseInt(months) || 24, 1), 60), from = Date.parse(fromISO + "T00:00:00Z");
  return {
    sthan: place.name,
    grahan: findEclipses(from, from + m * 30 * DAY, place).slice(0, 8).map((e) => {
      const pts = Object.values(e.vis?.pts || {}).filter((x) => typeof x === "number");
      const vis = e.vis?.seen ? `${place.name} में दिखेगा (${F(Math.min(...pts))} से ${F(Math.max(...pts))})` : `${place.name} में नहीं दिखेगा`;
      return `${e.type === "solar" ? "सूर्य" : "चंद्र"} ग्रहण (${KIND_HI[e.kind] || e.kind}), मध्य ${F(e.max)}; ${vis}`;
    }),
  };
}

// ---------- 8. ग्रह-घटनाएँ और ग्रह-स्थिति ----------
function grahaEvents(days) {
  const now = Date.now(), n = Math.min(Math.max(parseInt(days) || 30, 1), 120), pos = grahaPositions(now);
  return {
    aaj_grah_sthiti: Object.values(pos).map((g) => `${g.name}: ${g.rashi} ${g.deg.toFixed(1)}° ${g.nakshatra}${g.retro ? " (वक्री)" : ""}`),
    aane_wali_ghatnayen: planetaryEvents(now, n, 12).map((e) => `${F(e.ms)}: ${e.text}`),
  };
}

// ---------- 9. कुंडली, दोष, दशा ----------
async function birth(p, geo) {
  if (!p || !okDate(p.dob)) throw new Error("जन्म तारीख़ (YYYY-MM-DD) चाहिए");
  if (!p.city) throw new Error("जन्म स्थान (शहर) चाहिए");
  const time = /^\d{1,2}:\d{2}$/.test(p.time || "") ? p.time.padStart(5, "0") : "12:00";
  const pl = await geo(p.city, { world: true });
  if (!pl) throw new Error("जन्म स्थान नहीं मिला");
  const ms = birthToUtc(p.dob, time, pl.tz || "Asia/Kolkata");
  return { k: computeKundli({ ms, lat: pl.lat, lon: pl.lon }), ms, pl, time };
}
async function kundli(p, geo) {
  const { k, ms, pl, time } = await birth(p, geo);
  const moon = k.rows.find((r) => r.key === "moon");
  const d = calculateVimshottariDasha(k.pos.moon.lon, ms, new Date());
  const dt = (x) => (x ? F(x.end) : "—");
  return {
    janm: `${p.dob} ${time}, ${pl.name}`, lagna: RASHI_HI[k.lagna], chandra_rashi: moon.rashi, nakshatra: `${moon.nakshatra} (चरण ${moon.pada})`,
    grah: k.rows.map((r) => `${r.name}: ${r.rashi}, ${r.bhava ? r.bhava + "वाँ भाव" : "लग्न"}${r.retro ? ", वक्री" : ""}${r.dignity ? ", " + r.dignity : ""}`),
    dosh: k.doshas.map((x) => `${x.name}: ${x.present ? (x.level || "है") : "नहीं"} — ${x.detail}`),
    yog: k.yogas.slice(0, 8).map((y) => `${y.name} — ${y.why}`),
    dasha: d.ok ? `महादशा ${d.currentMaha?.lord} (${dt(d.currentMaha)} तक), अंतर्दशा ${d.currentAntar?.lord} (${dt(d.currentAntar)} तक)` : "उपलब्ध नहीं",
  };
}
async function milan(g, b, geo) {
  const [kg, kb] = await Promise.all([birth(g, geo), birth(b, geo)]);
  const person = (x) => { const m = x.k.rows.find((r) => r.key === "moon"); return { rashi: RASHI_HI.indexOf(m.rashi), nak: NAKSHATRAS.indexOf(m.nakshatra), deg: m.deg, pada: m.pada }; };
  const pg = person(kg), pb = person(kb), r = ashtakoota(pg, pb);
  const mg = kg.k.doshas.find((x) => x.key === "mangal"), mb = kb.k.doshas.find((x) => x.key === "mangal");
  return {
    var: `${RASHI_HI[pg.rashi]} राशि, ${NAKSHATRAS[pg.nak]}`, vadhu: `${RASHI_HI[pb.rashi]} राशि, ${NAKSHATRAS[pb.nak]}`,
    koota: r.rows.map((x) => `${x.koota}: ${x.got}/${x.max}`), kul_gun: `${r.total}/36`, nirnay: verdict(r.total).text,
    dosh: r.doshas.length ? r.doshas.map((x) => `${x.name} — ${x.note}`) : "नाड़ी, भकूट, गण में कोई दोष नहीं",
    mangal_dosh: `वर: ${mg?.present ? mg.level || "है" : "नहीं"}; वधू: ${mb?.present ? mb.level || "है" : "नहीं"}`,
  };
}

// ---------- 10. अंक ज्योतिष ----------
function numerology(args) {
  const out = {};
  if (args.name) { const n = nameNumbers(String(args.name).slice(0, 60)); out.naam = { roman: n.roman, chaldean: n.chaldean, pythagorean: n.pyth, aatma_ank: n.soul, vyaktitva_ank: n.persona }; }
  if (okDate(args.dob)) {
    const [y, m, d] = args.dob.split("-").map(Number), p = personal(args.dob, istDate());
    out.mulank = reduce(d); out.bhagyank = reduce([...args.dob.replace(/-/g, "")].reduce((s, c) => s + +c, 0));
    out.aaj_ka_vyaktigat_varsh_maah_din = `वर्ष ${p.py}, माह ${p.pm}, दिन ${p.pd}`;
  }
  return Object.keys(out).length ? out : { error: "नाम या जन्म तारीख़ चाहिए" };
}

// ---------- घोषणाएँ ----------
const S = (description) => ({ type: "STRING", description });
const CITY = S("भारत का शहर, जैसे Lucknow, Delhi, लखनऊ");
const DATE = S("YYYY-MM-DD। खाली छोड़ने पर आज (IST)");
const RASHI = S("राशि: मेष, वृषभ, मिथुन, कर्क, सिंह, कन्या, तुला, वृश्चिक, धनु, मकर, कुंभ, मीन");
const BIRTH = { type: "OBJECT", properties: { dob: S("जन्म तारीख़ YYYY-MM-DD"), time: S("जन्म समय HH:MM (24 घंटे); पता न हो तो 12:00"), city: S("जन्म स्थान का शहर") }, required: ["dob", "city"] };
const fn = (name, description, properties, required = []) => ({ name, description, parameters: { type: "OBJECT", properties, required } });

const TOOLS = [
  fn("get_panchang", "शहर और तारीख़ का दैनिक पंचांग: तिथि, नक्षत्र, योग, करण, सूर्योदय-सूर्यास्त, चंद्रोदय, राहुकाल, यमगंड, गुलिक, अभिजीत, ब्रह्म मुहूर्त, चौघड़िया (दिन-रात), उस दिन के व्रत-त्योहार।", { city: CITY, date: DATE }, ["city"]),
  fn("get_panchak_bhadra", "पंचक और भद्रा (विष्टि करण) की स्थिति।", { city: CITY, date: DATE }, ["city"]),
  fn("get_hora", "दिन-रात के 24 होरा।", { city: CITY, date: DATE }, ["city"]),
  fn("get_lagna", "उस दिन के लग्न-परिवर्तन का समय।", { city: CITY, date: DATE }, ["city"]),
  fn("get_festivals", "आने वाले व्रत और त्योहार की सूची।", { from_date: DATE, days: { type: "INTEGER", description: "कितने दिन आगे तक, 1-120, डिफ़ॉल्ट 30" } }),
  fn("get_rashifal", "राशिफल (दैनिक/साप्ताहिक/मासिक/वार्षिक) और उस राशि की साढ़ेसाती-ढैया की स्थिति।", { rashi: RASHI, period: S("day, week, month या year"), date: DATE }, ["rashi"]),
  fn("get_sade_sati", "किसी राशि पर साढ़ेसाती या ढैया चल रही है या नहीं, चरण और तारीख़ों के साथ।", { rashi: RASHI, date: DATE }, ["rashi"]),
  fn("get_eclipses", "आने वाले सूर्य और चंद्र ग्रहण, और वे शहर में दिखेंगे या नहीं।", { city: CITY, from_date: DATE, months: { type: "INTEGER", description: "कितने महीने आगे तक, डिफ़ॉल्ट 24" } }, ["city"]),
  fn("get_graha_events", "आज की नवग्रह स्थिति और आने वाली ग्रह-घटनाएँ (राशि परिवर्तन, युति, नक्षत्र परिवर्तन)।", { days: { type: "INTEGER", description: "कितने दिन आगे तक, डिफ़ॉल्ट 30" } }),
  fn("get_kundli", "जन्म-विवरण से कुंडली: लग्न, राशि, नक्षत्र, ग्रह-भाव, मंगल दोष, काल सर्प दोष, पितृ दोष, साढ़ेसाती, ढैया, योग, वर्तमान दशा। जन्म तारीख़ और शहर ज़रूरी।", { birth: BIRTH }, ["birth"]),
  fn("get_kundli_milan", "वर और वधू के जन्म-विवरण से अष्टकूट गुण मिलान (36 में), नाड़ी/भकूट/गण दोष और मंगल दोष।", { groom: BIRTH, bride: BIRTH }, ["groom", "bride"]),
  fn("get_numerology", "अंक ज्योतिष: नाम के अंक और जन्म तारीख़ से मूलांक, भाग्यांक, आज का व्यक्तिगत अंक।", { name: S("पूरा नाम (वैकल्पिक)"), dob: S("जन्म तारीख़ YYYY-MM-DD (वैकल्पिक)") }),
];

async function runTool(name, a = {}, geo) {
  try {
    const city = String(a.city || "").trim().slice(0, 80);
    const place = async () => (city ? await geo(city, {}) : undefined);
    switch (name) {
      case "get_panchang": case "get_panchak_bhadra": case "get_hora": case "get_lagna": case "get_eclipses": {
        if (!city) return needCity;
        const pl = await place(); if (!pl) return notFound;
        const d = dateOr(name === "get_eclipses" ? a.from_date : a.date);
        if (name === "get_panchang") return panchang(pl, d);
        if (name === "get_panchak_bhadra") return panchakBhadra(pl, d);
        if (name === "get_hora") return horaTable(pl, d);
        if (name === "get_lagna") return lagnaDay(pl, d);
        return eclipses(pl, d, a.months);
      }
      case "get_festivals": return festivals(dateOr(a.from_date), a.days);
      case "get_rashifal": return rashifalTool(a);
      case "get_sade_sati": {
        const r = rashifalTool({ rashi: a.rashi, period: "day", date: a.date });
        if (r.error) return r;
        return { rashi: r.rashi, shani_abhi: RASHI_HI[planetSign("saturn", Date.now())] + " में", sthiti: r.sade_sati_dhaiya };
      }
      case "get_graha_events": return grahaEvents(a.days);
      case "get_kundli": return await kundli(a.birth, geo);
      case "get_kundli_milan": return await milan(a.groom, a.bride, geo);
      case "get_numerology": return numerology(a);
      default: return { error: "अज्ञात टूल" };
    }
  } catch (e) {
    return { error: String(e?.message || "गणना नहीं हो सकी").slice(0, 120) };
  }
}

// Cloudflare Pages Function: /api/chat
// Secret: GEMINI_API_KEY (Cloudflare me Secret ke roop me). Optional: GEMINI_MODEL
// Kram: (1) site ke apne engines (../_site-tools.js), (2) shehar na mile to Google Search.

const SYSTEM = `आप "अरुणोदय सहायक" हैं, Arunodaya Panchang वेबसाइट (परंपरा और तकनीक का संगम) के सहायक।
आप विज़िटर्स को साइट की सेवाओं के बारे में बताते हैं और सही पेज तक पहुँचने में मदद करते हैं।

साइट की सेवाएँ और पेज:
- दैनिक पंचांग: रोज़ की तिथि, नक्षत्र, योग, करण और वार
- आने वाली ग्रह-घटनाएँ
- लग्न कुंडली
- व्रत और त्योहार
- राशिफल
- चौघड़िया
- होरा
- नाड़ी दोष, भकूट दोष, ग्रह मैत्री, गण मिलान (कुंडली मिलान)
- मंगल दोष
- काल सर्प दोष
- साढ़ेसाती और ढैया
- शुभ कार्य मुहूर्त
- सूर्य-चंद्र ग्रहण
- पंचक और भद्रा
- सूर्योदय-चंद्रोदय तालिका
- मुख्य मेन्यू: होम, पंचांग, कैलेंडर, मुहूर्त, कुंडली
- अन्य पेज: हमारे बारे में, संपर्क करें, सेवाएँ, गोपनीयता नीति, अस्वीकरण, नियम व शर्तें, कुकीज़ नीति

नियम:
1. हिंदी (देवनागरी) में जवाब दें। विज़िटर अंग्रेज़ी या हिंग्लिश में लिखे तो उसी में जवाब दें।
2. जवाब छोटे रखें (3-6 वाक्य या छोटी सूची)।
3. साइट की हर सेवा का डेटा (पंचांग, चौघड़िया, राहुकाल, मुहूर्त, पंचक-भद्रा, होरा, लग्न, व्रत-त्योहार, राशिफल, साढ़ेसाती-ढैया, ग्रहण, ग्रह-घटनाएँ, कुंडली, दोष, दशा, कुंडली मिलान, अंक ज्योतिष) आपके टूल से ही लें। याददाश्त या अंदाज़े से तिथि, समय, अंक या फल कभी न बताएँ। तारीख़ न बताई हो तो आज की तारीख़ लें। शहर ज़रूरी हो और न बताया हो तो पहले शहर पूछें। कुंडली के लिए जन्म तारीख़, जन्म समय और जन्म स्थान चाहिए। मिलान के लिए वर और वधू दोनों का यही विवरण चाहिए। जो जानकारी कम हो, वही पूछें। जवाब में सिर्फ़ वही बताएँ जो पूछा गया हो, पूरा डेटा न उगलें। समय 12-घंटे वाले रूप में, AM/PM के साथ लिखें। व्यक्तिगत विवरण (जन्म तारीख़ आदि) सिर्फ़ गणना के लिए इस्तेमाल करें, उसे दोहराकर लंबा न करें।
4. पंचांग, दोष, मुहूर्त और ज्योतिष की सामान्य अवधारणाएँ आप समझा सकते हैं (जैसे मंगल दोष क्या है, चौघड़िया क्या है)।
5. साइट पर जो सेवा ऊपर सूची में नहीं है, उसके बारे में अंदाज़ा न लगाएँ। कीमत, बुकिंग या पंडित से परामर्श जैसी बातों के लिए "संपर्क करें" पेज बताएँ।
6. ज्योतिषीय बातें मार्गदर्शन हैं, गारंटी नहीं। चिकित्सा, कानूनी या वित्तीय फ़ैसलों के लिए ज्योतिष को आधार बनाने की सलाह न दें।
7. साइट से असंबंधित विषयों पर विनम्रता से बताएँ कि आप पंचांग और ज्योतिष सेवाओं में मदद करते हैं।
8. जवाब में ** या # जैसे मार्कडाउन चिह्न न लिखें। सादा टेक्स्ट लिखें, सूची के लिए "-" इस्तेमाल करें।
9. जवाब के अंत में एक वाक्य में बताएँ कि पूरा विवरण साइट के संबंधित पेज (जैसे "दैनिक पंचांग", "कुंडली", "राशिफल") पर देख सकते हैं।`;
const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json; charset=utf-8" } });


// opts.world=true: duniya ka koi bhi shehar (janm sthan ke liye); warna sirf Bharat (site ka engine IST me hai)
async function geocode(city, opts = {}) {
  const url = "https://geocoding-api.open-meteo.com/v1/search?count=1&format=json&language=en" + (opts.world ? "" : "&countryCode=IN") + "&name=" + encodeURIComponent(city);
  const r = await fetch(url);
  if (!r.ok) return null;
  const x = (await r.json()).results?.[0];
  return x ? { name: [x.name, x.admin1].filter(Boolean).join(", "), lat: x.latitude, lon: x.longitude, tz: x.timezone } : null;
}

async function gemini(env, body) {
  const model = env.GEMINI_MODEL || "gemini-3.1-flash-lite";
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": env.GEMINI_API_KEY },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error("upstream " + r.status);
  return r.json();
}

const textOf = (data) =>
  (data.candidates?.[0]?.content?.parts || []).map((p) => p.text || "").join("").replace(/\*\*/g, "").replace(/^#+\s*/gm, "").trim();

export async function onRequestPost({ request, env }) {
  let messages;
  try { ({ messages } = await request.json()); } catch { return json({ error: "bad request" }, 400); }
  if (!Array.isArray(messages) || !messages.length) return json({ error: "no messages" }, 400);

  const clean = messages.slice(-12)
    .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .map((m) => ({ role: m.role, content: m.content.slice(0, 1000) }));
  const base = clean.map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] }));
  while (base.length && base[0].role !== "user") base.shift();
  if (!base.length) return json({ error: "no user message" }, 400);

  const today = new Date().toLocaleDateString("hi-IN", { timeZone: "Asia/Kolkata", weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const sys = (extra = "") => ({ parts: [{ text: `${SYSTEM}\n\nआज की तारीख़ (भारत): ${today} (${istDate()})${extra}` }] });
  const cfg = { maxOutputTokens: 900, temperature: 0.3 };

  try {
    // Charan 1: site ke apne engines (function calling)
    const contents = [...base];
    let needSearch = false;
    for (let i = 0; i < 4; i++) {
      const data = await gemini(env, { systemInstruction: sys(), contents, tools: [{ functionDeclarations: TOOLS }], generationConfig: cfg });
      const content = data.candidates?.[0]?.content;
      const calls = (content?.parts || []).filter((p) => p.functionCall);
      if (!calls.length) {
        const reply = textOf(data);
        if (reply) return json({ reply });
        break;
      }
      contents.push(content);
      const responses = [];
      for (const c of calls.slice(0, 3)) {
        const result = await runTool(c.functionCall.name, c.functionCall.args, geocode);
        if (result.search) needSearch = true;
        responses.push({ functionResponse: { name: c.functionCall.name, response: { result } } });
      }
      contents.push({ role: "user", parts: responses });
      if (needSearch) break;
    }

    // Charan 2: shehar site ke engine me nahi mila -> Google Search
    if (needSearch) {
      const data = await gemini(env, {
        systemInstruction: sys("\n\nसाइट के अपने इंजन में यह शहर नहीं मिला। अब वेब सर्च से जवाब दें, भरोसेमंद स्रोत से, और साफ़ बताएँ कि यह जानकारी साइट की गणना से नहीं, इंटरनेट से ली गई है। भरोसेमंद जानकारी न मिले तो साफ़ कहें।"),
        contents: base,
        tools: [{ google_search: {} }],
        generationConfig: cfg,
      });
      const reply = textOf(data);
      if (reply) return json({ reply });
    }
    return json({ reply: "माफ़ कीजिए, अभी जवाब नहीं मिल पाया। कृपया शहर और तारीख़ लिखकर दोबारा पूछें, या साइट के संबंधित पेज देखें।" });
  } catch (e) {
    return json({ error: "upstream" }, 502);
  }
}
