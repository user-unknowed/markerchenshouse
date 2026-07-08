# Marker Chen 的小站

陈尹涛（Marker Chen）的个人博客 —— 记录读书、编程与 vibe coding 的地方。

## 技术栈

- 纯静态 HTML / CSS / JavaScript
- Markdown 渲染：[marked.js](https://marked.js.org/)
- 代码高亮：[highlight.js](https://highlightjs.org/)
- 主题切换：CSS 变量 + `localStorage`
- 部署：GitHub Pages

## 本地预览

任意静态文件服务即可：

```bash
# Python 3
python -m http.server 8080

# Node
npx http-server -p 8080
```

打开 http://localhost:8080/

## 部署

- 仓库：`user-unknowed/markerchenshouse`
- 线上地址：https://user-unknowed.github.io/markerchenshouse/

## 目录结构

```
.
├── index.html        # 首页（文章列表 + 分页）
├── post.html         # 文章详情
├── tags.html         # 标签总览
├── tag.html          # 单标签下的文章列表
├── about.html        # 关于
├── css/style.css     # 全局样式（亮色 / 暗色）
├── js/app.js         # 共用脚本（数据加载、Markdown、主题切换）
└── data/posts.json   # 文章数据
```

## 添加文章

在 `data/posts.json` 数组里追加一条：

```json
{
  "id": "my-new-post",
  "title": "我的新文章",
  "date": "2026-07-08",
  "author": "Marker Chen",
  "tags": ["随笔", "生活"],
  "excerpt": "一段简短摘要…",
  "content": "# 标题\n\n正文 Markdown…"
}
```

按 `date` 倒序展示，无需调整其它代码。

## 关于

- 邮箱：wassup666666@qq.com
- GitHub：https://github.com/user-unknowed
- StarIsle：https://github.com/user-unknowed/-StarIsle-
- reading--note：https://github.com/user-unknowed/reading--note
