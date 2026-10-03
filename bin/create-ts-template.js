#!/usr/bin/env node
// CLI の入口。本体のビルド結果(dist/)は release ブランチにだけあるので、main を取得したときは案内して止める
import { existsSync } from 'node:fs'

const entry = new URL('../dist/index.js', import.meta.url)

if (existsSync(entry)) {
  await import(entry.href)
} else {
  console.error('ビルド済みの CLI がありません。release ブランチを指定して実行してください: npx github:tmprar/ts-template#release')
  process.exitCode = 1
}
