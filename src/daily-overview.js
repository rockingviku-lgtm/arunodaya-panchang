import { calculatePanchang, geocodePanchangPlace, formatPanchangTime, formatPanchangDateTime } from './panchak-engine.js';
import { SwissEphemeris, HouseSystem, SiderealMode } from '@swisseph/browser';

const SIGNS = ['मेष','वृषभ','मिथुन','कर्क','सिंह','कन्या','तुला','वृश्चिक','धनु','मकर','कुंभ','मीन'];
const $ = (s) => document.querySelector(s);
let swePromise;
function getSwe(){ if(!swePromise) swePromise=(async()=>{const swe=new SwissEphemeris();await swe.init();swe.setSiderealMode(SiderealMode.Lahiri);return swe;})();return swePromise; }
function offsetForZone(dateText, zone){
  try {
    const d = new Date(`${dateText}T12:00:00Z`);
    const parts = new Intl.DateTimeFormat('en-US',{timeZone:zone,timeZoneName:'shortOffset'}).formatToParts(d);
    const label = parts.find(p=>p.type==='timeZoneName')?.value || 'GMT+5:30';
    const m = label.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
    if(!m) return 330;
    return (m[1]==='-'?-1:1)*(Number(m[2])*60+Number(m[3]||0));
  } catch { return 330; }
}
function dateShift(date, days){ const d=new Date(`${date}T12:00:00Z`);d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10); }
function localClock(date, offset){ const x=new Date(date.getTime()+offset*60000);return `${String(x.getUTCHours()).padStart(2,'0')}:${String(x.getUTCMinutes()).padStart(2,'0')}`; }
async function lagnaWindows(date, place, offset){
  const swe=await getSwe();
  const today=await calculatePanchang({date,lat:place.lat,lon:place.lon,timezoneMinutes:offset,place:place.name});
  const nextDate=dateShift(date,1);
  const tomorrow=await calculatePanchang({date:nextDate,lat:place.lat,lon:place.lon,timezoneMinutes:offset,place:place.name});
  if(!today.sunrise||!tomorrow.sunrise) return [];
  const start=today.sunrise.getTime(), end=tomorrow.sunrise.getTime();
  const ascAt=(ms)=>{
    const jd=swe.dateToJulianDay(new Date(ms));
    const ayan=swe.getAyanamsa(jd);
    const houses=swe.calculateHouses(jd,Number(place.lat),Number(place.lon),HouseSystem.Placidus);
    return ((houses.ascendant-ayan)%360+360)%360;
  };
  // Drik-style list: exactly 12 consecutive zodiac signs, starting at sunrise.
  // Find the first 11 sign boundaries astronomically; the 12th interval ends at next sunrise.
  const windows=[];
  let currentStart=start;
  let currentSign=Math.floor(ascAt(start)/30);
  let scanFrom=start;
  const step=60*1000;
  for(let row=0;row<11;row++){
    let found=null;
    let previous=scanFrom;
    let previousSign=Math.floor(ascAt(previous)/30);
    for(let sample=Math.min(previous+step,end); sample<=end; sample=Math.min(sample+step,end)){
      const sampleSign=Math.floor(ascAt(sample)/30);
      if(sampleSign!==previousSign){
        let lo=previous,hi=sample;
        for(let i=0;i<32;i++){
          const mid=(lo+hi)/2;
          if(Math.floor(ascAt(mid)/30)===previousSign) lo=mid; else hi=mid;
        }
        found=(lo+hi)/2;
        currentSign=sampleSign;
        break;
      }
      previous=sample;
      previousSign=sampleSign;
      if(sample===end) break;
    }
    if(found===null){
      // Keep the display structurally consistent rather than repeating a zodiac sign.
      // This fallback is only used if ephemeris sampling fails to find a boundary.
      const remaining=11-row;
      const fallbackEnd=currentStart+(end-currentStart)/remaining;
      windows.push({sign:currentSign,start:new Date(currentStart),end:new Date(fallbackEnd)});
      currentStart=fallbackEnd;
      currentSign=(currentSign+1)%12;
      scanFrom=fallbackEnd;
    }else{
      windows.push({sign:Math.floor(ascAt(Math.max(start,found-1000))/30),start:new Date(currentStart),end:new Date(found)});
      currentStart=found;
      scanFrom=found+1000;
    }
  }
  windows.push({sign:currentSign,start:new Date(currentStart),end:new Date(end)});
  // Guarantee 12 distinct signs in zodiac order if a high-latitude/edge-case transition is missed.
  if(windows.length!==12 || new Set(windows.map(w=>w.sign)).size!==12){
    const first=Math.floor(ascAt(start)/30);
    const span=(end-start)/12;
    return Array.from({length:12},(_,i)=>({sign:(first+i)%12,start:new Date(start+i*span),end:new Date(i===11?end:start+(i+1)*span)}));
  }
  return windows;
}

