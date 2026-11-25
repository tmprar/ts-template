import * as v from 'valibot'

/**
 * すべてのエラー応答に共通の本文。`code`は失敗の原因を表す値で、大文字のスネークケースで書く。
 * 失敗の原因はHTTPステータスだけでは表さない。同じステータスに複数の原因があり
 * (同じ409でも原因が複数ありうる)、クライアントが原因ごとに案内を変えるため。
 * `code`の取りうる値の一覧は持たない。エンドポイントが返す値は、controller が OpenAPI に出力する
 */
export type ErrorResponse = {
  code: string
  details?: string[]
  message: string
  statusCode: number
}

/**
 * 指定したステータスと`code`の値だけを取るエラー応答のスキーマを返す。
 * エンドポイントごとに、そのエンドポイントが返す`code`だけを渡す。OpenAPIに出力した`code`の列挙から、
 * クライアントが分岐で扱う値を型で確かめられるようにするため
 */
export function errorResponseSchema<const TCodes extends readonly [string, ...string[]]>(
  status: number,
  codes: TCodes,
) {
  return v.object({
    code: v.pipe(v.picklist(codes), v.description('失敗の原因を表す値。クライアントはこの値で分岐する')),
    details: v.optional(v.pipe(
      v.array(v.string()),
      v.description('入力の形式が不正なときの、項目ごとの不備'),
    )),
    message: v.pipe(
      v.string(),
      v.description('開発者向けの説明。文面は変わることがあるため、分岐にも画面の表示にも使わない'),
    ),
    statusCode: v.pipe(v.literal(status), v.description('HTTPステータス')),
  })
}
