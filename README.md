# Marker Chen 的小站

陈尹涛（Marker Chen）的个人小站 —— 包含一个记录读书、编程与 vibe coding 的博客，以及一份"卡通小猫 × 复古报刊编辑部"风格的喵生编辑部工作台。

- 线上地址：https://user-unknowed.github.io/markerchenshouse/
- 工作台：https://user-unknowed.github.io/markerchenshouse/workbench/
- 仓库：https://github.com/user-unknowed/markerchenshouse

> 最后更新：2026-08-02

---

## 技术栈

### 博客主站

- 纯静态站点：HTML / CSS / JavaScript，**无后端**
- Markdown 渲染：[marked.js](https://marked.js.org/) v12（CDN）
- 代码高亮：[highlight.js](https://highlightjs.org/) v11（CDN，按需加载语言包）
- 主题切换：CSS 变量 + `localStorage`（首屏内联脚本提前应用，避免闪烁）
- 文章发布：浏览器端 + GitHub Contents API（无服务端，Pages 自动重新部署）

### 喵生编辑部工作台

- 纯前端单页应用（桌面版 + 移动版）
- 数据存储：浏览器 `localStorage`（仅本地设备，不跨设备同步）
- 视觉风格：米白旧报纸底纹 + 浅棕文字 + 橘黄/墨绿点缀，搭配手绘小猫、橡皮戳印、胶带、铅笔批注

### 部署

- GitHub Pages（公开仓库，HTTPS 强制）
- 部署分支：`gh-pages`（由 GitHub Actions 自动构建）
- 源码分支：`main`

---

## 目录结构

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
│   ├── posts.json          # 文章数据（JSON 数组，倒序展示，详见「文章数据结构」）
│   └── posts.js            # 文章数据 JS 模块版本
│
├── workbench/              # 喵生编辑部工作台（详见「喵生编辑部工作台」章节）
│   ├── index.html          # 工作台桌面版入口
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
├── README.md               # 本文件
└── .gitignore              # Git 忽略规则（排除 .workbuddy/、node_modules/ 等）
```

> 注：`.workbuddy/` 和 `.trae/` 是本地工具数据目录，**不提交到仓库**（已在 `.gitignore` 中排除）。

---

## 喵生编辑部工作台

一份"卡通小猫 × 复古报刊编辑部"风格的个人工作台，整体像一份每天更新的猫咪生活报。

### 访问

- **线上**：https://user-unknowed.github.io/markerchenshouse/workbench/
- **本地**：直接打开 `workbench/index.html`

### 风格

- **底纹**：米白色旧报纸 + 浅棕色文字
- **点缀色**：橘黄（#c4651e）与墨绿（#4a6b3e）
- **装饰元素**：手绘橘猫插画、报纸分栏、邮票、胶带、铅笔批注、橡皮戳印"THE CAT DAILY · 喵生纪事"

### 功能模块

| 模块 | 说明 |
|------|------|
| 每日计划 | 今日待办清单，可勾选完成 |
| 习惯打卡 | 长期习惯追踪，每日打卡 |
| 记账本 | 收支记录与简单统计 |
| 心情日记 | 每日心情与简短记录 |
| 洞察复盘 | 周期性回顾与总结 |

### 数据存储

- 所有数据存于浏览器 `localStorage`，**仅本地设备可见**
- 不支持跨设备同步，不支持云端备份
- 清理浏览器数据会丢失工作台记录，请谨慎操作

---

## 404 页面

全站自定义 404 页面，与喵生编辑部风格统一。

### 根级 404（`/404.html`）

- 访问任意不存在的根级路径时触发（如 `/markerchenshouse/nonexistent-page`）
- 显示"糟糕！这个版面被猫咪藏起来了"标题
- 提供**两张导航卡片**：
  - 博客主站 BLOG → `/markerchenshouse/`
  - 工作台 WORKBENCH → `/markerchenshouse/workbench/`
- 装饰：手绘小猫 SVG、"LOST · 404 · 版面寻回中"橡皮戳印、胶带

### 工作台 404（`/workbench/404.html`）

- 访问工作台子目录下不存在的路径时触发
- 提供"回到头版"和"返回上一版"两个按钮

---

## 文章数据结构

`data/posts.json` 是一个**文章对象数组**，按 `date` 倒序排列，字段如下：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | string | ✅ | 唯一标识，URL 用作 `?id=xxx`，建议英文短横线 |
| `title` | string | ✅ | 文章标题 |
| `date` | string (YYYY-MM-DD) | ✅ | 发布日期，决定排序 |
| `author` | string | - | 作者名，默认 "Marker Chen" |
| `tags` | string[] | - | 标签数组，用于 tags 页和单标签筛选 |
| `excerpt` | string | - | 列表页摘要；留空则从正文自动截取 |
| `content` | string | ✅ | Markdown 正文 |

### 添加一篇文章

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

保存后**无需改任何代码** —— 首页会自动按 `date` 倒序展示。

### 两种发布方式

| 方式 | 操作 | 适用 |
|------|------|------|
| **A. admin 后台**（推荐） | 打开 `admin.html` → 填表 → 点「发布到 GitHub」 | 个人日常发布，无需 git |
| **B. 直接编辑** | 编辑 `data/posts.json` → `git add/commit/push` | 批量改文、迁移数据 |

---

## 文章发布后台（admin.html）

### 入口

- **线上**：https://user-unknowed.github.io/markerchenshouse/admin.html
- **公网隐藏入口**：`about.html` 页面**最底部**有一个几乎不可见的「·」符号，hover 会变明显 —— 别人注意不到，博主自己记得位置
- **本地**：直接打开 `admin.html`

### 首次使用

1. 设置一个 ≥ 6 位的管理密码（存于浏览器 `localStorage`，SHA-256 + 随机 salt 哈希）
2. 点「⚙ 设置」填 GitHub Personal Access Token
   - Token 必须有 `user-unknowed/markerchenshouse` 仓库的 **Contents: Read and write** 权限
   - **强烈建议**用 [Fine-grained PAT](https://github.com/settings/tokens?type=beta)，只勾这一个仓库 + Contents 写权限
   - Token 用 Base64 编码存于 localStorage（仅防 XSS 一眼看到，不是真加密；真正安全靠 PAT 本身的 scope 限制）
3. 点「测试连接」验证 Token 可用

### 写文章

- 表单字段：标题、日期、作者、标签（逗号分隔）、摘要、Markdown 正文
- 工具栏：粗体 / 斜体 / 行内代码 / 代码块 / 标题 / 列表 / 引用 / 链接 / 图片
- **实时统计**：字数（中文字数 + 英文单词数）+ 阅读时长预估
- **本地预览**：点「本地预览」弹层查看渲染效果（不发布）
- **草稿自动保存**：每次输入自动存到 localStorage，刷新页面不丢
- 点「发布到 GitHub」→ 几秒后发布成功 → GitHub Actions 自动部署到 gh-pages → 1-2 分钟内线上更新

### 安全机制

- 密码错误 3 次锁定 5 分钟
- PAT 仅存浏览器，**不会上传任何位置**
- 忘了密码：在浏览器 devtools 删除 `localStorage` 里的 `blog-admin-pw-hash` 键即可重设

---

## 本地预览

任意静态文件服务即可（根目录是 `F:\my blog`）：

```bash
# Python 3
python -m http.server 8080

# Node
npx http-server -p 8080
```

打开 http://localhost:8080/ 查看博客，http://localhost:8080/workbench/ 查看工作台。

> 注意：`admin.html` 里的发布功能在本地预览下也能用，但 GitHub PAT 必须有仓库写权限。

---

## 部署

### 架构

```
main 分支（源码） ──push──> GitHub Actions ──部署──> gh-pages 分支（站点）
                                                     ↓
                                               GitHub Pages CDN
                                               user-unknowed.github.io/markerchenshouse/
```

### 部署工作流

| 项 | 值 |
|----|----|
| 仓库 | `user-unknowed/markerchenshouse` |
| 源码分支 | `main` |
| 部署分支 | `gh-pages` |
| 工作流文件 | `.github/workflows/deploy-workbench.yml` |
| Action | `peaceiris/actions-gh-pages@v4` |
| publish_dir | `./`（整站根目录） |
| exclude_assets | `.github`、`.gitignore`、`README.md` |
| Pages 源 | `gh-pages` 分支根目录 |
| HTTPS | 强制 |

### 触发条件

push 到 `main` 分支且改动以下任一路径时自动触发部署：

- `workbench/**`
- `css/**`
- `js/**`
- `data/**`
- `*.html`
- `.nojekyll`
- `.github/workflows/deploy-workbench.yml`

也可在 GitHub Actions 页面手动触发（`workflow_dispatch`）。

### Pages 源切换

历史上通过 `.github/workflows/switch-pages-source.yml` 工作流一次性将 Pages 源从 `main` 切换到 `gh-pages`（已完成使命，保留作记录）。如需再次切换，可在仓库 Settings → Pages 页面手动修改。

---

## 主题

通过页面右上角的图标切换亮色 / 暗色，偏好存到 `localStorage` 键 `blog-theme`。每个 HTML `<head>` 里有一段内联脚本，**在 CSS 加载前**就根据存储值设置 `data-theme`，避免闪烁。

---

## 浏览器兼容性

- 现代浏览器（Chrome / Edge / Firefox / Safari 最近 2 年版本）
- 移动端响应式断点 720px（博客）/ 自适应（工作台）
- 不支持 IE

---

## 关于

- 邮箱：wassup666666@qq.com
- GitHub：https://github.com/user-unknowed
- 活跃项目：
  - StarIsle（青少年心理健康 AI 陪伴应用）：https://github.com/user-unknowed/-StarIsle-
  - 读书笔记：https://github.com/user-unknowed/reading--note

## 许可

仅个人项目，未经许可请勿转载。
