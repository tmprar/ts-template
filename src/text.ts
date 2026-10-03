/**
 * ひな形の文字列を書き換える純関数。ファイルの読み書きは template.ts が持つ
 */

/**
プロジェクト名の各表記。ひな形の中のプレースホルダ(myapp / MyApp / MYAPP)と対応する
*/
export type NameVariants = {
  /**
  パッケージの scope・コンテナ名・パスに使う(`my-app`)
  */
  kebab: string
  /**
  CDK のスタック名に使う(`MyApp`)
  */
  pascal: string
  /**
  環境変数の接頭辞に使う(`MY_APP`)
  */
  upperSnake: string
}

const PROJECT_NAME_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/

/**
npm の scope 名の上限(214 文字)より十分短くし、AWS のリソース名の上限にも収める
*/
const PROJECT_NAME_MAX_LENGTH = 30

const PLACEHOLDER_PATTERN = /MyApp|MYAPP|myapp/g

/**
 * pnpm-lock.yaml から、消したパッケージの importer を取り除く。
 * 残したままだと `pnpm install --frozen-lockfile` がワークスペースとの不一致で失敗する。
 * そのパッケージだけが使っていた依存の記述は残るが、次の install で pnpm が掃除する
 */
export function removeLockfileImporter(lockfile: string, importerPath: string): string {
  const lines = lockfile.split('\n')
  const start = lines.indexOf(`  ${importerPath}:`)

  if (start === -1) {
    return lockfile
  }

  // importer の中身は4スペース以上の字下げか空行。次の importer か次の節で終わる
  const length = lines
    .slice(start + 1)
    .findIndex(line => line !== '' && !line.startsWith(' '.repeat(4)))
  const end = length === -1 ? lines.length : start + 1 + length

  return [...lines.slice(0, start), ...lines.slice(end)].join('\n')
}

/**
 * プレースホルダをプロジェクト名に置き換える。
 * 新しい名前がプレースホルダを含んでいても二重に置き換わらないよう、1回の走査で行う
 */
export function replaceProjectName(text: string, variants: NameVariants): string {
  return text.replaceAll(PLACEHOLDER_PATTERN, (placeholder) => {
    switch (placeholder) {
      case 'MyApp': {
        return variants.pascal
      }
      case 'MYAPP': {
        return variants.upperSnake
      }
      default: {
        return variants.kebab
      }
    }
  })
}

/**
 * `<tag>:start` 〜 `<tag>:end` の印で囲んだ範囲を処理する。
 * 印は1行に単独で書く(`<!-- infra:start -->` または `# infra:start`)。
 *
 * - `remove`: 印と中身をまとめて消す
 * - `unwrap`: 印の行だけを消し、中身は残す
 */
export function stripMarkedBlocks(
  text: string,
  tag: string,
  mode: 'remove' | 'unwrap',
): string {
  const startMarkers = new Set([`# ${tag}:start`, `<!-- ${tag}:start -->`])
  const endMarkers = new Set([`# ${tag}:end`, `<!-- ${tag}:end -->`])
  const kept: string[] = []
  let isInside = false

  for (const line of text.split('\n')) {
    const marker = line.trim()

    if (startMarkers.has(marker)) {
      isInside = true
    } else if (endMarkers.has(marker)) {
      isInside = false
    } else if (!isInside || mode === 'unwrap') {
      kept.push(line)
    }
  }

  return kept.join('\n')
}

/**
 * ディレクトリ名から、プロジェクト名の既定値を作る(`My App` → `my-app`)。
 * 使える名前にならなければ undefined
 */
export function suggestProjectName(directoryName: string): string | undefined {
  const name = directoryName
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, '-')
    .replace(/^[^a-z]+/, '')
    .replace(/-+$/, '')
    .slice(0, PROJECT_NAME_MAX_LENGTH)
    .replace(/-+$/, '')

  return validateProjectName(name) === undefined ? name : undefined
}

/**
 * プロジェクト名の各表記を求める
 */
export function toNameVariants(name: string): NameVariants {
  const words = name.split('-')

  return {
    kebab: name,
    pascal: words
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(''),
    upperSnake: words.join('_').toUpperCase(),
  }
}

/**
 * プロジェクト名として使えない理由。使えるなら undefined。
 * npm の scope・Docker のコンテナ名・パスにそのまま使うため、小文字の kebab-case に限る
 */
export function validateProjectName(name: string): string | undefined {
  if (name.length === 0) {
    return 'プロジェクト名を入力してください'
  }

  if (name.length > PROJECT_NAME_MAX_LENGTH) {
    return `プロジェクト名は${String(PROJECT_NAME_MAX_LENGTH)}文字以内にしてください`
  }

  if (!PROJECT_NAME_PATTERN.test(name)) {
    return 'プロジェクト名は英小文字で始め、英小文字・数字・ハイフンだけにしてください(例: my-app)'
  }

  return undefined
}
