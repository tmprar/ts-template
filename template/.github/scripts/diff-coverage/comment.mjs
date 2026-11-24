/*
  使い方: node comment.mjs <カバレッジのレポートの名前> <差分のカバレッジの Markdown のファイル>
  環境変数 GITHUB_TOKEN・GITHUB_REPOSITORY・PR_NUMBER を渡す。
  vitest-coverage-report-action が PR に付けた、名前が一致するカバレッジのコメントに、差分のカバレッジの節を書き足す。
  全体と差分のカバレッジを、パッケージごとに 1 つのコメントで読めるよう、別のコメントを作らずに書き足す
*/
import { readFileSync } from 'node:fs'

import { insertSection } from './format.mjs'

const [name, markdownPath] = process.argv.slice(2)
if (markdownPath === undefined) {
  console.error('使い方: node comment.mjs <カバレッジのレポートの名前> <差分のカバレッジの Markdown のファイル>')
  process.exit(2)
}
const { GITHUB_REPOSITORY: repository, GITHUB_TOKEN: token, PR_NUMBER: prNumber } = process.env
const marker = `<!-- vitest-coverage-report-marker-${name} -->`
const section = readFileSync(markdownPath, 'utf8')

/**
 * GitHub の REST API を呼び、応答の本文を返す。失敗の応答なら例外を投げる
 */
async function request(path, init = {}) {
  const response = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      'Accept': 'application/vnd.github+json',
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  })
  if (!response.ok) throw new Error(`${init.method ?? 'GET'} ${path} が ${response.status} を返した: ${await response.text()}`)

  return await response.json()
}

let comment
for (let page = 1; comment === undefined; page++) {
  const comments = await request(`/repos/${repository}/issues/${prNumber}/comments?per_page=100&page=${page}`)
  comment = comments.find(({ body }) => body?.includes(marker))
  if (comments.length < 100) break
}
const body = comment === undefined ? undefined : insertSection(comment.body, section, marker)
if (body === undefined) {
  console.log(`::warning title=差分のカバレッジ::${name} のカバレッジのコメントが見つからないので、差分のカバレッジを書き足さない`)
}
else {
  await request(`/repos/${repository}/issues/comments/${comment.id}`, { body: JSON.stringify({ body }), method: 'PATCH' })
}
