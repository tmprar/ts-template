import type * as v from 'valibot'

import {
  applyDecorators,
  HttpCode,
  HttpStatus,
  SerializeOptions,
} from '@nestjs/common'
import {
  ApiNoContentResponse,
  ApiResponse as SwaggerApiResponse,
} from '@nestjs/swagger'

// スキーマの出力型(またはそのPromise)を返すメソッドにしか付けられないデコレータ型
type SchemaMethodDecorator<TOutput> = <
  TMethod extends (...arguments_: never[]) => Promise<TOutput> | TOutput,
>(
  target: object,
  propertyKey: string | symbol,
  descriptor: TypedPropertyDescriptor<TMethod>,
) => void

// OpenAPIのレスポンス定義と実行時シリアライズを同じvalibotスキーマで宣言する。
// 戻り値がスキーマの出力型と一致しないメソッドに付けるとコンパイルエラーになる。
// 引数なしの@ApiResponse()はボディなしの204 No Contentを宣言する
export function ApiResponse(): MethodDecorator
export function ApiResponse<TSchema extends v.GenericSchema>(
  schema: TSchema,
  status?: number,
): SchemaMethodDecorator<v.InferOutput<TSchema>>
export function ApiResponse(
  schema?: v.GenericSchema,
  status = 200,
): MethodDecorator {
  if (!schema) {
    return applyDecorators(
      HttpCode(HttpStatus.NO_CONTENT),
      ApiNoContentResponse(),
    )
  }

  // StandardSchemaSerializerInterceptorは配列レスポンスの各要素にスキーマを
  // 適用するため、配列スキーマの場合は要素スキーマをシリアライザに渡す
  const serializerSchema
    = schema.type === 'array'
      ? (schema as v.ArraySchema<v.GenericSchema, undefined>).item
      : schema

  return applyDecorators(
    SwaggerApiResponse({
      standardSchema: schema,
      status,
    }),
    SerializeOptions({ schema: serializerSchema }),
  )
}
