import { defineConfig } from 'drizzle-kit'

// このファイルではAppConfigService経由ではなくprocess.envを直接参照する。
// drizzle-kitの実行ではアプリ本体のconfigモジュールが読み込まれないため
export default defineConfig({
  dbCredentials: {
    url:
      process.env['DATABASE_URL']
      ?? 'postgresql://postgres:postgres@localhost:5432/myapp',
  },
  dialect: 'postgresql',
  out: './drizzle',
  schema: './src/db/schema.ts',
})
