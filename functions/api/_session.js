// एडमिन सेशन: HMAC से साइन किया हुआ कुकी-टोकन (ap_admin). ज़रूरी env: SESSION_SECRET, ADMIN_EMAIL.
const enc = new TextEncoder();
const b64u = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const fromB64u = s => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
const COOKIE = 'ap_admin', TTL = 8 * 3600; // 8 घंटे

async function key(env) {
  return crypto.subtle.importKey('raw', enc.encode(env.SESSION_SECRET || ''), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}
export async function makeToken(env, email) {
  const body = b64u(enc.encode(JSON.stringify({ email, exp: Math.floor(Date.now() / 1000) + TTL })));
  const sig = b64u(await crypto.subtle.sign('HMAC', await key(env), enc.encode(body)));
  return `${body}.${sig}`;
}
export async function readAdmin(request, env) {
  if (!env.SESSION_SECRET || !env.ADMIN_EMAIL) return null;
  const m = (request.headers.get('cookie') || '').match(new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`));
  if (!m) return null;
  const [body, sig] = m[1].split('.');
  if (!body || !sig) return null;
  const ok = await crypto.subtle.verify('HMAC', await key(env), fromB64u(sig), enc.encode(body));
  if (!ok) return null;
  const data = JSON.parse(new TextDecoder().decode(fromB64u(body)));
  if (data.exp < Math.floor(Date.now() / 1000)) return null;
  return data.email === env.ADMIN_EMAIL.toLowerCase() ? data : null;
}
export const cookieHeader = (value, maxAge) => `${COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`;
export const json = (obj, status = 200, extra = {}) => new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...extra } });
