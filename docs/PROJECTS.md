# 阶段验收与项目

学习路线以“能做出来”为完成标准。

---

# Project 0：测试用例设计

## 被测对象

任选一个：

- 登录
- 注册
- 商品搜索
- 购物车
- 下单

## 输出

创建：

```text
projects/manual-testing/
├── test-cases.md
└── bug-report-example.md
```

### test-cases.md 至少覆盖

- 正常流程
- 等价类
- 边界值
- 异常输入
- 状态变化
- 权限
- 重复操作
- 网络异常

### 验收

能解释为什么设计这些测试，而不是只有用例数量。

---

# Project 1：API 自动化测试框架（核心）

## 推荐目录

```text
projects/api-test-framework/
├── api/
│   ├── auth_api.py
│   ├── user_api.py
│   └── order_api.py
├── tests/
│   ├── test_auth.py
│   ├── test_user.py
│   └── test_order.py
├── data/
│   ├── auth.yaml
│   └── user.yaml
├── utils/
│   ├── config.py
│   ├── db.py
│   └── logger.py
├── config/
│   └── config.example.yaml
├── conftest.py
├── pytest.ini
├── requirements.txt
└── README.md
```

## 必做功能

- [ ] GET 请求
- [ ] POST 请求
- [ ] PUT / PATCH
- [ ] DELETE
- [ ] 登录获取 Token
- [ ] Token 自动注入
- [ ] fixture
- [ ] fixture scope
- [ ] 参数化
- [ ] YAML / JSON 数据驱动
- [ ] API 链路依赖
- [ ] MySQL 校验
- [ ] 异常处理
- [ ] logging
- [ ] Allure 报告
- [ ] GitHub Actions

## 加分

- [ ] JSON Schema
- [ ] Mock
- [ ] 并行执行
- [ ] retry 策略
- [ ] Docker 化

## README 必须解释

- 为什么这样分层
- 如何安装
- 如何运行
- 如何配置环境
- 测试数据怎么管理
- CI 怎么执行
- 一次失败案例怎么排查

---

# Project 2：Playwright Web 自动化

## 推荐目录

```text
projects/web-ui-test/
├── pages/
│   ├── login_page.py
│   └── home_page.py
├── tests/
│   ├── test_login.py
│   └── test_search.py
├── data/
├── conftest.py
├── pytest.ini
└── README.md
```

## 必做

- [ ] Playwright 安装
- [ ] Locator
- [ ] Role / Text 定位
- [ ] 登录测试
- [ ] fixture
- [ ] 登录状态复用
- [ ] POM
- [ ] 参数化
- [ ] Screenshot
- [ ] Trace
- [ ] 失败自动截图
- [ ] CI 执行

## 验收

不能只是“录制生成脚本”；要能够自己写 Page Object 和测试逻辑。

---

# Project 3：性能测试

## 被测对象

优先复用前面的 API 服务。

## 场景

至少 2 个：

- 登录接口
- 查询接口
- 创建订单 / 创建资源

## 输出

```text
projects/performance-test/
├── jmeter/
│   └── test-plan.jmx
├── report/
├── test-plan.md
└── result-analysis.md
```

## result-analysis.md 包含

- 压测环境
- 并发数
- 持续时间
- 数据量
- 平均响应时间
- P95 / P99
- TPS / QPS
- Error Rate
- CPU / 内存
- 观察到的瓶颈
- 下一步优化建议

---

# Project 4：CI/CD

把 Project 1 或 Project 2 接入 GitHub Actions。

## 最低要求

`.github/workflows/test.yml`

逻辑：

```text
push / pull_request
→ checkout
→ setup Python
→ install requirements
→ run pytest
→ upload artifact
```

## 加分

- 缓存 pip
- matrix 多 Python 版本
- 定时回归
- 测试失败通知

---

# Project 5：AI / RAG Evaluation

## 被测系统

用 Dify 构建一个小型知识库，例如：

- 学校规章问答
- 软件测试知识库
- 某开源项目文档助手

## 构建评测集

```text
question
expected_answer
expected_source
category
```

场景至少包括：

- 正确答案
- 文档中不存在答案
- 相似问题
- 歧义问题
- 错误前提
- Prompt Injection

## 自动化

Python 调用被测 AI API，记录：

- 返回文本
- 引用
- 延迟
- token（能获取时）

使用 Evaluator 评估：

- Correctness
- Faithfulness
- Retrieval Relevance
- Format / Policy

最终接入 pytest 或 CI 做回归。
