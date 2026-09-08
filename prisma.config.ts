import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

// Prisma CLI settings (migrations, generate). Migrations use Neon's direct, unpooled connection;
// the app itself connects through the pooled DATABASE_URL (src/server/db.ts).
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: {
    url: env('DIRECT_URL'),
  },
});
