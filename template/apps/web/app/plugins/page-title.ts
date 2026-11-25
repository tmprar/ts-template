/*
  サービス名の位置と区切り文字を各ページには書かず、このプラグインの1箇所で決める。
  各ページはuseHeadで画面の名前だけを渡す。

  titleTemplateはapp.vueには置かず、プラグインに置く。エラー画面(error.vue)はapp.vueを通らずに
  描画される。プラグインに置けば、app.vueとerror.vueのどちらの画面にも同じtitleTemplateが適用される
*/
export default defineNuxtPlugin(() => {
  useHead({
    titleTemplate: title => (title === undefined || title === '' ? 'myapp' : `${title} | myapp`),
  })
})
