/**
 * ビルド時に、npm がパッケージに含めないドットファイル(.gitignore など)を dist/dotfiles.json に書き出す。
 * `npx github:` は clone したリポジトリでビルドしてからパッケージに詰めるので、この時点ではまだ揃っている
 */
import { writeFile } from 'node:fs/promises'

import {
  collectDotfiles,
  DOTFILES_PATH,
} from './template.ts'

await writeFile(DOTFILES_PATH, `${JSON.stringify(await collectDotfiles(), undefined, 2)}\n`)
