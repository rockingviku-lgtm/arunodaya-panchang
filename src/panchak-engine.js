/**
 * Arunodaya Panchang calculation engine.
 * Sidereal Sun/Moon positions use @swisseph/browser with Lahiri ayanamsha.
 */
import { SwissEphemeris, Planet, SiderealMode } from "@swisseph/browser";

const NAKSHATRAS = ["अश्विनी","भरणी","कृत्तिका","रोहिणी","मृगशिरा","आर्द्रा","पुनर्वसु","पुष्य","आश्लेषा","मघा","पूर्वा फाल्गुनी","उत्तरा फाल्गुनी","हस्त","चित्रा","स्वाती","विशाखा","अनुराधा","ज्येष्ठा","मूल","पूर्वाषाढ़ा","उत्तराषाढ़ा","श्रवण","धनिष्ठा","शतभिषा","पूर्वाभाद्रपद","उत्तराभाद्रपद","रेवती"];
const YOGAS = ["विष्कुम्भ","प्रीति","आयुष्मान","सौभाग्य","शोभन","अतिगण्ड","सुकर्मा","धृति","शूल","गण्ड","वृद्धि","ध्रुव","व्याघात","हर्षण","वज्र","सिद्धि","व्यतीपात","वरीयान","परिघ","शिव","सिद्ध","साध्य","शुभ","शुक्ल","ब्रह्म","इन्द्र","वैधृति"];
const TITHIS = ["प्रतिपदा","द्वितीया","तृतीया","चतुर्थी","पञ्चमी","षष्ठी","सप्तमी","अष्टमी","नवमी","दशमी","एकादशी","द्वादशी","त्रयोदशी","चतुर्दशी","पूर्णिमा"];
const KARANAS_MOVABLE = ["बव","बालव","कौलव","तैतिल","गर","वणिज","विष्टि"];
const WEEKDAYS = ["रविवार","सोमवार","मंगलवार","बुधवार","गुरुवार","शुक्रवार","शनिवार"];
const NAK_SPAN = 360 / 27;

const PANCHAK_START = 300; // धनिष्ठा का तीसरा चरण

function isPanchakLongitude(moonLongitude) {
  return norm(moonLongitude) >= PANCHAK_START;
}

const norm = x => ((x % 360) + 360) % 360;
let swePromise;
async function getSwe() {
  if (!swePromise) swePromise = (async () => { const swe = new SwissEphemeris(); await swe.init(); swe.setSiderealMode(SiderealMode.Lahiri); return swe; })();
  return swePromise;
}
function localDateToUtc(dateText, offsetMinutes) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateText || "")) throw new Error("कृपया सही तारीख चुनें।");
  const [y,m,d] = dateText.split("-").map(Number);
  const check = new Date(Date.UTC(y,m-1,d));
  if (check.getUTCFullYear() !== y || check.getUTCMonth() !== m-1 || check.getUTCDate() !== d) throw new Error("तारीख मान्य नहीं है।");
  return new Date(Date.UTC(y,m-1,d) - offsetMinutes*60000);
}
function fmtTime(date, offsetMinutes) {
  if (!date) return "उपलब्ध नहीं";
  const d = new Date(date.getTime() + offsetMinutes*60000);
  return `${String(d.getUTCHours()).padStart(2,"0")}:${String(d.getUTCMinutes()).padStart(2,"0")}`;
}
function fmtDateTime(date, offsetMinutes) {
  if (!date) return "नहीं मिला";
  const d = new Date(date.getTime() + offsetMinutes*60000);
  return `${String(d.getUTCDate()).padStart(2,"0")}-${String(d.getUTCMonth()+1).padStart(2,"0")}-${d.getUTCFullYear()} ${fmtTime(date,offsetMinutes)}`;
}
function sunEventUtc(dateText, lat, lon, rise, offsetMinutes) {
  // NOAA sunrise equation; zenith 90.833° accounts for standard refraction and solar radius.
  const [year, month, day] = dateText.split("-").map(Number);
  const dayOfYear = Math.floor((Date.UTC(year,month-1,day)-Date.UTC(year,0,0))/86400000);
  const lngHour = lon / 15;
  const t = dayOfYear + ((rise ? 6 : 18) - lngHour) / 24;
  const M = 0.9856*t - 3.289;
  let L = M + 1.916*Math.sin(M*Math.PI/180) + 0.020*Math.sin(2*M*Math.PI/180) + 282.634;
  L = ((L%360)+360)%360;
  let RA = Math.atan(0.91764*Math.tan(L*Math.PI/180))*180/Math.PI;
  RA = ((RA%360)+360)%360;
  RA += Math.floor(L/90)*90 - Math.floor(RA/90)*90;
  RA /= 15;
  const sinDec = 0.39782*Math.sin(L*Math.PI/180);
  const cosDec = Math.cos(Math.asin(sinDec));
  const cosH = (Math.cos(90.833*Math.PI/180) - sinDec*Math.sin(lat*Math.PI/180))/(cosDec*Math.cos(lat*Math.PI/180));
  if (cosH > 1 || cosH < -1) return null;
  const H = (rise ? 360-Math.acos(cosH)*180/Math.PI : Math.acos(cosH)*180/Math.PI)/15;
  const T = H + RA - 0.06571*t - 6.622;
  let UT = ((T-lngHour)%24+24)%24;
  // Convert UT hour to UTC instant on requested Gregorian date; normalize around midnight.
  const utcMidnight = Date.UTC(year,month-1,day);
  let candidate = new Date(utcMidnight + UT*3600000);
  const localCandidate = candidate.getTime()+offsetMinutes*60000;
  const localDayStart = Date.UTC(year,month-1,day);
  if (localCandidate < localDayStart-12*3600000) candidate = new Date(candidate.getTime()+86400000);
  if (localCandidate > localDayStart+36*3600000) candidate = new Date(candidate.getTime()-86400000);
  return candidate;
}

