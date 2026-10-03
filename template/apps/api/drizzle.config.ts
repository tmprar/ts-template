import { defineConfig } from 'drizzle-kit';

// drizzle-kit CLI用の設定。アプリ本体のconfigモジュールは通らないため、
// ここではprocess.envを直接参照する。
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './drizzle',
  dbCredentials: {
    url:
      process.env['DATABASE_URL']
      ?? 'postgresql://postgres:postgres@localhost:5432/myapp',
  },
});
