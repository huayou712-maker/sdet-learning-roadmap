# 免费课程资源清单

> 说明：课程链接均为公开免费入口（部分平台可能要求登录）。课程内容和免费状态可能随平台调整。  
> 观看原则：**只看路线需要的章节，不追求“整套刷完”。**

---

# 0. 总路线参考

## AI 测试开发学习路线（2026）

- GitHub：https://github.com/zhoujinjian/ai-testing-guide
- 用途：整体框架参考
- 使用方法：我们不照搬全部内容，只按求职优先级裁剪

---

# 1. 计算机网络

## 湖科大教书匠《计算机网络微课堂》

- B站：https://www.bilibili.com/video/BV1c4411d7jb/
- 73 节

### 重点看

- 网络体系结构
- IP 基础
- TCP / UDP
- TCP 三次握手 / 四次挥手
- DNS
- HTTP 相关内容

### 不需要第一轮全部看

目标是服务接口测试与故障排查，不是备考 408。

---

# 2. 操作系统

## 王道《操作系统》公开课

- B站：https://www.bilibili.com/video/BV1YE411D7nH/

### 重点看

- 进程
- 线程
- 同步与互斥
- 死锁
- 内存管理
- 虚拟内存
- 文件系统
- I/O

### 跳过策略

考研习题、复杂推导第一轮不看。

---

# 3. 数据结构与算法

## 《代码随想录》算法公开课

可从该公开课合集中的任意视频进入合集：

- B站示例入口（贪心理论基础）：https://www.bilibili.com/video/BV1WK4y1R71x/
- 刷题网站：https://programmercarl.com/
- GitHub：https://github.com/youngyangyang04/leetcode-master

### 第一轮专题

- 数组
- 链表
- 哈希表
- 栈 / 队列
- 二分
- 双指针
- 二叉树
- DFS / BFS
- 简单动态规划

### 学法

每专题 2～4 道典型题；不完整刷 170 个视频。

---

# 4. Python（不是从零开始）

## 主课：黑马程序员 Python 自动测试教程

- B站：https://www.bilibili.com/video/BV1av411q7dT/
- 课程包含：Python 基础、数据序列、函数、面向对象、异常、文件操作、UnitTest

### 你只看

- 数据序列：list / tuple / dict / set
- 函数
- 面向对象
- `class / self / __init__`
- 异常处理
- 文件操作
- 模块 / 包

### 你跳过

- 已经会的 `print / 变量 / if / for`
- UnitTest 深入部分

后续统一转向 pytest。

## pytest 主课：Test Automation University

### Introduction to pytest

- https://testautomationu.applitools.com/pytest-tutorial/index.html
- 免费、英文、自定进度
- 约 1.5 小时

### 核心章节

- 参数化
- fixture
- config
- plugins
- requests API test
- Playwright UI test

如果英语影响效率，可直接以中文接口自动化课程为主，TAU 当补充。

---

# 5. Linux / Shell / Git

## GeekHour 免费教程合集

### Git

- B站：https://www.bilibili.com/video/BV1HM411377j/

同一合集里还有：

- 30 分钟 Linux
- 30 分钟 Shell
- 30 分钟正则表达式

### Git 重点

- init / clone
- add / commit
- diff
- reset
- `.gitignore`
- SSH
- branch
- merge
- conflict
- rebase 基础
- GitHub 工作流

---

# 6. MySQL

## 尚硅谷《5 天上手 MySQL》

- B站：https://www.bilibili.com/video/BV1Cm421373b/
- 约 17 小时 / 106 节

### 只看核心

- CRUD
- WHERE
- ORDER BY
- GROUP BY
- HAVING
- 聚合函数
- JOIN
- 子查询
- 事务基础
- 索引基础

### 可替换：更偏测试岗位

黑马《软件测试工程师所需 MySQL》

- B站：https://www.bilibili.com/video/BV1M541147Cn/

如果你只想服务测试岗位，后者更贴近数据库校验。

---

# 7. Redis

## 一小时 Redis 快速入门

- B站：https://www.bilibili.com/video/BV1NuHpeQEyG/

### 第一轮只看

- String
- List
- Hash
- Set
- 过期
- 缓存
- 缓存穿透 / 击穿 / 雪崩
- 缓存一致性

### 第一轮可跳

- 主从
- 哨兵
- 集群
- 高级结构

除非岗位 JD 明确要求。

---

# 8. Docker

