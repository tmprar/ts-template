# API の本番イメージ(docs/architecture.md)。
# ビルドコンテキストはリポジトリのルート: docker build -f apps/api/Dockerfile .
# Node のバージョンはルート package.json の devEngines と揃える

FROM node:24.15.0-bookworm-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
# ルート package.json の packageManager と揃える。
# git はルートの prepare(lefthook install)が要求する(下の git init と合わせて空の
# リポジトリにフックを登録させる。実行時イメージには含まれない)
RUN apt-get update \
  && apt-get install --no-install-recommends --yes git \
  && rm -rf /var/lib/apt/lists/* \
  && npm install --global pnpm@12.4.1
WORKDIR /repo

# API が依存する workspace パッケージだけを turbo に切り出させる。
# out/json は package.json と刈り込んだ lockfile、out/full はソース一式
FROM base AS pruner
COPY . .
RUN pnpm dlx turbo@2.10.12 prune @myapp/api --docker

# 依存の解決。package.json と lockfile だけを先に写し、ソースの変更でレイヤーが崩れないようにする
FROM base AS build
COPY --from=pruner /repo/out/json/ .
RUN git init --quiet \
  && pnpm install --frozen-lockfile
COPY --from=pruner /repo/out/full/ .
# turbo が contracts → api の順に build する。deploy で本番依存だけの自己完結ディレクトリを作る
RUN pnpm turbo build --filter=@myapp/api \
  && pnpm --filter @myapp/api deploy --prod /out

# 実行時もビルドと同じ Debian(bookworm-slim)にする。alpine(musl)は使わない
FROM node:24.15.0-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build --chown=node:node /out/package.json ./
COPY --from=build --chown=node:node /out/node_modules ./node_modules
COPY --from=build --chown=node:node /out/dist ./dist
# マイグレーション(dist/scripts/migrate.js)が同梱の SQL を読む
COPY --from=build --chown=node:node /out/drizzle ./drizzle
USER node
EXPOSE 3000
# --import で Sentry の計装(instrument.js)を他のモジュールより先に読む(ESM ではこの形が要る)。
# --enable-source-maps でスタックトレースを TypeScript の行に戻す(Sentry にソースマップを上げずに済む)
CMD ["node", "--enable-source-maps", "--import", "./dist/instrument.js", "dist/main"]
