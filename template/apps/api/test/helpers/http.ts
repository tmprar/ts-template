import type { GenericSchema } from 'valibot'

import assert from 'node:assert'
import request from 'supertest'
import * as v from 'valibot'

/**
 * 応答の本文の `code` が渡した値と一致することを確かめる関数を返す。supertest の `expect` に渡して使う
 */
export function expectErrorCode(code: string): (response: request.Response) => void {
  return (response) => {
    assert.strictEqual((response.body as { code?: string }).code, code)
  }
}

/**
 * 応答の本文を、API の契約(contracts の schema)で検証して返す。契約に合わなければテストを失敗させる。
 * 応答の形が実装と契約で食い違っていないことも、成功の応答を読むたびに確かめるため、本文は型の表明ではなくこの関数で読む
 */
export function parseBody<TSchema extends GenericSchema>(
  response: request.Response,
  schema: TSchema,
): v.InferOutput<TSchema> {
  const result = v.safeParse(schema, response.body)

  if (!result.success) {
    assert.fail(`応答が契約に合いません: ${JSON.stringify(v.flatten(result.issues))}`)
  }

  return result.output
}
