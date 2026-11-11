/* 444CFG license core — Ed25519 over "444CFG|v1|" + HWID. Shared by the web manager and the Node tests.
   The Rust verifier (src-tauri/src/license.rs) uses the exact same message and encoding. */
(function (root) {
  'use strict';
  const PREFIX = '444CFG|v1|';
  const DER = Uint8Array.from([0x30,0x2e,0x02,0x01,0x00,0x30,0x05,0x06,0x03,0x2b,0x65,0x70,0x04,0x22,0x04,0x20]);
  const hex = b => Array.from(b, x => x.toString(16).padStart(2, '0')).join('');
  function fromHex(h, n) {
    const t = String(h).trim();
    if (!new RegExp('^[0-9a-fA-F]{' + n * 2 + '}$').test(t)) throw Error('Debe contener ' + n * 2 + ' caracteres hexadecimales.');
    return Uint8Array.from(t.match(/../g), x => parseInt(x, 16));
  }
  function base32(b) {
    const abc = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let buf = 0, bits = 0, out = '';
    for (const n of b) { buf = (buf << 8) | n; bits += 8; while (bits >= 5) { bits -= 5; out += abc[(buf >>> bits) & 31]; } }
    if (bits) out += abc[(buf << (5 - bits)) & 31];
    return out;
  }
  const normHwid = h => String(h).trim().toUpperCase();
  const validHwid = h => /^[0-9A-F]{32}$/.test(h);
  const subtle = () => { const s = globalThis.crypto && globalThis.crypto.subtle; if (!s) throw Error('Necesitas Chrome o Edge actualizado.'); return s; };
  async function generate() {
    const pair = await subtle().generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
    const pkcs8 = new Uint8Array(await subtle().exportKey('pkcs8', pair.privateKey));
    const pub = new Uint8Array(await subtle().exportKey('raw', pair.publicKey));
    if (pkcs8.length !== 48 || !DER.every((v, i) => pkcs8[i] === v) || pub.length !== 32) throw Error('Formato de claves inesperado.');
    return { privateHex: hex(pkcs8.slice(16)), publicHex: hex(pub) };
  }
  async function importPriv(seed, extractable) {
    const der = new Uint8Array(48); der.set(DER); der.set(seed, 16);
    return subtle().importKey('pkcs8', der, { name: 'Ed25519' }, !!extractable, ['sign']);
  }
  async function publicFromPrivate(privateHex) {
    const jwk = await subtle().exportKey('jwk', await importPriv(fromHex(privateHex, 32), true));
    const b = atob(jwk.x.replace(/-/g, '+').replace(/_/g, '/'));
    return hex(Uint8Array.from(b, c => c.charCodeAt(0)));
  }
  async function signLicense(privateHex, hwidRaw) {
    const hwid = normHwid(hwidRaw);
    if (!validHwid(hwid)) throw Error('El HWID debe tener exactamente 32 caracteres de 0 a 9 o A a F.');
    const key = await importPriv(fromHex(privateHex, 32), false);
    const sig = new Uint8Array(await subtle().sign('Ed25519', key, new TextEncoder().encode(PREFIX + hwid)));
    return base32(sig).match(/.{1,8}/g).join('-');
  }
  const api = { PREFIX, generate, publicFromPrivate, signLicense, normHwid, validHwid, fromHex, base32 };
  root.Lic = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
