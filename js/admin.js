/* =========================================================
   admin.js - 管理后台业务逻辑
   - 密码认证（SHA-256 hash + 失败次数限制）
   - GitHub Contents API：读取 + 追加 + 写回 posts.json
   - Markdown 编辑器：字数统计、阅读时长、工具栏
   - 本地预览（marked.js 复用 app.js 的）
   - 草稿保存到 localStorage
   ========================================================= */

(function () {
  "use strict";

  // ---------- 常量 ----------
  const STORAGE = {
    PW_HASH: "blog-admin-pw-hash",
    PW_SALT: "blog-admin-pw-salt",
    TOKEN:   "blog-admin-token",
    CFG:     "blog-admin-cfg",
    DRAFT:   "blog-admin-draft",
    FAIL:    "blog-admin-fail",
    LOCK:    "blog-admin-lock-until",
  };
  const DEFAULT_CFG = {
    owner: "user-unknowed",
    repo:  "markerchenshouse",
    branch: "main",
    dataPath: "data/posts.json",
  };
  const MAX_FAIL = 3;
  const LOCK_MIN = 5;

  // ---------- 工具 ----------
  const $ = (id) => document.getElementById(id);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  async function sha256(text) {
    const enc = new TextEncoder().encode(text);
    const buf = await crypto.subtle.digest("SHA-256", enc);
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  function randomSalt(len = 16) {
    const arr = new Uint8Array(len);
    crypto.getRandomValues(arr);
    return Array.from(arr)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  function b64Encode(s) {
    return btoa(unescape(encodeURIComponent(s)));
  }
  function b64Decode(s) {
    return decodeURIComponent(escape(atob(s)));
  }

  function escapeHtml(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function showToast(msg, kind = "info", duration = 3200) {
    const el = $("toast");
    el.textContent = msg;
    el.className = "toast toast-" + kind;
    el.hidden = false;
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => (el.hidden = true), duration);
  }

  // slugify：英文 -> id；中文 -> pinyin 太复杂，用 hash 后缀
  function slugify(title) {
    const base = (title || "")
      .toLowerCase()
      .replace(/[\s\u3000]+/g, "-")
      .replace(/[^\w\u4e00-\u9fa5-]/g, "")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40);
    if (!base) {
      return "post-" + Date.now().toString(36);
    }
    return base;
  }

  function genId(title) {
    let id = slugify(title);
    if (id.length < 4) id = "post-" + id;
    return id;
  }

  // ---------- 密码认证 ----------
  let isUnlocked = false;

  function isLockActive() {
    const until = parseInt(localStorage.getItem(STORAGE.LOCK) || "0", 10);
    return until > Date.now();
  }

  function recordFail() {
    let n = parseInt(localStorage.getItem(STORAGE.FAIL) || "0", 10) + 1;
    localStorage.setItem(STORAGE.FAIL, String(n));
    if (n >= MAX_FAIL) {
      const until = Date.now() + LOCK_MIN * 60 * 1000;
      localStorage.setItem(STORAGE.LOCK, String(until));
      localStorage.setItem(STORAGE.FAIL, "0");
    }
    return n;
  }

  function clearFail() {
    localStorage.removeItem(STORAGE.FAIL);
    localStorage.removeItem(STORAGE.LOCK);
  }

  async function tryUnlock(password) {
    if (isLockActive()) {
      const until = parseInt(localStorage.getItem(STORAGE.LOCK), 10);
      const left = Math.ceil((until - Date.now()) / 60000);
      throw new Error(`登录失败次数过多，请 ${left} 分钟后再试`);
    }
    const storedHash = localStorage.getItem(STORAGE.PW_HASH);
    const salt = localStorage.getItem(STORAGE.PW_SALT) || "";
    if (!storedHash) {
      // 首次设置
      if (!password || password.length < 6) {
        throw new Error("密码至少 6 位");
      }
      const newSalt = randomSalt();
      const hash = await sha256(newSalt + ":" + password);
      localStorage.setItem(STORAGE.PW_SALT, newSalt);
      localStorage.setItem(STORAGE.PW_HASH, hash);
      return true;
    }
    const hash = await sha256(salt + ":" + password);
    if (hash === storedHash) {
      clearFail();
      return true;
    }
    const n = recordFail();
    if (n >= MAX_FAIL) {
      throw new Error(`已连续输错 ${MAX_FAIL} 次，账户锁定 ${LOCK_MIN} 分钟`);
    }
    throw new Error(`密码错误（还可重试 ${MAX_FAIL - n} 次）`);
  }

  function lockSession() {
    isUnlocked = false;
    $("editor-panel").hidden = true;
    $("gate-panel").hidden = false;
    $("pw-input").value = "";
    $("pw-input-2").value = "";
    $("gate-error").hidden = true;
    switchToSetMode(hasPassword());
  }

  function hasPassword() {
    return !!localStorage.getItem(STORAGE.PW_HASH);
  }

  function switchToSetMode(isSet) {
    const sub = $("gate-sub");
    const title = $("gate-title");
    const label = $("pw-label");
    const confirm = $("pw-confirm-wrap");
    if (isSet) {
      title.textContent = "解锁管理后台";
      sub.textContent = "请输入管理密码以继续。";
      label.textContent = "管理密码";
      confirm.hidden = true;
    } else {
      title.textContent = "设置管理密码";
      sub.textContent = "首次使用请设置一个 6 位以上的管理密码。忘记后无法找回，请妥善保管。";
      label.textContent = "新密码";
      confirm.hidden = false;
    }
  }

  async function handleGateSubmit() {
    $("gate-error").hidden = true;
    const pw = $("pw-input").value;
    const pw2 = $("pw-input-2").value;
    if (!hasPassword() && pw !== pw2) {
      $("gate-error").textContent = "两次输入的密码不一致";
      $("gate-error").hidden = false;
      return;
    }
    try {
      await tryUnlock(pw);
      isUnlocked = true;
      $("gate-panel").hidden = true;
      $("editor-panel").hidden = false;
      loadConfigToForm();
      restoreDraft();
      updateStatus();
    } catch (e) {
      $("gate-error").textContent = e.message;
      $("gate-error").hidden = false;
    }
  }

  // ---------- 配置 ----------
  function loadConfig() {
    try {
      const raw = localStorage.getItem(STORAGE.CFG);
      if (raw) return Object.assign({}, DEFAULT_CFG, JSON.parse(b64Decode(raw)));
    } catch (_) {}
    return Object.assign({}, DEFAULT_CFG);
  }
  function saveConfig(cfg) {
    localStorage.setItem(STORAGE.CFG, b64Encode(JSON.stringify(cfg)));
  }
  function loadConfigToForm() {
    const cfg = loadConfig();
    $("cfg-owner").value     = cfg.owner;
    $("cfg-repo").value      = cfg.repo;
    $("cfg-branch").value    = cfg.branch;
    $("cfg-data-path").value = cfg.dataPath;
    const tok = localStorage.getItem(STORAGE.TOKEN);
    if (tok) {
      try { $("cfg-token").value = b64Decode(tok); } catch (_) { $("cfg-token").value = ""; }
    }
  }
  function readConfigFromForm() {
    const cfg = {
      owner:     ($("cfg-owner").value || "").trim() || DEFAULT_CFG.owner,
      repo:      ($("cfg-repo").value || "").trim() || DEFAULT_CFG.repo,
      branch:    ($("cfg-branch").value || "").trim() || DEFAULT_CFG.branch,
      dataPath:  ($("cfg-data-path").value || "").trim() || DEFAULT_CFG.dataPath,
    };
    const tok = ($("cfg-token").value || "").trim();
    if (tok) localStorage.setItem(STORAGE.TOKEN, b64Encode(tok));
    saveConfig(cfg);
    return cfg;
  }

  function updateStatus() {
    const hasToken = !!localStorage.getItem(STORAGE.TOKEN);
    const cfg = loadConfig();
    const el = $("admin-status");
    if (hasToken) {
      el.textContent = `✓ 已连接 ${cfg.owner}/${cfg.repo}@${cfg.branch}`;
      el.className = "admin-status admin-status-ok";
    } else {
      el.textContent = "未配置 GitHub Token";
      el.className = "admin-status admin-status-warn";
    }
  }

  // ---------- GitHub API ----------
  function ghHeaders(token) {
    return {
      "Authorization": "Bearer " + token,
      "Accept": "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    };
  }

  async function ghGetFile(cfg, token) {
    const url = `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${encodeURI(cfg.dataPath)}?ref=${encodeURIComponent(cfg.branch)}`;
    const res = await fetch(url, { headers: ghHeaders(token) });
    if (res.status === 404) {
      return { sha: null, content: "[]", missing: true };
    }
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`读取失败 (${res.status}): ${txt.slice(0, 200)}`);
    }
    const data = await res.json();
    let content = data.content || "";
    // 去掉 base64 换行
    content = content.replace(/\n/g, "");
    let decoded = "";
    try {
      decoded = decodeURIComponent(escape(atob(content)));
    } catch (e) {
      decoded = atob(content);
    }
    return { sha: data.sha, content: decoded, missing: false };
  }

  async function ghPutFile(cfg, token, content, sha, message) {
    const url = `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${encodeURI(cfg.dataPath)}`;
    const body = {
      message: message || "update posts.json",
      branch:  cfg.branch,
      content: btoa(unescape(encodeURIComponent(content))),
    };
    if (sha) body.sha = sha;
    const res = await fetch(url, {
      method: "PUT",
      headers: { ...ghHeaders(token), "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`写入失败 (${res.status}): ${txt.slice(0, 300)}`);
    }
    return res.json();
  }

  async function testConnection() {
    const token = localStorage.getItem(STORAGE.TOKEN);
    if (!token) {
      $("cfg-test-result").textContent = "请先填写 Token";
      $("cfg-test-result").className = "settings-test settings-test-bad";
      return;
    }
    let realToken;
    try { realToken = b64Decode(token); } catch (_) { realToken = token; }
    const cfg = readConfigFromForm();
    $("cfg-test-result").textContent = "测试中…";
    $("cfg-test-result").className = "settings-test";
    try {
      const res = await fetch(`https://api.github.com/repos/${cfg.owner}/${cfg.repo}`, { headers: ghHeaders(realToken) });
      if (res.ok) {
        const data = await res.json();
        $("cfg-test-result").textContent = `✓ 连接成功，权限：${data.permissions ? Object.keys(data.permissions).filter(k => data.permissions[k]).join(", ") : "?"}`;
        $("cfg-test-result").className = "settings-test settings-test-ok";
      } else if (res.status === 404) {
        $("cfg-test-result").textContent = "× 仓库不存在或 Token 无权访问";
        $("cfg-test-result").className = "settings-test settings-test-bad";
      } else if (res.status === 401) {
        $("cfg-test-result").textContent = "× Token 无效";
        $("cfg-test-result").className = "settings-test settings-test-bad";
      } else {
        $("cfg-test-result").textContent = `× HTTP ${res.status}`;
        $("cfg-test-result").className = "settings-test settings-test-bad";
      }
    } catch (e) {
      $("cfg-test-result").textContent = "× " + e.message;
      $("cfg-test-result").className = "settings-test settings-test-bad";
    }
  }

  // ---------- 表单 → 文章对象 ----------
  function readFormToPost() {
    const title = ($("f-title").value || "").trim();
    if (!title) throw new Error("请填写标题");
    const date = ($("f-date").value || "").trim() || new Date().toISOString().slice(0, 10);
    const author = ($("f-author").value || "").trim() || "Marker Chen";
    const tagsRaw = ($("f-tags").value || "").trim();
    const tags = tagsRaw
      ? tagsRaw.split(/[,，]/).map((s) => s.trim()).filter(Boolean)
      : [];
    let excerpt = ($("f-excerpt").value || "").trim();
    const content = $("f-content").value || "";
    if (!excerpt) {
      excerpt = (window.Blog && Blog.extractExcerpt) ? Blog.extractExcerpt(content, 140) : content.slice(0, 140);
    }
    const id = genId(title);
    return { id, title, date, author, tags, excerpt, content };
  }

  function loadDraft() {
    try {
      const raw = localStorage.getItem(STORAGE.DRAFT);
      if (!raw) return null;
      return JSON.parse(b64Decode(raw));
    } catch (_) { return null; }
  }
  function saveDraft() {
    const data = {
      title:   $("f-title").value,
      date:    $("f-date").value,
      author:  $("f-author").value,
      tags:    $("f-tags").value,
      excerpt: $("f-excerpt").value,
      content: $("f-content").value,
      t:       Date.now(),
    };
    try {
      localStorage.setItem(STORAGE.DRAFT, b64Encode(JSON.stringify(data)));
    } catch (_) {}
  }
  function clearDraft() {
    localStorage.removeItem(STORAGE.DRAFT);
  }
  function restoreDraft() {
    const d = loadDraft();
    if (!d) return;
    $("f-title").value   = d.title || "";
    $("f-date").value    = d.date || "";
    $("f-author").value  = d.author || "";
    $("f-tags").value    = d.tags || "";
    $("f-excerpt").value = d.excerpt || "";
    $("f-content").value = d.content || "";
    updateCount();
  }

  // ---------- 工具栏 / 计数 ----------
  function updateCount() {
    const text = $("f-content").value || "";
    const cn = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
    const en = (text.replace(/[\u4e00-\u9fa5]/g, " ").match(/[a-zA-Z]+/g) || []).length;
    const chars = text.length;
    $("word-count").textContent = `${cn + en} 词 · ${chars} 字符`;
    const minutes = (window.Blog && Blog.estimateReadingTime)
      ? Blog.estimateReadingTime(text)
      : Math.max(1, Math.ceil(cn / 300 + en / 200));
    $("reading-time").textContent = `${minutes} 分钟阅读`;
  }

  function insertAtCursor(textarea, text) {
    textarea.focus();
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const before = textarea.value.slice(0, start);
    const after = textarea.value.slice(end);
    const sel = textarea.value.slice(start, end);
    const inserted = sel ? text.replace(/(.)(.*)$/, (m, a, b) => a + sel + b) : text;
    textarea.value = before + inserted + after;
    const newPos = start + inserted.length;
    textarea.setSelectionRange(newPos, newPos);
    updateCount();
  }

  // ---------- 发布 ----------
  async function publishPost() {
    const tok = localStorage.getItem(STORAGE.TOKEN);
    if (!tok) {
      showToast("请先在「设置」里填 GitHub Token", "error", 4000);
      $("admin-settings").hidden = false;
      return;
    }
    let token;
    try { token = b64Decode(tok); } catch (_) { token = tok; }
    const cfg = readConfigFromForm();

    let post;
    try {
      post = readFormToPost();
    } catch (e) {
      showToast(e.message, "error");
      return;
    }

    const btn = $("btn-publish");
    btn.disabled = true;
    btn.textContent = "发布中…";
    try {
      // 1. 拉旧文件
      const old = await ghGetFile(cfg, token);
      let arr = [];
      try { arr = JSON.parse(old.content); } catch (e) {
        if (!old.missing) throw new Error("posts.json 解析失败：" + e.message);
      }
      if (!Array.isArray(arr)) arr = [];

      // 2. 检查 id 冲突，必要时加后缀
      const existingIds = new Set(arr.map((p) => p && p.id));
      let id = post.id;
      let i = 2;
      while (existingIds.has(id)) {
        id = `${post.id}-${i++}`;
      }
      post.id = id;

      // 3. 追加 + 倒序（新文章靠前）
      arr.unshift(post);
      const newContent = JSON.stringify(arr, null, 2) + "\n";

      // 4. 写回
      const msg = `publish: ${post.title}`;
      await ghPutFile(cfg, token, newContent, old.sha, msg);

      clearDraft();
      showToast(`✓ 已发布：${post.title}（id: ${id}）。GitHub Pages 1-2 分钟后自动更新。`, "ok", 6000);
      // 提示
      $("editor-hint").innerHTML = `已发布到 <code>${cfg.owner}/${cfg.repo}</code> 的 <code>${cfg.branch}</code> 分支。访问 <a href="https://${cfg.owner}.github.io/${cfg.repo}/post.html?id=${encodeURIComponent(id)}" target="_blank">文章链接 ↗</a>`;
    } catch (e) {
      showToast("发布失败：" + e.message, "error", 6000);
    } finally {
      btn.disabled = false;
      btn.textContent = "发布到 GitHub";
    }
  }

  // ---------- 预览 ----------
  function showPreview() {
    const md = $("f-content").value || "";
    const body = $("preview-body");
    body.innerHTML = (window.Blog && Blog.renderMarkdown) ? Blog.renderMarkdown(md) : "<pre>" + escapeHtml(md) + "</pre>";
    $("preview-overlay").hidden = false;
  }

  // ---------- 事件绑定 ----------
  function bind() {
    $("gate-submit").addEventListener("click", handleGateSubmit);
    $("pw-input").addEventListener("keydown", (e) => { if (e.key === "Enter") handleGateSubmit(); });
    $("pw-input-2").addEventListener("keydown", (e) => { if (e.key === "Enter") handleGateSubmit(); });

    $("btn-lock").addEventListener("click", () => {
      isUnlocked = false;
      lockSession();
    });
    $("btn-settings").addEventListener("click", () => {
      $("admin-settings").hidden = !$("admin-settings").hidden;
    });
    $("btn-save-cfg").addEventListener("click", () => {
      readConfigFromForm();
      updateStatus();
      showToast("设置已保存", "ok");
    });
    $("btn-test-cfg").addEventListener("click", testConnection);

    // 工具栏
    document.querySelectorAll(".tool").forEach((btn) => {
      btn.addEventListener("click", () => {
        const ta = $("f-content");
        const inline = btn.dataset.md;
        const block  = btn.dataset.mdBlock;
        if (inline !== undefined) insertAtCursor(ta, inline);
        else if (block) insertAtCursor(ta, "\n" + block + "\n");
      });
    });

    // 计数
    $("f-content").addEventListener("input", () => {
      updateCount();
      saveDraft();
    });
    ["f-title", "f-tags", "f-excerpt", "f-author", "f-date"].forEach((id) => {
      $(id).addEventListener("input", saveDraft);
    });

    // 提交
    $("editor-form").addEventListener("submit", (e) => {
      e.preventDefault();
      publishPost();
    });
    $("btn-save-draft").addEventListener("click", () => {
      saveDraft();
      showToast("草稿已存到本地", "ok");
    });
    $("btn-preview").addEventListener("click", showPreview);
    $("btn-close-preview").addEventListener("click", () => { $("preview-overlay").hidden = true; });
    $("preview-overlay").addEventListener("click", (e) => {
      if (e.target.id === "preview-overlay") $("preview-overlay").hidden = true;
    });
  }

  // ---------- 启动 ----------
  (async function init() {
    if (window.Blog) {
      Blog.applyTheme(Blog.getSavedTheme());
      Blog.renderHeader();
      Blog.renderFooter();
    }
    // 默认填今天
    $("f-date").value = new Date().toISOString().slice(0, 10);
    $("f-author").value = "Marker Chen";

    switchToSetMode(hasPassword());
    bind();
  })();
})();
