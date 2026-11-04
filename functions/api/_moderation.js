// चैटबॉट की सुरक्षा-नीति: अभद्र भाषा और अवैध अनुरोध पहचानना, ब्लॉक लगाना, फ़्लैग सहेजना, और अपील की स्वचालित समीक्षा।
// KV binding: APPEALS (वही जो अपील और एडमिन के लिए है). कुंजियाँ: block:<id>, ipb:<ip-hash>, strike:<ip-hash>, flag:<id>, appeal:<id>
import { LADDER_HOURS, H, effectiveStatus, applyAction } from './admin/_review.js';

export const REFUSAL = 'कृपया सभ्य भाषा का प्रयोग करें। अरुणोदय पंचांग से जुड़े विषयों, जैसे पंचांग, मुहूर्त, कुंडली और त्योहार, के बारे में पूछें।';
const FLAG_DAYS = 30;

// ---------- पहचान: अभद्र शब्द (हिंदी, हिंग्लिश, अंग्रेज़ी) ----------
// शब्द सामान्य रूप (lowercase, नुक़्ता हटाकर, दोहराए अक्षर एक करके) में मिलाए जाते हैं
const norm = (s) => String(s || '').toLowerCase().replace(/़/g, '').replace(/[^\p{L}\p{M}\p{N}\s]/gu, ' ');
const squash = (t) => t.replace(/(.)\1{2,}/gu, '$1');
const tokens = (s) => norm(s).split(/\s+/).filter(Boolean).map(squash);

const ABUSE_RAW = [
  'madarchod', 'madarchod', 'behenchod', 'bhenchod', 'bhosdi', 'bhosdike', 'chutiya', 'chutiye', 'gandu', 'randi',
  'harami', 'kamina', 'kamine', 'saala', 'saale', 'lund', 'lauda', 'gaand', 'bhadwa', 'fuck', 'fucking', 'shit',
  'bitch', 'asshole', 'bastard', 'motherfucker', 'slut', 'whore',
  'मादरचोद', 'बहनचोद', 'भोसड़ी', 'भोसडीके', 'चूतिया', 'चूतिये', 'गांडू', 'रंडी', 'हरामी', 'कमीना', 'कमीने', 'साला', 'साले', 'लौड़ा', 'लौड़े', 'गांड', 'भड़वा'
];
const ABUSE = new Set(ABUSE_RAW.flatMap((w) => tokens(w)));

// ---------- पहचान: अवैध गतिविधि के अनुरोध (regex; हर पैटर्न एक उल्लंघन गिना जाता है) ----------
const ILLEGAL = [
  /(बम|विस्फोटक|ग्रेनेड).*(कैसे|बनाएं|बनाऊं|बनाऊँ|बनाना)/u,
  /\b(bomb|explosive|grenade)s?\b.*\b(how|make|build|making)\b/i,
  /\b(how|make|build)\b.*\b(bomb|explosive|grenade)s?\b/i,
  /(ड्रग|ड्रग्स|कोकीन|हेरोइन|स्मैक|मेथ).*(कैसे|बनाएं|बनाऊं|खरीदें|मंगवाएं|बनाना)/u,
  /\b(make|cook|synthesi[sz]e|buy)\b.*\b(meth|cocaine|heroin|drugs?)\b/i,
  /(हैक|हैकिंग).*(अकाउंट|पासवर्ड|खाता)/u,
  /\bhack(ing)?\b.*\b(account|password|whatsapp|instagram|facebook|gmail)\b/i,
  /(नाबालिग|बच्चों|बच्चियों).*(सेक्स|नग्न|पोर्न|यौन)/u,
  /\b(child|minor)s?\b.*\b(sex|porn|nude|nudes)\b/i,
  /(चोरी|लूट|डकैती|फिरौती|किडनैप|अपहरण|ब्लैकमेल).*(कैसे|तरीका|करें|करूँ|करूं)/u,
  /\b(kidnap|extort|blackmail|rob|steal)\b.*\b(how|way|steps)\b/i,
  /(किसी को|किसी की).*(जान से|मारने|मारना).*(तरीका|कैसे)/u
];

