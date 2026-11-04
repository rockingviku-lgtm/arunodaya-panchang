// Cloudflare Pages Function: /api/feedback  — चैट के बाद की रेटिंग (1 से 5) जमा करता है।
// KV binding "LIMITS" हो तो गिनती वहीं रहती है (दिन-वार); न हो तो सिर्फ़ Functions लॉग में जाती है।
// रेटिंग देखने के लिए: Cloudflare में Secret FEEDBACK_ADMIN_KEY डालें, फिर
//   https://आपकी-साइट/api/feedback?key=<वही कुंजी>   खोलें (पिछले 30 दिन की गिनती दिखेगी)।
const json = (b, s = 200) => new Response(JSON.stringify(b, null, 1), { status: s, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });
const MIN = 60000, DAY = 86400000;
const istDay = (ms = Date.now()) => new Date(ms + 330 * MIN).toISOString().slice(0, 10);

async function ipKey(request) {
  const ip = request.headers.get("CF-Connecting-IP") || request.headers.get("x-forwarded-for") || "anon";
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("arunodaya-fb|" + ip));
  return [...new Uint8Array(buf)].slice(0, 8).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function onRequestPost({ request, env }) {
  let rating;
  try { ({ rating } = await request.json()); } catch { return json({ error: "bad request" }, 400); }
  rating = parseInt(rating);
  if (!(rating >= 1 && rating <= 5)) return json({ error: "rating 1-5 chahiye" }, 400);

  // एक उपयोगकर्ता से दिन में ज़्यादा से ज़्यादा 10 रेटिंग (स्पैम रोकने के लिए, Cache API से)
  try {
    const ck = new Request("https://fb.arunodaya.local/" + (await ipKey(request)) + "/" + istDay());
    const hit = await caches.default.match(ck);
    const n = hit ? parseInt(await hit.text()) || 0 : 0;
    if (n >= 10) return json({ ok: true, ignored: true });
    await caches.default.put(ck, new Response(String(n + 1), { headers: { "Cache-Control": "public, max-age=86400" } }));
  } catch (e) {}

  const day = istDay();
  if (env.LIMITS) {
    try {
      const key = "fb:" + day;
      const cur = JSON.parse((await env.LIMITS.get(key)) || "{}");
      cur[rating] = (cur[rating] || 0) + 1;
      await env.LIMITS.put(key, JSON.stringify(cur), { expirationTtl: 60 * 60 * 24 * 100 });
    } catch (e) {}
  }
  console.log("chat-rating", day, rating);
  return json({ ok: true });
}

export async function onRequestGet({ request, env }) {
  const key = new URL(request.url).searchParams.get("key");
  if (!env.FEEDBACK_ADMIN_KEY || key !== env.FEEDBACK_ADMIN_KEY) return new Response("Not found", { status: 404 });
  if (!env.LIMITS) return json({ note: "KV binding LIMITS nahi juda; ratings sirf Functions logs me hain." });
  const days = [], total = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, count: 0, average: 0 };
  let sum = 0;
  for (let i = 0; i < 30; i++) {
    const d = istDay(Date.now() - i * DAY);
    const cur = JSON.parse((await env.LIMITS.get("fb:" + d)) || "null");
    if (!cur) continue;
    days.push({ din: d, ...cur });
    for (let r = 1; r <= 5; r++) { const c = cur[r] || 0; total[r] += c; total.count += c; sum += c * r; }
  }
  total.average = total.count ? +(sum / total.count).toFixed(2) : 0;
  return json({ pichhle_30_din: total, din_wise: days });
}
