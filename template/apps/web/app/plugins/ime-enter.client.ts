// IME変換確定のEnterで送信などが誤発火しないよう、captureフェーズで伝播を止める
export default defineNuxtPlugin(() => {
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return

    // isComposingがfalseになるブラウザがあるためkeyCode 229も見る
    // eslint-disable-next-line unicorn/prefer-keyboard-event-key, @typescript-eslint/no-deprecated
    if (!event.isComposing && event.keyCode !== 229) return

    event.stopPropagation()
  }, { capture: true })
})