// संदेश में कितने उल्लंघन हैं: हर अभद्र शब्द (जितनी बार आए) और हर अवैध पैटर्न एक
export function scan(text) {
  const hits = [];
  for (const t of tokens(text)) if (ABUSE.has(t)) hits.push({ cat: 'abuse', term: t });
  for (const re of ILLEGAL) if (re.test(String(text || ''))) hits.push({ cat: 'illegal', term: re.source.slice(0, 30) });
  return { count: hits.length, hits };
}

// AI (Gemini) ने अपनी सुरक्षा-नीति के तहत जवाब रोका हो
export function isSafetyBlock(data) {
  return !!(data?.promptFeedback?.blockReason || data?.candidates?.[0]?.finishReason === 'SAFETY');
}


// ---------- AI जाँच: Gemini अपनी सुरक्षा-सेटिंग्स और नीति-प्रॉम्प्ट से संदेश को परखता है (शब्द-सूची से आगे) ----------
const MOD_POLICY = `आप एक सामग्री-नीति जाँचकर्ता हैं। उपयोगकर्ता का संदेश इन श्रेणियों में जाँचें:
- abuse: गाली, अपमान, धमकी, नफ़रत या अभद्र भाषा (हिंदी, हिंग्लिश, अंग्रेज़ी)। count = ऐसे अभद्र शब्दों/वाक्यांशों की संख्या।
- offtopic: साइट और पंचांग से असंबंधित या बेकार बातें।
- illegal: हिंसा, हथियार या विस्फोटक, नशीले पदार्थ, हैकिंग, चोरी/अपहरण, या यौन शोषण से जुड़े अवैध काम का तरीका या समर्थन।
साधारण सवाल (पंचांग, कुंडली, त्योहार, मुहूर्त, राशिफल) violation:false हैं। असंबंधित या बेकार बातें (गप, मज़ाक, कुछ भी बोलो) category:"offtopic" के साथ violation:true दें।
जवाब केवल JSON दें: {"violation":true|false,"category":"abuse|illegal|none","count":number,"reason":"एक वाक्य हिंदी में"}`;

// Gemini का जवाब पढ़ो; गड़बड़ हो तो null (तब सिर्फ़ शब्द-सूची चलेगी)
export function parseVerdict(raw) {
  let j;
  try { j = JSON.parse(raw); } catch { return null; }
  if (!j || j.violation !== true) return { violation: false };
  const category = ['illegal', 'offtopic'].includes(j.category) ? j.category : 'abuse';
  const count = Math.min(Math.max(parseInt(j.count, 10) || 1, 1), LADDER_HOURS.length);
  return { violation: true, category, count, reason: String(j.reason || '').slice(0, 200) };
}

export const OFFTOPIC_LIMIT = 3;
export const OFFTOPIC_REPLY = 'मैं पंचांग, मुहूर्त, कुंडली और त्योहारों में मदद करता हूँ। जैसे पूछें: "आज की तिथि क्या है?" या "कल का मुहूर्त बताएँ।" असंबंधित बातें बार-बार करने पर चैट अस्थायी रूप से ब्लॉक हो सकती है।';

// असंबंधित बात की गिनती (24 घंटे तक); लौटाता है कि अब तक कितनी बार हुई
export async function offtopicStep(env, ipHash) {
  if (!env.APPEALS) return 1;
  const k = 'off:' + ipHash;
  const n = (parseInt((await env.APPEALS.get(k)) || '0', 10) || 0) + 1;
  await env.APPEALS.put(k, String(n), { expirationTtl: 86400 });
  return n;
}
export async function offtopicReset(env, ipHash) {
  if (env.APPEALS) await env.APPEALS.delete('off:' + ipHash);
}

