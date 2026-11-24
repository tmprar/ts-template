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
  }
}
