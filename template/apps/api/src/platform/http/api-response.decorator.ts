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

/**
 * controller のメソッドを、本文を返さないルートにするデコレータを返す。ステータスを 204 にし、OpenAPI に本文なしの応答を出力する
 */
export function ApiResponse(): MethodDecorator
/**
 * controller のメソッドに、OpenAPI のレスポンス定義と実行時のシリアライズを、渡した valibot スキーマから付けるデコレータを返す。
 * 戻り値がスキーマの出力型と一致しないメソッドに付けると、コンパイルエラーになる
 */
export function ApiResponse<TSchema extends v.GenericSchema>(
  schema: TSchema,
  status?: number,
): SchemaMethodDecorator<v.InferOutput<TSchema>>
/**
 * スキーマを渡さなければ 204 の応答を、渡せばそのスキーマによる OpenAPI のレスポンス定義とシリアライズを、controller のメソッドに付けるデコレータを返す
 */
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
