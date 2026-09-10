# 首组练习：注册接口

这是合成注册服务和教学测试，不是生产注册系统，也不是学习者已完成的项目。没有密码、Token、数据库或对外部署。

## 运行（Windows PowerShell）

从仓库根目录运行：

~~~powershell
cd projects/beginner-api-lab
py -3.12 -m venv .venv
.\.venv\Scripts\python.exe -m pip install --index-url https://pypi.org/simple -r requirements.txt
.\.venv\Scripts\python.exe -m pytest -q
.\.venv\Scripts\python.exe selfcheck.py
~~~

Python 3.12 / 3.13 均可；用 py -0p 确认可用版本。Linux/macOS：python3 -m venv .venv，然后使用 .venv/bin/python。无需单独启动服务。venv 与缓存仅用于执行；不存正式业务数据。

pytest 正常运行应全部通过。selfcheck 会先跑正常实现，再注入三种明确的教学故障；中间出现失败断言是预期现象，只有三种错误都被测试检出，它才返回 0。不得用跳过或宽松断言修成“假绿”。

## HTTP 契约 v1

所有请求由 function-scope fixture 创建的独立实例处理，地址是 127.0.0.1 的随机端口。没有共享用户池、文件保存、远端 API 和 reset 接口。关闭实例即丢弃数据。不要把这个简化服务部署到公网或作为性能基准。

| 请求 | 输入 / 条件 | 预期 |
|---|---|---|
| POST /users | JSON 对象，且只有 username、age | 成功返回 201 和 id / username / age |
| username | ASCII 字母、数字、下划线，长度 3–20，大小写敏感 | 不符合时 400，invalid_username |
| age | 整数 18–120，含两端；拒绝布尔值、字符串、小数、null | 不符合时 400，invalid_age |
| 重复 username | 当前实例中已有同名用户 | 409，username_taken；保留原用户，不增加记录 |
| 错误字段结构 | 缺字段、多余字段、非对象 JSON | 400，invalid_fields |
| 错误 JSON | 无法解析 | 400，invalid_json |
| 错误 Content-Type | 非 application/json | 415，json_required |
| 请求体大小 | Content-Length 为 1–4096 字节 | 超限或无有效长度时 400，invalid_body |
| GET /users | 当前实例 | 200，包含 users 数组；初始为空 |
| 其他路径 | GET / POST | 404，not_found |

错误响应结构是 {"error": "错误码"}。校验顺序：路径 → Content-Type → 请求体 → 字段结构 → username → age → 重复。任何失败注册都不能增加用户。id 从每个实例的 1 开始。

## 目录

- lab_server.py：被测教学系统，维护者负责契约；先读契约，不必先学习 HTTPServer 实现。
- tests/conftest.py：每条测试独立服务、Session 清理、禁用本机请求的环境代理。
- tests/test_examples.py：4 个已完成示范，供对照；不算你的作业。
- tests/test_lab_contract.py：维护者回归测试，保证服务可用；不要复制充数。
- selfcheck.py：检验某个测试文件是否能发现年龄边界、重复注册和成功状态码错误。
- [DIAGNOSTIC.md](DIAGNOSTIC.md)：先测基础。
- [EXERCISES.md](EXERCISES.md)：你需要独立提交的练习。

最小 CI 见仓库 .github/workflows/python-lab.yml。JUnit 输出只有合成测试数据，位于忽略目录 test-results/；学习证据需你主动提交摘要与 commit / CI 链接。

## 故障定位

- No module named pytest：确认使用的是 .venv 中的解释器，并执行依赖安装。
- ConnectionError：确认使用 base_url fixture 的地址，没有写死端口。关闭实例后不能继续请求。
- AssertionError：比较契约的状态码、响应体、状态变化，先复现单条用例；不要扩大 timeout 或加重试。

参考：[pytest fixture 与清理](https://docs.pytest.org/en/stable/how-to/fixtures.html)、[GitHub Actions Python 测试](https://docs.github.com/en/actions/tutorials/build-and-test-code/python)。
