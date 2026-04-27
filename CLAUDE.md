# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

这是一个 OpenCLI 插件，为 BOSS直聘求职者提供命令行工具。通过复用 Chrome 登录态，实现职位搜索、职位详情、打招呼、聊天列表、发送消息等功能。

## 可用命令

| 命令 | 功能 | 实现方式 |
|------|------|----------|
| `search` | 搜索职位 | API |
| `recommend` | 推荐职位 | API |
| `detail` | 职位详情 | API |
| `greet` | 打招呼 | API |
| `chatlist` | 聊天列表 | API |
| `chatmsg` | 聊天记录 | API |
| `send` | 发送消息 | UI自动化 |
| `resume-list` | 查看简历列表（在线简历和附件简历） | API |
| `resume-upload` | 上传 PDF 简历 | API |
| `resume-delete` | 删除附件简历 | API |

## 使用示例

```bash
# 安装依赖并构建
npm install && npm run build

# 重新安装插件
opencli plugin uninstall boss-job && opencli plugin install "file://C:/Users/15981/Desktop/boss-job-cli"

# 搜索职位
opencli boss-job search 前端 --city 杭州 --limit 10

# 查看推荐职位
opencli boss-job recommend --limit 10

# 职位详情
opencli boss-job detail <security-id>

# 打招呼
opencli boss-job greet <security-id>

# 聊天列表
opencli boss-job chatlist --limit 10

# 聊天记录
opencli boss-job chatmsg <encrypt_uid> --security-id <security_id>

# 发送消息
opencli boss-job send <encrypt_uid> "你好，请问这个职位还在招吗？"

# 简历列表
opencli boss-job resume-list

# 上传简历
opencli boss-job resume-upload /path/to/your/resume.pdf

# 删除附件简历
opencli boss-job resume-delete <resume-id>
```

## 架构

OpenCLI 自动扫描目录下的 .ts 文件，查找 `cli()` 调用并注册命令。

```
├── utils.ts          # 工具函数：bossFetch, navigateTo, city/degree/salary 映射
├── search.ts         # 搜索职位 (API)
├── recommend.ts      # 推荐职位 (API)
├── detail.ts         # 职位详情 (API)
├── greet.ts          # 打招呼 (API)
├── chatlist.ts       # 聊天列表 (API)
├── chatmsg.ts        # 聊天记录 (API)
├── send.ts           # 发送消息 (UI自动化)
├── resume-list.ts    # 简历列表 (API)
├── resume-upload.ts  # 上传简历 (API)
└── resume-delete.ts  # 删除附件简历 (API)
```

## 开发要点

### 命令注册模式

```typescript
import { cli, Strategy } from '@jackwener/opencli/registry';
import { requirePage, navigateTo, bossFetch, verbose } from './utils.js';

cli({
  site: 'boss-job',
  name: 'command-name',
  description: '描述',
  domain: 'www.zhipin.com',
  strategy: Strategy.COOKIE,
  browser: true,
  args: [...],
  columns: ['col1', 'col2'],
  func: async (page, kwargs) => {
    requirePage(page);
    const data = await bossFetch(page, url);
    return [...];
  },
});
```

### 认证方式

使用 `bossFetch` 通过 `page.evaluate` 在浏览器上下文中发送 XHR 请求，自动携带 Cookie：

```typescript
const data = await bossFetch(page, 'https://www.zhipin.com/wapi/zpgeek/...');
// 可选参数: { allowNonZero: true } 允许非零返回码
```

### ID 说明

- **securityId**: 用于 `detail` 和 `greet` 命令，从搜索结果或推荐列表获取
- **encryptJobId**: 用于构建职位 URL
- **encryptUid**: 用于 `chatmsg` 和 `send` 命令，从聊天列表获取

**注意**：`recommend` 接口返回的职位可能包含已下线的职位，使用前建议先用 `detail` 命令验证职位是否有效。若职位已下线，API 返回 `code=17` "缺少必要参数"。

