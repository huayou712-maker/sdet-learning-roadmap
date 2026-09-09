# 第一组独立练习

先运行维护者示范确认环境正常。随后仅根据 README 契约完成自己的测试，不复制维护者契约测试作为作业。测试数量是最低覆盖提醒，最终按断言是否准确、能否检出故障验收。

## E1：先写测试设计（Project 0）

在 projects/manual-testing/test-cases.md 写注册用例表：编号、前置、输入、步骤、预期状态码 / 响应 / 数据变化、设计方法。至少覆盖：

1. 合法注册与随后查询。
2. 年龄 17 / 18 / 120 / 121，说明为什么选这四点。
3. 用户名长度 2 / 3 / 20 / 21。
4. 缺少 age、错误 JSON、错误 Content-Type。
5. 重复注册，验证原记录没有被覆盖或增加。
6. 无效请求后 users 仍为空。

再写 bug-report-example.md，选一个教学故障，记录环境、最小复现、实际 / 预期和修复验收方法。标明“合成练习故障”，不要伪装真实线上事故。

## E2：独立写 API 测试（Project 1 的 V0）

新建 tests/test_registration_practice.py。可以复用 api 与 base_url fixtures，但测试逻辑自己写。每次请求显式传 timeout=2。使用参数化表达边界矩阵。

从三个方面断言：状态码、关键响应字段、后续 GET 的数据状态。只断言 response.ok 或测试“不报异常”不合格。用例之间不能依赖顺序，不硬编码端口。

~~~powershell
.\.venv\Scripts\python.exe -m pytest tests/test_registration_practice.py -q
.\.venv\Scripts\python.exe -m pytest tests/test_registration_practice.py -q
.\.venv\Scripts\python.exe selfcheck.py tests/test_registration_practice.py
~~~

再选择一条测试单独运行。连续执行与单独执行都应该通过。

## E3：证明断言能发现问题

selfcheck 依次注入：错误接受 17 岁、错误允许重复注册、错误返回 200。你的独立测试文件应在正常实现通过，且分别在三个错误实现上触发断言失败；基础环境错误、collection error、skip 不计检出。

如果某种错误没有被发现，先解释缺了什么断言再补充。不要修改被测服务契约或使用 skip / xfail。故障模式仅存在于这个隔离教学服务中，不进入学习网站业务逻辑。

## E4：尽早跑 CI（Project 4）

将自己的练习和复盘提交到 GitHub 分支并通过 PR 运行现有 Python beginner lab。刻意制造一次断言错误，确认 CI 失败且 JUnit 报告可下载，再提交修复。保留两个运行链接；不要为了全绿删除测试。

## 提交证据

提交自己的用例、测试、README 运行步骤、三种故障检出摘要、一次失败复盘与 CI 链接。学习系统中为 Project 0 / Project 1 新建作业迭代，关联对应知识点与 commit。不要提交 .venv、缓存、JUnit 原始目录或真实个人信息。

全组验收：能从干净环境复现，能解释每组边界和断言，能说明测试数据怎样隔离。不得把提供的 4 个示范测试声称为自己独立完成。
