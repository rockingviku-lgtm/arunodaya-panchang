// ग्रहण की दृश्यता का नक्शा (पूरी दुनिया): रंगीन खाने + केंद्रीय रेखा + आपका स्थान।
// तट-रेखाएँ world-atlas (TopoJSON) से ब्राउज़र में लोड होती हैं; लोड न हो सके तो बिना तट-रेखा के भी नक्शा बनता है।
import { visibilityGrid, centralPath } from './eclipse-engine.js';

const URLS = ['https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/land-110m.json', 'https://unpkg.com/world-atlas@2.0.2/land-110m.json'];
let landPromise = null;

// TopoJSON -> रिंगों की सूची [[ [lon,lat], ... ], ...]
export function topoRings(topo) {
  const tf = topo.transform;
  const arcs = topo.arcs.map(a => {
    let x = 0, y = 0;
    return a.map(([dx, dy]) => { x += dx; y += dy; return tf ? [x * tf.scale[0] + tf.translate[0], y * tf.scale[1] + tf.translate[1]] : [x, y]; });
  });
  const ring = idxs => {
    const pts = [];
    for (const i of idxs) {
      const a = i >= 0 ? arcs[i] : arcs[~i].slice().reverse();
      for (let k = pts.length ? 1 : 0; k < a.length; k++) pts.push(a[k]);
    }
    return pts;
  };
  const out = [];
  const walk = g => {
    if (!g) return;
    if (g.type === 'GeometryCollection') g.geometries.forEach(walk);
    else if (g.type === 'Polygon') g.arcs.forEach(r => out.push(ring(r)));
    else if (g.type === 'MultiPolygon') g.arcs.forEach(p => p.forEach(r => out.push(ring(r))));
  };
  Object.values(topo.objects).forEach(walk);
  return out;
}
export function loadLand() {
  if (!landPromise) {
    landPromise = (async () => {
      for (const u of URLS) {
        try { const r = await fetch(u); if (r.ok) return topoRings(await r.json()); } catch (e) { /* अगला स्रोत */ }
      }
      return [];
    })();
  }
  return landPromise;
}

const css = (n, d) => { try { return getComputedStyle(document.body).getPropertyValue(n).trim() || d; } catch (e) { return d; } };

function magColor(m) { // सूर्य ग्रहण: कोटि के अनुसार पीला से गहरा लाल
  const t = Math.min(1, m);
  return `rgba(${Math.round(250 - 60 * t)},${Math.round(200 - 150 * t)},${Math.round(40 - 20 * t)},${0.35 + 0.5 * t})`;
}

export function legendFor(e) {
  if (e.type === 'lunar') return [['rgba(46,155,74,.55)', 'पूरा ग्रहण दिखेगा'], ['rgba(224,160,30,.55)', 'ग्रहण का कुछ भाग दिखेगा'], ['rgba(120,130,150,.18)', 'नहीं दिखेगा (चंद्र क्षितिज से नीचे)']];
  const l = [[magColor(0.2), 'आंशिक ग्रहण, कम ढका सूर्य'], [magColor(0.6), 'आंशिक ग्रहण, अधिक ढका सूर्य'], [magColor(1), 'गहरा आंशिक या केंद्रीय क्षेत्र'], ['rgba(120,130,150,.18)', 'नहीं दिखेगा']];
  if (['total', 'annular', 'hybrid'].includes(e.kind)) l.push(['#111', e.kind === 'total' ? 'पूर्ण ग्रहण की केंद्रीय रेखा' : 'केंद्रीय रेखा']);
  return l;
}

export async function drawEclipseMap(canvas, e, place) {
  const W = canvas.width, H = canvas.height, ctx = canvas.getContext('2d');
  const X = lon => (lon + 180) / 360 * W, Y = lat => (90 - lat) / 180 * H;
  const g = visibilityGrid(e, 4), segs = centralPath(e);
  const ink = css('--dtxt', '#222');
  const paint = land => {
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#e8eef5'; ctx.fillRect(0, 0, W, H);
    // रंगीन खाने
    const cw = g.step / 360 * W, ch = g.step / 180 * H;
    g.lats.forEach((la, i) => g.lons.forEach((lo, j) => {
      const v = g.rows[i][j];
      if (e.type === 'lunar') ctx.fillStyle = v === 2 ? 'rgba(46,155,74,.55)' : v === 1 ? 'rgba(224,160,30,.55)' : 'rgba(120,130,150,.18)';
      else ctx.fillStyle = v > 0 ? magColor(v) : 'rgba(120,130,150,.18)';
      ctx.fillRect(X(lo) - cw / 2, Y(la) - ch / 2, cw + 0.6, ch + 0.6);
    }));
    // ग्रिड-रेखाएँ
    ctx.strokeStyle = 'rgba(60,70,90,.25)'; ctx.lineWidth = 1; ctx.fillStyle = 'rgba(40,50,70,.8)'; ctx.font = '11px sans-serif';
    for (let lo = -150; lo <= 180; lo += 30) { ctx.beginPath(); ctx.moveTo(X(lo), 0); ctx.lineTo(X(lo), H); ctx.stroke(); ctx.fillText(`${Math.abs(lo)}°${lo < 0 ? 'प' : lo > 0 ? 'पू' : ''}`, X(lo) + 2, H - 3); }
    for (let la = -60; la <= 60; la += 30) { ctx.beginPath(); ctx.moveTo(0, Y(la)); ctx.lineTo(W, Y(la)); ctx.stroke(); ctx.fillText(`${Math.abs(la)}°${la < 0 ? 'द' : la > 0 ? 'उ' : ''}`, 3, Y(la) - 2); }
    // तट-रेखाएँ
    if (land?.length) {
      ctx.strokeStyle = 'rgba(30,40,60,.85)'; ctx.lineWidth = 1;
      for (const r of land) { ctx.beginPath(); r.forEach(([lo, la], k) => (k ? ctx.lineTo(X(lo), Y(la)) : ctx.moveTo(X(lo), Y(la)))); ctx.stroke(); }
    }
    // केंद्रीय रेखा
    ctx.strokeStyle = '#111'; ctx.lineWidth = 2.5;
    for (const s of segs) { ctx.beginPath(); s.forEach(([la, lo], k) => (k ? ctx.lineTo(X(lo), Y(la)) : ctx.moveTo(X(lo), Y(la)))); ctx.stroke(); }
    // आपका स्थान
    if (place && isFinite(place.lat) && isFinite(place.lon)) {
      ctx.fillStyle = '#c0141c'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(X(place.lon), Y(place.lat), 6, 0, 7); ctx.fill(); ctx.stroke();
      ctx.fillStyle = ink; ctx.font = 'bold 12px sans-serif';
      const tx = X(place.lon) > W - 130 ? X(place.lon) - 10 - ctx.measureText(place.name || '').width : X(place.lon) + 10;
      ctx.fillText(String(place.name || 'आपका स्थान').split(',')[0], tx, Y(place.lat) - 8);
    }
  };
  paint([]);
  const land = await loadLand();
  if (land.length) paint(land);
  return { hasLand: land.length > 0 };
}
