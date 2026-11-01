// Cloudflare Pages Function: /api/chat
// Secret: GEMINI_API_KEY (Cloudflare me Secret ke roop me). Optional: GEMINI_MODEL
// Kram: (1) site ke apne engines (../_site-tools.js), (2) shehar na mile to Google Search.
import { TOOLS, runTool } from "../_site-tools.js";

const SYSTEM = `आप "अरुणोदय सहायक" हैं, Arunodaya Panchang वेबसाइट (परंपरा और तकनीक का संगम) के सहायक।
आप विज़िटर्स को साइट की सेवाओं के बारे में बताते हैं और सही पेज तक पहुँचने में मदद करते हैं।

साइट की सेवाएँ और पेज:
- दैनिक पंचांग: रोज़ की तिथि, नक्षत्र, योग, करण और वार
- आने वाली ग्रह-घटनाएँ
- लग्न कुंडली
- व्रत और त्योहार
- राशिफल
- चौघड़िया
- होरा
- नाड़ी दोष, भकूट दोष, ग्रह मैत्री, गण मिलान (कुंडली मिलान)
- मंगल दोष
- काल सर्प दोष
- साढ़ेसाती और ढैया
- शुभ कार्य मुहूर्त
- सूर्य-चंद्र ग्रहण
- पंचक और भद्रा
- सूर्योदय-चंद्रोदय तालिका
- मुख्य मेन्यू: होम, पंचांग, कैलेंडर, मुहूर्त, कुंडली
- अन्य पेज: हमारे बारे में, संपर्क करें, सेवाएँ, गोपनीयता नीति, अस्वीकरण, नियम व शर्तें, कुकीज़ नीति

नियम:
1. हिंदी (देवनागरी) में जवाब दें। विज़िटर अंग्रेज़ी या हिंग्लिश में लिखे तो उसी में जवाब दें।
2. जवाब छोटे रखें (3-6 वाक्य या छोटी सूची)।
3. साइट की हर सेवा का डेटा (पंचांग, चौघड़िया, राहुकाल, मुहूर्त, पंचक-भद्रा, होरा, लग्न, व्रत-त्योहार, राशिफल, साढ़ेसाती-ढैया, ग्रहण, ग्रह-घटनाएँ, कुंडली, दोष, दशा, कुंडली मिलान, अंक ज्योतिष) आपके टूल से ही लें। याददाश्त या अंदाज़े से तिथि, समय, अंक या फल कभी न बताएँ। तारीख़ न बताई हो तो आज की तारीख़ लें। शहर ज़रूरी हो और न बताया हो तो पहले शहर पूछें। कुंडली के लिए जन्म तारीख़, जन्म समय और जन्म स्थान चाहिए। मिलान के लिए वर और वधू दोनों का यही विवरण चाहिए। जो जानकारी कम हो, वही पूछें। जवाब में सिर्फ़ वही बताएँ जो पूछा गया हो, पूरा डेटा न उगलें। समय 12-घंटे वाले रूप में, AM/PM के साथ लिखें। व्यक्तिगत विवरण (जन्म तारीख़ आदि) सिर्फ़ गणना के लिए इस्तेमाल करें, उसे दोहराकर लंबा न करें।
4. पंचांग, दोष, मुहूर्त और ज्योतिष की सामान्य अवधारणाएँ आप समझा सकते हैं (जैसे मंगल दोष क्या है, चौघड़िया क्या है)।
5. साइट पर जो सेवा ऊपर सूची में नहीं है, उसके बारे में अंदाज़ा न लगाएँ। कीमत, बुकिंग या पंडित से परामर्श जैसी बातों के लिए "संपर्क करें" पेज बताएँ।
6. ज्योतिषीय बातें मार्गदर्शन हैं, गारंटी नहीं। चिकित्सा, कानूनी या वित्तीय फ़ैसलों के लिए ज्योतिष को आधार बनाने की सलाह न दें।
7. साइट से असंबंधित विषयों पर विनम्रता से बताएँ कि आप पंचांग और ज्योतिष सेवाओं में मदद करते हैं।
8. जवाब में ** या # जैसे मार्कडाउन चिह्न न लिखें। सादा टेक्स्ट लिखें, सूची के लिए "-" इस्तेमाल करें।
9. जवाब के अंत में एक वाक्य में बताएँ कि पूरा विवरण साइट के संबंधित पेज (जैसे "दैनिक पंचांग", "कुंडली", "राशिफल") पर देख सकते हैं।`;
const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json; charset=utf-8" } });

