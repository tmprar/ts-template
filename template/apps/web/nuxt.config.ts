import { compilerOptions } from '@myapp/typescript-config/base.json' with { type: 'json' }

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  app: {
    head: {
      title: 'myapp',
    },
  },

  // 配色は端末(OS・ブラウザ)の設定に従う
  colorMode: {
    preference: 'system',
  },
  compatibilityDate: '2025-07-15',
  css: ['~/assets/css/app.css'],
  devServer: {
    // APIが3000を使うため衝突を避ける。APIのWEB_APP_ORIGIN(CORS許可オリジン)と揃えること
    port: 5173,
  },
  devtools: { enabled: true },
  eslint: {
    config: {
      // ベース(eslint recommended・typescript-eslint)は@myapp/eslint-configが持つ。
      // Nuxt側が同じプラグインを重複登録するとFlatConfigComposerが衝突エラーを出すため無効化
      standalone: false,
      // フォーマット系は@myapp/eslint-configの@stylisticに一本化する
      stylistic: false,
      typescript: {
        strict: true,
      },
    },
  },
  modules: ['@nuxt/eslint', '@nuxt/ui'],
  runtimeConfig: {
    public: {
      // APIの接続先。NUXT_PUBLIC_API_BASE_URLで上書きできる
      apiBaseUrl: 'http://localhost:3000',
    },
  },

  // ブラウザから直接APIを叩くSPAとして静的に配信する(docs/architecture.md)。
  // SSRにする場合は、Nuxtサーバから呼ぶAPIの接続先と認証情報の受け渡しを別に設計する
  ssr: false,
  typescript: {
    // tsconfigはNuxtが.nuxt配下に生成するためextendsできない。共有設定はここから注入する。
    // tsConfigはapp以外の文脈には既存キーの上書きしかしないため、node・sharedにも明示的に渡す。
    nodeTsConfig: {
      compilerOptions,
      include: ['../openapi-ts.config.ts', '../vitest.config.ts'],
    },
    sharedTsConfig: { compilerOptions },
    /*
      vitestのglobals(describe・expect等)を型に入れる。実行側はvitest.config.tsで有効化する。
      test/はNuxt環境で動かすテストの置き場で、生成tsconfigの対象外のままだと
      型チェックも型情報つきlintも効かないため明示的に含める
    */
    tsConfig: {
      compilerOptions: {
        ...compilerOptions,
        types: ['vitest/globals'],
      },
      include: ['../test/**/*'],
    },
  },
})
