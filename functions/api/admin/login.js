// POST /api/admin/login  { credential }  — Google ID token जाँचता है; सिर्फ़ ADMIN_EMAIL को सेशन मिलता है।
import { makeToken, cookieHeader, json } from './_session.js';

export async function onRequestPost({ request, env }) {
  if (!env.GOOGLE_CLIENT_ID || !env.ADMIN_EMAIL || !env.SESSION_SECRET) return json({ ok: false, message: 'एडमिन सेटअप अधूरा है।' }, 503);
  let credential = '';
  try { credential = (await request.json()).credential || ''; } catch { return json({ ok: false, message: 'अनुरोध पढ़ा नहीं गया।' }, 400); }
  if (!credential) return json({ ok: false, message: 'Google लॉगिन नहीं मिला।' }, 400);

  const r = await fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(credential));
  if (!r.ok) return json({ ok: false, message: 'Google लॉगिन सत्यापित नहीं हो सका।' }, 401);
  const info = await r.json();
  const email = String(info.email || '').toLowerCase();
  if (info.aud !== env.GOOGLE_CLIENT_ID || info.email_verified !== 'true') return json({ ok: false, message: 'यह लॉगिन मान्य नहीं है।' }, 401);
  if (email !== env.ADMIN_EMAIL.toLowerCase()) return json({ ok: false, message: 'यह क्षेत्र केवल प्रशासन के लिए है।' }, 403);

  const token = await makeToken(env, email);
  return json({ ok: true, message: 'लॉगिन सफल।' }, 200, { 'set-cookie': cookieHeader(token, 8 * 3600) });
}
