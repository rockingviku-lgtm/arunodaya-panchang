// POST /api/admin/logout — कुकी हटाता है
import { cookieHeader, json } from './_session.js';

export async function onRequestPost() {
  return json({ ok: true }, 200, { 'set-cookie': cookieHeader('', 0) });
}
