# 完整学习路线

## 初学者执行入口（课程 v2）

从 [实践主线](BEGINNER_PATH.md) 与 [首组练习](../projects/beginner-api-lab/README.md) 开始。下方十阶段保留为完整知识目录，编号表示分类，不是学习前置锁。不要先刷完计算机基础、Redis、Docker 才开始写测试。现有知识点 ID 与进度不变。

## Stage 0：岗位认知与路线确认

### 目标

明确测试工程师、自动化测试、测试开发（SDET）的区别，后续学习不陷入“工具堆砌”。

### 你需要理解

- 功能测试与自动化测试的边界
- 测开不是只写 Selenium 脚本
- 测试左移 / 右移
- 测试金字塔
- 单元 / 接口 / UI / 性能测试的定位
- 自动化如何进入 CI/CD
- 为什么测试代码也需要可维护性

### 验收

能用自己的话解释：

> 一个新功能从需求评审到上线，测试工程师会在哪些阶段介入？

---

# Stage 1：计算机基础（只学与测开高度相关的部分）

这一阶段不按 408 考研强度学习。

## 1.1 计算机网络

### 必学

- OSI / TCP-IP 分层概念
- IP 基础
- TCP / UDP
- 三次握手 / 四次挥手
- DNS
- HTTP / HTTPS
- GET / POST / PUT / DELETE
- 状态码
- Cookie / Session / Token
- 超时、重试、连接复用的基本概念

### 不需要第一轮深挖

- 复杂子网计算
- 路由算法推导
- 各类底层协议细节

### 验收问题

- GET 和 POST 区别？
- 401 / 403 / 404 / 500 分别意味着什么？
- Cookie、Session、Token 有什么区别？
- TCP 为什么要三次握手？
- 接口超时可能发生在哪几层？

## 1.2 操作系统

### 必学

- 进程与线程
- 进程通信
- 同步 / 互斥
- 死锁
- 内存 / 虚拟内存
- 文件系统
- I/O 基础

### 验收

能理解并初步排查：

```text
CPU 100%
内存持续上涨
线程阻塞
进程异常退出
磁盘空间不足
```

## 1.3 数据结构与算法

算法用于校招笔试和部分测开面试，不作为主线阻塞项。

### 第一轮

- 数组
- 链表
- 哈希表
- 栈 / 队列
- 二分查找
- 双指针
- 二叉树
- DFS / BFS
- 简单动态规划

### 建议

每个专题先做 2～4 道典型题；每天持续 1～2 题。

---

# Stage 2：Python 核心能力（边写边补）

## 原则

不重新刷完整 Python 入门课。

如果已经能写基本 `if / for / function`，直接从下面内容开始：

### 必须掌握

- `list / dict / set / tuple`
- 函数、位置参数、关键字参数、返回值
- `class / self / __init__`
- 基础封装 / 继承
- `try / except / finally`
- `import`、模块、包
- `open()` / `with open()`
- JSON
- YAML
- `pip`
- 虚拟环境
- `logging`

### 进入测试后自然学习

- `requests`
- `pytest`
- decorator（够理解 fixture / mark 的使用即可）
- generator（遇到 fixture yield 再补）
- context manager
- typing 基础

### 暂时不用深挖

- 元类
- 描述符
- CPython 源码
- 高级异步编程
- 复杂设计模式

## Python 阶段验收

写一个小程序：

1. 从 YAML / JSON 读取用户数据
2. 调用 REST API
3. 做异常处理
4. 输出结构化日志
5. 保存响应结果

代码量不重要，能独立完成即可。

---

# Stage 3：工程基础

## 3.1 Linux

### 必会命令

```bash
pwd
cd
ls
cat
less
tail -f
grep
find
ps
top
df
du
free
curl
ping
ss
chmod
```

必须能完成：

```bash
tail -f app.log | grep ERROR
```

并能用 `curl` 手动调用接口。

## 3.2 Git / GitHub

### 必学

- init / clone
- add / commit
- status / diff
- log
- branch
- merge
- conflict
- reset
- `.gitignore`
- remote / push / pull
- SSH
- PR 基础
- rebase：理解即可

