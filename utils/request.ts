/**
 * HTTP 请求封装：基于 uni.request
 * - 自动拼接 API_BASE_URL
 * - 自动注入 Sa-Token 登录令牌
 * - 统一解析 Result<T>：code===200 resolve data，否则 toast + reject
 * - code===401（未登录）清除本地登录态并跳回认证页
 */
import { API_BASE_URL, STORAGE_KEYS } from '@/config'
import type { Result } from '@/data/types'

export interface RequestOptions {
  url: string
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  /** 请求体（JSON body 或表单数据） */
  data?: Record<string, any>
  /** 是否在业务失败时自动 toast，默认 true */
  showError?: boolean
  header?: Record<string, string>
}

/** 清除本地登录态（被 401 与 logout 复用） */
export function clearAuthStorage() {
  Object.values(STORAGE_KEYS).forEach((k) => uni.removeStorageSync(k))
}

/**
 * 把后端 Result.code 映射为对用户友好的提示文案。
 * - 200 走正常分支，不会进这里。
 * - 401 未登录 / 登录过期。
 * - 403 无权限。
 * - 404 客户端异常（参数校验 / 登录失败）：message 本身面向用户，直接透传。
 * - 500 系统异常：message 是 Java 技术堆栈，对用户隐藏，统一给通用文案。
 * - 其它未知 code：优先用后端 message，兜底通用文案。
 */
function friendlyMessage(code: number, rawMessage?: string): string {
  switch (code) {
    case 401:
      return '登录已过期，请重新登录'
    case 403:
      return '没有操作权限'
    case 404:
      return rawMessage || '请求有误，请检查后重试'
    case 500:
      return '服务器繁忙，请稍后重试'
    default:
      return rawMessage || '操作失败，请稍后重试'
  }
}

let redirectingTo401 = false
function handleUnauthorized() {
  clearAuthStorage()
  if (redirectingTo401) return
  redirectingTo401 = true
  uni.reLaunch({
    url: '/pages/verify/verify',
    complete: () => {
      redirectingTo401 = false
    },
  })
}

export function request<T = any>(options: RequestOptions): Promise<T> {
  const { url, method = 'GET', data, showError = true, header = {} } = options

  // 注入登录令牌：header key 为后端返回的 tokenName（默认 satoken）
  const token = uni.getStorageSync(STORAGE_KEYS.TOKEN)
  const tokenName = uni.getStorageSync(STORAGE_KEYS.TOKEN_NAME) || 'satoken'
  if (token) header[tokenName] = token

  return new Promise<T>((resolve, reject) => {
    uni.request({
      url: API_BASE_URL + url,
      method,
      data,
      header: {
        'Content-Type': 'application/json',
        ...header,
      },
      success: (res) => {
        const body = res.data as Result<T>
        // 网络层异常（非 200 HTTP 或非标准结构）
        if (res.statusCode !== 200 || !body || typeof body.code !== 'number') {
          if (showError) uni.showToast({ title: '网络异常，请稍后重试', icon: 'none' })
          reject(new Error(`HTTP ${res.statusCode}`))
          return
        }
        if (body.code === 200) {
          resolve(body.data)
          return
        }
        if (body.code === 401) {
          if (showError) uni.showToast({ title: friendlyMessage(401), icon: 'none' })
          handleUnauthorized()
          reject(new Error(body.message || '未登录'))
          return
        }
        // 业务失败：404（参数/登录失败）/403/500 等
        if (showError) uni.showToast({ title: friendlyMessage(body.code, body.message), icon: 'none' })
        reject(new Error(body.message || `业务错误 ${body.code}`))
      },
      fail: (err) => {
        if (showError) uni.showToast({ title: '网络请求失败', icon: 'none' })
        reject(err)
      },
    })
  })
}

export default request
