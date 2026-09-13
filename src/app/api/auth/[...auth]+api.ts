import { auth } from '@/server/auth';

// Every Better Auth endpoint (/api/auth/...) is served by this one handler.
const handler = auth.handler;

export { handler as GET, handler as POST };
