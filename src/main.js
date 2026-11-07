import "./style.css";
import "./dashboard.css";
import { mountDashboard } from "./dashboard.js";
import { mountPages } from "./pages.js";

import {
  buildKundliData,
  buildKundliHtml
} from "./kundli.js";

import { addKundliPdfButton } from "./kundli-pdf.js";
import { parseBirthDateISO } from "./birth-date.js";

import {
  calculatePanchang,
  geocodePanchangPlace,
  formatPanchangTime,
  formatPanchangDateTime
} from "./panchak-engine.js";

import {
  searchBirthPlaces,
  getBirthTimezoneOffset
} from "./location.js";


import { getLagnaData, RASHIS } from "./lagna-engine.js";
import { DEFAULT_PLACE, getFestivalsForDate, todayIST } from "./festival-calendar.js";

import {
  renderMuhuratResult,
  updateMuhuratCards
} from "./muhurat.js";
import { autoRefreshPanchangSummary } from "./panchang-summary.js";
import { mountDailyExtras } from "./daily-extras.js";
import { mountKundliDoshas } from "./kundli-doshas.js";

import { mountRashifal } from "./rashifal.js";
import { mountGunMilan } from "./gun-milan.js";
import { mountNumerology } from "./numerology.js";
const $ = (s) => document.querySelector(s);

const today = new Date();

const dateISO = (d) => {
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};

const fmtDate = (
  value,
  options = {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  }
) => {
  if (!value) return "तारीख चुनें";
  return new Intl.DateTimeFormat("hi-IN", options)
    .format(new Date(`${value}T12:00:00`));
};

const state = {
  date: dateISO(today),
  month: new Date(today.getFullYear(), today.getMonth(), 1),
  active: "home"
};

const nav = [
  ["home", "⌂", "होम"],
  ["panchang", "•", "पंचांग"],
  ["calendar", "▦", "कैलेंडर"],
  ["muhurat", "•", "मुहूर्त"],
  ["kundli", "•", "कुंडली"],
  ["rashifal", "•", "राशिफल"],
  ["gun-milan", "•", "गुण मिलान"],
  ["numerology", "•", "अंक ज्योतिष"],
  ["kundli-doshas", "•", "कुंडली दोष-योग"]
];

