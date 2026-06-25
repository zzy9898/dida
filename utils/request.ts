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
          handleUnauthorized()
          reject(new Error(body.message || '未登录'))
          return
        }
        // 业务失败：404（参数/登录失败）/403/500 等
        if (showError) uni.showToast({ title: body.message || '操作失败', icon: 'none' })
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
