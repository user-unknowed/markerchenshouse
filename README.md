# Marker Chen 的小站

陈尹涛（Marker Chen）的个人博客 —— 记录读书、编程与 vibe coding 的地方。

- 线上地址：https://user-unknowed.github.io/markerchenshouse/
- 仓库：https://github.com/user-unknowed/markerchenshouse

---

## 技术栈

- 纯静态站点：HTML / CSS / JavaScript，**无后端**
- Markdown 渲染：[marked.js](https://marked.js.org/) v12（CDN）
- 代码高亮：[highlight.js](https://highlightjs.org/) v11（CDN，按需加载语言包）
- 主题切换：CSS 变量 + `localStorage`（首屏内联脚本提前应用，避免闪烁）
- 文章发布：浏览器端 + GitHub Contents API（无服务端，Pages 自动重新部署）
- 部署：GitHub Pages（公开仓库，main 分支，HTTPS）

---

## 目录结构

```
.
├── index.html        # 首页：文章列表（每页 10 篇，按日期倒序 + 分页）
├── post.html         # 文章详情：根据 ?id=xxx 渲染 Markdown 内容
├── tags.html         # 标签总览：所有标签及对应文章数
├── tag.html          # 单标签下的文章列表（?name=xxx）
├── about.html        # 关于页：个人信息、爱好、项目、联系方式
├── admin.html        # 【管理后台入口】密码登录 + Markdown 编辑器（公网低调入口在 about 页底部）
│
├── css/
│   └── style.css     # 全局样式 + 亮色 / 暗色主题 + admin 后台样式
│
├── js/
│   ├── app.js        # 共用脚本：数据加载、Markdown 渲染、主题切换、导航/页脚注入
│   └── admin.js      # 管理后台逻辑：SHA-256 密码认证、PAT 存储、GitHub API 发布、草稿
│
├── data/
│   └── posts.json    # 文章数据（JSON 数组，倒序展示，详见「文章数据结构」）
│
├── README.md         # 本文件
└── .gitignore        # Git 忽略规则（排除 .workbuddy/、node_modules/ 等本地数据）
```

> 注：`.workbuddy/` 是 WorkBuddy 的本地记忆/工作日志目录，**不提交到仓库**（已在 `.gitignore` 中排除）。

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
- 点「发布到 GitHub」→ 几秒后发布成功 → GitHub Pages 1-2 分钟内自动重新部署

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

打开 http://localhost:8080/

> 注意：`admin.html` 里的发布功能在本地预览下也能用，但 GitHub PAT 必须有仓库写权限。

---

## 部署

| 项 | 值 |
|----|----|
| 仓库 | `user-unknowed/markerchenshouse` |
| 分支 | `main` |
| 路径 | `/`（仓库根） |
| Pages 类型 | legacy（项目页，自动从 `user-unknowed.github.io/markerchenshouse/` 提供服务） |
| HTTPS | 强制 |

通过 `POST /repos/{owner}/{repo}/pages` 启用，body：

```json
{ "source": { "branch": "main", "path": "/" }, "build_type": "legacy" }
```

每次 `git push` 到 main，Pages 自动重新部署（通常 1-2 分钟）。

---

## 主题

通过页面右上角的图标切换亮色 / 暗色，偏好存到 `localStorage` 键 `blog-theme`。每个 HTML `<head>` 里有一段内联脚本，**在 CSS 加载前**就根据存储值设置 `data-theme`，避免闪烁。

---

## 浏览器兼容性

- 现代浏览器（Chrome / Edge / Firefox / Safari 最近 2 年版本）
- 移动端响应式断点 720px
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
