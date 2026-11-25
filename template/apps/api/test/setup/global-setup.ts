import { PostgreSqlContainer } from '@testcontainers/postgresql'

// composeと同じイメージを使い、開発環境とテスト環境のDBを揃える
const POSTGRES_IMAGE = 'paradedb/paradedb:latest-pg17'

/**
 * PostgreSQL のコンテナを 1 つ起動し、接続先を process.env の TEST_DATABASE_BASE_URL に設定して、コンテナを停止する関数を返す。
 * 起動したコンテナは、結合テストの全ワーカーが使う。この関数が設定した process.env は、後から起動される vitest のワーカープロセスに引き継がれる
 */
export default async function globalSetup(): Promise<() => Promise<void>> {
  // data directoryをtmpfsに置き、fsyncとfull_page_writesを無効にしてI/Oを減らす。テスト用途のため、コンテナが止まるとデータが消えることを許容する
  const container = await new PostgreSqlContainer(POSTGRES_IMAGE)
    .withTmpFs({ '/var/lib/postgresql/data': 'rw' })
    .withCommand(['postgres', '-c', 'fsync=off', '-c', 'full_page_writes=off'])
    .start()

  process.env['TEST_DATABASE_BASE_URL'] = container.getConnectionUri()

  return async (): Promise<void> => {
    await container.stop()
  }
}
