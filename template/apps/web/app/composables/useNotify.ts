/**
 * 利用者への通知をトーストで表示する関数を返す。
 * トーストの色とアイコンを通知の種類ごとにここで決め、呼び出す側は文言だけを渡す
 */
export const useNotify = () => {
  const toast = useToast()

  return {
    /**
     * 操作が失敗したことの案内(`message`)を表示する。案内は自動では消えず、利用者が閉じるまで残る。
     * durationの0は、Nuxt UIのトーストで、閉じるまでの時間を数えないことを表す。
     * Infinityは使わない。Nuxt UIは、Infinityのとき残り時間の進捗バーを減らないまま表示する。
     * 文言をトーストのidにする。Nuxt UIは、表示中のトーストと同じidのトーストを新しく足さず、1件にまとめる。
     * 通信が切れたまま操作を続けたときなどに、同じ案内が積み重なって画面を覆わないようにするためである
     */
    error: (message: string) => {
      toast.add({
        color: 'error',
        duration: 0,
        icon: 'i-lucide-circle-alert',
        id: message,
        title: message,
      })
    },
    /**
     * 利用者に操作を促す案内(`message`)を、操作のボタン(`action`)と合わせて表示する。案内は利用者が閉じるか操作するまで残る
     */
    prompt: (message: string, action: {
      label: string
      onClick: () => void
    }) => {
      toast.add({
        // アプリの配色にinfoの青で塗ったボタンは無いので、操作のボタンはNuxt UIの既定(トーストと同じ色で塗る)にせず、案内(Alert)に置く副次のボタンと同じ見た目にする
        actions: [{
          ...action,
          color: 'neutral',
          size: 'sm',
          variant: 'outline',
        }],
        color: 'info',
        duration: 0,
        icon: 'i-lucide-info',
        id: message,
        title: message,
      })
    },
  }
}
