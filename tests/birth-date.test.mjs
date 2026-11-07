// जन्म तारीख़ पार्सर के टेस्ट: YYYY-MM-DD, लीप वर्ष, गलत तारीख़ें, सीमा से बाहर के वर्ष।
// चलाने के लिए (रिपो के रूट से): node tests/birth-date.test.mjs
import { parseBirthDateISO, BIRTH_YEAR_MIN, BIRTH_YEAR_MAX } from '../src/birth-date.js';

let failed = 0;
const ok = (cond, msg) => { console.log((cond ? 'PASS ' : 'FAIL ') + msg); if (!cond) { failed++; process.exitCode = 1; } };

const valid = [
  ['1998-08-15', 1998, 8, 15, 'सामान्य तारीख़'],
  ['2000-02-29', 2000, 2, 29, '2000 लीप वर्ष (400 से भाज्य)'],
  ['2024-02-29', 2024, 2, 29, '2024 लीप वर्ष'],
  ['1900-01-01', 1900, 1, 1, 'सीमा की शुरुआत'],
  ['2100-12-31', 2100, 12, 31, 'सीमा का अंत'],
  ['2024-04-30', 2024, 4, 30, 'महीने का आख़िरी दिन (30)']
];
for (const [input, y, m, d, label] of valid) {
  const r = parseBirthDateISO(input);
  ok(r.ok && r.year === y && r.month === m && r.day === d, `मान्य: ${input} (${label})`);
}

const invalid = [
  ['2001-02-29', 'गैर-लीप वर्ष 2001 में 29 फ़रवरी'],
  ['1900-02-29', '1900 लीप नहीं (100 से भाज्य, 400 से नहीं)'],
  ['2100-02-29', '2100 लीप नहीं'],
  ['2024-04-31', 'अप्रैल में 31 दिन नहीं होते'],
  ['2024-13-01', 'महीना 13'],
  ['2024-00-10', 'महीना 0'],
  ['2024-06-00', 'दिन 0'],
  ['1899-12-31', 'सीमा से पहले का वर्ष'],
  ['2101-01-01', 'सीमा से बाद का वर्ष'],
  ['15-08-1998', 'DD-MM-YYYY प्रारूप स्वीकार नहीं'],
  ['15/08/1998', 'DD/MM/YYYY प्रारूप स्वीकार नहीं'],
  ['1998-8-15', 'एक अंक वाला महीना/दिन'],
  ['1998-08-15T00:00', 'अतिरिक्त समय वाला मान'],
  ['', 'खाली मान'],
  [null, 'null मान'],
  [undefined, 'undefined मान']
];
for (const [input, label] of invalid) {
  const r = parseBirthDateISO(input);
  ok(r.ok === false && typeof r.error === 'string' && r.error.length > 0, `अमान्य: ${JSON.stringify(input)} (${label})`);
}

ok(BIRTH_YEAR_MIN === 1900 && BIRTH_YEAR_MAX === 2100, 'वर्ष की सीमा 1900–2100 है (फ़ॉर्म की min/max से मेल)');

if (failed) console.log(`\n${failed} जाँच विफल`);
else console.log('\nसभी जाँच सफल');
