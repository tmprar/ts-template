#!/usr/bin/env bash
# Stop。このブランチで変えた Markdown の差分を、textlint と、文脈を持たない点検役(claude -p)で点検する。
# 違反があれば終了を止めて指摘を返し、エージェントに直させる。1 回の推敲では違反が残ることが多いので、
# 違反が無くなるまでくり返すが、点検のたびに料金がかかるので上限の回数で打ち切る。
# 差分は main との分岐点から取る。作業の途中でコミットした変更も、PR のレビューと同じ範囲で点検するためである
set -uo pipefail
source "$(dirname "$0")/lib/review.sh"
review_is_child && exit 0
input=$(cat)
review_init prose-review "$(review_session_id "$input")" || exit 0

# 点検しないファイルは .textlintignore に書く。textlint はこのファイルを読むが、点検役は読まないので、ここで除く
ignored() {
  local f=$1 pattern
  while IFS= read -r pattern; do
    [[ -z $pattern || $pattern == \#* ]] && continue
    # shellcheck disable=SC2053
    [[ $f == ${pattern//\*\*/*} ]] && return 0
  done < .textlintignore
  return 1
}
files=()
while IFS= read -r f; do ignored "$f" || files+=("$f"); done < <(
  { git diff --name-only --diff-filter=d "$REVIEW_BASE" -- '*.md'; git ls-files --others --exclude-standard -- '*.md'; } | sort -u
)
[ ${#files[@]} -eq 0 ] && exit 0

diff=$(git diff "$REVIEW_BASE" -- "${files[@]}")
while IFS= read -r f; do diff+=$'\n'$(git diff --no-index -- /dev/null "$f"); done < <(git ls-files --others --exclude-standard -- "${files[@]}")

review_hash "$diff"
review_passed && exit 0
review_count
if review_over_limit; then
  # 上限を超えた差分を通ったものとして記録し、同じ差分で点検をくり返さないようにする
  review_mark_passed
  review_notify_user "文章の点検を ${REVIEW_MAX_ROUNDS} 回くり返したので打ち切った。残った指摘は人が確認する"
  exit 0
fi

if ! lint=$(pnpm exec textlint "${files[@]}" 2>&1); then
  review_block_stop "textlint の指摘がある(点検 ${REVIEW_ROUND}/${REVIEW_MAX_ROUNDS} 回目)。直してから作業を終えること。
$lint"
  exit 0
fi

prompt="あなたは日本語の文章の点検役である。.claude/skills/japanese-prose/SKILL.md を全部読み、その規範と CLAUDE.md の「文章」の規則で、次の差分の追加した行(+ の行)だけを点検せよ。差分の前後を確かめたいときは、対象のファイルを読んでよい。ファイルは編集しない。
好みの差や境界例は挙げず、規範に明確に反するものだけを挙げる。明確な違反が無ければ、1 行目に「なし」とだけ書く。違反があれば、1 件ごとに「ファイル:原文 / 違反した規則 / 直す案」の形で書く。

$diff"
review=$(review_ask "" "$prompt" Read) ||
  { review_notify_user "文章の点検役を起動できなかったので、点検を飛ばした"; exit 0; }
review_clean "$review" && { review_mark_passed; exit 0; }
review_block_stop "文章の点検で指摘があった(点検 ${REVIEW_ROUND}/${REVIEW_MAX_ROUNDS} 回目)。直してから作業を終えること。直すと、もう一度点検する。
$review"
