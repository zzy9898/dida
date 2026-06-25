/**
 * 阿里云图形验证码（验证码2.0）
 * 验证成功统一返回 { lot_number, captcha_output, pass_token, gen_time }，
 * 正是后端 GET /auth/sms-verify-code 的 4 个入参。
 *
 * - H5：动态加载 ct4.js（initAlicom4）。入口 getCaptchaResult()。
 * - 微信小程序：使用原生 captcha4 自定义组件（需放入 wxcomponents/captcha4/，
 *   并在 pages.json 页面级声明 usingComponents）。组件标签写在 verify.vue 页面，
 *   本模块通过 beginMpCaptcha()/settleMpCaptcha() 在「页面事件回调」与「调用方 Promise」间桥接。
 * - 其它端（App 等）：降级提示走账号密码登录。
 */
import { CAPTCHA_ID, CAPTCHA_SDK_URL } from '@/config'
import type { CaptchaResult } from '@/api/user'

// #ifdef H5
let sdkLoaded = false

function loadSdk(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (sdkLoaded && (window as any).initAlicom4) {
      resolve()
      return
    }
    if (!CAPTCHA_SDK_URL) {
      reject(new Error('未配置 CAPTCHA_SDK_URL（ct4.js 地址）'))
      return
    }
    const script = document.createElement('script')
    script.src = CAPTCHA_SDK_URL
    script.async = true
    script.onload = () => {
      sdkLoaded = true
      resolve()
    }
    script.onerror = () => reject(new Error('图形验证码 SDK 加载失败'))
    document.head.appendChild(script)
  })
}
// #endif

/**
 * 触发图形验证，成功后 resolve 校验四要素。
 * bind 模式：初始化就绪后主动 showCaptcha 弹窗，用户完成滑动验证后回调。
 */
export function getCaptchaResult(): Promise<CaptchaResult> {
  // #ifdef H5
  if (!CAPTCHA_ID) {
    return Promise.reject(new Error('未配置图形验证码 CAPTCHA_ID'))
  }
  return loadSdk().then(
    () =>
      new Promise<CaptchaResult>((resolve, reject) => {
        const initAlicom4 = (window as any).initAlicom4
        if (typeof initAlicom4 !== 'function') {
          reject(new Error('图形验证码 SDK 未就绪'))
          return
        }
        initAlicom4({ captchaId: CAPTCHA_ID, product: 'bind' }, (captchaObj: any) => {
          captchaObj
            .onReady(() => captchaObj.showCaptcha())
            .onSuccess(() => {
              const v = captchaObj.getValidate()
              if (!v) {
                reject(new Error('图形验证失败'))
                return
              }
              resolve({
                lot_number: v.lot_number,
                captcha_output: v.captcha_output,
                pass_token: v.pass_token,
                gen_time: v.gen_time,
              })
            })
            .onError((e: any) => reject(new Error(e?.msg || '图形验证出错')))
            .onClose(() => reject(new Error('CAPTCHA_CANCELLED')))
        })
      })
  )
  // #endif

  // #ifndef H5
  uni.showToast({ title: '当前端暂不支持短信登录，请用账号密码登录', icon: 'none' })
  return Promise.reject(new Error('CAPTCHA_UNSUPPORTED_PLATFORM'))
  // #endif
}

// #ifdef MP-WEIXIN
/**
 * 微信小程序 captcha4 桥接。
 * verify.vue 触发 showCaptcha 前调用 beginMpCaptcha() 拿到 Promise，
 * 由组件的 @success / @error / @close 回调通过 settleMpCaptcha() 兑现。
 */
let mpResolve: ((r: CaptchaResult) => void) | null = null
let mpReject: ((e: Error) => void) | null = null

export function beginMpCaptcha(): Promise<CaptchaResult> {
  // 若上一次未兑现，先取消，避免悬挂
  if (mpReject) mpReject(new Error('CAPTCHA_RESTARTED'))
  return new Promise<CaptchaResult>((resolve, reject) => {
    mpResolve = resolve
    mpReject = reject
  })
}

export function settleMpCaptcha(ok: boolean, payload?: any) {
  if (ok && mpResolve) {
    const v = payload || {}
    mpResolve({
      lot_number: v.lot_number,
      captcha_output: v.captcha_output,
      pass_token: v.pass_token,
      gen_time: v.gen_time,
    })
  } else if (!ok && mpReject) {
    mpReject(new Error(payload?.message || 'CAPTCHA_CANCELLED'))
  }
  mpResolve = null
  mpReject = null
}
// #endif
