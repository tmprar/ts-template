import {
  cancel,
  confirm,
  intro,
  isCancel,
  log,
  note,
  outro,
  spinner,
  text,
} from '@clack/prompts'
import { spawn } from 'node:child_process'
import path from 'node:path'
import { parseArgs } from 'node:util'

import {
  applyTemplate,
  fetchTemplate,
  isUsableDirectory,
} from './template.js'
import { validateProjectName } from './text.js'

/**
ひな形の取得元(giget の指定)。`--template` か環境変数 CREATE_TEMPLATE で差し替えられる
*/
const DEFAULT_TEMPLATE = 'gh:tmprar/ts-template'

const HELP = `使い方: npm create ts-template [ディレクトリ] [オプション]

オプション:
  --name <name>       プロジェクト名(英小文字・数字・ハイフン。既定はディレクトリ名)
  --infra, --no-infra AWS CDK のパッケージ(apps/infra。空のスタックだけ)を含めるか
  --git, --no-git     git リポジトリを初期化するか
  --install, --no-install
                      依存をインストールするか(git の初期化が必要)
  --template <source> ひな形の取得元(giget の指定、またはローカルのディレクトリ)
  --in-place          取得せず、いまのディレクトリ(template repository から作ったリポジトリ)を書き換える
  -y, --yes           聞かれていない項目は既定値で進める
  -h, --help          この説明を表示する
`

type Answers = {
  directory: string
  git: boolean
  infra: boolean
  install: boolean
  name: string
}

/**
 * 対話しながらプロジェクトを作る。終了コードを返す
 */
export async function runCli(argv: string[]): Promise<number> {
  const { positionals, values } = parseArgs({
    allowNegative: true,
    allowPositionals: true,
    args: argv,
    options: {
      'git': { type: 'boolean' },
      'help': {
        short: 'h',
        type: 'boolean',
      },
      'in-place': { type: 'boolean' },
      'infra': { type: 'boolean' },
      'install': { type: 'boolean' },
      'name': { type: 'string' },
      'template': { type: 'string' },
      'yes': {
        short: 'y',
        type: 'boolean',
      },
    },
  })

  if (values.help === true) {
    // eslint-disable-next-line no-console
    console.log(HELP)

    return 0
  }

  intro('ひな形からプロジェクトを作ります')

  const isInPlace = values['in-place'] === true
  const answers = await askAnswers({
    // その場で書き換えるときは、すでに git リポジトリの中にいる
    directory: isInPlace ? '.' : positionals[0],
    git: isInPlace ? false : values.git,
    hasRepository: isInPlace,
    infra: values.infra,
    install: values.install,
    name: values.name,
    yes: values.yes === true,
  })

  if (answers === undefined) {
    cancel('中止しました')

    return 1
  }

  const directory = path.resolve(answers.directory)

  if (!isInPlace && !(await isUsableDirectory(directory))) {
    cancel(`${answers.directory} は空ではありません。別のディレクトリを指定してください`)

    return 1
  }

  const source = values.template ?? process.env['CREATE_TEMPLATE'] ?? DEFAULT_TEMPLATE
  const progress = spinner()

  progress.start(isInPlace ? 'プロジェクトに合わせて書き換えています' : 'ひな形を取得しています')

  try {
    if (!isInPlace) {
      await fetchTemplate(source, directory)
      progress.message('プロジェクトに合わせて書き換えています')
    }

    await applyTemplate(directory, {
      infra: answers.infra,
      name: answers.name,
    })
    progress.stop('ひな形を用意しました')
  } catch (error) {
    progress.stop('ひな形を用意できませんでした')
    log.error(error instanceof Error ? error.message : String(error))

    return 1
  }

  if (answers.git && await runCommand('git', ['init', '--initial-branch', 'main'], directory) !== 0) {
    log.warn('git の初期化に失敗しました。あとで `git init` を実行してください')

    return 1
  }

  if (answers.install && await runCommand('pnpm', ['install'], directory) !== 0) {
    log.warn('依存のインストールに失敗しました。あとで `pnpm install` を実行してください')

    return 1
  }

  note(composeNextSteps(answers, isInPlace), '次にやること')
  outro(`${answers.name} を作りました`)

  return 0
}

/**
 * 引数で決まっていない項目を尋ねる。途中で中止されたら undefined
 */
async function askAnswers(given: {
  directory: string | undefined
  git: boolean | undefined
  /**
  すでに git リポジトリの中にいるか(その場で書き換えるとき)
  */
  hasRepository: boolean
  infra: boolean | undefined
  install: boolean | undefined
  name: string | undefined
  yes: boolean
}): Promise<Answers | undefined> {
  const directory = given.directory ?? await text({
    message: 'プロジェクトを作るディレクトリ',
    placeholder: 'my-app',
    validate: value => (value === undefined || value.trim() === '' ? 'ディレクトリを入力してください' : undefined),
  })

  if (isCancel(directory)) {
    return undefined
  }

  const defaultName = path.basename(path.resolve(directory))
  const name = given.name
    ?? (given.yes
      ? defaultName
      : await text({
          defaultValue: defaultName,
          message: 'プロジェクト名(パッケージの scope やコンテナ名になります)',
          placeholder: defaultName,
          validate: value => validateProjectName(value === undefined || value === '' ? defaultName : value),
        }))

  if (isCancel(name)) {
    return undefined
  }

  const nameProblem = validateProjectName(name)

  if (nameProblem !== undefined) {
    log.error(nameProblem)

    return undefined
  }

  const infra = given.infra ?? (given.yes || await confirm({
    message: 'AWS CDK のパッケージ(apps/infra。空のスタックだけ)を含めますか?',
  }))

  if (isCancel(infra)) {
    return undefined
  }

  const git = given.git ?? (given.yes || await confirm({
    message: 'git リポジトリを初期化しますか?',
  }))

  if (isCancel(git)) {
    return undefined
  }

  /*
    インストール時に lefthook が git のフックを登録するため、リポジトリが無いと失敗する。
    初期化しないなら尋ねない
  */
  const install = (git || given.hasRepository) && (given.install ?? (given.yes || await confirm({
    message: '依存をインストールしますか?(pnpm install)',
  })))

  if (isCancel(install)) {
    return undefined
  }

  return {
    directory,
    git,
    infra,
    install,
    name,
  }
}

function composeNextSteps(answers: Answers, hasRepo: boolean): string {
  return [
    ...(hasRepo ? [] : [`cd ${answers.directory}`]),
    ...(hasRepo || answers.git ? [] : ['git init']),
    ...(answers.install ? [] : ['pnpm install']),
    'cp .env.example .env',
    'pnpm dev',
  ].join('\n')
}

/**
 * コマンドを実行し、終了コードを返す(起動できなければ1)。出力はそのまま端末に流す
 */
async function runCommand(
  command: string,
  commandArguments: string[],
  cwd: string,
): Promise<number> {
  return await new Promise((resolve) => {
    const child = spawn(command, commandArguments, {
      cwd,
      stdio: 'inherit',
    })

    child.on('error', () => {
      resolve(1)
    })
    child.on('close', (code) => {
      resolve(code ?? 1)
    })
  })
}
