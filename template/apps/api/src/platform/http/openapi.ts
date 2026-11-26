import type { INestApplication } from '@nestjs/common'
import type {
  OpenAPIObject,
  StandardSchemaConverter,
} from '@nestjs/swagger'
import type * as v from 'valibot'

import {
  DocumentBuilder,
  SwaggerModule,
} from '@nestjs/swagger'
import { toJsonSchema } from '@valibot/to-json-schema'
import {
  mkdir,
  writeFile,
} from 'node:fs/promises'
import path from 'node:path'

/**
 * ルートデコレータや `@ApiResponse` に渡した valibot スキーマを、OpenAPI に出力する JSON Schema へ変換して返し、valibot 以外のスキーマには undefined を返す。
 * valibot のスキーマの変換は @nestjs/swagger に任せない。@nestjs/swagger は valibot のスキーマを変換する機能を持たないため
 */
const standardSchemaConverter: StandardSchemaConverter = (
  schema,
  { schemaType },
) => {
  const candidate = schema as Partial<v.GenericSchema>

  if (candidate['~standard']?.vendor !== 'valibot') {
    return
  }

  const jsonSchema = toJsonSchema(candidate as v.GenericSchema, {
    errorMode: 'ignore',
    typeMode: schemaType,
  })

  delete jsonSchema.$schema

  return { schema: jsonSchema }
}

/**
 * アプリに登録されたルートから、OpenAPI 3.1 のドキュメントを作って返す。
 * 生成の手順は、開発時の起動(main.ts)と生成スクリプトのそれぞれには書かない。両者の出力を同じ内容にするため、この関数だけに置く
 */
export function createOpenApiDocument(app: INestApplication): OpenAPIObject {
  const config = new DocumentBuilder()
    .setTitle('myapp API')
    .setVersion('1.0')
    /*
      OpenAPI 3.0 では出力しない。3.0 は型としてのnullを持たず、valibotのnullableを変換した
      { type: 'null' } を表現できない。表現できない型をクライアント生成がunknownとして扱うため、
      JSON Schemaと互換のある3.1で出力する
    */
    .setOpenAPIVersion('3.1.0')
    .build()

  return SwaggerModule.createDocument(app, config, { standardSchemaConverter })
}

/**
 * webのクライアント生成(openapi-ts)が読むファイルのパス。
 * このファイルからの相対パスでは解決せず、パッケージルート(apps/api)からの相対パスで解決する。
 * このファイルからの相対パスにすると、このファイルを移動するたびに出力先が変わり、web が古いファイルを読み続けるため。
 * nest startもdist/scripts/generate-openapiも作業ディレクトリはapps/apiのため、出力先は一致する
 */
const outputPath = path.resolve('.out/openapi.json')

/**
 * OpenAPI ドキュメントを、整形した JSON として作業ディレクトリの `.out/openapi.json` へ書き出し、出力先のディレクトリが無ければ作る
 */
export async function writeOpenApiDocument(
  document: OpenAPIObject,
): Promise<void> {
  await mkdir(path.dirname(outputPath), { recursive: true })
  await writeFile(outputPath, `${JSON.stringify(document, null, 2)}\n`)
}
