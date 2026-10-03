/*
  Sentry の初期化。Nest より先に、他のモジュールを読み込む前に走らせる必要がある
  (依存(pg・http 等)の計装は読み込み時に差し込まれるため)。
  本番は node の --import で(Dockerfile)、開発は main.ts の先頭の import で読む。
  Nest の外で動くため、ここだけは AppConfigService を使えず process.env を env.schema で検証して読む
*/
import * as Sentry from '@sentry/nestjs'
import * as v from 'valibot'

import { envSchema } from '#app/platform/config/index.js'

/**
トレース(リクエストの内訳)を送る割合。無料枠(月 5,000 スパン)に収める。
例外が起きたリクエストは割合によらず送られる
*/
const TRACES_SAMPLE_RATE = 0.1

/**
スパンに残す属性(並びは lint が辞書順に保つ)。URL のパスとクエリには identifier
(外部サービス上の ID、共有 URL のトークンなど)が入りうるため、伏せる側ではなく残す側を並べる。
伏せる側を並べる形は、新しい呼び出し先や SDK が増やした属性で静かに漏れる。

残すのは「どこへ何をして何が返ったか」だけ:
HTTP はメソッド・接続先・ステータス(URL は url.full / url.path に入るので残さない)、
DB は placeholder のままの文と対象の構造(束縛した値は db.query.parameter.* で来る)、
ジョブはキューの名前と操作(投入した値は残さない)
*/
const SPAN_ATTRIBUTES_TO_KEEP = new Set([
  'db.collection.name',
  'db.namespace',
  'db.operation.name',
  'db.query.summary',
  'db.query.text',
  'db.system.name',
  'http.request.method',
  'http.response.status_code',
  'messaging.destination.name',
  'messaging.operation.name',
  'messaging.system',
  'server.address',
  'server.port',
  'url.scheme',
])

if (!Sentry.isInitialized()) {
  const env = v.parse(envSchema, process.env)

  // DSN が無ければ SDK は何も送らない(開発・テスト)
  Sentry.init({
    /*
      残す属性だけを選び、外部への要求の名前は「メソッド + 接続先」に置き換える
      (自動計装は URL をそのままスパン名にする)。
      traceLifecycle: 'static' のため withStaticSpan で包む(包まない callback は呼ばれない)
    */
    beforeSendSpan: Sentry.withStaticSpan((span) => {
      const data = Object.fromEntries(
        Object.entries(span.data).filter(
          ([key]) => key.startsWith('sentry.') || SPAN_ATTRIBUTES_TO_KEEP.has(key),
        ),
      )

      return {
        ...span,
        data,
        description: span.op === 'http.client'
          ? `${String(data['http.request.method'])} ${String(data['server.address'])}`
          : span.description,
      }
    }),
    /*
      イベントに付く受信リクエストの情報も、残すものだけにする(スパンの属性とは別経路)。
      クエリには認可コードやトークンが入りうり(OAuth のコールバックなど)、
      ヘッダは Cookie と Authorization 以外が既定で載る。どちらも落とす。
      どのエンドポイントで落ちたかはトランザクション名(Express のルート)に残る
    */
    dataCollection: {
      cookies: false,
      httpHeaders: false,
      urlQueryParams: false,
    },
    dsn: env.SENTRY_DSN,
    environment: env.SENTRY_ENVIRONMENT ?? env.NODE_ENV,
    /*
      死活監視は Route 53 が 8 拠点から 30 秒おきに叩く(1 日約 23,000 回)。トレースに載せると
      無料枠(月 5,000 スパン)を初日で使い切るので、リクエストログと同様に除く
    */
    ignoreTransactions: ['GET /api/health'],
    /*
      外へ出す要求のブレッドクラムは作らせない。スパンは beforeSendSpan で属性を選べるが、
      ブレッドクラムは URL をそのまま持ち選別の口が別になるため。
      どこへ何を叩いて何が返ったかはスパン(http.client)に残る
    */
    integrations: [
      Sentry.nativeNodeFetchIntegration({ breadcrumbs: false }),
      Sentry.httpIntegration({ breadcrumbs: false }),
    ],
    // 配備したイメージのタグ(コミットの SHA)。どの配備から出始めたかを見る
    release: env.SENTRY_RELEASE,
    /*
      SDK v11 の既定 'stream' はスパンを終了次第に個別に送るため、ignoreTransactions と
      ステータスコードによる除外(httpIntegration の ignoreStatusCodes、既定で 3xx・401〜404)が効かず、
      ヘルスチェックや存在しないパスへの探りが「Missing Trace Root」のミドルウェアスパンとして残った。
      'static' はリクエスト完了までまとめてから送るので、終わった後に名前・ステータスで丸ごと捨てられる
    */
    traceLifecycle: 'static',
    /*
      Cookie と Authorization は SDK が [Filtered] にするが、それ以外のヘッダと利用者の IP は
      既定でスパンの属性に載る。どちらも beforeSendSpan の allowlist で落としている
    */
    tracesSampleRate: TRACES_SAMPLE_RATE,
  })
}
