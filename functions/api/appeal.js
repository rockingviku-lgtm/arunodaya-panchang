// अपील फ़ॉर्म का एंडपॉइंट (POST /api/appeal). Cloudflare Pages Function.
// ज़रूरी: Pages → Settings → Functions → KV namespace bindings में variable नाम "APPEALS" जोड़ें।
const MAX = { name: 80, email: 120, block_id: 60, reason: 1000 };
const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
const clean = (v, max) => String(v ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max);

async function hash(s) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(d)].map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function onRequestPost({ request, env }) {
  if (!env.APPEALS) return json({ ok: false, message: 'अपील सेवा अभी उपलब्ध नहीं है। कृपया seveninkdigitaldevelopers@gmail.com पर लिखें।' }, 503);

  let data;
  const type = request.headers.get('content-type') || '';
  try {
    if (type.includes('application/json')) data = await request.json();
    else data = Object.fromEntries((await request.formData()).entries());
  } catch { return json({ ok: false, message: 'फ़ॉर्म का डेटा पढ़ा नहीं जा सका।' }, 400); }

  // छिपा हुआ "website" फ़ील्ड भरा हो तो यह बॉट है
  if (data.website) return json({ ok: true, message: 'अपील मिल गई।' });

  const rec = {
    name: clean(data.name, MAX.name),
    email: clean(data.email, MAX.email).toLowerCase(),
    block_id: clean(data.block_id, MAX.block_id),
    reason: clean(data.reason, MAX.reason)
  };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rec.email)) return json({ ok: false, message: 'सही ईमेल पता लिखें।' }, 400);
  if (rec.reason.length < 10) return json({ ok: false, message: 'कृपया अपनी बात कम से कम 10 अक्षरों में लिखें।' }, 400);

  const ip = request.headers.get('CF-Connecting-IP') || '';
  const ua = request.headers.get('User-Agent') || '';
  const id = `${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}`;
  const entry = { ...rec, status: 'pending', created_at: new Date().toISOString(), ip_hash: await hash('ip|' + ip), ua_hash: await hash('ua|' + ua) };
  await env.APPEALS.put(`appeal:${id}`, JSON.stringify(entry));
  return json({ ok: true, id, message: 'आपकी अपील मिल गई है। समीक्षा 24 घंटे से 2 हफ़्ते के भीतर होगी। आपका संदर्भ कोड: ' + id });
}
