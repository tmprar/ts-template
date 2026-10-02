import { downloadTemplate } from 'giget'
import { execFile } from 'node:child_process'
import {
  cp,
  mkdir,
  readdir,
  readFile,
  rename,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises'
import path from 'node:path'
import { promisify } from 'node:util'

import {
  removeLockfileImporter,
  replaceProjectName,
  stripMarkedBlocks,
  toNameVariants,
} from './text.js'

const execFileAsync = promisify(execFile)

/**
このCLI自身の置き場。作ったプロジェクトには残さない
*/
const CLI_PACKAGE_PATH = 'packages/create-app'

/**
インフラを含めないときに消すもの
*/
const INFRA_PATHS = ['apps/infra']

/**
中身を書き換えないディレクトリ(依存と生成物)
*/
const SKIPPED_DIRECTORIES = new Set([
  '.git',
  '.nuxt',
  '.out',
  '.output',
  '.turbo',
  'cdk.out',
  'coverage',
  'dist',
  'node_modules',
])

const PLACEHOLDER_IN_PATH = /myapp/

export type TemplateOptions = {
  /**
  AWS CDK のパッケージ(apps/infra。空のスタックだけ)を含めるか
  */
  infra: boolean
  /**
  プロジェクト名(kebab-case)
  */
  name: string
}

/**
 * 取得したひな形を、指定のプロジェクトとして使える形に書き換える
 */
export async function applyTemplate(
  directory: string,
  options: TemplateOptions,
): Promise<void> {
  const removedPaths = [CLI_PACKAGE_PATH, ...(options.infra ? [] : INFRA_PATHS)]

  for (const removedPath of removedPaths) {
    await rm(path.join(directory, removedPath), {
      force: true,
      recursive: true,
    })
  }

  const variants = toNameVariants(options.name)
  const files = await findFiles(directory)

  for (const file of files) {
    const buffer = await readFile(file)

    // 画像などのバイナリは書き換えない
    if (buffer.includes(0)) {
      continue
    }

    const original = buffer.toString('utf8')
    const rewritten = replaceProjectName(
      stripMarkedBlocks(
        stripMarkedBlocks(original, 'template', 'remove'),
        'infra',
        options.infra ? 'unwrap' : 'remove',
      ),
      variants,
    )

    if (rewritten !== original) {
      await writeFile(file, rewritten)
    }
  }

  // 名前を含むファイル名(systemd の unit など)も合わせる
  for (const file of files) {
    const basename = path.basename(file)

    if (PLACEHOLDER_IN_PATH.test(basename)) {
      await rename(
        file,
        path.join(path.dirname(file), replaceProjectName(basename, variants)),
      )
    }
  }

  await rewriteLockfile(directory, removedPaths)
}

/**
 * ひな形を取得する。`source` がローカルのディレクトリならそこから写し(ひな形の開発用)、
 * それ以外は giget の指定(`gh:owner/repo#ref` など)として取得する
 */
export async function fetchTemplate(
  source: string,
  directory: string,
): Promise<void> {
  if (await isDirectory(source)) {
    await copyLocalTemplate(source, directory)

    return
  }

  await downloadTemplate(source, { dir: directory })
}

/**
 * 写し先として使えるか。存在しないか、空のディレクトリなら使える
 */
export async function isUsableDirectory(directory: string): Promise<boolean> {
  try {
    const entries = await readdir(directory)

    return entries.length === 0
  } catch {
    return true
  }
}

/**
 * ローカルのひな形を写す。git が管理しているファイルと、ignore されていない未追跡のファイルを対象にする
 * (GitHub から取得したときと同じ中身にするため。node_modules や .env は写さない)
 */
async function copyLocalTemplate(
  source: string,
  directory: string,
): Promise<void> {
  const { stdout } = await execFileAsync(
    'git',
    ['ls-files', '--cached', '--others', '--exclude-standard', '-z'],
    {
      cwd: source,
      maxBuffer: 64 * 1024 * 1024,
    },
  )

  for (const file of stdout.split('\0')) {
    const from = path.join(source, file)

    // 末尾の空要素と、削除したがまだコミットしていないファイル(index に残っている)は飛ばす
    if (file === '' || !(await isFile(from))) {
      continue
    }

    const to = path.join(directory, file)

    await mkdir(path.dirname(to), { recursive: true })
    await cp(from, to)
  }
}

/**
 * 書き換えの対象になるファイルを集める
 */
async function findFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true })
  const files: string[] = []

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name)

    if (entry.isDirectory()) {
      if (!SKIPPED_DIRECTORIES.has(entry.name)) {
        files.push(...await findFiles(entryPath))
      }
    } else if (entry.isFile()) {
      files.push(entryPath)
    }
  }

  return files
}

async function isDirectory(target: string): Promise<boolean> {
  try {
    return (await stat(target)).isDirectory()
  } catch {
    return false
  }
}

async function isFile(target: string): Promise<boolean> {
  try {
    return (await stat(target)).isFile()
  } catch {
    return false
  }
}

async function rewriteLockfile(
  directory: string,
  removedImporters: string[],
): Promise<void> {
  const lockfilePath = path.join(directory, 'pnpm-lock.yaml')

  if (!(await isFile(lockfilePath))) {
    return
  }

  const original = await readFile(lockfilePath, 'utf8')
  let rewritten = original

  for (const importer of removedImporters) {
    rewritten = removeLockfileImporter(rewritten, importer)
  }

  if (rewritten !== original) {
    await writeFile(lockfilePath, rewritten)
  }
}
