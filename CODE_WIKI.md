# Code Wiki · Marker Chen 的小站

> 本文档是 `markerchenshouse` 仓库的结构化 Code Wiki，覆盖项目整体架构、主要模块职责、关键类与函数说明、依赖关系以及项目运行方式。
>
> - 仓库：https://github.com/user-unknowed/markerchenshouse
> - 线上：https://user-unknowed.github.io/markerchenshouse/
> - 工作台：https://user-unknowed.github.io/markerchenshouse/workbench/
> - 文档生成日期：2026-09-28

---

## 目录

1. [项目概览](#1-项目概览)
2. [整体架构](#2-整体架构)
3. [目录结构](#3-目录结构)
4. [技术栈与依赖关系](#4-技术栈与依赖关系)
5. [主要模块职责](#5-主要模块职责)
6. [关键类与函数说明](#6-关键类与函数说明)
7. [数据结构与数据流](#7-数据结构与数据流)
8. [项目运行方式](#8-项目运行方式)
9. [部署流程](#9-部署流程)
10. [安全机制](#10-安全机制)
11. [关键设计决策](#11-关键设计决策)

---

## 1. 项目概览

**Marker Chen 的小站** 是陈尹涛（Marker Chen）的个人静态站点，由两个相对独立的子系统组成：

| 子系统 | 性质 | 数据存储 | 入口 |
|--------|------|----------|------|
| **博客主站** | 纯静态多页面站点（HTML/CSS/JS，无后端） | `data/posts.json`（仓库内文件） | `index.html` |
| **喵生编辑部工作台** | 纯前端单页应用（SPA，桌面版） | 浏览器 `localStorage`（仅本地） | `workbench/index.html` |

### 核心特征

- **零后端**：博客主站通过浏览器端 + GitHub Contents API 实现文章发布；工作台数据完全存于本地 `localStorage`。
- **无构建步骤**：直接由原生 HTML/CSS/JS 组成，第三方库（marked.js、highlight.js）通过 CDN 按需加载。
- **GitHub Pages 部署**：源码在 `main` 分支，由 GitHub Actions 自动部署到 `gh-pages` 分支。
- **双主题**：博客主站支持亮/暗色主题（CSS 变量 + `localStorage`）；工作台为固定的"卡通小猫 × 复古报刊编辑部"风格。

---

## 2. 整体架构

### 2.1 系统架构图

```
┌─────────────────────────────────────────────────────────────────────┐
│                        GitHub 仓库 (main 分支)                       │
│                                                                      │
│  ┌─────────────────────┐        ┌──────────────────────────────────┐  │
│  │   博客主站 (静态)    │        │   喵生编辑部工作台 (SPA)         │  │
│  │                     │        │                                  │  │
│  │  index.html         │        │  workbench/index.html            │  │
│  │  post.html          │        │  (单文件：HTML+CSS+JS 全内联)     │  │
│  │  tags.html/tag.html │        │                                  │  │
│  │  about.html         │        │  数据：localStorage               │  │
│  │  admin.html         │        │  (workbench-cat-daily-v1)         │  │
│  │  404.html           │        │                                  │  │
│  │                     │        │  模块：今日计划/打卡/阅读/运动/    │  │
│  │  js/app.js  (Blog)  │        │  记账/心情日记/今日热点            │  │
│  │  js/admin.js(Admin) │        │  + 番茄钟/时钟/趋势图             │  │
│  │  css/style.css      │        │                                  │  │
│  │  data/posts.json    │        └──────────────────────────────────┘  │
│  └─────────┬───────────┘                                             │
│            │  push 触发                                              │
│            ▼                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │  .github/workflows/deploy-workbench.yml                        │  │
│  │  (peaceiris/actions-gh-pages@v4 → 部署整站到 gh-pages 分支)     │  │
│  └─────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────┬───────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    gh-pages 分支 (GitHub Pages CDN)                 │
│              user-unknowed.github.io/markerchenshouse/              │
└─────────────────────────────────┬───────────────────────────────────┘
                                  │
              ┌───────────────────┴───────────────────┐
              ▼                                       ▼
┌─────────────────────────────┐      ┌──────────────────────────────┐
│      博客读者 (浏览器)       │      │   博主 (admin.html 后台)      │
│                             │      │                              │
│  fetch data/posts.json      │      │  1. SHA-256 密码解锁          │
│  ↓                          │      │  2. 填写 GitHub PAT           │
│  marked.js 渲染 Markdown    │      │  3. 调 GitHub Contents API    │
│  highlight.js 代码高亮      │      │     读取/写回 posts.json      │
│  主题切换 (localStorage)    │      │  4. push main → Actions 部署  │
└─────────────────────────────┘      └──────────────────────────────┘
```

### 2.2 博客主站请求/数据流

```
浏览器加载 HTML
   │
   ├─ <head> 内联脚本：提前读 localStorage('blog-theme') 设置 data-theme（防闪烁）
   │
   ├─ 加载 js/app.js → 暴露全局 window.Blog 对象
   │
   └─ 页面内联 <script> 调用 Blog.* API：
         │
         ├─ Blog.renderHeader() / Blog.renderFooter()  → 注入导航与页脚
         ├─ Blog.applyTheme(Blog.getSavedTheme())      → 应用主题
         └─ Blog.loadPosts()                          → 加载文章数据
                │
                ├─ 优先 fetch('./data/posts.json')     （HTTP，主路径）
                └─ 失败则动态注入 ./data/posts.js       （JS 回退路径）
                       └─ 读取 window.__BLOG_POSTS__
```

### 2.3 工作台数据流

```
workbench/index.html 加载
   │
   ├─ 内联 <style>：CSS 变量主题（米白旧报纸 + 橘黄/墨绿点缀）
   │
   └─ 内联 <script>：
         │
         ├─ CONFIG：模块定义、种子数据、storageKey
         ├─ store.load()  → 读 localStorage('workbench-cat-daily-v1')
         │                   没有则用 CONFIG.modules[].seed 初始化
         ├─ render()      → 根据 view 渲染对应模块视图
         └─ persist()     → store.save() 写回 localStorage + render()
```

---

## 3. 目录结构

```
.
├── index.html              # 博客首页：文章列表（每页 10 篇，按日期倒序 + 分页）
├── post.html               # 文章详情：根据 ?id=xxx 渲染 Markdown 内容
├── tags.html               # 标签总览：所有标签及对应文章数
├── tag.html                # 单标签下的文章列表（?name=xxx）
├── about.html              # 关于页：个人信息、爱好、项目、联系方式
├── admin.html              # 【管理后台入口】密码登录 + Markdown 编辑器
├── 404.html                # 全站 404 页面（博客主站 + 工作台导航卡片）
├── .nojekyll               # 禁用 Jekyll 预处理，避免下划线资源被忽略
│
├── css/
│   └── style.css           # 全局样式 + 亮色 / 暗色主题 + admin 后台样式
│
├── js/
│   ├── app.js              # 共用脚本：数据加载、Markdown 渲染、主题切换、导航/页脚注入
│   └── admin.js            # 管理后台逻辑：SHA-256 密码认证、PAT 存储、GitHub API 发布、草稿
│
├── data/
│   ├── posts.json          # 文章数据（JSON 数组，倒序展示）
│   └── posts.js            # 文章数据 JS 模块版本（fetch 失败时的回退）
│
├── workbench/              # 喵生编辑部工作台（单文件 SPA）
│   ├── index.html          # 工作台桌面版入口（HTML+CSS+JS 全内联）
│   ├── 404.html            # 工作台子目录 404（"回到头版"按钮）
│   ├── .nojekyll
│   └── assets/
│       ├── greet-banner.jpg    # Hero banner（手绘橘猫插画）
│       └── paper-texture.jpg   # 复古报纸纹理底图
│
├── .github/
│   └── workflows/
│       ├── deploy-workbench.yml        # 自动部署整站到 gh-pages 分支
│       └── switch-pages-source.yml     # 一次性切换 Pages 源到 gh-pages（已完成使命）
│
├── README.md               # 项目说明
├── CODE_WIKI.md            # 本文档
└── .gitignore              # Git 忽略规则（排除 .workbuddy/、.trae/、node_modules/ 等）
```

---

## 4. 技术栈与依赖关系

### 4.1 技术栈

| 层 | 博客主站 | 工作台 |
|----|---------|--------|
| **标记** | 原生 HTML5 | 原生 HTML5 |
| **样式** | CSS 变量 + `[data-theme]` 主题切换 | CSS 变量（固定主题，复古报刊风） |
| **脚本** | 原生 ES2015+ (IIFE 模式) | 原生 ES2015+ (IIFE 模式) |
| **Markdown 渲染** | marked.js v12（CDN 按需加载） | 无（无 Markdown 需求） |
| **代码高亮** | highlight.js v11（CDN，按需加载语言包） | 无 |
| **数据存储** | `data/posts.json`（仓库文件） + GitHub Contents API | `localStorage`（键 `workbench-cat-daily-v1`） |
| **构建工具** | 无（无打包、无编译） | 无 |
| **部署** | GitHub Actions → gh-pages | 同左（随整站一起部署） |

### 4.2 外部依赖（CDN）

博客主站通过 `js/app.js` 在运行时按需注入以下 CDN 脚本（工作台无任何外部依赖）：

| 依赖 | 版本 | 用途 | 加载位置 | 加载时机 |
|------|------|------|---------|---------|
| [marked.js](https://marked.js.org/) | 12.0.2 | Markdown → HTML 渲染 | `cdn.jsdelivr.net/npm/marked@12.0.2/marked.min.js` | `Blog.ensureMarkedLoaded()` 调用时 |
| [highlight.js](https://highlightjs.org/) core | 11.9.0 | 代码语法高亮 | `cdn.jsdelivr.net/npm/highlight.js@11.9.0/lib/core.min.js` | `Blog.ensureHighlightLoaded()` 调用时 |
| highlight.js 语言包 | 11.9.0 | 13 种常用语言 | `cdn.jsdelivr.net/npm/highlight.js@11.9.0/lib/languages/{lang}.min.js` | core 加载完成后批量注入 |

支持的高亮语言：`javascript, typescript, python, java, go, c, cpp, bash, json, xml, css, sql, markdown`。

### 4.3 GitHub API 依赖

管理后台 `admin.js` 直接调用 GitHub REST API（无 SDK，原生 `fetch`）：

| 端点 | 方法 | 用途 |
|------|------|------|
| `GET /repos/{owner}/{repo}/contents/{path}?ref={branch}` | GET | 读取 `data/posts.json` 内容与 SHA |
| `PUT /repos/{owner}/{repo}/contents/{path}` | PUT | 写回 `data/posts.json`（带 SHA 防并发覆盖） |
| `GET /repos/{owner}/{repo}` | GET | 测试 Token 连接与权限 |

请求头统一由 `ghHeaders(token)` 构造：`Authorization: Bearer <token>`、`Accept: application/vnd.github+json`、`X-GitHub-Api-Version: 2022-11-28`。

### 4.4 部署依赖

| 依赖 | 用途 |
|------|------|
| `actions/checkout@v4` | 拉取源码 |
| `peaceiris/actions-gh-pages@v4` | 将 `./` 目录推送到 `gh-pages` 分支 |
| `secrets.GITHUB_TOKEN` | Actions 自动签发的部署凭证 |

---

## 5. 主要模块职责

### 5.1 博客主站模块

博客主站由 6 个 HTML 页面 + 1 个共用脚本 + 1 个样式表 + 1 个数据文件组成，采用"每页内联 `<script>` 调用 `window.Blog` API"的轻量模式。

#### 5.1.1 页面职责矩阵

| 页面 | 职责 | URL 参数 | 关键交互 |
|------|------|---------|---------|
| [index.html](file:///workspace/index.html) | 首页：文章列表，每页 10 篇，按 `date` 倒序 + 分页 | `?page=N` | 分页按钮、卡片标签跳转 |
| [post.html](file:///workspace/post.html) | 文章详情：Markdown 渲染、代码高亮、阅读进度条、上下篇导航 | `?id=xxx` | 阅读进度条、上下篇链接 |
| [tags.html](file:///workspace/tags.html) | 标签总览：聚合所有标签，按文章数倒序 | 无 | 标签卡片跳转 |
| [tag.html](file:///workspace/tag.html) | 单标签文章列表 | `?name=xxx` | 文章卡片跳转 |
| [about.html](file:///workspace/about.html) | 关于页：头像、bio、爱好（进度条）、项目、社交链接 | 无 | 进度条动画 |
| [404.html](file:///workspace/404.html) | 全站 404：双目的地导航卡片（博客 + 工作台） | 无 | 返回上一版按钮 |
| [admin.html](file:///workspace/admin.html) | 管理后台：密码登录 + GitHub 配置 + Markdown 编辑器 | 无 | 见 [5.2](#52-管理后台模块admin) |

#### 5.1.2 共用脚本 `js/app.js`

[app.js](file:///workspace/js/app.js) 是博客主站的核心库，以 IIFE 形式将所有能力挂载到全局 `window.Blog` 对象。所有页面通过 `<script src="./js/app.js">` 引入后，再用内联 `<script>` 调用 `Blog.*` 方法完成页面逻辑。

职责：
- **数据加载**：`loadPosts()` 优先 `fetch` JSON，失败回退到动态注入 `posts.js`
- **Markdown 渲染管线**：`ensureMarkedLoaded()` → `ensureHighlightLoaded()` → `configureMarked()` → `renderMarkdown()`
- **引用上标化**：`processReferences()` 将 `[$TRAE_REF](url)` 转为上标 + 参考资料小节
- **主题系统**：`getSavedTheme()` / `applyTheme()` / `toggleTheme()`，持久化到 `localStorage('blog-theme')`
- **布局注入**：`renderHeader()` / `renderFooter()` 注入导航与页脚 DOM
- **工具函数**：日期格式化、阅读时长估算、摘要提取、HTML 转义、域名提取、上标转换
- **管理态判定**：`isAdmin()` 检查 7 天有效期的会话，用于在导航栏显示"写文章"入口

#### 5.1.3 样式 `css/style.css`

[style.css](file:///workspace/css/style.css)（约 1312 行）：
- 通过 `[data-theme="light"]` / `[data-theme="dark"]` 切换 CSS 变量
- 每个页面 `<head>` 内联脚本在 CSS 加载前设置 `data-theme`，避免主题闪烁
- 同时承载 admin 后台样式（`.admin-gate`、`.editor`、`.toolbar`、`.toast` 等）

### 5.2 管理后台模块（admin）

[admin.html](file:///workspace/admin.html) + [admin.js](file:/workspace/js/admin.js) 构成博客文章发布后台，完全运行在浏览器端，通过 GitHub Contents API 直接读写仓库 `data/posts.json`。

#### 5.2.1 两阶段 UI

| 阶段 | 面板 | 触发条件 |
|------|------|---------|
| 门禁（gate-panel） | 密码输入 + 锁定提示 + 忘记密码帮助 | 未解锁时显示 |
| 编辑器（editor-panel） | 顶栏 + 设置抽屉 + 表单 + 工具栏 + 正文 + 预览弹层 + Toast | `tryUnlock()` 成功后显示 |

#### 5.2.2 核心能力

1. **密码认证**：SHA-256 + 随机 salt 哈希存储；默认密码 `admin`；3 次失败锁定 5 分钟；7 天会话持久化
2. **GitHub 配置**：owner/repo/branch/dataPath + PAT，全部 Base64 编码存 localStorage
3. **连接测试**：`testConnection()` 调用 `GET /repos/{owner}/{repo}` 验证 Token 与权限
4. **Markdown 编辑器**：表单字段（标题/日期/作者/标签/摘要/正文）+ 工具栏（粗体/斜体/代码/列表/引用/链接/图片）
5. **实时统计**：`updateCount()` 计算中文字数 + 英文词数 + 字符数 + 阅读时长
6. **本地预览**：`showPreview()` 复用 `Blog.renderMarkdown()` 在弹层渲染
7. **草稿自动保存**：每次 input 触发 `saveDraft()`，刷新不丢
8. **发布流程**：`publishPost()` 拉 → 解析 → id 去重 → unshift 新文章 → 写回（带 SHA）

### 5.3 喵生编辑部工作台模块

[workbench/index.html](file:/workspace/workbench/index.html)（约 1428 行）是一个**单文件 SPA**，HTML + CSS + JS 全部内联，无任何外部依赖。

#### 5.3.1 设计风格

- **底纹**：米白色旧报纸（`--page-bg: #f5efde`）+ 浅棕色文字
- **点缀色**：橘黄 `#c4651e`（主色）与墨绿 `#4a6b3e`
- **装饰元素**：手绘橘猫插画、报纸分栏、邮票、胶带、铅笔批注、橡皮戳印"THE CAT DAILY · 喵生纪事"

#### 5.3.2 功能模块（CONFIG.modules）

| key | 名称 | type | 数据结构 | 说明 |
|-----|------|------|---------|------|
| `todo` | 今日计划 | `todo` | `{id,title,priority,done,note}` | 任务清单 + P0/P1/P2 优先级 + 完成态 |
| `checkin` | 习惯打卡 | `checkin` | `{id,title,log:{date:true}}` | 每日打卡，按日期记录 |
| `read` | 阅读打卡 | `progress` | `{id,title,current,target,unit,note}` | 进度条 + 摘录 |
| `sport` | 每日锻炼 | `progress` | `{id,title,current,target,unit,note}` | 进度条（分钟） |
| `money` | 记账本 | `finance` | `{id,title,type,amount,category,date}` | 收入/支出 + 7 类分类 + 占比图 |
| `note` | 心情日记 | `note` | `{id,title,content,mood,date}` | 文字 + 5 种心情 |
| `hot` | 今日热点 | `note` | `{id,title,content,mood,date}` | 收藏/稍后读/已读 |

#### 5.3.3 辅助功能

- **今日概览**：4 个环形进度（今日计划/打卡/阅读/运动），由 `CONFIG.overview[].calc(data)` 计算
- **本周趋势图**：`trendSVG(series)` 生成内联 SVG 折线图，读取 `data.__trend`（7 个数字）
- **番茄钟**：内存态 `{running, remain, total}`，由全局秒级心跳 `heartbeat()` 驱动；完成计入 `data.__pomo`
- **实时时钟**：`startClock()` 启动 `setInterval(heartbeat, 1000)`
- **快速记录**：4 个快捷按钮（记运动/打卡/一笔/想法），点击直接新建对应模块记录
- **搜索**：`searchQ` 全局过滤各模块记录

#### 5.3.4 工作台核心引擎

工作台采用极简的"状态 → 渲染"循环：

```
let data = store.load();     // 从 localStorage 加载
let view = "home";           // 当前视图
function persist(){ store.save(); render(); }   // 写回 + 重渲染
function render(){ /* 根据 view 渲染对应模块 */ }
```

- `store.load()` / `store.save()`：localStorage 读写，无数据时用 `CONFIG.modules[].seed` 初始化
- `render()`：根据 `view` 切换主内容区，是所有视图变更的统一入口

### 5.4 数据层

| 文件 | 角色 | 说明 |
|------|------|------|
| [data/posts.json](file:/workspace/data/posts.json) | 博客主数据源 | JSON 数组，按 `date` 倒序，每条为一篇文章；`loadPosts()` 优先 fetch 此文件 |
| [data/posts.js](file:/workspace/data/posts.js) | 回退数据源 | 同样数据以 `var posts = [...]` 形式提供，赋值给 `window.__BLOG_POSTS__`；fetch 失败时动态注入 |
| `localStorage('blog-theme')` | 主题偏好 | `'light'` 或 `'dark'` |
| `localStorage('blog-admin-*')` | 后台状态 | 密码哈希/salt/Token/配置/草稿/失败计数/锁定时间/会话 |
| `localStorage('workbench-cat-daily-v1')` | 工作台数据 | 工作台全部记录的 JSON 序列化 |

### 5.5 部署模块

见 [第 9 节：部署流程](#9-部署流程)。

---

## 6. 关键类与函数说明

### 6.1 `js/app.js` → 全局对象 `window.Blog`

`app.js` 以 IIFE 封装，将以下 API 挂载到 `window.Blog`：

#### 工具函数

| 函数 | 签名 | 说明 |
|------|------|------|
| `$` | `(sel, root=document) => Element` | querySelector 简写 |
| `$$` | `(sel, root=document) => Element[]` | querySelectorAll 简写（返回数组） |
| `formatDate` | `(iso) => string` | ISO 日期 → `YYYY-MM-DD`，无效则原样返回 |
| `estimateReadingTime` | `(content) => number` | 中文 300 字/分钟 + 英文 200 词/分钟，最小 1 |
| `extractExcerpt` | `(content, maxLen=160) => string` | 去 Markdown 标记的纯文本摘要，超长加 `…` |
| `escapeHtml` | `(s) => string` | 转义 `& < > " '`，防 XSS |
| `toSuperscript` | `(num) => string` | 数字 → Unicode 上标字符（用于引用编号） |
| `extractDomain` | `(url) => string` | 从 URL 提取主域名（去 `www.`） |

#### 主题系统

| 函数 | 说明 |
|------|------|
| `getSavedTheme()` | 读 `localStorage('blog-theme')`，默认 `'light'` |
| `applyTheme(theme)` | 设置 `data-theme` 属性 + 写 localStorage + 更新切换按钮图标 |
| `toggleTheme()` | 在 light/dark 间切换 |

#### 布局注入

| 函数 | 说明 |
|------|------|
| `renderHeader()` | 注入 `<header class="site-header">`，含品牌、导航（首页/标签/关于）、可选"写文章"按钮（`isAdmin()` 为真时）、主题切换按钮 |
| `renderFooter()` | 注入 `<footer class="site-footer">`，含版权年份 |
| `getPageName()` | 从 `location.pathname` 取当前页文件名，用于导航高亮 |

#### 数据加载

| 函数 | 说明 |
|------|------|
| `loadPosts()` | **核心数据入口**。带 `_postsCache` 缓存；优先 `fetch('./data/posts.json', {cache:'no-cache'})`，成功则按 `date` 倒序排序并缓存；失败则动态注入 `./data/posts.js` 读取 `window.__BLOG_POSTS__`；两条路径都失败则 reject |

#### Markdown 渲染管线

| 函数 | 说明 |
|------|------|
| `ensureMarkedLoaded()` | 返回 Promise；若 `window.marked` 已存在直接 resolve，否则动态注入 CDN 脚本 |
| `ensureHighlightLoaded()` | 返回 Promise；注入 highlight.js core 后批量加载 13 种语言包，全部完成才 resolve |
| `configureMarked()` | 配置 marked：自定义 `renderer.code` 调用 hljs 高亮；设置 `gfm:true, breaks:false` |
| `processReferences(md)` | **引用上标化预处理**。扫描 `[$TRAE_REF](url)` 模式，转为 `<sup>` 上标链接，并在文末追加"参考资料"小节（带回链 `↩`）。返回 `{markdown, refs}` |
| `renderMarkdown(md)` | 组合 `processReferences` + `marked.parse`；marked 未加载时降级为 `<pre>` 转义输出 |

#### 阅读进度

| 函数 | 说明 |
|------|------|
| `initReadingProgress()` | 优先使用 CSS `animation-timeline: scroll()`（现代浏览器）；不支持则用 JS `scroll` 事件 + `requestAnimationFrame` 降级，更新 `.reading-progress-bar` 的 `scaleX` |

#### 管理态判定

| 函数 | 说明 |
|------|------|
| `isAdmin()` | 检查 `localStorage('blog-admin-session')` 是否等于密码哈希，且时间戳在 7 天有效期内；过期则清理。用于导航栏显示"写文章"入口 |

### 6.2 `js/admin.js` → 管理后台逻辑

`admin.js` 同样以 IIFE 封装，不挂全局对象（仅操作 DOM）。关键常量与函数：

#### 常量

| 常量 | 值 | 说明 |
|------|-----|------|
| `STORAGE` | 对象 | 所有 localStorage 键名集中定义（`PW_HASH`/`PW_SALT`/`TOKEN`/`CFG`/`DRAFT`/`FAIL`/`LOCK`/`SESSION`/`SESSION_TS`） |
| `SESSION_DURATION` | `7 * 24 * 60 * 60 * 1000` | 会话有效期 7 天 |
| `DEFAULT_PASSWORD` | `"admin"` | 首次登录默认密码 |
| `DEFAULT_CFG` | `{owner,repo,branch,dataPath}` | GitHub 仓库默认配置 |
| `MAX_FAIL` | `3` | 最大密码失败次数 |
| `LOCK_MIN` | `5` | 锁定分钟数 |

#### 密码与加密

| 函数 | 说明 |
|------|------|
| `sha256(text)` | 用 `crypto.subtle.digest` 计算 SHA-256，返回十六进制字符串 |
| `randomSalt(len=16)` | 用 `crypto.getRandomValues` 生成随机 salt |
| `b64Encode(s)` / `b64Decode(s)` | Base64 编解码（支持 Unicode，用 `escape/unescape` 处理多字节） |
| `tryUnlock(password)` | **认证核心**。检查锁定状态 → 无哈希时用默认密码初始化 → 有哈希则比对 `sha256(salt:password)` → 成功清失败计数 / 失败累加并可能触发锁定 |
| `setSession()` / `clearSession()` | 写入/清理 7 天会话 |
| `isLockActive()` / `recordFail()` / `clearFail()` | 锁定状态机 |

#### GitHub API

| 函数 | 说明 |
|------|------|
| `ghHeaders(token)` | 构造请求头（Bearer token + Accept + Api-Version） |
| `ghGetFile(cfg, token)` | GET 读取 `posts.json`，base64 解码内容，返回 `{sha, content, missing}`；404 视为新文件 |
| `ghPutFile(cfg, token, content, sha, message)` | PUT 写回，带 `sha` 防并发覆盖；content 用 base64 编码 |
| `testConnection()` | GET 仓库元信息，显示权限位 |

#### 表单与发布

| 函数 | 说明 |
|------|------|
| `readFormToPost()` | 读取表单字段 → 构造文章对象 `{id,title,date,author,tags,excerpt,content}`；摘要为空时自动截取 |
| `slugify(title)` | 标题 → URL 友好 id（小写、连字符、保留中文、截断 40 字符） |
| `genId(title)` | `slugify` 包装，过短时加 `post-` 前缀 |
| `publishPost()` | **发布核心**。流程：读 Token → 读表单 → ghGetFile 拉旧数据 → 解析数组 → id 去重（冲突加 `-2/-3` 后缀）→ `unshift` 新文章 → ghPutFile 写回 → 清草稿 → Toast 提示 |
| `saveDraft()` / `loadDraft()` / `restoreDraft()` / `clearDraft()` | 草稿持久化（Base64 编码 JSON） |
| `updateCount()` | 实时统计字数/词数/字符数/阅读时长 |
| `insertAtCursor(ta, text)` | 在 textarea 光标处插入 Markdown 片段（支持选区包裹） |
| `showPreview()` | 复用 `Blog.renderMarkdown` 在弹层渲染预览 |
| `bind()` | 集中绑定所有事件（门禁/锁定/设置/工具栏/计数/提交/预览） |

### 6.3 `workbench/index.html` → 工作台引擎

工作台全部内联在单文件中，关键全局符号：

#### CONFIG 对象

工作台的**唯一配置入口**，集中定义：
- `storageKey`：`'workbench-cat-daily-v1'`（换 key 可强制重置数据）
- `owner` / `slogan`：侧栏标题
- `quotes`：一周七天每日一句（按星期轮换）
- `overview`：首页 4 个环形进度计算规则（`calc(data) => {value, sub}`）
- `trend`：本周趋势图数据源（读 `data.__trend`，7 个数字）
- `quickAdd`：4 个快速记录按钮配置
- `modules`：7 个模块定义（key/name/icon/tint/color/type/desc/seed/...）

#### 引擎函数

| 函数 | 说明 |
|------|------|
| `store.load()` / `store.save()` | localStorage 读写；无数据时用 `structuredClone(m.seed)` 初始化各模块 |
| `persist()` | `store.save() + render()`，所有写操作的统一出口 |
| `render()` | 根据 `view` 渲染主内容区 + 侧栏高亮 |
| `isoToday()` / `today()` | 当日 ISO 日期 |
| `avgProgress(list)` | 计算进度类模块的平均完成度 |
| `modOf(k)` | 按 key 查模块定义 |
| `startClock()` / `heartbeat()` | 全局秒级心跳，驱动时钟与番茄钟 |
| `pomoUpdate()` / `completePomo()` | 番茄钟 UI 更新与完成处理 |
| `ringSVG(pct, color)` | 生成环形进度 SVG |
| `trendSVG(series)` | 生成折线趋势 SVG（含面积填充与数据点） |
| `icon(name, size, sw)` | 单色线性图标渲染器（从 ICONS 库取 path） |
| `focusTileHTML()` / `quickTileHTML()` / `overviewTileHTML()` | 首页各 Tile 的 HTML 生成 |

---

## 7. 数据结构与数据流

### 7.1 文章数据结构（`data/posts.json`）

`posts.json` 是一个**文章对象数组**，按 `date` 倒序排列：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | string | ✅ | 唯一标识，URL 用作 `?id=xxx`，建议英文短横线 |
| `title` | string | ✅ | 文章标题 |
| `date` | string (YYYY-MM-DD) | ✅ | 发布日期，决定排序 |
| `author` | string | - | 作者名，默认 "Marker Chen" |
| `tags` | string[] | - | 标签数组，用于 tags 页和单标签筛选 |
| `excerpt` | string | - | 列表页摘要；留空则从正文自动截取 |
| `content` | string | ✅ | Markdown 正文 |

### 7.2 工作台数据结构（`localStorage`）

键 `workbench-cat-daily-v1` 存储一个 JSON 对象，结构由 `CONFIG.modules` 定义：

```json
{
  "todo":    [{ "id":11, "title":"...", "priority":"P0", "done":false, "note":"" }],
  "checkin": [{ "id":21, "title":"...", "log":{ "2026-09-28": true } }],
  "read":    [{ "id":31, "title":"...", "current":168, "target":300, "unit":"页", "note":"" }],
  "sport":   [{ "id":41, "title":"...", "current":12, "target":20, "unit":"分钟", "note":"" }],
  "money":   [{ "id":51, "title":"...", "type":"expense", "amount":32, "category":"餐饮", "date":"2026-09-28" }],
  "note":    [{ "id":61, "title":"...", "content":"...", "mood":"开心", "date":"2026-09-28" }],
  "hot":     [{ "id":71, "title":"...", "content":"...", "mood":"收藏", "date":"2026-09-28" }],
  "__pomo":  { "count": 0, "min": 0 },
  "__trend": [0,0,0,0,0,0,0]
}
```

### 7.3 后台 localStorage 键

| 键 | 内容 | 编码 |
|----|------|------|
| `blog-admin-pw-hash` | 密码 SHA-256 哈希 | 十六进制字符串 |
| `blog-admin-pw-salt` | 随机 salt | 十六进制字符串 |
| `blog-admin-token` | GitHub PAT | Base64 |
| `blog-admin-cfg` | 仓库配置 JSON | Base64 |
| `blog-admin-draft` | 草稿 JSON | Base64 |
| `blog-admin-fail` | 连续失败次数 | 数字字符串 |
| `blog-admin-lock-until` | 锁定截止时间戳 | 数字字符串 |
| `blog-admin-session` | 会话标识（=密码哈希） | 字符串 |
| `blog-admin-session-ts` | 会话起始时间戳 | 数字字符串 |
| `blog-theme` | 主题偏好 | `'light'` / `'dark'` |

### 7.4 模块间依赖关系

```
┌──────────────────────────────────────────────────────────────┐
│                       HTML 页面层                             │
│  index/post/tags/tag/about/404/admin + workbench/index       │
└──────────────┬───────────────────────────────────┬──────────┘
               │                                    │
               ▼                                    ▼
┌──────────────────────────────┐   ┌──────────────────────────────┐
│      js/app.js (Blog)        │   │     js/admin.js (Admin)       │
│                              │   │                              │
│  - loadPosts()               │   │  - tryUnlock() (依赖 sha256)  │
│  - renderMarkdown()          │   │  - publishPost()             │
│  - renderHeader/Footer()     │   │    (依赖 ghGetFile/ghPutFile)│
│  - applyTheme/toggleTheme()  │   │  - showPreview() ──┐         │
│  - isAdmin()                 │   │  - updateCount()   │         │
└──────────┬───────────────────┘   └─────────┬─────────┘         │
           │                                  │                   │
           │  admin.js 复用 Blog.*             │                   │
           │  (renderMarkdown, extractExcerpt, │                   │
           │   estimateReadingTime, applyTheme)│                   │
           └──────────────────────────────────-┘                   │
                ▲                                                │
                │  showPreview() 复用 Blog.renderMarkdown ─────────┘
                │
                ▼
┌──────────────────────────────┐
│        数据层                 │
│                              │
│  data/posts.json (主)        │
│  data/posts.js  (回退)       │
│  localStorage (主题/后台/工作台)│
└──────────────────────────────┘
```

**关键依赖关系说明**：
1. 所有博客页面 → 依赖 `app.js` 提供的 `window.Blog`
2. `admin.html` → 同时依赖 `app.js`（复用渲染/主题/工具）和 `admin.js`（认证/发布）
3. `admin.js` 的 `showPreview()` → 复用 `Blog.renderMarkdown()`
4. `admin.js` 的 `updateCount()` → 复用 `Blog.estimateReadingTime()`
5. `loadPosts()` → 优先依赖 `posts.json`，回退依赖 `posts.js`
6. 工作台 `workbench/index.html` → **完全独立**，不依赖 `app.js`/`admin.js`/`posts.*`

---

## 8. 项目运行方式

### 8.1 本地预览（博客主站 + 工作台）

任意静态文件服务即可，在仓库根目录执行：

```bash
# Python 3
python -m http.server 8080

# Node
npx http-server -p 8080
```

访问地址：
- 博客首页：http://localhost:8080/
- 文章示例：http://localhost:8080/post.html?id=ai-news-2026-09-28
- 标签页：http://localhost:8080/tags.html
- 管理后台：http://localhost:8080/admin.html
- 工作台：http://localhost:8080/workbench/

> **注意**：`admin.html` 的发布功能在本地预览下也能用，但 GitHub PAT 必须有 `user-unknowed/markerchenshouse` 仓库的 **Contents: Read and write** 权限。

### 8.2 管理后台首次使用

1. **设置密码**：打开 `admin.html` → 输入默认密码 `admin` → 系统自动用 SHA-256 + 随机 salt 哈希后存入 localStorage
2. **配置 GitHub**：点「⚙ 设置」→ 填写 owner/repo/branch/dataPath + Personal Access Token
   - Token 必须有 `user-unknowed/markerchenshouse` 仓库的 **Contents: Read and write** 权限
   - **强烈建议**用 [Fine-grained PAT](https://github.com/settings/tokens?type=beta)，只勾这一个仓库 + Contents 写权限
   - Token 用 Base64 编码存于 localStorage（仅防 XSS 一眼看到，不是真加密）
3. **测试连接**：点「测试连接」验证 Token 与权限
4. **写文章**：填写标题/日期/作者/标签/摘要/正文 → 点「发布到 GitHub」→ 几秒后成功 → GitHub Actions 自动部署 → 1-2 分钟内线上更新

### 8.3 直接编辑数据（无需后台）

在 `data/posts.json` 数组**开头**（倒序展示用）追加一条：

```json
{
  "id": "my-new-post",
  "title": "我的新文章",
  "date": "2026-07-12",
  "author": "Marker Chen",
  "tags": ["随笔", "生活"],
  "excerpt": "一段简短摘要…",
  "content": "# 标题\n\n正文 Markdown …"
}
```

保存后 `git add && git commit && git push`，无需改任何代码 —— 首页会自动按 `date` 倒序展示，GitHub Actions 自动部署。

### 8.4 工作台使用

- 直接打开 `workbench/index.html`（本地）或访问线上 `/workbench/`
- 所有数据存于浏览器 `localStorage`，**仅本地设备可见**，不跨设备同步
- 清理浏览器数据会丢失工作台记录，请谨慎操作
- 如需重置：在 devtools 删除 `localStorage` 的 `workbench-cat-daily-v1` 键，或修改 `CONFIG.storageKey`

---

## 9. 部署流程

### 9.1 部署架构

```
main 分支（源码） ──push──> GitHub Actions ──部署──> gh-pages 分支（站点）
                                                     ↓
                                               GitHub Pages CDN
                                               user-unknowed.github.io/markerchenshouse/
```

### 9.2 部署工作流（`.github/workflows/deploy-workbench.yml`）

| 项 | 值 |
|----|----|
| 工作流名称 | Deploy Cat Daily (Blog + Workbench) to GitHub Pages |
| 仓库 | `user-unknowed/markerchenshouse` |
| 源码分支 | `main` |
| 部署分支 | `gh-pages` |
| Action | `peaceiris/actions-gh-pages@v4` |
| `publish_dir` | `./`（整站根目录） |
| `exclude_assets` | `.github`、`.gitignore`、`README.md` |
| Pages 源 | `gh-pages` 分支根目录 |
| HTTPS | 强制 |
| 权限 | `contents: write` |
| 并发控制 | `group: "pages-workbench"`，`cancel-in-progress: false` |

### 9.3 触发条件

push 到 `main` 分支且改动以下任一路径时自动触发：

- `workbench/**`
- `css/**`
- `js/**`
- `data/**`
- `*.html`
- `.nojekyll`
- `.github/workflows/deploy-workbench.yml`

也可在 GitHub Actions 页面手动触发（`workflow_dispatch`）。

### 9.4 Pages 源切换（已完成使命）

`.github/workflows/switch-pages-source.yml` 历史上一次性将 Pages 源从 `main` 切换到 `gh-pages`：
- 通过 `gh api repos/{repo}/pages -X PUT` 修改 `source[branch]=gh-pages`、`source[path]=/`
- 已完成使命，保留作记录
- 如需再次切换，可在仓库 Settings → Pages 页面手动修改

---

## 10. 安全机制

### 10.1 管理后台安全

| 机制 | 实现 |
|------|------|
| 密码哈希 | SHA-256 + 随机 salt，存 `localStorage('blog-admin-pw-hash')` |
| 失败锁定 | 连续 3 次错误 → 锁定 5 分钟（`blog-admin-lock-until`） |
| 会话有效期 | 7 天（`blog-admin-session-ts` + `SESSION_DURATION`） |
| Token 存储 | Base64 编码存 localStorage（仅防 XSS 一眼看到，非真加密） |
| Token 范围 | 强烈建议 Fine-grained PAT，仅勾选目标仓库 + Contents 写权限 |
| 真正安全边界 | 依赖 PAT 本身的 scope 限制，而非浏览器端编码 |
| 公网隐藏入口 | `about.html` 页面最底部有一个几乎不可见的「·」符号，hover 变明显 |

### 10.2 忘记密码

密码哈希仅存浏览器 localStorage，无远程备份。找回方法：在同一个浏览器里清掉 `localStorage` 的 `blog-admin-pw-hash` 键即可重设。

### 10.3 XSS 防护

- `Blog.escapeHtml()` 对用户内容（标题、作者、摘要、标签）统一转义后再插入 DOM
- Markdown 渲染依赖 marked.js 的默认转义；代码块经 hljs 高亮后用 `escapeHtml` 兜底

### 10.4 工作台数据局限

- 所有数据存于浏览器 `localStorage`，**仅本地设备可见**
- 不支持跨设备同步，不支持云端备份
- 清理浏览器数据会丢失全部工作台记录

---

## 11. 关键设计决策

### 11.1 无后端架构

**决策**：博客主站完全无服务端，文章发布通过浏览器端直接调 GitHub Contents API。

**理由**：
- 个人项目，无需数据库与服务器运维成本
- GitHub Pages 免费托管 + HTTPS 强制
- Contents API 的 PUT 天然触发 Actions 重新部署，形成"写即发"闭环

**代价**：PAT 存于浏览器，安全性依赖 PAT scope 限制。

### 11.2 双数据源回退（posts.json + posts.js）

**决策**：`loadPosts()` 优先 `fetch('./data/posts.json')`，失败时动态注入 `./data/posts.js`。

**理由**：
- 某些静态托管环境对 `.json` 的 MIME 或 CORS 处理不一致
- `posts.js` 作为 `var posts = [...]` 的 JS 文件，加载后赋值给 `window.__BLOG_POSTS__`，绕过 fetch 限制
- 两条路径数据保持同步（手动维护或脚本生成）

### 11.3 主题防闪烁（FOUC）

**决策**：每个 HTML `<head>` 内联一段同步脚本，在 CSS 加载前就读 `localStorage('blog-theme')` 并设置 `document.documentElement.setAttribute('data-theme', t)`。

**理由**：避免页面先以默认主题渲染、再跳变为存储主题的闪烁现象。

### 11.4 引用上标化（`[$TRAE_REF]`）

**决策**：自定义 Markdown 扩展 `[$TRAE_REF](url)`，由 `processReferences()` 转为上标链接 + 文末参考资料小节。

**理由**：支持 AI 辅助写作时插入可溯源的来源引用，并在渲染时自动整理为带回链的参考资料列表。

### 11.5 工作台单文件 SPA

**决策**：`workbench/index.html` 将 HTML + CSS + JS 全部内联在单文件中（约 1428 行），无任何外部依赖。

**理由**：
- 零网络依赖，离线可用
- 部署简单（一个文件即整个应用）
- 数据完全本地化，隐私可控
- CONFIG 集中定义所有模块/种子数据/主题色，"一处改色，整站换肤"

### 11.6 CDN 按需加载

**决策**：marked.js 与 highlight.js 不在 HTML 中静态引入，而是在 `app.js` 中按需动态注入（`ensureMarkedLoaded` / `ensureHighlightLoaded`）。

**理由**：
- 列表页（index/tags）只需渲染摘要，无需加载 Markdown 渲染器
- 仅 `post.html`（文章详情）与 `admin.html`（预览）需要完整渲染管线
- 按需加载减少首屏字节量

### 11.7 `.nojekyll` 文件

**决策**：根目录与 `workbench/` 均放置 `.nojekyll` 文件。

**理由**：禁用 GitHub Pages 默认的 Jekyll 预处理，避免以下划线开头的资源（如某些 JS 模块）被 Jekyll 忽略。

---

## 附录：浏览器兼容性

- 现代浏览器（Chrome / Edge / Firefox / Safari 最近 2 年版本）
- 移动端响应式断点 720px（博客）/ 自适应（工作台，工作台 `min-width: 1000px` 偏桌面优先）
- 不支持 IE
- 工作台使用 `structuredClone`、`crypto.subtle`、`animation-timeline`（可选）等现代 API

---

*本文档由代码静态分析生成，反映截至 2026-09-28 的仓库状态。如代码变更，请同步更新本文档。*
