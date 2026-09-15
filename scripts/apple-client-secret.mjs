// Generates the APPLE_CLIENT_SECRET for Sign in with Apple: a JWT signed with your Apple key.
// Apple caps it at 6 months, so run this again before it expires.
//
// Usage:
//   node scripts/apple-client-secret.mjs <TEAM_ID> <KEY_ID> <SERVICES_ID> <path/to/AuthKey_XXXX.p8>
import { readFileSync } from 'node:fs';
import { SignJWT, importPKCS8 } from 'jose';

const [teamId, keyId, clientId, keyPath] = process.argv.slice(2);
if (!teamId || !keyId || !clientId || !keyPath) {
  console.error('Usage: node scripts/apple-client-secret.mjs <TEAM_ID> <KEY_ID> <SERVICES_ID> <path/to/AuthKey.p8>');
  process.exit(1);
}

const key = await importPKCS8(readFileSync(keyPath, 'utf8'), 'ES256');
const sixMonths = 180 * 24 * 60 * 60;
const secret = await new SignJWT({})
  .setProtectedHeader({ alg: 'ES256', kid: keyId })
  .setIssuer(teamId)
  .setIssuedAt()
  .setExpirationTime(Math.floor(Date.now() / 1000) + sixMonths)
  .setAudience('https://appleid.apple.com')
  .setSubject(clientId)
  .sign(key);

console.log(secret);
console.error(`\nPaste the line above into .env as APPLE_CLIENT_SECRET. It expires in 180 days.`);
