/**
 * 全局环境配置
 * 按构建环境自动切换：
 *   - 开发（npm run dev:*，import.meta.env.DEV === true）→ dev
 *   - 生产（npm run build:*）                          → prod
 * 占位值请在部署前替换为真实值。
 */

interface EnvConfig {
  /** 后端 Base URL（docs/API.md：http://<host>:8080，无 context-path） */
  API_BASE_URL: string
  /** 腾讯云 IM SDKAppID（IM 控制台 https://console.cloud.tencent.com/im 获取，number） */
  IM_SDK_APP_ID: number
  /** 阿里云图形验证码 appId（验证码2.0 控制台获取，小程序端用原生 captcha4 组件） */
  CAPTCHA_ID: string
}

/** 开发环境配置 */
const dev: EnvConfig = {
  API_BASE_URL: 'http://47.105.57.88:8080',
  IM_SDK_APP_ID: 1600147812,                      // TODO(dev): 替换为开发 SDKAppID
  CAPTCHA_ID: '566cd6d1bfdd69f16f4c7295b6b33b02',                        // TODO(dev): 替换为开发 captchaId
}

/** 生产环境配置 */
const prod: EnvConfig = {
  API_BASE_URL: 'http://47.105.57.88:8080',
  IM_SDK_APP_ID: 0,                        // TODO(prod): 替换为生产 SDKAppID
  CAPTCHA_ID: '',                          // TODO(prod): 替换为生产 captchaId
}

// webpack 与 vite 工具链均注入 process.env.NODE_ENV（不依赖 vite 专有的 import.meta.env）
const env: EnvConfig = process.env.NODE_ENV !== 'production' ? dev : prod

// 具名导出（保持与各模块现有引用一致）
export const API_BASE_URL = env.API_BASE_URL
export const IM_SDK_APP_ID = env.IM_SDK_APP_ID
export const CAPTCHA_ID = env.CAPTCHA_ID

/** 本地存储 key */
export const STORAGE_KEYS = {
  TOKEN: 'dida_satoken',
  TOKEN_NAME: 'dida_token_name',
  USER_ID: 'dida_user_id',
  USER_SIG: 'dida_user_sig',
  PROFILE: 'dida_profile',
} as const
