// Arunodaya dashboard: timeline chart, Vedic time (ghati), upcoming vrat-tyohar, theme toggle.
// Purely additive: reads existing engines, never edits existing sections.
import { mountPages } from "./pages.js";
import { getPanchangDay, getUpcomingFestivals, getDayTimes, todayIST, shiftDate, DEFAULT_PLACE } from "./festival-calendar.js";
import { chaughadiya, horas } from "./graha-engine.js";
import { timelineSvg } from "./extra-pages.js";

const TZ = "Asia/Kolkata";
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const hm = (d) => new Intl.DateTimeFormat("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true, timeZone: TZ }).format(d);
const mdt = (d, iso) => !d ? '—' : new Date(+d + 330 * 60000).toISOString().slice(0, 10) === iso ? hm(d) : new Intl.DateTimeFormat('hi-IN', { day: 'numeric', month: 'short', timeZone: TZ }).format(d) + ', ' + hm(d);
const pad = (n) => String(Math.floor(n)).padStart(2, "0");
const dateHi = (iso) => new Intl.DateTimeFormat("hi-IN", { day: "numeric", month: "long", year: "numeric", weekday: "long", timeZone: TZ }).format(new Date(iso + "T12:00:00+05:30"));

let clockTimer = null;
let chartHidden = false;
// समय-रेखा की दिशा: बाएँ से दाएँ (डिफ़ॉल्ट) या दाएँ से बाएँ; desktop और mobile दोनों पर एक ही बटन से
// मोबाइल पर समय दाएँ से बाएँ (डेस्कटॉप पर बाएँ से दाएँ); कोई बटन नहीं
const chartRtl = !!(window.matchMedia && window.matchMedia("(max-width:700px)").matches);

// होम की पंचांग-टाइमलाइन: वही Drik जैसा चार्ट (timeline पेज वाला), दिशा चुनी हुई के अनुसार
function renderChart(el, iso, place) {
  el.classList.toggle("rtl", chartRtl);
  el.innerHTML = timelineSvg(place, iso, chartRtl);
  const wrap = el.querySelector(".tl-wrap");
  if (wrap && chartRtl) wrap.scrollLeft = wrap.scrollWidth; // दाएँ से बाएँ: शुरुआत दाईं ओर (सूर्योदय) से
}

function startClock(el, sunrise) {
  clearInterval(clockTimer);
  const tick = () => {
    const now = new Date();
    let s = (now - sunrise) / 1000;
    if (s < 0) s += 86400;
    const ghatiF = s / 1440;
    const ghati = Math.floor(ghatiF);
    const palF = (ghatiF - ghati) * 60;
    const pal = Math.floor(palF);
    const vipal = Math.floor((palF - pal) * 60);
    const g = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false, timeZone: TZ }).format(now);
    el.innerHTML = `
      <div class="dash-big">${pad(ghati)}:${pad(pal)}:${pad(vipal)}</div>
      <small>घटी : पल : विपल</small>
      <div class="dash-sub">ग्रेगोरियन समय (IST)</div>
      <div class="dash-big">${g}</div>
      <small>घंटा : मिनट : सेकंड</small>`;
  };
  tick();
  clockTimer = setInterval(tick, 1000);
}

