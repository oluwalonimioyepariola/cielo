import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

// Prisma CLI settings (migrations, generate). Migrations use Neon's direct, unpooled connection;
// the app itself connects through the pooled DATABASE_URL (src/server/db.ts).
// `prisma generate` needs no database, so app builds (EAS) can generate the client without any secrets.
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  ...(process.env.DIRECT_URL ? { datasource: { url: env('DIRECT_URL') } } : {}),
});
