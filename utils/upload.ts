/**
 * 头像上传 —— 阿里云 OSS 预签名 URL 方案（POST /users/avatar）
 * 流程：
 *   1. POST /users/avatar（需登录）→ { url: 签名 PUT URL, expireTimeMillis }
 *   2. 在过期前对 url 直接 HTTP PUT，请求体为文件二进制
 *   3. 文件访问地址 = url.split('?')[0]（去掉签名查询参数）
 *
 * 注意：OSS 预签名为 PUT + 文件体，小程序 uni.uploadFile(POST multipart) 不适用，
 * 需读成 ArrayBuffer 后用 uni.request PUT 原始 body 发送。
 */
import request from '@/utils/request'

interface SignedUploadUrl {
  url: string           // 带签名的 PUT URL
  expireTimeMillis: number // 签名过期时间戳（毫秒）
}

/** 向后端申请头像预签名 URL（需登录，request 层自动注入 satoken） */
async function getAvatarPresignedUrl(): Promise<SignedUploadUrl> {
  return request<SignedUploadUrl>({ url: '/users/avatar', method: 'POST' })
}

/**
 * 选好的本地图片 → OSS，返回最终可访问的 imageUrl。
 * 失败时抛出，调用方 catch 后可跳过头像继续注册（imageUrl 选填）。
 */
export async function uploadAvatar(localPath: string): Promise<string> {
  const { url } = await getAvatarPresignedUrl()

  // 读本地文件为 ArrayBuffer（mp-weixin 不能直接 PUT 本地路径）
  const buf = await new Promise<ArrayBuffer>((resolve, reject) => {
    uni.getFileSystemManager().readFile({
      filePath: localPath,
      success: (r) => resolve(r.data as ArrayBuffer),
      fail: reject,
    })
  })

  const ext = (localPath.split('.').pop() || 'jpg').toLowerCase()

  // 直接向 OSS PUT，不经 request 封装（OSS 返回的不是 Result<T> 结构）
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

  // 文件公开访问地址 = 去掉签名查询参数
  return url.split('?')[0]
}
