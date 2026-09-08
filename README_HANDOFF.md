# SDET Learning OS — Codex Handoff

本目录用于直接交给 Codex。

## 内容

- `CODEX_FRONTEND_PROMPT.md`
  - 完整产品与技术规格
  - 页面结构
  - GitHub CRUD
  - Auth / Security
  - 数据模型
  - V0.1 ~ V1.0 开发顺序
  - 验收标准

- `docs/design/jianghu-ui-reference.png`
  - 前端视觉方向参考图
  - 用于提取色彩、材质和氛围
  - 不要把整张图直接当生产背景

## 使用方式

将本目录中的文件复制到：

`huayou712-maker/sdet-learning-roadmap`

仓库根目录。

然后让 Codex：

> 阅读并严格执行 `CODEX_FRONTEND_PROMPT.md`，在 `feat/learning-os-web` 分支分阶段实现并测试，最后提交 PR 到 `main`。

不要向 Codex 提供真实 Token 或 Secret；需要的 Secret 应由你在本地 `.env.local` 和 Vercel 环境变量中配置。