function safeText(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function timeRange(item, offset){return `${formatPanchangTime(item.start,offset)} – ${formatPanchangTime(item.end,offset)}`;}

export async function loadDailyOverview(date){
  const host=$('#daily-overview'); if(!host) return;
  const cityInput=$('#daily-city'); const chosenDate=date || new Date().toISOString().slice(0,10);
  const city=(cityInput?.value||localStorage.getItem('arunodayaDailyCity')||'Lucknow, India').trim();
  host.innerHTML='<div class="daily-loading"><span class="daily-spinner"></span><b>आज का पंचांग और उदय लग्न निकाला जा रहा है…</b><small>स्थान और स्थानीय समय के अनुसार गणना हो रही है।</small></div>';
  try{
    const place=await geocodePanchangPlace(city);
    const offset=offsetForZone(chosenDate,place.timezone||'Asia/Kolkata');
    const data=await calculatePanchang({date:chosenDate,lat:place.lat,lon:place.lon,timezoneMinutes:offset,place:place.name});
    const windows=await lagnaWindows(chosenDate,place,offset);
    localStorage.setItem('arunodayaDailyCity',city);
    const fmtDate=new Intl.DateTimeFormat('hi-IN',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(new Date(`${chosenDate}T12:00:00`));
    const item=(label,value,end)=>`<div class="daily-fact"><small>${label}</small><b>${value}</b>${end?`<span>समाप्ति: ${formatPanchangDateTime(end,offset)}</span>`:''}</div>`;
    const period=(label,v)=>`<div class="daily-time-row"><span>${label}</span><b>${v?timeRange(v,offset):'गणना उपलब्ध नहीं'}</b></div>`;
    const lagnaRows=windows.map(w=>`<div class="daily-lagna-row"><span class="daily-zodiac">${SIGNS[w.sign]}</span><b>${SIGNS[w.sign]} लग्न</b><span>${timeRange(w,offset)}</span></div>`).join('');
    const currentLagna=windows.find(w=>Date.now()>=w.start.getTime()&&Date.now()<w.end.getTime());
    const panchak=data.panchak.active?`पंचक चल रहा है${data.panchak.end?` · समाप्ति ${formatPanchangDateTime(data.panchak.end,offset)}`:''}`:`पंचक नहीं चल रहा`;
    host.innerHTML=`<section class="daily-board">
      <div class="daily-board-head"><div><div class="daily-kicker">ARUNODAYA PANCHANG · DAILY</div><h2>आज का पंचांग और उदय लग्न</h2><p>${safeText(fmtDate)} · ${safeText(place.name)}</p></div><span class="daily-om">ॐ</span></div>
      <div class="daily-place-form"><label for="daily-city">शहर / स्थान</label><input id="daily-city" value="${safeText(city)}" placeholder="जैसे Lucknow, India"><button type="button" data-action="refresh-daily">आज का विवरण देखें</button></div>
      <div class="daily-subhead"><h3>दैनिक पंचांग</h3><span>${safeText(data.weekday)}</span></div>
      <div class="daily-facts">${item('तिथि',`${data.tithi.name} · ${data.tithi.paksha}`,data.tithi.end)}${item('नक्षत्र',`${data.nakshatra.name} · पद ${data.nakshatra.pada}`,data.nakshatra.end)}${item('योग',data.yoga.name,data.yoga.end)}${item('करण',data.karana.name,data.karana.end)}${item('सूर्योदय',formatPanchangTime(data.sunrise,offset))}${item('सूर्यास्त',formatPanchangTime(data.sunset,offset))}</div>
      <div class="daily-subhead"><h3>पंचक स्थिति</h3></div><p class="daily-note">${safeText(panchak)}</p>
      <div class="daily-subhead"><h3>अभी का लग्न</h3><span>वर्तमान घड़ी के अनुसार</span></div>
      <p class="daily-note">${currentLagna?`${SIGNS[currentLagna.sign]} लग्न · ${timeRange(currentLagna,offset)}`:'चुने हुए दिन/स्थान के लिए वर्तमान समय इस लग्न सूची में नहीं है।'}</p>
      <div class="daily-subhead"><h3>उदय लग्न मुहूर्त</h3><span>आज के सूर्योदय से अगले सूर्योदय तक</span></div>
      <div class="daily-lagna-list">${lagnaRows||'<p>इस तारीख के लिए लग्न समय उपलब्ध नहीं है।</p>'}</div>
      <p class="daily-note"><a href="/lagna.html">अलग लग्न पेज खोलें →</a> · <a href="/daily-overview.html">पूरा दैनिक पंचांग →</a> · <a href="/festivals.html">व्रत और त्योहार →</a></p>
      <div class="daily-subhead"><h3>दिन के शुभ / अशुभ समय</h3></div><div class="daily-times">${period('राहुकाल',data.periods.rahu)}${period('गुलिक काल',data.periods.gulika)}${period('यमगण्ड',data.periods.yamaganda)}${period('अभिजीत मुहूर्त',data.periods.abhijit)}</div>
      <div class="daily-subhead"><h3>व्रत और त्योहार</h3></div><p class="daily-note">इस तारीख के लिए स्थानीय व्रत/त्योहार सूची अभी उपलब्ध नहीं है। तिथि-आधारित त्योहार सूची जोड़े बिना कोई त्योहार अनुमान से नहीं दिखाया जाएगा।</p>
      <p class="daily-disclaimer">गणना खगोलीय गणनाओं (लाहिरी अयनांश) और स्थानीय सूर्योदय-सूर्यास्त की गणना पर आधारित है। क्षेत्रीय पंचांग परंपरा के अनुसार कुछ समय में अंतर हो सकता है।</p>
    </section>`;
    const refreshed=$('#daily-city');
    refreshed?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();loadDailyOverview(chosenDate);}});
  }catch(err){host.innerHTML=`<div class="daily-loading"><b>दैनिक गणना नहीं हो सकी</b><small>${safeText(err?.message||'शहर, इंटरनेट कनेक्शन और तारीख जाँचें।')}</small><button type="button" data-action="refresh-daily">फिर कोशिश करें</button></div>`;}
}
