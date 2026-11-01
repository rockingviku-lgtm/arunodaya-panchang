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

export { sizes as _sizes };