$("#app").innerHTML = `
<div class="cosmos-scene" aria-hidden="true">
  <div class="orbit orbit-sun">
    <span class="orbit-sun-body"></span>
  </div>
  <div class="orbit orbit-mars">
    <span class="orbit-mars-body"></span>
  </div>
</div>

<header class="topbar">
  <div class="brand" role="button" tabindex="0" data-page="home">
    <div class="brand-mark">ॐ</div>
    <div>
      <div class="brand-name">Arunodaya Panchang</div>
      <div class="brand-sub">वैदिक पंचांग · हिंदू कैलेंडर · ज्योतिष</div>
    </div>
  </div>
  <button class="today-btn" data-action="today">आज का पंचांग</button>
</header>

<main>
  <!-- ===== START FEATURE: HERO ===== -->
  <section class="hero" id="hero">
    <div class="eyebrow"><span class="sun-dot"></span> आपका दैनिक वैदिक कैलेंडर</div>
    <h1>समय को जानें,<br><span>शुभता के साथ आगे बढ़ें।</span></h1>
    <p>दैनिक पंचांग, हिंदू कैलेंडर, मुहूर्त और जन्म कुंडली — एक ही जगह, आपके मोबाइल के लिए बनाया गया।</p>
    <div class="hero-actions">
      <button class="btn primary" data-page="panchang">आज का पंचांग देखें <span>→</span></button>
      <button class="btn secondary" data-page="calendar">हिंदू कैलेंडर खोलें</button>
    </div>
  </section>

  <!-- ===== END FEATURE: HERO ===== -->
  <!-- ===== START FEATURE: DATE STRIP / DATE PICKER ===== -->
  <section class="date-strip">
    <div>
      <div class="eyebrow muted">आज की तारीख</div>
      <div class="today-date" id="today-date"></div>
      <div class="today-meta" id="today-meta"></div>
    </div>
    <label class="date-picker-label">
      किसी भी तारीख का पंचांग
      <input type="date" id="global-date">
    </label>
  </section>
  <!-- ===== END FEATURE: DATE STRIP / DATE PICKER ===== -->

  <!-- ===== START FEATURE: DAILY LAGNA + TODAY FESTIVALS ===== -->
  <div class="home-daily-grid" style="display:flex;flex-direction:column;gap:20px;width:100%;">
    <!-- ===== START FEATURE: DAILY LAGNA ===== -->
    <section class="section" id="home-lagna-section">
      <div class="section-heading">
        <div>
          <div class="eyebrow muted">DAILY LAGNA</div>
          <h2>उदय लग्न मुहूर्त</h2>
          <p id="home-lagna-date">आज का लग्न समय</p>
        </div>
      </div>
      <div class="panel">
        <label>
          शहर
          <input id="home-lagna-city" value="Lucknow, India">
        </label>
        <button class="btn primary" id="home-lagna-load" type="button">
          लग्न समय देखें
        </button>
        <div id="home-lagna-result" aria-live="polite">
          लग्न की गणना लोड हो रही है…
        </div>
      </div>
    </section>
    <!-- ===== END FEATURE: DAILY LAGNA ===== -->
    <!-- ===== START FEATURE: TODAY PANCHANG ===== -->
    <section class="section" id="home-panchang-section">
      <div class="section-heading">
        <div>
          <div class="eyebrow muted">DAILY PANCHANG</div>
          <h2>आज का पंचांग</h2>
          <p id="home-panchang-date">भारतीय मानक समय (IST)</p>
        </div>
      </div>
      <div class="panel" id="home-panchang-result" aria-live="polite">
        आज का पंचांग लोड हो रहा है…
      </div>
    </section>
    <!-- ===== END FEATURE: TODAY PANCHANG ===== -->
<!-- राशिफल -->
<section class="section" id="rashifal-section">
  <div id="rashifal-app"></div>
</section>

<!-- गुण मिलान -->
<section class="section" id="gun-milan-section">
  <div id="milan-app"></div>
</section>

<!-- अंक ज्योतिष -->
<section class="section" id="numerology-section">
  <div id="numerology-app"></div>
</section>

<!-- कुंडली दोष-योग -->
<section class="section" id="kundli-doshas-section">
  <div id="kundli-app"></div>
</section>
    <!-- ===== START FEATURE: TODAY FESTIVALS ===== -->
    <section class="section" id="home-festival-section">
      <div class="section-heading">
        <div>
          <div class="eyebrow muted">FESTIVAL CALENDAR</div>
          <h2>आज के त्योहार</h2>
          <p id="home-festival-date">भारतीय मानक समय (IST)</p>
        </div>
      </div>
      <div class="panel" id="home-festival-result" aria-live="polite">
        त्योहारों की जानकारी जाँची जा रही है…
      </div>
    </section>
    <!-- ===== END FEATURE: TODAY FESTIVALS ===== -->
  </div>
    <!-- KUNDLI DOSHAS APP -->
    <section class="section" id="kundli-doshas-section">
      <div id="kundli-app"></div>
    </section>
<!-- ===== START FEATURE: HOME EXTRAS ===== -->
<section class="section" id="home-extras-section">
  <div class="section-heading">
    <div>
      <div class="eyebrow muted">DAILY EXTRAS</div>
      <h2>आज की कुंडली और ग्रह</h2>
    </div>
  </div>
  <div class="panel" id="home-extras-result">
    आज की कुंडली और ग्रह लोड हो रहे हैं…
  </div>
</section>
<!-- ===== END FEATURE: HOME EXTRAS ===== -->
  <!-- ===== END FEATURE: DAILY LAGNA + TODAY FESTIVALS ===== -->

  <!-- ===== START FEATURE: ACTIVE PAGE CONTENT ===== -->
  <section class="section" id="page-content"></section>
  <!-- ===== END FEATURE: ACTIVE PAGE CONTENT ===== -->

  <!-- ===== START FEATURE: QUICK LINKS / TOOLS ===== -->
  <section class="section quick-links">
    <div class="section-heading">
      <div>
        <div class="eyebrow muted">एक नज़र में</div>
        <h2>आपके उपयोगी टूल</h2>
      </div>
    </div>
    <div class="tool-grid">
      <button class="tool-card" data-page="panchang">
        <span class="tool-icon"></span>
        <b>दैनिक पंचांग</b>
        <small>तिथि, नक्षत्र, योग और करण</small>
        <span class="tool-arrow">↗</span>
      </button>
      <button class="tool-card" data-page="calendar">
        <span class="tool-icon">▦</span>
        <b>हिंदू कैलेंडर</b>
        <small>महीना और तारीख चुनें</small>
        <span class="tool-arrow">↗</span>
      </button>
      <button class="tool-card" data-page="muhurat">
        <span class="tool-icon"></span>
        <b>शुभ मुहूर्त</b>
        <small>समय और स्थान के अनुसार</small>
        <span class="tool-arrow">↗</span>
      </button>
      <button class="tool-card" data-page="kundli">
        <span class="tool-icon"></span>
        <b>जन्म कुंडली</b>
        <small>जन्म विवरण से कुंडली</small>
        <span class="tool-arrow">↗</span>
      </button>
    </div>
  </section>

  <!-- ===== END FEATURE: QUICK LINKS / TOOLS ===== -->
  <section class="notice">
    <span>ⓘ</span>
    <p><b>गणना संबंधी सूचना:</b> पंचांग, तिथि, नक्षत्र, सूर्योदय और मुहूर्त के परिणामों को प्रमाणित खगोलीय गणना से सत्यापित करना आवश्यक है।</p>
  </section>
</main>

<footer>
  <div class="footer-brand">
    <div class="brand-mark small">ॐ</div>
    <div>
      <b>Arunodaya Panchang</b>
      <small>परंपरा और तकनीक का संगम</small>
    </div>
  </div>
  <div class="footer-links">
    <button data-page="home">होम</button>
    <button data-page="panchang">पंचांग</button>
    <button data-page="calendar">कैलेंडर</button>
    <button data-page="muhurat">मुहूर्त</button>
    <button data-page="kundli">कुंडली</button>
    <a href="/privacy-policy.html">Privacy Policy / गोपनीयता नीति</a>
    <a href="/disclaimer.html">Disclaimer / अस्वीकरण</a>
    <a href="/about-us.html">About Us / हमारे बारे में</a>
    <a href="/contact-us.html">Contact Us / संपर्क करें</a>
    <a href="/terms-and-conditions.html">Terms &amp; Conditions / नियम व शर्तें</a>
    <a href="/services.html">Services / सेवाएँ</a>
    <a href="/cookies.html">Cookies Policy / कुकीज़ नीति</a>
  </div>
  <div class="footer-credit">
    <small>Made In India 🇮🇳</small>
    <small>Website by Seven Ink Digital Developers Team</small>
  </div>
  <small class="copyright">© ${today.getFullYear()} ARUNODAYA PANCHANG · All Copyright Reserved</small>
</footer>

<nav class="bottom-nav">
  ${nav.map(([id, icon, label]) => `
    <button data-page="${id}" class="${id === "home" ? "selected" : ""}">
      <span>${icon}</span><small>${label}</small>
    </button>
  `).join("")}
</nav>
`;

function dateFacts(date) {
  const d = new Date(`${date}T12:00:00`);
  return {
    weekday: new Intl.DateTimeFormat("hi-IN", {
      weekday: "long"
    }).format(d),
    full: fmtDate(date),
    month: new Intl.DateTimeFormat("hi-IN", {
      month: "long",
      year: "numeric"
    }).format(d)
  };
}

