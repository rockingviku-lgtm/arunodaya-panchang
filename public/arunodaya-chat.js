/* Arunodaya AI Sahayak - floating AI agent widget. File: public/arunodaya-chat.js */
(function () {
  var API = "/api/chat";
  var history = [];
  var busy = false;
  var AV = '<svg class="ap-av" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32" cy="32" r="32" fill="#fff3cf"/><path d="M8 48a24 24 0 0 1 48 0z" fill="#f2b705"/><path d="M32 22v-6" stroke="#10264a" stroke-width="3" stroke-linecap="round"/><circle cx="32" cy="14" r="3.2" fill="#a81010"/><rect x="11" y="31" width="5" height="9" rx="2.5" fill="#a81010"/><rect x="48" y="31" width="5" height="9" rx="2.5" fill="#a81010"/><rect x="15" y="22" width="34" height="26" rx="10" fill="#10264a"/><circle cx="32" cy="27.5" r="1.7" fill="#a81010"/><circle cx="24.5" cy="35" r="3.6" fill="#f2b705"/><circle cx="39.5" cy="35" r="3.6" fill="#f2b705"/><circle cx="25.4" cy="34" r="1.1" fill="#fff"/><circle cx="40.4" cy="34" r="1.1" fill="#fff"/><path d="M26 42q6 5 12 0" stroke="#f2b705" stroke-width="2.4" fill="none" stroke-linecap="round"/></svg>';
  var LOGO = '<svg class="ap-logo" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="16" fill="#10264a"/><path d="M12 44a20 20 0 0 1 40 0z" fill="#f2b705"/><path d="M32 8v6M13 16l4 4M51 16l-4 4" stroke="#f2b705" stroke-width="3" stroke-linecap="round"/><text x="32" y="42" text-anchor="middle" font-size="30" font-weight="700" fill="#a81010" font-family="Noto Sans Devanagari, sans-serif">अ</text></svg>';

  var css = `
  #ap-btn{position:fixed;right:16px;bottom:calc(16px + env(safe-area-inset-bottom,0px));z-index:99999;display:flex;align-items:center;gap:10px;background:#10264a;color:#fff;border:2px solid #f2b705;border-radius:999px;padding:5px 18px 5px 5px;font:600 15px/1.2 "Noto Sans Devanagari",system-ui,sans-serif;box-shadow:0 6px 18px rgba(16,38,74,.4);cursor:pointer}
  #ap-btn .ap-av{width:46px;height:46px;flex:none}
  #ap-btn small{display:block;font-weight:400;font-size:11px;opacity:.85}
  #ap-btn::after{content:"";position:absolute;inset:-6px;border-radius:999px;border:2px solid #f2b705;opacity:0;animation:ap-pulse 2.8s ease-out infinite;pointer-events:none}
  @keyframes ap-pulse{0%{transform:scale(.96);opacity:.7}70%,100%{transform:scale(1.12);opacity:0}}
  #ap-tip{position:fixed;right:20px;bottom:calc(86px + env(safe-area-inset-bottom,0px));z-index:99998;max-width:240px;background:#fff;color:#1b1f27;border-radius:14px 14px 4px 14px;padding:10px 14px;font:14px/1.5 "Noto Sans Devanagari",system-ui,sans-serif;box-shadow:0 6px 20px rgba(16,38,74,.25);display:none;cursor:pointer}
  #ap-tip.show{display:block}
  #ap-box{position:fixed;right:16px;bottom:calc(86px + env(safe-area-inset-bottom,0px));z-index:99999;width:min(390px,calc(100vw - 32px));height:min(560px,calc(100vh - 120px));display:none;flex-direction:column;background:#fff;color:#1b1f27;border-radius:16px;overflow:hidden;box-shadow:0 12px 40px rgba(16,38,74,.35);font:15px/1.55 "Noto Sans Devanagari",system-ui,sans-serif}
  #ap-box.open{display:flex}
  #ap-h{background:#10264a;color:#fff;padding:10px 12px;display:flex;align-items:center;gap:10px;border-bottom:3px solid #f2b705}
  #ap-h .ap-av{width:44px;height:44px;flex:none}
  #ap-h .ap-t{flex:1;min-width:0}
  #ap-h b{font-size:16px;display:block}
  #ap-h small{display:flex;align-items:center;gap:6px;opacity:.9;font-size:12px}
  #ap-h small i{width:8px;height:8px;border-radius:50%;background:#3ddc84;display:inline-block}
  #ap-h .ap-logo{width:30px;height:30px;flex:none;opacity:.95}
  #ap-x{background:none;border:0;color:#fff;font-size:26px;line-height:1;cursor:pointer;padding:2px 6px}
  #ap-log{flex:1;overflow-y:auto;padding:12px;background:#f5f3ee;display:flex;flex-direction:column;gap:10px}
  .ap-r{display:flex;gap:8px;align-items:flex-end}
  .ap-r.u{justify-content:flex-end}
  .ap-r .ap-av{width:28px;height:28px;flex:none}
  .ap-m{max-width:82%;padding:9px 12px;border-radius:14px;white-space:pre-wrap;word-wrap:break-word}
  .ap-b{background:#fff;border:1px solid #e3ded2;border-bottom-left-radius:4px}
  .ap-u{background:#10264a;color:#fff;border-bottom-right-radius:4px}
  .ap-dots span{display:inline-block;width:7px;height:7px;margin:0 2px;border-radius:50%;background:#a81010;animation:ap-dot 1.1s infinite}
  .ap-dots span:nth-child(2){animation-delay:.18s}.ap-dots span:nth-child(3){animation-delay:.36s}
  @keyframes ap-dot{0%,80%,100%{opacity:.25;transform:translateY(0)}40%{opacity:1;transform:translateY(-3px)}}
  #ap-chips{display:flex;flex-wrap:wrap;gap:6px;padding-left:36px}
  .ap-chip{background:#fff;border:1px solid #a81010;color:#a81010;border-radius:999px;padding:6px 12px;font:inherit;font-size:13px;cursor:pointer}
  #ap-f{display:flex;gap:8px;padding:10px;border-top:1px solid #e3ded2;background:#fff}
  #ap-in{flex:1;border:1px solid #c9c3b4;border-radius:12px;padding:10px;font:inherit;min-width:0}
  #ap-send{background:#a81010;color:#fff;border:0;border-radius:12px;padding:0 16px;font:600 15px inherit;cursor:pointer}
  #ap-send:disabled{opacity:.5}
  #ap-pw{text-align:center;font-size:11px;color:#6b6f78;padding:0 0 8px;background:#fff}
  #ap-btn:focus-visible,#ap-send:focus-visible,#ap-in:focus-visible,.ap-chip:focus-visible,#ap-x:focus-visible{outline:3px solid #f2b705;outline-offset:2px}
  @media (prefers-reduced-motion:reduce){#ap-btn::after,.ap-dots span{animation:none}}
  @media (prefers-color-scheme:dark){#ap-box{background:#1c2230;color:#eef0f5}#ap-log{background:#141925}.ap-b{background:#232b3c;border-color:#303a50;color:#eef0f5}#ap-f,#ap-pw{background:#1c2230;border-color:#303a50}#ap-pw{color:#9aa3b5}#ap-in{background:#141925;color:#eef0f5;border-color:#3a4560}.ap-chip{background:#232b3c;color:#ffb3b3;border-color:#ffb3b3}#ap-tip{background:#232b3c;color:#eef0f5}}
  `;
  var st = document.createElement("style");
  st.textContent = css;
  document.head.appendChild(st);

  var font = document.createElement("link");
  font.rel = "stylesheet";
  font.href = "https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;600;700&display=swap";
  document.head.appendChild(font);

  var wrap = document.createElement("div");
  wrap.innerHTML =
    '<div id="ap-tip" role="status">नमस्ते 🙏 पंचांग, मुहूर्त या कुंडली में कुछ पूछना है?</div>' +
    '<button id="ap-btn" aria-expanded="false" aria-controls="ap-box" aria-label="अरुणोदय AI सहायक खोलें">' + AV + '<span>अरुणोदय AI<small>पंचांग सहायक</small></span></button>' +
    '<section id="ap-box" role="dialog" aria-label="अरुणोदय AI सहायक">' +
    '<div id="ap-h">' + AV + '<div class="ap-t"><b>अरुणोदय AI सहायक</b><small><i></i>AI सहायक · ऑनलाइन</small></div>' + LOGO + '<button id="ap-x" aria-label="बंद करें">×</button></div>' +
    '<div id="ap-log" aria-live="polite"></div>' +
    '<form id="ap-f"><input id="ap-in" type="text" maxlength="500" placeholder="अपना सवाल लिखें…" autocomplete="off" aria-label="अपना सवाल लिखें"><button id="ap-send" type="submit">भेजें</button></form>' +
    '<div id="ap-pw">अरुणोदय पंचांग · AI के जवाब मार्गदर्शन हैं</div>' +
    "</section>";
  document.body.appendChild(wrap);

  var $ = function (id) { return document.getElementById(id); };
  var box = $("ap-box"), log = $("ap-log"), input = $("ap-in"), send = $("ap-send"), btn = $("ap-btn"), tip = $("ap-tip");

  function add(text, who) {
    var row = document.createElement("div");
    row.className = "ap-r" + (who === "u" ? " u" : "");
    if (who !== "u") row.insertAdjacentHTML("beforeend", AV);
    var d = document.createElement("div");
    d.className = "ap-m " + (who === "u" ? "ap-u" : "ap-b");
    if (text === null) d.innerHTML = '<span class="ap-dots" aria-label="लिख रहा हूँ"><span></span><span></span><span></span></span>';
    else d.textContent = text;
    row.appendChild(d);
    log.appendChild(row);
    log.scrollTop = log.scrollHeight;
    return d;
  }

  function hideTip() {
    tip.classList.remove("show");
    try { sessionStorage.setItem("ap-tip", "1"); } catch (e) {}
  }

  function toggle(open) {
    box.classList.toggle("open", open);
    btn.setAttribute("aria-expanded", String(open));
    if (open) {
      hideTip();
      if (!log.children.length) start();
      input.focus();
    }
  }

  function start() {
    add("नमस्ते! मैं अरुणोदय AI सहायक हूँ। पंचांग, चौघड़िया, राहुकाल, मुहूर्त, राशिफल, कुंडली मिलान, दोष और व्रत-त्योहार के बारे में पूछ सकते हैं।", "b");
    var chips = document.createElement("div");
    chips.id = "ap-chips";
    ["आज का पंचांग", "आज का राहुकाल", "आने वाले त्योहार", "कुंडली मिलान", "साइट पर कौन-सी सेवाएँ हैं?"].forEach(function (q) {
      var c = document.createElement("button");
      c.className = "ap-chip";
      c.type = "button";
      c.textContent = q;
      c.onclick = function () { chips.remove(); ask(q); };
      chips.appendChild(c);
    });
    log.appendChild(chips);
  }

  async function ask(text) {
    if (busy || !text.trim()) return;
    busy = true;
    send.disabled = true;
    add(text, "u");
    history.push({ role: "user", content: text });
    var wait = add(null, "b");
    try {
      var r = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });
      if (!r.ok) throw new Error("http");
      var data = await r.json();
      var reply = data.reply || "माफ़ कीजिए, अभी जवाब नहीं मिल पाया। कृपया दोबारा कोशिश करें।";
      wait.textContent = reply;
      history.push({ role: "assistant", content: reply });
    } catch (e) {
      wait.textContent = "कनेक्शन में दिक़्क़त आई। कृपया थोड़ी देर बाद दोबारा कोशिश करें, या 'संपर्क करें' पेज देखें।";
      history.pop();
    }
    busy = false;
    send.disabled = false;
    log.scrollTop = log.scrollHeight;
    input.focus();
  }

  btn.onclick = function () { toggle(!box.classList.contains("open")); };
  tip.onclick = function () { toggle(true); };
  $("ap-x").onclick = function () { toggle(false); };
  $("ap-f").onsubmit = function (e) {
    e.preventDefault();
    var t = input.value;
    input.value = "";
    ask(t);
  };
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") toggle(false);
  });

  // छोटा न्योता: हर विज़िट में एक बार, 3 सेकंड बाद
  var seen = false;
  try { seen = sessionStorage.getItem("ap-tip") === "1"; } catch (e) {}
  if (!seen) {
    setTimeout(function () { if (!box.classList.contains("open")) { tip.classList.add("show"); setTimeout(hideTip, 9000); } }, 3000);
  }
})();