### UI 自动化注意事项

`send` 命令需要通过 UI 自动化实现，因为 BOSS直聘使用 MQTT 而非 HTTP 发送消息。关键点：

1. 使用 `MouseEvent` 模拟点击聊天列表项
2. 等待右侧聊天区域加载
3. 找到 `[contenteditable="true"]` 输入框
4. 点击"发送"按钮或按 Enter 键

## API 端点

- `/wapi/zpgeek/search/joblist.json` - 职位搜索
- `/wapi/zpgeek/recommend/job/list.json` - 推荐职位
- `/wapi/zpgeek/job/detail.json?securityId=...` - 职位详情
- `/wapi/zpgeek/friend/add.json?securityId=...` - 打招呼
- `/wapi/zprelation/friend/getGeekFriendList.json` - 聊天列表
- `/wapi/zpchat/geek/historyMsg` - 聊天记录
- `/wapi/zpgeek/resume/baseinfo/query.json` - 简历基本信息（在线简历）
- `/wapi/zpgeek/resume/attachment/checkbox.json` - 附件简历列表
- `/wapi/zpupload/resume/uploadFile.json` - 上传简历文件（POST, FormData, field=file）
- `/wapi/zpgeek/resume/attachment/save.json?previewUrl=...&annexType=0&from=8` - 保存附件关联（POST, 需要 zp_token 请求头）
- `/wapi/zpgeek/resume/attachment/delete.json` - 删除附件简历（POST, body: resumeId=..., 需要 zp_token 请求头）

## 注意事项

1. 需先在 Chrome 中登录 zhipin.com
2. 需安装 OpenCLI Chrome 扩展以桥接浏览器
3. BOSS直聘有反爬检测，页面可能刷新，但不影响结果返回
4. 发送消息功能依赖 UI 自动化，页面结构变化时可能需要调整选择器
5. 推荐职位列表可能包含已下线职位，`detail`/`greet` 操作失败时通常表示职位已不可用

## 反爬与 API 发现经验

### 绕过反爬：用 API 替代 UI 自动化

BOSS直聘反爬极强，自动化浏览器导航到页面后会迅速刷新跳转至 `about:blank`，导致 UI 自动化（DOM 抓取）不可靠。正确做法是**优先找 API 接口，用 `bossFetch` 在浏览器上下文发 XHR**，完全不打开目标页面：

1. `navigateBefore: false` — 不导航到目标页面
2. 先导航到 `chat` 页面建立浏览器上下文（chat 页面不会被反爬踢走）
3. 用 `bossFetch(page, url)` 在 chat 页面上下文中发 XHR 请求，Cookie 自动携带

### API 端点逆向发现方法

当目标功能没有已知的 API 路径时，从 JS bundle 中逆向搜索：

1. **快速抓取页面 script 标签**：导航到目标页面后立即（1-2秒内）用 `page.evaluate` 获取 `document.querySelectorAll('script[src]')` 列表，反爬刷新前通常来得及
2. **识别关键 bundle**：BOSS SPA 的 bundle 命名规则为 `https://static.zhipin.com/zhipin-geek-spa/web/v{version}/static/js/{chunk}.fc72ff13.js`，其中页面同名 bundle（如 `resume.fc72ff13.js`）是主入口
3. **从 bundle 中提取 API 路径**：下载 bundle 内容后用正则搜索：
   - `/"(\/wapi\/[^"]+)"/g` — 匹配 wapi 路径字面量
   - `/"(\/[a-z]+\/[a-z]+\/[^"]+)"/g` — 匹配类似 URL 路径的字符串
   - BOSS 的 API 路径在 bundle 中可能被拆分为前缀+后缀两部分拼接（如 `/wapi/zpgeek` + `/resume/attachment/checkbox.json`），需要组合尝试
