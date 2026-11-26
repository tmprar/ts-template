/*
  Sentry の初期化は、Nest を含む他のモジュールを読み込んだ後には行わない。
  Sentry は依存 package(pg・http 等)が読み込まれる時点で計装を組み込むため、このファイルを最初に読み込む
  (本番は node の --import(Dockerfile)、開発は main.ts の先頭の import)。
  設定は AppConfigService 経由ではなく、process.env を env.schema で検証して読む。
  このファイルは Nest の DI の外で実行され、AppConfigService を使えないため
*/
import * as Sentry from '@sentry/nestjs'
import * as v from 'valibot'

import { envSchema } from '#app/platform/config/index.js'

/**
 * トレースを送るリクエストの割合(例外が起きたリクエストは、この割合によらず送られる)。
 * すべてのリクエストのトレースは送らない。Sentry の無料枠(月 5,000 スパン)に収めるため
 */
const TRACES_SAMPLE_RATE = 0.1

/**
 * スパンに残す、どこへ何をして何が返ったかを表す属性(HTTP はメソッド・接続先・ステータス、DB は placeholder のままの文と対象の構造、ジョブはキューの名前と操作)。
 * 除外する属性ではなく、スパンに残す属性を列挙する。URL のパスとクエリには識別子
 * (外部サービス上の ID、共有 URL のトークンなど)が入りうる。
 * 除外する属性を列挙する方式では、新しい呼び出し先や SDK が追加した属性が除外の対象に入らず、気づかないまま Sentry へ送られる。
 *
 * HTTP の url.full と url.path には URL が、DB の db.query.parameter.* には束縛した値が入るため、どちらも残さない。
 * ジョブに投入した値も残さない。
 * リクエストのヘッダと利用者の IP は Sentry へ送らない要件のため、ヘッダと IP を表す属性もこの一覧に入れていない
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

  // DSN の有無では初期化を分岐しない。DSN が無ければ SDK は何も送らないため(開発・テスト)
  Sentry.init({
    /*
      外部への HTTP 要求のスパン名を、メソッドと接続先で付け直す。自動計装は URL をそのままスパン名にするため。
      callback を withStaticSpan で包むのは、traceLifecycle が 'static' のときに、包んだ callback だけが呼ばれるため
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
      イベントに付く受信リクエストのクエリとヘッダは、SDK の既定のままにせず、どちらも送らない。
      クエリには OAuth の認可コードと state のような秘密の値が入りうり、
      ヘッダは Cookie と Authorization 以外が既定で送られるため。
      どのエンドポイントで例外が起きたかはトランザクション名(Express のルート)に残る
    */
    dataCollection: {
      cookies: false,
      httpHeaders: false,
      urlQueryParams: false,
    },
    dsn: env.SENTRY_DSN,
    environment: env.SENTRY_ENVIRONMENT ?? env.NODE_ENV,
    /*
      死活監視のリクエストはトレースに含めない。Route 53 が 8 拠点から 30 秒おきにリクエストを送り(1 日約 23,000 回)、
      トレースに含めると無料枠を初日で使い切るため
    */
    ignoreTransactions: ['GET /api/health'],
    /*
      外部への HTTP 要求のブレッドクラムは作らない。スパンは beforeSendSpan で属性を選べるが、
      ブレッドクラムは URL をそのまま持ち、URL を除くには beforeSendSpan とは別の処理が必要になるため。
      どこへ何を要求して何が返ったかはスパン(http.client)に残る
    */
    integrations: [
      Sentry.nativeNodeFetchIntegration({ breadcrumbs: false }),
      Sentry.httpIntegration({ breadcrumbs: false }),
    ],
    release: env.SENTRY_RELEASE,
    /*
      SDK v11 の既定 'stream' のままにしない。'stream' はスパンを終了次第に個別に送るため、ignoreTransactions と
      ステータスコードによる除外(httpIntegration の ignoreStatusCodes、既定で 3xx・401〜404)が適用されず、
      ヘルスチェックや存在しないパスを探索するアクセスが「Missing Trace Root」のミドルウェアスパンとして Sentry に残る。
      'static' はリクエストの完了までスパンをまとめてから送るので、完了後にトランザクション名とステータスコードで
      そのリクエストのスパンをすべて除外できる
    */
    traceLifecycle: 'static',
    tracesSampleRate: TRACES_SAMPLE_RATE,
  })
}
