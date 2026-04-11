# BOSS直聘求职者工具 - OpenCLI 插件

一个为 BOSS直聘求职者提供的命令行工具，通过复用 Chrome 登录态，实现职位搜索、投递管理、消息查看等功能。

## 安装

```bash
# 从 GitHub 安装
opencli plugin install github:SPYQWER1/opencli-plugin-boss-job

# 或从本地目录安装
opencli plugin install file:///path/to/opencli-plugin-boss-job
```

## 前置要求

1. 在 Chrome 浏览器中登录 [BOSS直聘](https://www.zhipin.com)
2. 安装 OpenCLI Chrome 扩展

## 可用命令

### 职位相关

```bash
# 搜索职位
opencli boss-job search 前端 --city 杭州 --limit 10
opencli boss-job search 产品经理 --city 北京 --experience 3-5年 --salary 15-20K

# 查看推荐职位
opencli boss-job recommend --limit 10

# 查看职位详情
opencli boss-job detail <security-id>
```

### 求职操作

```bash
# 打招呼（使用系统默认招呼语）
opencli boss-job greet <security-id>

# 打招呼（自定义招呼语）
opencli boss-job greet <security-id> --text "您好，我对这个职位很感兴趣"
```

### 聊天功能

```bash
# 查看聊天列表
opencli boss-job chatlist --limit 10

# 查看聊天记录
opencli boss-job chatmsg <encrypt_uid> --security-id <security_id>

# 发送消息
opencli boss-job send <encrypt_uid> "你好，请问这个职位还在招吗？"
```

## 参数说明

### search 搜索职位

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `query` | 搜索关键词（必填） | - |
| `--city` | 城市名称或代码 | 北京 |
| `--experience` | 经验要求 | 不限 |
| `--degree` | 学历要求 | 不限 |
| `--salary` | 薪资范围 | 不限 |
| `--industry` | 行业 | 不限 |
| `--page` | 页码 | 1 |
| `--limit` | 返回数量 | 15 |

### greet 打招呼

| 参数 | 说明 |
|------|------|
| `security-id` | 职位安全ID（从搜索结果获取）|
| `--text` | 自定义招呼语（可选）|

### chatmsg 聊天记录

| 参数 | 说明 |
|------|------|
| `uid` | 加密UID（从 chatlist 获取）|
| `--security-id` | 安全ID（从 chatlist 获取）|
| `--limit` | 返回数量 |

### send 发送消息

| 参数 | 说明 |
|------|------|
| `uid` | 加密UID（从 chatlist 获取）|
| `text` | 消息内容 |

## 开发

```bash
# 安装依赖
npm install

# 构建
npm run build

# 本地测试
opencli plugin uninstall boss-job
opencli plugin install file://$(pwd)
```

## 注意事项

1. **登录态**：需要先在 Chrome 中登录 BOSS直聘
2. **浏览器扩展**：需要安装 OpenCLI Chrome 扩展
3. **反爬检测**：BOSS直聘有反爬机制，页面可能刷新，但不影响结果
4. **API 变更**：BOSS直聘 API 可能随时变更，如有问题请提 Issue
5. **职位有效性**：`recommend` 返回的职位可能已下线，`detail`/`greet` 失败时（返回"缺少必要参数"）通常表示职位已不可用

## License

MIT
