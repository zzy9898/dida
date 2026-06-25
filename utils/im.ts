/**
 * 腾讯云 IM 客户端 SDK 封装（@tencentcloud/chat）
 * - 单例惰性创建
 * - imLogin / imLogout 用后端下发的 userSig 登录
 * - SDKAppID 未配置（占位 0）时降级：仅告警，不阻塞后端登录流程
 *
 * 发送图片/文件需额外 registerPlugin('tim-upload-plugin')，登录阶段无需。
 */
import TencentCloudChat from '@tencentcloud/chat'
import { IM_SDK_APP_ID } from '@/config'

let chat: any = null
let listenersBound = false

function isConfigured(): boolean {
  return !!IM_SDK_APP_ID && Number(IM_SDK_APP_ID) > 0
}

export function getChat(): any {
  if (!isConfigured()) return null
  if (!chat) {
    chat = TencentCloudChat.create({ SDKAppID: Number(IM_SDK_APP_ID) })
    chat.setLogLevel(1) // 0 普通日志，1 release 级
    bindListeners()
  }
  return chat
}

function bindListeners() {
  if (!chat || listenersBound) return
  listenersBound = true
  chat.on(TencentCloudChat.EVENT.SDK_READY, () => {
    console.log('[IM] SDK_READY，已可收发消息')
  })
  chat.on(TencentCloudChat.EVENT.KICKED_OUT, (e: any) => {
    console.warn('[IM] 被踢下线', e?.data?.type)
    uni.showToast({ title: '账号在其他设备登录', icon: 'none' })
  })
  chat.on(TencentCloudChat.EVENT.NET_STATE_CHANGE, (e: any) => {
    console.log('[IM] 网络状态变化', e?.data?.state)
  })
}

/** 用 userSig 登录 IM；未配置 SDKAppID 时静默降级 */
export async function imLogin(userID: string, userSig: string): Promise<void> {
  if (!isConfigured()) {
    console.warn('[IM] 未配置 IM_SDK_APP_ID，跳过 IM 登录（后端登录不受影响）')
    return
  }
  if (!userID || !userSig) {
    console.warn('[IM] userID / userSig 缺失，跳过 IM 登录')
    return
  }
  try {
    await getChat().login({ userID, userSig })
    console.log('[IM] login 成功', userID)
  } catch (err) {
    // IM 登录失败不应阻断业务登录
    console.error('[IM] login 失败', err)
  }
}

/** 退出 IM 登录 */
export async function imLogout(): Promise<void> {
  if (!chat) return
  try {
    await chat.logout()
    console.log('[IM] logout 成功')
  } catch (err) {
    console.error('[IM] logout 失败', err)
  }
}
