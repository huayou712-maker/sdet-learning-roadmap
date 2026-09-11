# R9 背景图修订

用户明确要求调用生图模型替换几何山形。本轮使用内置 imagegen，不使用 CLI/API 密钥。生图只负责背景；真实标题、路线与按钮继续由 HTML/SVG 绘制。

## 交付与边界

- [生成原图](background-imagegen-source.png)：1774 × 887，保留原始文件及来源元数据。
- [网页资源](../../../public/images/roadmap/roadmap-landscape-r9-v2.webp)：同尺寸 WebP，约 280 KiB，没有放大冒充高分辨率。
- 原先九张随项目提供的插图及其验收不变。新增生成背景使用独立的 roadmap 资源目录，并单独验证原生尺寸、体积、实际加载和加载失败时的操作能力。
- 允许修改路线页背景资源、局部样式、相关测试及本说明。课程、推荐算法、进度、权限、API、GitHub 正式数据源和不自动合并的边界不变。
- 图像生成后检查了无文字、无路线节点、左上留白和山体层次。网页使用局部遮罩与文字底色保持可读，不把交互烧进图片；动效关闭及减少动态效果仍然有效。

## 验收结果

- 本地 `npm run lint`、`npm run typecheck`、`npm run test`、`npm run build`、`npm run test:e2e` 全部通过：312 项单元测试、60 项 E2E（约 6.1 分钟）。
- 本轮新增 2 项资源/组件测试与 1 项背景加载失败 E2E；原 310 项单元测试和 59 项 E2E 均保留。只等待本组件的关键图片 `complete && naturalWidth > 0`，不等待页面全部图片 decode。
- 已查看 1440px 桌面、390px 手机实际截图。响应式验收覆盖 320、390、720、900、1024、1440、1920px；动画中点选、键盘、动效关闭、减少动态效果和图片失败降级均通过。
- [桌面效果](implemented-desktop.png) · [手机效果](implemented-mobile.png) · [实际交互](implemented-interaction.webm)
- 仅更新 `feat/jianghu-roadmap-scroll`。本地通过不代表远端 CI 通过；本轮核对时尚无该分支的开放 PR，不合并、不手动部署。

## 最终提示词

```text
Use case: stylized-concept.
Asset type: original high-resolution panoramic website background, approximately 2:1 landscape, NOT a screenshot or UI mockup.
Primary request: create a beautiful, richly detailed Chinese Jianghu mountain landscape for a learning roadmap called "六站山河长卷". The existing polygon mountains feel cheap; this should feel like an exquisite contemporary Qinglü shanshui painting brought to life with cinematic atmospheric depth.
Scene: an expansive valley of irregular, weathered mountain ridges, overlapping distant silhouettes, dark pine-clad crags and delicate drifting cloud-mist. Natural, believable rock formations with fine stone strata and restrained mineral-pigment brushwork. The view opens into great depth. Use exceptionally refined texture, not noisy grunge.
Composition: design the entire image as one coherent panoramic artwork. The upper-left 42% of width and upper 43% of height must be quiet dark ink-green mist with very faint distant silhouettes, suitable for cream-colored Chinese headline and controls. Concentrate the principal sculptural peaks in the right half and across the lower half, with the highest focal ridge near the right third. Keep lower-half detail readable but softly grouped so six HTML navigation nodes can overlay it. Allow mobile cropping toward the right half. Do not create empty geometric blocks; negative space is naturally atmospheric.
Lighting/mood: cinematic dawn emerging through mist, subtle soft light picking out mountain edges. Awe, serenity, an inviting long journey. Keep the general exposure dark enough for pale website labels without flattening the artwork.
Palette: deep ink jade #142a25, forest jade #274438, mineral blue-green #608b83, misted stone green #98aca0, very small touches of warm muted gold light. Sophisticated low-saturation grading with luminous local depth.
Constraints: landscape artwork only; no text, calligraphy, letters, numbers, seals, watermarks, logos, frames, panels, buttons, route lines, nodes, people, buildings or icons. No low-poly mountains, triangular vector shapes, flat gradients, neon glow, fantasy game HUD, exaggerated HDR, or generic stock-photo look. Render a fully resolved original background suitable for a premium Jianghu-themed web interface.
```
