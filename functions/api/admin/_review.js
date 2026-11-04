// ब्लॉक का नियम-तंत्र (पूरी तरह साफ़ लॉजिक, बिना I/O के). चैटबॉट बैकएंड भी यही फ़ाइल इस्तेमाल करे।
// दंड की सीढ़ी: 24 घंटे → 72 घंटे → 2 हफ़्ते → 6 महीने → 1 साल (इससे आगे नहीं)
export const H = 3600000;
export const LADDER_HOURS = [24, 72, 336, 4380, 8760];

// नया ब्लॉक: level पिछले ब्लॉक से एक ऊपर; ladder की आख़िरी अवधि से ज़्यादा नहीं
export function makeBlock(prev, now, extra = {}) {
  const level = Math.min((prev?.level || 0) + 1, LADDER_HOURS.length);
  return { level, created_at: now, expires_at: now + LADDER_HOURS[level - 1] * H, status: 'active', review_mode: 'auto', ...extra };
}

// असली स्थिति: समय निकल गया तो auto मोड में अपने-आप 'expired'; manual मोड में 'needs_manual' (एडमिन का फ़ैसला बाकी)
export function effectiveStatus(rec, now) {
  if (!rec || rec.status === 'lifted' || rec.status === 'appeal_accepted') return rec?.status || 'none';
  if (rec.expires_at > now) return 'active';
  return rec.review_mode === 'manual' ? 'needs_manual' : 'expired';
}

// एडमिन की कार्रवाई; नया रिकॉर्ड लौटाता है
export function applyAction(rec, action, now, note = '') {
  const r = { ...rec, updated_at: now, notes: [...(rec.notes || []), { at: now, action, note: String(note).slice(0, 300) }] };
  switch (action) {
    case 'set_manual': r.review_mode = 'manual'; break;
    case 'set_auto': r.review_mode = 'auto'; break;
    case 'lift': r.status = 'lifted'; r.expires_at = now; break;
    case 'extend': {
      const level = Math.min((rec.level || 1) + 1, LADDER_HOURS.length);
      r.level = level; r.expires_at = now + LADDER_HOURS[level - 1] * H; r.status = 'active'; break;
    }
    case 'confirm': r.status = 'confirmed'; break; // एडमिन ने ब्लॉक सही माना; समय पूरा होने पर expired ही रहेगा
    default: throw new Error('अज्ञात कार्रवाई');
  }
  return r;
}