function setDate(date) {
  state.date = date || dateISO(new Date());
  $("#global-date").value = state.date;
  $("#today-date").textContent = fmtDate(state.date, {
    day: "numeric",
    month: "long",
    year: "numeric"
  });
  $("#today-meta").textContent =
    `${dateFacts(state.date).weekday} · भारत (IST)`;
  render();
}

function fact(title, value, icon) {
  return `<div class="fact-card">
    <span>${icon}</span>
    <div><small>${title}</small><b>${value}</b></div>
  </div>`;
}


function updatePremiumDate() {
  const date = $("#premium-selected-date");
  const meta = $("#premium-selected-meta");

  if (date) date.textContent = fmtDate(state.date);

  if (meta) {
    meta.textContent = `${dateFacts(state.date).weekday} · भारत (IST)`;
  }
}

// ===== START FEATURE FUNCTION: PANCHANG =====
function renderPanchang() {
  return `
    <div class="page-title">
      <div class="eyebrow muted">DAILY PANCHANG</div>
      <h2>दैनिक पंचांग</h2><p>अपनी तारीख और स्थान चुनें।</p>
    </div>
    <div class="panel">
      <div class="panel-head"><div><h3>पंचांग विवरण</h3><p>तारीख चुनकर विवरण देखें</p></div><span class="panel-symbol"></span></div>
      <div class="form-grid">
        <label>पंचांग की तारीख<input id="p-date" type="date" value="${state.date}"></label>
        <label>समय<input id="p-time" type="time" value="12:00"></label>
        <label>स्थान / शहर<input id="p-place" value="Lucknow, India"></label>
        <label>समय क्षेत्र<select id="p-zone"><option value="330">भारत (UTC +05:30)</option><option value="0">UTC</option></select></label>
      </div>
      <button class="btn primary" data-action="show-panchang">चुनी तारीख का पंचांग देखें →</button>
      <div id="p-result"></div>
    </div>
    <div class="notice compact"><span>ⓘ</span><p>सटीक तिथि, नक्षत्र और मुहूर्त के लिए सत्यापित खगोलीय गणना आवश्यक है।</p></div>`;
}

// ===== END FEATURE FUNCTION: PANCHANG =====

// ===== START FEATURE FUNCTION: HINDU CALENDAR =====
function renderCalendar() {
  const y = state.month.getFullYear();
  const m = state.month.getMonth();
  const first = new Date(y, m, 1);
  const days = new Date(y, m + 1, 0).getDate();
  const start = (first.getDay() + 6) % 7;
  const weekdays = ["सोम", "मंगल", "बुध", "गुरु", "शुक्र", "शनि", "रवि"];

  let cells = weekdays.map(x => `<div class="cal-week">${x}</div>`).join("");

  for (let i = 0; i < start; i++) {
    cells += `<div class="cal-day empty"></div>`;
  }

  for (let n = 1; n <= days; n++) {
    const d = dateISO(new Date(y, m, n));
    const isSelected = d === state.date;
    const isToday = d === dateISO(today);
    cells += `<button class="cal-day ${isSelected ? "chosen" : ""} ${isToday ? "today" : ""}" data-date="${d}">
      <span>${n}</span>${isToday ? "<i>आज</i>" : ""}
    </button>`;
  }

  return `
    <div class="page-title"><div class="eyebrow muted">HINDU CALENDAR</div><h2>हिंदू कैलेंडर</h2><p>किसी भी तारीख पर टैप करके उसे चुनें।</p></div>
    <div class="panel calendar-panel">
      <div class="calendar-toolbar">
        <button class="icon-btn" data-action="prev-month">‹</button>
        <h3>${new Intl.DateTimeFormat("hi-IN", { month: "long", year: "numeric" }).format(state.month)}</h3>
        <button class="icon-btn" data-action="next-month">›</button>
      </div>
      <div class="calendar-grid">${cells}</div>
      <div class="calendar-legend"><span><i class="legend-dot"></i> आज</span><span><i class="legend-dot gold-dot"></i> चुनी गई तारीख</span></div>
    </div>
    <div class="panel selected-date-panel">
      <div><small>चुनी गई तारीख</small><h3>${fmtDate(state.date)}</h3><p>इस तारीख का विवरण देखने के लिए पंचांग खोलें।</p></div>
      <button class="btn primary" data-page="panchang">पंचांग देखें →</button>
    </div>`;
}

function timing(name, desc, icon) {
  return `<div class="timing-item"><span class="timing-icon">${icon}</span><div><b>${name}</b><small>${desc}</small></div><span class="timing-status">जल्द उपलब्ध</span></div>`;
}

// ===== END FEATURE FUNCTION: HINDU CALENDAR =====

// ===== START FEATURE FUNCTION: SHUBH MUHURAT =====
function renderMuhurat() {
  return `
    <div class="page-title"><div class="eyebrow muted">AUSPICIOUS TIMINGS</div><h2>मुहूर्त और शुभ समय</h2><p>स्थान और तारीख के अनुसार मुहूर्त।</p></div>
    <div class="panel">
      <div class="panel-head"><div><h3>दैनिक समय-सारणी</h3><p>अपनी तारीख और शहर चुनें</p></div><span class="panel-symbol purple-bg"></span></div>
      <div class="form-grid">
        <label>तारीख<input id="m-date" type="date" value="${state.date}"></label>
        <label>शहर / स्थान<input id="m-place" value="Lucknow, India"></label>
      </div>
      <button class="btn primary" data-action="show-muhurat">समय-सारणी देखें →</button>
      <div id="m-result"></div>
    </div>     
 <div class="notice compact">
      <span>ⓘ</span>
      <p>मुहूर्त के समय स्थान और तारीख के अनुसार बदल सकते हैं।</p>
    </div>`;
}

// ===== END FEATURE FUNCTION: SHUBH MUHURAT =====