function parseImdTime(dateText, timeText, offsetMinutes) {
  if (typeof timeText !== "string" || !/^\d{2}:\d{2}$/.test(timeText)) {
    return null;
  }

  const [year, month, day] = dateText.split("-").map(Number);
  const [hour, minute] = timeText.split(":").map(Number);

  if (hour > 23 || minute > 59) return null;

  return new Date(
    Date.UTC(year, month - 1, day, hour, minute) -
      offsetMinutes * 60000
  );
}


async function getSunTimes(dateText, lat, lon, offsetMinutes) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date());

  const part = type => parts.find(p => p.type === type)?.value;
  const todayIndia =
    `${part("year")}-${part("month")}-${part("day")}`;

  let imdFailure = "आज की तारीख नहीं है";

  if (dateText === todayIndia) {
    try {
      const url = new URL("https://api.imd.gov.in/api/v1/sunmoon");
      url.searchParams.set("lat", String(lat));
      url.searchParams.set("lon", String(lon));

      const response = await fetch(url.toString(), {
        headers: { Accept: "application/json" }
      });

      if (!response.ok) {
        imdFailure = `IMD HTTP ${response.status}`;
      } else {
        const payload = await response.json();
        const rows = Array.isArray(payload?.data)
          ? payload.data : [];

        const sun = rows.find(row =>
          typeof row?.sunrise === "string" &&
          typeof row?.sunset === "string"
        );

        const sunrise = parseImdTime(
          dateText, sun?.sunrise, offsetMinutes
        );
        const sunset = parseImdTime(
          dateText, sun?.sunset, offsetMinutes
        );

        if (payload?.status === true &&
            sunrise && sunset && sunset > sunrise) {
          return {
            sunrise,
            sunset,
            source: "स्थानीय सूर्योदय-सूर्यास्त गणना"
          };
        }

        imdFailure = "IMD डेटा का प्रारूप या समय अमान्य है";
      }
    } catch (error) {
      imdFailure = `IMD अनुरोध विफल: ${
        error?.message || "नेटवर्क/CORS त्रुटि"
      }`;
    }
    }

  return {
    sunrise: sunEventUtc(
      dateText, lat, lon, true, offsetMinutes
    ),
    sunset: sunEventUtc(
      dateText, lat, lon, false, offsetMinutes
    ),
    source: "स्थानीय सूर्योदय-सूर्यास्त गणना",
    diagnostic: imdFailure
  };
}
            