const MONS = ["जन॰", "फ़र॰", "मार्च", "अप्रै॰", "मई", "जून", "जुला॰", "अग॰", "सित॰", "अक्टू॰", "नव॰", "दिस॰"];
const TILE = ["#f3d9a6", "#cfe8dc", "#f1cfe0", "#d7ddf3", "#f6cbb0", "#d9ecb8"];
function renderFestivals(el, iso, place) {
  try {
    const rows = [];
    for (const u of getUpcomingFestivals(iso, 30, place, { includeStart: true })) {
      for (const f of u.items) rows.push({ u, f });
    }
    el.innerHTML = rows.length
      ? rows.slice(0, 14).map(({ u, f }, i) => {
          const [, m, d] = u.date.split("-").map(Number);
          const name = f.name || f.label || "";
          const today = u.daysAway === 0;
          return `<div class="dash-fest ${today ? "today" : ""}" style="display:flex;gap:12px;align-items:center">
            <span style="flex:none;width:50px;text-align:center;padding:5px 0;line-height:1.1;color:#1b2150;background:${today ? "#f3a79d" : TILE[i % 6]}"><b style="display:block;font-size:19px;color:#1b2150">${d}</b><small style="color:#1b2150">${MONS[m - 1]}</small></span>
            <span style="min-width:0"><b>${esc(name)}${f.dayNo ? " · दिन " + f.dayNo : ""}</b>
            <small>${today ? "आज" : u.daysAway + " दिन बाद"} · ${esc(u.weekday)}</small></span></div>`;
        }).join("")
      : "<p>अगले 30 दिनों में कोई व्रत या त्योहार दर्ज नहीं है।</p>";
  } catch (e) {
    console.error(e);
    el.innerHTML = "<p>त्योहार लोड नहीं हो सके।</p>";
  }
}


// ---- वैदिक समय के नीचे: अभी चल रहा चौघड़िया-होरा, तिथि/नक्षत्र/योग/करण कब बदलेंगे, सूर्य-चंद्र, अगला त्योहार ----
let liveTimer = null;
const left = (ms) => {
  if (ms <= 0) return "अभी";
  const m = Math.floor(ms / 60000), d = Math.floor(m / 1440), h = Math.floor((m % 1440) / 60), mi = m % 60;
  return (d ? d + " दिन " : "") + (h ? h + " घं " : "") + mi + " मि बाक़ी";
};
const lrow = (k, v, sub) => `<div class="dl-r"><span>${esc(k)}</span><b>${v}${sub ? `<small>${sub}</small>` : ""}</b></div>`;
function startLive(el, iso, place) {
  clearInterval(liveTimer);
  const isToday = iso === todayIST();
  let p, dt, ch = { day: [], night: [] }, prevNight = [], hr = [], prevHr = [], next = null;
  try {
    p = getPanchangDay(iso, place);
    dt = getDayTimes(iso, place);
    ch = chaughadiya(iso, place);
    prevNight = chaughadiya(shiftDate(iso, -1), place).night;
    hr = horas(iso, place);
    prevHr = horas(shiftDate(iso, -1), place).slice(12);
    next = getUpcomingFestivals(iso, 90, place).find((u) => u.daysAway >= 1) || null;
  } catch (e) { console.error(e); el.innerHTML = ""; return; }
  const find = (arr, now) => arr.find((x) => now >= x.start.getTime() && now < x.end.getTime());
  const cur = (list, now) => list.find((x) => x.end && x.end.getTime() > now) || list[list.length - 1];
  const tick = () => {
    const now = Date.now();
    let h = "";
    if (isToday) {
      const c = find([...prevNight, ...ch.day, ...ch.night], now), o = find([...prevHr, ...hr], now);
      h += `<div class="dl-h">अभी चल रहा है</div>`;
      if (c) h += lrow("चौघड़िया", `<span class="${c.good ? "dl-good" : "dl-bad"}">${esc(c.name)}</span>`, `${hm(c.start)} – ${hm(c.end)} · ${left(c.end.getTime() - now)}`);
      if (o) h += lrow("होरा", esc(o.lord), `${hm(o.start)} – ${hm(o.end)} · ${left(o.end.getTime() - now)}`);
      if (dt) {
        const inR = now >= dt.rahu.start.getTime() && now < dt.rahu.end.getTime();
        h += lrow("राहुकाल", `<span class="${inR ? "dl-bad" : ""}">${hm(dt.rahu.start)} – ${hm(dt.rahu.end)}</span>`, inR ? "अभी चल रहा है · " + left(dt.rahu.end.getTime() - now) : "");
        const inA = now >= dt.abhijit.start.getTime() && now < dt.abhijit.end.getTime();
        h += lrow("अभिजीत मुहूर्त", `<span class="${inA ? "dl-good" : ""}">${hm(dt.abhijit.start)} – ${hm(dt.abhijit.end)}</span>`, inA ? "अभी चल रहा है" : "");
      }
      h += `<div class="dl-h">कब बदलेगा</div>`;
      for (const [k, list] of [["तिथि", p.tithis], ["नक्षत्र", p.nakshatras], ["योग", p.yogas], ["करण", p.karanas]]) {
        const s = cur(list, now);
        if (s) h += lrow(k, esc(s.label), s.end ? `${hm(s.end)} तक · ${left(s.end.getTime() - now)}` : "");
      }
    } else if (dt) {
      h += `<div class="dl-h">इस दिन के काल</div>`;
      h += lrow("राहुकाल", `${hm(dt.rahu.start)} – ${hm(dt.rahu.end)}`) + lrow("अभिजीत मुहूर्त", `${hm(dt.abhijit.start)} – ${hm(dt.abhijit.end)}`);
    }
    if (dt && p) {
      const day = dt.sunset.getTime() - dt.sunrise.getTime();
      const pc = isToday ? Math.max(0, Math.min(100, ((now - dt.sunrise.getTime()) / day) * 100)) : 0;
      const dm = dt.dayLengthMin;
      h += `<div class="dl-h">सूर्य और चंद्र</div>`;
      h += lrow("सूर्योदय / सूर्यास्त", `${hm(dt.sunrise)} / ${hm(dt.sunset)}`);
      h += lrow("चंद्रोदय / चंद्रास्त", `${mdt(p.moonrise, p.date)} / ${mdt(p.moonset, p.date)}`);
      h += lrow("दिनमान / रात्रिमान", `${Math.floor(dm / 60)} घं ${dm % 60} मि / ${Math.floor((1440 - dm) / 60)} घं ${(1440 - dm) % 60} मि`);
      if (isToday) h += `<div class="dl-bar" title="दिन कितना बीता"><i style="width:${pc.toFixed(1)}%"></i></div><small class="dl-cap">सूर्योदय से सूर्यास्त तक ${pc.toFixed(0)}% बीता</small>`;
    }
    if (next) {
      h += `<div class="dl-h">अगला त्योहार</div>`;
      h += lrow(next.items.map((f) => esc(f.name || f.label || "")).join(" · "), `${next.daysAway} दिन बाद`, `${esc(next.weekday)} · ${esc(next.date)}`);
    }
    el.innerHTML = h;
  };
  tick();
  liveTimer = setInterval(tick, 1000);
}