// ===== START FEATURE FUNCTION: KUNDLI =====
function renderKundli() {
  return `
    <div class="page-title">
      <div class="eyebrow muted">VEDIC ASTROLOGY</div>
      <h2>जन्म कुंडली</h2><p>अपना जन्म विवरण भरें।</p>
    </div>
    <div class="panel">
      <div class="panel-head"><div><h3>जन्म विवरण</h3><p>सटीक जन्म समय और जन्मस्थान भरें।</p></div><span class="panel-symbol blue-bg"></span></div>
      <form id="k-form">
        <div class="form-grid">
          <label>नाम (वैकल्पिक)<input id="k-name" placeholder="अपना नाम"></label>
          <label>जन्म तारीख़ (दिन/महीना/साल)
            <input id="k-date" type="date" min="1900-01-01" max="2100-12-31" autocomplete="off" required>
          </label>
          <label>जन्म समय<input id="k-time" type="time" value="12:00" required></label>
          <label>समय क्षेत्र
            <select id="k-zone">
              <option value="330">भारत (UTC +05:30)</option>
              <option value="0">UTC</option>
            </select>
          </label>
          <label class="birthplace-field">
            जन्म स्थान (शहर या गाँव)
            <input id="k-place" placeholder="जैसे Lucknow, London, New York" autocomplete="off" required>
          </label>
          <div id="k-place-results" class="birthplace-results"></div>
          <p id="k-place-status" class="birthplace-status">जन्मस्थान खोजें और सूची से सही शहर चुनें।</p>
          <label>अक्षांश (Latitude)<input id="k-lat" type="number" min="-90" max="90" step="any" required></label>
          <label>देशांतर (Longitude)<input id="k-lon" type="number" min="-180" max="180" step="any" required></label>
        </div>
        <button class="btn primary" type="submit">कुंडली बनाएँ →</button>
      </form>
      <div id="k-result"></div>
    </div>`;
}

let selectedBirthPlace = null;
let birthPlaceSearchNumber = 0;

function setupBirthPlaceSearch() {
  const input = $("#k-place");
  const results = $("#k-place-results");
  const status = $("#k-place-status");
  if (!input || !results || !status) return;

  selectedBirthPlace = null;
  const latInput = $("#k-lat");
  const lonInput = $("#k-lon");

  input.addEventListener("input", async () => {
    selectedBirthPlace = null;
    const query = input.value.trim();
    const searchNumber = ++birthPlaceSearchNumber;
    results.replaceChildren();
    if (latInput) latInput.value = "";
    if (lonInput) lonInput.value = "";

    if (query.length < 2) {
      status.textContent = "कम-से-कम 2 अक्षर लिखें।";
      return;
    }

    status.textContent = "दुनिया भर में स्थान खोजे जा रहे हैं…";
    try {
      const places = await searchBirthPlaces(query);
      if (searchNumber !== birthPlaceSearchNumber) return;
      if (!places.length) {
        status.textContent = "स्थान नहीं मिला। शहर के साथ देश का नाम भी लिखें।";
        return;
      }

      status.textContent = "सही शहर चुनें:";
      for (const place of places) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "birthplace-option";
        const details = [place.region, place.country].filter(Boolean).join(", ");
        button.textContent = details ? `${place.name} — ${details}` : place.name;

        button.addEventListener("click", () => {
          selectedBirthPlace = place;
          input.value = [place.name, place.region, place.country]
            .filter(Boolean)
            .filter((value, index, array) => array.indexOf(value) === index)
            .join(", ");
          if (latInput) latInput.value = place.latitude.toFixed(6);
          if (lonInput) lonInput.value = place.longitude.toFixed(6);
          results.replaceChildren();
          status.textContent = `चुना गया: ${place.name} · ${place.timezone}`;

          const zone = $("#k-zone");
          if (zone) {
            zone.dataset.ianaTimezone = place.timezone;
            zone.dataset.locationSelected = "true";
          }
        });
        results.appendChild(button);
      }
    } catch (error) {
      if (searchNumber !== birthPlaceSearchNumber) return;
      console.error("Birthplace search failed:", error);
      status.textContent = "स्थान खोजने में समस्या हुई। इंटरनेट कनेक्शन जाँचकर फिर कोशिश करें।";
    }
  });
}


function render() {
  const root = $("#page-content");

  if (state.active === "home") {
    root.innerHTML = "";
  } else {
    const pages = {
      panchang: renderPanchang,
      calendar: renderCalendar,
      muhurat: renderMuhurat,
      kundli: renderKundli
    };

    const pageRenderer = pages[state.active];

    if (!pageRenderer) {
      state.active = "home";
      root.innerHTML = "";
    } else {
      root.innerHTML = pageRenderer();
    }
  }

  if (state.active === "kundli") {
    setupBirthPlaceSearch();
  }

  document
    .querySelectorAll(".bottom-nav [data-page]")
    .forEach((button) => {
      button.classList.toggle(
        "selected",
        button.dataset.page === state.active
      );
    });
}

function go(page) {
  state.active = page;
  render();
  window.scrollTo({
    top: $("#page-content").getBoundingClientRect().top + window.scrollY - 90,
    behavior: "smooth"
  });
}

