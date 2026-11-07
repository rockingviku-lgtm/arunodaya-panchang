// जन्म तारीख़ की पार्सिंग और जाँच: native date picker से मिला YYYY-MM-DD मान।
// लीप वर्ष और गलत तारीख़ (जैसे 29 फ़रवरी गैर-लीप वर्ष में, 31 अप्रैल) यहीं पकड़ी जाती हैं।
export const BIRTH_YEAR_MIN = 1900;
export const BIRTH_YEAR_MAX = 2100;

export function parseBirthDateISO(value) {
  const text = String(value ?? '').trim();
  const m = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return { ok: false, error: 'कृपया जन्म तारीख़ कैलेंडर से चुनें।' };
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (year < BIRTH_YEAR_MIN || year > BIRTH_YEAR_MAX) {
    return { ok: false, error: `जन्म वर्ष ${BIRTH_YEAR_MIN} से ${BIRTH_YEAR_MAX} के बीच होना चाहिए।` };
  }
  // UTC पर जाँच: तारीख़ वैसी ही वापस आनी चाहिए, नहीं तो वह गलत है (जैसे 2001-02-29)
  const check = new Date(Date.UTC(year, month - 1, day));
  if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) {
    return { ok: false, error: 'जन्म तारीख सही नहीं है।' };
  }
  return { ok: true, year, month, day, iso: `${m[1]}-${m[2]}-${m[3]}` };
}
