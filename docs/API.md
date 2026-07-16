# Dida 后端接口文档

本文档面向前端对接使用，描述 Dida 后端当前对外开放的 HTTP 接口。所有接口均返回统一的 JSON 响应结构 `Result<T>`。

> 适用范围：鉴权、用户、帖子、举报、管理端、学校、即时通讯（IM）接口。后续新增接口请同步更新本文件。

---

## 1. 全局约定

### 1.1 Base URL

```
http://<host>:8080
```

- 服务默认端口 `8080`（未配置 `server.port`），无 context-path 前缀。
- 下文路径均为相对 Base URL 的完整路径。

### 1.2 统一响应结构 `Result<T>`

所有接口（无论成功或失败）都返回如下结构，HTTP 状态码通常为 200，业务结果由 `code` 字段表达：

```json
{
  "code": 200,
  "message": "操作成功",
  "data": {},
  "timestamp": 1719300000000
}
```

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `code` | integer | 业务状态码，见下表 |
| `message` | string | 提示信息 |
| `data` | object/null | 业务数据，随接口而定，可能为 `null` |
| `timestamp` | long | 服务端响应时间戳（毫秒） |

**业务状态码 `code`：**

| code | 含义 | 典型场景 |
| --- | --- | --- |
| 200 | 操作成功 | 正常返回 |
| 401 | 未登录 | 未携带/无效 token 访问受保护接口 |
| 403 | 无权限 | 权限不足 |
| 404 | 客户端异常 | 参数校验失败、登录失败等（注意：不是 HTTP 404） |
| 500 | 系统异常 | 服务端错误 |

> 注意：`code` 是业务码，与 HTTP 状态码无关；请始终以响应体 `code` 判断结果。

### 1.3 鉴权（Sa-Token）

1. 调用登录类接口（`/users/login`、`/users/login-sms`、`/users/register`）成功后，响应 `data.tokenInfo` 含登录令牌：
   - `tokenInfo.tokenName`：令牌名（默认 `satoken`）
   - `tokenInfo.tokenValue`：令牌值
2. 后续访问**受保护接口**时，在请求头中携带该令牌：

   ```
   satoken: <tokenInfo.tokenValue>
   ```