// संदेश पर AI की राय। सुरक्षा-फ़िल्टर ने संदेश ही रोक दिया हो, तो वह भी उल्लंघन है।
export async function aiModerate(env, text) {
  if (!env.GEMINI_API_KEY) return null;
  const model = env.GEMINI_MODEL || 'gemini-3.1-flash-lite';
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: MOD_POLICY }] },
        contents: [{ role: 'user', parts: [{ text: String(text).slice(0, 1000) }] }],
        generationConfig: { temperature: 0, responseMimeType: 'application/json' },
        safetySettings: ['HARASSMENT', 'HATE_SPEECH', 'SEXUALLY_EXPLICIT', 'DANGEROUS_CONTENT'].map((c) => ({ category: 'HARM_CATEGORY_' + c, threshold: 'BLOCK_ONLY_HIGH' }))
      })
    });
    if (!r.ok) return null;
    const data = await r.json();
    if (isSafetyBlock(data)) return { violation: true, category: 'abuse', count: 1, reason: 'Gemini सुरक्षा-फ़िल्टर' };
    return parseVerdict((data.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join('') || '{}');
  } catch {
    return null;
  }
}

// ---------- दंड: कुल स्ट्राइक के हिसाब से ब्लॉक की अवधि (24 घंटे → 72 घंटे → 2 हफ़्ते → 6 महीने → 1 साल) ----------
export function ladderIndex(strikes) {
  return Math.min(Math.max(strikes, 1), LADDER_HOURS.length) - 1;
}

const reasonOf = (cats) => {
  if (cats.includes('offtopic')) return 'बार-बार असंबंधित या बेकार बातें';
  if (cats.includes('illegal')) return 'अवैध गतिविधि से जुड़ा अनुरोध';
  if (cats.includes('ai')) return 'AI की सुरक्षा नीति का उल्लंघन';
  return 'अभद्र या अपमानजनक भाषा का प्रयोग';
};

const ipHashOf = async (request) => {
  const ip = request.headers.get('CF-Connecting-IP') || 'anon';
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('arunodaya-block|' + ip));
  return [...new Uint8Array(d)].slice(0, 12).map((b) => b.toString(16).padStart(2, '0')).join('');
};
export const hashIp = ipHashOf;

// इस उपकरण (IP) पर सक्रिय ब्लॉक, अगर हो तो
export async function activeBlockFor(env, ipHash, now) {
  if (!env.APPEALS) return null;
  const id = await env.APPEALS.get('ipb:' + ipHash);
  if (!id) return null;
  const raw = await env.APPEALS.get('block:' + id);
  if (!raw) return null;
  const rec = JSON.parse(raw);
  return effectiveStatus(rec, now) === 'active' ? rec : null;
}

// नया उल्लंघन दर्ज करो: स्ट्राइक बढ़ाओ, ब्लॉक बनाओ, फ़्लैग सहेजो। बिना KV के null लौटता है।
export async function recordViolation(env, { ipHash, hits, text, now }) {
  if (!env.APPEALS) return null;
  const sk = 'strike:' + ipHash;
  const prev = JSON.parse((await env.APPEALS.get(sk)) || '{"count":0}');
  const strikes = (prev.count || 0) + hits.length;
  const idx = ladderIndex(strikes);
  const cats = [...new Set(hits.map((h) => h.cat))];
  const id = 'AP-' + crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase();
  const expires = now + LADDER_HOURS[idx] * H;
  const block = {
    id, ip_hash: ipHash, reason: reasonOf(cats), categories: cats, hits: hits.length,
    strike_total: strikes, level: idx + 1, created_at: now, expires_at: expires,
    status: 'active', review_mode: 'auto', notes: []
  };
  await env.APPEALS.put('block:' + id, JSON.stringify(block));
  await env.APPEALS.put('ipb:' + ipHash, id, { expirationTtl: Math.max(60, Math.ceil((expires - now) / 1000) + 60) });
  await env.APPEALS.put(sk, JSON.stringify({ count: strikes, updated_at: now }));
  await env.APPEALS.put('flag:' + id, JSON.stringify({
    id, block_id: id, ip_hash: ipHash, categories: cats, hits: hits.length,
    snippet: String(text || '').slice(0, 200), created_at: new Date(now).toISOString(),
    expires_at: new Date(now + FLAG_DAYS * 24 * H).toISOString(), status: 'open'
  }));
  return block;
}

