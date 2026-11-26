/**
 * 表示されているトーストの文言と、閉じるまでのミリ秒を、表示した順に返す。0は自動では閉じないことを表す
 */
export const findShownToasts = () => useToast().toasts.value.map(toast => ({
  duration: toast.duration,
  title: toast.title,
}))
