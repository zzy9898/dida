// uni-app 全局类型（uni.*）由 HBuilderX 内置提供，无需引用 @dcloudio/types 包

// 兼容 webpack/vite 工具链下的 process.env 访问
declare const process: { env: Record<string, string | undefined> }

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}