3. **免登录白名单**（无需 token）：
   - `POST /users/login`
   - `POST /users/login-sms`
   - `POST /users/register`
   - `/auth/**`
   - `/error`
   - `POST /im/callback`（腾讯云 IM 回调，不走 Sa-Token，改用回调 token 鉴权，见 [9.7](#97-腾讯云-im-回调服务端配置前端无需关心)）
4. 其余接口均需登录，未登录访问返回 `code: 401`。**`POST /users/avatar` 与 `POST /oss/presign` 也需登录**。
5. `/school/**` 与 `/admin/**` 额外要求 `ADMIN` 角色。

### 1.4 枚举值

枚举在 JSON 中以**字符串标识符**表示（请求与响应一致）。

**Gender（性别）：**

| 值 | 含义 |
| --- | --- |
| `MALE` | 男 |
| `FEMALE` | 女 |
| `UNKNOWN` | 未知 |

**Role（角色）：**

| 值 | 含义 |
| --- | --- |
| `ADMIN` | 管理员 |
| `USER_STUDENT` | 学生用户 |

**ReviewSource（帖子审核记录的触发来源）：**

| 值 | 含义 |
| --- | --- |
| `ADMIN_REVIEW` | 管理员主动审核 |
| `REPORT_APPROVED` | 举报成立自动下架 |

**AllowType（加好友验证方式）：** 决定别人加你时的行为，见 [9.3.1](#931-发起加好友)。

| 值 | 含义 |
| --- | --- |
| `NEED_CONFIRM` | 需要验证（默认）——产生好友申请，等你同意 |
| `ALLOW_ANY` | 允许任何人添加——**跳过申请，直接成为好友** |
| `DENY_ANY` | 不允许任何人添加——直接拒绝 |

**AdminForbidType（管理员禁止加好友标识）：**

| 值 | 含义 |
| --- | --- |
| `NONE` | 允许加好友 |
| `SEND_OUT` | 被管理员禁止**发起**加好友请求（会失去 `add-friends` 权限） |

**FriendRequestStatus（好友申请状态）：**

| 值 | 含义 |
| --- | --- |
| `PENDING` | 待处理 |
| `AGREED` | 已同意 |
| `REJECTED` | 已拒绝 |
| `EXPIRED` | 已过期 |

**FriendStatus / BlackListStatus：** `NORMAL`（正常 / 生效）、`DELETED`（已删除 / 已解除）。

**ImMessageStatus（消息状态）：**

| 值 | 含义 |
| --- | --- |
| `NORMAL` | 正常 |
| `REVOKED` | 已撤回 |
| `DELETED` | 已删除 |

**GroupMemberRole（群成员角色）：** `MEMBER`(0) / `ADMIN`(1，群管理员) / `OWNER`(2，群主)。

> 注意：**改成员角色的接口传的是数字** `0` / `1`（见 [9.6.3](#963-群管理)），而**响应里回显的是字符串** `MEMBER` / `ADMIN` / `OWNER`。

**GroupMemberStatus（群成员状态）：** `NORMAL`（在群）/ `LEFT`（已退群）/ `KICKED`（被踢出）。

**ImGroupStatus（群状态）：** `NORMAL`（正常）/ `DISMISSED`（已解散）。

### 1.5 参数校验失败

带 `@Validated` 的接口（如注册）校验失败时返回 `code: 404`，`message` 为具体字段提示：

```json
{ "code": 404, "message": "昵称不能为空", "data": null, "timestamp": 1719300000000 }
```

---

## 2. 鉴权 / 验证码接口（`/auth`，免登录）

### 2.1 获取短信验证码

先校验极验图形验证码，通过后向手机号下发短信验证码。

- **方法 / 路径**：`GET /auth/sms-verify-code`
- **鉴权**：免登录
- **参数（Query）**：

| 参数名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `lot_number` | string | 是 | 图形验证码流水号 |
| `captcha_output` | string | 是 | 图形验证码核验输出 |
| `pass_token` | string | 是 | 图形验证码通过标识 |
| `gen_time` | string | 是 | 图形验证码生成时间戳 |
| `phone_number` | string | 是 | 接收短信的手机号 |

- **请求示例**：

```
GET /auth/sms-verify-code?lot_number=xxx&captcha_output=xxx&pass_token=xxx&gen_time=1719300000&phone_number=13800000000
```

- **成功响应**（短信已下发）：

```json
{ "code": 200, "message": "操作成功", "data": null, "timestamp": 1719300000000 }
```

- **失败响应**：图形验证码校验不通过返回 `code: 404`，短信下发失败返回 `code: 500`，`message` 为原因。

---

## 3. 用户接口（`/users`）

### 3.1 账号密码登录

- **方法 / 路径**：`POST /users/login`
- **鉴权**：免登录
- **请求体（JSON）**：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `phone` | string | 是 | 手机号 |
| `password` | string | 是 | 登录密码 |

```json
{ "phone": "13800000000", "password": "123456" }
```

- **成功响应**：`data` 为登录用户信息（见 [UserLoginVO](#51-userloginvo)，含 `tokenInfo` 与 `userSig`）。

```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "id": "1001",
    "phone": "13800000000",
    "nickname": "小明",
    "name": "张明",
    "gender": "MALE",
    "selfSignature": "你好",
    "interestTags": ["篮球", "音乐"],
    "imageUrl": "https://...",
    "level": 0,
    "role": "USER_STUDENT",
    "reputationScore": 100,
    "isIdVerified": false,
    "isSchoolVerified": false,
    "createTime": "2026-06-25T10:00:00",
    "updateTime": "2026-06-25T10:00:00",
    "tokenInfo": {
      "tokenName": "satoken",
      "tokenValue": "abcd-efgh-ijkl",
      "isLogin": true,
      "loginId": "1001",
      "loginType": "login",
      "tokenTimeout": 2592000,
      "sessionTimeout": 2592000,
      "tokenSessionTimeout": -2,
      "tokenActiveTimeout": -1,
      "loginDeviceType": "DEF",
      "tag": null
    },
    "userSig": "eJxxxx...."
  },
  "timestamp": 1719300000000
}
```

- **失败响应**：账号不存在或密码错误返回 `code: 404`。

### 3.2 手机号 + 短信验证码登录

校验短信验证码，通过后按手机号登录。**注意：该接口不会自动注册**，未注册手机号返回 `data: null`。

- **方法 / 路径**：`POST /users/login-sms`
- **鉴权**：免登录
- **参数（Query / 表单）**：

| 参数名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `phoneNumber` | string | 是 | 手机号 |
| `code` | string | 是 | 6 位短信验证码 |

- **请求示例**：

```
POST /users/login-sms?phoneNumber=13800000000&code=123456
```

- **成功响应**：
  - 已注册：`data` 为 [UserLoginVO](#51-userloginvo)（含 `tokenInfo`、`userSig`）。
  - **未注册**：`code: 200` 且 `data: null`（前端据此引导去注册）。

```json
{ "code": 200, "message": "操作成功", "data": null, "timestamp": 1719300000000 }
```

- **失败响应**：验证码校验失败返回 `code: 404`，`message` 为原因。

### 3.3 注册

创建用户、自动登录，并自动导入腾讯云 IM 账号。

- **方法 / 路径**：`POST /users/register`
- **鉴权**：免登录
- **请求体（JSON）**：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `phone` | string | 是 | 手机号 |
| `password` | string | 是 | 登录密码 |
| `nickname` | string | 是 | 昵称 |
| `name` | string | 是 | 真实姓名 |
| `gender` | string(Gender) | 是 | 性别：`MALE`/`FEMALE`/`UNKNOWN` |
| `birthdate` | string | 否 | 出生日期，格式 `yyyy-MM-dd` |
| `location` | string | 否 | 所在地 |
| `selfSignature` | string | 否 | 个性签名 |
| `interestTags` | string[] | 否 | 兴趣标签 |
| `imageUrl` | string | 否 | 头像 URL |

```json
{
  "phone": "13800000000",
  "password": "123456",
  "nickname": "小明",
  "name": "张明",
  "gender": "MALE",
  "birthdate": "2003-05-01",
  "location": "北京",
  "selfSignature": "你好",
  "interestTags": ["篮球", "音乐"],
  "imageUrl": "https://..."
}
```

- **成功响应**：`data` 为 [UserLoginVO](#51-userloginvo)（含 `tokenInfo`、`userSig`），注册后即处于登录态。
- **失败响应**：必填字段缺失返回 `code: 404` + 字段提示（如「昵称不能为空」）。

### 3.4 退出登录

- **方法 / 路径**：`POST /users/logout`
- **鉴权**：需登录
- **参数（Query / 表单）**：

| 参数名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `userId` | string | 是 | 用户 ID |

- **请求示例**：

```
POST /users/logout?userId=1001
```

- **成功响应**：

```json
{ "code": 200, "message": "操作成功", "data": null, "timestamp": 1719300000000 }
```

### 3.5 获取当前登录用户信息

可用于登录态检测；从当前登录令牌解析用户身份。

- **方法 / 路径**：`GET /users/info`
- **鉴权**：需登录（请求头携带 `satoken`）
- **参数**：无
- **成功响应**：`data` 为 [UserInfoVO](#52-userinfovo)。

```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "id": "1001",
    "phone": "13800000000",
    "nickname": "小明",
    "name": "张明",
    "gender": "MALE",
    "selfSignature": "你好",
    "interestTags": ["篮球", "音乐"],
    "imageUrl": "https://...",
    "level": 0,
    "role": "USER_STUDENT",
    "reputationScore": 100,
    "isIdVerified": false,
    "isSchoolVerified": false,
    "createTime": "2026-06-25T10:00:00",
    "updateTime": "2026-06-25T10:00:00"
  },
  "timestamp": 1719300000000
}
```

- **失败响应**：未登录返回 `code: 401`。

### 3.6 实名认证

姓名 + 身份证号核验。

- **方法 / 路径**：`POST /users/{userId}/verifyIdcard`
- **鉴权**：需登录
- **路径参数**：

| 参数名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `userId` | string | 是 | 用户 ID |

- **参数（Query / 表单）**：

| 参数名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `name` | string | 是 | 真实姓名 |
| `idCard` | string | 是 | 身份证号 |

- **请求示例**：

```
POST /users/1001/verifyIdcard?name=张明&idCard=110101200305010000
```

- **响应**：

| 结果 | 响应 |
| --- | --- |
| 认证成功 | `code: 200` |
| 验证失败 | `code: 404`，`message: "验证失败"` |
| 系统/接口异常 | `code: 500` |

### 3.7 学籍认证

学信网在线验证码核验。

- **方法 / 路径**：`POST /users/{userId}/verifySchool`
- **鉴权**：需登录
- **路径参数**：

| 参数名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `userId` | string | 是 | 用户 ID |

- **参数（Query / 表单）**：

| 参数名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `verifyCode` | string | 是 | 学信网在线验证码 |

- **请求示例**：

```
POST /users/1001/verifySchool?verifyCode=ABCD1234
```

- **响应**：

| 结果 | 响应 |
| --- | --- |
| 认证成功 | `code: 200` |
| 验证失败 | `code: 404`（默认提示） |
| 该校不在服务范围内 | `code: 404`，`message: "该校不在服务范围内"` |
| 系统/接口异常 | `code: 500` |

### 3.8 获取头像上传签名 URL

获取一个用于客户端直传头像到阿里云 OSS 的签名 PUT URL。AccessKey 不暴露给客户端，前端拿到 URL 后直接向 OSS 发起 HTTP PUT 上传文件。

- **方法 / 路径**：`POST /users/avatar`
- **鉴权**：需登录
- **参数**：无
- **成功响应**：`data` 为 [SignedUploadUrl](#54-signeduploadurl)。

```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "url": "https://dida-common.oss-cn-qingdao.aliyuncs.com/avatar/abc123?Expires=...&OSSAccessKeyId=...&Signature=...",
    "expireTimeMillis": 1719300300000
  },
  "timestamp": 1719300000000
}
```

- **失败响应**：生成签名 URL 失败返回 `code: 500`。

**前端上传流程**：
1. 调用本接口拿到 `url`。
2. 在 `expireTimeMillis`（毫秒时间戳）之前，直接对 `url` 发起 HTTP `PUT` 请求，请求体为文件二进制内容即可完成上传。
3. 上传成功后，文件的访问地址即为 `url` 去掉 `?` 后的查询参数部分（需 bucket 允许读取）。
4. URL 过期后（默认 5 分钟）再次 PUT 将返回 HTTP 403，需重新获取。

```
PUT https://dida-common.oss-cn-qingdao.aliyuncs.com/avatar/abc123?Expires=...&Signature=...
（请求体 = 文件二进制内容）
```

---

### 3.9 获取通用上传签名 URL

公用的 OSS 直传签名接口，供各业务模块复用（头像、帖子图片、聊天图片等）。对象名由服务端用 UUID 生成，客户端只能指定受白名单约束的业务目录，避免覆盖他人对象或路径穿越。AccessKey 不暴露给客户端。

- **方法 / 路径**：`POST /oss/presign`
- **鉴权**：需登录
- **参数**（Query）：

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `dir` | string | 是 | 业务目录，须为白名单值：`avatar` / `post` / `chat` |
| `ext` | string | 否 | 文件扩展名，如 `jpg`；仅允许字母数字，非法值将被忽略（生成的对象名不带扩展名） |
| `expireSeconds` | long | 否 | 签名有效期（秒），默认 `300`，上限 `3600`，`<=0` 按默认值处理 |

- **成功响应**：`data` 为 [SignedUploadUrl](#84-signeduploadurl)。生成的对象名形如 `{dir}/{userId}/{uuid}.{ext}`。

```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "url": "https://dida-common.oss-cn-qingdao.aliyuncs.com/post/1001/abc123.jpg?Expires=...&OSSAccessKeyId=...&Signature=...",
    "expireTimeMillis": 1719300300000
  },
  "timestamp": 1719300000000
}
```

- **失败响应**：`dir` 非白名单值返回 `code: 404`；生成签名 URL 失败返回 `code: 500`。

> 上传流程与 [3.8](#38-获取头像上传签名-url) 一致：拿到 `url` 后在有效期内直接对其发起 HTTP `PUT`，请求体为文件二进制内容。

---

## 4. 帖子接口（`/posts`）

> 帖子相关接口本期全部**需要登录**；其中 `POST /posts` 额外要求具备 `post` 权限（已完成实名 + 学籍认证）。

### 4.1 获取帖子分类列表

- **方法 / 路径**：`GET /posts/categories`
- **鉴权**：需登录
- **参数**：无
- **成功响应**：`data` 为 [ForumCategoryVO](#57-forumcategoryvo) 数组。

```json
{
  "code": 200,
  "message": "操作成功",
  "data": [
    {
      "id": 1,
      "name": "二手交易",
      "iconUrl": "https://...",
      "description": "校园闲置物品交易",
      "sortOrder": 0
    }
  ],
  "timestamp": 1719300000000
}
```

### 4.2 获取帖子列表

- **方法 / 路径**：`GET /posts`
- **鉴权**：需登录
- **参数（Query）**：

| 参数名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `categoryId` | long | 否 | 分类 ID，不传表示全部分类 |
| `pageNum` | integer | 否 | 页码，默认 `1` |
| `pageSize` | integer | 否 | 每页数量，默认 `10`，最大 `50` |

- **成功响应**：`data` 为 [PageResult<PostListItemVO>](#59-pageresultpostlistitemvo)。

```json
{
  "code": 200,
  "message": "操作成功",
  "data": {
    "records": [
      {
        "id": 10001,
        "userId": 20001,
        "userNickname": "小明",
        "userImageUrl": "https://...",
        "categoryId": 1,
        "categoryName": "二手交易",
        "title": "出闲置耳机",
        "content": "九成新，校内自提",
        "media": [{"type": "image", "url": "https://..."}],
        "locationName": "XX大学图书馆",
        "viewCount": 10,
        "likeCount": 0,
        "commentCount": 0,
        "favoriteCount": 0,
        "isTop": false,
        "createTime": "2026-07-02T18:00:00"
      }
    ],
    "total": 1,
    "pageNum": 1,
    "pageSize": 10
  },
  "timestamp": 1719300000000
}
```

### 4.3 获取帖子详情

- **方法 / 路径**：`GET /posts/{postId}`
- **鉴权**：需登录
- **路径参数**：

| 参数名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `postId` | long | 是 | 帖子 ID |

- **说明**：调用详情接口时会记录当前登录用户的浏览；首次浏览会推动 `viewCount + 1`。
- **成功响应**：`data` 为 [PostDetailVO](#58-postdetailvo)。
- **失败响应**：帖子不存在时返回 `code: 404`，`message: "帖子不存在"`。

### 4.4 发帖

- **方法 / 路径**：`POST /posts`
- **鉴权**：需登录且具备 `post` 权限
- **请求体（JSON）**：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `categoryId` | long | 是 | 分类 ID |
| `title` | string | 是 | 标题 |
| `content` | string | 是 | 正文 |
| `media` | object[] | 否 | 图片/视频列表，如 `[{"type":"image","url":"..."}]` |
| `locationName` | string | 否 | 位置展示名称 |
| `longitude` | number | 否 | 经度；若传则必须同时传 `latitude` |
| `latitude` | number | 否 | 纬度；若传则必须同时传 `longitude` |

```json
{
  "categoryId": 1,
  "title": "出闲置耳机",
  "content": "九成新，校内自提",
  "media": [
    {"type": "image", "url": "https://..."}
  ],
  "locationName": "XX大学图书馆",
  "longitude": 120.123456,
  "latitude": 36.123456
}
```

- **成功响应**：`data` 为新创建的帖子 ID；新帖默认直接发布（`post.status = 0`）。

```json
{ "code": 200, "message": "操作成功", "data": 10001, "timestamp": 1719300000000 }
```

- **失败响应**：
  - 未登录：`code: 401`
  - 无 `post` 权限：`code: 403`
  - 分类不存在 / 已停用 / 经纬度只传了一半：`code: 404`

### 4.5 删除自己的帖子

- **方法 / 路径**：`DELETE /posts/{postId}`
- **鉴权**：需登录
- **路径参数**：

| 参数名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `postId` | long | 是 | 帖子 ID |

- **说明**：删除为软删除，服务端会把 `post.status` 更新为 `1`。
- **成功响应**：

```json
{ "code": 200, "message": "操作成功", "data": null, "timestamp": 1719300000000 }
```

- **失败响应**：
  - 非作者删除：`code: 403`，`message: "无权限删除该帖子"`
  - 帖子不存在：`code: 404`，`message: "帖子不存在"`

### 4.6 获取我的帖子

- **方法 / 路径**：`GET /posts/me`
- **鉴权**：需登录
- **参数（Query）**：

| 参数名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `pageNum` | integer | 否 | 页码，默认 `1` |
| `pageSize` | integer | 否 | 每页数量，默认 `10`，最大 `50` |

- **成功响应**：`data` 为 [PageResult<PostListItemVO>](#59-pageresultpostlistitemvo)。

### 4.7 获取我的收藏

- **方法 / 路径**：`GET /posts/favorites`
- **鉴权**：需登录
- **参数（Query）**：同 [4.6](#46-获取我的帖子) 的分页参数
- **说明**：仅返回仍为正常状态（`status=0`）的收藏帖子，按收藏时间倒序。
- **成功响应**：`data` 为 [PageResult<PostListItemVO>](#59-pageresultpostlistitemvo)，其中 `favorited` 恒为 `true`。

### 4.8 获取一级评论列表

- **方法 / 路径**：`GET /posts/{postId}/comments`
- **鉴权**：需登录
- **路径参数**：`postId`（long，帖子 ID）
- **参数（Query）**：分页参数 `pageNum` / `pageSize`（默认 `1` / `10`，最大 `50`）
- **说明**：仅返回一级评论（`rootId` 为 `null`）且状态正常，按创建时间升序；返回项含 `replyCount`（楼中楼数）与 `liked`（当前用户是否已点赞）。
- **成功响应**：`data` 为 [PageResult<CommentVO>](#511-pageresultcommentvo)。

### 4.9 展开楼中楼回复

- **方法 / 路径**：`GET /posts/comments/{rootId}/replies`
- **鉴权**：需登录
- **路径参数**：`rootId`（long，一级评论 ID）
- **参数（Query）**：分页参数同上
- **说明**：返回该一级评论下的全部回复，按创建时间升序；返回项含 `replyUserId` / `replyUserNickname`（被回复人）与 `liked`。
- **成功响应**：`data` 为 [PageResult<CommentVO>](#511-pageresultcommentvo)。

### 4.10 发表评论 / 回复

- **方法 / 路径**：`POST /posts/{postId}/comments`
- **鉴权**：需登录且具备 `post` 权限
- **路径参数**：`postId`（long，帖子 ID）
- **请求体（JSON）**：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `content` | string | 是 | 评论内容 |
| `parentId` | long | 否 | 直接回复的评论 ID；为空表示发表一级评论 |

- **说明**：
  - `parentId` 为空 → 发表一级评论
  - `parentId` 非空 → 回复；若回复的是一级评论则挂在其下，若回复的是楼中楼则继承同一根评论，并记录被回复人
  - 计数：帖子 `commentCount + 1`；若为回复，对应一级评论 `replyCount + 1`
- **成功响应**：`data` 为新评论 ID。
- **失败响应**：帖子不存在 / 回复的评论不存在返回 `code: 404`。

### 4.11 删除评论

- **方法 / 路径**：`DELETE /posts/comments/{commentId}`
- **鉴权**：需登录
- **路径参数**：`commentId`（long，评论 ID）
- **说明**：软删除（`status=1`）；帖子 `commentCount - 1`，若为回复则一级评论 `replyCount - 1`。
- **失败响应**：非作者删除返回 `code: 403`，`message: "无权限删除该评论"`；评论不存在返回 `code: 404`。

### 4.12 点赞 / 取消点赞帖子

- **方法 / 路径**：`POST /posts/{postId}/like`（点赞）、`DELETE /posts/{postId}/like`（取消）
- **鉴权**：需登录
- **说明**：重复点赞不会重复计数；取消点赞为软取消。点赞使帖子 `likeCount + 1`，取消 `- 1`。
- **成功响应**：`code: 200`，`data: null`。

### 4.13 点赞 / 取消点赞评论

- **方法 / 路径**：`POST /posts/comments/{commentId}/like`（点赞）、`DELETE /posts/comments/{commentId}/like`（取消）
- **鉴权**：需登录
- **说明**：同帖子点赞，维护评论 `likeCount`。
- **成功响应**：`code: 200`，`data: null`。

### 4.14 收藏 / 取消收藏帖子

- **方法 / 路径**：`POST /posts/{postId}/favorite`（收藏）、`DELETE /posts/{postId}/favorite`（取消）
- **鉴权**：需登录
- **说明**：重复收藏不会重复计数；取消为软取消。维护帖子 `favoriteCount`。
- **成功响应**：`code: 200`，`data: null`。

---

## 5. 举报接口

### 5.1 创建举报

- **方法 / 路径**：`POST /reports`
- **鉴权**：需登录
- **请求体（JSON）**：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `targetId` | long | 是 | 举报目标 ID（帖子 / 评论 / 用户 ID） |
| `targetType` | string(ReportTargetType) | 是 | 举报目标类型：`POST`（帖子）/ `COMMENT`（评论）/ `USER`（用户） |
| `reasonType` | string(ReportType) | 是 | 举报类型：`PORNOGRAPHY`（色情低俗）/ `AD`（广告引流）/ `ABUSE`（辱骂攻击）/ `FRAUD`（诈骗）/ `ILLEGAL`（违法违规）/ `OTHER`（其他） |
| `reasonDetail` | string | 否 | 举报补充说明，最长 500 字 |
| `evidence` | object[] | 否 | 证据材料，如 `[{"type":"image","url":"..."}]` |

- **说明**：
  - 同一用户对同一目标 24 小时内只能举报一次
  - 目标必须存在且状态正常（已删除或下架的内容不能举报）
- **成功响应**：`data` 为举报 ID（long）。
- **失败响应**：
  - 目标不存在返回 `code: 404`
  - 重复举报返回 `code: 404`，`message: "24小时内已举报过该内容"`

### 5.2 查询我的举报记录

- **方法 / 路径**：`GET /reports/my`
- **鉴权**：需登录
- **参数（Query）**：分页参数 `pageNum` / `pageSize`（默认 `1` / `20`）
- **成功响应**：`data` 为 [PageResult<ReportListItemVO>](#613-pageresultreportlistitemvo)。

---

## 6. 管理端接口

### 6.1 查询举报列表

- **方法 / 路径**：`GET /admin/reports`
- **鉴权**：需登录且角色为 `ADMIN`
- **参数（Query）**：

| 参数名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `pageNum` | integer | 否 | 页码，默认 `1` |
| `pageSize` | integer | 否 | 每页大小，默认 `20` |
| `status` | string(ReportStatus) | 否 | 筛选举报状态：`PENDING`（待处理）/ `APPROVED`（违规成立）/ `REJECTED`（举报驳回） |
| `targetType` | string(ReportTargetType) | 否 | 筛选目标类型：`POST` / `COMMENT` / `USER` |

- **成功响应**：`data` 为 [PageResult<ReportDetailVO>](#814-pageresultreportdetailvo)。

### 6.2 查询举报详情

- **方法 / 路径**：`GET /admin/reports/{reportId}`
- **鉴权**：需登录且角色为 `ADMIN`
- **路径参数**：`reportId`（long，举报 ID）
- **成功响应**：`data` 为 [ReportDetailVO](#813-reportdetailvo)。
- **失败响应**：举报不存在返回 `code: 404`。

### 6.3 处理举报

- **方法 / 路径**：`POST /admin/reports/{reportId}/handle`
- **鉴权**：需登录且角色为 `ADMIN`
- **路径参数**：`reportId`（long，举报 ID）
- **请求体（JSON）**：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `status` | string(ReportStatus) | 是 | 处理状态：`APPROVED`（违规成立）/ `REJECTED`（举报驳回） |
| `handleResult` | string | 否 | 处理结果说明，最长 200 字 |

- **说明**：
  - 只能处理待处理状态的举报
  - 违规成立时会自动下架目标内容（帖子状态改为 `VIOLATION_REMOVED`，评论状态改为 `VIOLATION_DELETED`）；举报用户（`USER`）的封禁 / 信誉分联动由风控流程处理，此接口不自动封禁
  - 下架帖子时会同事务写一条审核记录（`source: REPORT_APPROVED`，关联本举报 ID，`reason` 取 `handleResult`），可通过 [6.6](#66-查询帖子审核历史) 查询
  - 删除一级评论时会级联删除其楼中楼回复，并同步扣减帖子的评论数
  - 处理操作会记录处理人（管理员）ID 和处理时间
- **成功响应**：`code: 200`，`data: null`。
- **失败响应**：
  - 举报不存在或已处理返回 `code: 404`
  - 非 ADMIN 访问返回 `code: 403`

### 6.4 按状态查询帖子列表

- **方法 / 路径**：`GET /admin/posts/pending-review`
- **鉴权**：需登录且角色为 `ADMIN`
- **参数（Query）**：

| 参数名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `status` | string(PostStatus) | 否 | 帖子状态，不传默认 `PENDING_REVIEW`；可传 `NORMAL` / `VIOLATION_REMOVED` 等 |
| `categoryId` | long | 否 | 按分类筛选 |
| `pageNum` | integer | 否 | 页码，默认 `1` |
| `pageSize` | integer | 否 | 每页大小，默认 `10`，上限 `50` |

- **说明**：当前为**先发后审**模式，新帖直接以 `NORMAL` 发布，因此默认的 `PENDING_REVIEW` 列表通常为空；要捞正常帖做事后下架，传 `?status=NORMAL`。
- **成功响应**：`data` 为 [PageResult<PostListItemVO>](#89-pageresultpostlistitemvo)。返回项中的 `liked` / `favorited` 恒为 `false`（管理端不回显个人互动状态）。

### 6.5 审核帖子

- **方法 / 路径**：`POST /admin/posts/{postId}/review`
- **鉴权**：需登录且角色为 `ADMIN`
- **路径参数**：`postId`（long，帖子 ID）
- **请求体（JSON）**：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `status` | string(PostStatus) | 是 | 审核结果：`NORMAL`（通过 / 恢复）/ `VIOLATION_REMOVED`（违规下架） |
| `reason` | string | 否 | 审核原因，最长 200 字，如"含广告引流" |

- **说明**：
  - 可审核任意非用户删除状态的帖子：对 `NORMAL` 帖执行下架，对 `VIOLATION_REMOVED` 帖执行恢复，对 `PENDING_REVIEW` 帖执行通过或拒绝
  - 状态变更与审核记录写在同一事务：每次审核都会在 `post_review_record` 落一条流水（审核人、变更前后状态、原因、时间），可通过 6.6 查询
- **成功响应**：`code: 200`，`data: null`。
- **失败响应**：
  - 帖子不存在、已被用户删除、或目标状态与当前状态相同返回 `code: 404`
  - 非 ADMIN 访问返回 `code: 403`

### 6.6 查询帖子审核历史

- **方法 / 路径**：`GET /admin/posts/{postId}/review-records`
- **鉴权**：需登录且角色为 `ADMIN`
- **路径参数**：`postId`（long，帖子 ID）
- **参数（Query）**：分页参数 `pageNum` / `pageSize`（默认 `1` / `10`，上限 `50`）
- **说明**：按时间倒序返回该帖子的完整状态变更时间线，包含管理员主动审核（`source: ADMIN_REVIEW`）和举报成立自动下架（`source: REPORT_APPROVED`，带 `reportId`）两类来源。用于用户申诉查证、下架原因统计、管理员操作追责。
- **成功响应**：`data` 为 `PageResult<PostReviewRecordVO>`：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | long | 记录 ID |
| `postId` | long | 帖子 ID |
| `reviewerUserId` | long | 审核人（管理员）ID |
| `reviewerNickname` | string | 审核人昵称 |
| `beforeStatus` | string(PostStatus) | 变更前状态 |
| `afterStatus` | string(PostStatus) | 变更后状态 |
| `source` | string(ReviewSource) | 触发来源：`ADMIN_REVIEW`（管理员主动审核）/ `REPORT_APPROVED`（举报成立自动下架） |
| `reportId` | long | 来源为举报时的举报 ID，主动审核为 `null` |
| `reason` | string | 审核原因；来源为举报时是举报处理说明（`handleResult`） |
| `createTime` | string | 审核时间 |

---

## 7. 学校接口（`/school`，仅 ADMIN）

### 7.1 新增学校

- **方法 / 路径**：`POST /school`
- **鉴权**：需登录且角色为 `ADMIN`
- **参数（Query / 表单）**：

| 参数名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `schoolName` | string | 是 | 学校名称 |
| `address` | string | 是 | 学校地址 |

- **请求示例**：

```
POST /school?schoolName=清华大学&address=北京市海淀区
```

- **成功响应**：

```json
{ "code": 200, "message": "操作成功", "data": null, "timestamp": 1719300000000 }
```

- **失败响应**：非 ADMIN 访问会被角色校验拦截。

---

## 8. 数据模型

### 8.1 UserLoginVO

登录 / 注册成功返回的用户信息。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | string | 用户 ID |
| `phone` | string | 手机号 |
| `nickname` | string | 昵称 |
| `name` | string | 真实姓名 |
| `gender` | string(Gender) | 性别 |
| `selfSignature` | string | 个性签名 |
| `interestTags` | string[] | 兴趣标签 |
| `imageUrl` | string | 头像 URL |
| `level` | integer | 用户等级 |
| `role` | string(Role) | 角色 |
| `reputationScore` | integer | 信誉分 |
| `isIdVerified` | boolean | 是否已实名认证 |
| `isSchoolVerified` | boolean | 是否已学籍认证 |
| `createTime` | string(datetime) | 创建时间 |
| `updateTime` | string(datetime) | 更新时间 |
| `tokenInfo` | object(TokenInfo) | 登录令牌信息，见 [TokenInfo](#53-tokeninfo) |
| `userSig` | string | 腾讯云 IM 登录签名 |

### 8.2 UserInfoVO

获取当前登录用户信息时返回。字段与 `UserLoginVO` 相同，但**不含** `tokenInfo` 与 `userSig`。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | string | 用户 ID |
| `phone` | string | 手机号 |
| `nickname` | string | 昵称 |
| `name` | string | 真实姓名 |
| `gender` | string(Gender) | 性别 |
| `selfSignature` | string | 个性签名 |
| `interestTags` | string[] | 兴趣标签 |
| `imageUrl` | string | 头像 URL |
| `level` | integer | 用户等级 |
| `role` | string(Role) | 角色 |
| `reputationScore` | integer | 信誉分 |
| `isIdVerified` | boolean | 是否已实名认证 |
| `isSchoolVerified` | boolean | 是否已学籍认证 |
| `createTime` | string(datetime) | 创建时间 |
| `updateTime` | string(datetime) | 更新时间 |

### 8.3 TokenInfo

Sa-Token 登录令牌信息。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `tokenName` | string | 令牌名（默认 `satoken`，即请求头 key） |
| `tokenValue` | string | 令牌值（请求头 value） |
| `isLogin` | boolean | 是否已登录 |
| `loginId` | object | 登录 ID（用户 ID） |
| `loginType` | string | 登录类型 |
| `tokenTimeout` | long | token 有效期（秒） |
| `sessionTimeout` | long | 账号会话有效期（秒） |
| `tokenSessionTimeout` | long | token 会话有效期（秒） |
| `tokenActiveTimeout` | long | token 最低活跃频率（秒） |
| `loginDeviceType` | string | 登录设备类型 |
| `tag` | string | 自定义标识 |

### 8.4 SignedUploadUrl

客户端直传 OSS 所需的签名 PUT URL 及过期时间。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `url` | string | 带签名的 PUT URL，客户端直接向该地址发起 HTTP PUT 上传文件 |
| `expireTimeMillis` | long | 签名过期时间戳（毫秒），超时后 URL 不可用（OSS 返回 403） |

### 8.5 LoginParam（请求）

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `phone` | string | 是 | 手机号 |
| `password` | string | 是 | 登录密码 |

### 8.6 RegisterParam（请求）

见 [3.3 注册](#33-注册) 请求体字段表。

### 8.7 ForumCategoryVO

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | long | 分类 ID |
| `name` | string | 分类名称 |
| `iconUrl` | string | 分类图标 URL |
| `description` | string | 分类描述 |
| `sortOrder` | integer | 展示排序，越小越靠前 |

### 8.8 PostDetailVO

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | long | 帖子 ID |
| `userId` | long | 发帖人 ID |
| `userNickname` | string | 发帖人昵称 |
| `userImageUrl` | string | 发帖人头像 |
| `categoryId` | long | 分类 ID |
| `categoryName` | string | 分类名称 |
| `title` | string | 标题 |
| `content` | string | 正文 |
| `media` | object[] | 图片/视频列表 |
| `locationName` | string | 位置展示名称 |
| `longitude` | number | 经度；未传位置时为 `null` |
| `latitude` | number | 纬度；未传位置时为 `null` |
| `viewCount` | integer | 浏览数 |
| `likeCount` | integer | 点赞数 |
| `commentCount` | integer | 评论数 |
| `favoriteCount` | integer | 收藏数 |
| `isTop` | boolean | 是否置顶 |
| `status` | string(PostStatus) | 帖子状态：`NORMAL` / `USER_DELETED` / `VIOLATION_REMOVED` / `PENDING_REVIEW` |
| `liked` | boolean | 当前登录用户是否已点赞 |
| `favorited` | boolean | 当前登录用户是否已收藏 |
| `canDelete` | boolean | 当前登录用户是否可删除该帖子 |
| `createTime` | string(datetime) | 创建时间 |
| `updateTime` | string(datetime) | 更新时间 |

### 8.9 PageResult<PostListItemVO>

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `records` | PostListItemVO[] | 当前页记录 |
| `total` | long | 总记录数 |
| `pageNum` | integer | 当前页码 |
| `pageSize` | integer | 每页大小 |

### 8.10 PostListItemVO

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | long | 帖子 ID |
| `userId` | long | 发帖人 ID |
| `userNickname` | string | 发帖人昵称 |
| `userImageUrl` | string | 发帖人头像 |
| `categoryId` | long | 分类 ID |
| `categoryName` | string | 分类名称 |
| `title` | string | 标题 |
| `content` | string | 正文 |
| `media` | object[] | 图片/视频列表 |
| `locationName` | string | 位置展示名称 |
| `viewCount` | integer | 浏览数 |
| `likeCount` | integer | 点赞数 |
| `commentCount` | integer | 评论数 |
| `favoriteCount` | integer | 收藏数 |
| `isTop` | boolean | 是否置顶 |
| `liked` | boolean | 当前登录用户是否已点赞 |
| `favorited` | boolean | 当前登录用户是否已收藏 |
| `createTime` | string(datetime) | 创建时间 |

### 8.11 CommentVO

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | long | 评论 ID |
| `postId` | long | 所属帖子 ID |
| `userId` | long | 评论人 ID |
| `userNickname` | string | 评论人昵称 |
| `userImageUrl` | string | 评论人头像 |
| `rootId` | long | 所属一级评论 ID；一级评论为 `null` |
| `parentId` | long | 直接回复的评论 ID；一级评论为 `null` |
| `replyUserId` | long | 被回复人 ID；一级评论为 `null` |
| `replyUserNickname` | string | 被回复人昵称；一级评论为 `null` |
| `content` | string | 评论内容 |
| `likeCount` | integer | 点赞数 |
| `replyCount` | integer | 楼中楼回复数（仅一级评论维护） |
| `liked` | boolean | 当前登录用户是否已点赞该评论 |
| `canDelete` | boolean | 当前登录用户是否可删除该评论 |
| `createTime` | string(datetime) | 创建时间 |

### 8.12 PageResult<CommentVO>

结构同 [PageResult<PostListItemVO>](#69-pageresultpostlistitemvo)，`records` 为 [CommentVO](#611-commentvo) 数组。

### 8.13 ReportDetailVO

举报详情数据模型。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | long | 举报 ID |
| `reporterUserId` | long | 举报人 ID |
| `reporterNickname` | string | 举报人昵称 |
| `targetType` | string(ReportTargetType) | 举报目标类型：`POST` / `COMMENT` / `USER` |
| `targetId` | long | 目标 ID |
| `targetContent` | string | 被举报内容文本（帖子/评论正文；用户为其昵称） |
| `targetAuthorNickname` | string | 内容作者昵称 |
| `reasonType` | string(ReportType) | 举报类型：`PORNOGRAPHY` / `AD` / `ABUSE` / `FRAUD` / `ILLEGAL` / `OTHER` |
| `reasonDetail` | string | 举报补充说明 |
| `evidence` | object[] | 证据材料 |
| `status` | string(ReportStatus) | 处理状态：`PENDING`（待处理）/ `APPROVED`（违规成立）/ `REJECTED`（举报驳回） |
| `handlerUserId` | long | 处理人（管理员）ID |
| `handlerNickname` | string | 处理人昵称 |
| `handleResult` | string | 处理结果说明 |
| `handleTime` | string(datetime) | 处理时间 |
| `createTime` | string(datetime) | 创建时间 |

### 8.14 PageResult<ReportDetailVO>

结构同 [PageResult<PostListItemVO>](#89-pageresultpostlistitemvo)，`records` 为 [ReportDetailVO](#813-reportdetailvo) 数组。

### 8.15 ReportListItemVO

举报列表项数据模型。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | long | 举报 ID |
| `reporterNickname` | string | 举报人昵称 |
| `targetType` | string(ReportTargetType) | 举报目标类型：`POST` / `COMMENT` / `USER` |
| `targetContentPreview` | string | 被举报内容前 50 字 |
| `reasonType` | string(ReportType) | 举报类型 |
| `status` | string(ReportStatus) | 处理状态 |
| `createTime` | string(datetime) | 创建时间 |

### 8.16 PageResult<ReportListItemVO>

结构同 [PageResult<PostListItemVO>](#89-pageresultpostlistitemvo)，`records` 为 [ReportListItemVO](#815-reportlistitemvo) 数组。

### 8.17 枚举类型补充

**ReportTargetType（举报目标类型）**：

| 值 | 含义 |
| --- | --- |
| `POST` | 帖子 |
| `COMMENT` | 评论 |
| `USER` | 用户 |

**ReportType（举报类型，对应 `reason_type`）**：

| 值 | 含义 |
| --- | --- |
| `PORNOGRAPHY` | 色情低俗 |
| `AD` | 广告引流 |
| `ABUSE` | 辱骂攻击 |
| `FRAUD` | 诈骗 |
| `ILLEGAL` | 违法违规 |
| `OTHER` | 其他 |

**ReportStatus（举报处理状态）**：

| 值 | 含义 |
| --- | --- |
| `PENDING` | 待处理 |
| `APPROVED` | 已处理-违规成立 |
| `REJECTED` | 已处理-举报驳回 |

---

## 9. 即时通讯（IM）接入指南

### 9.0 前端必须同时接入 SDK 和本服务端

**只调本文档的 HTTP 接口是跑不起来的。** 本服务端**没有任何推送通道**（无 WebSocket / SSE / 长轮询），因此**收不到实时消息**——实时收发必须依赖腾讯云 IM SDK。本服务端负责的是业务规则与历史数据。

```
                      ┌──── 实时收发消息、未读数、在线状态 ────┐
                      ▼                                      │
  前端 ──(userSig)──► 腾讯云 IM SDK ◄──────────────────► 腾讯云 IM
   │                                                          │
   │                                                          │ 回调
   └──(satoken)──► Dida 服务端 ──(REST API)──► 腾讯云 IM        │
                        ▲                                     │
                        └────────── 旁路入库 ──────────────────┘
```

**职责划分：**

| 能力 | 走哪边 | 原因 |
| --- | --- | --- |
| 登录 IM、**实时收消息**、未读数、会话红点、在线状态推送、正在输入、已读回执 | **腾讯云 SDK** | 服务端无推送通道，给不了 |
| **加好友** | **本服务端** | 有实名 + 学籍认证门槛（`add-friends` 权限），SDK 直接加会被前置回调拦截 |
| 拉黑 / 解除拉黑 | **本服务端** | 本项目语义是「拉黑即解除好友」，SDK 不会帮你解除好友关系 |
| 建群 / 群管理（改群、踢人、禁言、撤回） | **本服务端** | 群主/管理员判定与成员计数在服务端维护 |
| 好友列表、黑名单、群列表、群成员列表 | **本服务端** | 带上了昵称、头像等业务字段 |
| **消息历史** | **本服务端** | 腾讯云漫游有时长限制，超期消息只有本地库有 |
| 发消息 | **两边都行，建议走 SDK** | 走 SDK 能拿到发送态（发送中/失败/重发），延迟也更低。走服务端是「代发」，多绕一跳 |

### 9.1 接入四步

**第 1 步：登录 Dida，拿到 `satoken` 和 `userSig`**

调 `POST /users/login`（或 `/users/login-sms`、`/users/register`），响应里同时包含：

- `data.tokenInfo.tokenValue` → 之后所有 Dida 接口的请求头 `satoken`
- `data.userSig` → 腾讯云 IM SDK 的登录凭证

**第 2 步：用 `userSig` 登录 IM SDK**

`sdkAppId` 与 `userId` 从 `GET /im/user-sig` 拿（登录响应里只有 `userSig`，没有 `sdkAppId`）：

```js
const { data } = await http.get('/im/user-sig');   // { userId, userSig, sdkAppId }
const chat = TencentCloudChat.create({ SDKAppID: data.sdkAppId });
await chat.login({ userID: data.userId, userSig: data.userSig });
```

> `userSig` 有效期 **60 天**。SDK 会在过期时抛登录态失效事件，此时重新调 `GET /im/user-sig` 换一个即可，**不需要**重新走 Dida 登录。

**第 3 步：监听 SDK 事件收消息**

```js
chat.on(TencentCloudChat.EVENT.MESSAGE_RECEIVED, ({ data }) => { /* 新消息 */ });
chat.on(TencentCloudChat.EVENT.CONVERSATION_LIST_UPDATED, ...);  // 会话列表 / 未读数
chat.on(TencentCloudChat.EVENT.KICKED_OUT, ...);                 // 被踢下线
```

**第 4 步：业务操作走 Dida 接口**

加好友、拉黑、建群、群管理都调本文档 9.3 ~ 9.6 的接口，**不要**用 SDK 的对应方法（会被拦截或绕过业务规则）。

### 9.2 账号与资料

#### 9.2.1 获取 IM 登录签名

- **方法 / 路径**：`GET /im/user-sig`
- **鉴权**：需登录
- **响应 `data`（UserSigVO）**：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `userId` | string | IM UserID，即 Dida 的用户 ID |
| `userSig` | string | IM 登录签名，有效期 60 天 |
| `sdkAppId` | long | 腾讯云 IM 应用 ID |

```json
{
  "code": 200,
  "message": "操作成功",
  "data": { "userId": "1001", "userSig": "eJxxxx...", "sdkAppId": 1600147812 },
  "timestamp": 1719300000000
}
```

#### 9.2.2 其余账号接口

| 方法 / 路径 | 参数 | 说明 |
| --- | --- | --- |
| `GET /im/account/online-status` | Query `userIds`（逗号分隔，**1~100 个**） | 查在线状态。数量超出范围返回 `code: 404` |
| `POST /im/account/kick` | Query `userId`（可选） | 踢下线。不传即踢自己；**踢他人需 `ADMIN` 角色**，否则 `code: 404` |
| `POST /im/profile/sync` | 无 | 把 Dida 的用户资料（昵称/头像/性别/生日/签名等）同步到腾讯云 IM。**用户改完资料后应调一次**，否则 IM 侧仍是旧资料 |
| `GET /im/profile/{userId}` | 路径 `userId` | 查某人的 IM 资料 |

> 这几个接口的 `data` 是**腾讯云原始响应**（直接透传），不是 Dida 的 VO 结构，字段以腾讯云文档为准。

### 9.3 好友

#### 9.3.1 发起加好友

- **方法 / 路径**：`POST /im/friends/requests`
- **鉴权**：需登录 + **`add-friends` 权限**（要求已完成实名认证与学籍认证，且未被管理员禁止加好友）
- **请求体（FriendAddParam）**：

| 字段 | 类型 | 必填 | 约束 | 说明 |
| --- | --- | --- | --- | --- |
| `toUserId` | long | 是 | — | 要加的人 |
| `addSource` | string | 否 | ≤50 | 添加来源，默认 `AddSource_Type_server` |
| `addWording` | string | 否 | ≤256 | 申请附言 |
| `remark` | string | 否 | ≤96 | 你给对方预设的备注，**对方同意后自动生效**（`ALLOW_ANY` 则立即生效） |
| `friendGroup` | string | 否 | ≤30 | 你给对方预设的分组，生效时机同上 |

> `remark` / `friendGroup` 是**单向**的——只写你自己这一侧，对方看不到、也不会覆盖对方给你设的备注。走 `NEED_CONFIRM` 流程时它们先随申请存着，对方点「同意」的那一刻才写入好友关系并同步到腾讯云。加好友之后想改，用 `PUT /im/friends/{friendUserId}`。

- **行为取决于对方的 `allowType`（加好友验证方式）**：

| 对方 allowType | 行为 | 响应 `data` |
| --- | --- | --- |
| `ALLOW_ANY` | 跳过申请，**直接成为双向好友** | `{ "becameFriend": true, "requestId": null }` |
| `NEED_CONFIRM` | 产生待处理申请；**已有待处理申请则复用**，不重复创建 | `{ "becameFriend": false, "requestId": 7001 }` |
| `DENY_ANY` | 拒绝 | `code: 404`，`message: "对方不接收好友申请"` |

> **前端必须处理 `becameFriend`**：为 `true` 时不要提示「申请已发送，等待对方同意」，应直接刷新好友列表。

- **失败响应**（均为 `code: 404`，`message` 为具体原因）：`不能添加自己为好友`、`已经是好友`、`对方暂不接收你的好友申请`（被对方拉黑）、`请先将对方移出黑名单`、`对方不接收好友申请`、`用户不存在`。
- **无权限**：未完成实名 / 学籍认证时返回 `code: 403`。

#### 9.3.2 好友申请列表

- **方法 / 路径**：`GET /im/friends/requests/received`（收到的）、`GET /im/friends/requests/sent`（我发出的）
- **参数（Query）**：

| 参数名 | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `status` | string(FriendRequestStatus) | 不传 = 全部 | `PENDING` / `AGREED` / `REJECTED` / `EXPIRED` |
| `pageNum` | integer | `1` | 页码，从 1 开始 |
| `pageSize` | integer | `20` | 每页条数，**上限 100** |

- **响应 `data`**：`PageResult<FriendRequestVO>`

| FriendRequestVO 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | long | 申请 ID，同意 / 拒绝时用它 |
| `fromUserId` / `fromNickname` / `fromImageUrl` | long / string / string | 申请人 |
| `toUserId` / `toNickname` / `toImageUrl` | long / string / string | 被申请人 |
| `addSource` / `addWording` | string | 来源 / 附言 |
| `status` | string(FriendRequestStatus) | 申请状态 |
| `handleTime` / `createTime` | string | 处理时间 / 申请时间 |

#### 9.3.3 同意 / 拒绝申请

| 方法 / 路径 | 说明 |
| --- | --- |
| `POST /im/friends/requests/{requestId}/agree` | 同意。**只有申请的接收方能同意** |
| `POST /im/friends/requests/{requestId}/reject` | 拒绝。同上 |

- **成功响应**：`code: 200`，`data: null`。
- **失败响应**：申请不存在、不是发给你的、或已被处理过 → `code: 404`，`message: "好友申请不存在或已处理"`。

> **重复点击「同意」是安全的**：第二次会返回上述错误，不会重复建立好友关系、也不会重复调用腾讯云。

#### 9.3.4 好友列表 / 备注 / 删除

| 方法 / 路径 | 参数 | 说明 |
| --- | --- | --- |
| `GET /im/friends` | Query `pageNum`（默认 1）/ `pageSize`（默认 20，上限 100） | 好友列表，按成为好友时间倒序 |
| `PUT /im/friends/{friendUserId}` | Body `{ remark?, friendGroup? }` | 改备注（≤96）/ 分组（≤30）。两个都不传则什么也不做 |
| `DELETE /im/friends/{friendUserId}` | — | 删好友，**双向解除** |
| `GET /im/friends/check` | Query `friendUserId` | 校验好友关系，`data` 为腾讯云原始响应 |

- `GET /im/friends` 的 `data` 为 `PageResult<FriendVO>`：

| FriendVO 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | long | 好友关系行 ID |
| `userId` / `friendUserId` | long | 我 / 好友 |
| `friendNickname` / `friendImageUrl` | string | 好友昵称 / 头像 |
| `remark` | string | 我给好友设的备注，可能为 `null` |
| `friendGroup` | string | 好友分组，可能为 `null` |
| `addSource` / `addWording` / `addTime` | string | 来源 / 附言 / 成为好友的时间 |
| `status` | string(FriendStatus) | `NORMAL` / `DELETED` |

- `PUT /im/friends/{friendUserId}`：对方不是好友时返回 `code: 404`，`message: "好友不存在"`。

### 9.4 黑名单

| 方法 / 路径 | 参数 | 说明 |
| --- | --- | --- |
| `POST /im/blacklist/{blockedUserId}` | **路径参数，不是请求体** | 拉黑。**拉黑即解除好友**：会同时双向解除本地与腾讯云的好友关系 |
| `DELETE /im/blacklist/{blockedUserId}` | 路径参数 | 移出黑名单。**不会自动恢复好友关系**，需重新加好友 |
| `GET /im/blacklist` | Query `pageNum` / `pageSize` | 黑名单列表 |
| `GET /im/blacklist/check` | Query `blockedUserId` | 校验是否拉黑，`data` 为腾讯云原始响应 |

- 拉黑自己 → `code: 404`，`message: "不能拉黑自己"`。
- `GET /im/blacklist` 的 `data` 为 `PageResult<BlackListVO>`，字段：`id`、`userId`、`blockedUserId`、`blockedNickname`、`blockedImageUrl`、`status`（BlackListStatus）、`createTime`。

### 9.5 会话与消息

| 方法 / 路径 | 参数 | 说明 |
| --- | --- | --- |
| `GET /im/conversations` | Query `limit`（默认 50，范围 1~100）/ `nextStartTime`（可选，翻页游标） | 最近联系人，`data` 为腾讯云原始响应 |
| `DELETE /im/conversations/{type}/{peerId}` | 路径 `type` = `C2C` 或 `Group`；`peerId` = 对方用户 ID 或群 ID | 删除会话 |
| `POST /im/messages/c2c/text` | Body `{ toUserId, text }` | 发单聊文本（服务端代发），`data` 为腾讯云原始响应 |
| `GET /im/messages/c2c/{peerUserId}` | Query `beforeTime` / `pageSize` | 拉单聊历史 |
| `POST /im/messages/c2c/{msgKey}/withdraw` | 路径 `msgKey` | 撤回单聊消息 |
| `POST /im/messages/c2c/read` | Query `peerUserId` | 标记会话已读 |

**发消息**（`SendC2cTextMsgParam`）：`toUserId` 必填；`text` 必填且 **≤5000 字符**。给自己发消息 → `code: 404`。

**拉历史是游标分页，不是页码分页：**

| 参数（Query） | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `beforeTime` | string | 不传 = 最新 | ISO 时间，如 `2026-07-14T10:00:00`。返回**早于**该时刻的消息 |
| `pageSize` | integer | `20` | 上限 100 |

- 结果按 `msgTime` **倒序**（最新在前）。翻下一页：把当前最后一条的 `msgTime` 作为下次请求的 `beforeTime`。
- 响应是 `PageResult<C2cMessageVO>`，但 **`pageNum` 恒为 1**（游标分页没有页码概念），`total` 是符合条件的总条数。

| C2cMessageVO 字段 | 类型 | 说明 |
| --- | --- | --- |
| `msgKey` | string | 消息唯一标识，**撤回时用它** |
| `conversationId` | string | 会话 ID，格式 `min(id)_max(id)` |
| `fromUserId` / `toUserId` | long | 发送方 / 接收方 |
| `msgTime` | string | 发送时间，也是翻页游标 |
| `msgType` | string | 首个元素类型：`TIMTextElem` / `TIMImageElem` / `TIMSoundElem` / `TIMFileElem` / `TIMVideoFileElem` / `TIMLocationElem` / `TIMFaceElem` / `TIMCustomElem` |
| `msgBody` | array | 腾讯云消息体原文（元素数组），结构与 IM SDK 一致 |
| `cloudCustomData` | string | 自定义数据 |
| `status` | string(ImMessageStatus) | `NORMAL` / `REVOKED`（已撤回）/ `DELETED` |
| `revokeTime` | string | 撤回时间 |
| `msgSeq` / `msgRandom` / `id` | long | 序列号 / 随机数 / 本地行 ID |

> **重要：消息历史依赖腾讯云回调异步入库。** 刚发出的消息可能要**稍等片刻**才能从这个接口查到。前端聊天界面应以 **SDK 的消息列表为准**，本接口用于**拉取漫游期外的历史**。同理，撤回接口在回调尚未到达时会返回 `code: 404`（`消息不存在`）。

**撤回**：只能撤回自己发的消息（`ADMIN` 可撤回任意），否则 `code: 404`（`只能撤回自己发送的消息`）。

### 9.6 群组

> 所有群接口中，平台 `ADMIN` 角色等同于群主权限。**群已解散时，所有群接口一律返回 `code: 404`（`群组不存在`）**。

#### 9.6.1 建群

- **方法 / 路径**：`POST /im/groups`
- **鉴权**：需登录
- **请求体（CreateGroupParam）**：

| 字段 | 类型 | 必填 | 约束 | 说明 |
| --- | --- | --- | --- | --- |
| `type` | string | 是 | — | 群类型：`Public` / `Private`(Work) / `ChatRoom`(Meeting) / `AVChatRoom` / `Community` |
| `name` | string | 是 | ≤30 | 群名称 |
| `introduction` | string | 否 | ≤240 | 群简介 |
| `notification` | string | 否 | ≤300 | 群公告 |
| `faceUrl` | string | 否 | — | 群头像 |
| `maxMemberCount` | integer | 否 | 1~100000 | 最大成员数，默认 500 |
| `applyJoinOption` | string | 否 | — | 申请加群方式：`FreeAccess` / `NeedPermission` / `DisableApply`，默认 `NeedPermission` |
| `memberUserIds` | long[] | 否 | ≤100 人 | 初始成员。**会自动去重并剔除群主自己**，前端无需处理 |

- **成功响应**：`data` 为 `ImGroupVO`，其中的 `groupId` 是腾讯云生成的群 ID，**后续所有群接口都用它**。

#### 9.6.2 群列表与详情

| 方法 / 路径 | 鉴权 | 说明 |
| --- | --- | --- |
| `GET /im/groups?pageNum=&pageSize=` | 登录 | 我加入的群，`data` 为 `PageResult<ImGroupVO>` |
| `GET /im/groups/{groupId}` | **群成员** | 群详情。非群成员访问返回 `code: 404`（`群成员不存在`） |

| ImGroupVO 字段 | 类型 | 说明 |
| --- | --- | --- |
| `groupId` | string | **腾讯云群 ID**，所有群接口的路径参数用它（**不是 `id`**） |
| `id` | long | 本地行 ID，业务上用不到 |
| `groupType` | string | 群类型 |
| `ownerUserId` / `ownerNickname` | long / string | 群主 |
| `name` / `introduction` / `notification` / `faceUrl` | string | 群资料 |
| `maxMemberCount` / `memberCount` | integer | 最大成员数 / 当前成员数 |
| `applyJoinOption` | string | 申请加群方式 |
| `shutUpAll` | boolean | 是否全员禁言 |
| `status` | string(ImGroupStatus) | `NORMAL` / `DISMISSED` |
| `createTime` | string | 建群时间 |

#### 9.6.3 群管理

| 方法 / 路径 | 鉴权 | 请求体 | 说明 |
| --- | --- | --- | --- |
| `PUT /im/groups/{groupId}` | 群主 / 群管理员 | `ModifyGroupParam` | 改群资料。字段与建群同名，**全部可选，只传要改的**；额外支持 `shutUpAll`（boolean，全员禁言） |
| `DELETE /im/groups/{groupId}` | **仅群主** | — | 解散群。群管理员也不行，返回 `code: 404`（`需要群主权限`） |
| `GET /im/groups/{groupId}/members?pageNum=&pageSize=` | 群成员 | — | 成员列表，按角色倒序（群主 → 管理员 → 成员）、入群时间正序 |
| `POST /im/groups/{groupId}/members` | 群主 / 群管理员 | `{ "userIds": [1002, 1003] }` | 加人。必填、**≤100 人**，会自动去重；已在群的成员不会重复计数 |
| `DELETE /im/groups/{groupId}/members/{memberUserId}` | 群主 / 群管理员 | — | 踢人 |
| `PUT /im/groups/{groupId}/members/{memberUserId}` | 群主 / 群管理员 | `{ role?, nameCard? }` | 改成员，见下 |
| `POST /im/groups/{groupId}/members/{memberUserId}/mute` | 群主 / 群管理员 | `{ "seconds": 600 }` | 禁言。`seconds` 必填、≥0，**`0` 表示解除禁言** |

**改成员的 `role`**：只能传 `0`（普通成员）或 `1`（群管理员）。

- 传 `2`（群主）→ `code: 404`，`message: "群主不能通过修改成员信息设置，请使用转让群主接口"`
- 传其他非法值 → `code: 404`，`message: "非法的群成员角色: X"`
- `nameCard`（群名片）≤50 字符

| GroupMemberVO 字段 | 类型 | 说明 |
| --- | --- | --- |
| `groupId` / `userId` | string / long | 群 / 成员 |
| `nickname` / `imageUrl` | string | 成员昵称 / 头像 |
| `role` | string(GroupMemberRole) | `MEMBER` / `ADMIN` / `OWNER` |
| `nameCard` | string | 群名片 |
| `joinTime` / `joinType` | string | 入群时间 / 入群方式 |
| `shutUpUntil` | string | 禁言截止时间，`null` 表示未禁言 |
| `status` | string(GroupMemberStatus) | `NORMAL` / `LEFT` / `KICKED` |

#### 9.6.4 群消息

| 方法 / 路径 | 鉴权 | 说明 |
| --- | --- | --- |
| `POST /im/groups/{groupId}/messages/text` | 群成员 | 发群消息，Body `{ "text": "..." }`，≤5000 字符 |
| `GET /im/groups/{groupId}/messages?beforeTime=&pageSize=` | 群成员 | 群历史。游标分页，规则同单聊（见 9.5） |
| `POST /im/groups/{groupId}/messages/{msgSeq}/recall` | 群主 / 群管理员 | 撤回群消息，用 `msgSeq` 定位 |

`GroupMessageVO` 字段与 `C2cMessageVO` 基本一致，差异：没有 `msgKey` / `conversationId` / `toUserId`，改为 `groupId`、`fromNickname`、`msgSeq`（**撤回群消息用 `msgSeq`，不是 `msgKey`**）。

### 9.7 腾讯云 IM 回调（服务端配置，前端无需关心）

- **方法 / 路径**：`POST /im/callback?token=<回调token>`
- **鉴权**：**不走 Sa-Token**，用 `token` 查询参数校验，必须与服务端环境变量 `TCC_CALLBACK_TOKEN` 一致。**未配置该环境变量时应用会启动失败**——否则这是一个对公网开放的写库入口。
- **调用方**：腾讯云 IM，不是客户端。需在腾讯云控制台把回调 URL 配成带 `?token=xxx` 的形式。
- **响应格式**：腾讯云约定格式，**不是**本项目的 `Result` 结构。成功 `{"ActionStatus":"OK","ErrorCode":0}`；失败 `{"ActionStatus":"FAIL","ErrorCode":-1,"ErrorInfo":"..."}`（腾讯云据此重投）。

#### Before（前置）回调：服务端唯一能卡住 SDK 的地方

客户端 SDK 可以直接向腾讯云发起加好友，**这条链路不经过本服务端**，REST 接口上的 `add-friends` 权限校验会被完全绕过。前置回调是同步的，返回非 0 的 `ErrorCode` 即可**阻断**该操作。

| 命令字 | 拦截规则 |
| --- | --- |
| `Sns.CallbackPrevFriendAdd` | 申请人须已完成实名 + 学籍认证且未被管理员禁止加好友；此外还会拦截：对方设置了拒绝任何人、任一方拉黑了对方、加自己、目标用户不存在 |

> 这不是强一致的闸门：腾讯云在前置回调**超时或不可达时默认放行**。要彻底堵死，还需在腾讯云控制台限制客户端 SDK 直接发起加好友，强制走 `POST /im/friends/requests`。
>
> 判定规则与 Sa-Token 的 `@SaCheckPermission("add-friends")` 共用同一份实现（`UserPermissionRules`），不会出现「接口拦得住、SDK 拦不住」。

#### After（事后）回调：旁路入库

按 `命令字 + MsgKey`（或 `命令字 + GroupId + MsgSeq`，兜底 `命令字 + 报文 MD5`）写 `im_callback_log` 做幂等，重复投递直接返回成功。**Before 回调不参与幂等**（每次都必须重新判定）。

| 命令字 | 落库效果 |
| --- | --- |
| `C2C.CallbackAfterSendMsg` | 写 `c2c_message` |
| `C2C.CallbackAfterMsgWithDraw` | 标记 `c2c_message` 已撤回 |
| `Group.CallbackAfterSendMsg` | 写 `group_message` |
| `Group.CallbackAfterRecallMsg` | 标记 `group_message` 已撤回 |
| `Sns.CallbackFriendAdd` / `Sns.CallbackFriendDelete` | 增删 `friend`（按回调下发的方向逐条写，不自行补反向） |
| `Sns.CallbackBlackListAdd` / `Sns.CallbackBlackListDelete` | 增删 `black_list` |
| `Group.CallbackAfterCreateGroup` | 写 `im_group` + `group_member` |
| `Group.CallbackAfterGroupDestroyed` | 标记 `im_group` 已解散 |
| `Group.CallbackAfterNewMemberJoin` | 写 `group_member`，`member_count + 1` |
| `Group.CallbackAfterMemberExit` / `Group.CallbackAfterKickMember` | 标记成员离群（按报文 `ExitType` 区分主动退群 / 被踢），`member_count - 1` |

其余命令字（`State.StateChange`、各类 Before 回调等）记日志后按成功返回，不阻塞腾讯云。
