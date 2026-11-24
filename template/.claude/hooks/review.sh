#!/usr/bin/env bash
# PreToolUse(git push)。push する前に、このブランチの差分を docs/review/ の観点で手元でレビューする。
# 観点の担当(intent・conventions・correctness)ごとに文脈を持たない点検役(claude -p)を並行して動かし、
# 出た指摘を別の点検役が根拠を開き直して確かめる。確かめられた「修正が必要」の指摘があれば push を止める。
# 推測にもとづく指摘が残ると、エージェントはその指摘に従って誤った修正をしかねないので、確かめ直す段階を省かない。
# 点検のたびに料金がかかるので、通った差分は記録して点検せず、上限の回数で打ち切る
set -uo pipefail
source "$(dirname "$0")/lib/review.sh"
review_is_child && exit 0
input=$(cat)
# 設定の if は、コマンドの中の文字列(ヒアドキュメントの本文など)にも一致するので、
# コマンドの先頭か、;・&&・| のあとで git push を実行するときだけレビューする
grep -qE '(^|[;&|]\s*)git push(\s|$)' <<<"$(jq -r '.tool_input.command // empty' <<<"$input")" || exit 0
review_init review "$(review_session_id "$input")" || exit 0

# Proposed は人間がまだ確認していない判断なので、PR にして main へ取り込む前に push を止め、人間が Accepted にするか改める。
# Status の行を読むだけで判断が要らないので、点検役には任せず、点検の回数にも数えない
proposed=$(git diff -z --name-only --diff-filter=AMR "$REVIEW_BASE" HEAD -- 'docs/adr/*.md' |
  while IFS= read -r -d '' adr; do
    [ "$(git show "HEAD:$adr" | awk '/^## Status/ { getline; getline; print; exit }')" = Proposed ] && echo "- $adr"
  done)
if [ -n "$proposed" ]; then
  review_deny_tool "このブランチに、Status が Proposed の ADR がある。Proposed は人間がまだ確認していない判断なので、push する前に人間に確認を依頼し、Accepted にするか、指示に従って改める(docs/workflow.md の「未確認の判断の確認」)。
${proposed}"
  exit 0
fi

# 生成物と lockfile は、レビューの観点(意味を読まないと判断できないもの)の対象にならないので渡さない
excludes=(':(exclude)pnpm-lock.yaml' ':(exclude)apps/web/app/generated/**' ':(exclude)apps/api/drizzle/meta/**' ':(exclude)docs/design/**')
# push で送るのはコミットだけなので、作業ツリーの変更を含めず HEAD までの差分をレビューする
diff=$(git diff "$REVIEW_BASE" HEAD -- . "${excludes[@]}")
[ -z "$diff" ] && exit 0
intent=$(git log --format='### %s%n%n%b' "$REVIEW_BASE"..HEAD)
branch=$(git rev-parse --abbrev-ref HEAD)

review_hash "$diff"
review_passed && exit 0
review_count
if review_over_limit; then
  # 上限を超えた差分を通ったものとして記録し、同じ差分で点検をくり返さないようにする
  review_mark_passed
  review_notify_user "手元のレビューを ${REVIEW_MAX_ROUNDS} 回くり返したので打ち切った。残った指摘は人が確認する"
  exit 0
fi

tools=(Read Grep Glob 'Bash(git log:*)' 'Bash(git show:*)' 'Bash(git diff:*)')

format='指摘は 1 件ごとに次の形で書く。指摘が無ければ、1 行目に「なし」とだけ書く。
- [must または suggest] パス:行番号 / 指摘を 1 文にまとめたもの / 根拠(規約の節の名前か ADR の番号、不具合なら誤った結果になる入力や状態) / どのファイルのどの記述が、どの条件で、規約や要件にどう合わないか / 直す案
must は規約の違反・不具合・要件を満たしていない点、suggest は規約にはないが直したほうがよい点である。'

tmp=$(mktemp -d)
for concern in intent conventions correctness; do
  system="$(cat docs/review/common.md "docs/review/$concern.md")"
  prompt="あなたは、push する前のブランチを手元でレビューする点検役で、担当は ${concern} である。システムプロンプトの共通の基準と担当の観点に従い、担当の観点だけについて指摘を出す。ファイルは編集しない。
PR はまだ無いので、PR の本文の代わりに、下のコミットメッセージを変更の意図として読む。差分だけで判断できない観点は、観点に書いてあるファイルを開いて確かめる。ADR は docs/adr/ を Grep で探して読む。
${format}

## ブランチ名

${branch}

## コミットメッセージ

${intent}

## 差分(main との分岐点から)

${diff}"
  review_ask "$system" "$prompt" "${tools[@]}" > "$tmp/$concern.txt" &
done
wait

findings=""
for concern in intent conventions correctness; do
  out=$(cat "$tmp/$concern.txt")
  review_clean "$out" && continue
  findings+="## 担当 ${concern} の指摘"$'\n\n'"$out"$'\n\n'
done
rm -rf "$tmp"
if [ -z "$findings" ]; then review_mark_passed; exit 0; fi

system="$(cat docs/review/common.md docs/review/intent.md docs/review/conventions.md docs/review/correctness.md)"
prompt="あなたは、手元のレビューで出た指摘を確かめる点検役である。指摘ごとに、根拠に挙がった規約・ADR・ファイルを自分で開き直し、差分とファイルを読んで、指摘が正しいかを確かめる。指摘を出したときの推測は引き継がない。ファイルは編集しない。
確かめられなかった指摘、規約にも要件にも根拠のない好みの指摘、ブランチが変更していない行の既存の問題、CI と lefthook が検査するもの(ESLint・typecheck・テスト・textlint・adrs doctor)の指摘は除く。
残った指摘だけを、受け取ったときと同じ形で書く。1 件も残らなければ、1 行目に「なし」とだけ書く。
${format}

## 確かめる指摘

${findings}
## 差分(main との分岐点から)

${diff}"
verified=$(review_ask "$system" "$prompt" "${tools[@]}") ||
  { review_notify_user "手元のレビューの点検役を起動できなかったので、レビューを飛ばした"; exit 0; }
review_clean "$verified" && { review_mark_passed; exit 0; }

if printf '%s' "$verified" | grep -q '^- \[must\]'; then
  review_deny_tool "手元のレビューで、修正が必要な指摘があった(レビュー ${REVIEW_ROUND}/${REVIEW_MAX_ROUNDS} 回目)。直してコミットしてから、もう一度 push すること。push し直すと、もう一度レビューする。
${verified}"
  exit 0
fi
review_mark_passed
review_add_context "手元のレビューで提案があった。push は止めていない。直すかどうかを判断すること。
${verified}"
