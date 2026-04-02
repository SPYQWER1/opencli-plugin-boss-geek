# opencli-plugin-boss-geek

BOSS直聘求职者端 CLI 插件 - 搜索职位、投递简历、查看聊天

## 安装

```bash
opencli plugin install github:SPYQWER1/opencli-plugin-boss-geek
```

## 命令

### geek-recommend - 获取推荐岗位

```bash
opencli boss geek-recommend --limit 10
```

### geek-chatlist - 查看聊天列表

```bash
opencli boss geek-chatlist
```

### geek-chatmsg - 查看聊天消息

```bash
opencli boss geek-chatmsg <encrypt_uid> --security-id <security_id>
```

### geek-deliver - 投递简历

```bash
# 投递简历
opencli boss geek-deliver <security_id>

# 带自定义招呼语
opencli boss geek-deliver <security_id> --text "您好，我对这个职位很感兴趣"

# 调试模式（查看页面按钮）
opencli boss geek-deliver <security_id> --dry-run
```

### geek-send - 发送消息

```bash
opencli boss geek-send <encrypt_uid> --security-id <security_id> "消息内容"
```

## 完整工作流

```bash
# 1. 搜索职位（使用内置命令）
opencli boss search "前端" --city "广州"

# 2. 查看职位详情（使用内置命令）
opencli boss detail <security_id>

# 3. 投递简历
opencli boss geek-deliver <security_id>

# 4. 查看聊天列表
opencli boss geek-chatlist

# 5. 查看聊天消息
opencli boss geek-chatmsg <encrypt_uid> --security-id <security_id>
```

## 要求

- 需要在 Chrome 浏览器中登录 BOSS 直聘 (www.zhipin.com)
- 使用 Cookie 认证策略
