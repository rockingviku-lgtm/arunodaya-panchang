// सूर्य और चंद्र ग्रहण की गणना (Meeus के सूत्र; चंद्र-सूर्य की स्थिति festival-calendar.js से)
// नतीजा: हर ग्रहण का प्रकार, कोटि (magnitude), स्पर्श-काल, और चुने हुए स्थान से दृश्यता।
// सटीकता: समय सामान्यतः कुछ मिनट के भीतर; Drik/NASA के प्रकाशित समय से तुलना ज़रूर करें।
import { elongation, moonSidereal, sunSidereal, moonLatitudeAt, ayanamsa, centuries, jdUT } from './festival-calendar.js';

const RAD = Math.PI / 180, DAY = 86400000, MIN = 60000, HOUR = 3600000;
const wrap180 = x => ((x + 540) % 360 + 360) % 360 - 180;
const norm = x => ((x % 360) + 360) % 360;
const sind = d => Math.sin(d * RAD), cosd = d => Math.cos(d * RAD);
const R_EARTH = 6378.14, R_MOON = 1737.4;

const moonTropLon = ms => norm(moonSidereal(ms) + ayanamsa(centuries(ms)));
const sunTropLon = ms => norm(sunSidereal(ms) + ayanamsa(centuries(ms)));

// चंद्र की दूरी (किमी) — Meeus अध्याय 47 के मुख्य पद
function moonDistance(ms) {
  const T = centuries(ms);
  const D = 297.8501921 + 445267.1114034 * T, M = 357.5291092 + 35999.0502909 * T, Mp = 134.9633964 + 477198.8675055 * T;
  return 385000.56 - 20905.355 * cosd(Mp) - 3699.111 * cosd(2 * D - Mp) - 2955.968 * cosd(2 * D) - 569.925 * cosd(2 * Mp)
    + 48.888 * cosd(M) - 3.149 * cosd(2 * (93.2720950 + 483202.0175233 * T)) + 246.158 * cosd(2 * D - 2 * Mp)
    - 152.138 * cosd(2 * D - M - Mp) - 170.733 * cosd(2 * D + Mp) - 204.586 * cosd(2 * D - M) - 129.620 * cosd(M - Mp)
    + 108.743 * cosd(D) + 104.755 * cosd(M + Mp);
}
function sunDistanceAU(ms) {
  const T = centuries(ms), M = 357.52911 + 35999.05029 * T;
  return 1.000140 - 0.016708 * cosd(M) - 0.000140 * cosd(2 * M);
}
const obliq = T => 23.4392911 - 0.0130042 * T;
function eqFromEcl(lon, lat, T) {
  const e = obliq(T);
  const ra = norm(Math.atan2(sind(lon) * cosd(e) - Math.tan(lat * RAD) * sind(e), cosd(lon)) / RAD);
  const dec = Math.asin(sind(lat) * cosd(e) + cosd(lat) * sind(e) * sind(lon)) / RAD;
  return { ra, dec };
}
const gmst = ms => { const d = jdUT(ms) - 2451545, T = d / 36525; return norm(280.46061837 + 360.98564736629 * d + 0.000387933 * T * T); };

// चंद्रमा की ऊँचाई (अंश) स्थान पर
export function moonAlt(ms, lat, lon) {
  const T = centuries(ms), { ra, dec } = eqFromEcl(moonTropLon(ms), moonLatitudeAt(ms), T);
  const H = norm(gmst(ms) + lon - ra);
  return Math.asin(sind(lat) * sind(dec) + cosd(lat) * cosd(dec) * cosd(H)) / RAD;
}
export function sunAlt(ms, lat, lon) {
  const T = centuries(ms), { ra, dec } = eqFromEcl(sunTropLon(ms), 0, T);
  const H = norm(gmst(ms) + lon - ra);
  return Math.asin(sind(lat) * sind(dec) + cosd(lat) * cosd(dec) * cosd(H)) / RAD;
}

// सूर्य और चंद्र के आकार (अंश)
function sizes(ms) {
  const dm = moonDistance(ms), rs = sunDistanceAU(ms);
  return {
    dm, piM: Math.asin(R_EARTH / dm) / RAD, sM: Math.asin(R_MOON / dm) / RAD,
    sS: 0.26661 / rs, piS: 0.00244 / rs
  };
}