### 验收

自己创建一个仓库，以 feature branch 开发并合并。

## 3.3 MySQL

### 必学 SQL

```sql
SELECT
WHERE
ORDER BY
GROUP BY
HAVING
COUNT
JOIN
INSERT
UPDATE
DELETE
```

同时了解：

- 子查询
- 索引基础
- 事务
- ACID
- 主键 / 唯一索引

### 测试场景

```text
接口调用
   ↓
读取 response
   ↓
查询数据库
   ↓
验证业务数据是否正确落库
```

## 3.4 Redis

第一轮只需要：

- String
- Hash
- List
- Set
- TTL / 过期
- 缓存概念
- 缓存穿透
- 缓存击穿
- 缓存雪崩
- 缓存一致性概念

## 3.5 Docker

### 必学

- Image / Container
- pull / run / exec / logs
- 端口映射
- Volume
- Network
- Dockerfile
- build
- 环境变量

### 验收

能用 Docker 启动一个 MySQL 或测试服务，并从本机连接。

---

# Stage 4：测试理论与测试设计

自动化之前必须具备测试设计能力。

## 必学

- 软件测试基本流程
- 测试计划
- 测试用例
- Bug 生命周期
- 严重程度 / 优先级
- 回归测试
- 冒烟测试
- Exploratory Testing 基础

## 黑盒用例设计

- 等价类
- 边界值
- 判定表
- 因果图
- 状态迁移
- 场景法
- 正交实验
- 错误推测

## 实战

选择“登录 / 注册 / 下单 / 支付”之一，输出：

- 正常场景
- 边界场景
- 异常场景
- 权限场景
- 网络异常
- 幂等 / 重复提交（适用时）

### 验收

不是背定义，而是能独立写一套结构合理的测试用例。

---

# Stage 5：接口测试与接口自动化（主线核心）

这是整个学习路线的最高优先级阶段之一。

## 5.1 HTTP 接口测试

### 必学

- REST API
- Request / Response
- Header
- Query 参数
- Path 参数
- JSON Body
- Form
- Cookie
- Token / Bearer Token
- 文件上传
- 状态码
- 超时
- 重试
- 接口依赖

### 工具

先会一种图形化接口工具即可：

- Postman 或 Apifox

## 5.2 requests

### 必须掌握

```python
requests.get()
requests.post()
requests.put()
requests.delete()
requests.Session()
response.status_code
response.json()
response.headers
response.raise_for_status()
```

## 5.3 pytest

### 核心

- 测试发现机制
- `assert`
- fixture
- `conftest.py`
- `@pytest.mark.parametrize`
- mark
- `pytest.ini`
- setup / teardown 思想
- fixture scope
- `yield`
- 插件机制概念

### 后续

- xdist 并行
- rerun
- Allure
- Mock

## 5.4 数据库校验

把 `pymysql` 接入测试项目：

```text
调用接口 → 查询数据库 → 断言 DB 数据
```

## 5.5 框架结构

最终不要把所有代码写在一个 `test_xxx.py`。

建议：

```text
api-test-framework/
├── api/
│   ├── auth_api.py
│   └── user_api.py
├── tests/
│   ├── test_login.py
│   └── test_user.py
├── data/
│   └── login.yaml
├── utils/
│   ├── logger.py
│   ├── db.py
│   └── config.py
├── config/
│   └── config.yaml
├── conftest.py
├── pytest.ini
├── requirements.txt
└── README.md
```

### 项目能力

- 登录 → 获取 Token
- API 关联
- CRUD
- fixture
- 参数化
- YAML / JSON 数据驱动
- DB 断言
- 日志
- Allure 报告
- 配置分离
- GitHub Actions

---

# Stage 6：Web UI 自动化

## 主线：Playwright + Python + pytest

### 必学

- 浏览器 / Page / Context
- Locator
- `get_by_role`
- `get_by_text`
- CSS / XPath（仍需理解）
- 自动等待
- 常用元素操作
- 弹窗 / iframe
- 上传下载
- 登录状态复用
- Screenshot
- Trace
- 多浏览器
- fixture
- POM

## POM 示例

