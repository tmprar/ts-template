/*
  Nuxt 環境のテストをすべて偽のタイマーで実行し、デバウンスや最低表示時間を待つテストが、時計を進めて実時間を待たずに済むようにする。
  時計を実時間に合わせて進めるのは、マウントやAPIの応答のようにテストが時計を進めない処理を、
  その処理が内部で待つタイマーで止めないためである
*/
beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
})

afterEach(() => {
  vi.useRealTimers()
})
