# CODEX_UI_FIX_PROMPT.md

## 任务

对现有仓库：

`huayou712-maker/sdet-learning-roadmap`

做一次 **UI 视觉 + 登录交互修复**。

请直接使用本压缩包内已经整理好的素材，不要重新生成图片。

新建分支：

`fix/jianghu-ui-assets-auth-kaiti`

完成后创建 PR 到 `main`，不要自动 merge。

---

# 0. 不允许破坏的现有功能

不要重写或删除：

- GitHub OAuth 后端
- GitHub Adapter
- GitHub-backed CRUD
- Notes
- Assignments
- Projects
- Progress
- Timeline
- Search
- Daily
- Debug Journal
- Evidence
- Portfolio
- GitHub 是唯一正式 Source of Truth 的数据设计

正式数据仍然必须保存到 GitHub Repository。

禁止把正式业务数据改成本地文件、localStorage、SQLite 或其它本地后备存储。

localStorage 只允许保存未提交草稿和非关键 UI 偏好。

---

# 1. 本压缩包素材

将本压缩包中的：

`public/images/jianghu/`

完整复制到现有仓库同路径。

素材已经转换成可直接使用的 WebP / PNG。

## 1.1 Hero

`/images/jianghu/hero-jianghu.webp`

用途：

- 首页 Hero 主视觉
- 人物位于右侧
- 左侧有可用于标题的负空间
- 不得再使用 CSS 多边形山峰作为 Hero

---

## 1.2 最近笔记缩略图

依次使用：

- `/images/jianghu/note-thumb-01.webp`
- `/images/jianghu/note-thumb-02.webp`
- `/images/jianghu/note-thumb-03.webp`

建议：

1. note-thumb-01：书卷 / 学习笔记
2. note-thumb-02：夜间伏案 / 深度复盘
3. note-thumb-03：荒漠远行 / 总结规划

实际笔记列表超过 3 条时，可以循环使用，直到以后记录有自己的 cover image。

---

# 1.3 项目缩略图

依次使用：

- `/images/jianghu/project-thumb-01.webp`
- `/images/jianghu/project-thumb-02.webp`
- `/images/jianghu/project-thumb-03.webp`
- `/images/jianghu/project-thumb-04.webp`

其中 project-thumb-04 与 note-thumb-03 有意复用同一原始画面，属于当前素材不足时的允许行为。

不要因此生成新的占位渐变图。

---

# 1.4 淡墨山水透明装饰

`/images/jianghu/ink-landscape-overlay.png`

它是真正带透明通道的 PNG。

用途：

- 学习路线 Panel 背景装饰
- 空状态装饰
- Page Heading 局部水墨背景
- Footer / Portfolio 淡装饰

不得作为整页不透明大背景。

建议 opacity：

`0.10 ~ 0.24`

不得影响正文可读性。

---

# 2. 登录入口必须修复

当前现状：

`/settings` 有 GitHub 登录，但顶部导航没有登录入口。

这是错误的 UX。

## 2.1 Desktop Header

顶部结构改成：

```text
[印章] SDET Learning OS

总览
学习路线
学习笔记
作业
项目
时间线

                         Search
                         GitHub Login / Avatar
```

### 未登录

Header 右侧明显显示大按钮：

`GitHub 登录`

建议有 GitHub 图标。

OAuth 已配置：

点击直接执行：

`signIn("github")`

OAuth 未配置：

显示：

`登录未配置`

点击跳：

`/settings`

### 已登录

显示：

```text
[avatar] huayou712-maker ▾
```

下拉：

- 所有者
- 设置
- 回收站
- 退出登录

登录区域不能再藏在“目录”里。

---

# 2.2 权限

Public 用户：

- 可以浏览公开内容
- 不能看到新增
- 不能看到编辑
- 不能看到删除
- 不能看到提交按钮

Owner：

`huayou712-maker`

登录后才显示所有写操作。

权限必须服务端再次验证。

不能只靠前端隐藏按钮。

---

# 3. Header 视觉

背景：

```css
#1f1b15
```

或接近的墨褐黑。

高度：

`60px ~ 68px`

左侧：

- 暗红方印
- SDET Learning OS

当前导航：

使用细金线或赭金色强调。

禁止：

- 蓝色 active
- 紫色 active
- neon
- glassmorphism

---

# 4. 全站改为楷体

用户明确要求：

> 所有界面字体改成楷体风格。

全局 body/UI 使用：

