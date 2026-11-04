// POST /api/admin/review  { key, action, note } — सिर्फ़ एडमिन। ब्लॉक, अपील और चैट-फ़्लैग पर फ़ैसला।
import { readAdmin, json } from './_session.js';
import { applyAction } from './_review.js';

const BLOCK_ACTIONS = ['lift', 'extend', 'confirm', 'set_manual', 'set_auto'];
const APPEAL_ACTIONS = ['appeal_accept', 'appeal_reject'];
const FLAG_ACTIONS = ['dismiss'];

export async function onRequestPost({ request, env }) {
  if (!env.APPEALS) return json({ ok: false, message: 'डेटा सेवा (KV) जुड़ी नहीं है।' }, 503);
  if (!(await readAdmin(request, env))) return json({ ok: false, message: 'पहले एडमिन लॉगिन करें।' }, 401);
  let body;
  try { body = await request.json(); } catch { return json({ ok: false, message: 'अनुरोध पढ़ा नहीं गया।' }, 400); }
  const { key = '', action = '', note = '' } = body || {};
  const raw = key && (await env.APPEALS.get(key));
  if (!raw) return json({ ok: false, message: 'रिकॉर्ड नहीं मिला।' }, 404);
  const rec = JSON.parse(raw);
  const now = Date.now();
  let next;

  if (key.startsWith('block:') && BLOCK_ACTIONS.includes(action)) next = applyAction(rec, action, now, note);
  else if (key.startsWith('appeal:') && APPEAL_ACTIONS.includes(action)) {
    next = { ...rec, status: action === 'appeal_accept' ? 'accepted' : 'rejected', reviewed_at: new Date(now).toISOString(), review_note: String(note).slice(0, 300) };
    // अपील मंज़ूर हो और उसका block_id हो, तो वह ब्लॉक हटाओ
    if (action === 'appeal_accept' && rec.block_id) {
      const bk = 'block:' + rec.block_id, braw = await env.APPEALS.get(bk);
      if (braw) await env.APPEALS.put(bk, JSON.stringify(applyAction(JSON.parse(braw), 'lift', now, 'अपील मंज़ूर: ' + note)));
    }
  } else if (key.startsWith('flag:') && FLAG_ACTIONS.includes(action)) next = { ...rec, status: 'dismissed', updated_at: now };
  else return json({ ok: false, message: 'यह कार्रवाई इस रिकॉर्ड पर लागू नहीं होती।' }, 400);

  await env.APPEALS.put(key, JSON.stringify(next));
  return json({ ok: true, message: 'कार्रवाई सेव हो गई।' });
}
