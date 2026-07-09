/* =========================================================
   博客主题 - 共用脚本
   - 数据加载 (posts.json)
   - Markdown 渲染 (marked + highlight.js)
   - 主题切换（持久化到 localStorage）
   - 顶部导航 / 页脚注入
   - 工具函数
   ========================================================= */

(function (global) {
  "use strict";

  // ---------- 工具函数 ----------
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function formatDate(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  // 估算阅读时长（中文按每分钟 300 字，英文按 200 词）
  function estimateReadingTime(content) {
    if (!content) return 1;
    const cnChars = (content.match(/[\u4e00-\u9fa5]/g) || []).length;
    const enWords = (content.replace(/[\u4e00-\u9fa5]/g, " ").match(/[a-zA-Z]+/g) || []).length;
    const minutes = Math.ceil(cnChars / 300 + enWords / 200);
    return Math.max(1, minutes);
  }

  // 提取纯文本摘要（去 markdown 标记），用于列表页预览
  function extractExcerpt(content, maxLen = 160) {
    if (!content) return "";
    let text = content
      .replace(/```[\s\S]*?```/g, " ")        // 代码块
      .replace(/`[^`]*`/g, " ")                 // 行内代码
      .replace(/!\[.*?\]\(.*?\)/g, " ")          // 图片
      .replace(/\[(.*?)\]\(.*?\)/g, "$1")        // 链接保留文字
      .replace(/^#{1,6}\s*/gm, "")               // 标题
      .replace(/[*_>~\-]+/g, " ")                // 强调/引用
      .replace(/\n+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (text.length > maxLen) text = text.slice(0, maxLen).trim() + "…";
    return text;
  }

  function escapeHtml(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  // ---------- 主题切换 ----------
  const THEME_KEY = "blog-theme";
  function getSavedTheme() {
    return localStorage.getItem(THEME_KEY) || "light";
  }
  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(THEME_KEY, theme);
    const btn = $(".theme-toggle");
    if (btn) {
      btn.setAttribute("aria-label", theme === "dark" ? "切换到亮色" : "切换到暗色");
      btn.innerHTML = theme === "dark" ? sunIcon() : moonIcon();
    }
  }
  function toggleTheme() {
    const cur = document.documentElement.getAttribute("data-theme") || "light";
    applyTheme(cur === "dark" ? "light" : "dark");
  }
  function sunIcon() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>';
  }
  function moonIcon() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
  }

  // ---------- 布局注入：导航 / 页脚 ----------
  const NAV_ITEMS = [
    { href: "./index.html", label: "首页" },
    { href: "./tags.html",  label: "标签" },
    { href: "./about.html", label: "关于" },
  ];

  function getPageName() {
    const file = (location.pathname.split("/").pop() || "index.html").toLowerCase();
    return file || "index.html";
  }

  function renderHeader() {
    const page = getPageName();
    const links = NAV_ITEMS.map((it) => {
      const active = page === it.href.replace(/^\.\//, "") ? " active" : "";
      return `<a href="${it.href}" class="${active.trim()}">${it.label}</a>`;
    }).join("");
    const html = `
      <header class="site-header">
        <div class="nav-inner">
          <a class="brand" href="./index.html">Marker<span class="dot">'s</span> House</a>
          <div class="nav-links">
            ${links}
            <button class="theme-toggle" type="button" aria-label="切换主题"></button>
          </div>
        </div>
      </header>`;
    const mount = $("#site-header");
    if (mount) mount.outerHTML = html;
    const btn = $(".theme-toggle");
    if (btn) btn.addEventListener("click", toggleTheme);
  }

  function renderFooter() {
    const year = new Date().getFullYear();
    const html = `
      <footer class="site-footer">
        © ${year} 陈尹涛 / Marker Chen · Powered by WorkBuddy · Built with ❤
      </footer>`;
    const mount = $("#site-footer");
    if (mount) mount.outerHTML = html;
  }

  // ---------- 数据加载 ----------
  let _postsCache = null;
  async function loadPosts() {
    if (_postsCache) return _postsCache;
    const res = await fetch("./data/posts.json", { cache: "no-cache" });
    if (!res.ok) throw new Error("加载文章数据失败: " + res.status);
    const data = await res.json();
    // 按发布时间倒序
    data.sort((a, b) => new Date(b.date) - new Date(a.date));
    _postsCache = data;
    return data;
  }

  // ---------- Markdown 渲染 ----------
  function ensureMarkedLoaded() {
    return new Promise((resolve, reject) => {
      if (typeof window.marked !== "undefined") return resolve();
      const s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/marked@12.0.2/marked.min.js";
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("marked.js 加载失败"));
      document.head.appendChild(s);
    });
  }
  function ensureHighlightLoaded() {
    return new Promise((resolve, reject) => {
      if (typeof window.hljs !== "undefined") return resolve();

      const s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/highlight.js@11.9.0/lib/core.min.js";
      s.onload = () => {
        // 注册常用语言
        const langs = ["javascript", "typescript", "python", "java", "go",
                       "c", "cpp", "bash", "json", "xml", "css", "sql", "markdown"];
        let loaded = 0;
        const total = langs.length;
        if (total === 0) return resolve();
        langs.forEach((lang) => {
          const ls = document.createElement("script");
          ls.src = `https://cdn.jsdelivr.net/npm/highlight.js@11.9.0/lib/languages/${lang}.min.js`;
          ls.onload = ls.onerror = () => {
            loaded++;
            if (loaded === total) resolve();
          };
          document.head.appendChild(ls);
        });
      };
      s.onerror = () => reject(new Error("highlight.js 加载失败"));
      document.head.appendChild(s);
    });
  }

  function configureMarked() {
    if (typeof window.marked === "undefined") return;
    const renderer = new window.marked.Renderer();
    // 让代码块带 hljs 高亮
    const origCode = renderer.code.bind(renderer);
    renderer.code = function (code, infostring) {
      // marked v12 的新签名：code(code, infostring, escaped)
      let lang = (infostring || "").match(/\S*/)[0];
      let codeStr = typeof code === "string" ? code : (code && code.text ? code.text : "");
      if (lang && typeof window.hljs !== "undefined" && window.hljs.getLanguage(lang)) {
        try {
          const highlighted = window.hljs.highlight(codeStr, { language: lang }).value;
          return `<pre><code class="hljs language-${lang}">${highlighted}</code></pre>`;
        } catch (_) {}
      }
      const escaped = escapeHtml(codeStr);
      return `<pre><code class="hljs">${escaped}</code></pre>`;
    };

    // 兼容 marked v12：保留换行
    window.marked.setOptions({
      renderer,
      gfm: true,
      breaks: false,
      pedantic: false,
    });
  }

  function renderMarkdown(md) {
    if (typeof window.marked === "undefined") {
      return `<pre>${escapeHtml(md)}</pre>`;
    }
    return window.marked.parse(md || "");
  }

  // ---------- 暴露 API ----------
  global.Blog = {
    $,
    $$,
    formatDate,
    estimateReadingTime,
    extractExcerpt,
    escapeHtml,
    applyTheme,
    getSavedTheme,
    renderHeader,
    renderFooter,
    loadPosts,
    ensureMarkedLoaded,
    ensureHighlightLoaded,
    configureMarked,
    renderMarkdown,
    getPageName,
  };
})(window);
