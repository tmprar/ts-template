#!/usr/bin/env bash
# UserPromptSubmit。ユーザーが指示を送るたびに、このセッションの点検の回数を 0 に戻す。
# 点検の回数の上限は、1 回の指示に対する作業の中で点検が終わらなくなるのを防ぐためのもので、
# 指示をまたいで数え続けると、次の指示の作業が十分に点検されないためである
set -uo pipefail
source "$(dirname "$0")/lib/review.sh"
session=$(review_session_id "$(cat)")
[ -n "$session" ] || exit 0
cd "${CLAUDE_PROJECT_DIR:-$(pwd)}" || exit 0
git rev-parse --git-dir >/dev/null 2>&1 || exit 0
rm -f "$(review_state_dir prose-review)/round/$session" "$(review_state_dir review)/round/$session"
