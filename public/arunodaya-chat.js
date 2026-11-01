/* Arunodaya Sahayak - floating chat widget. Har page par <script src="/arunodaya-chat.js" defer></script> lagayein. */
(function () {
  var API = "/api/chat";
  var history = [];
  var busy = false;

  var css = `
  #ap-btn{position:fixed;right:16px;bottom:calc(16px + env(safe-area-inset-bottom,0px));z-index:99999;display:flex;align-items:center;gap:8px;background:#a81010;color:#fff;border:0;border-radius:999px;padding:12px 18px;font:600 15px/1 "Noto Sans Devanagari",system-ui,sans-serif;box-shadow:0 4px 14px rgba(16,38,74,.35);cursor:pointer}
  #ap-btn:focus-visible,#ap-send:focus-visible,#ap-in:focus-visible,.ap-chip:focus-visible,#ap-x:focus-visible{outline:3px solid #f2b705;outline-offset:2px}
  #ap-box{position:fixed;right:16px;bottom:calc(76px + env(safe-area-inset-bottom,0px));z-index:99999;width:min(380px,calc(100vw - 32px));height:min(540px,calc(100vh - 110px));display:none;flex-direction:column;background:#fff;color:#1b1f27;border-radius:14px;overflow:hidden;box-shadow:0 10px 36px rgba(16,38,74,.3);font:15px/1.55 "Noto Sans Devanagari",system-ui,sans-serif}
  #ap-box.open{display:flex}
  #ap-h{background:#10264a;color:#fff;padding:12px 14px;display:flex;justify-content:space-between;align-items:center}
  #ap-h b{font-size:16px} #ap-h small{display:block;opacity:.8;font-size:12px}
  #ap-x{background:none;border:0;color:#fff;font-size:24px;line-height:1;cursor:pointer;padding:4px 8px}
  #ap-log{flex:1;overflow-y:auto;padding:12px;background:#f5f3ee;display:flex;flex-direction:column;gap:8px}
  .ap-m{max-width:86%;padding:9px 12px;border-radius:12px;white-space:pre-wrap;word-wrap:break-word}
  .ap-b{background:#fff;border:1px solid #e3ded2;align-self:flex-start}
  .ap-u{background:#10264a;color:#fff;align-self:flex-end}
  #ap-chips{display:flex;flex-wrap:wrap;gap:6px}
  .ap-chip{background:#fff;border:1px solid #a81010;color:#a81010;border-radius:999px;padding:6px 12px;font:inherit;font-size:13px;cursor:pointer}
  #ap-f{display:flex;gap:8px;padding:10px;border-top:1px solid #e3ded2;background:#fff}
  #ap-in{flex:1;border:1px solid #c9c3b4;border-radius:10px;padding:10px;font:inherit;min-width:0}
  #ap-send{background:#a81010;color:#fff;border:0;border-radius:10px;padding:0 16px;font:600 15px inherit;cursor:pointer}
  #ap-send:disabled{opacity:.5}
  @media (prefers-color-scheme:dark){#ap-box{background:#1c2230;color:#eef0f5}#ap-log{background:#141925}.ap-b{background:#232b3c;border-color:#303a50;color:#eef0f5}#ap-f{background:#1c2230;border-color:#303a50}#ap-in{background:#141925;color:#eef0f5;border-color:#3a4560}.ap-chip{background:#232b3c;color:#ffb3b3;border-color:#ffb3b3}}
  `;
  var st = document.createElement("style");
  st.textContent = css;
  document.head.appendChild(st);

  var font = document.createElement("link");
  font.rel = "stylesheet";
  font.href = "https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;600&display=swap";
  document.head.appendChild(font);

  var wrap = document.createElement("div");
  wrap.innerHTML =
    '<button id="ap-btn" aria-expanded="false" aria-controls="ap-box">🙏 सहायक</button>' +
    '<section id="ap-box" role="dialog" aria-label="अरुणोदय सहायक">' +
    '<div id="ap-h"><div><b>अरुणोदय सहायक</b><small>पंचांग, मुहूर्त और कुंडली में मदद</small></div><button id="ap-x" aria-label="बंद करें">×</button></div>' +
    '<div id="ap-log" aria-live="polite"></div>' +
    '<form id="ap-f"><input id="ap-in" type="text" maxlength="500" placeholder="अपना सवाल लिखें…" autocomplete="off" aria-label="अपना सवाल लिखें"><button id="ap-send" type="submit">भेजें</button></form>' +
    "</section>";
  document.body.appendChild(wrap);

  var $ = function (id) { return document.getElementById(id); };
  var box = $("ap-box"), log = $("ap-log"), input = $("ap-in"), send = $("ap-send"), btn = $("ap-btn");

  function add(text, who) {
    var d = document.createElement("div");
    d.className = "ap-m " + (who === "u" ? "ap-u" : "ap-b");
    d.textContent = text;
    log.appendChild(d);
    log.scrollTop = log.scrollHeight;
    return d;
  }

  function toggle(open) {
    box.classList.toggle("open", open);
    btn.setAttribute("aria-expanded", String(open));
    if (open) {
      if (!log.children.length) start();
      input.focus();
    }
  }

  function start() {
    add("नमस्ते! मैं अरुणोदय पंचांग का सहायक हूँ। पंचांग, चौघड़िया, मुहूर्त, कुंडली मिलान, दोष और व्रत-त्योहार के बारे में पूछ सकते हैं।", "b");
    var chips = document.createElement("div");
    chips.id = "ap-chips";
    ["कुंडली मिलान कैसे करें?", "मंगल दोष क्या है?", "चौघड़िया क्या होता है?", "साइट पर कौन-सी सेवाएँ हैं?"].forEach(function (q) {
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
    var wait = add("लिख रहा हूँ…", "b");
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
})();
