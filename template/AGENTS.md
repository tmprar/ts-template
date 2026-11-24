# AGENTS.md

Codex などのエージェントが、このリポジトリで作業やレビューをするときに読む指示。
規約を 2 か所に書くと片方だけが更新されて内容が食い違うので、規約の本文は `CLAUDE.md` と `docs/workflow.md` にだけ置き、このファイルには、どの文書を読むかだけを書く。

## 作業するとき

作業を始める前に `CLAUDE.md` と `docs/workflow.md` を読み、その規約に従う。
判断が必要な場面では `docs/requirements.md`(要件と要件 ID はここが正)と `docs/adr/` の ADR を参照する。

## レビューするとき

変更を、`CLAUDE.md` と `docs/workflow.md` の規約と、`docs/review/` の次の観点と突き合わせてレビューする。

- `docs/review/common.md`: 指摘の対象と、指摘しないもの
- `docs/review/conventions.md`: 規約(文章、コードコメント、API と web の構成、テスト)
- `.claude/skills/japanese-prose/SKILL.md`: 日本語の文章の規範。`CLAUDE.md` の「文章」が参照する
- `docs/review/correctness.md`: 正しさと安全性
- `docs/review/intent.md`: 範囲・要件・判断の記録

`docs/review/find.md` と `docs/review/verify.md` は、GitHub Actions の PR レビュー(`.github/workflows/claude-code-review.yml`)の手順であり、`gh` で PR を読む前提で書かれている。ローカルの作業ツリーや直前の変更をレビューするときは、この 2 つの手順には従わず、上の観点だけを使う。PR が無いときは、`intent.md` の PR の title と本文との突き合わせを、依頼された作業の内容との突き合わせに読み替える。