document.addEventListener("click", async (e) => {
  const page = e.target.closest("[data-page]");

if (page) {
  const targets = {
    rashifal: "rashifal-section",
    "gun-milan": "gun-milan-section",
    numerology: "numerology-section",
    "kundli-doshas": "kundli-doshas-section"
  };

  const targetId = targets[page.dataset.page];

  if (targetId) {
    document.getElementById(targetId)?.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
    return;
  }

  go(page.dataset.page);
  return;
}
  const dateButton = e.target.closest("[data-date]");
  if (dateButton) {
    state.active = "calendar";
    setDate(dateButton.dataset.date);
    return;
  }
   const actionButton = e.target.closest("[data-action]");
const action = actionButton?.dataset.action;
if (!action) return;
  
if (action === "premium-show-date") {
  const input = $("#premium-date-input");
  if (input?.value) {
    setDate(input.value);
  }
  return;
}

  if (action === "refresh-daily") {
    const city = $("#daily-city")?.value?.trim();
    if (city) localStorage.setItem("arunodayaDailyCity", city);
    await loadDailyOverview(state.date || dateISO(new Date()));
    return;
  }

  if (action === "prev-month") {
    state.month = new Date(state.month.getFullYear(), state.month.getMonth() - 1, 1);
    render();
    return;
  }

  if (action === "next-month") {
    state.month = new Date(state.month.getFullYear(), state.month.getMonth() + 1, 1);
    render();
    return;
  }

  if (action === "show-panchang" || action === "show-muhurat") {
    const isPanchang = action === "show-panchang";
    const d = $(isPanchang ? "#p-date" : "#m-date").value;
    const placeInput = $(isPanchang ? "#p-place" : "#m-place");
    const result = $(isPanchang ? "#p-result" : "#m-result");
    const zoneEl = isPanchang ? $("#p-zone") : null;
    const offset = zoneEl ? Number(zoneEl.value) : 330;
    if (!d) { result.innerHTML = `<div class="result-box"><p>कृपया तारीख चुनें।</p></div>`; return; }
    if (actionButton.disabled) return;
    actionButton.disabled = true;
    const originalLabel = actionButton.textContent;
    actionButton.textContent = "गणना हो रही है…";
    result.innerHTML = `<div class="result-box"><p>खगोलीय गणना और स्थान खोजे जा रहे हैं…</p></div>`;
    try {
      const place = await geocodePanchangPlace(placeInput.value || "Lucknow, India");
      const data = await calculatePanchang({ date: d, lat: place.lat, lon: place.lon, timezoneMinutes: offset, place: place.name });
      const time = value => formatPanchangTime(value, offset);
      const dateTime = value => formatPanchangDateTime(value, offset);
      
const item = (label, value, end) => `
  <div class="summary-pill panchang-summary-item">
    <small class="panchang-label">${label}</small>
    <b class="panchang-value">${value}</b>
    ${end ? `<span class="panchang-end">समाप्ति: ${dateTime(end)}</span>` : ""}
  </div>
`;

      const period = (label, value) => `<div class="timing-item"><span class="timing-icon">◷</span><div><b>${label}</b><small>${value ? `${time(value.start)} – ${time(value.end)}` : "इस तारीख के लिए गणना उपलब्ध नहीं"}</small></div></div>`;
      const panchakText = data.panchak.active ? `पंचक चल रहा है${data.panchak.end ? ` · समाप्ति ${dateTime(data.panchak.end)}` : ""}` : `पंचक नहीं चल रहा${data.panchak.start ? ` · अगली शुरुआत ${dateTime(data.panchak.start)}` : ""}`;
      const common = `<div class="result-box"><h3>${fmtDate(d)}</h3><p>${data.place} · ${data.weekday}</p><div class="facts-grid">${item("तिथि", `${data.tithi.name} (${data.tithi.paksha})`, data.tithi.end)}${item("नक्षत्र", `${data.nakshatra.name} · पद ${data.nakshatra.pada}`, data.nakshatra.end)}${item("योग", data.yoga.name, data.yoga.end)}${item("करण", data.karana.name, data.karana.end)}${item("सूर्योदय", time(data.sunrise))}${item("सूर्यास्त", time(data.sunset))}</div><p><b>पंचक:</b> ${panchakText}</p><p class="muted">${data.accuracyNote}</p></div>`;

const periodCard = (title, period, description) => {
  const start = period?.start
    ? time(period.start)
    : "गणना उपलब्ध नहीं";

  const end = period?.end
    ? time(period.end)
    : "";

  return `
    <div class="muhurat-card">
      <b>${title}</b>
      <div class="muhurat-time">
        ${start}${end ? ` – ${end}` : ""}
      </div>
      <small>${description}</small>
    </div>
  `;
};
const durmuhurtaCard = (periods) => {
  if (!Array.isArray(periods) || periods.length === 0) {
    return `
      <div class="muhurat-card">
        <b>दुर्मुहूर्त</b>
        <div class="muhurat-time">गणना उपलब्ध नहीं</div>
        <small>वार-विशिष्ट गणना</small>
      </div>
    `;
  }

  const times = periods.map(period => {
    if (!period?.start || !period?.end) return "";

    return `${time(period.start)} – ${time(period.end)}`;
  }).filter(Boolean);

  return `
    <div class="muhurat-card">
      <b>दुर्मुहूर्त</b>
      <div class="muhurat-time">
        ${times.length ? times.join("<br>") : "गणना उपलब्ध नहीं"}
      </div>
      <small>वार-विशिष्ट गणना</small>
    </div>
  `;
};
const muhuratCards = `
  <section class="panel muhurat-panel">
    <h3>आज के शुभ-अशुभ समय</h3>
    <p class="muted">
      ${data.place} · ${fmtDate(d)}
    </p>
    <div class="muhurat-grid">
      ${periodCard("राहुकाल", data.periods?.rahu, "पारंपरिक अशुभ काल")}
      ${periodCard("अभिजीत मुहूर्त", data.periods?.abhijit, "परंपरागत शुभ काल")}
      ${periodCard("गुलिक काल", data.periods?.gulika, "पारंपरिक कालखंड")}
      ${periodCard("यमगण्ड काल", data.periods?.yamaganda, "पारंपरिक अशुभ काल")}
      ${periodCard("ब्रह्म मुहूर्त", data.periods?.brahma, "सूर्योदय से पहले")}
${durmuhurtaCard(data.periods?.durmuhurta)}
    </div>
  </section>
`;
      if (isPanchang) {
        result.innerHTML = common + muhuratCards;
        state.date = d;
        $("#global-date").value = d;
        $("#today-date").textContent = fmtDate(d, { day: "numeric", month: "long", year: "numeric" });
        $("#today-meta").textContent = `${data.weekday} · ${data.place}`;
      } else {
        result.innerHTML = common;
      }
    } catch (error) {
      console.error("Panchang calculation failed:", error);
      result.innerHTML = `<div class="result-box"><b>गणना पूरी नहीं हो सकी</b><p>${String(error?.message || "अज्ञात त्रुटि").replace(/[<>]/g, "")}</p><p>इंटरनेट कनेक्शन और शहर का नाम जाँचें, फिर दोबारा कोशिश करें।</p></div>`;
    } finally {
      actionButton.disabled = false;
      actionButton.textContent = originalLabel;
    }
    return;
  }

  if (action === "use-location") {
    if (!navigator.geolocation) {
      alert("इस ब्राउज़र में GPS लोकेशन सुविधा उपलब्ध नहीं है।");
      return;
    }

    actionButton.disabled = true;
    actionButton.textContent = "लोकेशन प्राप्त हो रही है…";

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        $("#k-lat").value = lat.toFixed(6);
        $("#k-lon").value = lon.toFixed(6);
        selectedBirthPlace = null;

        try {
          const url = new URL("https://nominatim.openstreetmap.org/reverse");
          url.searchParams.set("format", "jsonv2");
          url.searchParams.set("lat", String(lat));
          url.searchParams.set("lon", String(lon));
          const response = await fetch(url.toString());
          if (!response.ok) throw new Error("स्थान का नाम नहीं मिल पाया।");
          const data = await response.json();
          const a = data.address || {};
          const place = [a.city || a.town || a.village || a.county, a.state, a.country]
            .filter(Boolean);
          if (place.length) $("#k-place").value = [...new Set(place)].join(", ");
          $("#k-place-status").textContent =
            "GPS स्थान भरा गया है। कुंडली बनाने के लिए जन्मस्थान को खोजकर सूची से चुनें।";
          alert("वर्तमान GPS coordinates भर दिए गए हैं। जन्मस्थान अलग है तो उसे खोजकर सूची से चुनें।");
        } catch (err) {
          console.warn("Reverse geocoding failed:", err);
          alert("Coordinates भर दिए गए हैं, लेकिन स्थान का नाम प्राप्त नहीं हुआ।");
        } finally {
          actionButton.disabled = false;
        }
      },
      (err) => {
        const messages = {
          1: "लोकेशन की अनुमति नहीं मिली। ब्राउज़र सेटिंग में अनुमति दें।",
          2: "डिवाइस की लोकेशन उपलब्ध नहीं है।",
          3: "लोकेशन प्राप्त करने में समय समाप्त हो गया। फिर कोशिश करें।"
        };
        alert(messages[err.code] || "लोकेशन प्राप्त नहीं हो सकी।");
        actionButton.disabled = false;
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
    );
  }
});

