/**
 * 帖子接口（见 docs/API.md §4）
 * 全部需登录；POST /posts 与发表评论额外要求 `post` 权限（实名 + 学籍认证）。
 */
import request from '@/utils/request'
import type {
  ForumCategoryVO, PostListItemVO, PostDetailVO, CommentVO,
  PageResult, CreatePostParam, CommentParam,
} from '@/data/types'

/** 把对象拼成 query string（用于 GET query / POST-with-query 接口） */
function toQuery(params: Record<string, any>): string {
  const pairs = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
  return pairs.length ? `?${pairs.join('&')}` : ''
}

/** 分页参数 */
export interface PageParam {
  pageNum?: number
  pageSize?: number
}

/** 4.1 获取帖子分类列表 */
export function getCategories(): Promise<ForumCategoryVO[]> {
  return request<ForumCategoryVO[]>({ url: '/posts/categories', method: 'GET' })
}

/** 4.2 获取帖子列表（categoryId 不传表示全部分类） */
export function getPosts(
  params: PageParam & { categoryId?: number } = {},
): Promise<PageResult<PostListItemVO>> {
  return request<PageResult<PostListItemVO>>({
    url: '/posts' + toQuery(params),
    method: 'GET',
  })
}

/** 4.3 获取帖子详情（会记浏览量） */
export function getPostDetail(postId: number | string): Promise<PostDetailVO> {
  return request<PostDetailVO>({ url: `/posts/${postId}`, method: 'GET' })
}

/**
 * 4.4 发帖（需 `post` 权限，返回新帖 ID）。
 * 无权限返回 code:403，调用方自行 catch 引导认证 → 传 showError:false。
 */
export function createPost(body: CreatePostParam): Promise<number> {
  return request<number>({ url: '/posts', method: 'POST', data: body, showError: false })
}

/** 4.5 删除自己的帖子（软删除） */
export function deletePost(postId: number | string): Promise<null> {
  return request<null>({ url: `/posts/${postId}`, method: 'DELETE' })
}

/** 4.6 获取我的帖子 */
export function getMyPosts(params: PageParam = {}): Promise<PageResult<PostListItemVO>> {
  return request<PageResult<PostListItemVO>>({
    url: '/posts/me' + toQuery(params),
    method: 'GET',
  })
}

/** 4.7 获取我的收藏 */
export function getMyFavorites(params: PageParam = {}): Promise<PageResult<PostListItemVO>> {
  return request<PageResult<PostListItemVO>>({
    url: '/posts/favorites' + toQuery(params),
    method: 'GET',
  })
}

/** 4.8 获取一级评论列表 */
export function getComments(
  postId: number | string,
  params: PageParam = {},
): Promise<PageResult<CommentVO>> {
  return request<PageResult<CommentVO>>({
    url: `/posts/${postId}/comments` + toQuery(params),
    method: 'GET',
  })
}

/** 4.9 展开楼中楼回复 */
export function getReplies(
  rootId: number | string,
  params: PageParam = {},
): Promise<PageResult<CommentVO>> {
  return request<PageResult<CommentVO>>({
    url: `/posts/comments/${rootId}/replies` + toQuery(params),
    method: 'GET',
  })
}

/**
 * 4.10 发表评论 / 回复（需 `post` 权限，返回新评论 ID）。
 * 无权限返回 code:403，调用方自行 catch 引导认证 → 传 showError:false。
 */
export function createComment(
  postId: number | string,
  body: CommentParam,
): Promise<number> {
  return request<number>({
    url: `/posts/${postId}/comments`,
    method: 'POST',
    data: body,
    showError: false,
  })
}

/** 4.11 删除评论（软删除） */
export function deleteComment(commentId: number | string): Promise<null> {
  return request<null>({ url: `/posts/comments/${commentId}`, method: 'DELETE' })
}

/** 4.12 点赞 / 取消点赞帖子 */
export function likePost(postId: number | string): Promise<null> {
  return request<null>({ url: `/posts/${postId}/like`, method: 'POST' })
}
export function unlikePost(postId: number | string): Promise<null> {
  return request<null>({ url: `/posts/${postId}/like`, method: 'DELETE' })
}

/** 4.13 点赞 / 取消点赞评论 */
export function likeComment(commentId: number | string): Promise<null> {
  return request<null>({ url: `/posts/comments/${commentId}/like`, method: 'POST' })
}
export function unlikeComment(commentId: number | string): Promise<null> {
  return request<null>({ url: `/posts/comments/${commentId}/like`, method: 'DELETE' })
}

/** 4.14 收藏 / 取消收藏帖子 */
export function favoritePost(postId: number | string): Promise<null> {
  return request<null>({ url: `/posts/${postId}/favorite`, method: 'POST' })
}
export function unfavoritePost(postId: number | string): Promise<null> {
  return request<null>({ url: `/posts/${postId}/favorite`, method: 'DELETE' })
}
