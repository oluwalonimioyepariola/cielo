import { PrismaNeon } from '@prisma/adapter-neon';

import { PrismaClient } from './generated/prisma/client';

// Server only: imported by API routes, never by app screens.

const connectionString = process.env.DATABASE_URL;

/** True when the Neon database is configured in .env. */
export const hasDatabase = Boolean(connectionString);

// Neon's pooled connection string (DATABASE_URL); migrations use the direct one (prisma.config.ts).
export const prisma = new PrismaClient({
  adapter: new PrismaNeon({ connectionString: connectionString ?? 'postgresql://not-configured' }),
});