function positionAt(swe, date) {
  const jd = swe.dateToJulianDay(date);
  const ayan = swe.getAyanamsa(jd);
  const sunTropical = swe.calculatePosition(jd, Planet.Sun).longitude;
  const moonTropical = swe.calculatePosition(jd, Planet.Moon).longitude;
  return { sun: norm(sunTropical-ayan), moon: norm(moonTropical-ayan), elongation: norm(moonTropical-sunTropical), ayanamsa: ayan };
}
function tithiInfo(elongation) {
  const n = Math.floor(norm(elongation)/12);
  const paksha = n < 15 ? "शुक्ल पक्ष" : "कृष्ण पक्ष";
  const day = n%15;
  const name = day===14 ? (n<15 ? "पूर्णिमा" : "अमावस्या") : TITHIS[day];
  return { name, paksha, index:n, boundary:(n+1)*12 };
}
function nakInfo(lon) { const x=norm(lon), index=Math.floor(x/NAK_SPAN), f=(x-index*NAK_SPAN)/NAK_SPAN; return {name:NAKSHATRAS[index],index,pada:Math.min(4,Math.floor(f*4)+1),fraction:f}; }
function yogaInfo(sun, moon) { const index=Math.floor(norm(sun+moon)/NAK_SPAN); return {name:YOGAS[index],index}; }
function karanaName(halfIndex) {
  if (halfIndex===0) return "किंस्तुघ्न";
  if (halfIndex>=57) return ["शकुनि","चतुष्पद","नाग"][halfIndex-57];
  return KARANAS_MOVABLE[(halfIndex-1)%7];
}
function karanaInfo(elongation) { const i=Math.floor(norm(elongation)/6); return {name:karanaName(i),index:i}; }
function findBoundary(swe, start, end, getter, target, stepDirection=1) {
  let lo=start.getTime(), hi=end.getTime();
  const startValue=norm(getter(new Date(lo)));
  const targetUnwrapped = target;
  for(let i=0;i<42;i++) {
    const mid=(lo+hi)/2, v=norm(getter(new Date(mid)));
    // Determine whether the moving angle has passed the target, accounting for wrap at 360.
    const passed = stepDirection>0 ? (v < startValue ? true : v >= targetUnwrapped) : (v > startValue ? true : v < targetUnwrapped);
    if (passed) hi=mid; else lo=mid;
  }
  return new Date((lo+hi)/2);
}
function nextTransition(swe, start, angleGetter, span, maxHours=40) {
  const value0=norm(angleGetter(start));
  const boundary=(Math.floor(value0/span)+1)*span;
  let prev=start, prevU=value0;
  for(let ms=30*60000; ms<=maxHours*3600000; ms+=30*60000) {
    const curr=new Date(start.getTime()+ms), v=norm(angleGetter(curr));
    const unwrapped=v + (v < value0-180 ? 360 : 0);
    if (unwrapped >= boundary || (v < prevU-180)) {
      let lo=prev.getTime(), hi=curr.getTime();
      for(let i=0;i<40;i++) {
        const mid=(lo+hi)/2, mv=norm(angleGetter(new Date(mid)));
        const mu=mv+(mv<value0-180?360:0);
        if(mu>=boundary) hi=mid; else lo=mid;
      }
      return new Date((lo+hi)/2);
    }
    prev=curr; prevU=v;
  }
  return null;
}
function angleGetters(swe) {
 return {
  elongation: d => { const p=positionAt(swe,d); return p.elongation; },
  moon: d => positionAt(swe,d).moon,
  yoga: d => { const p=positionAt(swe,d); return norm(p.sun+p.moon); }
 };
}
export async function geocodePanchangPlace(query) {
  const q=String(query||"").trim();
  if (!q) throw new Error("शहर/स्थान का नाम भरें।");
  const url=new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.searchParams.set("name",q); url.searchParams.set("count","10"); url.searchParams.set("language","en"); url.searchParams.set("format","json");
  const response=await fetch(url);
  if(!response.ok) throw new Error("शहर खोजने में समस्या हुई। इंटरनेट जाँचें।");
  const data=await response.json(); const places=data.results||[];
  if(!places.length) throw new Error("यह शहर नहीं मिला। शहर का नाम और देश लिखकर कोशिश करें।");
  const india=places.find(p=>p.country_code==="IN" && /uttar pradesh/i.test(p.admin1||"")) || places.find(p=>p.country_code==="IN") || places[0];
  return {name:[india.name,india.admin1,india.country].filter(Boolean).join(", "),lat:Number(india.latitude),lon:Number(india.longitude),timezone:india.timezone||"Asia/Kolkata"};
}

