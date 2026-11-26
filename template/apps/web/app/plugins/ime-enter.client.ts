// IMEの変換を確定するEnterのkeydownイベントを、各要素のハンドラへ伝播させない。
// 伝播すると、変換の確定で送信などの処理が実行されるため、captureフェーズで伝播を止める
export default defineNuxtPlugin(() => {
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return

    // isComposingだけでは判定しない。変換を確定するEnterでもisComposingがfalseになるブラウザがあるため、keyCode 229も判定に使う
    // eslint-disable-next-line unicorn/prefer-keyboard-event-key, @typescript-eslint/no-deprecated
    if (!event.isComposing && event.keyCode !== 229) return

    event.stopPropagation()
  }, { capture: true })
})
