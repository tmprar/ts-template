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
import mri from 'mri'
import { spawn } from 'node:child_process'
import { copyFile } from 'node:fs/promises'
import path from 'node:path'

import {
  applyTemplate,
  copyTemplate,
  isUsableDirectory,
} from './template.js'
import {
  suggestProjectName,
  validateProjectName,
} from './text.js'

const DEFAULT_DIRECTORY = 'my-app'

const HELP = `使い方: npx 'github:tmprar/ts-template#release' [ディレクトリ] [オプション]

オプション:
  --name <name>       プロジェクト名(英小文字・数字・ハイフン。既定はディレクトリ名から作る)
  --git, --no-git     git リポジトリを初期化するか
  --install, --no-install
                      依存をインストールし、コードを整えるか(pnpm install と pnpm lint。git の初期化が必要)
  -y, --yes           聞かれていない項目は既定値で進める
  -h, --help          この説明を表示する
`

/**
mri が解析結果に入れるキー(別名を含む)。これ以外は知らないオプションとして止める
*/
const KNOWN_FLAGS = new Set(['git', 'h', 'help', 'install', 'name', 'y', 'yes'])

type Answers = {
  directory: string
  git: boolean
  install: boolean
  name: string
}

type Flags = {
  git?: boolean
  help?: boolean
  install?: boolean
  name?: string
  yes?: boolean
}

/**
 * 対話しながらプロジェクトを作る。終了コードを返す
 */
export async function runCli(argv: string[]): Promise<number> {
  const flags = mri<Flags>(argv, {
    alias: {
      h: 'help',
      y: 'yes',
    },
    boolean: ['git', 'help', 'install', 'yes'],
    string: ['name'],
  })
  const unknownFlags = Object.keys(flags).filter(key => key !== '_' && !KNOWN_FLAGS.has(key))

  if (unknownFlags.length > 0) {
    console.error(`知らないオプションです: ${unknownFlags.map(flag => (flag.length === 1 ? `-${flag}` : `--${flag}`)).join(' ')}\n\n${HELP}`)

    return 1
  }

  if (flags.help === true) {
    // eslint-disable-next-line no-console
    console.log(HELP)

    return 0
  }

  intro('テンプレートからプロジェクトを作ります')

  const answers = await askAnswers({
    directory: flags._[0],
    git: flags.git,
    install: flags.install,
    name: flags.name,
    yes: flags.yes === true,
  })

  if (answers === undefined) {
    cancel('中止しました')

    return 1
  }

  const directory = path.resolve(answers.directory)
  const progress = spinner()

  progress.start('テンプレートを写しています')

  try {
    await copyTemplate(directory)
    progress.message('プロジェクトに合わせて書き換えています')
    await applyTemplate(directory, answers.name)
    await copyFile(path.join(directory, '.env.example'), path.join(directory, '.env'))
    progress.stop('テンプレートを用意しました')
  } catch (error) {
    progress.stop('テンプレートを用意できませんでした')
    log.error(error instanceof Error ? error.message : String(error))

    return 1
  }

  if (answers.git && await runCommand('git', ['init', '--quiet', '--initial-branch', 'main'], directory) !== 0) {
    log.warn('git の初期化に失敗しました。あとで `git init` を実行してください')

    return 1
  }

  if (answers.install) {
    log.step('依存をインストールしています(pnpm install)')

    if (await runCommand('pnpm', ['install'], directory) !== 0) {
      log.warn('依存のインストールに失敗しました。pnpm が使えるか確かめ、あとで `pnpm install` と `pnpm lint` を実行してください')

      return 1
    }

    /*
      import の並びはパッケージ名で決まるので、`@myapp` を置き換えると規約から外れるファイルが出る。
      最初のコミットに整形の差分が混ざらないよう、ここで直しておく
    */
    log.step('プロジェクト名に合わせてコードを整えています(pnpm lint)')

    if (await runCommand('pnpm', ['lint'], directory) !== 0) {
      log.warn('lint で直せない指摘が残りました。`pnpm lint` の出力を確かめてください')

      return 1
    }
  }

  note(composeNextSteps(answers), '次にやること')
  outro(`${answers.name} を作りました`)

  return 0
}

/**
 * 引数で決まっていない項目を尋ねる。途中で中止されたら undefined
 */
async function askAnswers(given: {
  directory: string | undefined
  git: boolean | undefined
  install: boolean | undefined
  name: string | undefined
  yes: boolean
}): Promise<Answers | undefined> {
  const directory = await askDirectory(given.directory ?? (given.yes ? DEFAULT_DIRECTORY : undefined))

  if (directory === undefined) {
    return undefined
  }

  const defaultName = suggestProjectName(path.basename(path.resolve(directory)))
  const name = given.name
    ?? (defaultName !== undefined && given.yes
      ? defaultName
      : await text({
          ...(defaultName !== undefined && {
            defaultValue: defaultName,
            placeholder: defaultName,
          }),
          message: 'プロジェクト名(パッケージの scope やコンテナ名になります)',
          validate: value => validateProjectName(value === undefined || value === '' ? defaultName ?? '' : value),
        }))

  if (isCancel(name)) {
    return undefined
  }

  const nameProblem = validateProjectName(name)

  if (nameProblem !== undefined) {
    log.error(nameProblem)

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
  const install = git && (given.install ?? (given.yes || await confirm({
    message: '依存をインストールし、コードを整えますか?(pnpm install と pnpm lint)',
  })))

  if (isCancel(install)) {
    return undefined
  }

  return {
    directory,
    git,
    install,
    name,
  }
}

/**
 * 作る先のディレクトリを決める。引数で渡されたものが使えなければ止め、尋ねたものが使えなければ尋ね直す
 */
async function askDirectory(given: string | undefined): Promise<string | undefined> {
  if (given !== undefined) {
    if (await isUsableDirectory(path.resolve(given))) {
      return given
    }

    log.error(`${given} は空ではありません。別のディレクトリを指定してください`)

    return undefined
  }

  for (;;) {
    const directory = await text({
      defaultValue: DEFAULT_DIRECTORY,
      message: 'プロジェクトを作るディレクトリ',
      placeholder: DEFAULT_DIRECTORY,
    })

    if (isCancel(directory)) {
      return undefined
    }

    if (await isUsableDirectory(path.resolve(directory))) {
      return directory
    }

    log.warn(`${directory} は空ではありません。別のディレクトリを指定してください`)
  }
}

function composeNextSteps(answers: Answers): string {
  return [
    `cd ${/\s/.test(answers.directory) ? `"${answers.directory}"` : answers.directory}`,
    ...(answers.git ? [] : ['git init']),
    ...(answers.install ? [] : ['pnpm install', 'pnpm lint']),
    'pnpm db migrate',
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