// हेडर के दाईं ओर ब्रांड-लोगो (public/logo.svg); पहले से हो तो दोबारा नहीं
function addLogo() {
  const bar = document.querySelector(".topbar");
  if (!bar || bar.querySelector(".site-logo")) return;
  const img = document.createElement("img");
  img.className = "site-logo"; img.src = "/logo.svg"; img.alt = "अरुणोदय पंचांग लोगो"; img.decoding = "async";
  bar.appendChild(img);
}

// हेडर में छोटा प्रशासन-आइकन (सबको दिखता है; खोलने पर सिर्फ़ मालिक का Google लॉगिन चलता है)
function addAdminIcon() {
  const bar = document.querySelector(".topbar");
  if (!bar || bar.querySelector(".admin-ico")) return;
  const a = document.createElement("a");
  a.className = "admin-ico"; a.href = "/admin.html"; a.title = "प्रशासन"; a.setAttribute("aria-label", "प्रशासन");
  a.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><circle cx="12" cy="8" r="4" fill="currentColor"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" fill="currentColor"/></svg>';
  bar.appendChild(a);
}

export function mountDashboard(place = DEFAULT_PLACE) {
  mountPages(); // "और देखें" बटन के पूरे पेज
  addLogo();
  addAdminIcon();
  const anchor = document.querySelector(".date-strip");
  if (!anchor || document.querySelector("#dash-top")) return;

  const saved = (() => { try { return localStorage.getItem("arunodaya-theme-v2"); } catch { return null; } })();
  document.body.classList.add("dash-on");
  if (saved === "classic") document.body.classList.add("dash-classic"); // दो थीम: Modern (डिफ़ॉल्ट) और Classic (Drik जैसा नारंगी)

  const sec = document.createElement("section");
  sec.id = "dash-top";
  sec.innerHTML = `
    <div class="dash-head">
      <div><div class="dash-date" id="dash-date"></div><div class="dash-tithi" id="dash-tithi"></div></div>
      <div class="dash-loc">${esc(place.name)}</div>
    </div>
    <div class="dash-tools">
      <button type="button" id="dash-toggle-chart">चार्ट छुपाएं</button>
      <button type="button" id="dash-toggle-theme">थीम बदलें</button>
    </div>
    <div class="dash-chart" id="dash-chart"></div>
    <div class="dash-two">
      <div class="dash-card"><div class="dash-ch">आने वाले व्रत और त्योहार</div><div id="dash-fest"></div><div style="text-align:right;padding:8px 14px"><button type="button" data-more="festivals" style="background:none;border:0;color:var(--dacc);font:inherit;font-size:12px;font-weight:700;letter-spacing:.06em;cursor:pointer">और देखें →</button></div></div>
      <div class="dash-card"><div class="dash-ch">वैदिक समय</div><div class="dash-clock" id="dash-clock"></div><div id="dash-live"></div></div>
    </div>`;
  anchor.parentNode.insertBefore(sec, anchor);

  const chartEl = sec.querySelector("#dash-chart");
  sec.querySelector("#dash-toggle-chart").addEventListener("click", (e) => {
    chartHidden = !chartHidden;
    chartEl.hidden = chartHidden;
    e.target.textContent = chartHidden ? "चार्ट दिखाएं" : "चार्ट छुपाएं";
  });
  sec.querySelector("#dash-toggle-theme").addEventListener("click", () => {
    const classic = document.body.classList.toggle("dash-classic");
    try { localStorage.setItem("arunodaya-theme-v2", classic ? "classic" : "modern"); } catch {}
  });

  let shownIso = null, userPicked = false;
  const refresh = (iso) => {
    shownIso = iso;
    try {
      const p = getPanchangDay(iso, place);
      sec.querySelector("#dash-date").textContent = dateHi(iso);
      sec.querySelector("#dash-tithi").textContent = `${p.paksha} · ${p.tithis[0]?.label ?? ""} · ${p.nakshatras[0]?.label ?? ""}`;
      renderChart(chartEl, iso, place);
      renderFestivals(sec.querySelector("#dash-fest"), iso, place);
      const real = todayIST();
      let sr = p.sunrise;
      if (iso === real && new Date() < sr) sr = getPanchangDay(shiftDate(real, -1), place).sunrise;
      startClock(sec.querySelector("#dash-clock"), sr);
      startLive(sec.querySelector("#dash-live"), iso, place);
    } catch (e) {
      console.error("Dashboard failed:", e);
      chartEl.innerHTML = "<p>चार्ट लोड नहीं हो सका।</p>";
    }
  };
  refresh(todayIST());
  document.querySelector("#global-date")?.addEventListener("change", (e) => {
    if (!e.target.value) return;
    userPicked = e.target.value !== todayIST(); // खुद चुनी तारीख़ को आधी रात पर नहीं बदलेंगे
    refresh(e.target.value);
  });
  // आधी रात के बाद नया दिन अपने-आप: हर मिनट जाँच; खुद चुनी तारीख़ पर कुछ नहीं बदलता
  setInterval(() => {
    const real = todayIST();
    if (userPicked || real === shownIso) return;
    const gd = document.querySelector("#global-date");
    if (gd) gd.value = real;
    refresh(real);
  }, 60000);
}
