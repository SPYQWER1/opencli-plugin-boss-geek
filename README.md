# opencli-plugin-boss-job

BOSS直聘求职者命令行工具 — OpenCLI 插件

通过复用 Chrome 浏览器登录态，在终端中完成 **职位搜索、推荐浏览、职位详情、打招呼、聊天列表、聊天消息查看、发送消息、简历列表、简历上传、简历删除** 等功能。

---

## 功能一览

| 命令 | 说明 | 实现方式 |
|------|------|----------|
| `search` | 搜索职位，支持城市/经验/学历/薪资/行业筛选 | API |
| `recommend` | 查看首页推荐职位 | API |
| `detail` | 查看职位详情 | API |
| `greet` | 向招聘方打招呼 | API |
| `chatlist` | 查看聊天列表 | API |
| `chatmsg` | 查看与某人的聊天消息 | API |
| `send` | 向招聘方发送聊天消息 | UI 自动化 |
| `resume-list` | 查看简历列表（在线简历和附件简历） | API |
| `resume-upload` | 上传 PDF 简历 | API |
| `resume-delete` | 删除附件简历 | API |

---

## 技术栈

- **运行时**: Node.js ≥ 18（ESM 模块）
- **语言**: TypeScript
- **编译器**: TypeScript 5+ / tsx（开发模式）
- **插件框架**: [OpenCLI](https://clawhub.ai) (`@jackwener/opencli`)
- **浏览器交互**: OpenCLI Chrome 扩展 + Puppeteer-style 页面控制
- **构建产物**: `dist/` 目录（编译后的 `.js` + `.d.ts`）

---

## 环境依赖

| 依赖 | 说明 |
|------|------|
| [Node.js](https://nodejs.org/) ≥ 18 | 运行环境 |
| [npm](https://www.npmjs.com/) | 包管理 |
| Chrome 浏览器 | 需已登录 BOSS直聘 (zhipin.com) |
| OpenCLI Chrome 扩展 | 桥接终端与浏览器，复用 Cookie |
| OpenCLI CLI | 全局安装 OpenCLI 以加载本插件 |

---

## 安装

### 1. 安装依赖并构建

```bash
cd boss-geek-cli
npm install
npm run build
```

### 2. 注册为 OpenCLI 插件

```bash
opencli plugin install "file:$(pwd)"
```

> 已安装过需先卸载：`opencli plugin uninstall boss-job`

### 3. 浏览器准备

1. 在 Chrome 中登录 [BOSS直聘](https://www.zhipin.com)
2. 安装并启用 OpenCLI Chrome 扩展

---

## 使用

### 搜索职位

```bash
opencli boss-job search 前端 --city 杭州 --experience 3-5年 --degree 本科 --salary 15-20K --limit 10
```

参数说明：

| 参数 | 说明 | 示例 |
|------|------|------|
| `query` | 搜索关键词（必填） | `前端`、`AI`、`产品经理` |
| `--city` | 城市名或城市代码 | `杭州`、`上海` |
| `--experience` | 经验要求 | `应届`、`1-3年`、`3-5年`、`5-10年` |
| `--degree` | 学历要求 | `大专`、`本科`、`硕士`、`博士` |
| `--salary` | 薪资范围 | `5-10K`、`10-15K`、`20-30K` |
| `--industry` | 行业 | `互联网` |
| `--page` | 页码 | `1` |
| `--limit` | 返回数量 | `10` |

### 推荐职位

```bash
opencli boss-job recommend --limit 10
```

### 职位详情

```bash
opencli boss-job detail <securityId>
```

`securityId` 从 `search` 或 `recommend` 结果中获取。

### 打招呼

```bash
opencli boss-job greet <securityId>
```

### 聊天列表

```bash
opencli boss-job chatlist --limit 10
```

### 聊天消息

```bash
opencli boss-job chatmsg <encryptUid> --security-id <securityId>
```

### 发送消息

```bash
opencli boss-job send <encryptUid> "你好，请问这个职位还在招吗？"
```

> `send` 命令通过 UI 自动化实现（BOSS直聘使用 MQTT 协议，不支持直接 HTTP 发消息）。

### 简历列表

```bash
opencli boss-job resume-list
```

查看所有在线简历和附件简历。

### 上传简历

```bash
opencli boss-job resume-upload /path/to/your/resume.pdf
```

上传成功后会显示最新的简历列表。

### 删除附件简历

```bash
opencli boss-job resume-delete <resumeId>
```

`resumeId` 从 `resume-list` 结果中获取。删除成功后会显示剩余简历列表。

---

## 项目结构

```
boss-geek-cli/
├── package.json            # 项目配置
├── tsconfig.json           # TypeScript 配置
├── opencli-plugin.json     # OpenCLI 插件注册
├── CLAUDE.md               # AI 助手项目说明
│
├── utils.ts                # 公共工具（bossFetch 请求、城市/经验/学历/薪资映射）
├── search.ts               # 职位搜索
├── recommend.ts            # 推荐职位
├── detail.ts               # 职位详情
├── greet.ts                # 打招呼
├── chatlist.ts             # 聊天列表
├── chatmsg.ts              # 聊天消息
├── send.ts                 # 发送消息（UI 自动化）
│
├── dist/                   # 编译产物（.js + .d.ts）
├── node_modules/           # 依赖
├── .opencli/               # OpenCLI 数据记录
└── .claude/                # Claude Code Skill 目录
    └── skills/
        └── boss-job/
            └── SKILL.md    # Skill 定义
```

### 架构说明

- OpenCLI 扫描项目下的 `.ts` 文件，识别 `cli()` 调用并自动注册命令。
- 所有命令通过 `Strategy.COOKIE` 策略复用 Chrome 浏览器 Cookie，自动携带认证信息。
- `bossFetch` 函数使用 `page.evaluate` 在浏览器上下文中发送 XHR 请求，确保 Cookie 不丢失。
- `send` 命令因 BOSS直聘使用 MQTT 协议而非 HTTP 发送消息，需通过 UI 自动化模拟点击操作。

### API 端点

| 端点 | 用途 |
|------|------|
| `/wapi/zpgeek/search/joblist.json` | 职位搜索 |
| `/wapi/zpgeek/recommend/job/list.json` | 推荐职位 |
| `/wapi/zpgeek/job/detail.json` | 职位详情 |
| `/wapi/zpgeek/friend/add.json` | 打招呼 |
| `/wapi/zprelation/friend/getGeekFriendList.json` | 聊天列表 |
| `/wapi/zpchat/geek/historyMsg` | 聊天消息 |
| `/wapi/zpgeek/resume/baseinfo/query.json` | 简历基本信息（在线简历） |
| `/wapi/zpgeek/resume/attachment/checkbox.json` | 附件简历列表 |
| `/wapi/zpupload/resume/uploadFile.json` | 上传简历文件 |
| `/wapi/zpgeek/resume/attachment/save.json` | 保存附件关联 |
| `/wapi/zpgeek/resume/attachment/delete.json` | 删除附件简历 |

---

## 注意事项

1. **必须先登录**：使用前需在 Chrome 浏览器中登录 zhipin.com，插件通过复用 Cookie 进行 API 调用。
2. **推荐职位可能已下线**：`recommend` 接口会返回已下线职位，建议先用 `detail` 验证有效性。
3. **发送消息依赖 UI 自动化**：`send` 命令通过模拟页面交互实现，页面结构变化时可能需要调整。
4. **反爬机制**：BOSS直聘有反爬检测，页面可能自动刷新，但不影响正常功能。

---

## 开发

```bash
# 开发模式（无需编译）
npm run dev

# 构建
npm run build

# 重新安装插件
opencli plugin uninstall boss-job && opencli plugin install "file:$(pwd)"
```

---

## License

MIT
