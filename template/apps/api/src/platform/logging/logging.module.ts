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
 * リクエストIDはログだけに出さず、応答のヘッダにも含める。障害の問い合わせのときに利用者がリクエストIDを提示できるようにするため
 */
export const REQUEST_ID_HEADER = 'x-request-id'

/**
 * 死活監視(Route 53 のヘルスチェック)が 30 秒おきにリクエストを送るパスは、リクエストログの対象にしない
 */
const UNLOGGED_PATHS = new Set(['/api/health'])

/**
 * 例外フィルタのインスタンスは DI の外では生成せず、このモジュールで登録する。PinoLogger は transient スコープなので、例外フィルタの生成と PinoLogger の注入は DI に行わせる
 */
@Module({
  imports: [
    LoggerModule.forRootAsync({
      imports: [AppConfigModule],
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => {
        const env = config.get('NODE_ENV', { infer: true })

        return {
          assignResponse: true,
          pinoHttp: {
            autoLogging: {
              ignore: (req: IncomingMessage) => UNLOGGED_PATHS.has(req.url ?? ''),
            },
            // pid・hostname はコンテナでは意味を持たないため出力しない
            base: undefined,
            // 5xx は障害として error レベルで記録し、メトリクスフィルタの対象にする。4xx は利用者の入力の問題なので info のままにする
            customLogLevel: (_req: IncomingMessage, res: ServerResponse, error?: Error) =>
              (error !== undefined || res.statusCode >= 500 ? 'error' : 'info'),
            formatters: {
              // level は数値でなく名前で出力する。CloudWatch Logs Insights で `level = "error"` と書けるようにするため
              level: (label: string) => ({ level: label }),
            },
            genReqId: (_req: IncomingMessage, res: ServerResponse) => {
              const id = randomUUID()

              res.setHeader(REQUEST_ID_HEADER, id)
              // Sentry のイベントから、同じ ID(req.id)を持つ CloudWatch Logs のログ行を検索できるようにする
              Sentry.setTag('request_id', id)

              return id
            },
            level: env === 'test' ? 'silent' : 'info',
            /*
              pino-http の既定(ヘッダをすべて出力する)のままにせず、ログに出力する項目を列挙する。
              Cookie(セッション)や認可ヘッダをログに含めず、CloudWatch Logs の取り込み量を抑えるため。
              利用者の IP は remoteAddress ではなく x-forwarded-for から取る。リクエストは TLS を終端するプロキシを経由して届くため
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
