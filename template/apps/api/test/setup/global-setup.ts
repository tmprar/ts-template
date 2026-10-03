import { PostgreSqlContainer } from '@testcontainers/postgresql'

// composeと同じイメージを使い、開発環境とテスト環境のDBを揃える
const POSTGRES_IMAGE = 'paradedb/paradedb:latest-pg17'

/**
e2eテスト用のPostgreSQLコンテナを起動する。worker専用DBの作成と
マイグレーション適用はsetup-db.tsが行う。ここで設定したprocess.envは
後から起動されるvitestのワーカープロセスに引き継がれる
*/
export default async function globalSetup(): Promise<() => Promise<void>> {
  // data directoryをtmpfsに載せ、耐久性設定を無効化してI/Oを削減する。
  // テスト用途なのでデータが消えても問題ない
  const container = await new PostgreSqlContainer(POSTGRES_IMAGE)
    .withTmpFs({ '/var/lib/postgresql/data': 'rw' })
    .withCommand(['postgres', '-c', 'fsync=off', '-c', 'full_page_writes=off'])
    .start()

  process.env['TEST_DATABASE_BASE_URL'] = container.getConnectionUri()

  return async (): Promise<void> => {
    await container.stop()
  }
}
