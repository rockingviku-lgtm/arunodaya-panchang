// सूचना-पेजों की थीम: साइट की सहेजी हुई पसंद (arunodaya-theme-v2) अपनाता है और एक "थीम बदलें" बटन जोड़ता है।
(function () {
  var KEY = 'arunodaya-theme-v2', root = document.documentElement;
  function saved() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  if (saved() === 'classic') root.classList.add('ip-classic');
  document.addEventListener('DOMContentLoaded', function () {
    var h = document.querySelector('header'); if (!h) return;
    var b = document.createElement('button'); b.type = 'button'; b.className = 'ip-theme'; b.textContent = 'थीम बदलें';
    b.addEventListener('click', function () {
      var c = root.classList.toggle('ip-classic');
      try { localStorage.setItem(KEY, c ? 'classic' : 'modern'); } catch (e) { /* ignore */ }
    });
    h.appendChild(b);
  });
})();
