import type { AriaAttributes } from 'vue'

/*
  aria-* 属性を、どのコンポーネントにも渡せる属性として型に加える。
  strictTemplates では、コンポーネントが props に宣言していない属性が型検査のエラーになる。
  aria-* 属性は、自作のコンポーネントも Nuxt UI のコンポーネントも props に宣言せず、ルート要素へそのまま引き継がせるため
*/
declare module 'vue' {
  interface AllowedComponentProps extends AriaAttributes {}
}

export {}
