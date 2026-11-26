import type { ErrorResponse } from '@myapp/contracts'
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

import { defaultErrorCode } from '#app/platform/http/api-error.js'

/**
 * 4xx は error に記録せず、Sentry へも送らない。4xx は利用者の入力の問題であり、リクエストログのステータスに残るため。
 *
 * 例外を捕まえて投げ直さない場所では、記録をこのフィルタに任せない。その例外はこのフィルタに届かず記録されないため、
 * 例外を捕まえた場所でログに残す
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly logger: PinoLogger) {
    this.logger.setContext(AllExceptionsFilter.name)
  }

  /**
   * どこでも処理されなかった例外を受け取り、HttpException はそのステータスで、それ以外の例外は 500 で、共通の形の本文を応答し、
   * ステータスが 5xx のときは例外を error のログに記録して Sentry へ送る
   */
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
      // 処理済みの例外としては送らず、未処理の例外として送る。handled の値で絞り込むアラートルールの対象にするため
      Sentry.captureException(exception, {
        mechanism: {
          handled: false,
          type: 'nestjs.all_exceptions_filter',
        },
      })
    }

    response.status(status).json(toErrorResponse(exception, status))
  }
}

/**
 * 例外から、すべてのエラー応答に共通の形(code・message・statusCode)の本文を作って返す。
 * `code`を指定していない例外には、ステータスごとの既定の`code`を入れる。
 * HttpException でない例外の内容は本文に含めない。内部のメッセージに接続情報などが含まれることがあるため
 */
function toErrorResponse(exception: unknown, status: number): ErrorResponse | object {
  if (!(exception instanceof HttpException)) {
    return {
      code: defaultErrorCode(status),
      message: 'Internal server error',
      statusCode: status,
    }
  }

  const detail = exception.getResponse()

  if (typeof detail === 'string') {
    return {
      code: defaultErrorCode(status),
      message: detail,
      statusCode: status,
    }
  }

  const { code, message } = detail as {
    code?: ErrorResponse['code']
    message?: string | string[]
  }

  /*
    code も message も持たない本文は、共通の形に直さずそのまま返す。稼働状況の確認(terminus)は、
    検査の結果(status・info・error・details)を本文にした503を投げ、監視はその形を読むため
  */
  if (code === undefined && message === undefined) {
    return detail
  }

  if (Array.isArray(message)) {
    return {
      code: code ?? defaultErrorCode(status),
      details: message,
      message: exception.message,
      statusCode: status,
    }
  }

  return {
    code: code ?? defaultErrorCode(status),
    message: message ?? exception.message,
    statusCode: status,
  }
}