$("#global-date").addEventListener("change", (e) => {
  if (e.target.value) {
    setDate(e.target.value);
    go("panchang");
  }
});

document.addEventListener("submit", async (e) => {
  if (e.target.id !== "k-form") return;
  e.preventDefault();

  const form = e.target;
  const result = $("#k-result");
  const submitButton = form.querySelector('[type="submit"]');
  if (submitButton) submitButton.disabled = true;

  result.innerHTML = `
    <div class="result-box">
      <b>गणना शुरू हो रही है…</b>
      <p>जन्म विवरण की जाँच की जा रही है।</p>
    </div>`;

  try {
    const bd = parseBirthDateISO($("#k-date").value);
    if (!bd.ok) throw new Error(bd.error);
    const yyyy = String(bd.year);
    const mm = String(bd.month).padStart(2, "0");
    const dd = String(bd.day).padStart(2, "0");

    const time = $("#k-time").value;
    if (!/^\d{2}:\d{2}$/.test(time)) throw new Error("जन्म समय सही भरें।");

    if (!selectedBirthPlace) {
      throw new Error("जन्मस्थान लिखकर खोजें और सूची से सही शहर चुनें।");
    }

    const timezoneMinutes = getBirthTimezoneOffset(
      `${yyyy}-${mm}-${dd}`,
      time,
      selectedBirthPlace.timezone
    );

    const lat = Number(selectedBirthPlace.latitude);
    const lon = Number(selectedBirthPlace.longitude);

    if (
      !Number.isFinite(lat) || lat < -90 || lat > 90 ||
      !Number.isFinite(lon) || lon < -180 || lon > 180
    ) {
      throw new Error("चुने गए स्थान के अक्षांश या देशांतर सही नहीं हैं।");
    }

    const payload = {
      name: $("#k-name").value.trim(),
      date: `${yyyy}-${mm}-${dd}`,
      time,
      timezoneMinutes,
      lat,
      lon,
      place: selectedBirthPlace.name
    };

    result.innerHTML = `
      <div class="result-box">
        <b>कुंडली की गणना हो रही है…</b>
        <p>सर्वर से परिणाम प्राप्त किए जा रहे हैं।</p>
      </div>`;

    let timeoutId;
    const timeout = new Promise((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error(
          "30 सेकंड में गणना पूरी नहीं हुई। सर्वर की loading जाँचनी होगी।"
        ));
      }, 30000);
    });

    try {
      const kundliData = await Promise.race([buildKundliData(payload), timeout]);

      result.dataset.kundliData = JSON.stringify(kundliData);
      result.innerHTML = buildKundliHtml(kundliData);

addKundliPdfButton(result, () => {
  const raw = result.dataset.kundliData;
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
});
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (err) {
    console.error("Kundli calculation failed:", err);
    result.innerHTML = `
      <div class="result-box error-box">
        <b>कुंडली नहीं बन सकी</b>
        <p>${String(err?.message || err)}</p>
      </div>`;
  } finally {
    if (submitButton) submitButton.disabled = false;
  }
});

