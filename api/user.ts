/**
 * 用户 / 鉴权接口（见 docs/API.md §2、§3）
 */
import request from '@/utils/request'
import type { UserLoginVO, UserInfoVO, RegisterParam } from '@/data/types'

/** 把对象拼成 query string（用于 POST query / 表单型接口） */
function toQuery(params: Record<string, any>): string {
  const pairs = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
  return pairs.length ? `?${pairs.join('&')}` : ''
}

/** 阿里云图形验证码 getValidate() 返回结构 */
export interface CaptchaResult {
  lot_number: string
  captcha_output: string
  pass_token: string
  gen_time: string
}

/** 3.1 账号密码登录 */
export function login(phone: string, password: string): Promise<UserLoginVO> {
  return request<UserLoginVO>({
    url: '/users/login',
    method: 'POST',
    data: { phone, password },
  })
}

/** 3.3 注册（成功后即登录态，后端自动导入 IM 账号） */
export function register(param: RegisterParam): Promise<UserLoginVO> {
  return request<UserLoginVO>({
    url: '/users/register',
    method: 'POST',
    data: param,
  })
}

/**
 * 3.2 手机号 + 短信验证码登录。
 * 注意：未注册手机号返回 code:200 且 data:null（前端据此引导去注册）。
 */
export function loginSms(phoneNumber: string, code: string): Promise<UserLoginVO | null> {
  return request<UserLoginVO | null>({
    url: '/users/login-sms' + toQuery({ phoneNumber, code }),
    method: 'POST',
  })
}

/** 2.1 获取短信验证码（先过阿里云图形验证码，再下发短信） */
export function getSmsCode(params: CaptchaResult & { phone_number: string }): Promise<null> {
  return request<null>({
    url: '/auth/sms-verify-code' + toQuery(params),
    method: 'GET',
  })
}

/** 3.4 退出登录 */
export function logout(userId: string): Promise<null> {
  return request<null>({
    url: '/users/logout' + toQuery({ userId }),
    method: 'POST',
    showError: false,
  })
}

/** 3.5 获取当前登录用户信息（兼登录态检测） */
export function getUserInfo(): Promise<UserInfoVO> {
  return request<UserInfoVO>({
    url: '/users/info',
    method: 'GET',
    showError: false,
  })
}
