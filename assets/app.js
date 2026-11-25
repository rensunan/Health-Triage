(function () {
  'use strict';

  var TREES = window.TREES || [];
  var META = window.APP_DATA || {};
  var LEVELS = META.levels || {};
  var MODULES = META.modules || [];
  var DEPTS = META.departments || [];
  var DEPT_ABBR = META.deptAbbr || {};
  var DISEASES = window.DISEASES || [];
  var diseaseById = {};
  DISEASES.forEach(function (d) { diseaseById[d.id] = d; });
  var curDept = '全部';
  var curQuery = '';
  var tabsOpen = false;
  var HISTORY_KEY = META.historyKey || 'hdt.history.v1';

  var byId = {};
  var modMap = {};
  TREES.forEach(function (t) {
    if (!t.mod && MODULES.length) t.mod = MODULES[0].id;
    byId[t.id] = t;
  });
  MODULES.forEach(function (m) { modMap[m.id] = m; });

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var ARROW = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var SEV_COLOR = { 1: '#10B981', 2: '#EAB308', 3: '#F97316', 4: '#EF4444' };

  function sevMeter(n) {
    var s = '';
    for (var i = 1; i <= 4; i++) s += '<b class="' + (i <= n ? 'on' : '') + '"></b>';
    return '<span class="sev-meter" style="--sev:' + (SEV_COLOR[n] || '#C7CDD6') + '">' + s + '</span>';
  }

  var cur = { tree: null, node: null, path: [] };
  var lastResult = null;
  var fromResult = false;

  function treesOf(modId) {
    return TREES.filter(function (t) { return t.mod === modId && !t.hidden; });
  }

  function resolveGo(tree, raw) {
    var i = String(raw).indexOf(':');
    var tid = i > 0 ? raw.slice(0, i) : tree.id;
    var nid = i > 0 ? raw.slice(i + 1) : raw;
    var t = byId[tid];
    if (!t || !t.nodes[nid]) return null;
    return { tree: t, node: nid };
  }

  /* ---------------- 校验 ---------------- */
  function validate() {
    var errs = [];
    TREES.forEach(function (t) {
      if (!modMap[t.mod]) errs.push(t.id + ': mod 不在模块列表里 (' + t.mod + ')');
      if (!t.nodes || !t.nodes.q1) { errs.push(t.id + ': 缺少入口节点 q1'); return; }
      var results = 0;
      Object.keys(t.nodes).forEach(function (key) {
        var n = t.nodes[key];
        if (n.type === 'q') {
          if (!n.opts || !n.opts.length) { errs.push(t.id + '/' + key + ': 没有选项'); return; }
          n.opts.forEach(function (o) {
            if (!o.go) { errs.push(t.id + '/' + key + ': 选项缺少 go'); return; }
            if (!resolveGo(t, o.go)) errs.push(t.id + '/' + key + ' → ' + o.go + ': 目标不存在');
          });
        } else if (n.type === 'r') {
          results++;
          ['level', 'verdict', 'now', 'next', 'sport', 'meds', 'seeDoctor', 'timeline'].forEach(function (f) {
            if (n[f] === undefined || n[f] === null) errs.push(t.id + '/' + key + ': 结果缺少字段 ' + f);
          });
          if (n.sport && !n.sport.tag) errs.push(t.id + '/' + key + ': sport 缺少 tag');
        } else {
          errs.push(t.id + '/' + key + ': 未知节点类型 ' + n.type);
        }
      });
      if (!results && !t.hub) errs.push(t.id + ': 没有任何结果节点');
    });
    MODULES.forEach(function (m) {
      if (m.kind === 'wiki') return;
      if (!treesOf(m.id).length) errs.push('模块 ' + m.name + ' 下没有任何入口');
    });
    if (errs.length) console.warn('[决策树校验] ' + errs.length + ' 处问题\n' + errs.join('\n'));
    return !errs.length;
  }

  /* ---------------- 屏幕切换 ---------------- */
  function show(id) {
    var list = document.querySelectorAll('.screen');
    for (var i = 0; i < list.length; i++) list[i].classList.toggle('is-active', list[i].id === id);
    document.body.classList.toggle('ai-mode', id === 's-ai');
    document.body.classList.toggle('view-home', id === 's-home');
    window.scrollTo(0, 0);
  }

  /* ---------------- 首页：模块 ---------------- */
  function modCardHtml(m) {
    var n = m.kind === 'wiki' ? DISEASES.length : treesOf(m.id).length;
    return '<button class="mod-card" type="button" data-mod="' + m.id + '">' +
      '<img class="mod-thumb" src="assets/mod-' + m.id + '.png" alt="" width="200" height="200">' +
      '<span class="mod-body">' +
        '<span class="mod-name">' + m.name + '<i class="mod-count">' + n + ' 个</i></span>' +
        '<span class="mod-line">' + m.line + '</span>' +
      '</span>' +
      '<span class="mod-go">' + ARROW + '</span></button>';
  }

  function aiCardHtml(m) {
    return '<button class="ai-card" type="button" data-mod="' + m.id + '">' +
      '<img class="ai-thumb" src="assets/mod-' + m.id + '.png" alt="" width="200" height="200">' +
      '<span class="ai-body">' +
        '<span class="ai-name">' + m.name + '<i>对话</i></span>' +
        '<span class="ai-line">' + m.line + '</span>' +
      '</span>' +
      '<span class="ai-go">' + ARROW + '</span></button>';
  }

  function renderHome() {
    var triage = MODULES.filter(function (m) { return m.group === 'triage'; });
    var ask = MODULES.filter(function (m) { return m.group === 'ask'; });
    var lookup = MODULES.filter(function (m) { return m.group === 'lookup'; });

    var html = '';
    if (triage.length) {
      html += '<div class="sec-head"><span class="sec-name">按症状自查</span>' +
        '<span class="sec-note">点选式，3 分钟出结论</span></div>' +
        triage.map(modCardHtml).join('');
    }
    if (ask.length) {
      html += '<div class="sec-head"><span class="sec-name">不知道从哪选</span>' +
        '<span class="sec-note">直接问，可发图</span></div>' +
        ask.map(aiCardHtml).join('');
    }
    if (lookup.length) {
      html += '<div class="sec-head"><span class="sec-name">查疾病资料</span>' +
        '<span class="sec-note">按科室分类</span></div>' +
        lookup.map(modCardHtml).join('');
    }
    $('#module-list').innerHTML = html;

    $('#tree-count').textContent = MODULES.reduce(function (n, m) {
      return n + (m.group === 'triage' ? treesOf(m.id).length : 0);
    }, 0);
    $('#wiki-count').textContent = DISEASES.length;

    var cards = document.querySelectorAll('.mod-card, .ai-card');
    for (var i = 0; i < cards.length; i++) {
      cards[i].addEventListener('click', function () {
        var id = this.getAttribute('data-mod');
        if (id === 'wiki') goWiki();
        else if (id === 'ai') goAi();
        else goMod(id);
      });
    }
    renderHistory();
  }

  /* ---------------- 模块页 ---------------- */
  function renderModule(id) {
    var m = modMap[id];
    if (!m) return;
    var list = treesOf(id);
    var g = $('#mod-glyph');
    if (g) {
      g.textContent = '';
      g.className = 'mod-glyph-img';
      g.innerHTML = '<img src="assets/mod-' + m.id + '.png" alt="" width="200" height="200">';
    }
    $('#mod-title').textContent = m.name;
    $('#mod-note').textContent = m.note || '';

    $('#mod-list').innerHTML = list.map(function (t) {
      return '<button class="tree-card" type="button" data-id="' + t.id + '">' +
        '<img class="tree-thumb" src="assets/t-' + t.id + '.png" alt="" width="200" height="200">' +
        '<span class="tc-body"><span class="tc-title">' + t.title + '</span>' +
        '<span class="tc-line">' + t.line + '</span></span>' +
        '<span class="tc-go">' + ARROW + '</span></button>';
    }).join('');

    var cards = document.querySelectorAll('#mod-list .tree-card');
    for (var i = 0; i < cards.length; i++) {
      cards[i].addEventListener('click', function () { openTree(this.getAttribute('data-id')); });
    }
  }

  /* ---------------- 疾病百科 ---------------- */
  function goWiki() {
    if (location.hash.slice(1) === 'wiki') { renderWiki(); show('s-wiki'); }
    else location.hash = 'wiki';
  }
  function goAi() {
    if (!ensureConsent()) return;
    if (location.hash.slice(1) === 'ai') { show('s-ai'); if (window.AI) window.AI.enter(); }
    else location.hash = 'ai';
  }
  function goAuth() {
    if (location.hash.slice(1) === 'auth') { show('s-auth'); if (window.Auth) window.Auth.open('login'); }
    else location.hash = 'auth';
  }
  function goHistory() {
    if (location.hash.slice(1) === 'history') showHistory();
    else location.hash = 'history';
  }
  function showHistory() {
    show('s-history');
    if (window.Chat) window.Chat.renderList('hist-list');
  }

  async function openConversation(id) {
    try {
      var row = await window.Chat.load(id);
      if (!row) { alert('这条对话不存在或已被删除'); return; }
      show('s-ai');
      window.AI.loadMessages(row.messages || []);
      if (history.replaceState) {
        history.replaceState(null, '', location.pathname + location.search + '#ai');
      }
    } catch (e) {
      alert('打开失败，请稍后重试');
    }
  }

  /* ---------- 启动自检 / 诊断 ---------- */
  var CORE = [
    ['CLOUD_CONFIG', 'assets/cloud-config.js'],
    ['Cloud', 'assets/cloud.js'],
    ['Quota', 'assets/quota.js'],
    ['Auth', 'assets/auth.js'],
    ['Chat', 'assets/chat-store.js'],
    ['AI', 'assets/ai.js'],
    ['ShareCard', 'assets/share-card.js']
  ];

  function missingCore() {
    var miss = [];
    CORE.forEach(function (p) { if (!window[p[0]]) miss.push(p[1]); });
    if (!window.WorkBuddyCloud) miss.push('assets/vendor/wb-cloud-sdk.js');
    return miss;
  }

  function diagText() {
    var l = [];
    l.push('URL: ' + location.href);
    l.push('UA: ' + navigator.userAgent);
    l.push('微信: ' + (/MicroMessenger/i.test(navigator.userAgent) ? '是' : '否') +
           ' / 安卓: ' + (/Android/i.test(navigator.userAgent) ? '是' : '否'));
    l.push('在线: ' + (navigator.onLine ? '是' : '否') + ' / 时间: ' + new Date().toLocaleString());
    try { l.push('cookie 长度: ' + (document.cookie || '').length); } catch (e) { l.push('cookie: 读取失败'); }
    var cn = navigator.connection;
    if (cn) l.push('网络: ' + (cn.effectiveType || '?') + ' / ' + (cn.downlink || '?') + 'Mbps / rtt ' + (cn.rtt || '?'));
    l.push('');
    l.push('— 模块 —');
    CORE.forEach(function (p) { l.push((window[p[0]] ? '✓ ' : '✗ ') + p[1]); });
    l.push((window.WorkBuddyCloud ? '✓ ' : '✗ ') + 'assets/vendor/wb-cloud-sdk.js');
    l.push('');
    l.push('— 加载失败的脚本 —');
    l.push((window.__bootErr && window.__bootErr.length) ? window.__bootErr.join('\n') : '（无）');
    l.push('');
    l.push('— 配额 —');
    l.push(window.Quota ? JSON.stringify(window.Quota.state()) : 'Quota 未加载');
    l.push('');
    l.push('— 资源耗时 —');
    try {
      performance.getEntriesByType('resource')
        .filter(function (e) { return /cloud|sdk|quota|ai\.js/.test(e.name); })
        .forEach(function (e) {
          l.push(Math.round(e.duration) + 'ms ' + e.name.replace(/^https?:\/\/[^\/]+/, '') +
            (e.transferSize ? ' / ' + e.transferSize + 'B' : ' / 0B（可能被拦截）'));
        });
    } catch (e) { l.push('读取失败'); }
    return l.join('\n');
  }

  function hardReload() {
    var u = location.pathname + location.search;
    u += (u.indexOf('?') >= 0 ? '&' : '?') + '_r=' + Date.now();
    location.replace(u + (location.hash || ''));
  }

  function showDiag(title, note, miss) {
    var old = document.querySelector('.diag-mask');
    if (old) old.remove();
    var mask = document.createElement('div');
    mask.className = 'diag-mask';
    mask.innerHTML =
      '<div class="diag">' +
        '<h3></h3>' +
        (note ? '<p class="diag-note"></p>' : '') +
        (miss && miss.length ? '<p class="diag-miss"></p>' : '') +
        '<pre class="diag-pre"></pre>' +
        '<div class="diag-btns">' +
          '<button class="diag-reload" type="button">重新加载</button>' +
          '<button class="diag-copy" type="button">复制诊断信息</button>' +
          '<button class="diag-close" type="button">关闭</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(mask);
    mask.querySelector('h3').textContent = title;
    if (note) mask.querySelector('.diag-note').textContent = note;
    if (miss && miss.length) mask.querySelector('.diag-miss').textContent = '缺少：' + miss.join('、');

    var pre = mask.querySelector('.diag-pre');
    function paint(extra) { pre.textContent = diagText() + (extra ? '\n\n' + extra : ''); }
    paint('（正在检测组件文件能否下载…）');

    fetch('assets/vendor/wb-cloud-sdk.js?_=' + Date.now(), { cache: 'no-store' })
      .then(function (r) {
        paint('组件文件 HTTP 状态: ' + r.status + (r.status === 200 ? '（可下载）' : '（被拒绝）'));
      })
      .catch(function (e) { paint('组件文件请求失败: ' + ((e && e.message) || '网络错误')); });

    mask.querySelector('.diag-close').addEventListener('click', function () { mask.remove(); });
    mask.querySelector('.diag-reload').addEventListener('click', hardReload);
    mask.querySelector('.diag-copy').addEventListener('click', function () {
      var t = pre.textContent;
      var btn = this;
      var done = function () { btn.textContent = '已复制'; setTimeout(function () { btn.textContent = '复制诊断信息'; }, 1600); };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(t).then(done, function () { selectCopy(pre, done); });
      } else {
        selectCopy(pre, done);
      }
    });
  }

  function selectCopy(el, done) {
    try {
      var r = document.createRange();
      r.selectNodeContents(el);
      var sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(r);
      document.execCommand('copy');
      sel.removeAllRanges();
      done();
    } catch (e) {}
  }

  function bootCheck() {
    /* HTML 和脚本版本不一致 = 缓存混用了，自动重载一次（只重载一次，避免循环） */
    if (window.APP_BUILD && window.__aiBuild && window.APP_BUILD !== window.__aiBuild) {
      var k = 'triage.selfheal';
      var last = 0;
      try { last = Number(sessionStorage.getItem(k) || 0); } catch (e) {}
      if (Date.now() - last > 15000) {
        try { sessionStorage.setItem(k, String(Date.now())); } catch (e) {}
        hardReload();
        return;
      }
    }
    var miss = missingCore();
    var forced = /(^|[?&])diag=1/.test(location.search);
    if (!miss.length && !forced) return;
    if (miss.length) {
      showDiag('页面没有完整加载',
        '这不是账号或额度的问题，是页面文件没下载全（可能是网络限制、代理，或站点访问被拦）。下面是可以直接发给开发者的信息。',
        miss);
    } else {
      showDiag('运行状态诊断', '各项都加载正常，下面是当前运行信息。', null);
    }
  }

  /* ---------- 账号头像（按邮箱/uid 生成，不请求外部资源） ---------- */
  function hashSeed(s) {
    var h = 2166136261;
    s = String(s || 'guest');
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h >>> 0;
  }

  function avatarUri(seed) {
    var h = hashSeed(seed);
    var hue = h % 360;
    var c1 = 'hsl(' + hue + ',64%,60%)';
    var c2 = 'hsl(' + ((hue + 42) % 360) + ',66%,44%)';
    var bits = h || 1;
    var cells = '';
    for (var y = 0; y < 5; y++) {
      for (var x = 0; x < 3; x++) {
        bits = (Math.imul(bits, 1103515245) + 12345) >>> 0;
        if ((bits >>> 17) & 1) {
          cells += '<rect x="' + (x * 8 + 12) + '" y="' + (y * 8 + 12) + '" width="8" height="8" rx="1.6"/>';
          if (x !== 2) {
            cells += '<rect x="' + ((4 - x) * 8 + 12) + '" y="' + (y * 8 + 12) + '" width="8" height="8" rx="1.6"/>';
          }
        }
      }
    }
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">' +
      '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0" stop-color="' + c1 + '"/><stop offset="1" stop-color="' + c2 + '"/>' +
      '</linearGradient></defs>' +
      '<rect width="64" height="64" fill="url(#g)"/>' +
      '<g fill="rgba(255,255,255,.9)">' + cells + '</g></svg>';
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  function userSeed(u) {
    return (u && (u.id || u.email || u.name)) || 'guest';
  }

  var MAIL_RE = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;

  function asEmail(v) {
    return (typeof v === 'string' && MAIL_RE.test(v.trim())) ? v.trim() : '';
  }

  /* 在任意对象里深挖邮箱：SDK 把用户信息塞在不同层级，不能只认 u.email */
  function findEmail(v, depth) {
    depth = depth || 0;
    if (v == null || depth > 4) return '';
    if (typeof v === 'string') return asEmail(v);
    if (typeof v !== 'object') return '';
    var keys = ['email', 'mail', 'username', 'preferred_username', 'login', 'account', 'user_email'];
    for (var i = 0; i < keys.length; i++) {
      var hit = asEmail(v[keys[i]]);
      if (hit) return hit;
    }
    var names = Object.keys(v);
    for (var j = 0; j < names.length; j++) {
      var k = names[j];
      if (k === 'access_token' || k === 'refresh_token' || k === 'accessToken' || k === 'refreshToken') continue;
      var sub = v[k];
      if (sub && typeof sub === 'object') {
        var r = findEmail(sub, depth + 1);
        if (r) return r;
      }
    }
    return '';
  }

  function jwtPayload(tok) {
    try {
      var seg = String(tok || '').split('.')[1];
      if (!seg) return null;
      var b64 = seg.replace(/-/g, '+').replace(/_/g, '/');
      while (b64.length % 4) b64 += '=';
      return JSON.parse(decodeURIComponent(escape(atob(b64))));
    } catch (e) { return null; }
  }

  function scanStorageEmail() {
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        var raw = localStorage.getItem(k) || '';
        var direct = asEmail(raw);
        if (direct) return direct;
        if (raw.charAt(0) === '{' || raw.charAt(0) === '[') {
          try {
            var parsed = JSON.parse(raw);
            var hit = findEmail(parsed);
            if (hit) return hit;
          } catch (e) {}
        }
      }
    } catch (e) {}
    return '';
  }

  function cachedEmail() {
    try { return asEmail(localStorage.getItem('triage.email') || ''); } catch (e) { return ''; }
  }

  function setCachedEmail(mail) {
    try {
      if (mail) localStorage.setItem('triage.email', mail);
      else localStorage.removeItem('triage.email');
    } catch (e) {}
  }

  /* 依次尝试：登录时记下的 → 用户对象 → SDK session → JWT → 本地存储扫描 */
  function resolveEmail(cb) {
    var done = false;
    function finish(v) { if (done) return; done = true; cb(v || ''); }

    var cached = cachedEmail();
    if (cached) { finish(cached); return; }

    var u = window.Auth && window.Auth.user ? window.Auth.user() : null;
    var fromUser = findEmail(u);
    if (fromUser) { setCachedEmail(fromUser); finish(fromUser); return; }

    var sdk = null;
    try { sdk = window.Cloud && window.Cloud.client(); } catch (e) { sdk = null; }
    if (!sdk || !sdk.auth) { finish(scanStorageEmail()); return; }

    /* /v1/user/me 是唯一能拿到邮箱的官方接口 */
    var meP = (sdk.auth.getUser ? sdk.auth.getUser() : Promise.resolve(null));
    Promise.resolve(meP).then(function (me) {
      var fromMe = findEmail(me && (me.data || me));
      if (fromMe) { setCachedEmail(fromMe); finish(fromMe); return null; }

      var sP = (sdk.auth.getSession ? sdk.auth.getSession() : Promise.resolve(null));
      return Promise.resolve(sP).then(function (r) {
        var fromSession = findEmail(r);
        if (fromSession) { setCachedEmail(fromSession); finish(fromSession); return null; }
        var tokP = sdk.auth.getAccessToken ? sdk.auth.getAccessToken() : Promise.resolve('');
        return Promise.resolve(tokP).then(function (tok) {
          var fromJwt = findEmail(jwtPayload(tok));
          if (fromJwt) { setCachedEmail(fromJwt); finish(fromJwt); return; }
          finish(scanStorageEmail());
        });
      });
    }).catch(function () { finish(scanStorageEmail()); });
  }

  function renderUserChip() {
    var u = window.Auth && window.Auth.user ? window.Auth.user() : null;
    var chip = $('#ai-user');
    var loginBtn = $('#ai-login');
    if (!chip) return;

    var logged = !!(window.Auth && window.Auth.isIn());
    if (loginBtn) loginBtn.hidden = logged;
    /* 游客没有账号菜单，设置入口放页头齿轮；登录后用菜单里的「设置」 */
    var setBtn = $('#ai-set');
    if (setBtn) setBtn.hidden = logged;
    chip.hidden = !logged;
    if (!logged) {
      var menuHide = $('#ai-user-menu');
      if (menuHide) menuHide.hidden = true;
      return;
    }

    var ava = avatarUri(userSeed(u));
    var im = $('#ai-ava');
    if (im) im.src = ava;
    var aum = $('#aum-ava');
    if (aum) aum.src = ava;

    var sp = $('#ai-mail');
    var aumMail = $('#aum-mail');
    /* 手机号登录没有邮箱，显示打码的手机号；两者都没有再退回「已登录」 */
    var phone = '';
    try { phone = localStorage.getItem('triage.phone') || ''; } catch (e) {}
    var maskPhone = phone.length === 11
      ? phone.slice(0, 3) + '****' + phone.slice(-4) : '';
    var fallback = maskPhone || '已登录';
    /* 先按当前身份兜底：换账号后菜单里不能留着上一个账号的邮箱。
       邮箱账号走 resolveEmail 的同步缓存分支，不会闪一下兜底值 */
    if (sp) { sp.textContent = fallback; sp.title = ''; }
    if (aumMail) aumMail.textContent = fallback;

    resolveEmail(function (mail) {
      if (!mail) return;
      var short = mail.length > 21 ? mail.slice(0, 20) + '…' : mail;
      if (sp) { sp.textContent = short; sp.title = mail; }
      if (aumMail) aumMail.textContent = mail;
    });
  }

  function updateAiTop() {
    var logged = !!(window.Auth && window.Auth.isIn());
    var h = $('#ai-history');
    if (h) h.hidden = !logged;
    renderUserChip();
    /* 已经是登录状态，欢迎语里的「登录后可保存记录」要去掉 */
    if (logged) {
      var g = document.querySelector('.ai-guest');
      if (g) g.remove();
    }
    /* 登录后配额要重新按新身份取一次，避免还显示游客次数 */
    if (logged && window.Quota) {
      window.Quota.refresh().then(function () {
        if (window.AI && window.AI.renderQuota) window.AI.renderQuota();
        if (window.Quota.state().scope !== 'user') {
          setTimeout(function () {
            window.Quota.refresh().then(function () {
              if (window.AI && window.AI.renderQuota) window.AI.renderQuota();
            });
          }, 700);
        }
      });
    }
  }

  window.App = {
    goAi: goAi,
    goAuth: goAuth,
    goHistory: goHistory,
    openConversation: openConversation,
    updateAiTop: updateAiTop
  };
  function openDisease(id) {
    var h = 'd/' + id;
    if (location.hash.slice(1) === h) { renderDisease(id); show('s-disease'); }
    else location.hash = h;
  }

  function renderWiki() {
    var allTabs = ['全部'].concat(DEPTS);
    if (!tabsOpen && allTabs.indexOf(curDept) >= 10) tabsOpen = true;
    var shown = tabsOpen ? allTabs : allTabs.slice(0, 10);

    var tabsHtml = shown.map(function (d) {
      return '<button class="dept-tab' + (d === curDept ? ' on' : '') +
        '" type="button" data-dept="' + d + '">' + (DEPT_ABBR[d] || d) + '</button>';
    }).join('');
    tabsHtml += '<button class="dept-more" type="button" id="dept-more">' +
      (tabsOpen ? '收起科室 ↑' : '更多科室（' + (allTabs.length - 10) + '）↓') + '</button>';
    $('#dept-tabs').innerHTML = tabsHtml;

    var tabBtns = document.querySelectorAll('.dept-tab');
    for (var i = 0; i < tabBtns.length; i++) {
      tabBtns[i].addEventListener('click', function () {
        curDept = this.getAttribute('data-dept');
        renderWiki();
      });
    }
    $('#dept-more').addEventListener('click', function () {
      tabsOpen = !tabsOpen;
      renderWiki();
    });

    var q = $('#dz-q');
    if (!q.dataset.bound) {
      q.dataset.bound = '1';
      q.addEventListener('input', function () {
        curQuery = this.value.trim();
        renderWikiList();
      });
    }
    q.value = curQuery;
    renderWikiList();
  }

  function renderWikiList() {
    var k = curQuery.toLowerCase();
    var searching = k.length > 0;
    var inDept = curDept !== '全部';
    var list = DISEASES.filter(function (d) {
      if (inDept && d.dept !== curDept) return false;
      if (!searching) return true;
      return (d.name + ' ' + (d.alias || '') + ' ' + d.brief + ' ' + d.dept).toLowerCase().indexOf(k) >= 0;
    });
    var order = DEPTS.slice();
    list.sort(function (a, b) {
      var d = order.indexOf(a.dept) - order.indexOf(b.dept);
      return d !== 0 ? d : a.name.localeCompare(b.name, 'zh');
    });

    if (!list.length) {
      if (searching && inDept) {
        $('#disease-list').innerHTML = '<div class="dz-empty">' + curDept +
          ' 下没有找到「' + curQuery + '」<br>' +
          '<button class="dz-empty-btn" type="button" id="search-all">在全部科室里搜</button></div>';
        $('#search-all').addEventListener('click', function () {
          curDept = '全部';
          renderWiki();
        });
      } else if (searching) {
        $('#disease-list').innerHTML = '<div class="dz-empty">没有找到「' + curQuery +
          '」<br>换个说法试试，比如只输入病名里的两个字</div>';
      } else {
        $('#disease-list').innerHTML = '<div class="dz-empty">这个科室下还没有收录条目</div>';
      }
      return;
    }

    var html = '', lastDept = '';
    if (searching) {
      html += '<div class="dz-group-head">' + (inDept ? curDept + ' · ' : '') +
        '搜索结果<span>' + list.length + ' 条</span></div>';
    }
    list.forEach(function (d) {
      if (d.dept !== lastDept) {
        if (!searching) {
          var cnt = list.filter(function (x) { return x.dept === d.dept; }).length;
          html += '<div class="dz-group-head">' + d.dept + '<span>' + cnt + ' 种</span></div>';
        }
        lastDept = d.dept;
      }
      html += '<button class="dz-card" type="button" data-id="' + d.id + '">' +
        '<span class="dz-glyph">' + d.glyph + '</span>' +
        '<span class="dz-body"><span class="dz-name">' + d.name +
          (d.rare ? '<i class="dz-rare">罕见</i>' : '') + '</span>' +
        '<span class="dz-brief">' + (searching ? d.dept + ' · ' : '') + d.brief + '</span></span>' +
        '<span class="dz-go">' + ARROW + '</span></button>';
    });
    $('#disease-list').innerHTML = html;

    var cards = document.querySelectorAll('.dz-card');
    for (var j = 0; j < cards.length; j++) {
      cards[j].addEventListener('click', function () {
        fromResult = false;
        openDisease(this.getAttribute('data-id'));
      });
    }
  }

  function backFromDisease() {
    if (fromResult && lastResult && byId[lastResult.treeId] &&
        byId[lastResult.treeId].nodes[lastResult.nodeId]) {
      fromResult = false;
      cur.tree = byId[lastResult.treeId];
      cur.node = lastResult.nodeId;
      renderResult(cur.tree.nodes[lastResult.nodeId]);
      show('s-result');
      if (history.replaceState) history.replaceState(null, '', location.pathname + location.search);
      return;
    }
    goWiki();
  }

  function renderDisease(id) {
    var d = diseaseById[id];
    if (!d) { goWiki(); return; }
    $('#dz-crumb').textContent = '疾病百科 · ' + d.dept;

    var sol = d.solutions.map(function (g) {
      return '<div class="sol-group"><h3>' + g.t + '</h3><ul>' +
        g.items.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul></div>';
    }).join('');

    var html = '' +
      '<div class="dz-head"><div class="dz-tags"><span class="dz-tag">' + d.dept + '</span>' +
        (d.rare ? '<span class="dz-rare">罕见病</span>' : '') + '</div>' +
        '<h1>' + d.name + '</h1>' +
        '<p class="dz-alias">' + (d.alias ? d.alias + ' · ' : '') + d.brief + '</p></div>' +

      '<section class="dz-block"><h2><i class="dz-num">1</i>病症特征</h2>' +
        '<ul class="dz-list">' + d.features.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul></section>' +

      '<section class="dz-block"><h2><i class="dz-num">2</i>病症来源</h2>' +
        '<ul class="dz-list">' + d.causes.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul></section>' +

      '<section class="dz-block"><h2><i class="dz-num">3</i>解决方案</h2>' + sol + '</section>';

    if (d.link && byId[d.link]) {
      html += '<button class="dz-link" type="button" data-tree="' + d.link + '">' +
        '<span><b>去做自查 · ' + byId[d.link].title + '</b>' +
        '<i>有这类症状？3 分钟判断严重程度和要不要就医</i></span>' +
        '<span class="dz-go">' + ARROW + '</span></button>';
    }
    html += '<p class="result-note">百科内容用于了解疾病，不构成诊断依据。具体诊疗方案请遵医嘱。</p>';

    $('#disease-body').innerHTML = html;
    var link = document.querySelector('.dz-link');
    if (link) link.addEventListener('click', function () { openTree(this.getAttribute('data-tree')); });
  }

  /* ---------------- 历史记录 ---------------- */
  function readHistory() {
    try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]') || []; }
    catch (e) { return []; }
  }
  function writeHistory(list) {
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(list)); } catch (e) {}
  }
  function pushHistory(node) {
    if (!cur.tree) return;
    var list = readHistory().filter(function (x) { return x.treeId !== cur.tree.id; });
    list.unshift({ treeId: cur.tree.id, title: cur.tree.title, level: node.level, ts: Date.now() });
    writeHistory(list.slice(0, 4));
  }
  function fmtTime(ts) {
    var d = new Date(ts);
    var now = new Date();
    var same = d.toDateString() === now.toDateString();
    var hm = ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
    return same ? '今天 ' + hm : (d.getMonth() + 1) + '月' + d.getDate() + '日';
  }
  function renderHistory() {
    var box = $('#history-box');
    var list = readHistory().filter(function (x) { return byId[x.treeId]; });
    if (!list.length) { box.hidden = true; return; }
    box.hidden = false;
    $('#history-list').innerHTML = list.map(function (x) {
      var c = (LEVELS[x.level] || {}).color || '#999';
      return '<div class="h-row" data-id="' + x.treeId + '">' +
        '<span class="h-lv" style="background:' + c + '">' + x.level + '</span>' +
        '<span class="h-name">' + x.title + '</span>' +
        '<span class="h-time">' + fmtTime(x.ts) + '</span></div>';
    }).join('');
    var rows = document.querySelectorAll('.h-row');
    for (var i = 0; i < rows.length; i++) {
      rows[i].addEventListener('click', function () { openTree(this.getAttribute('data-id')); });
    }
  }

  /* ---------------- 流程 ---------------- */
  function goHome() { if (location.hash) location.hash = ''; else route(); }
  function goMod(id) {
    if (location.hash.slice(1) === id) route();
    else location.hash = id;
  }
  function openTree(id) {
    var h = 't/' + id;
    if (location.hash.slice(1) === h) start(id);
    else location.hash = h;
  }

  /* ---------- 知情同意 ---------- */
  var CONSENT_KEY = 'triage.consent.v1';

  function consentState() {
    try {
      var v = JSON.parse(localStorage.getItem(CONSENT_KEY) || 'null');
      return v && v.v === 1 ? v : null;
    } catch (e) { return null; }
  }

  function hasConsent() {
    var c = consentState();
    return !!(c && c.scope === 'full');
  }

  function setConsent(scope) {
    try { localStorage.setItem(CONSENT_KEY, JSON.stringify({ v: 1, scope: scope, at: Date.now() })); } catch (e) {}
  }

  function syncConsentBtn() {
    var a = $('#ck-terms'), b = $('#ck-health'), btn = $('#consent-ok');
    if (!btn) return;
    btn.disabled = !(a && a.checked && b && b.checked);
  }

  function openConsent() {
    var m = $('#consent-mask');
    if (!m || !m.hidden) return;
    var a = $('#ck-terms'), b = $('#ck-health');
    if (a) a.checked = false;
    if (b) b.checked = false;
    syncConsentBtn();
    m.hidden = false;
    requestAnimationFrame(function () { m.classList.add('in'); });
  }

  function closeConsent() {
    var m = $('#consent-mask');
    if (!m) return;
    m.classList.remove('in');
    setTimeout(function () { m.hidden = true; }, 180);
  }

  /* 需要处理健康信息的入口，先过同意这道门 */
  function ensureConsent() {
    if (hasConsent()) return true;
    openConsent();
    return false;
  }

  function showLegal(anchor) {
    show('s-legal');
    var map = { privacy: 'legal-privacy', report: 'legal-report' };
    var id = map[anchor];
    if (!id) { window.scrollTo(0, 0); return; }
    setTimeout(function () {
      var el = document.getElementById(id);
      if (el) el.scrollIntoView({ block: 'start' });
    }, 60);
  }

  function start(id) {
    var t = byId[id];
    if (!t) return;
    if (!ensureConsent()) return;
    cur.tree = t;
    cur.path = [];
    goto('q1');
  }

  function goto(nodeId) {
    var target = resolveGo(cur.tree, nodeId);
    if (!target) { console.error('[决策树] 找不到节点', nodeId); return; }
    cur.tree = target.tree;
    cur.node = target.node;
    var node = cur.tree.nodes[target.node];
    if (node.type === 'r') { renderResult(node); show('s-result'); }
    else { renderQuiz(node); show('s-quiz'); }
  }

  function pick(idx) {
    if (!cur.tree || !cur.node) return;
    var node = cur.tree.nodes[cur.node];
    if (!node || !node.opts) return;
    var opt = node.opts[idx];
    if (!opt) return;
    cur.path.push({ tree: cur.tree.id, node: cur.node, opt: idx });
    goto(opt.go);
  }

  function undo() {
    if (!cur.path.length) { goMod(cur.tree.mod); return; }
    var last = cur.path.pop();
    if (byId[last.tree]) cur.tree = byId[last.tree];
    goto(last.node);
  }

  function goBack() {
    if ($('#s-history').classList.contains('is-active')) { goAi(); return; }
    if ($('#s-auth').classList.contains('is-active')) { goAi(); return; }
    if ($('#s-ai').classList.contains('is-active')) { goHome(); return; }
    if ($('#s-disease').classList.contains('is-active')) { goWiki(); return; }
    if ($('#s-wiki').classList.contains('is-active')) { goHome(); return; }
    if ($('#s-result').classList.contains('is-active')) { undo(); return; }
    if ($('#s-quiz').classList.contains('is-active')) { goMod(cur.tree.mod); return; }
    if ($('#s-mod').classList.contains('is-active')) { goHome(); return; }
  }

  function renderQuiz(node) {
    $('#quiz-crumb').textContent = cur.tree.title;
    $('#q-ask').textContent = node.ask;
    $('#q-hint').textContent = node.hint || '';
    $('#q-kind').hidden = !node.scale;
    $('#quiz-step').textContent = cur.path.length + 1;
    var pct = Math.min(92, Math.round(((cur.path.length + 1) / 4) * 100));
    $('#quiz-bar').style.width = pct + '%';

    $('#q-opts').innerHTML = node.opts.map(function (o, i) {
      return '<button class="opt" type="button" data-i="' + i + '">' +
        '<span class="opt-body"><span class="opt-t">' + o.t + '</span>' +
        (o.sub ? '<span class="opt-sub">' + o.sub + '</span>' : '') + '</span>' +
        (o.sev ? sevMeter(o.sev) : '<span class="opt-go">' + ARROW + '</span>') +
        '</button>';
    }).join('');

    var btns = document.querySelectorAll('#q-opts .opt');
    for (var i = 0; i < btns.length; i++) {
      btns[i].addEventListener('click', function () { pick(parseInt(this.getAttribute('data-i'), 10)); });
    }
    $('#btn-undo').hidden = cur.path.length === 0;
  }

  var skipHistory = false;

  function renderResult(node) {
    if (!skipHistory) pushHistory(node);
    skipHistory = false;
    lastResult = { treeId: cur.tree.id, nodeId: cur.node };
    var lv = LEVELS[node.level] || { color: '#666', name: '' };
    var m = modMap[cur.tree.mod];
    $('#result-crumb').textContent = (m ? m.name + ' · ' : '') + cur.tree.title;

    var html = '' +
      '<div class="verdict" style="background:' + lv.color + '">' +
        '<span class="v-lv">' + node.level + ' · ' + lv.name + '</span>' +
        '<h2>' + node.verdict + '</h2>' +
        (node.sub ? '<p class="v-sub">' + node.sub + '</p>' : '') +
      '</div>' +

      '<div class="r-card"><h3>现在做什么 · 0–48 小时</h3>' +
        '<ol class="steps">' + node.now.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ol></div>' +

      '<div class="r-card"><h3>接下来怎么办</h3>' +
        '<ol class="steps">' + node.next.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ol></div>' +

      '<div class="r-card"><h3>能不能继续运动</h3>' +
        '<div class="sport-row"><span class="sport-tag ' + node.sport.tag + '">' + node.sport.label + '</span>' +
        '<p class="sport-note">' + node.sport.note + '</p></div></div>' +

      '<div class="r-card"><h3>用药提醒</h3>' +
        '<p class="meds-note">只提示能不能用、别和什么混着用。具体用量请按说明书或咨询药师。</p>' +
        '<ul class="meds">' + node.meds.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul></div>' +

      '<div class="r-card alert"><h3>出现这些，必须就医</h3>' +
        '<ul>' + node.seeDoctor.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul></div>' +

      '<div class="r-card"><h3>大概多久好</h3><div class="tl">' +
        node.timeline.map(function (row) {
          return '<div class="tl-row"><span class="tl-time">' + row[0] + '</span>' +
            '<span class="tl-desc">' + row[1] + '</span></div>';
        }).join('') + '</div></div>';

    var wikiId = (window.WIKI_LINK || {})[cur.tree.id + ':' + cur.node];
    if (wikiId && diseaseById[wikiId]) {
      var wd = diseaseById[wikiId];
      html += '<button class="dz-link" type="button" data-disease="' + wikiId + '">' +
        '<span><b>疾病百科 · ' + wd.name + '</b>' +
        '<i>' + wd.brief + '</i></span>' +
        '<span class="dz-go">' + ARROW + '</span></button>';
    }

    html += '<p class="result-note">结果基于你的选择做初步分级，<b>不是诊断</b>，也不能替代医生面诊。症状加重请直接就医。</p>';

    $('#result-body').innerHTML = html;
    var dl = document.querySelector('.dz-link[data-disease]');
    if (dl) dl.addEventListener('click', function () {
      fromResult = true;
      openDisease(this.getAttribute('data-disease'));
    });
  }

  /* ---------------- 路由 ---------------- */
  /* ---------------- 分享 ---------------- */
  function toast(msg) {
    var t = document.querySelector('.toast');
    if (!t) {
      t = document.createElement('div');
      t.className = 'toast';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    requestAnimationFrame(function () { t.classList.add('in'); });
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { t.classList.remove('in'); }, 2400);
  }

  var imgBlob = null, imgData = '';

  function isMobileUA() {
    return /Android|iPhone|iPad|iPod|Mobile|MicroMessenger/i.test(navigator.userAgent);
  }

  /* 微信内置浏览器：blob: 和 <a download> 都存不了图，只有长按 <img> 这一条路 */
  function isWeChat() {
    return /MicroMessenger/i.test(navigator.userAgent);
  }

  function downloadBlob(blob) {
    if (!blob) return;
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = '健康自查-' + ((cur.tree && cur.tree.title) || '结果') + '.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 6000);
    toast(isMobileUA() ? '没保存成功的话，长按图片保存到相册' : '图片已保存到下载目录');
  }

  function closeImg() {
    var m = $('#img-mask');
    if (m) m.hidden = true;
    setFull(false);
    imgBlob = null;
    imgData = '';
    var im = $('#img-out');
    if (im) im.removeAttribute('src');
  }

  function setFull(on) {
    var mask = $('#img-mask');
    if (!mask) return;
    mask.classList.toggle('is-full', !!on);
    var tip = $('#img-full-tip');
    if (tip) {
      tip.hidden = !on;
      tip.innerHTML = isWeChat()
        ? '长按图片 → 选「保存图片」<i>长按没反应？直接截屏也可以</i>'
        : '点图片可退出放大';
    }
    var x = $('#img-full-x');
    if (x) x.hidden = !on;
  }

  /* blob 转 dataURL —— 微信里只有 data: 开头的图片长按才给「保存图片」 */
  function toDataUrl(blob, cb) {
    try {
      var fr = new FileReader();
      fr.onload = function () { cb(String(fr.result || '')); };
      fr.onerror = function () { cb(''); };
      fr.readAsDataURL(blob);
    } catch (e) { cb(''); }
  }

  function bindImgOnce() {
    if (bindImgOnce.done) return;
    bindImgOnce.done = true;
    var mask = $('#img-mask');
    var im = $('#img-out');

    $('#img-close').addEventListener('click', closeImg);

    $('#img-save').addEventListener('click', function () {
      /* 微信里 <a download> 一定失败，点击只是重新放大让用户长按 */
      if (isWeChat()) { setFull(true); return; }
      downloadBlob(imgBlob);
    });

    $('#img-share').addEventListener('click', function () {
      if (!imgBlob) return;
      try {
        var f = new File([imgBlob], '健康自查.png', { type: 'image/png' });
        navigator.share({ files: [f], title: '健康分诊 · ' + ((cur.tree && cur.tree.title) || '') })
          .catch(function (err) {
            if (err && err.name === 'AbortError') return;
            downloadBlob(imgBlob);
          });
      } catch (e) { downloadBlob(imgBlob); }
    });

    /* 点图片进入全屏；全屏状态下再点退出。全屏时没有滚动容器，长按最稳 */
    if (im) {
      im.addEventListener('click', function () {
        setFull(!mask.classList.contains('is-full'));
      });
    }

    var fx = $('#img-full-x');
    if (fx) fx.addEventListener('click', closeImg);

    mask.addEventListener('click', function (e) {
      if (e.target === mask) closeImg();
    });
  }

  function showImg(blob) {
    var mask = $('#img-mask');
    var im = $('#img-out');
    if (!mask || !im) { toast('预览层缺失，请刷新页面'); return; }

    imgBlob = blob;
    bindImgOnce();

    var wechat = isWeChat();
    var title = mask.querySelector('.img-head b');
    var hint = mask.querySelector('.img-head span');

    if (title) title.textContent = wechat ? '点图片放大，再长按保存' : '长图已生成';
    if (hint) {
      hint.textContent = wechat
        ? '① 点一下图片放大　② 长按图片 → 选「保存图片」'
        : (isMobileUA() ? '长按图片可保存到相册' : '点下方「保存图片」下载到本地');
    }

    /* 微信里下载和系统分享都不可用，只保留「放大后长按保存」 */
    var saveBtn = $('#img-save');
    saveBtn.hidden = false;
    saveBtn.textContent = wechat ? '放大后长按保存' : '保存图片';
    /* 系统分享只在「移动端 + 浏览器真支持」时才给，桌面面板经常没有目标 */
    $('#img-share').hidden = true;

    mask.hidden = false;
    /* 微信里直接进全屏：少一步点击，长按命中的就是这个 <img> */
    setFull(wechat);

    /* 先占位再用 dataURL 覆盖，体积大要几百毫秒 */
    toDataUrl(blob, function (url) {
      if (!url) {
        /* 兜底：dataURL 失败仍显示 blob，至少桌面能下载 */
        try { im.src = URL.createObjectURL(blob); } catch (e) {}
        toast('图片编码失败，请重试');
        return;
      }
      imgData = url;
      im.src = url;

      if (!wechat) {
        try {
          var f = new File([blob], '健康自查.png', { type: 'image/png' });
          if (!wechat && isMobileUA() && navigator.canShare && navigator.canShare({ files: [f] })) {
            $('#img-share').hidden = false;
          }
        } catch (e) {}
      }
    });
  }

  function shareResult() {
    if (!cur.tree || !cur.node) return;
    var node = cur.tree.nodes[cur.node];
    if (!node || node.type !== 'r') return;
    if (!window.ShareCard) { toast('当前环境不支持生成图片'); return; }

    var lv = LEVELS[node.level] || {};
    toast('正在生成长图…');
    window.ShareCard.render({
      level: node.level,
      levelName: lv.name,
      color: lv.color,
      verdict: node.verdict,
      sub: node.sub,
      now: node.now,
      seeDoctor: node.seeDoctor,
      meds: node.meds
    }, function (blob) {
      if (!blob) { toast('生成失败，请重试'); return; }
      showImg(blob);
    });
  }

  function openShared(enc) {
    var parts = String(enc).split(':');
    var t = byId[parts[0]];
    var node = t && t.nodes ? t.nodes[parts[1]] : null;
    if (!node || node.type !== 'r') { renderHome(); show('s-home'); return; }
    cur.tree = t;
    cur.node = parts[1];
    cur.path = [];
    skipHistory = true;
    renderResult(node);
    show('s-result');
  }

  function route() {
    var h = location.hash.slice(1);
    if (!h) { renderHome(); show('s-home'); return; }
    if (h === 'wiki') { renderWiki(); show('s-wiki'); return; }
    if (h === 'ai') {
      if (!ensureConsent()) { renderHome(); show('s-home'); return; }
      show('s-ai'); if (window.AI) window.AI.enter(); return;
    }
    if (h === 'legal' || h.indexOf('legal:') === 0) { showLegal(h.split(':')[1]); return; }
    if (h === 'auth') { show('s-auth'); if (window.Auth) window.Auth.open('login'); return; }
    if (h === 'history') { showHistory(); return; }
    if (h.indexOf('d/') === 0) { renderDisease(h.slice(2)); show('s-disease'); return; }
    if (h.indexOf('r/') === 0) { openShared(h.slice(2)); return; }
    if (modMap[h]) { renderModule(h); show('s-mod'); return; }
    var tid = h.indexOf('t/') === 0 ? h.slice(2) : h;
    if (byId[tid]) { start(tid); return; }
    renderHome(); show('s-home');
  }

  function bind() {
    $('#btn-back').addEventListener('click', goBack);
    $('#btn-back2').addEventListener('click', undo);
    $('#btn-back-mod').addEventListener('click', goHome);
    $('#btn-back-wiki').addEventListener('click', goHome);
    $('#btn-back-dz').addEventListener('click', backFromDisease);
    $('#btn-back-ai').addEventListener('click', goHome);
    $('#btn-back-auth').addEventListener('click', goAi);
    $('#btn-back-hist').addEventListener('click', goAi);
    $('#ai-login').addEventListener('click', goAuth);

    /* 知情同意 */
    ['ck-terms', 'ck-health'].forEach(function (id) {
      var el = $('#' + id);
      if (el) el.addEventListener('change', syncConsentBtn);
    });
    var okBtn = $('#consent-ok');
    if (okBtn) okBtn.addEventListener('click', function () {
      setConsent('full');
      closeConsent();
      if (window.location.hash === '' || window.location.hash === '#') { /* 留在首页 */ }
    });
    var skipBtn = $('#consent-skip');
    if (skipBtn) skipBtn.addEventListener('click', function () {
      setConsent('browse');
      closeConsent();
      toast('已设为仅浏览百科，使用自查或问答时会再次询问');
      if (location.hash !== 'wiki') location.hash = 'wiki';
    });
    document.addEventListener('click', function (e) {
      var a = e.target.closest ? e.target.closest('a[href="#legal"], a[href^="#legal:"]') : null;
      if (!a) return;
      e.preventDefault();
      var href = a.getAttribute('href');
      closeConsent();            /* 只是暂时收起，同意状态不变 */
      showLegal(href.indexOf(':') > 0 ? href.split(':')[1] : '');
    });
    var bl = $('#btn-back-legal');
    if (bl) bl.addEventListener('click', function () {
      if (!consentState()) {
        /* 从同意书跳过来看协议的，看完要回到同意书 */
        if (location.hash === '#legal' || location.hash.indexOf('#legal:') === 0) location.hash = '';
        setTimeout(openConsent, 240);
        return;
      }
      if (history.length > 1) history.back(); else goHome();
    });

    /* 删除我的数据 */
    var del = $('#aum-del');
    if (del) del.addEventListener('click', async function () {
      var menu = $('#ai-user-menu');
      if (menu) menu.hidden = true;
      if (!confirm('删除后无法恢复：云端对话记录、问答次数记录都会被清空。确定删除吗？')) return;
      try {
        var c = window.Cloud.client();
        var r = await c.database.rpc('delete_my_data');
        var d = r && r.data;
        if (!d || !d.ok) { toast(d && d.reason === 'not_signed_in' ? '请先登录' : '删除失败，请稍后再试'); return; }
        if (window.Auth) await window.Auth.signOut();
        updateAiTop();
        toast('已删除：对话 ' + (d.conversations || 0) + ' 条记录');
      } catch (e) {
        toast('删除失败，请检查网络后重试');
      }
    });
    $('#ai-user').addEventListener('click', function (e) {
      e.stopPropagation();
      var m = $('#ai-user-menu');
      if (m) m.hidden = !m.hidden;
    });
    document.addEventListener('click', function (e) {
      var m = $('#ai-user-menu');
      if (!m || m.hidden) return;
      if (e.target.closest && e.target.closest('#ai-user-menu, #ai-user')) return;
      m.hidden = true;
    });
    $('#aum-out').addEventListener('click', async function () {
      if (!confirm('退出登录？退出后按游客额度计算。')) return;
      var m = $('#ai-user-menu');
      if (m) m.hidden = true;
      if (window.Auth) await window.Auth.signOut();
      updateAiTop();
    });
    $('#ai-history').addEventListener('click', goHistory);
    $('#hist-new').addEventListener('click', function () {
      if (window.AI) window.AI.reset();
      goAi();
    });
    $('#hist-logout').addEventListener('click', async function () {
      if (!confirm('退出登录？退出后历史对话不会显示。')) return;
      if (window.Auth) await window.Auth.signOut();
      goHome();
    });
    document.addEventListener('auth:change', updateAiTop);
    if (window.Auth) window.Auth.init();
    updateAiTop();
    if (!consentState()) setTimeout(openConsent, 320);
    setTimeout(bootCheck, 1800);
    $('#btn-undo').addEventListener('click', undo);
    $('#btn-again').addEventListener('click', function () { start(cur.tree.id); });
    $('#btn-home').addEventListener('click', function () { goMod(cur.tree.mod); });
    $('#btn-share').addEventListener('click', shareResult);
    $('#clear-history').addEventListener('click', function (e) {
      e.stopPropagation();
      writeHistory([]);
      renderHistory();
    });
    window.addEventListener('hashchange', route);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { goBack(); return; }
      if (/^[1-9]$/.test(e.key) && $('#s-quiz').classList.contains('is-active')) {
        var idx = parseInt(e.key, 10) - 1;
        var btns = document.querySelectorAll('#q-opts .opt');
        if (btns[idx]) btns[idx].click();
      }
    });
  }

  validate();
  bind();
  route();
})();
