/* Arunodaya AI Sahayak - floating AI agent widget (theme-aware). File: public/arunodaya-chat.js */
(function () {
  if (window.__apChatLoaded) return;
  window.__apChatLoaded = true;
  var API = "/api/chat", FB = "/api/feedback";
  var history = [], busy = false, ctx = null, rated = false, userMsgs = 0;

  /* ---------- आइकन (SVG) ---------- */
  var ROBOT = '<svg class="ap-ic" viewBox="0 0 64 64" aria-hidden="true" focusable="false"><path d="M32 22v-6" stroke="#fff" stroke-width="3" stroke-linecap="round"/><circle cx="32" cy="13" r="3.4" fill="#fff"/><rect x="7" y="31" width="5" height="11" rx="2.5" fill="#fff"/><rect x="52" y="31" width="5" height="11" rx="2.5" fill="#fff"/><rect x="14" y="22" width="36" height="29" rx="11" fill="#fff"/><circle class="apv-eye" cx="24" cy="35" r="3.8"/><circle class="apv-eye" cx="40" cy="35" r="3.8"/><path class="apv-mouth" d="M25 43q7 5.5 14 0" fill="none" stroke-width="2.8" stroke-linecap="round"/></svg>';
  var ROBOT_O = '<svg class="ap-ic" viewBox="0 0 64 64" aria-hidden="true" focusable="false" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"><path d="M32 20v-6"/><circle cx="32" cy="11" r="3" fill="#fff" stroke="none"/><rect x="14" y="20" width="36" height="28" rx="11"/><path d="M8 31v10M56 31v10"/><circle cx="25" cy="33" r="2.6" fill="#fff" stroke="none"/><circle cx="39" cy="33" r="2.6" fill="#fff" stroke="none"/><path d="M26 40q6 4.5 12 0"/></svg>';
  var LOGO = '<svg class="ap-logo" viewBox="0 0 64 64" aria-hidden="true" focusable="false"><rect width="64" height="64" rx="16" fill="#fff"/><path d="M12 44a20 20 0 0 1 40 0z" fill="#f2a13a"/><path d="M32 8v6M13 16l4 4M51 16l-4 4" stroke="#f2a13a" stroke-width="3" stroke-linecap="round" fill="none"/><text class="apv-barf" x="32" y="42" text-anchor="middle" font-size="30" font-weight="700">अ</text></svg>';
  var I_DOWN = '<svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 9l7 7 7-7"/></svg>';
  var I_X = '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" fill="none" stroke="#fff" stroke-width="2.8" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  var I_MIC = '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" fill="#fff"><path d="M12 15a3.5 3.5 0 0 0 3.5-3.5v-5a3.5 3.5 0 0 0-7 0v5A3.5 3.5 0 0 0 12 15zm6-3.5a1 1 0 0 0-2 0 4 4 0 0 1-8 0 1 1 0 0 0-2 0 6 6 0 0 0 5 5.9V20H9a1 1 0 0 0 0 2h6a1 1 0 0 0 0-2h-2v-2.6a6 6 0 0 0 5-5.9z"/></svg>';
  var I_SEND = '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" fill="#fff"><path d="M3.4 20.4l17.5-7.5a1 1 0 0 0 0-1.8L3.4 3.6a1 1 0 0 0-1.4 1.2L4 11l9 1-9 1-2 6.2a1 1 0 0 0 1.4 1.2z"/></svg>';
  var I_DOTS = '<svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true" fill="#fff"><circle cx="12" cy="5" r="2.2"/><circle cx="12" cy="12" r="2.2"/><circle cx="12" cy="19" r="2.2"/></svg>';
  var I_REFRESH = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 12a8 8 0 1 1-2.6-5.9"/><path d="M20 4v5h-5"/></svg>';
  function face(n) { // n: 5 (बहुत अच्छा) .. 1 (निराश)
    var eyes = { 5: '<path d="M7.5 11q1.7-2.4 3.4 0M13.1 11q1.7-2.4 3.4 0" fill="none"/>', 4: '<circle cx="9" cy="10.5" r="1.3" fill="#3a2a00" stroke="none"/><circle cx="15" cy="10.5" r="1.3" fill="#3a2a00" stroke="none"/>', 3: '<circle cx="9" cy="10.5" r="1.3" fill="#3a2a00" stroke="none"/><circle cx="15" cy="10.5" r="1.3" fill="#3a2a00" stroke="none"/>', 2: '<circle cx="9" cy="10.5" r="1.3" fill="#3a2a00" stroke="none"/><circle cx="15" cy="10.5" r="1.3" fill="#3a2a00" stroke="none"/>', 1: '<path d="M7.5 10.4q1.7 2 3.4 0M13.1 10.4q1.7 2 3.4 0" fill="none"/>' }[n];
    var mouth = { 5: '<path d="M7.5 14.2q4.5 5.2 9 0" fill="none"/>', 4: '<path d="M8.3 15q3.7 3.2 7.4 0" fill="none"/>', 3: '<path d="M8.8 16h6.4" fill="none"/>', 2: '<path d="M8.5 17q3.5-3 7 0" fill="none"/>', 1: '<path d="M8 18q4-4.6 8 0" fill="none"/>' }[n];
    return '<svg viewBox="0 0 24 24" width="44" height="44" aria-hidden="true" stroke="#3a2a00" stroke-width="1.4" stroke-linecap="round"><circle cx="12" cy="12" r="10.6" fill="#ffd23f"/>' + eyes + mouth + '</svg>';
  }
  var FACE_LABEL = { 5: "बहुत अच्छा", 4: "अच्छा", 3: "ठीक-ठाक", 2: "कमज़ोर", 1: "निराशाजनक" };

  /* ---------- CSS: रंग साइट की थीम से (--ap-*) ---------- */
  var css = `
  #ap-root{--ap-bar:#a80f0f;--ap-head:#5c5f63;--ap-headtx:#ffffff;--ap-panel:#ffffff;--ap-bg:#efefef;--ap-tx:#222222;--ap-acc:#b8650b;--ap-line:#5c5f63;--ap-field:#f5f5f5}
  #ap-root .apv-eye{fill:var(--ap-bar)}#ap-root .apv-mouth{stroke:var(--ap-bar)}#ap-root .apv-barf{fill:var(--ap-bar)}
  #ap-root button{font-family:"Noto Sans Devanagari",system-ui,sans-serif}
  #ap-btn{position:fixed;right:16px;bottom:calc(16px + env(safe-area-inset-bottom,0px));z-index:99999;width:64px;height:64px;padding:0;border:0;background:#fff;border-radius:50% 50% 6px 50%;box-shadow:0 4px 14px rgba(0,0,0,.4);cursor:pointer;display:flex;align-items:center;justify-content:center}
  #ap-btn .ap-in{width:48px;height:48px;border-radius:50%;background:var(--ap-bar);display:flex;align-items:center;justify-content:center}
  #ap-btn .ap-ic{width:32px;height:32px}
  #ap-btn::after{content:"";position:absolute;inset:-5px;border-radius:50% 50% 8px 50%;border:2px solid var(--ap-bar);opacity:0;animation:ap-pulse 2.8s ease-out infinite;pointer-events:none}
  @keyframes ap-pulse{0%{transform:scale(.96);opacity:.7}70%,100%{transform:scale(1.14);opacity:0}}
  #ap-tip{position:fixed;right:20px;bottom:calc(90px + env(safe-area-inset-bottom,0px));z-index:99998;max-width:240px;background:var(--ap-panel);color:var(--ap-tx);border:1px solid var(--ap-line);border-radius:14px 14px 4px 14px;padding:10px 14px;font:14px/1.5 "Noto Sans Devanagari",system-ui,sans-serif;box-shadow:0 4px 16px rgba(0,0,0,.25);display:none;cursor:pointer}
  #ap-tip.show{display:block}
  #ap-box{position:fixed;right:16px;bottom:calc(90px + env(safe-area-inset-bottom,0px));z-index:99999;width:min(390px,calc(100vw - 32px));height:min(590px,calc(100vh - 120px));display:none;flex-direction:column;background:var(--ap-panel);color:var(--ap-tx);border:1px solid var(--ap-line);border-radius:12px;overflow:hidden;box-shadow:0 10px 36px rgba(0,0,0,.4);font:15px/1.55 "Noto Sans Devanagari",system-ui,sans-serif}
  #ap-box.open{display:flex}
  #ap-h{background:var(--ap-bar);color:#fff;padding:10px 8px 10px 12px;display:flex;align-items:center;gap:10px;border-bottom:3px solid #f2a13a}
  #ap-h .ap-ic{width:44px;height:44px;flex:none}
  #ap-h .ap-t{flex:1;min-width:0}
  #ap-h b{font-size:16px;display:block;color:#fff}
  #ap-h .ap-on{display:flex;align-items:center;gap:6px;font-size:12px;color:#fff}
  #ap-h .ap-on i{width:8px;height:8px;border-radius:50%;background:#3ddc84;display:inline-block}
  #ap-h .ap-logo{width:28px;height:28px;flex:none}
  .ap-hb{background:none;border:0;cursor:pointer;padding:4px;display:flex;align-items:center;justify-content:center;border-radius:8px}
  #ap-log{flex:1;overflow-y:auto;padding:12px;background:var(--ap-bg);display:flex;flex-direction:column;gap:10px;position:relative}
  .ap-r{display:flex;gap:8px;align-items:flex-end}
  .ap-r.u{justify-content:flex-end}
  .ap-av{width:30px;height:30px;flex:none;border-radius:50%;background:var(--ap-bar);display:flex;align-items:center;justify-content:center}
  .ap-av .ap-ic{width:20px;height:20px}
  .ap-m{max-width:80%;padding:9px 12px;border-radius:14px;white-space:pre-wrap;word-wrap:break-word}
  .ap-b{background:var(--ap-field);color:var(--ap-tx);border:1px solid var(--ap-line);border-bottom-left-radius:4px}
  .ap-u{background:var(--ap-head);color:var(--ap-headtx);border-bottom-right-radius:4px}
  .ap-dots span{display:inline-block;width:7px;height:7px;margin:0 2px;border-radius:50%;background:var(--ap-bar);animation:ap-dot 1.1s infinite}
  .ap-dots span:nth-child(2){animation-delay:.18s}.ap-dots span:nth-child(3){animation-delay:.36s}
  @keyframes ap-dot{0%,80%,100%{opacity:.25;transform:translateY(0)}40%{opacity:1;transform:translateY(-3px)}}
  #ap-chips{display:grid;grid-template-columns:1fr 1fr;gap:8px;padding-left:38px}
  .ap-chip{background:var(--ap-panel);border:1.5px solid var(--ap-bar);color:var(--ap-bar);border-radius:10px;padding:9px 8px;font:inherit;font-size:13.5px;line-height:1.3;cursor:pointer;text-align:center}
  #ap-new{position:sticky;align-self:flex-end;bottom:0;margin-top:auto;background:none;border:0;color:var(--ap-bar);cursor:pointer;padding:4px;display:none}
  #ap-new.show{display:flex}
  #ap-f{position:relative;display:flex;align-items:center;gap:8px;padding:10px;background:var(--ap-bar)}
  #ap-in{flex:1;min-width:0;background:var(--ap-field);color:var(--ap-tx);border:0;border-radius:10px;padding:11px 12px;font:inherit}
  #ap-in::placeholder{color:var(--ap-tx);opacity:.55}
  #ap-act{width:44px;height:44px;flex:none;border-radius:50%;border:0;background:rgba(255,255,255,.22);cursor:pointer;display:flex;align-items:center;justify-content:center}
  #ap-act.rec{background:#e53935;animation:ap-pulse2 1.2s infinite}
  @keyframes ap-pulse2{50%{opacity:.6}}
  #ap-act:disabled{opacity:.5}
  #ap-menu{position:absolute;left:8px;bottom:62px;background:var(--ap-panel);color:var(--ap-tx);border:1px solid var(--ap-line);border-radius:10px;box-shadow:0 6px 20px rgba(0,0,0,.35);display:none;overflow:hidden;z-index:4}
  #ap-menu.show{display:block}
  #ap-menu button{display:block;width:100%;text-align:left;background:none;border:0;color:var(--ap-tx);padding:11px 16px;font:inherit;font-size:14px;cursor:pointer;white-space:nowrap}
  #ap-menu button+button{border-top:1px solid var(--ap-line)}
  #ap-pw{text-align:center;font-size:11px;color:#fff;background:var(--ap-bar);padding:0 0 8px;opacity:.9}
  #ap-ov{position:absolute;inset:0;background:rgba(0,0,0,.55);display:none;align-items:center;justify-content:center;z-index:6;padding:16px}
  #ap-ov.show{display:flex}
  .ap-modal{position:relative;width:100%;max-width:320px;background:var(--ap-panel);color:var(--ap-tx);border-radius:14px;padding:22px 18px 18px;text-align:center}
  .ap-modal h3{margin:6px 0 6px;font-size:18px;line-height:1.4;font-weight:700;color:var(--ap-tx)}
  .ap-modal .ap-s{margin:0 0 14px;font-size:14.5px;opacity:.85;color:var(--ap-tx)}
  .ap-mx{position:absolute;right:8px;top:6px;background:none;border:0;font-size:24px;line-height:1;color:var(--ap-tx);cursor:pointer;padding:4px 8px}
  .ap-mb{display:flex;gap:10px;justify-content:center;margin:6px 0 4px}
  .ap-mb button{background:var(--ap-panel);border:1.5px solid var(--ap-bar);color:var(--ap-bar);border-radius:8px;padding:9px 18px;font:inherit;font-size:15px;cursor:pointer}
  .ap-mb button.pri{background:var(--ap-bar);color:#fff}
  .ap-faces{display:flex;justify-content:center;gap:6px;margin:10px 0 6px}
  .ap-faces button{background:none;border:0;padding:2px;cursor:pointer;border-radius:50%;transition:transform .12s}
  .ap-faces button:hover,.ap-faces button:focus-visible{transform:scale(1.18)}
  .ap-skip{background:none;border:0;color:var(--ap-tx);opacity:.7;text-decoration:underline;font:inherit;font-size:13px;cursor:pointer;margin-top:6px}
  #ap-root button:focus-visible,#ap-in:focus-visible{outline:3px solid #f2a13a;outline-offset:2px}
  @media (prefers-reduced-motion:reduce){#ap-btn::after,.ap-dots span,#ap-act.rec{animation:none}.ap-faces button{transition:none}}
  `;
  var st = document.createElement("style");
  st.textContent = css;
  document.head.appendChild(st);
  var font = document.createElement("link");
  font.rel = "stylesheet";
  font.href = "https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;600;700&display=swap";
  document.head.appendChild(font);

  /* ---------- DOM ---------- */
  var wrap = document.createElement("div");
  wrap.id = "ap-root";
  wrap.innerHTML =
    '<div id="ap-tip" role="status">नमस्ते! पंचांग, मुहूर्त या कुंडली में कुछ पूछना है?</div>' +
    '<button id="ap-btn" aria-expanded="false" aria-controls="ap-box" aria-label="अरुणोदय AI सहायक खोलें"><span class="ap-in">' + ROBOT + '</span></button>' +
    '<section id="ap-box" role="dialog" aria-label="अरुणोदय AI सहायक">' +
    '<div id="ap-h">' + ROBOT_O + '<div class="ap-t"><b>अरुणोदय AI सहायक</b><span class="ap-on"><i></i>ऑनलाइन</span></div>' + LOGO +
    '<button class="ap-hb" id="ap-min" aria-label="छोटा करें">' + I_DOWN + '</button><button class="ap-hb" id="ap-x" aria-label="चैट बंद करें">' + I_X + '</button></div>' +
    '<div id="ap-log" aria-live="polite"><button id="ap-new" aria-label="नई चैट शुरू करें">' + I_REFRESH + '</button></div>' +
    '<form id="ap-f"><div id="ap-menu" role="menu"><button type="button" data-m="new">नई चैट शुरू करें</button><button type="button" data-m="end">चैट बंद करें</button></div>' +
    '<button type="button" class="ap-hb" id="ap-dots" aria-label="विकल्प" aria-haspopup="true">' + I_DOTS + '</button>' +
    '<input id="ap-in" type="text" maxlength="500" placeholder="अपना संदेश यहाँ लिखें" autocomplete="off" aria-label="अपना संदेश लिखें">' +
    '<button type="button" id="ap-act" aria-label="बोलकर लिखें">' + I_MIC + '</button></form>' +
    '<div id="ap-pw">अरुणोदय पंचांग · AI के जवाब मार्गदर्शन हैं</div>' +
    '<div id="ap-ov" role="dialog" aria-modal="true"><div class="ap-modal" id="ap-modal"></div></div>' +
    "</section>";
  document.body.appendChild(wrap);

  var $ = function (id) { return document.getElementById(id); };
  var box = $("ap-box"), log = $("ap-log"), input = $("ap-in"), act = $("ap-act"), btn = $("ap-btn"), tip = $("ap-tip"),
      ov = $("ap-ov"), modal = $("ap-modal"), menu = $("ap-menu"), newBtn = $("ap-new"), form = $("ap-f");

  /* ---------- थीम सिंक: साइट की थीम बदलते ही चैटबॉट के रंग भी बदलते हैं ---------- */
  var lastTheme = "";
  function applyTheme() {
    var b = document.body, h = document.documentElement, home = b.classList.contains("dash-on");
    var cs = getComputedStyle(home ? b : h);
    function g(n, d) { var v = (cs.getPropertyValue(n) || "").trim(); return v || d; }
    var t = home ? {
      bar: g("--bar", "#a80f0f"), head: g("--dhead", "#5c5f63"), headtx: g("--dheadtx", "#ffffff"), panel: g("--dcard", "#ffffff"),
      bg: g("--dbg", "#efefef"), tx: g("--dtxt", "#222222"), acc: g("--dacc", "#b8650b"), line: g("--pborder", "#5c5f63"), field: g("--soft", "#f5f5f5")
    } : {
      bar: g("--bar", "#a80f0f"), head: g("--head", "#5c5f63"), headtx: g("--headtx", "#ffffff"), panel: g("--panel", "#ffffff"),
      bg: g("--bg", "#efefef"), tx: g("--tx", "#222222"), acc: g("--acc", "#b8650b"), line: g("--bd", "#5c5f63"), field: g("--field", "#f5f5f5")
    };
    var key = JSON.stringify(t);
    if (key === lastTheme) return;
    lastTheme = key;
    for (var k in t) wrap.style.setProperty("--ap-" + k, t[k]);
  }
  applyTheme();
  try {
    var mo = new MutationObserver(applyTheme);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    mo.observe(document.body, { attributes: true, attributeFilter: ["class"] });
  } catch (e) {}
  window.addEventListener("storage", applyTheme);
  window.addEventListener("load", applyTheme);
  document.addEventListener("visibilitychange", applyTheme);
  setTimeout(applyTheme, 600);
  setTimeout(applyTheme, 2500);

  /* ---------- चैट ---------- */
  function add(text, who) {
    var row = document.createElement("div");
    row.className = "ap-r" + (who === "u" ? " u" : "");
    if (who !== "u") row.insertAdjacentHTML("beforeend", '<span class="ap-av">' + ROBOT + "</span>");
    var d = document.createElement("div");
    d.className = "ap-m " + (who === "u" ? "ap-u" : "ap-b");
    if (text === null) d.innerHTML = '<span class="ap-dots" aria-label="लिख रहा हूँ"><span></span><span></span><span></span></span>';
    else d.textContent = text;
    row.appendChild(d);
    log.insertBefore(row, newBtn);
    log.scrollTop = log.scrollHeight;
    return d;
  }

  function start() {
    add("नमस्ते! मैं अरुणोदय AI सहायक हूँ। पंचांग, चौघड़िया, राहुकाल, मुहूर्त, राशिफल, व्रत-त्योहार और ज्योतिष के किसी भी विषय पर पूछ सकते हैं। अपनी जन्म तारीख़, जन्म समय और जन्म स्थान बताएँ तो मैं आपकी कुंडली का विश्लेषण भी करूँगा (रोज़ 10 बार)।", "b");
    var chips = document.createElement("div");
    chips.id = "ap-chips";
    ["मेरी कुंडली का विश्लेषण", "आज का पंचांग", "आज का राहुकाल", "कुंडली मिलान", "आने वाले त्योहार", "साइट पर कौन-सी सेवाएँ हैं?"].forEach(function (q) {
      var c = document.createElement("button");
      c.className = "ap-chip";
      c.type = "button";
      c.textContent = q;
      c.onclick = function () { chips.remove(); ask(q); };
      chips.appendChild(c);
    });
    log.insertBefore(chips, newBtn);
  }

  function resetChat() {
    history = []; ctx = null; userMsgs = 0;
    Array.prototype.slice.call(log.children).forEach(function (n) { if (n !== newBtn) n.remove(); });
    newBtn.classList.remove("show");
    start();
  }

  async function ask(text) {
    if (busy || !text.trim()) return;
    busy = true; userMsgs++;
    newBtn.classList.add("show");
    var chips = $("ap-chips"); if (chips) chips.remove();
    add(text, "u");
    history.push({ role: "user", content: text });
    var wait = add(null, "b");
    try {
      var r = await fetch(API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: history, ctx: ctx }) });
      if (!r.ok) throw new Error("http");
      var data = await r.json();
      if (data.ctx) ctx = data.ctx;
      var reply = data.reply || "माफ़ कीजिए, अभी जवाब नहीं मिल पाया। कृपया दोबारा कोशिश करें।";
      wait.textContent = reply;
      history.push({ role: "assistant", content: reply });
    } catch (e) {
      wait.textContent = "कनेक्शन में दिक़्क़त आई। कृपया थोड़ी देर बाद दोबारा कोशिश करें, या 'संपर्क करें' पेज देखें।";
      history.pop();
    }
    busy = false;
    log.scrollTop = log.scrollHeight;
    input.focus();
  }

  /* ---------- खुलना / छोटा करना / बाहर निकलना ---------- */
  function hideTip() { tip.classList.remove("show"); try { sessionStorage.setItem("ap-tip", "1"); } catch (e) {} }
  function toggle(open) {
    box.classList.toggle("open", open);
    btn.setAttribute("aria-expanded", String(open));
    if (open) { hideTip(); if (!log.querySelector(".ap-r")) start(); input.focus(); }
    else { closeMenu(); }
  }
  function closeMenu() { menu.classList.remove("show"); }
  function showModal(html) { modal.innerHTML = html; ov.classList.add("show"); var f = modal.querySelector("button[data-a]"); if (f) f.focus(); }
  function hideModal() { ov.classList.remove("show"); modal.innerHTML = ""; }

  function askLeave(mode) { // mode: "end" (बाहर निकलना) या "new" (नई चैट)
    closeMenu();
    var end = mode === "end";
    showModal('<button class="ap-mx" data-a="cancel" aria-label="बंद करें">×</button>' +
      '<h3>' + (end ? "क्या आप सच में बाहर निकलना चाहते हैं?" : "नई चैट शुरू करें?") + '</h3>' +
      '<div class="ap-s">सारी चैट हिस्ट्री मिट जाएगी!</div>' +
      '<div class="ap-mb"><button class="pri" data-a="' + mode + '">पुष्टि करें</button><button data-a="cancel">रद्द करें</button></div>');
  }

  function showRating() {
    var fs = "";
    for (var n = 5; n >= 1; n--) fs += '<button data-a="rate" data-n="' + n + '" aria-label="' + FACE_LABEL[n] + '" title="' + FACE_LABEL[n] + '">' + face(n) + "</button>";
    showModal('<h3>क्या मैं मददगार था?</h3><div class="ap-s">आपकी राय हमारे लिए मायने रखती है!</div><div class="ap-faces">' + fs + '</div><button class="ap-skip" data-a="skip">छोड़ें</button>');
  }

  function finishExit() { hideModal(); resetChat(); toggle(false); }

  function sendRating(n) {
    rated = true;
    try { fetch(FB, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rating: n }), keepalive: true }); } catch (e) {}
    showModal('<h3>धन्यवाद!</h3><div class="ap-s">आपकी राय के लिए आभार। फिर मिलेंगे। 🙏</div>');
    setTimeout(finishExit, 1400);
  }

  ov.addEventListener("click", function (e) {
    var a = e.target.closest ? e.target.closest("[data-a]") : null;
    if (!a) { if (e.target === ov) hideModal(); return; }
    var k = a.getAttribute("data-a");
    if (k === "cancel") hideModal();
    else if (k === "new") { hideModal(); resetChat(); }
    else if (k === "end") {
      var had = userMsgs > 0;
      if (had && !rated) showRating(); else finishExit();
    }
    else if (k === "rate") sendRating(+a.getAttribute("data-n"));
    else if (k === "skip") finishExit();
  });

  /* ---------- माइक / भेजना ---------- */
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition, rec = null, listening = false;
  function syncAct() {
    var has = input.value.trim().length > 0;
    if (listening) { act.innerHTML = I_MIC; act.className = "rec"; act.setAttribute("aria-label", "सुन रहा हूँ, रोकने के लिए दबाएँ"); }
    else if (has || !SR) { act.innerHTML = I_SEND; act.className = ""; act.setAttribute("aria-label", "भेजें"); act.disabled = !has && !SR; }
    else { act.innerHTML = I_MIC; act.className = ""; act.setAttribute("aria-label", "बोलकर लिखें"); act.disabled = false; }
  }
  function submit() { var t = input.value; if (!t.trim()) return; input.value = ""; syncAct(); ask(t); }
  function toggleMic() {
    if (listening && rec) { rec.stop(); return; }
    try {
      rec = new SR(); rec.lang = "hi-IN"; rec.interimResults = true; rec.continuous = false;
      rec.onresult = function (e) { var s = ""; for (var i = 0; i < e.results.length; i++) s += e.results[i][0].transcript; input.value = s; };
      rec.onend = function () { listening = false; syncAct(); input.focus(); };
      rec.onerror = function () { listening = false; syncAct(); };
      rec.start(); listening = true; syncAct();
    } catch (e) { listening = false; syncAct(); }
  }
  act.onclick = function () { if (input.value.trim()) submit(); else if (SR) toggleMic(); };
  input.addEventListener("input", syncAct);
  form.onsubmit = function (e) { e.preventDefault(); submit(); };
  syncAct();

  /* ---------- बाक़ी बटन ---------- */
  btn.onclick = function () { toggle(!box.classList.contains("open")); };
  tip.onclick = function () { toggle(true); };
  $("ap-min").onclick = function () { toggle(false); };
  $("ap-x").onclick = function () { askLeave("end"); };
  newBtn.onclick = function () { askLeave("new"); };
  $("ap-dots").onclick = function (e) { e.stopPropagation(); menu.classList.toggle("show"); };
  menu.addEventListener("click", function (e) { var m = e.target.getAttribute && e.target.getAttribute("data-m"); if (m) askLeave(m === "end" ? "end" : "new"); });
  document.addEventListener("click", function (e) { if (!menu.contains(e.target) && e.target !== $("ap-dots")) closeMenu(); });
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    if (ov.classList.contains("show")) hideModal(); else if (menu.classList.contains("show")) closeMenu(); else toggle(false);
  });

  // छोटा न्योता: हर विज़िट में एक बार, 3 सेकंड बाद
  var seen = false;
  try { seen = sessionStorage.getItem("ap-tip") === "1"; } catch (e) {}
  if (!seen) setTimeout(function () { if (!box.classList.contains("open")) { tip.classList.add("show"); setTimeout(hideTip, 9000); } }, 3000);
})();