4. **用 `bossFetch` 验证候选 endpoint**：在 chat 页面上下文中逐个 GET/POST 探测
   - 404 = 路径错误
   - `code:10` "未知的请求方法" = 路径存在但 HTTP 方法不对，换 POST
   - `code:121` "请求不合法" = 路径正确但缺少必要参数（token/body）
   - `code:0` + 数据 = 成功

### 已验证的 API 模式

- BOSS 直聘 wapi 路径前缀：`/wapi/zpgeek/`（求职者相关）、`/wapi/zprelation/`（关系链）、`/wapi/zpchat/`（聊天）、`/wapi/zpuser/`（用户）、`/wapi/zpupload/`（上传）
- 端点名不一定与页面路由名一致：简历页 `/web/geek/resume` 对应的附件列表 API 是 `/wapi/zpgeek/resume/attachment/checkbox.json`（不是 `list.json`）
- 部分 API 仅支持特定 HTTP 方法：`/wapi/zpupload/resume/uploadFile.json` 只接受 POST

### POST 写操作需要 zp_token 请求头

BOSS 直聘的 axios 请求拦截器在发 POST 请求时会自动附加 `zp_token` 请求头（值为 cookie 中的 `bst`）。不携带此头时，写操作类 API 返回 `code:121` "请求不合法"。

**关键代码（app bundle 中）**：
```javascript
// 从 cookie 读取 bst 值
var n = getCookie("bst");
// 添加到请求头
e.headers.zp_token = n;
e.headers["X-Requested-With"] = "XMLHttpRequest";
```

**使用方式**：在 `page.evaluate` 中发 POST 请求时，需手动读取 `bst` cookie 并设置 `zp_token` 头：
```javascript
const cookies = document.cookie;
const match = cookies.match(/(?:^|; )bst=([^;]+)/);
const bstValue = match ? decodeURIComponent(match[1]) : '';
fetch(url, {
  method: 'POST', credentials: 'include',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'X-Requested-With': 'XMLHttpRequest',
    'zp_token': bstValue,
  },
});
```

注意：`bossFetch`（XHR 方式）目前不设置 `zp_token`，对于需要此 token 的写操作需在 `page.evaluate` 中使用 `fetch` 并手动添加。

### 文件上传模式

BOSS 直聘的文件上传分两步：

1. **上传文件到 OSS**：`POST /wapi/zpupload/resume/uploadFile.json`，使用 `FormData`，字段名 `file`。返回 `previewUrl` 和 `attachmentName`
2. **保存附件关联**：`POST /wapi/zpgeek/resume/attachment/save.json?previewUrl=...&annexType=0&from=8`，需要 `zp_token` 请求头。参数说明：
   - `previewUrl`：步骤 1 返回的预览 URL
   - `annexType`：0=简历附件，1=作品集
   - `from`：来源类型，默认 8

文件内容通过 base64 编码传入浏览器上下文，在浏览器中解码后构造 Blob 和 FormData 上传。

## 发布到 ClawHub

本项目同时作为 Claude Code skill 发布到 clawhub.com。

### Skill 目录结构

Skill 文件位于 `.claude/skills/boss-job/` 目录：

```
.claude/skills/boss-job/
└── SKILL.md  # Skill 定义文件
```

### 发布流程

1. **安装 clawhub CLI**
   ```bash
   npm i -g clawhub
   ```

2. **登录 clawhub**
   ```bash
   clawhub login --token <your-api-token> --no-browser
   ```

3. **发布/更新 skill**
   ```bash
   # 从 .claude/skills/boss-job 目录发布
   clawhub publish .claude/skills/boss-job \
     --slug boss-job \
     --name "boss-job" \
     --version <x.y.z> \
     --changelog "更新说明"
   ```

4. **验证发布**
   ```bash
   clawhub inspect boss-job
   ```

### 版本管理

- 使用语义化版本 (semver): `major.minor.patch`
- 更新内容较大时增加 minor 版本号
-  Bug 修复或小更新增加 patch 版本号
