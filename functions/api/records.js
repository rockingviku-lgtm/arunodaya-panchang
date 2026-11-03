// GET /api/admin/records?type=blocks|flags|appeals  — सिर्फ़ एडमिन। समय के हिसाब से असली स्थिति जोड़ता है।
import { readAdmin, json } from './_session.js';
import { effectiveStatus } from './_review.js';

const PREFIX = { blocks: 'block:', flags: 'flag:', appeals: 'appeal:' };
const ts = v => (typeof v === 'number' ? v : Date.parse(v) || 0);

export async function onRequestGet({ request, env }) {
  if (!env.APPEALS) return json({ ok: false, message: 'डेटा सेवा (KV) जुड़ी नहीं है।' }, 503);
  if (!(await readAdmin(request, env))) return json({ ok: false, message: 'पहले एडमिन लॉगिन करें।' }, 401);
  const type = new URL(request.url).searchParams.get('type') || 'blocks';
  if (!PREFIX[type]) return json({ ok: false, message: 'गलत प्रकार।' }, 400);

  const now = Date.now();
  const list = await env.APPEALS.list({ prefix: PREFIX[type], limit: 300 });
  const items = [];
  for (const k of list.keys) {
    const raw = await env.APPEALS.get(k.name);
    if (!raw) continue;
    const rec = JSON.parse(raw);
    rec.key = k.name;
    if (type === 'blocks') rec.view = effectiveStatus(rec, now);
    if (type === 'flags' && ts(rec.expires_at) && ts(rec.expires_at) < now) continue; // 30 दिन बाद चैट का डेटा दिखता नहीं
    items.push(rec);
  }
  items.sort((a, b) => ts(b.created_at) - ts(a.created_at));
  return json({ ok: true, items });
}
