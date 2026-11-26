import { errorResponseSchema } from '@myapp/contracts'
import { ApiResponse as SwaggerApiResponse } from '@nestjs/swagger'

/**
 * controller のメソッドに、指定したステータスのエラー応答と、その応答が取る`code`の一覧を OpenAPI に出力するデコレータを返す
 */
export function ApiErrorResponse(
  status: number,
  codes: readonly [string, ...string[]],
): ClassDecorator & MethodDecorator {
  return SwaggerApiResponse({
    standardSchema: errorResponseSchema(status, codes),
    status,
  })
}

/**
 * `code`を指定していない例外に入れる、ステータスごとの既定の`code`を返す。
 * Nest が投げる例外(存在しないルートの404、入力の検証の400)と、想定していない例外の500が対象になる
 */
export function defaultErrorCode(status: number): string {
  switch (status) {
    case 401: {
      return 'UNAUTHENTICATED'
    }
    case 403: {
      return 'FORBIDDEN'
    }
    case 404: {
      return 'NOT_FOUND'
    }
    case 409: {
      return 'CONFLICT'
    }
    case 503: {
      return 'SERVICE_UNAVAILABLE'
    }
    default: {
      return status >= 500 ? 'INTERNAL_ERROR' : 'INVALID_REQUEST'
    }
  }
}