```text
pages/
├── login_page.py
└── user_page.py

tests/
├── test_login.py
└── test_user.py
```

## Selenium

只补：

- WebDriver
- 元素定位
- 显式 / 隐式等待
- POM

第一轮不再刷完整 Selenium 长课。

---

# Stage 7：性能测试

## 第一工具：JMeter

### 必须理解的指标

- 并发用户数
- TPS / QPS
- Throughput
- 平均响应时间
- P95 / P99
- 错误率
- CPU
- 内存
- 网络
- 磁盘 I/O
- 数据库连接 / SQL

## 必学 JMeter 能力

- Thread Group
- HTTP Request
- 参数化
- 关联
- 断言
- CSV Data Set
- Listener
- 非 GUI 模式
- HTML Report

## 正确的性能测试流程

```text
定义性能目标
→ 构造场景
→ 准备数据
→ 执行压测
→ 监控服务
→ 定位瓶颈
→ 修改 / 优化
→ 再次压测
→ 对比数据
```

不要只贴一张 JMeter 图就结束。

---

# Stage 8：CI/CD 与质量工程化

## 第一阶段：GitHub Actions

先实现：

```text
git push
  ↓
GitHub Actions
  ↓
checkout
  ↓
setup-python
  ↓
pip install
  ↓
pytest
  ↓
上传测试结果 / 报告
```

### 必学概念

- workflow
- job
- step
- runner
- trigger
- artifact
- secret

## 第二阶段：Jenkins

看到岗位 JD 高频要求 Jenkins 时再补：

- Job
- Pipeline
- Jenkinsfile
- 参数化构建
- 定时执行
- 测试结果归档

---

# Stage 9：AI 辅助测试

这一阶段从 Stage 5 就可以开始使用，不必等全部传统技能学完。

## 实际使用场景

### 需求阶段

- 让 AI 从 PRD 提取测试点
- 识别遗漏的异常 / 边界场景

### 接口阶段

- 根据 OpenAPI / Swagger 生成 pytest 初稿
- 自动构造边界数据
- 辅助生成 Schema 校验

### Debug

输入：

- 堆栈
- 请求 / 响应
- 日志
- SQL
- CI 输出

让 AI 辅助分类：

```text
环境问题
测试数据问题
断言问题
接口问题
业务代码问题
依赖服务问题
```

### 原则

> AI 生成候选，人做验证与判断。

---

# Stage 10：AI 应用测试 / LLM Evaluation

这部分用于形成 2026 年之后测试开发的差异化能力。

## 10.1 搭一个被测 AI 应用

推荐用 Dify 快速构建：

- Chat App
- Workflow
- Knowledge Base
- RAG
- Tool / Agent

## 10.2 RAG 测试

关注：

- Retrieval Recall
- Context Relevance
- Answer Correctness
- Faithfulness
- 无答案处理
- 引用正确性
- Chunk / TopK / Rerank 参数变化

## 10.3 Agent 测试

- 工具是否选择正确
- 工具参数是否正确
- 工具异常时是否恢复
- 多步任务是否完成
- 越权调用
- Prompt Injection

## 10.4 Evaluation 工程化

最终目标：

```text
评测数据集
  ↓
自动调用 AI 应用
  ↓
Evaluator
  ↓
生成指标
  ↓
pytest / CI 回归
```

---

# Stage 11：校招 / 面试准备

在学习路线中同步准备，不要最后一周才开始。

## 测试基础

- 测试流程
- 用例设计
- Bug 生命周期
- 测试方法
- 接口测试
- 自动化测试价值与边界

## Python

- list / tuple
- dict
- 函数
- class
- 异常
- 深浅拷贝基础
- 装饰器基本概念

## 网络

- TCP
- HTTP / HTTPS
- DNS
- Cookie / Session / Token

## MySQL

- SQL
- JOIN
- 索引
- 事务

## Linux

- 日志排查
- 进程
- 端口
- CPU / 内存 / 磁盘

## 自动化

重点能解释自己项目为什么这么设计，而不是背框架名词。

## 算法

持续做简单 / 中等常见题，以校招笔试要求为准。
