window.Quota = (function () {
  var fpCache = '';
  var subs = [];
  var S = {
    scope: 'guest', limit: 0, used: 0, remaining: 0,
    allowed: true, known: false, degraded: false, failed: false, err: ''
  };

  /* ---------- 设备指纹 ----------
     不依赖任何存储：刷新、清 localStorage、开无痕都得到同一个值。
     用 UA / 硬件 / 屏幕物理分辨率 / 时区 / 画布渲染 / 显卡型号 拼出来。 */
  function h32(s, seed) {
    var h = seed >>> 0;
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return ('0000000' + h.toString(16)).slice(-8);
  }

  function canvasSig() {
    try {
      var c = document.createElement('canvas');
      c.width = 240; c.height = 60;
      var x = c.getContext('2d');
      if (!x) return '';
      x.textBaseline = 'top';
      x.font = '16px Arial';
      x.fillStyle = '#f60';
      x.fillRect(10, 4, 120, 24);
      x.fillStyle = '#069';
      x.fillText('health-triage fp', 12, 8);
      x.fillStyle = 'rgba(102,204,0,0.7)';
      x.fillText('health-triage fp', 14, 20);
      var g = x.createLinearGradient(0, 0, 240, 0);
      g.addColorStop(0, '#0af');
      g.addColorStop(1, '#f0a');
      x.fillStyle = g;
      x.fillRect(0, 36, 240, 20);
      return c.toDataURL();
    } catch (e) { return ''; }
  }

  function glSig() {
    try {
      var gl = document.createElement('canvas').getContext('webgl');
      if (!gl) return '';
      var d = gl.getExtension('WEBGL_debug_renderer_info');
      return d ? (gl.getParameter(d.UNMASKED_RENDERER_WEBGL) || '') : '';
    } catch (e) { return ''; }
  }

  function fingerprint() {
    if (fpCache) return fpCache;
    var p = [];
    try {
      p.push(navigator.userAgent || '');
      p.push(navigator.platform || '');
      p.push(navigator.language || '');
      p.push((navigator.languages || []).join(','));
      p.push(navigator.hardwareConcurrency || 0);
      p.push(navigator.deviceMemory || 0);
      p.push(navigator.maxTouchPoints || 0);
      /* 注意：不能把 devicePixelRatio 或屏幕 CSS 尺寸算进来。
         浏览器缩放会让它们变化（实测缩放后指纹从 d1e654… 变成 d19bcb…），
         结果就是「按一下 Ctrl+加减号就白拿 5 次」。只留色彩深度这种稳定项。 */
      p.push(screen.colorDepth || 0);
      p.push(new Date().getTimezoneOffset());
      try { p.push(Intl.DateTimeFormat().resolvedOptions().timeZone || ''); } catch (e) {}
      p.push(canvasSig());
      p.push(glSig());
    } catch (e) {}
    var s = p.join('|');
    fpCache = 'd1' + h32(s, 2166136261) + h32(s, 1099511628);
    return fpCache;
  }

  /* 本地设备 ID：与指纹互为备份。
     指纹会因缩放/换 UA 变，这个会因清缓存变，服务端拿两个键一起去今天的记录里找，
     只要有一个还在，就沿用原来的计数，不会重新给 5 次。 */
  var LID_KEY = 'triage.did';

  function localId() {
    try {
      var v = localStorage.getItem(LID_KEY);
      if (v && /^[a-z0-9]{12,40}$/.test(v)) return v;
      var rnd = '';
      try {
        var buf = new Uint8Array(10);
        (window.crypto || window.msCrypto).getRandomValues(buf);
        for (var i = 0; i < buf.length; i++) rnd += ('0' + buf[i].toString(16)).slice(-2);
      } catch (e) {
        rnd = Math.random().toString(36).slice(2, 12) + Date.now().toString(36);
      }
      v = 'g' + rnd;
      localStorage.setItem(LID_KEY, v);
      return v;
    } catch (e) { return ''; }
  }

  /* ---------- 服务端调用 ---------- */
  function rpc(action) {
    /* 组件可能还在加载（弱网/首次进入），先等它就位再去查次数 */
    var wait = (window.Cloud && window.Cloud.ready) ? window.Cloud.ready(6000) : Promise.resolve(false);
    return wait.then(function (ok) {
      if (!ok) return null;
      var c;
      try { c = window.Cloud.client(); } catch (e) { return null; }
      if (!c || !c.database || typeof c.database.rpc !== 'function') return null;
      return c.database.rpc('ai_quota', { p_action: action, p_fp: fingerprint(), p_lid: localId() })
        .then(function (r) {
          if (r && r.error) { S.err = 'rpc:' + (r.error.code || r.error.message || 'error'); return null; }
          return r && r.data ? r.data : null;
        })
        .catch(function (e) { S.err = 'rpc:' + ((e && (e.message || e.name)) || 'exception'); return null; });
    }).catch(function () { return null; });
  }

  function apply(d) {
    if (!d) {
      S.failed = true;
      if (!S.err) S.err = 'no-data';
      notify();
      return false;
    }
    S.failed = false;
    S.err = '';
    S.scope = d.scope;
    S.limit = d.limit;
    S.used = d.used;
    S.remaining = d.remaining;
    S.allowed = !!d.allowed;
    S.known = true;
    S.degraded = false;
    notify();
    return true;
  }

  function notify() {
    for (var i = 0; i < subs.length; i++) subs[i](S);
  }

  function onChange(fn) { subs.push(fn); }

  function refresh() {
    return rpc('check').then(apply);
  }

  function consume() {
    return rpc('consume').then(function (d) {
      if (!apply(d)) {
        S.degraded = true;
        return { allowed: true, degraded: true, remaining: null, limit: null, scope: 'guest' };
      }
      return S;
    });
  }

  function refund() {
    return rpc('refund').then(apply);
  }

  function label() {
    if (!S.known) {
      return S.failed ? '次数暂时读不到 · 点此重试' : '正在读取剩余次数…';
    }
    if (S.scope === 'user') return '今日还剩 ' + S.remaining + ' 次';
    return '游客 · 还剩 ' + S.remaining + ' 次';
  }

  return {
    fingerprint: fingerprint,
    localId: localId,
    refresh: refresh,
    failed: function () { return S.failed; },
    retry: function () { S.failed = false; return refresh(); },
    consume: consume,
    refund: refund,
    state: function () { return S; },
    label: label,
    onChange: onChange
  };
})();
