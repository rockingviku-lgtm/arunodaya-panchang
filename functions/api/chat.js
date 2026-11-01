// Cloudflare Pages Function: /api/chat
// GEMINI_API_KEY ko Cloudflare dashboard me Secret ke roop me daalein (code me kabhi nahi).
// Optional: GEMINI_MODEL naam ka variable daal kar model badal sakte hain.

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
2. जवाब छोटे रखें (3-5 वाक्य)।
3. आज की तिथि, राहुकाल, मुहूर्त, ग्रहण की तारीख़, राशिफल जैसा सटीक डेटा खुद न बनाएँ। बताएँ कि यह साइट के संबंधित पेज (जैसे "दैनिक पंचांग" या "शुभ कार्य मुहूर्त") पर शहर के अनुसार मिलेगा, और विज़िटर को वह पेज खोलने को कहें।
4. पंचांग, दोष, मुहूर्त और ज्योतिष की सामान्य अवधारणाएँ आप समझा सकते हैं (जैसे मंगल दोष क्या है, चौघड़िया क्या है)।
5. साइट पर जो सेवा ऊपर सूची में नहीं है, उसके बारे में अंदाज़ा न लगाएँ। कीमत, बुकिंग या पंडित से परामर्श जैसी बातों के लिए "संपर्क करें" पेज बताएँ।
6. ज्योतिषीय बातें मार्गदर्शन हैं, गारंटी नहीं। चिकित्सा, कानूनी या वित्तीय फ़ैसलों के लिए ज्योतिष को आधार बनाने की सलाह न दें।
7. साइट से असंबंधित विषयों पर विनम्रता से बताएँ कि आप पंचांग और ज्योतिष सेवाओं में मदद करते हैं।`;

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });

export async function onRequestPost({ request, env }) {
  let messages;
  try {
    ({ messages } = await request.json());
  } catch {
    return json({ error: "bad request" }, 400);
  }
  if (!Array.isArray(messages) || !messages.length) return json({ error: "no messages" }, 400);

  // Sirf aakhri 10 messages, har ek 1000 akshar tak (kharch aur misuse rokne ke liye)
  const clean = messages
    .slice(-10)
    .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .map((m) => ({ role: m.role, content: m.content.slice(0, 1000) }));

  // Gemini me assistant ka role "model" hota hai, aur pehla message "user" ka hona chahiye
  const contents = clean
    .map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] }));
  while (contents.length && contents[0].role !== "user") contents.shift();
  if (!contents.length) return json({ error: "no user message" }, 400);

  const model = env.GEMINI_MODEL || "gemini-3.1-flash-lite";
  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": env.GEMINI_API_KEY,
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM }] },
        contents,
        generationConfig: { maxOutputTokens: 600, temperature: 0.4 },
      }),
    }
  );

  if (!r.ok) return json({ error: "upstream" }, 502);
  const data = await r.json();
  const parts = data.candidates?.[0]?.content?.parts || [];
  const reply = parts.map((p) => p.text || "").join("").trim();
  return json({ reply });
}
