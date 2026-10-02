// https://commitlint.js.org/reference/configuration.html

/** @type {import('@commitlint/types').UserConfig} */
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // 使う prefix は docs/workflow.md の「prefix の選び方」に揃える
    'type-enum': [2, 'always', ['feat', 'fix', 'refactor', 'test', 'docs', 'chore']],
    // 要約は日本語の常体。大文字小文字の規則は当てはまらない
    'subject-case': [0],
    'subject-full-stop': [2, 'never', '。'],
    // 日本語の要約に要件 ID が付く。config-conventional の既定と同じ 100 を明示して固定する
    'header-max-length': [2, 'always', 100],
  },
}
