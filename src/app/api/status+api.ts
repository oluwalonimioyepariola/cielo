import { providers } from '@/server/auth';
import { hasDatabase } from '@/server/db';

/** Which parts of sign-in are set up on this server. Reports only yes/no, never a key. */
export function GET() {
  return Response.json({ database: hasDatabase, google: providers.google, apple: providers.apple });
}
