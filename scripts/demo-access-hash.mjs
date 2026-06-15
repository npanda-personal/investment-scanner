// Generate the SHA-256 hash for a demo access code.
//
// The static GitHub Pages demo is gated by DemoAccessGate, which compares the
// SHA-256 of the typed code against the `hashes` array in
// frontend/public/demo-access.json. This prints that hash so you can paste it in
// without ever committing the plaintext code.
//
// Usage:
//   node scripts/demo-access-hash.mjs "my-demo-code"
//
// Then put the printed hex into frontend/public/demo-access.json:
//   { "title": "...", "hint": "...", "hashes": ["<printed-hex>"] }
//
// Uses Node's built-in crypto (same SHA-256 the browser's Web Crypto computes),
// so the hashes match.
import { createHash } from 'node:crypto';

const code = process.argv[2];
if (!code) {
  console.error('Usage: node scripts/demo-access-hash.mjs "<access-code>"');
  process.exit(1);
}

const hex = createHash('sha256').update(code, 'utf8').digest('hex');
console.log(hex);
