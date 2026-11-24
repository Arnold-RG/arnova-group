// Assert every homepage RWF amount sits in a convertible span (RWF is the base).
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const file = join(root, 'index.html');
assert(existsSync(file), 'Missing index.html');
const html = readFileSync(file, 'utf8').replace(/<!--[\s\S]*?-->/g, '');

function inside(html, index, openRe, closeTag) {
  const before = html.slice(0, index);
  let last = -1;
  let m;
  const copy = openRe.flags.includes('g') ? openRe : new RegExp(openRe.source, openRe.flags + 'g');
  while ((m = copy.exec(before))) last = m.index;
  if (last < 0) return false;
  const after = html.slice(last);
  const close = after.search(closeTag);
  return close === -1 || index < last + close;
}

const amountRe = /(?:^|[^0-9.,])([+]?)(\d{1,3}(?:,\d{3})+|\d{1,6})\s*RWF/g;
const bareRwf = [];
let match;
while ((match = amountRe.exec(html))) {
  const idx = match.index + match[0].search(/\d/);
  const ok =
    inside(html, idx, /data-rwf\s*=\s*["']\d+["']/g, /<\/span>|<\/div>/) ||
    inside(html, idx, /class\s*=\s*["'][^"']*\bprice\b[^"']*["']/g, /<\/div>/);
  if (!ok) bareRwf.push(match[0].trim() + ' @' + idx);
}

assert.equal(bareRwf.length, 0, 'Bare RWF amounts outside convertible spans: ' + bareRwf.join('; '));
assert.equal((html.match(/data-pln\s*=/g) || []).length, 0, 'Unexpected leftover data-pln attributes');
assert(!/50%\s*deposit/i.test(html), '50% deposit wording is not in the analysis file');
assert(!/id="service-ai"|AI-assisted digital tools|AI creation/.test(html), 'AI prototype offer should be removed');
assert(!/Optional daily care|Polish złoty as the base|data-pln=/.test(html), 'Daily/PLN care billing should be gone');

const required = [
  56000, 75000, 80000, 90000, 145000, 72000, 20000,
  9500, 15500, 25000, 26500, 28000, 36000, 27500, 34500, 6500, 16000, 19000, 18500,
  6000, 32000
];
for (const amount of required) {
  assert(new RegExp('data-rwf="' + amount + '"').test(html), 'Missing data-rwf="' + amount + '"');
}

assert(!/data-rwf="35000"/.test(html), 'Old Starter price 35000 is still present');
assert(html.includes('Optional monthly care'), 'Missing monthly care heading');

const packagePrices = [...html.matchAll(/class="price"[^>]*>([^<]+)<\/div>/g)].map((m) => m[1]);
assert.deepEqual(
  packagePrices,
  ['56,000 RWF', '75,000 RWF', '80,000 RWF', '90,000 RWF', '145,000 RWF', '72,000 RWF'],
  'Website package prices plus the mobile app prototype should be the v2 RWF amounts'
);
assert(!/92,000 RWF|id="flutter-app"|id="dashboard"/.test(html), 'Dashboard offer should be removed');
assert(html.includes('id="service-apps"') && html.includes('id="pricing-apps"'), 'Mobile apps service and price section are missing');
assert(/simple first app or prototype/i.test(html), 'Mobile apps should be described as a simple first app or prototype');
assert(/No domain included/.test(html), 'Mobile app prototype should say a domain is not included');
assert(/Larger or store-quality apps are quoted/.test(html), 'Larger apps should be quoted');
assert(!/BLIK/.test(html), 'BLIK should be removed');
assert(!/Polish złoty|option value="PLN"/.test(html), 'Złoty / PLN billing should be gone');
assert(/9:00–20:00/.test(html), 'Contact hours should be 9:00–20:00');
assert(!/10:00 PM/.test(html), 'Old 10:00 PM hours are still present');
assert(html.includes('Quoted after a free check'), 'Maps/SEO should be quoted after a free check');
assert(html.includes('+250 794 607 518'), 'WhatsApp number should be visible as text');
assert(existsSync(join(root, 'privacy/index.html')), 'privacy/index.html is needed so /privacy/ does not 404');

assert(html.includes('Launch offer'), 'Missing launch offer wording');
assert(html.includes('first 5 website clients'), 'Launch offer should name the first 5 website clients');
assert((html.match(/<dt>Launch offer<\/dt>/g) || []).length === 5, 'Each website package should include a launch-offer line');
assert(!/limited time|hurry|only \d+ (spots|left)|countdown|selling out|act now/i.test(html), 'Launch offer should not use urgency or fake scarcity');
assert(/not affiliated with Google/i.test(html), 'Google affiliation disclaimer is missing');
assert(/do not guarantee (search )?rankings/i.test(html), 'No-guaranteed-rankings wording is missing');
assert(/paid hosting is included/.test(html), 'Checkout shop should say paid hosting is included because of real checkout');
assert(html.includes('id="trust"'), 'Trust section is missing');
assert(html.includes("We'll take") && /Welcome/.test(html), 'Warm welcome hero copy is missing');
assert(html.includes('Talk') && html.includes('Review') && html.includes('Launch'), 'How-we-work should include talk, plan, build, review and launch');
assert(!/digital tool/.test(html), 'FAQ still uses leftover digital-tool wording');
assert(!/Four services, kept/.test('x') || html.includes('Four services, kept'), 'Services heading should mention four services');

const fx = readFileSync(join(root, 'js/fx-rates.js'), 'utf8');
const currencyJs = readFileSync(join(root, 'js/pricing-currency.js'), 'utf8');
assert(!/PLN/.test(fx) && !/PLN/.test(currencyJs), 'PLN rate should be removed from the FX files; keep EUR/USD');
assert(/EUR: 0\.000615/.test(fx) && /USD: 0\.000676/.test(fx), 'EUR/USD display rates should remain');
assert(existsSync(join(root, 'render.yaml')), 'render.yaml for arnova-africa-preview is missing');
assert(!/option value="PLN"/.test(html), 'PLN should not appear as a currency option');

console.log('PASS: every homepage RWF amount is in a convertible span.');
