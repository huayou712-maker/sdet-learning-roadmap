# ASSET_MAPPING.md

已人工检查并整理本压缩包中的 8 张原始视觉素材。

最终输出位于：

`public/images/jianghu/`

| 文件 | 用途 |
|---|---|
| hero-jianghu.webp | 首页 Hero 主视觉 |
| note-thumb-01.webp | 最近笔记缩略图：书卷 |
| note-thumb-02.webp | 最近笔记缩略图：夜间伏案 |
| note-thumb-03.webp | 最近笔记缩略图：荒漠远行 |
| project-thumb-01.webp | 项目缩略图：烽火关隘 / API 路径感 |
| project-thumb-02.webp | 项目缩略图：连续关卡 / UI 流程感 |
| project-thumb-03.webp | 项目缩略图：高压远眺 / 性能感 |
| project-thumb-04.webp | 项目缩略图：荒漠远行（当前允许复用） |
| ink-landscape-overlay.png | 透明水墨山水装饰 |

说明：
- WebP 已高质量压缩，适合直接交给 Next.js `next/image` 使用。
- `ink-landscape-overlay.png` 保留真实透明通道。
- project-thumb-04 当前与 note-thumb-03 复用原始画面，这是因为现有非透明素材数量不足，属于有意设计而不是遗漏。
