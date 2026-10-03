#!/bin/sh
# いまのコミット(main)の中身に、ビルド済みの dist/ を加えたコミットを release ブランチに積む。
# 利用者は `npx github:tmprar/ts-template#release` で、ビルドせずにそれを動かす。
# CI(.github/workflows/release.yml)から `pnpm compile` の後に呼ぶ。作業ツリー・index・いまのブランチは動かさない
set -eu

remote=${1:-origin}
branch=release

# 前回の release を親にして履歴をつなぐ(force push にしない)。まだ無ければ最初のコミットになる
git fetch --quiet "$remote" "+refs/heads/$branch:refs/remotes/$remote/$branch" 2>/dev/null || true
parent=$(git rev-parse -q --verify "refs/remotes/$remote/$branch" || true)

# 一時的な index に、いまのコミットの tree と dist/ を載せる(dist/ は .gitignore にあるので -f で足す)
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
GIT_INDEX_FILE="$work/index" git read-tree HEAD
GIT_INDEX_FILE="$work/index" git add -f dist
tree=$(GIT_INDEX_FILE="$work/index" git write-tree)

if [ -n "$parent" ] && [ "$(git rev-parse "$parent^{tree}")" = "$tree" ]; then
  echo "release は最新(中身が同じ)なので積まない"
  exit 0
fi

source=$(git rev-parse HEAD)
commit=$(git commit-tree "$tree" ${parent:+-p "$parent"} \
  -m "release: $(git log -1 --format=%s HEAD)" \
  -m "main: $source")

git push "$remote" "$commit:refs/heads/$branch"
echo "release を $commit にした(main: $source)"
