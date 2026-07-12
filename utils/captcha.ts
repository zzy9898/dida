/**
 * 阿里云图形验证码（验证码2.0）—— 微信小程序端
 * 验证成功统一返回 { lot_number, captcha_output, pass_token, gen_time }，
 * 正是后端 GET /auth/sms-verify-code 的 4 个入参。
 *
 * 微信小程序使用原生 captcha4 自定义组件（需放入 wxcomponents/captcha4/，
 * 并在 pages.json 页面级声明 usingComponents）。组件标签写在 verify.vue 页面，
 * 本模块通过 beginMpCaptcha()/settleMpCaptcha() 在「页面事件回调」与「调用方 Promise」间桥接。
 */
import type { CaptchaResult } from '@/api/user'

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
