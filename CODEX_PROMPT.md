# 给 Codex 的执行 Prompt

把下面这段完整复制给 Codex；把 `<YOUR_GITHUB_USERNAME>` 和仓库名按需替换。

---

我需要你把一套“测试开发 / 测试工程师学习路线”发布到我的 GitHub。

目标仓库：

- GitHub 用户：`<YOUR_GITHUB_USERNAME>`
- 仓库名：`sdet-learning-roadmap`
- 仓库可见性：public
- 默认分支：main

请执行以下任务：

1. 创建仓库（如果已存在则不要覆盖历史，先检查当前内容）。
2. 将我提供的以下文件原样放入仓库：
   - `README.md`
   - `docs/ROADMAP.md`
   - `docs/RESOURCES.md`
   - `docs/PROJECTS.md`
   - `docs/PROGRESS.md`
3. 确保所有 Markdown 链接可点击、相对路径正确。
4. README 顶部保持中文标题和 Mermaid 路线图。
5. 不要随意新增付费课程、培训机构广告或网盘资源。
6. 不要删除“Python 不从零开始、边做边补”的学习原则。
7. 保留对 `zhoujinjian/ai-testing-guide` 的来源说明和许可证提醒。
8. 创建 `.gitignore`，至少包含：

```gitignore
__pycache__/
*.pyc
.venv/
venv/
.env
.idea/
.vscode/
.pytest_cache/
allure-results/
allure-report/
playwright-report/
test-results/
.DS_Store
```

9. 创建第一次提交：

```text
docs: add SDET learning roadmap and free course resources
```

10. push 到 `main`。
11. 完成后输出：
    - 仓库 URL
    - 本次创建/修改的文件列表
    - 最后一次 commit hash
    - 是否存在失败步骤

额外要求：

- 如果发现仓库已存在且内容有冲突，不允许强推（no force push）。
- 如果 GitHub 权限不足，停止写入并明确告诉我需要授权什么权限。
- 不要把任何 Token、Cookie、个人密钥写入仓库。
- 不要修改课程链接，除非确认链接失效；若修改，必须在回复中列出变更理由。
