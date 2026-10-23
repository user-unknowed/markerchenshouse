# 每日 AI 热点自动化指令（标准版）

> 本文件是「AI 今日热点」每日自动化的标准指令。每次执行时按本指令逐条完成。
> 2026-10-19 修订：新增配图工作流（第 5 节），配图必须落库为本地图，禁止外链生图接口。

## 指令正文

搜索今日 AI 行业的热点新闻，并上传到 GitHub 仓库
`https://github.com/user-unknowed/markerchenshouse`，同步 Pages 文章状态。
Use plugin: `trae-remote-official:github`，Use Skill: `gh-cli`。

覆盖以下方面：

1. 重要产品发布或功能更新（OpenAI、Google、Anthropic 等公司动态，重点跟进华为及其旗下相关企业的消息）
2. 融资事件与行业并购
3. 技术突破或重要论文发布
4. 行业标准与规范动态（AI 安全框架、数据治理标准的进展）

输出要求：

- 按重要性排序，列出 5-8 条新闻
- 每条新闻包含：标题、一句话摘要、信息来源
- 聚焦技术进展和商业动态层面
- 最后附一段 2-3 句的「今日趋势点评」
- 每条要闻下面配 1-2 张图片（见第 5 节配图工作流）

## 数据写入规范

- 文章 id：`ai-news-YYYY-MM-DD`，写入 `data/posts.json`（主数据源）
- `data/posts.js` 为 JS 回退源，必须与 `posts.json` 内容完全一致（重新生成，不手改）
- 推送到 `main` 分支后，等待 GitHub Actions「Deploy Cat Daily」完成，确认 gh-pages 已更新

## 配图工作流（重要）

生图接口 `trae-api-cn.mchost.guru/api/ide/v1/tool_text_to_image` 的直链**需要鉴权**，
访客端无法显示（返回 `{"code":1001,...}` 认证错误）。因此**禁止**把该 URL 直接写进文章，
必须使用 GenerateImage 工具生成图片文件并随仓库发布：

1. 用 `GenerateImage` 工具为每条要闻生成 1 张配图（`landscape_16_9`），
   prompt 以 `Blog post featured illustration:` 开头，描述与该条新闻主题匹配的具体画面
2. 保存到 `images/ai-news-YYYY-MM-DD/NN-slug.jpg`（NN 为两位序号，与新闻顺序一致）
3. 优化体积：统一缩放到宽 1600px、JPEG 质量 84、渐进式加载（单张约 160-330KB）
4. 文章 Markdown 中用**相对路径**引用：`![配图说明](./images/ai-news-YYYY-MM-DD/NN-slug.jpg)`
5. 图片随仓库一起 commit/push；`css/style.css` 已有 `.markdown-body img` 样式（max-width、圆角、阴影），无需额外处理

## 发布后验证

- 本地 `python3 -m http.server` 起服务，浏览器打开
  `post.html?id=ai-news-YYYY-MM-DD`，确认 `.markdown-body img` 全部
  `complete && naturalWidth > 0`、无 broken
- 推送后等待部署完成，再访问线上
  `https://user-unknowed.github.io/markerchenshouse/post.html?id=ai-news-YYYY-MM-DD`
  复验图片加载（GitHub Pages 传播可能有延迟，耐心等待即可）

## 变更记录

- 2026-10-19：初版；确立配图落库 + 相对路径 + 双数据源同步 + 发布后验证的标准流程