function getDaySegments(sunrise, sunset, weekday) {
  if (!sunrise || !sunset || sunset <= sunrise) return {};

  const dayDuration = sunset.getTime() - sunrise.getTime();
  const eighth = dayDuration / 8;

  const rahuIndex = [7, 1, 6, 4, 5, 3, 2][weekday];
  const gulikaIndex = [6, 5, 4, 3, 2, 1, 0][weekday];
  const yamaIndex = [4, 3, 2, 1, 0, 6, 5][weekday];

  const span = (idx) => ({
    start: new Date(sunrise.getTime() + idx * eighth),
    end: new Date(sunrise.getTime() + (idx + 1) * eighth)
  });

  const abhijitDuration = dayDuration / 15;
  const midpoint = (sunrise.getTime() + sunset.getTime()) / 2;

  // ब्रह्म मुहूर्त: सूर्योदय से लगभग 96 से 48 मिनट पहले।
  const brahma = {
    start: new Date(sunrise.getTime() - 96 * 60000),
    end: new Date(sunrise.getTime() - 48 * 60000)
  };

  // दुर्मुहूर्त के लिए वार-विशिष्ट पारंपरिक नियम सत्यापित होने चाहिए।
  // अप्रमाणित समय दिखाने के बजाय इसे अभी अनुपलब्ध रखें।
  const durmuhurtaSlots = [
  [14],    // रविवार
  [9, 12], // सोमवार
  [4],     // मंगलवार
  [8],     // बुधवार
  [6, 12], // गुरुवार
  [4, 9],  // शुक्रवार
  [1, 2]   // शनिवार
];

const muhurtaDuration = dayDuration / 15;

const durmuhurta = (durmuhurtaSlots[weekday] || []).map(slot => ({
  start: new Date(
    sunrise.getTime() + (slot - 1) * muhurtaDuration
  ),
  end: new Date(
    sunrise.getTime() + slot * muhurtaDuration
  )
}));

  return {
    rahu: span(rahuIndex),
    gulika: span(gulikaIndex),
    yamaganda: span(yamaIndex),
    abhijit: {
      start: new Date(midpoint - abhijitDuration / 2),
      end: new Date(midpoint + abhijitDuration / 2)
    },
    brahma,
    durmuhurta
  };
}
export async function calculatePanchang({date,lat,lon,timezoneMinutes=330,place="चुना गया स्थान"}) {
  const latitude=Number(lat), longitude=Number(lon), offset=Number(timezoneMinutes);
  if(!Number.isFinite(latitude)||Math.abs(latitude)>90||!Number.isFinite(longitude)||Math.abs(longitude)>180) throw new Error("स्थान के निर्देशांक सही नहीं हैं।");
  if(!Number.isFinite(offset)||Math.abs(offset)>840) throw new Error("समय क्षेत्र सही नहीं है।");
  const localMidnight=localDateToUtc(date,offset);
  const sunTimes = await getSunTimes(date, latitude, longitude, offset);
const { sunrise, sunset } = sunTimes;
  const swe=await getSwe();
  const reference=sunrise || new Date(localMidnight.getTime()+12*3600000);
  const p=positionAt(swe,reference);
  const tithi=tithiInfo(p.elongation), nak=nakInfo(p.moon), yoga=yogaInfo(p.sun,p.moon), karana=karanaInfo(p.elongation);
  const getters=angleGetters(swe);
  const tithiEnd=nextTransition(swe,reference,getters.elongation,12,40);
  const nakEnd=nextTransition(swe,reference,getters.moon,NAK_SPAN,40);
  const yogaEnd=nextTransition(swe,reference,getters.yoga,NAK_SPAN,40);
  const karanaEnd=nextTransition(swe,reference,getters.elongation,6,40);
  const panchakNow = isPanchakLongitude(p.moon);
let panchakStart = null;
let panchakEnd = null;


const isP = d =>
  isPanchakLongitude(positionAt(swe, d).moon);

let prev = new Date(reference.getTime() - 30 * 60000);
let prevState = isP(prev);

for (
  let ms = -30 * 60000;
  ms >= -9 * 86400000;
  ms -= 30 * 60000
) {
  const cur = new Date(reference.getTime() + ms);
  const curState = isP(cur);

  if (curState !== prevState) {
    let lo = cur.getTime();
    let hi = prev.getTime();

    for (let i = 0; i < 40; i++) {
      const mid = (lo + hi) / 2;

      if (isP(new Date(mid)) === curState) {
        lo = mid;
      } else {
        hi = mid;
      }
    }

    if (panchakNow) {
      panchakStart = new Date((lo + hi) / 2);
    }
    break;
  }

  prev = cur;
  prevState = curState;
}

prev = new Date(reference);
prevState = panchakNow;

  for(let ms=30*60000;ms<=9*86400000;ms+=30*60000){const cur=new Date(reference.getTime()+ms),curState=isP(cur);if(curState!==prevState){let lo=prev.getTime(),hi=cur.getTime();for(let i=0;i<40;i++){const mid=(lo+hi)/2;if(isP(new Date(mid))===prevState)lo=mid;else hi=mid;}if(panchakNow)panchakEnd=new Date((lo+hi)/2);else panchakStart=new Date((lo+hi)/2);break;}prev=cur;prevState=curState;}
  const weekday=new Date(Date.UTC(Number(date.slice(0,4)),Number(date.slice(5,7))-1,Number(date.slice(8,10)))).getUTCDay();
  const periods=getDaySegments(sunrise,sunset,weekday);
  return {date,place,latitude,longitude,weekday:WEEKDAYS[weekday],sunrise,sunset,reference,tithi:{...tithi,end:tithiEnd},nakshatra:{...nak,end:nakEnd},yoga:{...yoga,end:yogaEnd},karana:{...karana,end:karanaEnd},moonSign:Math.floor(p.moon/30),sunSign:Math.floor(p.sun/30),panchak:{active:panchakNow,start:panchakStart,end:panchakEnd},periods,timezoneMinutes:offset,ayanamsa:p.ayanamsa,calculation:`खगोलीय गणना (लाहिरी अयनांश); सूर्योदय/सूर्यास्त: ${sunTimes.source}`,
accuracyNote:"सूर्योदय और सूर्यास्त स्थान के अक्षांश-देशांतर के आधार पर स्थानीय गणना से निकाले जाते हैं। तिथि, नक्षत्र, योग और करण की गणना खगोलीय गणनाओं पर आधारित है। पर्व और व्रत के निर्णय के लिए प्रकाशित स्थानीय पंचांग से मिलान करें।"};
}
export function formatPanchangTime(date, offset=330) { return fmtTime(date,offset); }
export function formatPanchangDateTime(date, offset=330) { return fmtDateTime(date,offset); }
export function getPanchakDetails(nowInput=new Date()) { return calculatePanchang({date: new Date(nowInput).toISOString().slice(0,10),lat:26.8467,lon:80.9462,timezoneMinutes:330,place:"लखनऊ"}).then(x=>({active:x.panchak.active,start:x.panchak.start?.toISOString()||null,end:x.panchak.end?.toISOString()||null,currentNakshatra:x.nakshatra.name,calculation:x.calculation,accuracyNote:x.accuracyNote})); }
export function isPanchakAt(dateInput) {
  return getSwe().then(swe => {
    const date = dateInput instanceof Date
      ? dateInput
      : new Date(dateInput);

    if (Number.isNaN(date.getTime())) {
      throw new Error("कृपया सही तारीख और समय दें।");
    }

    const p = positionAt(swe, date);
    const n = nakInfo(p.moon);
    const active = isPanchakLongitude(p.moon);

    return {
      active,
      longitude: p.moon,
      nakshatra: n,
      panchakNakshatra: active ? n.name : null
    };
  });
}
/**
 * राहुकाल, गुलिक काल, अभिजीत मुहूर्त और
 * सूर्योदय/सूर्यास्त के कार्ड के लिए formatted data.
 */
export async function getMuhuratCardData({
  date,
  lat,
  lon,
  timezoneMinutes = 330,
  place = "चुना गया स्थान"
}) {
  const p = await calculatePanchang({
    date,
    lat,
    lon,
    timezoneMinutes,
    place
  });

  const range = (period) => {
    if (!period?.start || !period?.end) return "उपलब्ध नहीं";

    return `${formatPanchangTime(period.start, timezoneMinutes)} – ${formatPanchangTime(period.end, timezoneMinutes)}`;
  };

  
const ranges = (periods) => {
  if (!Array.isArray(periods) || periods.length === 0) {
    return "उपलब्ध नहीं";
  }

  return periods
    .map(period => range(period))
    .join(" / ");
};

return {
  sunrise: formatPanchangTime(p.sunrise, timezoneMinutes),
  sunset: formatPanchangTime(p.sunset, timezoneMinutes),
  rahukaal: range(p.periods.rahu),
  gulikaKaal: range(p.periods.gulika),
  abhijitMuhurat: range(p.periods.abhijit),
  yamaganda: range(p.periods.yamaganda),
  brahmaMuhurat: range(p.periods.brahma),
  durmuhurta: ranges(p.periods.durmuhurta),
  
  place: p.place,
  date: p.date
  };
}
