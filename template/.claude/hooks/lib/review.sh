#!/usr/bin/env bash
# 点検のフック(prose-review.sh・review.sh)と、回数を 0 に戻すフック(reset-review-rounds.sh)が共有する処理。
# 状態の置き場所・通った差分の記録・回数の数え方を 1 か所に置き、フックごとに扱いが食い違わないようにする

# 点検役の claude -p もこのリポジトリの設定を読み込むので、点検役の中では、どのフックも何もしない
review_is_child() { [ -n "${REVIEW_CHILD:-}" ]; }

# 点検の状態を置くディレクトリを返す。.git/ の中に置くのは、コミットされず、作業ツリー(worktree)ごとに分かれるためである
review_state_dir() { echo "$(git rev-parse --git-dir)/$1"; }

# フックの入力からセッション ID を取り出す。ファイル名に使うので、英数字とハイフン以外を除く
review_session_id() { jq -r '.session_id // empty' <<<"$1" | tr -cd '[:alnum:]-'; }

# 点検の準備をする。1 つ目の引数は点検の名前で、フックのファイル名(prose-review・review)と同じにする。
# 状態の置き場所(.git/<名前>/)と基準のファイル(.claude/hooks/<名前>.rules)は、この名前から決まる。
# リポジトリに移動し、main との分岐点を REVIEW_BASE に、状態の置き場所を REVIEW_STATE に入れる。
# main との分岐点が無いとき(main を取得していないなど)は失敗を返す
review_init() {
  REVIEW_NAME=$1 REVIEW_SESSION=$2
  # 点検の回数の上限は、環境変数 REVIEW_MAX_ROUNDS で変えられる。点検ごとの値は .claude/settings.json のフックのコマンドで、
  # 開発者ごとの値はコミットしない .claude/settings.local.json の env で指定する。数字でなければ既定の 5 回にする
  [[ ${REVIEW_MAX_ROUNDS:-} =~ ^[1-9][0-9]*$ ]] || REVIEW_MAX_ROUNDS=5
  cd "${CLAUDE_PROJECT_DIR:-$(pwd)}" || return 1
  # git がエスケープしたパスでは textlint と git diff がファイルを見つけられないので、日本語のファイル名(ADR など)をそのまま出力させる
  export GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.quotePath GIT_CONFIG_VALUE_0=false
  REVIEW_BASE=$(git merge-base origin/main HEAD 2>/dev/null || git merge-base main HEAD 2>/dev/null) || return 1
  REVIEW_STATE=$(review_state_dir "$REVIEW_NAME")
  mkdir -p "$REVIEW_STATE/round"
  REVIEW_ROUND_FILE="$REVIEW_STATE/round/${REVIEW_SESSION:-unknown}"
}

# 差分のハッシュを作って REVIEW_HASH に入れる。点検の基準(規約・スキル・点検役への指示)が変わったら、
# 前に通った差分も新しい基準で点検し直すよう、.claude/hooks/<点検の名前>.rules に並べた基準のファイルの中身もハッシュに含める
review_hash() {
  local criteria
  mapfile -t criteria < <(grep -vE '^\s*(#|$)' ".claude/hooks/$REVIEW_NAME.rules" | xargs -d '\n' git ls-files --)
  REVIEW_HASH=$({ printf '%s' "$1"; cat -- "${criteria[@]}"; } | sha256sum | cut -d' ' -f1)
}

# REVIEW_HASH の差分が、前に点検に通っているかを返す。通った差分は、内容から決まるハッシュで記録するので、
# どのセッションが通しても同じ意味を持つ。一覧に追記して共有し、ほかのセッションの記録を上書きしないようにする
review_passed() { grep -qxF "$REVIEW_HASH" "$REVIEW_STATE/passed" 2>/dev/null; }

# REVIEW_HASH の差分を点検に通ったものとして記録し、このセッションの回数を 0 に戻す
review_mark_passed() { echo "$REVIEW_HASH" >> "$REVIEW_STATE/passed"; rm -f "$REVIEW_ROUND_FILE"; }

# このセッションの点検の回数を 1 増やし、REVIEW_ROUND に入れる。
# 回数をセッションごとに数えるのは、同じ作業ツリーで動くほかのセッションの回数を消費しないためである
review_count() {
  REVIEW_ROUND=$(( $(cat "$REVIEW_ROUND_FILE" 2>/dev/null || echo 0) + 1 ))
  echo "$REVIEW_ROUND" > "$REVIEW_ROUND_FILE"
}

# 点検の回数が上限を超えたかを返す
review_over_limit() { [ "$REVIEW_ROUND" -gt "$REVIEW_MAX_ROUNDS" ]; }

# 以下は、フックが Claude Code に返す JSON を出力する。返す形はフックの種類ごとに決まっているので、形ごとに関数にする。
# 出力するだけで終了はしないので、終了するかどうかは呼び出す側が決める

# ユーザーに表示する文を出力する。エージェントには伝わらない
review_notify_user() { jq -n --arg m "$1" '{systemMessage: $m}'; }

# Stop のフックで、作業の終了を止め、直すべき内容をエージェントに伝える
review_block_stop() { jq -n --arg r "$1" '{decision: "block", reason: $r}'; }

# PreToolUse のフックで、ツールの実行を止め、理由をエージェントに伝える
review_deny_tool() { jq -n --arg r "$1" '{hookSpecificOutput: {hookEventName: "PreToolUse", permissionDecision: "deny", permissionDecisionReason: $r}}'; }

# PreToolUse のフックで、ツールの実行は止めずに、エージェントに伝える文を足す
review_add_context() { jq -n --arg c "$1" '{hookSpecificOutput: {hookEventName: "PreToolUse", additionalContext: $c}}'; }

# 点検役の claude -p を動かす。1 つ目の引数はシステムプロンプトに足す文で、空なら足さない。2 つ目はプロンプト、3 つ目以降は許すツール。
# --allowedTools は後ろに続く引数をすべてツールの名前として読むので、プロンプトは標準入力から渡す
review_ask() {
  local system=$1 prompt=$2; shift 2
  local args=(-p --allowedTools "$@")
  [ -n "$system" ] && args=(-p --append-system-prompt "$system" --allowedTools "$@")
  printf '%s' "$prompt" | REVIEW_CHILD=1 claude "${args[@]}"
}

# 点検役の出力に指摘が無いかを返す。点検役には、指摘が無ければ 1 行目に「なし」とだけ書くよう指示している
review_clean() { [ "$(printf '%s' "$1" | head -1 | tr -d '[:space:]')" = "なし" ]; }
