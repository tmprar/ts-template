import { readFile, writeFile } from 'node:fs/promises'

import { formatInlineComment, formatResolvedReply, formatSummary, parseThread, SUMMARY_MARKER } from './format.mjs'
import { listUnresolvedThreads, postInlineComment, replyToThread, resolveThread, upsertComment } from './github.mjs'

/**
 * github-script の context から、対象の PR を取り出す
 */
function pullRequestOf(context) {
  return { number: context.payload.pull_request.number, owner: context.repo.owner, repo: context.repo.repo }
}

/**
 * Claude のレビューが付けた未解決のスレッドの一覧を、JSON のファイルに書き出す
 */
export async function writeUnresolvedThreads({ context, github, outputPath }) {
  const threads = await listUnresolvedThreads(github, pullRequestOf(context))
  await writeFile(outputPath, JSON.stringify(threads, null, 2))
}

/**
 * 検証済みの指摘をインラインコメントにし、直ったスレッドに返信して解決済みにし、要約を 1 件のコメントに上書きする
 */
export async function postReview({ context, github, verifiedPath }) {
  const pr = pullRequestOf(context)
  const headSha = context.payload.pull_request.head.sha
  const verified = JSON.parse(await readFile(verifiedPath, 'utf8'))
  const unresolved = await listUnresolvedThreads(github, pr)

  // Claude の出力に、Claude のレビューのものではないスレッドの id が入っていても、そのスレッドは変えない
  const unresolvedIds = new Set(unresolved.map(thread => thread.id))
  const resolved = verified.resolved_threads.filter(thread => unresolvedIds.has(thread.id))
  const resolvedIds = new Set(resolved.map(thread => thread.id))
  for (const { id, reply } of resolved) {
    await replyToThread(github, id, formatResolvedReply({ headSha, reply }))
    await resolveThread(github, id)
  }

  const items = []
  for (const finding of verified.findings) {
    const url = finding.path === null || finding.line === null
      ? undefined
      : await postInlineComment(github, pr, { body: formatInlineComment(finding), headSha, line: finding.line, path: finding.path })
    items.push({ ...finding, url })
  }
  items.push(...unresolved.filter(thread => !resolvedIds.has(thread.id)).map(parseThread))

  await upsertComment(github, pr, { body: formatSummary({ changeSummary: verified.change_summary, headSha, items }), marker: SUMMARY_MARKER })
}
