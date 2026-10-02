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

// ルートデコレータや@ApiResponseに渡したvalibotスキーマをOpenAPIスキーマへ変換する
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

  // $schemaはJSON Schema方言の識別子でOpenAPIドキュメントには不要
  delete jsonSchema.$schema

  return { schema: jsonSchema }
}

export function createOpenApiDocument(app: INestApplication): OpenAPIObject {
  const config = new DocumentBuilder()
    .setTitle('myapp API')
    .setVersion('1.0')
    /*
      OpenAPI 3.0 は型としてのnullを持たず、valibotのnullableを変換した
      { type: 'null' } を表現できない。クライアント生成側がunknownへ倒すため、
      JSON Schemaと互換のある3.1で出力する
    */
    .setOpenAPIVersion('3.1.0')
    .build()

  return SwaggerModule.createDocument(app, config, { standardSchemaConverter })
}

/*
  webのクライアント生成(openapi-ts)が読む場所。
  パッケージルート(apps/api)からの相対で解決する。nest startもdist/scripts/generate-openapiも
  作業ディレクトリはapps/apiのため一致する。
  このファイルからの相対にすると、置き場所を変えるたびに出力先がずれる(一度それで壊した)
*/
const outputPath = path.resolve('.out/openapi.json')

export async function writeOpenApiDocument(
  document: OpenAPIObject,
): Promise<void> {
  await mkdir(path.dirname(outputPath), { recursive: true })
  await writeFile(outputPath, `${JSON.stringify(document, null, 2)}\n`)
}
