/*
  Nuxt UI の設定。配色の割り当てと、コンポーネントごとの見た目の上書きをここに集める
  (https://ui.nuxt.com/docs/getting-started/theme/components)。
  色そのもの(パレット)や角丸・余白のトークンは app/assets/css/app.css の @theme に置く
*/
export default defineAppConfig({
  ui: {
    /*
      意味ごとの色に、どのパレットを当てるか。値は Tailwind の色名か、@theme で定義した色名。
      ここに書いているのは Nuxt UI の既定値
    */
    colors: {
      error: 'red',
      info: 'blue',
      neutral: 'slate',
      primary: 'green',
      secondary: 'blue',
      success: 'green',
      warning: 'yellow',
    },
    /*
      コンポーネントの見た目を全体で変えるときは、コンポーネント名のキーを足す。
      画面ごとの class で都度書かず、ここで揃える。例:

      button: {
        slots: { base: 'rounded-full' },
        defaultVariants: { size: 'lg' },
      },
    */
  },
})
