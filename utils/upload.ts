/**
 * 文件上传 —— 阿里云 OSS 通用预签名 URL 方案（POST /oss/presign，见 docs/API.md §3.9）
 * 流程：
 *   1. POST /oss/presign?dir=avatar|post|chat（需登录）→ { url: 签名 PUT URL, expireTimeMillis }
 *   2. 在过期前对 url 直接 HTTP PUT，请求体为文件二进制
 *   3. 文件访问地址 = url.split('?')[0]（去掉签名查询参数）
 *
 * 注意：OSS 预签名为 PUT + 文件体，小程序 uni.uploadFile(POST multipart) 不适用，
 * 需读成 ArrayBuffer 后用 uni.request PUT 原始 body 发送。
 */
import request from '@/utils/request'
import type { MediaItem } from '@/data/types'

/** 业务目录白名单（对应对象名 {dir}/{userId}/{uuid}.{ext}） */
type UploadDir = 'avatar' | 'post' | 'chat'

interface SignedUploadUrl {
  url: string              // 带签名的 PUT URL
  expireTimeMillis: number // 签名过期时间戳（毫秒）
}

/** 把对象拼成 query string（/oss/presign 为 POST-with-query） */
function toQuery(params: Record<string, any>): string {
  const pairs = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
  return pairs.length ? `?${pairs.join('&')}` : ''
}

/** 向后端申请通用预签名 URL（需登录，request 层自动注入 satoken） */
function getPresignedUploadUrl(dir: UploadDir, ext?: string): Promise<SignedUploadUrl> {
  return request<SignedUploadUrl>({
    url: '/oss/presign' + toQuery({ dir, ext }),
    method: 'POST',
  })
}

/** 从本地路径解析扩展名（无扩展名时兜底 jpg） */
function extOf(localPath: string): string {
  return (localPath.split('.').pop() || 'jpg').toLowerCase()
}

/** 读本地文件为 ArrayBuffer（mp-weixin 不能直接 PUT 本地路径） */
function readFileAsBuffer(filePath: string): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    uni.getFileSystemManager().readFile({
      filePath,
      success: (r) => resolve(r.data as ArrayBuffer),
      fail: reject,
    })
  })
}

/** 直接向 OSS PUT 文件二进制（OSS 返回的不是 Result<T>，不走 request 封装） */
async function putToOss(localPath: string, url: string): Promise<void> {
  const buf = await readFileAsBuffer(localPath)
  const ext = extOf(localPath)
  await new Promise<void>((resolve, reject) => {
    uni.request({
      url,
      method: 'PUT',
      data: buf,
      header: { 'Content-Type': `image/${ext === 'jpg' ? 'jpeg' : ext}` },
      success: (res) => {
        // OSS 成功返回 200；403 = URL 已过期
        if (res.statusCode === 200) resolve()
        else reject(new Error(`OSS PUT failed: ${res.statusCode}`))
      },
      fail: reject,
    })
  })
}

/** 本地文件 → OSS，返回最终可访问地址（去掉签名查询参数） */
async function uploadToDir(localPath: string, dir: UploadDir): Promise<string> {
  const { url } = await getPresignedUploadUrl(dir, extOf(localPath))
  await putToOss(localPath, url)
  return url.split('?')[0]
}

/**
 * 选好的本地头像 → OSS，返回最终可访问的 imageUrl。
 * 失败时抛出，调用方 catch 后可跳过头像继续注册（imageUrl 选填）。
 */
export function uploadAvatar(localPath: string): Promise<string> {
  return uploadToDir(localPath, 'avatar')
}

/** 单张帖子图片 → OSS，返回可访问 URL */
export function uploadPostImage(localPath: string): Promise<string> {
  return uploadToDir(localPath, 'post')
}

/**
 * 批量处理帖子配图 → MediaItem[]。
 * - http(s):// 开头的预设/远程图直接透传，不再上传
 * - 本地临时路径走预签名上传
 */
export async function uploadPostMedia(paths: string[]): Promise<MediaItem[]> {
  const urls = await Promise.all(
    paths.map((p) =>
      /^https?:\/\//.test(p) ? Promise.resolve(p) : uploadPostImage(p),
    ),
  )
  return urls.map((url) => ({ type: 'image', url }))
}
