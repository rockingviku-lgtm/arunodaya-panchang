// GET /api/admin/me — क्या इस ब्राउज़र में एडमिन सेशन है
import { readAdmin, json } from './_session.js';

export async function onRequestGet({ request, env }) {
  const a = await readAdmin(request, env);
  return json({ admin: !!a, email: a ? a.email : null });
}
