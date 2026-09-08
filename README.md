# 测试开发 / 测试工程师学习路线（2026）

> 面向：准备校招/实习的测试工程师、测试开发（SDET）方向学习者。  
> 核心原则：**不从头重学 Python；以项目驱动，缺什么补什么。**  
> 目标：从测试基础、接口自动化、UI 自动化、性能测试一路走到 CI/CD 与 AI 应用测试，最终形成可展示的 GitHub 项目。

## 路线总览

```mermaid
flowchart TD
    A[计算机基础\n网络 / OS / 算法] --> B[Python 核心补齐]
    B --> C[工程基础\nLinux / Git / MySQL / Redis / Docker]
    C --> D[测试理论与用例设计]
    D --> E[接口测试\nrequests + pytest]
    E --> F[接口自动化框架项目]
    F --> G[Web UI 自动化\nPlaywright + pytest + POM]
    F --> H[性能测试\nJMeter]
    G --> I[CI/CD\nGitHub Actions / Jenkins]
    H --> I
    I --> J[AI 辅助测试]
    J --> K[AI 应用测试\nDify + RAG Evaluation]
    K --> L[简历 / 面试 / 投递]
```

## 学习优先级

如果时间有限，按下面优先级执行：

1. Python 核心能力（边做边补）
2. 测试理论与测试用例设计
3. HTTP / 网络基础
4. Linux + Git + MySQL
5. requests + pytest 接口自动化
6. 一个完整可运行的接口自动化项目
7. Playwright UI 自动化
8. Docker + CI/CD
9. JMeter 性能测试
10. Redis
11. AI 辅助测试 / LLM 应用评测
12. 算法按校招笔试需求持续穿插

> **不要把“看完课程”当完成标准。** 每一阶段必须有输出：代码、测试用例、报告、README、CI 运行记录或项目成果。

## 课程入口

完整课程、观看范围、跳过内容和验收标准见：

- [完整学习路线](docs/ROADMAP.md)
- [免费课程资源清单](docs/RESOURCES.md)
- [阶段验收与项目](docs/PROJECTS.md)
- [学习进度 Checklist](docs/PROGRESS.md)

## 推荐主技术栈

```text
Python 3.x
requests
pytest
Playwright
MySQL
Redis（基础）
Linux
Git / GitHub
Docker
JMeter
GitHub Actions
Allure
Dify
LangSmith Evaluation
```

### Selenium 怎么处理？

主学 **Playwright**。Selenium 保留到“能看懂旧项目、能回答常见面试题”的程度即可：

- WebDriver 基本原理
- XPath / CSS Selector
- 显式等待 / 隐式等待
- POM

第一轮不要再完整刷一套 Selenium 长课。

## Python 学习原则

这条路线假设你已经接触过 Python，不再从 `print()`、变量、`if/for` 开始。

只补测试开发高频知识：

```text
list / dict / set / tuple
函数与参数
class / self / __init__
异常处理
模块与包
文件操作
JSON / YAML
pip / venv
logging
requests
pytest
```

遇到下面这种代码能自己写，就可以结束“纯 Python”阶段：

```python
import requests

class UserApi:
    def __init__(self, base_url: str):
        self.base_url = base_url

    def login(self, username: str, password: str):
        payload = {"username": username, "password": password}
        response = requests.post(
            f"{self.base_url}/login",
            json=payload,
            timeout=5,
        )
        response.raise_for_status()
        return response.json()
```

然后直接进入 `requests + pytest`。

## 最终应产出的 GitHub 项目

至少完成以下三个：

### Project 1：API 自动化测试框架

```text
api-test-framework/
├── api/
├── tests/
├── data/
├── utils/
├── conftest.py
├── pytest.ini
├── requirements.txt
└── README.md
```

必须具备：

- 登录 / Token 管理
- CRUD 接口测试
- fixture
- 参数化
- JSON / YAML 数据驱动
- 数据库校验
- 日志
- Allure 报告
- GitHub Actions 自动执行

### Project 2：Web UI 自动化项目

技术栈：

```text
Playwright + pytest + POM
```

必须具备：

- 登录状态复用
- Locator
- 自动等待
- Page Object
- 参数化
- 截图 / Trace
- 失败日志
- CI 执行

### Project 3：AI 应用测试 / RAG Evaluation

技术栈：

```text
Dify + Python + pytest + LangSmith（或同类评测工具）
```

至少测试：

- RAG 检索召回
- 答案正确性 / 忠实度
- 无答案场景
- Prompt 注入 / 越权边界
- 数据集回归
- Agent 工具调用成功 / 失败场景

## 学习时间建议

不是硬性工期。如果每天能投入约 2～3 小时，可以参考：

| 阶段 | 建议时间 |
|---|---:|
| 计算机基础（选学） | 1～2 周，穿插进行 |
| Python 核心补齐 | 3～7 天 |
| Linux / Git / MySQL / Redis / Docker | 1～2 周 |
| 测试理论 | 2～4 天 |
| 接口测试 + pytest | 2～3 周 |
| UI 自动化 | 1～2 周 |
| 性能测试 | 3～7 天 |
| CI/CD | 2～4 天 |
| AI 辅助测试 / AI 应用测试 | 后期 1～2 周起步 |
| 算法 | 全程每天 1～2 题 |

## 参考路线

本仓库是在以下公开路线基础上做的**校招/求职导向裁剪**，不是原项目镜像：

- `zhoujinjian/ai-testing-guide`：https://github.com/zhoujinjian/ai-testing-guide

原项目文档采用 CC BY-NC-SA 4.0；本仓库不复制其正文，只引用路线思想与公开链接。若后续直接摘录原项目内容，请保留原作者署名并遵守其许可证。

## 使用方式

建议每学完一个知识点就更新 [PROGRESS.md](docs/PROGRESS.md)，并在 GitHub commit 中留下学习轨迹，例如：

```text
feat(api): add login API tests
feat(pytest): add fixtures and parametrization
feat(db): verify user status with MySQL
ci: run pytest on GitHub Actions
feat(ui): add Playwright login page object
perf: add JMeter login scenario
```

最终目标不是“收藏了多少课”，而是 GitHub 上能看到：

> **学习记录 + 测试代码 + 自动化框架 + CI + 测试报告 + 对问题的分析。**
