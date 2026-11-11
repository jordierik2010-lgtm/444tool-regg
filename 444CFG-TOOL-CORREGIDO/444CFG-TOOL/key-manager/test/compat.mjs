// Run: node key-manager/test/compat.mjs   (Node >= 20)
import { createRequire } from 'node:module';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
const Lic = createRequire(import.meta.url)('../license.js');
const seedHex = '07'.repeat(32);                       // TEST key only — never a real key
const hwid = '0123456789ABCDEF0123456789ABCDEF';

const pub = await Lic.publicFromPrivate(seedHex);
const key = await Lic.signLicense(seedHex, hwid);
assert.match(key, /^([A-Z2-7]{8}-){12}[A-Z2-7]{7}$/, 'format: 64 bytes -> 103 base32 chars in blocks of 8');

// independent verification with Node's OpenSSL (not WebCrypto)
const raw = Buffer.from(key.replaceAll('-', ''), 'latin1');
const abc = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'; let bits = 0, buf = 0; const out = [];
for (const c of raw.toString()) { buf = (buf << 5) | abc.indexOf(c); bits += 5; if (bits >= 8) { bits -= 8; out.push((buf >> bits) & 255); } }
const sig = Buffer.from(out);
const spki = Buffer.concat([Buffer.from('302a300506032b6570032100', 'hex'), Buffer.from(pub, 'hex')]);
const pubKey = crypto.createPublicKey({ key: spki, format: 'der', type: 'spki' });
assert.equal(sig.length, 64);
assert.ok(crypto.verify(null, Buffer.from('444CFG|v1|' + hwid), pubKey, sig), 'valid signature');
assert.ok(!crypto.verify(null, Buffer.from('444CFG|v1|' + hwid.replace('0123', '0124')), pubKey, sig), 'other HWID must fail');
assert.ok(!crypto.verify(null, Buffer.from('444RESTOOL|v1|' + hwid), pubKey, sig), 'old product prefix must fail');
const g = await Lic.generate(); assert.equal(g.privateHex.length, 64); assert.equal(await Lic.publicFromPrivate(g.privateHex), g.publicHex);
console.log('OK');
console.log('TEST VECTOR (for Rust known-answer test)');
console.log(JSON.stringify({ seedHex, publicHex: pub, hwid, key }, null, 1));
