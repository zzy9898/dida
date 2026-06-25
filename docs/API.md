# Dida 后端接口文档

本文档面向前端对接使用，描述 Dida 后端当前对外开放的 HTTP 接口。所有接口均返回统一的 JSON 响应结构 `Result<T>`。

> 适用范围：用户/鉴权/学校相关接口（共 9 个）。后续新增接口请同步更新本文件。

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
4. 其余接口均需登录，未登录访问返回 `code: 401`。
5. `/school/**` 额外要求 `ADMIN` 角色。

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

---

## 4. 学校接口（`/school`，仅 ADMIN）

### 4.1 新增学校

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

## 5. 数据模型

### 5.1 UserLoginVO

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

### 5.2 UserInfoVO

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

### 5.3 TokenInfo

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

### 5.4 LoginParam（请求）

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `phone` | string | 是 | 手机号 |
| `password` | string | 是 | 登录密码 |

### 5.5 RegisterParam（请求）

见 [3.3 注册](#33-注册) 请求体字段表。
