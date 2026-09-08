# 部署 SDET Learning OS

## 已实现与需要配置的边界

代码包含 GitHub OAuth、所有者鉴权、GitHub 文件 CRUD、版本冲突保护、学习管理、作品集和隔离测试。真实 OAuth 登录、PAT 权限以及 Vercel 域名必须在你的账号内配置后验证；本地 mock 测试不代表这些外部配置已经成功。

GitHub Repository `huayou712-maker/sdet-learning-roadmap` 是唯一正式数据源。正常开发和生产都通过 GitHub API 读取；未配置或读取失败时显示错误，不降级为本地数据。上传附件只在请求内存处理，直接提交到 GitHub。短时读取缓存只存在服务进程内存中（15 秒），写入成功立即失效；不会写入文件系统。localStorage 仅保留尚未提交的草稿，成功提交后清除。

## 1. 分支和初始数据

先审查并合并功能 PR 到 `main`，或者在预览部署设置 `GITHUB_CONTENT_BRANCH=feat/learning-os-web`。目标分支必须包含 `data/` 和原始 `docs/`。所有读取、写入、目录列表和历史查询均使用指定内容分支。默认 `main`。不要在不同内容分支之间直接复制进度 SHA。

`data/roadmap.json` 是路线定义，`data/progress.json` 独立保存状态，`data/projects.json` 是六个项目的原始验收项，`data/profile.json` 是作品集简介。修改个人资料可直接在 GitHub 编辑该 JSON 并提交。

## 2. 本地运行

需要 Node.js 24 和 npm。

```powershell
npm ci
Copy-Item .env.example .env.local
npm run dev
```

访问 `http://localhost:3000`。`.env.local` 仅用于运行配置和密钥，绝不能提交。它不是业务数据存储。实际学习记录始终提交到 GitHub，因此本地点击保存也会产生真实公开提交。

不配置 OAuth/PAT 仍可读取公开仓库；GitHub 匿名 API 配额较低。不能保存时应配置服务端令牌，不要增加本地文件后备存储。

## 3. GitHub OAuth App

在 GitHub Settings → Developer settings → OAuth Apps 创建应用。

- Homepage URL：`https://你的域名`
- Authorization callback URL：`https://你的域名/api/auth/callback/github`
- 本地开发建议另建 OAuth App，Homepage 为 `http://localhost:3000`，callback 为 `http://localhost:3000/api/auth/callback/github`。
- 将 Client ID 和 Client Secret 分别放入 `AUTH_GITHUB_ID`、`AUTH_GITHUB_SECRET`。

稳定版 `next-auth` 4 使用 Pages API 处理 OAuth，业务页面与业务 API 仍是 App Router。会话仅保留 GitHub login，不将 OAuth access token 或仓库 PAT 放入客户端 Session。

## 4. Fine-grained PAT

用 `huayou712-maker` 创建 fine-grained personal access token，只选择 `sdet-learning-roadmap` 仓库，Repository permissions → Contents: Read and write（Metadata 默认只读）。不需要管理账号、Actions、Secrets 或其他仓库的权限。设置合理有效期。

将令牌放入 Vercel 的服务端 `GITHUB_WRITE_TOKEN`。不要发送到聊天里，不要写进源码、浏览器、NEXT_PUBLIC 变量或日志。OAuth 用于确认身份；PAT 用于服务端仓库操作，两者职责不同。若 main 分支规则禁止此 PAT 直接提交，正式保存将失败；在 GitHub 审查规则和所选内容分支，不要 force push 绕过保护。

## 5. Vercel

导入现有 GitHub 仓库，Framework 选 Next.js，Node.js 24，安装 `npm ci`，构建 `npm run build`。配置：

| 变量                  | 值或用途                                |
| --------------------- | --------------------------------------- |
| AUTH_SECRET           | 你在本地安全生成的高熵随机字符串        |
| AUTH_GITHUB_ID        | OAuth Client ID                         |
| AUTH_GITHUB_SECRET    | OAuth Client Secret                     |
| NEXTAUTH_URL          | `https://你的域名`                      |
| GITHUB_WRITE_TOKEN    | 上述最小权限 PAT                        |
| GITHUB_OWNER          | `huayou712-maker`                       |
| GITHUB_REPO           | `sdet-learning-roadmap`                 |
| GITHUB_CONTENT_BRANCH | `main`，预览可指定功能分支              |
| ALLOWED_GITHUB_LOGIN  | `huayou712-maker`                       |
| NEXT_PUBLIC_SITE_NAME | `SDET Learning OS`                      |
| NEXT_PUBLIC_SITE_URL  | 与访问地址完全一致的 `https://你的域名` |

AUTH_SECRET 可以在你自己的终端用密码管理工具或 Node crypto 生成并直接放入部署环境；不要将结果发给他人。所有 Secret 变量不得以 `NEXT_PUBLIC_` 开头。OAuth callback、NEXTAUTH_URL、NEXT_PUBLIC_SITE_URL 的协议、域名和端口应一致。变更变量后重新部署。可变预览 URL 不适合固定 OAuth callback，建议使用固定预览域名和独立 OAuth App。

不要配置 `E2E_ADAPTER`、`E2E_SECRET` 或 `E2E_RUN_ID` 到真实部署。生产模式明确拒绝本地测试适配器。

## 6. 上线后由你验证

1. 未登录能看路线及选中公开展示的内容，看不到编辑按钮；直接写请求被拒绝。
2. 用 `huayou712-maker` 登录，保存一篇无敏感信息的笔记；核对仓库目标分支中的文件和返回 Commit。
3. 另一标签页修改同一记录，旧 SHA 保存应返回冲突而不覆盖远端；复制草稿后刷新。
4. 检查作业、项目、日课、软删除、恢复与附件；附件上传本身即产生公开提交。
5. 确认作品集仅显示 `showInPortfolio=true` 且未删除的记录。

## 数据与安全说明

- 公开仓库中的所有历史都可被访问。`showInPortfolio` 只是网页展示开关，不提供隐私保护；删除当前文件也不能抹去 Git 历史。
- 正式写操作必须经过会话身份、来源校验、Schema、路径白名单和 GitHub API。唯一写入用户硬性限定为 `huayou712-maker`。
- 附件最大 4 MB，类型白名单与基本内容签名校验；凭据检测不是完整的 DLP，上传前仍应人工检查内容。
- 总学习时长仅汇总 Daily actualMinutes，笔记耗时不重复计入。日期与连续学习按 UTC 计算。公开首页只统计可展示记录，所有者首页统计全部未删除记录。
- 时间线为全部未删除可见记录的最近事件及进度提交；最近 30 条记录补充完整文件提交历史。每条记录自己的 History 可查看完整历史。
- 当前实现面向个人小规模内容库。15 秒纯内存缓存减少 API 请求，不是数据库、离线存储或数据真相。大量记录可后续优化 GitHub tree/blob 批量读取。

## 测试隔离

`npm run test:e2e` 启动专用测试进程，在 `.e2e-data/<随机运行ID>` 中存放**合成测试数据**，绝不承载正式业务数据，也不写真实 GitHub。测试进程清空真实 PAT 和 Auth Secret；生产环境无法启用。该目录被 Git 忽略。单元测试使用内存 mock。

运行 `npm run lint`、`npm run typecheck`、`npm run test`、`npm run build`、`npm run test:e2e`。CI 不注入真实 GitHub 写令牌。首次 Linux E2E 运行需 `npx playwright install --with-deps chromium`；本机 E2E 默认使用已安装 Chrome。
