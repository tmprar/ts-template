import * as v from 'valibot'

import { envSchema } from '#app/platform/config/env.schema.js'

describe('envSchema', () => {
  it('何も設定していない開発環境では既定値で通り、通知の設定は未設定のままになる', () => {
    expect(v.parse(envSchema, {})).toEqual({
      DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/myapp',
      MAIL_FROM: undefined,
      NODE_ENV: 'development',
      PORT: 3000,
      RESEND_API_KEY: undefined,
      SENTRY_DSN: undefined,
      SENTRY_ENVIRONMENT: undefined,
      SENTRY_RELEASE: undefined,
      TODO_NOTICE_MAIL_TO: undefined,
      WEB_APP_ORIGIN: 'http://localhost:5173',
    })
  })

  it('PORT は数値に変換する', () => {
    expect(v.parse(envSchema, { PORT: '8080' }).PORT).toBe(8080)
  })

  it('形式が不正な値は通らない', () => {
    expect([
      v.safeParse(envSchema, { PORT: '0' }).success,
      v.safeParse(envSchema, { PORT: 'abc' }).success,
      v.safeParse(envSchema, { NODE_ENV: 'staging' }).success,
      v.safeParse(envSchema, { WEB_APP_ORIGIN: 'not-a-url' }).success,
    ]).toEqual([false, false, false, false])
  })

  it('空欄で置かれた通知の設定は未設定として扱う', () => {
    const environment = v.parse(envSchema, {
      MAIL_FROM: '',
      RESEND_API_KEY: '',
      TODO_NOTICE_MAIL_TO: '',
    })

    expect([
      environment.MAIL_FROM,
      environment.RESEND_API_KEY,
      environment.TODO_NOTICE_MAIL_TO,
    ]).toEqual([undefined, undefined, undefined])
  })

  it('通知の設定を書いた開発環境ではその値を使う', () => {
    const environment = v.parse(envSchema, {
      MAIL_FROM: 'myapp <onboarding@resend.dev>',
      RESEND_API_KEY: 're_dev_key',
    })

    expect([environment.MAIL_FROM, environment.RESEND_API_KEY])
      .toEqual(['myapp <onboarding@resend.dev>', 're_dev_key'])
  })

  it('本番で通知の設定が欠けていると通らない', () => {
    expect([
      v.safeParse(envSchema, { NODE_ENV: 'production' }).success,
      v.safeParse(envSchema, {
        MAIL_FROM: 'myapp <no-reply@example.com>',
        NODE_ENV: 'production',
      }).success,
      v.safeParse(envSchema, {
        NODE_ENV: 'production',
        RESEND_API_KEY: 're_key',
      }).success,
      v.safeParse(envSchema, {
        MAIL_FROM: 'myapp <no-reply@example.com>',
        NODE_ENV: 'production',
        RESEND_API_KEY: 're_key',
      }).success,
    ]).toEqual([false, false, false, true])
  })
})
