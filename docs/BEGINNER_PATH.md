# 从第一个测试开始

先完成诊断，再依次做：测试设计与 HTTP → requests / pytest → 最小 CI → SQL 与接口可靠性 → 关键 UI 流程。遇到不会的知识点再回十阶段目录补齐。

## 今天只做这一件事

打开仓库中的 projects/beginner-api-lab/DIAGNOSTIC.md。先不看答案，完成列表、字典、函数与错误定位诊断；不会变量、条件、循环时，先补这些基础并重做诊断。不要用“看过 Python 课程”代替这一步。

第一组练习在 projects/beginner-api-lab/。Windows PowerShell 中从仓库根目录运行：

~~~powershell
cd projects/beginner-api-lab
py -3.12 -m venv .venv
.\.venv\Scripts\python.exe -m pip install --index-url https://pypi.org/simple -r requirements.txt
.\.venv\Scripts\python.exe -m pytest -q
.\.venv\Scripts\python.exe selfcheck.py
~~~

已有 Python 3.13 也可用于创建虚拟环境。先用 py -0p 核对有效安装路径；失效路径要换可用版本。无需激活脚本，不改 PowerShell 执行策略。Linux / macOS 使用 python3 建环境、.venv/bin/python 运行。

服务由 fixture 自动启动和关闭，不需要部署应用、数据库或配置 Token。仅使用本机合成数据；正式学习状态仍提交到 GitHub。练习包自身的测试、缓存和报告不是学习成绩。

## 一次学习的闭环

1. 写预期：输入、输出、状态变化与失败边界。
2. 动手：先独立写用例，再运行；每次只验证一个原因。
3. 看失败：记下断言、实际值与原因；修复后重跑，并单独跑该测试。
4. 留证据：把自己的用例、代码和复盘提交 GitHub，再在知识点关联 commit / 作业。未提交草稿不算正式成果。

任务卡上的“自评”来自原知识点勾选，“有证据”只表示存在关联；两者都不是独立能力认证。维护者已经写好的演示测试通过，不代表你完成了练习。

## 第一组之后

API V0 先有可信测试；V1 补 CRUD、Token、参数化、数据清理与异常诊断；V2 在重复出现后抽象 API / Config，补数据库、日志和报告。最小 CI 放在 V0 之后，不等待框架建完。

SQL 使用自己的隔离测试库和合成数据，练 SELECT、JOIN、事务、参数化查询与清理。UI 使用 Python pytest-playwright 完成 2–3 个关键业务流程，失败保留 Trace；不要把本学习网站的维护测试算作自己的项目。

性能、Redis、Docker 深入、Jenkins、AI / RAG 是后续选修；算法按目标岗位要求安排。每周根据实际耗时和验收结果调整任务，不承诺固定几周入职。

## 清单与旧进度

data/roadmap.json 中 beginnerPath 是入门任务顺序，原 stages / topic ID / progress 不变。项目规则以 data/projects.json 的 acceptance v2 为准：必做逐条计数、选择组达到最低数量计 1 项、加分不计分母。旧勾选保留，新增要求默认未完成，读取页面不会自动写回。

docs/PROGRESS.md 仅保留为旧版导入资料。后续学习状态只维护 GitHub 上的 data/progress.json 与 content/ 记录。不要重新运行迁移脚本来“同步进度”。

## 技术依据

- [pytest fixture：隔离与清理](https://docs.pytest.org/en/stable/how-to/fixtures.html)
- [GitHub Actions：构建和测试 Python](https://docs.github.com/en/actions/tutorials/build-and-test-code/python)
- [Playwright Python：pytest 插件入口](https://playwright.dev/python/docs/intro)
