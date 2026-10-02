import type {
  IncomingMessage,
  ServerResponse,
} from 'node:http'

import { Module } from '@nestjs/common'
import { APP_FILTER } from '@nestjs/core'
import * as Sentry from '@sentry/nestjs'
import { LoggerModule } from 'nestjs-pino'
import { randomUUID } from 'node:crypto'
import {
  type SerializedRequest,
  type SerializedResponse,
  stdTimeFunctions,
} from 'pino'

import {
  AppConfigModule,
  AppConfigService,
} from '#app/platform/config/index.js'
import { AllExceptionsFilter } from '#app/platform/http/index.js'

/**
リクエスト ID を返すヘッダ。障害の問い合わせで利用者が示せるよう応答にも載せる
*/
export const REQUEST_ID_HEADER = 'x-request-id'

/**
外形監視(Route 53 ヘルスチェック)が 30 秒おきに叩くため、リクエストログから外す
*/
const UNLOGGED_PATHS = new Set(['/api/health'])

/**
 * 構造化ログとリクエストログ。nestjs-pino が Nest の Logger を
 * pino に差し替え、pino-http が全リクエストの 1 行ログと request ID を担う。
 * request ID は AsyncLocalStorage で持ち回るので、サービスやワーカーの奥で出したログにも付く
 *
 * - production: JSON を stdout へ。行き先(CloudWatch Logs)はコンテナランタイムが決める
 * - development: pino-pretty で人間向けに整形する
 * - test: 出さない
 *
 * 例外フィルタもここで登録する。PinoLogger は transient なので DI に任せる
 */
@Module({
  imports: [
    LoggerModule.forRootAsync({
      imports: [AppConfigModule],
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => {
        const env = config.get('NODE_ENV', { infer: true })

        return {
          // 処理の途中で logger.assign() した項目(利用者の ID など)をリクエストログにも載せる
          assignResponse: true,
          pinoHttp: {
            autoLogging: {
              ignore: (req: IncomingMessage) => UNLOGGED_PATHS.has(req.url ?? ''),
            },
            // pid・hostname はコンテナでは意味を持たない
            base: undefined,
            // 5xx は障害として error に上げ、メトリクスフィルタで拾う。4xx は利用者の入力の問題なので info のまま
            customLogLevel: (_req: IncomingMessage, res: ServerResponse, error?: Error) =>
              (error !== undefined || res.statusCode >= 500 ? 'error' : 'info'),
            formatters: {
              // CloudWatch Logs Insights で `level = "error"` と書けるよう数値でなく名前にする
              level: (label: string) => ({ level: label }),
            },
            genReqId: (_req: IncomingMessage, res: ServerResponse) => {
              // 受け取ったヘッダは信用せず、必ずこちらで採番する
              const id = randomUUID()

              res.setHeader(REQUEST_ID_HEADER, id)
              // Sentry のイベントから CloudWatch Logs のログ行(req.id)へ辿れるようにする
              Sentry.setTag('request_id', id)

              return id
            },
            level: env === 'test' ? 'silent' : 'info',
            /*
              残す項目を列挙する(pino-http の既定はヘッダを丸ごと出す)。
              Cookie(セッション)や認可ヘッダを落とすのと、CloudWatch Logs の取り込み量を抑えるため。
              利用者の IP はプロキシを経るので remoteAddress ではなく x-forwarded-for に入る
            */
            serializers: {
              req: (req: SerializedRequest) => ({
                forwardedFor: req.headers['x-forwarded-for'],
                id: req.id,
                method: req.method,
                url: req.url,
                userAgent: req.headers['user-agent'],
              }),
              res: (res: SerializedResponse) => ({ statusCode: res.statusCode }),
            },
            timestamp: stdTimeFunctions.isoTime,
            transport: env === 'development'
              ? {
                  options: { translateTime: 'SYS:HH:MM:ss' },
                  target: 'pino-pretty',
                }
              : undefined,
          },
        }
      },
    }),
  ],
  providers: [{
    provide: APP_FILTER,
    useClass: AllExceptionsFilter,
  }],
})
export class LoggingModule {}