## 尚硅谷 2024 Docker 与微服务实战

- B站：https://www.bilibili.com/video/BV1Zn4y1X7AZ/

### 重点

- Image / Container
- Docker 常用命令
- 端口映射
- Volume
- Network
- Dockerfile
- build / run

### 目标

能容器化或启动你的测试依赖（MySQL / 被测服务 / 测试环境）。

---

# 9. 测试理论与黑盒测试设计

## 黑马《黑盒测试用例设计方法》

- B站：https://www.bilibili.com/video/BV1YT4y137WA/
- 25 节

### 建议完整看

内容包括：

- 测试用例基础
- 等价类
- 边界值
- 判定表
- 因果图
- 状态迁移
- 场景法
- 正交实验
- 错误推测

这是少数建议完整看完的课程之一。

---

# 10. 接口自动化（最核心）

## 中文主课：2026 Pytest + Requests 接口自动化

- B站：https://www.bilibili.com/video/BV11yJG68E6C/
- 53 节

### 已覆盖

- requests
- HTTP 请求
- 参数
- Response
- 登录实战
- pymysql
- pytest
- 断言
- 前后置
- 配置

### 学习方式

从 requests 章节直接开始。Python 不熟的点，回前面的 Python 课程按需补。

## 英文补充：TAU API Testing in Python

- https://testautomationu.applitools.com/python-api-testing/
- 免费、英文

### 覆盖

- requests
- JSON / XML
- assertions
- Schema Validation
- framework structure
- report
- parallel testing

适合第二遍理解“框架为什么这样设计”。

---

# 11. Web UI 自动化

## Playwright 自动化测试：基础到实战

- B站：https://www.bilibili.com/video/BV13bUrBsEac/

### 重点看

- 为什么用 Playwright
- Playwright 快速上手
- API
- 元素定位
- Web 自动化实战
- POM
- pytest
- pytest 高级用法
- 数据驱动

### Selenium

不单独刷长课。只补：WebDriver、元素定位、等待、POM。

---

# 12. 性能测试

## 黑马《3 天带你入门 JMeter 性能测试》

- B站：https://www.bilibili.com/video/BV12W4y197qU/

### 必学

- 性能测试流程
- 并发
- JMeter 场景
- 参数化 / 关联
- 断言
- 响应时间
- TPS / QPS
- 吞吐量
- 错误率
- 服务端监控

学习完成后必须自己做一次压测并写分析结论。

---

# 13. CI/CD

## GitHub Actions 官方 Quickstart（文字，作为权威补充）

- https://docs.github.com/en/actions/get-started/quickstart

## 视频主课：Test Automation University — GitHub Actions for Testing

- https://testautomationu.applitools.com/github-actions-for-testing/
- 免费、英文

### 重点

- workflow
- job
- step
- trigger
- CI 中运行测试
- artifact

### 实战目标

把接口自动化仓库改成：

```text
push / PR
↓
GitHub Actions
↓
pip install
↓
pytest
↓
上传报告
```

Jenkins 等看到目标岗位 JD 后再补。

---

# 14. AI 辅助测试

这部分不用先刷大课。

建议直接在自己的测试项目里使用 AI 完成：

- 从需求生成测试点候选
- 从 OpenAPI 生成 pytest 初稿
- 生成边界数据
- 解释 CI 报错
- 分析日志
- Review 自动化测试代码

原则：AI 产出必须人工验证。

---

# 15. Dify / AI 应用测试

## 2026 Dify 入门课

- B站：https://www.bilibili.com/video/BV1YhdwBKEUs/

课程包含：

- 环境安装 / 本地部署
- AI 应用创建
- 工具箱
- Workflow
- 知识库
- 发布应用

### 只需要学到

能搭一个 RAG 知识库应用即可，然后把重点转向测试，而不是继续研究大量 AI 应用开发。

---

# 16. LangSmith Evaluation / RAG Evaluation

## LangSmith Evaluations 系列

可从系列任意视频进入合集，例如：

- 执行评测：https://www.bilibili.com/video/BV12f421X7j1/
- 为什么做评测：https://www.bilibili.com/video/BV1Nm421K7Uq/

### 建议看

- 为什么评测
- 构建数据集
- 执行评测
- 内置 Evaluator
- RAG Evaluation
- 自定义 Evaluator
- pytest / CI 集成

这部分的目标是建立一个可重复执行的 LLM 回归评测项目。