const istDate = (d = new Date()) => new Date(d.getTime() + 330 * 60000).toISOString().slice(0, 10);

// opts.world=true: duniya ka koi bhi shehar (janm sthan ke liye); warna sirf Bharat (site ka engine IST me hai)
async function geocode(city, opts = {}) {
  const url = "https://geocoding-api.open-meteo.com/v1/search?count=1&format=json&language=en" + (opts.world ? "" : "&countryCode=IN") + "&name=" + encodeURIComponent(city);
  const r = await fetch(url);
  if (!r.ok) return null;
  const x = (await r.json()).results?.[0];
  return x ? { name: [x.name, x.admin1].filter(Boolean).join(", "), lat: x.latitude, lon: x.longitude, tz: x.timezone } : null;
}

async function gemini(env, body) {
  const model = env.GEMINI_MODEL || "gemini-3.1-flash-lite";
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": env.GEMINI_API_KEY },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error("upstream " + r.status);
  return r.json();
}

const textOf = (data) =>
  (data.candidates?.[0]?.content?.parts || []).map((p) => p.text || "").join("").replace(/\*\*/g, "").replace(/^#+\s*/gm, "").trim();

export async function onRequestPost({ request, env }) {
  let messages;
  try { ({ messages } = await request.json()); } catch { return json({ error: "bad request" }, 400); }
  if (!Array.isArray(messages) || !messages.length) return json({ error: "no messages" }, 400);

  const clean = messages.slice(-12)
    .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .map((m) => ({ role: m.role, content: m.content.slice(0, 1000) }));
  const base = clean.map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] }));
  while (base.length && base[0].role !== "user") base.shift();
  if (!base.length) return json({ error: "no user message" }, 400);

  const today = new Date().toLocaleDateString("hi-IN", { timeZone: "Asia/Kolkata", weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const sys = (extra = "") => ({ parts: [{ text: `${SYSTEM}\n\nआज की तारीख़ (भारत): ${today} (${istDate()})${extra}` }] });
  const cfg = { maxOutputTokens: 900, temperature: 0.3 };

  try {
    // Charan 1: site ke apne engines (function calling)
    const contents = [...base];
    let needSearch = false;
    for (let i = 0; i < 4; i++) {
      const data = await gemini(env, { systemInstruction: sys(), contents, tools: [{ functionDeclarations: TOOLS }], generationConfig: cfg });
      const content = data.candidates?.[0]?.content;
      const calls = (content?.parts || []).filter((p) => p.functionCall);
      if (!calls.length) {
        const reply = textOf(data);
        if (reply) return json({ reply });
        break;
      }
      contents.push(content);
      const responses = [];
      for (const c of calls.slice(0, 3)) {
        const result = await runTool(c.functionCall.name, c.functionCall.args, geocode);
        if (result.search) needSearch = true;
        responses.push({ functionResponse: { name: c.functionCall.name, response: { result } } });
      }
      contents.push({ role: "user", parts: responses });
      if (needSearch) break;
    }

    // Charan 2: shehar site ke engine me nahi mila -> Google Search
    if (needSearch) {
      const data = await gemini(env, {
        systemInstruction: sys("\n\nसाइट के अपने इंजन में यह शहर नहीं मिला। अब वेब सर्च से जवाब दें, भरोसेमंद स्रोत से, और साफ़ बताएँ कि यह जानकारी साइट की गणना से नहीं, इंटरनेट से ली गई है। भरोसेमंद जानकारी न मिले तो साफ़ कहें।"),
        contents: base,
        tools: [{ google_search: {} }],
        generationConfig: cfg,
      });
      const reply = textOf(data);
      if (reply) return json({ reply });
    }
    return json({ reply: "माफ़ कीजिए, अभी जवाब नहीं मिल पाया। कृपया शहर और तारीख़ लिखकर दोबारा पूछें, या साइट के संबंधित पेज देखें।" });
  } catch (e) {
    return json({ error: "upstream" }, 502);
  }
}