const istText = (ms) => new Date(ms).toLocaleString('hi-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

// चैट को ब्लॉक-संदेश भेजने के लिए
export function blockedPayload(block) {
  const appeal = '/appeal.html?block=' + block.id;
  return {
    blocked: true, block_id: block.id, reason: block.reason, expires_at: new Date(block.expires_at).toISOString(), appeal_url: appeal,
    reply: `आपकी चैट अस्थायी रूप से ब्लॉक है।\nब्लॉक आईडी: ${block.id}\nकारण: ${block.reason}\nब्लॉक कब तक: ${istText(block.expires_at)} (भारतीय समय)\nसमय पूरा होने पर यह अपने-आप खुल जाएगा।\nअपील के लिए: ${appeal}`
  };
}

// ---------- अपील की स्वचालित समीक्षा ----------
const POLICY = `आप "अरुणोदय" वेबसाइट की ब्लॉक-अपील समीक्षक हैं। नीति:
- अभद्र/अपमानजनक भाषा या अवैध गतिविधि के अनुरोध पर चैट अस्थायी रूप से ब्लॉक होती है।
- पहली बार का ब्लॉक (24 घंटे) अपील पर खुल सकता है, अगर उपयोगकर्ता ईमानदारी से गलती मानता है और आगे ऐसा न करने का वादा करता है।
- अवैध गतिविधि वाले ब्लॉक की अपील स्वीकार न करें।
- शक हो तो "manual" चुनें। फ़ैसला केवल JSON में दें: {"decision":"accept|reject|manual","reason":"एक वाक्य हिंदी में"}`;

async function askGemini(env, prompt) {
  const model = env.GEMINI_MODEL || 'gemini-3.1-flash-lite';
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: POLICY }] },
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0, responseMimeType: 'application/json' }
    })
  });
  if (!r.ok) throw new Error('upstream ' + r.status);
  const data = await r.json();
  return JSON.parse((data.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join('') || '{}');
}

// फ़ैसला: accept | reject | manual. कुछ मामलों में AI की राय के बावजूद हमेशा manual (कोड में तय नियम)
export async function autoReviewAppeal(env, { block, appeal }) {
  if (!block) return { decision: 'manual', reason: 'ब्लॉक आईडी नहीं मिली, इसलिए एडमिन देखेंगे।' };
  if (block.level >= 4) return { decision: 'manual', reason: '6 महीने या 1 साल के ब्लॉक की समीक्षा केवल एडमिन करते हैं।' };
  if (block.categories?.includes('illegal')) return { decision: 'manual', reason: 'अवैध गतिविधि से जुड़े ब्लॉक की समीक्षा एडमिन करेंगे।' };
  if (appeal.ip_hash !== block.ip_hash) return { decision: 'manual', reason: 'अपील उसी उपकरण से नहीं आई जहाँ ब्लॉक लगा था, इसलिए एडमिन देखेंगे।' };
  try {
    const prompt = `ब्लॉक का कारण: ${block.reason}; ब्लॉक स्तर: ${block.level}\nउपयोगकर्ता की अपील: ${String(appeal.reason).slice(0, 1000)}`;
    const j = await askGemini(env, prompt);
    if (j.decision === 'accept' && block.level === 1) return { decision: 'accept', reason: String(j.reason || '').slice(0, 300) };
    if (j.decision === 'reject') return { decision: 'reject', reason: String(j.reason || '').slice(0, 300) };
    return { decision: 'manual', reason: String(j.reason || 'एडमिन समीक्षा करेंगे।').slice(0, 300) };
  } catch {
    return { decision: 'manual', reason: 'स्वचालित समीक्षा अभी नहीं हो पाई, एडमिन देखेंगे।' };
  }
}

// अपील को उसके ब्लॉक से जोड़कर फ़ैसला लागू करो (accept पर ब्लॉक हटता है)
export async function applyAppealDecision(env, { block, record, decision, reason, now }) {
  const next = { ...record, reviewed_at: new Date(now).toISOString(), review_note: 'स्वचालित समीक्षा: ' + reason, reviewed_by: decision === 'manual' ? 'pending' : 'auto' };
  if (decision === 'accept' && block) {
    await env.APPEALS.put('block:' + block.id, JSON.stringify(applyAction(block, 'lift', now, 'स्वचालित अपील मंज़ूर')));
    next.status = 'accepted';
  } else if (decision === 'reject') next.status = 'rejected';
  else next.status = 'manual';
  return next;
}
