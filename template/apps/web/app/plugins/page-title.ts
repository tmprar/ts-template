/*
  ページのタイトルはサービス名を添えて出す。各ページはuseHeadで画面の名前だけを渡し、
  サービス名の位置と区切りはここで1箇所に決める。

  app.vueではなくプラグインに置くのは、エラー画面(error.vue)がapp.vueの外で
  描かれるため。プラグインならどちらの入り口でも同じ形になる。
  タイトルを持たない画面(遷移だけのindex)ではサービス名だけになる
*/
export default defineNuxtPlugin(() => {
  useHead({
    titleTemplate: title => (title === undefined || title === '' ? 'myapp' : `${title} | myapp`),
  })
})
