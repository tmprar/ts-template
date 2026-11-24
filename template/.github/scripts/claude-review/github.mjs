/**
 * レビューのコメントの投稿者のログイン。Claude のレビューのスレッドだけを再レビューと解決の対象にするために使う。
 * claude は、claude-code-action がインラインコメントを投稿していたときの投稿者である
 */
const REVIEW_AUTHORS = new Set(['github-actions', 'claude'])

const THREADS_QUERY = `
  query($owner: String!, $repo: String!, $number: Int!, $cursor: String) {
    repository(owner: $owner, name: $repo) {
      pullRequest(number: $number) {
        reviewThreads(first: 100, after: $cursor) {
          pageInfo { hasNextPage endCursor }
          nodes {
            id
            isResolved
            isOutdated
            path
            line
            comments(first: 1) { nodes { author { __typename login } body url } }
          }
        }
      }
    }
  }`

/**
 * PR の未解決のスレッドのうち、Claude のレビューが付けたものを返す
 */
export async function listUnresolvedThreads(github, pr) {
  const threads = []
  let cursor = null
  do {
    const { repository } = await github.graphql(THREADS_QUERY, { ...pr, cursor })
    const { nodes, pageInfo } = repository.pullRequest.reviewThreads
    threads.push(...nodes)
    cursor = pageInfo.hasNextPage ? pageInfo.endCursor : null
  } while (cursor !== null)

  return threads
    .filter(thread => !thread.isResolved)
    .filter(({ comments: { nodes: [first] } }) => first?.author?.__typename === 'Bot' && REVIEW_AUTHORS.has(first.author.login))
    .map(({ comments: { nodes: [first] }, id, isOutdated, line, path }) => ({ body: first.body, id, isOutdated, line, path, url: first.url }))
}

/**
 * 指摘した行へインラインコメントを投稿し、コメントの URL を返す。行が PR の差分に含まれず投稿できなければ undefined を返す
 */
export async function postInlineComment(github, pr, { body, headSha, line, path }) {
  try {
    const { data } = await github.rest.pulls.createReviewComment({
      body,
      commit_id: headSha,
      line,
      owner: pr.owner,
      path,
      pull_number: pr.number,
      repo: pr.repo,
      side: 'RIGHT',
    })

    return data.html_url
  }
  catch (error) {
    // 差分の外の行への投稿は 422 で拒否される。その指摘は要約にだけ載せる
    if (error.status !== 422) {
      throw error
    }
    console.error(`${path}:${line} にインラインコメントを投稿できない: ${error.message}`)

    return undefined
  }
}

/**
 * スレッドに返信を投稿する
 */
export async function replyToThread(github, threadId, body) {
  await github.graphql(`
    mutation($threadId: ID!, $body: String!) {
      addPullRequestReviewThreadReply(input: { pullRequestReviewThreadId: $threadId, body: $body }) { comment { id } }
    }`, { body, threadId })
}

/**
 * スレッドを解決済みにする
 */
export async function resolveThread(github, threadId) {
  await github.graphql(`
    mutation($threadId: ID!) {
      resolveReviewThread(input: { threadId: $threadId }) { thread { id } }
    }`, { threadId })
}

/**
 * 印を含む PR のコメントがあれば本文を上書きし、無ければ新しく投稿する
 */
export async function upsertComment(github, pr, { body, marker }) {
  const target = { issue_number: pr.number, owner: pr.owner, repo: pr.repo }
  const comments = await github.paginate(github.rest.issues.listComments, { ...target, per_page: 100 })
  const previous = comments.find(comment => comment.body?.includes(marker))
  if (previous === undefined) {
    await github.rest.issues.createComment({ ...target, body })
  }
  else {
    await github.rest.issues.updateComment({ body, comment_id: previous.id, owner: pr.owner, repo: pr.repo })
  }
}