```css
font-family:
  "KaiTi",
  "STKaiti",
  "Kaiti SC",
  "BiauKai",
  serif;
```

包括：

- 导航
- 中文正文
- 英文普通 UI
- 页面标题
- 卡片标题
- Button
- Input
- Select
- Label
- Tooltip
- Timeline
- Tags
- Dashboard
- Portfolio

唯一功能性例外：

```text
code
pre
kbd
textarea code editor
JSON/code preview
```

这些仍可使用 monospace，避免代码不可读。

不要上传字体文件。

---

# 5. Hero 必须完全返工

删除或停用当前：

- `.sun`
- `.ridge`
- `.ridge-back`
- `.ridge-front`

以及使用 CSS `clip-path` 画山的 Hero 主视觉方式。

## 5.1 新 Hero

使用：

`hero-jianghu.webp`

建议结构：

```text
Hero
├── full-bleed cinematic image
├── left dark-to-transparent overlay
├── subtle film grain overlay
├── vignette
├── Hero copy
└── CTA
```

### Desktop

高度：

`400 ~ 470px`

图片：

```css
object-fit: cover;
object-position: center;
```

根据人物位置允许：

`object-position: 58% center`

确保右侧人物完整。

### 左侧文字

主标题：

`SDET Learning OS`

副标题：

`测试开发学习与作品留痕系统`

文案控制在 2 行以内。

建议：

`以代码为剑，以测试为眼。留下每一步可验证的行迹。`

---

# 5.2 Hero 遮罩

为了文字可读：

左侧增加：

```css
linear-gradient(
  90deg,
  rgba(31,27,21,.92) 0%,
  rgba(31,27,21,.70) 32%,
  rgba(31,27,21,.18) 62%,
  rgba(31,27,21,0) 100%
)
```

再加非常轻微：

- film grain
- vignette
- amber overlay

不要把图片整体染成纯黄。

---

# 6. 按钮全部放大

当前 Button 偏小。

统一升级。

## Desktop

最低：

```css
min-height: 48px;
padding: 0 24px;
font-size: 16px;
```

主 CTA 可以：

```css
min-height: 52px;
padding: 0 28px;
```

## Mobile

最低：

`46px`

---

# 6.1 Button 动效

加入克制的动效：

```css
transition:
  transform 200ms ease,
  box-shadow 200ms ease,
  background-color 200ms ease,
  border-color 200ms ease;
```

Hover：

```css
transform: translateY(-2px) scale(1.015);
```

增加轻微暖色阴影：

```css
box-shadow: 0 8px 22px rgba(43,37,28,.18);
```

Active：

```css
transform: translateY(0) scale(.985);
```

Focus：

使用金 / 赭色 outline。

禁止：

- 大幅 bounce
- 霓虹光
- 紫色 glow
- 过强 spring 动效

并尊重：

```css
@media (prefers-reduced-motion: reduce)
```

---

# 7. Dashboard 核心指标

首页第一层只强调 4 个核心指标：

1. 总体进度
2. 连续学习
3. 累计学习时长
4. 项目完成

学习笔记和作业提交移到次级区域。

## 7.1 总体进度

增加 circular progress ring。

不能只是：

`0%`

一个大数字。

## 7.2 连续学习

增加火焰视觉 / icon。

## 7.3 学习时长

增加 clock icon。

## 7.4 项目

增加 flag / box / project icon。

所有数字来自真实数据，不允许写假统计。

---

# 8. 首页主体采用参考图的信息密度

Desktop 三栏：

```text
学习路线 | 最近笔记 | 最近动态
```

---

# 8.1 学习路线

改成 vertical timeline。

不要在 Dashboard 展示全部十阶的长列表。

首页压缩为 4 个概括阶段：

1. 基础夯实
2. 测试开发核心
3. 工程化与实战
4. 进阶与拓展

这些概括阶段根据真实 roadmap 计算子阶段完成率。

学习路线 Panel 右下或右侧叠加：

`ink-landscape-overlay.png`

低透明度。

保留：

`查看全部 →`

---

# 8.2 最近笔记

展示最多 3 条。

每条结构：

```text
[thumbnail]
title
excerpt
date
tags
```

依次使用：

```text
note-thumb-01
note-thumb-02
note-thumb-03
```

不要做成只有文字的列表。

Hover：

- 缩略图轻微 scale 1.03
- 标题颜色轻变化
- 卡片整体不要猛烈抬升

---

# 8.3 最近动态

