import * as v from 'valibot'

/*
  `.env` に `KEY=` と空欄で置かれた項目を未設定として扱う。
  dotenv は空欄を空文字として入れるため、そのままでは「未設定」と区別できない
  (t3-env の emptyStringAsUndefined と同じ扱い)
*/
const emptyStringAsUndefined = v.optional(
  v.union([
    v.pipe(v.literal(''), v.transform(() => {})),
    v.pipe(v.string(), v.nonEmpty()),
  ]),
)

// デフォルト値は開発・テスト用。production では実値を必ず設定すること
export const envSchema = v.pipe(
  v.object({
    DATABASE_URL: v.optional(
      v.pipe(v.string(), v.nonEmpty()),
      'postgresql://postgres:postgres@localhost:5432/myapp',
    ),
    /*
      通知メールの差出人。「表示名 <address>」形式も可。
      RESEND_API_KEY と揃って初めて送信できるため、開発の既定値は置かない
    */
    MAIL_FROM: emptyStringAsUndefined,
    NODE_ENV: v.optional(
      v.picklist(['development', 'test', 'production']),
      'development',
    ),
    PORT: v.optional(
      v.pipe(
        v.string(),
        v.transform(Number),
        v.integer(),
        v.minValue(1),
        v.maxValue(65535),
      ),
      '3000',
    ),
    /*
      Resend の API キー。未設定なら送信せず文面をログに出す。
      偽の既定値を置くと開発でも本物の API を叩いてしまうため、既定値は置かない
    */
    RESEND_API_KEY: emptyStringAsUndefined,
    // Sentry。DSN が無ければ送らない。環境とデプロイの識別はデプロイ時に .env へ書く(未設定なら NODE_ENV)
    SENTRY_DSN: v.optional(v.pipe(v.string(), v.url())),
    SENTRY_ENVIRONMENT: v.optional(v.pipe(v.string(), v.nonEmpty())),
    SENTRY_RELEASE: v.optional(v.pipe(v.string(), v.nonEmpty())),
    /*
      todo の完了を知らせるメールの宛先(サンプル)。未設定なら知らせない。
      認証を入れたら、設定ではなく利用者のアドレスへ送るように置き換える
    */
    TODO_NOTICE_MAIL_TO: emptyStringAsUndefined,
    WEB_APP_ORIGIN: v.optional(
      v.pipe(v.string(), v.url()),
      'http://localhost:5173',
    ),
  }),
  /*
    本番で通知の設定が欠けたまま起動すると、送信が黙って見送られメールが届かなくなる。
    欠けていることに気づけるよう起動時に落とす
  */
  v.check(
    environment => environment.NODE_ENV !== 'production'
      || (environment.MAIL_FROM !== undefined
        && environment.RESEND_API_KEY !== undefined),
    'production では MAIL_FROM と RESEND_API_KEY を設定してください',
  ),
)

export type Env = v.InferOutput<typeof envSchema>
