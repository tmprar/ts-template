import { execFile } from 'node:child_process';
import { cp, mkdir, readdir, readFile, rename, stat, writeFile, } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { replaceProjectName, stripTemplateBlocks, toNameVariants, } from './text.js';
const execFileAsync = promisify(execFile);
/**
このCLIのパッケージのルート(dist/ の1つ上)
*/
const PACKAGE_ROOT = fileURLToPath(new URL('..', import.meta.url));
/**
ひな形の置き場
*/
export const TEMPLATE_DIRECTORY = path.join(PACKAGE_ROOT, 'template');
/**
npm がパッケージに含めないドットファイル。`npx github:` で取得したときは欠けているので、
ビルド時に書き出した内容(DOTFILES_PATH)から戻す
*/
const DOTFILES_DROPPED_BY_NPM = new Set(['.gitignore', '.npmrc']);
export const DOTFILES_PATH = fileURLToPath(new URL('dotfiles.json', import.meta.url));
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
]);
const PLACEHOLDER_IN_PATH = /myapp/;
/**
 * 写したひな形を、指定のプロジェクトとして使える形に書き換える
 */
export async function applyTemplate(directory, name) {
    const variants = toNameVariants(name);
    const files = await findFiles(directory);
    for (const file of files) {
        const buffer = await readFile(file);
        // 画像などのバイナリは書き換えない
        if (buffer.includes(0)) {
            continue;
        }
        const original = buffer.toString('utf8');
        const rewritten = replaceProjectName(stripTemplateBlocks(original), variants);
        if (rewritten !== original) {
            await writeFile(file, rewritten);
        }
    }
    // 名前を含むファイル名(systemd の unit など)も合わせる
    for (const file of files) {
        const basename = path.basename(file);
        if (PLACEHOLDER_IN_PATH.test(basename)) {
            await rename(file, path.join(path.dirname(file), replaceProjectName(basename, variants)));
        }
    }
}
/**
 * npm がパッケージに含めないドットファイルの中身を、ひな形の中のパスごとに集める(ビルド時に使う)
 */
export async function collectDotfiles() {
    const dotfiles = {};
    const files = await listTemplateFiles();
    for (const file of files) {
        if (DOTFILES_DROPPED_BY_NPM.has(path.basename(file))) {
            dotfiles[file] = await readFile(path.join(TEMPLATE_DIRECTORY, file), 'utf8');
        }
    }
    return dotfiles;
}
/**
 * ひな形を写す
 */
export async function copyTemplate(directory) {
    const files = await listTemplateFiles();
    for (const file of files) {
        const to = path.join(directory, file);
        await mkdir(path.dirname(to), { recursive: true });
        await cp(path.join(TEMPLATE_DIRECTORY, file), to);
    }
    if (await isGitCheckout()) {
        return;
    }
    // npm から取得したパッケージには .gitignore などが入っていない
    const dotfiles = JSON.parse(await readFile(DOTFILES_PATH, 'utf8'));
    for (const [file, content] of Object.entries(dotfiles)) {
        const to = path.join(directory, file);
        await mkdir(path.dirname(to), { recursive: true });
        await writeFile(to, content);
    }
}
/**
 * 写し先として使えるか。存在しないか、空のディレクトリなら使える
 */
export async function isUsableDirectory(directory) {
    try {
        const entries = await readdir(directory);
        return entries.length === 0;
    }
    catch {
        return true;
    }
}
/**
 * 書き換えの対象になるファイルを集める
 */
async function findFiles(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    const files = [];
    for (const entry of entries) {
        const entryPath = path.join(directory, entry.name);
        if (entry.isDirectory()) {
            if (!SKIPPED_DIRECTORIES.has(entry.name)) {
                files.push(...await findFiles(entryPath));
            }
        }
        else if (entry.isFile()) {
            files.push(entryPath);
        }
    }
    return files;
}
async function isDirectory(target) {
    try {
        return (await stat(target)).isDirectory();
    }
    catch {
        return false;
    }
}
async function isFile(target) {
    try {
        return (await stat(target)).isFile();
    }
    catch {
        return false;
    }
}
/**
 * git で clone したリポジトリの中で動いているか(npm から取得したパッケージには .git が無い)
 */
async function isGitCheckout() {
    return await isDirectory(path.join(PACKAGE_ROOT, '.git'));
}
/**
 * ひな形のファイルを、ひな形のディレクトリからの相対パスで並べる。
 *
 * - git で clone したリポジトリ(ひな形の開発中や、`npx github:` のビルド時): git が管理しているファイルと、
 *   ignore されていない未追跡のファイル。開発中の node_modules や .env を写さないため
 * - npm から取得したパッケージ: 入っているファイルすべて(npm が ignore されたものを除いて詰めている)
 */
async function listTemplateFiles() {
    if (!(await isGitCheckout())) {
        return (await findFiles(TEMPLATE_DIRECTORY)).map(file => path.relative(TEMPLATE_DIRECTORY, file));
    }
    const { stdout } = await execFileAsync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], {
        cwd: TEMPLATE_DIRECTORY,
        maxBuffer: 64 * 1024 * 1024,
    });
    const files = [];
    for (const file of stdout.split('\0')) {
        // 末尾の空要素と、削除したがまだコミットしていないファイル(index に残っている)は飛ばす
        if (file !== '' && await isFile(path.join(TEMPLATE_DIRECTORY, file))) {
            files.push(file);
        }
    }
    return files;
}