使用真正 Timeline：

```text
date | dot | event
```

包含：

- 知识点完成
- Note
- Assignment
- Project
- Debug Journal
- Daily

状态点：

- completed -> jade
- submitted/update -> ochre
- debug -> crimson
- normal -> muted

数据必须来自真实记录。

---

# 9. 项目区

首页底部展示 4 张重点项目卡。

Desktop：

`4 columns`

卡片结构：

```text
thumbnail
title
description
tech tags
status
```

使用：

```text
project-thumb-01.webp
project-thumb-02.webp
project-thumb-03.webp
project-thumb-04.webp
```

状态：

- completed -> jade
- in_progress -> ochre
- planned -> muted

不要伪造项目完成状态。

如果真实项目超过 4 个：

首页显示 4 个，
`查看全部` 跳 `/projects`。

---

# 10. 纸张 / 江湖质感

当前页面“浅米黄色平铺”太单调。

重新做层次：

## 页面底色

深浅交替的纸色：

```text
paper
sand
ink
```

## 卡片

加入：

- subtle paper grain
- 细边框
- 极弱 tonal gradient
- 轻微内层阴影

卡片不能都是完全相同纯色矩形。

## 墨色区域

适量使用：

```text
#1f1b15
#2b251c
```

平衡大面积浅纸色。

---

# 11. 图片实现

必须使用：

`next/image`

Hero：

- fill
- priority
- sizes
- cover

Thumbnail：

- 固定 aspect-ratio
- cover
- lazy load

避免 layout shift。

---

# 12. 响应式

## >= 1200px

完整三栏 Dashboard。

## Tablet

2 列或合理重排。

## Mobile

- Header drawer
- GitHub Login 永远可找到
- Hero 单栏
- Hero image 250~310px
- Stats 2 columns
- 主内容单栏
- Notes 横图
- Project 单栏或横向 scroll

---

# 13. /settings

保留 Settings 登录功能作为备用入口。

同时必须显示清晰状态：

```text
当前身份：
OAuth：
GitHub 写权限：
数据分支：
```

如果 OAuth 未配置：

明确告诉用户缺什么。

不要显示 Secret 具体值。

---

# 14. 视觉目标

最终视觉应明显向仓库已有：

`docs/design/jianghu-ui-reference.png`

靠近。

重点不是复制具体电影角色，而是：

- 江湖
- 荒漠
- 夕阳
- 胶片
- 暖金
- 墨褐
- 暗红
- 玉绿
- 纸张
- 水墨

---

# 15. 明确失败条件

以下任意一项存在，视为本轮失败：

1. Hero 仍是 CSS 三角形山
2. 没有使用 `hero-jianghu.webp`
3. Header 没有 GitHub 登录入口
4. 登录入口依旧只存在 `/settings`
5. 全站普通 UI 没有楷体化
6. Button 仍明显偏小
7. Button 没有轻微 hover / active 动效
8. Notes 没有缩略图
9. Project 没有缩略图
10. Timeline 仍是普通文字堆叠
11. 首页继续是一整片浅黄色
12. 引入蓝紫 SaaS 风
13. 破坏 GitHub-backed CRUD
14. 将正式数据存到 localStorage / 文件系统
15. 写死假数据

---

# 16. 测试

完成后：

```bash
npm run lint
npm run typecheck
npm run test
npm run build
npm run test:e2e
```

增加/更新测试：

- public Header 显示 GitHub 登录
- OAuth 未配置时登录入口跳 Settings
- Owner Header 显示 GitHub 用户名
- Owner 可退出
- Public 不显示写按钮
- Hero 使用真实图片资源
- Notes 有 thumbnail
- Project cards 有 thumbnail

---

# 17. 截图验收

重新生成：

```text
docs/design/dashboard-desktop-v2.png
docs/design/dashboard-mobile-v2.png
```

Desktop 截图建议：

`1440 x 1000` 或更宽。

必须对照：

`docs/design/jianghu-ui-reference.png`

做一次人工视觉检查。

---

# 18. Git 交付

完成后提交：

```text
fix/jianghu-ui-assets-auth-kaiti
```

推荐 commit：

```text
fix(auth): expose GitHub account controls in header
feat(ui): integrate cinematic jianghu visual assets
style(ui): apply kaiti typography and button motion
test(ui): cover owner and public header states
```

然后创建 PR：

```text
fix: align Learning OS with jianghu design and auth UX
```

Base：

`main`

不要自动 Merge。