// Keep the home-page daily Panchang in sync if the page remains open across midnight.
let lastAutomaticDate = dateISO(new Date());
setInterval(() => {
  const currentDate = dateISO(new Date());
  if (currentDate !== lastAutomaticDate) {
    lastAutomaticDate = currentDate;
    state.month = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    setDate(currentDate);
  }
}, 60_000);

const HOME_TZ = "Asia/Kolkata";

function homeTodayIST() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: HOME_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date());

  const p = {};
  for (const item of parts) p[item.type] = item.value;
  return `${p.year}-${p.month}-${p.day}`;
}

function homeEscape(value) {
  return String(value ?? "").replace(/[&<>"']/g, ch => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[ch]);
}

function homeDateLabel(date) {
  return new Intl.DateTimeFormat("hi-IN", {
    dateStyle: "full",
    timeZone: "UTC"
  }).format(new Date(`${date}T12:00:00Z`));
}

// ===== END FEATURE FUNCTION: KUNDLI =====

// ===== START FEATURE FUNCTION: DAILY LAGNA CALCULATION =====
async function loadHomeLagna() {
  const result = document.querySelector("#home-lagna-result");
  const date = state.date || homeTodayIST();
  const city = document.querySelector("#home-lagna-city")?.value.trim()
    || "Lucknow, India";

  if (!result) return;

  result.innerHTML = "<p>लग्न की गणना हो रही है…</p>";

  try {
    const place = await geocodePanchangPlace(city);
    if (!place || !Number.isFinite(Number(place.lat))
        || !Number.isFinite(Number(place.lon))) {
      throw new Error("शहर का स्थान नहीं मिल सका।");
    }

    const data = await getLagnaData({
      date,
      place,
      timezone: "Asia/Kolkata"
    });

    const rows = data.windows.map(w => {
      const start = data.formatTime(w.start);
      const end = data.formatTime(w.end);
      const sign = RASHIS[w.sign];

      const dateSuffix = (d, nextDay) => {
        if (!nextDay) return "";
        const formatted = new Intl.DateTimeFormat("hi-IN", {
          day: "numeric",
          month: "short",
          timeZone: "UTC"
        }).format(new Date(d.getTime() + data.displayOffset * 60000));
        return `, ${formatted}`;
      };

      return `
        <div class="timing-item">
          <span class="timing-icon">${sign.symbol}</span>
          <div>
            <b>${homeEscape(sign.name)} लग्न</b>
            <small>
              ${start}${dateSuffix(w.start, w.startNextDay)}
              – ${end}${dateSuffix(w.end, w.endNextDay)}
            </small>
          </div>
        </div>`;
    }).join("");

    document.querySelector("#home-lagna-date").textContent =
      `${homeDateLabel(date)} · ${homeEscape(place.name || city)} · IST`;

    result.innerHTML = rows || "<p>इस तारीख़ का लग्न समय उपलब्ध नहीं है।</p>";
  } catch (error) {
    result.innerHTML = `
      <p>लग्न समय उपलब्ध नहीं हो सका।</p>
      <p>${homeEscape(error.message)}</p>`;
  }
}


// ===== END FEATURE FUNCTION: DAILY LAGNA CALCULATION =====

// ===== START FEATURE FUNCTION: TODAY FESTIVAL DATA =====
async function loadHomeFestivals() {
  const result = document.querySelector("#home-festival-result");
  const date = state.date || homeTodayIST();

  if (!result) return;

    const dateElement = document.querySelector("#home-festival-date");
  if (dateElement) {
    dateElement.textContent = homeDateLabel(date) + " · IST";
  }

  // ---- सहायक (सब इसी function के अंदर) ----
  const FEST_TZ = "Asia/Kolkata";
  const FEST_DAYS = 30; // आगे के कितने दिन दिखाने हैं
  const FEST_IMG_DIR = "assets/festivals/";
  // जिनकी तस्वीर है उनके id (फ़ाइल: assets/festivals/<id>.webp)। न हो तो आइकन दिखता है।
  const FEST_IMAGE_IDS = new Set([
    "diwali", "dhanteras", "narak-chaturdashi", "govardhan-puja", "bhai-dooj", "chhath", "karwa-chauth", "ahoi-ashtami",
    "dussehra", "durga-ashtami", "maha-navami", "sharad-navratri", "chaitra-navratri", "sharad-purnima", "dev-uthani", "tulsi-vivah",
    "kartik-purnima", "dev-diwali", "holi", "holika-dahan", "maha-shivaratri", "ram-navami", "hanuman-jayanti", "janmashtami",
    "raksha-bandhan", "ganesh-chaturthi", "anant-chaturdashi", "guru-purnima", "rath-yatra", "makar-sankranti", "lohri", "vasant-panchami",
    "akshaya-tritiya", "buddha-purnima", "mahavir-jayanti", "ugadi", "nag-panchami", "hartalika-teej", "hariyali-teej", "pitru-paksha",
    "sarva-pitru-amavasya", "ekadashi", "pradosh", "sankashti", "purnima", "amavasya", "chandra-grahan", "surya-grahan",
    "republic-day", "independence-day", "gandhi-jayanti"
  ]);
  const FEST_ICON = { festival: "•", vrat: "•", grahan: "•", national: "•" };
  const FEST_MONTHS = ["जनवरी", "फ़रवरी", "मार्च", "अप्रैल", "मई", "जून", "जुलाई", "अगस्त", "सितंबर", "अक्टूबर", "नवंबर", "दिसंबर"];
  const FEST_WEEKDAYS = ["रविवार", "सोमवार", "मंगलवार", "बुधवार", "गुरुवार", "शुक्रवार", "शनिवार"];

  const festTime = d => new Intl.DateTimeFormat("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true, timeZone: FEST_TZ }).format(d);
  const festDT = d => new Intl.DateTimeFormat("hi-IN", { day: "numeric", month: "short", timeZone: FEST_TZ }).format(d) + ", " + festTime(d);
  const festIstDay = d => new Date(d.getTime() + 330 * 60000).toISOString().slice(0, 10);
  // उसी तारीख़ का समय हो तो सिर्फ़ घड़ी, वरना तारीख़ भी (अगली तारीख़ वाले समय पर तारीख़ साथ में)
  const festAt = (d, base) => (festIstDay(d) === base ? festTime(d) : festDT(d));
  const festShortDate = dt => {
    const [, m, d] = dt.split("-").map(Number);
    return FEST_WEEKDAYS[new Date(dt + "T12:00:00Z").getUTCDay()] + ", " + d + " " + FEST_MONTHS[m - 1];
  };
  const festRel = n => (n === 1 ? "कल" : n === 2 ? "परसों" : n + " दिन बाद");

  const festRow = (item, dt, rel) => {
    const lines = [];
    if (rel) lines.push(festShortDate(dt) + " · " + rel);
    if (item.tithiStart && item.tithiEnd) {
      lines.push(item.tithiLabel + " तिथि: " + festDT(item.tithiStart) + " से " + festDT(item.tithiEnd) + " तक");
    } else if (item.note && !(item.muhurtas && item.muhurtas.length)) {
      lines.push(item.note);
    }
    for (const m of item.muhurtas || []) {
      lines.push(m.label + ": " + festAt(m.start, dt) + (m.end ? " – " + festAt(m.end, dt) : ""));
    }
    const title = item.name + (item.dayNo ? " · दिन " + item.dayNo + "/" + item.dayTotal : "");
    const glyph = FEST_ICON[item.kind] || "•";
    const icon = FEST_IMAGE_IDS.has(item.id)
      ? `<img class="home-fest-img" src="${homeEscape(FEST_IMG_DIR + item.id + ".webp")}" alt="${homeEscape(item.name)}" width="28" height="28" loading="lazy" data-glyph="${homeEscape(glyph)}">`
      : glyph;
    return `
        <div class="timing-item">
          <span class="timing-icon">${icon}</span>
          <div>
            <b>${homeEscape(title)}</b>
            ${lines.length ? `<small>${lines.map(homeEscape).join("<br>")}</small>` : ""}
          </div>
        </div>`;
  };

  try {
    const engine = await import("./festival-calendar.js");

    if (typeof engine.getFestivalsForDate !== "function") {
      result.innerHTML =
        "<p>त्योहारों की गणना उपलब्ध नहीं है।</p>";
      return;
    }

    const place = engine.DEFAULT_PLACE;

    // आज के व्रत-त्योहार (कुछ न हो तो खाली)
    const today = await engine.getFestivalsForDate(date, place);

    // अगले 30 दिन (जिस दिन कुछ नहीं, वह दिन अपने-आप छूट जाता है)
    const upcoming = typeof engine.getUpcomingFestivals === "function"
      ? await engine.getUpcomingFestivals(date, FEST_DAYS, place)
      : [];

    // आज कुछ न हो तो शीर्षक "आने वाले त्योहार" हो जाता है
    const heading = document.querySelector("#home-festival-section h2");
    if (heading) {
      heading.textContent = Array.isArray(today) && today.length ? "आज के त्योहार" : "आने वाले त्योहार";
    }

    let html = "";
    if (Array.isArray(today) && today.length) {
      html += "<p><b>आज</b></p>" + today.map(f => festRow(f, date, "")).join("");
    }
    if (upcoming.length) {
      html += "<p><b>आने वाले दिन (अगले " + FEST_DAYS + " दिन)</b></p>" +
        upcoming.map(u => u.items.map(f => festRow(f, u.date, festRel(u.daysAway))).join("")).join("");
    }
    if (!html) {
      html = "<p>अगले " + FEST_DAYS + " दिनों में कोई व्रत या त्योहार दर्ज नहीं है।</p>";
    }

    result.innerHTML = html;

    // तस्वीर न खुले तो आइकन (लेआउट नहीं बिगड़ता)
    result.querySelectorAll("img.home-fest-img").forEach(img => {
      const fallback = () => { img.replaceWith(document.createTextNode(img.dataset.glyph || "•")); };
      img.addEventListener("error", fallback, { once: true });
      if (img.complete && img.naturalWidth === 0) fallback();
    });

  } catch (error) {
    console.error("Home festival loading failed:", error);
    result.innerHTML =
      "<p>त्योहारों की जानकारी लोड नहीं हो सकी। कृपया बाद में पुनः प्रयास करें।</p>";
  }
  }

// ===== START FEATURE FUNCTION: HOME DAILY SECTIONS REFRESH =====
function loadHomeDailySections() {
  if (state.active !== "home") return;
  loadHomeLagna();
  loadHomeFestivals();
}

mountDailyExtras(document.querySelector("#home-extras-result"));
mountRashifal(document.querySelector("#rashifal-app"));

mountGunMilan(
  document.querySelector("#milan-app"),
  { geocode: geocodePanchangPlace }
);

mountNumerology(document.querySelector("#numerology-app"));
mountKundliDoshas(
  document.querySelector("#kundli-app"),
  { geocode: geocodePanchangPlace }
);

// ===== END FEATURE FUNCTION: HOME DAILY SECTIONS REFRESH =====

document.querySelector("#home-lagna-load")
  ?.addEventListener("click", loadHomeLagna);
mountDailyExtras(document.querySelector("#home-extras-result"));

// चुनी हुई तारीख़ बदलने पर होम सेक्शन भी अपडेट करें।
const originalSetDate = setDate;
setDate = function(date) {
  originalSetDate(date);
  loadHomeDailySections();
};

loadHomeDailySections();

autoRefreshPanchangSummary(
  document.querySelector("#home-panchang-result"),
  document.querySelector("#home-panchang-date")
);

// Drik-style dashboard (additive)
mountDashboard();
mountPages();
