# 生产环境部署指南

本文档介绍如何将 Readme_bot 部署到生产环境，支持在网络上公开访问。

## 架构概览

```
用户访问 (https://your-app.vercel.app)
        │
        ▼
┌─────────────────┐     API 请求      ┌─────────────────┐
│     Vercel      │ ───────────────▶  │    Railway      │
│   前端 (React)  │                   │ 后端 (Express)  │
│                 │ ◀──────────────── │                 │
└─────────────────┘                   └────────┬────────┘
                                               │
                                               ▼
                                      ┌─────────────────┐
                                      │    Neon         │
                                      │ PostgreSQL      │
                                      │ (免费数据库)    │
                                      └─────────────────┘
```

## 免费额度

| 服务 | 免费额度 | 用途 |
|------|----------|------|
| Vercel | 100GB 带宽/月 | 前端托管 |
| Railway | 500小时/月 | 后端 API |
| Neon | 10GB 存储 | PostgreSQL 数据库 |

**预计成本：完全免费（适合 < 100 用户）**

## 准备工作

### 1. 注册账号

需要注册以下服务（均为免费）：

- **Vercel**: https://vercel.com/signup
- **Railway**: https://railway.app/signup
- **Neon**: https://neon.tech/signup

### 2. 安装 CLI 工具

```bash
# 安装 Vercel CLI
npm i -g vercel

# 安装 Railway CLI
npm i -g @railway/cli

# 登录账号
vercel login
railway login
```

### 3. 准备 GitHub 仓库

将代码推送到 GitHub：

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/yourusername/readme_bot.git
git push -u origin main
```

---

## 第一步：创建数据库（Neon）

### 1. 创建项目

1. 访问 https://console.neon.tech
2. 点击 "Create Project"
3. 填写项目名称：`readme-bot`
4. 选择区域（选择离你用户最近的区域）
5. 点击 "Create Project"

### 2. 获取连接字符串

1. 在项目页面，点击 "Connection Details"
2. 复制连接字符串，格式如下：

```
postgresql://username:password@ep-xxx.us-east-1.aws.neon.tech/readme_bot
```

**保存此连接字符串，后续需要用到。**

---

## 第二步：部署后端（Railway）

### 1. 创建项目

1. 访问 https://railway.app/dashboard
2. 点击 "New Project"
3. 选择 "Deploy from GitHub repo"
4. 选择你的 `readme_bot` 仓库
5. 点击 "Deploy Now"

### 2. 配置环境变量

1. 在 Railway 项目页面，点击 "Variables" 标签
2. 添加以下环境变量：

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `DATABASE_URL` | `postgresql://...` | Neon 数据库连接字符串 |
| `JWT_SECRET` | `生成一个随机字符串` | JWT 密钥，建议 32 位以上 |
| `ANTHROPIC_API_KEY` | `your-claude-api-key` | Claude API 密钥（可选） |
| `PORT` | `3001` | 服务端口 |
| `CORS_ORIGIN` | `https://your-vercel-app.vercel.app` | 前端域名（稍后填写） |

**生成 JWT_SECRET：**
```bash
# macOS/Linux
openssl rand -base64 32

# 或者使用 Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 3. 部署服务

1. Railway 会自动开始部署
2. 等待部署完成（约 2-3 分钟）
3. 部署完成后，点击 "Settings" 查看服务域名
4. 记录后端域名，格式如：`https://readme-bot-api.up.railway.app`

---

## 第三步：部署前端（Vercel）

### 1. 创建项目

1. 访问 https://vercel.com/new
2. 选择 "Import Git Repository"
3. 选择你的 `readme_bot` 仓库
4. 在 "Configure Project" 页面：

   - Framework Preset: `Vite`
   - Build Command: `npm run build`
   - Output Directory: `dist`

5. 点击 "Deploy"

### 2. 配置环境变量

1. 部署完成后，进入项目设置
2. 点击 "Environment Variables"
3. 添加环境变量：

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `VITE_API_URL` | `https://your-backend-api.up.railway.app/api` | 后端 API 地址 |

4. 点击 "Save"

### 3. 重新部署

1. 进入 "Deployments" 页面
2. 点击最新部署旁边的 "..."
3. 选择 "Redeploy"
4. 等待重新部署完成

### 4. 获取前端域名

1. 部署完成后，在项目首页可以看到域名
2. 格式如：`https://readme-bot.vercel.app`
3. 记录此域名

---

## 第四步：更新后端 CORS 配置

现在你有了前端域名，需要更新 Railway 中的 `CORS_ORIGIN` 环境变量：

1. 回到 Railway 项目
2. 进入 "Variables" 标签
3. 更新 `CORS_ORIGIN`：

```
CORS_ORIGIN=https://readme-bot.vercel.app
```

4. Railway 会自动重新部署后端

---

## 第五步：测试部署

### 1. 访问前端

打开浏览器，访问你的 Vercel 域名：

```
https://readme-bot.vercel.app
```

### 2. 测试功能

- ✅ 注册/登录功能
- ✅ 创建文档
- ✅ AI 问答（如果配置了 API Key）
- ✅ 语音朗读
- ✅ 文档收藏

### 3. 检查后端日志

如果在 Railway 中遇到问题：

1. 进入 Railway 项目
2. 点击 "Deployments"
3. 查看最新部署的日志

---

## 常见问题

### Q: Railway 后端响应很慢？

Railway 免费版在 15 分钟无请求后会自动休眠。下次请求时需要 5-10 秒唤醒。首次访问时可能会有点慢，后续请求会恢复正常。

**解决方案**：可以使用 uptime robot 等免费监控服务，每 15 分钟发送一次请求保持服务活跃。

### Q: 如何绑定自定义域名？

**Vercel（前端）：**
1. 进入 Vercel 项目设置
2. 点击 "Domains"
3. 输入你的域名
4. 按照提示配置 DNS 记录

**Railway（后端）：**
1. 进入 Railway 项目设置
2. 点击 "Domains"
3. 输入子域名（如 `api.yourdomain.com`）
4. 配置 CNAME 记录

### Q: 数据库连接失败？

1. 检查 Neon 的连接字符串是否正确
2. 确保 IP 白名单允许 Railway 的 IP（Neon 默认允许所有 IP）
3. 在 Railway 日志中查看具体错误信息

### Q: 如何更新代码？

```bash
# 本地修改代码
git add .
git commit -m "Update"
git push

# Vercel 和 Railway 会自动重新部署
```

---

## 费用说明

| 服务 | 免费额度 | 超出费用 |
|------|----------|----------|
| Vercel | 100GB 带宽/月 | $20/100GB |
| Railway | 500小时运行时间 | $5/100小时 |
| Neon | 10GB 存储 | $10/10GB |

**对于 < 100 用户的小型项目，以上额度通常足够使用。**

---

## 生产环境检查清单

- [ ] 数据库连接正常
- [ ] 前端可以访问后端 API
- [ ] CORS 配置正确
- [ ] JWT_SECRET 已更新为强随机字符串
- [ ] AI 功能正常工作（如果配置了 API Key）
- [ ] SSL 证书已生效（Vercel 和 Railway 自动提供）
- [ ] 绑定自定义域名（如需要）

---

## 下一步优化建议

1. **设置监控**：使用免费监控服务（如 UptimeRobot）监控网站可用性
2. **定期备份**：Neon 提供自动备份，确保已启用
3. **性能优化**：Vercel 自动缓存静态资源
4. **日志管理**：Railway 提供日志查看，必要时可设置日志保留策略
