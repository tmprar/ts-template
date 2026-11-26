<template>
  <!--
    UAppはNuxt UIのprovider。トーストやオーバーレイの置き場を持つ。
    scroll-body を false にする。false にしないと、スライドオーバーやダイアログを開いたときに
    reka-ui が body へ padding-right を足す。html に scrollbar-gutter: stable を指定してスクロールバーの領域を常に確保しているため、
    padding-right が加わると本文がスクロールバーの幅だけ狭くなる
  -->
  <!--
    トーストは画面の上部中央に表示する。失敗のトーストは閉じるまで残るため、既定の右下に置くと、
    狭い画面では下端に置いた操作のボタンを閉じるまで隠す
  -->
  <UApp
    :scroll-body="false"
    :toaster="{ position: 'top-center' }"
  >
    <NuxtRouteAnnouncer />
    <NuxtPage />
  </UApp>
</template>
