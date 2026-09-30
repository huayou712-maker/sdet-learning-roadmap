# MiniMall 测试开发课程学习路线

从 Python、SQL 和 Flask 建立商城业务，再完成接口测试、UI 自动化、CI、性能与监控。每个阶段按照视频位置、观看优先级和项目练习推进，完成标准以能够独立运行并说明结果为依据。

## 阅读入口

| 内容 | 入口 |
|---|---|
| Docker／Compose／Prometheus 网页链接，网盘课程编号与原始视频名称 | [资源入口与视频定位](resource-locations.md) |
| 15 阶段路线、72 章原始视频标题、完整网盘路径、优先级与练习 | [完整课程索引](course-index.md) |
| 华测课程中的 HTTP、Postman、Fiddler、JMeter 与监控补充 | [31 个补充视频](huace-supplement.md) |
| Requests、Cookie、JSON Schema、Docker 与 Prometheus 补充 | [Linux DO 资源与章节安排](linuxdo-supplement.md) |
| 主课程逐条路径、状态、优先级与练习 | [course-paths.json](course-paths.json) |
| 华测视频逐条路径、原始名称与练习 | [huace-paths.json](huace-paths.json) |

## 网页资源入口

| 原章节 | 类型 | 点击查看 |
|---|---|---|
| 97：Docker | 在线视频 | [GeekHour：30 分钟 Docker 入门教程](https://www.bilibili.com/video/BV14s4y1i7Vf) |
| 98：Compose | 网页文字教程 | [一文入门 Docker Compose](https://linux.do/t/topic/877671) |
| 95：Prometheus | 网页文字教程 | [Prometheus＋Grafana＋Alertmanager 部署教程](https://linux.do/t/topic/503969) |

网盘课程使用章节编号和原始文件名定位，详细位置见 [资源入口与视频定位](resource-locations.md)。网页视频的播放状态与网盘补充课程的核查状态在该页分别说明。

## 15 阶段执行顺序

| 阶段 | 内容 | 项目完成条件 |
|---|---|---|
| 1 | Python | 商品、购物车、订单数据处理；非法输入不会改变库存。 |
| 2 | Git | 独立功能分支、提交、diff、冲突处理与远程同步。 |
| 3 | Linux 与 Bash | 文件、进程、端口、日志定位；命令失败能被发现。 |
| 4 | SQL | 用户、商品、订单与条目表；查询与库存核验。 |
| 5 | Flask API | 注册、登录、商品、购物车、订单接口；事务保持一致。 |
| 6 | 用例设计与 Pytest | 正常、边界、异常用例；fixture 隔离数据。 |
| 7 | Allure | 按业务分类报告；失败证据不包含认证信息。 |
| 8 | 接口自动化 | 登录、下单、数据库核验、权限失败与环境配置。 |
| 9 | 后端工程整理 | 路由、业务、数据库访问与配置职责明确。 |
| 10 | Vue 页面 | 登录、商品、购物车、订单与管理员页面调用真实 API。 |
| 11 | Web 自动化 | 关键业务流程可重复执行，有独立测试数据与有效断言。 |
| 12 | Docker | 后端与数据库的服务连接、健康检查与数据持久化。 |
| 13 | Jenkins／CI | 自动执行必要测试；失败构建明确失败，报告可查。 |
| 14 | 性能与监控 | 自有环境加压、停止阈值、请求与系统指标、复测证据。 |
| 15 | 项目展示与流程 | 需求、计划、用例、缺陷、报告和复现说明。 |

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
