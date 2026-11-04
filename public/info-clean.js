// सूचना-पेजों की सफ़ाई: ऊपर का लाल header हटाता है और अगर footer दो-दो दिखें तो एक ही रखता है।
// "थीम बदलें" बटन footer में चला जाता है, ताकि थीम बदलना बंद न हो। (सिर्फ़ उन्हीं पेजों पर जहाँ <article> है)
(function () {
  var KEY = 'arunodaya-theme-v2';
  function themeBtn(footer) {
    var b = document.querySelector('.ip-theme');
    if (!b) {
      b = document.createElement('button'); b.type = 'button'; b.className = 'ip-theme'; b.textContent = 'थीम बदलें';
      b.addEventListener('click', function () {
        var c = document.documentElement.classList.toggle('ip-classic');
        try { localStorage.setItem(KEY, c ? 'classic' : 'modern'); } catch (e) {}
      });
    }
    b.style.cssText = 'background:#fff;color:var(--bar,#a80f0f);border:0;padding:6px 12px;font:inherit;font-size:.82rem;font-weight:700;cursor:pointer;margin-top:6px';
    if (footer && b.parentNode !== footer) footer.appendChild(b);
    // एक से ज़्यादा बटन हों तो बाक़ी हटा दें
    var all = document.querySelectorAll('.ip-theme');
    for (var i = 0; i < all.length; i++) if (all[i] !== b) all[i].remove();
  }
  function clean() {
    if (!document.querySelector('article')) return;
    var feet = [].slice.call(document.querySelectorAll('footer'));
    if (feet.length > 1) {
      var keep = feet[0], best = -1;
      feet.forEach(function (f) { var n = f.querySelectorAll('a').length; if (n > best) { best = n; keep = f; } });
      feet.forEach(function (f) { if (f !== keep) f.remove(); });
    }
    var footer = document.querySelector('footer');
    themeBtn(footer);
    [].slice.call(document.querySelectorAll('header')).forEach(function (h) { if (!h.closest('article')) h.remove(); });
  }
  function init() {
    clean();
    setTimeout(clean, 300);
    setTimeout(clean, 1500);
    try {
      var t = 0, mo = new MutationObserver(function () { if (t) return; t = setTimeout(function () { t = 0; clean(); }, 50); });
      mo.observe(document.body, { childList: true, subtree: true });
      setTimeout(function () { mo.disconnect(); }, 8000);
    } catch (e) {}
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