// चंद्र/सूर्य और छाया-अक्ष (या सूर्य) के बीच कोणीय दूरी (अंश)
function sepFromAxis(ms, lunar) {
  const e = wrap180(elongation(ms) - (lunar ? 180 : 0)), b = moonLatitudeAt(ms);
  return Math.hypot(e * cosd(b), b);
}
function minimize(f, a, b) {
  for (let i = 0; i < 60; i++) {
    const m1 = a + (b - a) / 3, m2 = b - (b - a) / 3;
    if (f(m1) < f(m2)) b = m2; else a = m1;
  }
  return (a + b) / 2;
}
function bisect(f, lo, hi) { // f(lo) और f(hi) के चिह्न अलग हों
  const flo = f(lo) > 0;
  for (let i = 0; i < 50 && hi - lo > 500; i++) {
    const mid = (lo + hi) / 2;
    if ((f(mid) > 0) === flo) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}
const contact = (g, tmax, lim) => { // g(ms) < lim वाला खंड; (शुरू, अंत) या null
  if (g(tmax) >= lim) return null;
  const a = bisect(t => g(t) - lim, tmax - 6 * HOUR, tmax), b = bisect(t => g(t) - lim, tmax, tmax + 6 * HOUR);
  return [a, b];
};

// ---------- चंद्र ग्रहण ----------
function lunarEclipse(t0, place) {
  const tm = minimize(t => sepFromAxis(t, true), t0 - 3 * HOUR, t0 + 3 * HOUR);
  const z = sizes(tm), d = sepFromAxis(tm, true);
  const k = 1.01;
  const rU = k * (z.piM + z.piS - z.sS), rP = k * (z.piM + z.piS + z.sS);
  const magU = (rU + z.sM - d) / (2 * z.sM), magP = (rP + z.sM - d) / (2 * z.sM);
  if (magP <= 0) return null;
  const g = t => sepFromAxis(t, true);
  const P = contact(g, tm, rP + z.sM), U = magU > 0 ? contact(g, tm, rU + z.sM) : null, T = magU >= 1 ? contact(g, tm, rU - z.sM) : null;
  const kind = magU >= 1 ? 'total' : magU > 0 ? 'partial' : 'penumbral';
  const pts = { p1: P?.[0], u1: U?.[0], u2: T?.[0], max: tm, u3: T?.[1], u4: U?.[1], p4: P?.[1] };
  return { type: 'lunar', kind, max: tm, magU, magP, gamma: d / (z.piM) , pts, vis: place ? visibility(pts, place, moonAlt, -0.6) : null };
}

// ---------- सूर्य ग्रहण ----------
function topoSeparation(ms, place) { // चंद्र-सूर्य की स्थान-सापेक्ष दूरी (अंश) और सूर्य की ऊँचाई
  const T = centuries(ms), z = sizes(ms);
  const m = eqFromEcl(moonTropLon(ms), moonLatitudeAt(ms), T), s = eqFromEcl(sunTropLon(ms), 0, T);
  const phi = place.lat, u = Math.atan(0.99664719 * Math.tan(phi * RAD));
  const rs = 0.99664719 * Math.sin(u) + 0 /* ऊँचाई ≈ 0 */, rc = Math.cos(u);
  const H = norm(gmst(ms) + place.lon - m.ra) * RAD, dec = m.dec * RAD, sinPi = Math.sin(z.piM * RAD);
  const dRa = Math.atan2(-rc * sinPi * Math.sin(H), Math.cos(dec) - rc * sinPi * Math.cos(H));
  const decT = Math.atan2((Math.sin(dec) - rs * sinPi) * Math.cos(dRa), Math.cos(dec) - rc * sinPi * Math.cos(H));
  const raT = m.ra * RAD + dRa;
  const cosS = Math.sin(decT) * sind(s.dec) + Math.cos(decT) * cosd(s.dec) * Math.cos(raT - s.ra * RAD);
  return { sep: Math.acos(Math.min(1, Math.max(-1, cosS))) / RAD, z };
}
function solarEclipse(t0, place) {
  const tm = minimize(t => sepFromAxis(t, false), t0 - 3 * HOUR, t0 + 3 * HOUR);
  const z = sizes(tm), d = sepFromAxis(tm, false);
  if (d >= z.piM - z.piS + z.sM + z.sS) return null;
  const central = d < 0.9972 * z.piM;
  const kind = !central ? 'partial' : Math.abs(z.sM - z.sS) < 0.0008 ? 'hybrid' : z.sM > z.sS ? 'total' : 'annular';
  const gamma = Math.sign(moonLatitudeAt(tm)) * Math.sin(d * RAD) * z.dm / R_EARTH;
  const out = { type: 'solar', kind, max: tm, gamma, magGlobal: central ? z.sM / z.sS : (z.sM + z.sS - d) / (2 * z.sS), pts: { max: tm }, vis: null };
  if (place) {
    const f = t => topoSeparation(t, place).sep;
    const tl = minimize(f, tm - 4 * HOUR, tm + 4 * HOUR), zl = topoSeparation(tl, place), lim = zl.z.sM + zl.z.sS;
    if (zl.sep < lim) {
      const c = contact(f, tl, lim);
      const sunUp = t => sunAlt(t, place.lat, place.lon) > -0.8;
      const mag = (lim - zl.sep) / (2 * zl.z.sS);
      const pts = { c1: c?.[0], max: tl, c4: c?.[1] };
      out.vis = { seen: sunUp(tl) || sunUp(pts.c1) || sunUp(pts.c4), mag: Math.min(mag, zl.z.sM / zl.z.sS), pts, alt: sunAlt(tl, place.lat, place.lon), partsUp: [pts.c1, tl, pts.c4].map(sunUp) };
    } else out.vis = { seen: false };
  }
  return out;
}

function visibility(pts, place, alt, h0) {
  const keys = Object.keys(pts).filter(k => pts[k] != null);
  const up = {};
  for (const k of keys) up[k] = alt(pts[k], place.lat, place.lon) > h0;
  const first = pts.u1 ?? pts.p1 ?? pts.max, lastT = pts.u4 ?? pts.p4 ?? pts.max;
  const any = keys.some(k => up[k]);
  const all = keys.every(k => up[k]);
  return { up, any, all, altMax: alt(pts.max, place.lat, place.lon), first, last: lastT };
}

// from..to (ms) के बीच के सब ग्रहण, समय के क्रम में
export function findEclipses(fromMs, toMs, place) {
  const out = [];
  const step = 6 * HOUR;
  let t = fromMs - 12 * HOUR, e = wrap180(elongation(t)), e2 = wrap180(elongation(t) - 180);
  while (t < toMs + 12 * HOUR) {
    const n = t + step, en = wrap180(elongation(n)), en2 = wrap180(elongation(n) - 180);
    // नया चंद्र: wrap180 ऋण से धन (गुज़रना)
    if (e < 0 && en >= 0 && Math.abs(e - en) < 90) {
      const tz = bisect(x => wrap180(elongation(x)), t, n);
      if (Math.abs(moonLatitudeAt(tz)) < 1.75) { const r = solarEclipse(tz, place); if (r && r.max >= fromMs && r.max <= toMs) out.push(r); }
    }
    if (e2 < 0 && en2 >= 0 && Math.abs(e2 - en2) < 90) {
      const tz = bisect(x => wrap180(elongation(x) - 180), t, n);
      if (Math.abs(moonLatitudeAt(tz)) < 1.65) { const r = lunarEclipse(tz, place); if (r && r.max >= fromMs && r.max <= toMs) out.push(r); }
    }
    t = n; e = en; e2 = en2;
  }
  return out.sort((a, b) => a.max - b.max);
}


// ---------- दृश्यता का नक्शा ----------
// ग्रिड (हर `step` अंश का एक खाना): चंद्र ग्रहण में 0 नहीं/1 आंशिक/2 पूरा; सूर्य ग्रहण में ग्रहण-कोटि (0 = नहीं दिखेगा)
export function visibilityGrid(e, step = 4) {
  const lats = [], lons = [];
  for (let la = -90 + step / 2; la < 90; la += step) lats.push(la);
  for (let lo = -180 + step / 2; lo < 180; lo += step) lons.push(lo);
  const rows = lats.map(() => new Float32Array(lons.length));
  const altOf = (lat, lon, ra, dec, gm) => Math.asin(sind(lat) * sind(dec) + cosd(lat) * cosd(dec) * cosd(norm(gm + lon - ra))) / RAD;
  if (e.type === 'lunar') {
    const ts = Object.values(e.pts).filter(x => x != null);
    const eqs = ts.map(t => ({ ...eqFromEcl(moonTropLon(t), moonLatitudeAt(t), centuries(t)), gm: gmst(t) }));
    lats.forEach((la, i) => lons.forEach((lo, j) => {
      let up = 0;
      for (const q of eqs) if (altOf(la, lo, q.ra, q.dec, q.gm) > -0.6) up++;
      rows[i][j] = up === 0 ? 0 : up === eqs.length ? 2 : 1;
    }));
  } else {
    const samples = [];
    for (let t = e.max - 3 * HOUR; t <= e.max + 3 * HOUR; t += 15 * MIN) {
      const T = centuries(t), z = sizes(t);
      const m = eqFromEcl(moonTropLon(t), moonLatitudeAt(t), T), sn = eqFromEcl(sunTropLon(t), 0, T);
      samples.push({ m, sn, gm: gmst(t), sinPi: Math.sin(z.piM * RAD), sM: z.sM, sS: z.sS });
    }
    lats.forEach((la, i) => {
      const u = Math.atan(0.99664719 * Math.tan(la * RAD)), rs = 0.99664719 * Math.sin(u), rc = Math.cos(u);
      lons.forEach((lo, j) => {
        let best = 0;
        for (const q of samples) {
          if (altOf(la, lo, q.sn.ra, q.sn.dec, q.gm) < -0.8) continue;
          const H = norm(q.gm + lo - q.m.ra) * RAD, dec = q.m.dec * RAD;
          const dRa = Math.atan2(-rc * q.sinPi * Math.sin(H), Math.cos(dec) - rc * q.sinPi * Math.cos(H));
          const decT = Math.atan2((Math.sin(dec) - rs * q.sinPi) * Math.cos(dRa), Math.cos(dec) - rc * q.sinPi * Math.cos(H));
          const raT = q.m.ra * RAD + dRa;
          const c = Math.sin(decT) * sind(q.sn.dec) + Math.cos(decT) * cosd(q.sn.dec) * Math.cos(raT - q.sn.ra * RAD);
          const sep = Math.acos(Math.min(1, Math.max(-1, c))) / RAD;
          const mag = (q.sM + q.sS - sep) / (2 * q.sS);
          if (mag > best) best = Math.min(mag, q.sM / q.sS);
        }
        rows[i][j] = best;
      });
    });
  }
  return { lats, lons, rows, step };
}

// पूर्ण/कंकणाकृति सूर्य ग्रहण की केंद्रीय रेखा: [[lat, lon], ...] के खंड
export function centralPath(e) {
  if (e.type !== 'solar' || !['total', 'annular', 'hybrid'].includes(e.kind)) return [];
  const segs = [];
  let cur = [];
  for (let t = e.max - 3.5 * HOUR; t <= e.max + 3.5 * HOUR; t += 4 * MIN) {
    const T = centuries(t), dm = moonDistance(t);
    const m = eqFromEcl(moonTropLon(t), moonLatitudeAt(t), T), sn = eqFromEcl(sunTropLon(t), 0, T);
    const M = [dm * cosd(m.dec) * cosd(m.ra), dm * cosd(m.dec) * sind(m.ra), dm * sind(m.dec)];
    const d = [-cosd(sn.dec) * cosd(sn.ra), -cosd(sn.dec) * sind(sn.ra), -sind(sn.dec)];
    const md = M[0] * d[0] + M[1] * d[1] + M[2] * d[2], mm = M[0] ** 2 + M[1] ** 2 + M[2] ** 2;
    const disc = md * md - mm + R_EARTH * R_EARTH;
    if (disc < 0) { if (cur.length) segs.push(cur); cur = []; continue; }
    const lam = -md - Math.sqrt(disc), P = [M[0] + lam * d[0], M[1] + lam * d[1], M[2] + lam * d[2]];
    const lat = Math.asin(P[2] / R_EARTH) / RAD, lon = wrap180(Math.atan2(P[1], P[0]) / RAD - gmst(t));
    if (cur.length && Math.abs(lon - cur[cur.length - 1][1]) > 180) { segs.push(cur); cur = []; }
    cur.push([lat, lon]);
  }
  if (cur.length) segs.push(cur);
  return segs;
}
