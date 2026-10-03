import type {
  ArgumentsHost,
  ExceptionFilter,
} from '@nestjs/common'
import type { Response } from 'express'

import {
  Catch,
  HttpException,
  HttpStatus,
} from '@nestjs/common'
import * as Sentry from '@sentry/nestjs'
import { PinoLogger } from 'nestjs-pino'

/**
 * 全例外をここで 1 度だけ捕まえる。
 * 5xx はスタック付きで error でログに記録する
 * 4xx は利用者の入力の問題なので記録しない
 *
 * Sentryへもここから送る。原因の切り分け(グルーピング・影響ユーザー・配備との紐付け)は Sentry、
 * 記録は CloudWatch Logs と役割を分ける。
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly logger: PinoLogger) {
    this.logger.setContext(AllExceptionsFilter.name)
  }

  public catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>()
    const status = exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR

    if (status >= 500) {
      this.logger.error(
        {
          err: exception,
          event: 'unhandled_exception',
        },
        '処理できない例外が発生しました',
      )
      // 未処理の例外として送る(Sentry の SentryGlobalFilter と同じ扱い。handled で絞るアラートルールに載る)
      Sentry.captureException(exception, {
        mechanism: {
          handled: false,
          type: 'nestjs.all_exceptions_filter',
        },
      })
    }

    // 応答の形は Nest の既定(BaseExceptionFilter)に合わせる。5xx の内容は利用者に見せない
    const body = exception instanceof HttpException
      ? exception.getResponse()
      : {
          message: 'Internal server error',
          statusCode: status,
        }

    response.status(status).json(body)
  }
}
