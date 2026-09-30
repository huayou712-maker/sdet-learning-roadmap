# MiniMall 测试开发课程学习路线

点击“本页观看安排”查看学习顺序；点击章节名称查看该章的原始视频名称及完整网盘目录。

未标明其他来源的章节均来自霍格沃兹 Python 测试开发进阶线上班 28 期。视频编号对应文件名开头的数字，例如第 38 章的 `5—9` 表示 `5_面向对象概念` 至 `9_实例方法`；华测 F、P、A、B、C 编号对应其补充清单中的学习索引。

## 15 阶段执行顺序

| 阶段 | 学习内容 | 课程章节 | 本页观看安排 |
|---|---|---|---|
| 1 | Python | 37、38、39 | [视频编号与内容](#阶段-1python) |
| 2 | Git | 34、35、36 | [视频编号与内容](#阶段-2git) |
| 3 | Linux 与 Bash | 30、31、32、33 | [视频编号与内容](#阶段-3linux-与-bash) |
| 4 | SQL | 27、28 | [视频编号与内容](#阶段-4sql) |
| 5 | Flask API | 51、52、53 | [视频编号与内容](#阶段-5flask-api) |
| 6 | 用例设计与 Pytest | 17、18、42—46 | [视频编号与内容](#阶段-6用例设计与-pytest) |
| 7 | Allure | 47、48、49 | [视频编号与内容](#阶段-7allure) |
| 8 | 接口自动化 | 华测 F／P、R1—R3；原 82、89 | [视频编号与内容](#阶段-8接口自动化) |
| 9 | 后端工程整理 | 54、56 | [视频编号与内容](#阶段-9后端工程整理) |
| 10 | Vue 页面 | 57、58、59、61 | [视频编号与内容](#阶段-10vue-页面) |
| 11 | Web 自动化 | 63—68 | [视频编号与内容](#阶段-11web-自动化) |
| 12 | Docker | 网页 D1／D2；原 102、98—100 | [视频编号与内容](#阶段-12docker) |
| 13 | Jenkins／CI | 104—110 | [视频编号与内容](#阶段-13jenkinsci) |
| 14 | 性能与监控 | 华测 A／B／C、R3、96；网页 M1 | [视频编号与内容](#阶段-14性能与监控) |
| 15 | 项目展示与流程 | 19、20、14、21 | [视频编号与内容](#阶段-15项目展示与流程) |

## 各阶段观看安排

表内按行排列学习顺序，视频编号按列出的顺序查找。原清单中的 P0、P1、P2、P3 优先级保持不变；能够独立完成对应练习时，可以按掌握情况选择观看。

### 阶段 1：Python

| 课程章节 | 观看视频编号 | 对应内容 |
|---|---|---|
| [第 37 章：Python 语法与数据结构](course-index.md#第-37-章python-语法与数据结构) | 5、8—10 | 第一个 Python 程序、输入输出、函数定义与调用、标识符。 |
| [第 37 章：Python 语法与数据结构](course-index.md#第-37-章python-语法与数据结构) | 12—22 | 变量、数据类型、数字、布尔、类型转换及常用运算符。 |
| [第 37 章：Python 语法与数据结构](course-index.md#第-37-章python-语法与数据结构) | 26—28、30—31、33—34 | 字符串、列表、字典及对应操作。 |
| [第 37 章：Python 语法与数据结构](course-index.md#第-37-章python-语法与数据结构) | 38、40—41、44、46—47 | if、while、for、循环跳转、函数参数与返回值、变量作用域。 |
| [第 38 章：Python 面向对象编程](course-index.md#第-38-章python-面向对象编程) | 5—9、13、17 | 面向对象概念、类与对象、实例属性、构造方法、实例方法、封装、类型注解。 |
| [第 38 章：Python 面向对象编程](course-index.md#第-38-章python-面向对象编程) | 2—4 | 文件操作、错误分析与调试、异常处理。 |
| [第 39 章：Python 常用模块](course-index.md#第-39-章python-常用模块) | 11—12 | 虚拟环境管理、pip 工具使用。 |
| [第 39 章：Python 常用模块](course-index.md#第-39-章python-常用模块) | 1—2、6—7、9—10 | 模块与包、os、datetime、JSON、日志模块。 |

练习：实现商品和购物车管理，建立 Product、User、Cart、Order；使用 JSON 保存及重新读取数据。库存为 10 时验证数量 1、10、11、0、-1，非法输入不得改变库存。

### 阶段 2：Git

| 课程章节 | 观看视频编号 | 对应内容 |
|---|---|---|
| [第 34 章：Git 环境与命令](course-index.md#第-34-章git-环境与命令) | 1—3 | 环境配置、工作流程、常用命令。 |
| [第 35 章：Git 远程仓库](course-index.md#第-35-章git-远程仓库) | 2 | Github 实战。 |
| [第 36 章：Git 分支](course-index.md#第-36-章git-分支) | 1—3 | Git log 分析、分支管理策略、合并与冲突。 |

练习：在自己的练习仓库创建功能分支，提交商品管理代码，阅读 diff，处理练习冲突并同步 GitHub。

### 阶段 3：Linux 与 Bash

| 课程章节 | 观看视频编号 | 对应内容 |
|---|---|---|
| [第 30 章：Linux 文件](course-index.md#第-30-章linux-文件) | 1—2 | Linux 与 Shell 环境、文件处理命令。 |
| [第 31 章：Linux 性能与统计](course-index.md#第-31-章linux-性能与统计) | 1—3 | 性能统计、常用统计命令、进程与线程。 |
| [第 32 章：Linux 日志处理](course-index.md#第-32-章linux-日志处理) | 1—2、4—6 | grep、awk、管道、Nginx 日志分析、性能与网络统计。 |
| [第 33 章：Bash](course-index.md#第-33-章bash) | 1—2 | Bash 编程语法、脚本编写。 |

练习：查找项目文件、进程、端口和错误日志，统计接口访问量；编写运行测试的脚本，测试失败时返回失败状态。

### 阶段 4：SQL

| 课程章节 | 观看视频编号 | 对应内容 |
|---|---|---|
| [第 27 章：SQL 基础](course-index.md#第-27-章sql-基础) | 1—7、10—13 | 数据库、MySQL、客户端、SQL、数据库及表的创建与查看。 |
| [第 27 章：SQL 基础](course-index.md#第-27-章sql-基础) | 15—27 | 数据增删改、条件查询、排序、聚合、分组、limit、主键与字段约束。 |
| [第 28 章：SQL 多表](course-index.md#第-28-章sql-多表) | 1—8 | 外键、多表关系、内外连接、子查询与练习。 |

练习：建立 users、products、orders、order_items、cart_items；完成用户订单查询、分页查询及库存核验。

### 阶段 5：Flask API

| 课程章节 | 观看视频编号 | 对应内容 |
|---|---|---|
| [第 51 章：Flask API](course-index.md#第-51-章flask-api) | 1—5 | Flask 环境、接口路由、请求方法、请求数据、响应信息。 |
| [第 52 章：Flask 路由组织](course-index.md#第-52-章flask-路由组织) | 1、5 | 蓝图与视图、路由与跨域。 |
| [第 53 章：ORM](course-index.md#第-53-章orm) | 1—8 | ORM 配置、表与数据模型、CRUD、一对多、多对多、后端项目练习。 |

练习：实现注册、登录、商品、购物车和订单接口，连接真实数据库，核验错误输入。订单创建与库存更新保持事务一致；视频标题未单列事务内容，该知识点需单独核验。

### 阶段 6：用例设计与 Pytest

| 课程章节 | 观看视频编号 | 对应内容 |
|---|---|---|
| [第 17 章：测试用例设计](course-index.md#第-17-章测试用例设计) | 1—7 | 用例价值、等价类、边界值、判定表、场景法、用例基础、设计与评审。 |
| [第 18 章：补充测试方法](course-index.md#第-18-章补充测试方法) | 4 | 白盒测试方法论。 |
| [第 42 章：Pytest 用例](course-index.md#第-42-章pytest-用例) | 1—2、4—6 | 安装、命名、用例结构、断言、框架结构。 |
| [第 43 章：Pytest 参数化](course-index.md#第-43-章pytest-参数化) | 1—2、4—6、8 | 参数化、标记、运行、调度、命令行参数、异常处理。 |
| [第 44 章：Pytest 生命周期](course-index.md#第-44-章pytest-生命周期) | 4—10 | JSON 数据驱动、生命周期、自动注册与生效、fixture 参数化。 |
| [第 45 章：Pytest 配置与插件](course-index.md#第-45-章pytest-配置与插件) | 1—2 | 配置文件、插件。 |
| [第 46 章：Pytest 综合训练](course-index.md#第-46-章pytest-综合训练) | 1 | 单元与自动化测试框架直播训练。 |

练习：为库存和购物车编写正常、边界、异常测试，使用 fixture 隔离数据，同时断言返回结果与数据库状态。

### 阶段 7：Allure

| 课程章节 | 观看视频编号 | 对应内容 |
|---|---|---|
| [第 47 章：Allure 安装与运行](course-index.md#第-47-章allure-安装与运行) | 1—2 | Allure2 安装、运行方式。 |
| [第 48 章：Allure 业务描述](course-index.md#第-48-章allure-业务描述) | 1—3、5—7 | 报告生成、用例标题、步骤、分类、描述、优先级。 |
| [第 49 章：Allure 附件](course-index.md#第-49-章allure-附件) | 1—2 | 添加图片与日志附件。 |

练习：生成按登录、商品、购物车和订单分类的报告，保留失败断言和必要日志，附件隐藏密码、Token 与个人信息。

### 阶段 8：接口自动化

| 课程章节与来源 | 观看视频编号 | 对应内容 |
|---|---|---|
| [华测 F 组：HTTP 与 Fiddler](huace-supplement.md#fhttp-与-fiddler3-个视频) | F2 → F1 → F3 | HTTP 协议、Fiddler 安装、请求分析与过滤。 |
| [华测 P 组：Postman](huace-supplement.md#ppostman6-个视频) | P1—P6 | 安装与使用、集合、接口关联、断言、参数化、数据驱动。 |
| [R1：Requests＋Pytest](resource-locations.md#r1requestspytest-网盘课程) | 3—6、15—21、28—29、32—34、40—50、52—56 | Python 请求、上传、用例、请求封装、fixture、Token 关联、数据库、日志与报告。 |
| [R2：Python 主流测试框架](resource-locations.md#r2python-主流测试框架网盘课程) | 5-3—5-5、5-7；6-4—6-8；7-5—7-8 | YAML、请求参数、断言、fixture、conftest、参数化及数据准备。 |
| [R3：Cookie 与 Session](resource-locations.md#cookie-与-session) | 阶段 5／第 8 章／10—16 | Cookie、Session、登录会话、响应内容读取。 |
| [R3：JSON Schema](resource-locations.md#json-schema) | 阶段 5／第 12 章／12-2、12-3、12-4 | 整体字段校验、嵌套属性、必需字段、综合案例。 |
| [第 82 章：接口功能测试综合训练](course-index.md#第-82-章接口功能测试综合训练) | 4 | 接口功能测试直播训练营，2023-06-04。 |
| [第 89 章：接口自动化综合训练](course-index.md#第-89-章接口自动化综合训练) | 2、1、3 | 接口自动化项目练习、作业讲解、Python 综合训练。 |

练习：完成登录 → 查询商品 → 加入购物车 → 创建订单 → 数据库核验。验证无 Token、错误或过期 Token、越权、会话隔离与环境配置；专项课程覆盖状态见 [补充安排](linuxdo-supplement.md)。

### 阶段 9：后端工程整理

| 课程章节 | 观看视频编号 | 对应内容 |
|---|---|---|
| [第 54 章：后端工程组织](course-index.md#第-54-章后端工程组织) | 1 | 后端开发架构设计。 |
| [第 56 章：后端综合训练](course-index.md#第-56-章后端综合训练) | 2、1 | 后端开发 1、后端开发 2 直播训练营。 |

练习：明确路由、业务处理、数据库访问与配置的位置，重复执行接口测试确认行为一致。第 54 章视频 1 显示约 251 KB，内容完整性待确认。

### 阶段 10：Vue 页面

| 课程章节 | 观看视频编号 | 对应内容 |
|---|---|---|
| [第 57 章：Vue 基础](course-index.md#第-57-章vue-基础) | 1—10 | 基本介绍、语法、模板、属性与事件绑定、双向绑定、渲染、计算属性、生命周期。 |
| [第 58 章：Vue 项目与路由](course-index.md#第-58-章vue-项目与路由) | 1—4、7—12 | 项目构建、组件、数据传递、路由、动态与嵌套路由、导航、守卫。 |
| [第 59 章：Element Plus 与 API 请求](course-index.md#第-59-章element-plus-与-api-请求) | 1—8 | Element Plus 组件、axios 访问 API、网络请求封装。 |
| [第 61 章：前端项目练习](course-index.md#第-61-章前端项目练习) | 1 | 课程管理平台前端开发练习。 |

练习：为 MiniMall 建立登录、商品、购物车、订单与管理员页面，调用真实 API，权限同时由后端检查。第 59 章视频 4、6、8 与第 61 章视频 1 的内容完整性待确认。

### 阶段 11：Web 自动化

| 课程章节 | 观看视频编号 | 对应内容 |
|---|---|---|
| [第 63 章：Web 自动化基础](course-index.md#第-63-章web-自动化基础) | 1—6、8—10 | 测试体系、环境、录制、用例结构、浏览器控制、定位、交互与项目练习。 |
| [第 64 章：定位与等待](course-index.md#第-64-章定位与等待) | 1—5、7—8 | CSS、XPath、显式等待、frame、多窗口、控件交互、数据记录与电商练习。 |
| [第 65 章：Page Object](course-index.md#第-65-章page-object) | 3—6 | Page Object、异常截图、用例流程与电商进阶练习。 |
| [第 66 章：多浏览器](course-index.md#第-66-章多浏览器) | 1、3 | Selenium 多浏览器、headless 模式。 |
| [第 67 章：Playwright 与 Cypress](course-index.md#第-67-章playwright-与-cypress) | 2 | Playwright 测试框架介绍。 |
| [第 68 章：Web 自动化综合训练](course-index.md#第-68-章web-自动化综合训练) | 1 | 用户端 Web 自动化直播训练营。 |

练习：自动执行登录、搜索、购物车、下单和订单查询，使用独立测试数据与有效断言。第 63—66 章包含 Selenium 内容，第 67 章视频 2 为 Playwright 介绍；具体 API 实现需要核验对应文档。

### 阶段 12：Docker

| 课程章节与来源 | 观看视频编号或阅读位置 | 对应内容 |
|---|---|---|
| [D1：GeekHour Docker 在线视频](https://www.bilibili.com/video/BV14s4y1i7Vf) | 分段 02—09 | 容器、安装、Dockerfile、容器实践、Docker Desktop 与 Compose。 |
| [D2：Docker Compose 文字教程](https://linux.do/t/topic/877671) | 配置文件、示例与常用命令 | 服务连接、环境变量、健康检查、数据持久化。 |
| [第 102 章：Docker 综合训练](course-index.md#第-102-章docker-综合训练) | 1 | Docker 容器技术直播训练营，2024-03-10。 |
| [第 98 章：Docker 原理与 Compose](course-index.md#第-98-章docker-原理与-compose) | 1—3、5 | Docker 与虚拟机、使用场景、容器网络、Compose 练习。 |
| [第 99 章：Docker 镜像制作](course-index.md#第-99-章docker-镜像制作) | 1—3 | 镜像简介、制作命令、镜像制作练习。 |
| [第 100 章：Docker 镜像设计](course-index.md#第-100-章docker-镜像设计) | 4、6 | 镜像分层、镜像设计练习。 |

练习：编写 Dockerfile 与 Compose 配置，启动 Flask 和 MySQL，验证服务连接、健康状态及数据持久化。网页和安装命令的核查说明见 [Docker 学习安排](linuxdo-supplement.md#docker具体学习安排)。

### 阶段 13：Jenkins／CI

| 课程章节与来源 | 观看视频编号 | 对应内容 |
|---|---|---|
| [第 104 章：Jenkins 环境](course-index.md#第-104-章jenkins-环境) | 1—7 | 持续集成、安装、Job、用户、授权与安全配置。 |
| [第 105 章：自动化测试持续集成](course-index.md#第-105-章自动化测试持续集成) | 1—7、9、13—14 | 凭据、环境变量、节点、参数、插件、Git、接口与 Web 自动化集成。 |
| [第 106 章：其他测试集成](course-index.md#第-106-章其他测试集成) | 4—5 | 单元测试体系、代码覆盖率集成。 |
| [第 107 章：Jenkinsfile 与 Pipeline](course-index.md#第-107-章jenkinsfile-与-pipeline) | 2—9、11—13 | Pipeline、Jenkinsfile、agent／stage／step、post、参数、环境与触发器。 |
| [第 108 章：持续交付](course-index.md#第-108-章持续交付) | 4 | Web service 持续交付练习。 |
| [第 109 章：质量门禁](course-index.md#第-109-章质量门禁) | 1 | 质量门禁。 |
| [第 110 章：CI 综合训练](course-index.md#第-110-章ci-综合训练) | 1 | 持续集成与持续交付直播训练营。 |
| [R1：容器化 Jenkins 补充](resource-locations.md#r1requestspytest-网盘课程) | 58—60、63—64、66 | Docker、Jenkins、Python 镜像、Allure 与流水线。 |

练习：自动执行单元、接口与 UI 测试，发布报告，必要测试失败时构建失败；凭据由独立配置管理。

### 阶段 14：性能与监控

| 课程章节与来源 | 观看视频编号或阅读位置 | 对应内容 |
|---|---|---|
| [华测 A 组：性能基础](huace-supplement.md#a性能第一阶段5-个视频)；[B 组：JMeter](huace-supplement.md#bjmeter-实践9-个视频) | A1 → B1 → A2 → A3 → A4 → B2 → B3 | QPS／TPS、测试方案、计划与线程组、参数化、关联、场景与混合负载。 |
| [华测 C 组：监控与报告](huace-supplement.md#c监控定位与报告8-个视频)；[B 组](huace-supplement.md#bjmeter-实践9-个视频) | C1 → B4 → C2 → C3 → C4 | Linux top／free／vmstat、服务器资源、慢查询、Grafana、测试报告。 |
| [R3：JMeter 组件、参数化与关联](resource-locations.md#jmeter-组件参数化与关联) | 阶段 7／第 3 章／3-3—3-7 | 元件顺序、HTTP 请求、参数化、断言、提取器。 |
| [R3：JMeter 数据库、控制器与定时器](resource-locations.md#jmeter-数据库控制器与定时器) | 阶段 7／第 3 章／3-9—3-11 | 数据库连接、控制器、同步与吞吐量定时器。 |
| [R3：JMeter 报告、并发与监控](resource-locations.md#jmeter-报告并发与监控) | 阶段 7／第 3 章／3-13—3-15 | 报告、并发数计算、线程组与系统资源监控。 |
| [M1：Prometheus＋Grafana 文字教程](https://linux.do/t/topic/503969) | 部署、Exporter、采集配置、数据源与告警 | Prometheus 指标采集、Grafana 展示、Alertmanager。 |
| [第 96 章：性能综合训练](course-index.md#第-96-章性能综合训练) | 1—3 | 性能测试直播训练营，优先观看视频 1；视频 2、3 按优先级选看。 |

练习：仅对自己的测试环境加压，确定并发、持续时间与停止阈值，记录响应时间、吞吐、错误率、系统指标，完成问题复现和复测。JMeter 实时结果接入的专项资源仍需补充。

### 阶段 15：项目展示与流程

| 课程章节与来源 | 观看视频编号 | 对应内容 |
|---|---|---|
| [第 19 章：测试流程管理](course-index.md#第-19-章测试流程管理) | 1—5、8 | 测试流程、业务架构分析、测试计划、Bug 概念与流程、测试总结。 |
| [第 20 章：测试流程工具](course-index.md#第-20-章测试流程工具) | 1 | PlantUML 业务架构分析工具。 |
| [第 14 章：测试体系与方案](course-index.md#第-14-章测试体系与方案) | 1—8 | 架构与数据流、方案设计、需求、测试策略、Bug 定位、分层与自动化策略、测试环境。 |
| [第 21 章：测试方案综合训练](course-index.md#第-21-章测试方案综合训练) | 2—3 | 测试方案设计、作业解析直播训练营。 |
| [R3：禅道用例与缺陷管理](resource-locations.md#禅道用例与缺陷管理) | 阶段 1／第 3 章／3-4／11—12 | 禅道管理缺陷、禅道管理用例。 |

练习：提交需求范围、测试计划、用例、可复现缺陷、测试报告与项目说明，说明问题证据及复测结果。

## 原始文件与配套清单

| 内容 | 入口 |
|---|---|
| 72 章原始视频标题、完整网盘路径、优先级与逐条练习 | [完整课程索引](course-index.md) |
| 华测 HTTP、Postman、Fiddler、JMeter 与监控视频 | [31 个补充视频](huace-supplement.md) |
| R1—R3 原始课号、视频名称、目录，以及网页入口 | [资源入口与视频定位](resource-locations.md) |
| 补充主题的优先级、练习与资源状态 | [Linux DO 资源与章节安排](linuxdo-supplement.md) |
| 主课程逐条路径、状态、优先级与练习 | [course-paths.json](course-paths.json) |
| 华测视频逐条路径、原始名称与练习 | [huace-paths.json](huace-paths.json) |

## 核查状态

核查日期：2026-09-29。主课程记录 404 个 `.mp4` 文件、99 个空目录，覆盖 72 章；华测补充记录 31 个视频。文件名来自分享页面目录，视频内容和播放完整性未核验。16 个约 251 KB 文件继续保留完整性待确认标记。

Linux DO 的视频资源依据论坛目录定位，分享有效期和播放未核验；公开文字教程已读取正文。接口加解密、Python 多环境切换、JMeter 实时结果接入等仍需补充，具体范围见补充清单。未确认资源不会计为已经掌握或完成。

这些文档描述课程与练习安排。个人学习进度继续使用项目已有的 `data/progress.json` 和证据记录，本次没有修改完成状态。

## 清单校验

在仓库根目录执行以下命令，检查数量、原始路径摘要、Markdown 与 JSON 的逐项一致性，以及仓库内文档链接。校验过程只读取清单。

```shell
npm ci --ignore-scripts --prefix docs/minimall
npm test --prefix docs/minimall
```

环境要求：Node.js 20 及以上。依赖版本记录在本目录的 `package-lock.json`；GitHub Actions 同样执行这组清单校验。
