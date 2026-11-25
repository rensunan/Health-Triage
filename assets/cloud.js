window.Cloud = (function () {
  var client = null;
  var loading = null;

  /* 依次尝试：本地副本 → jsdelivr → unpkg */
  var SRC = [
    'assets/vendor/wb-cloud-sdk.js',
    'https://cdn.jsdelivr.net/npm/@tencent-ai/workbuddy-cloud-sdk@dev/lib/index.global.js',
    'https://unpkg.com/@tencent-ai/workbuddy-cloud-sdk@dev/lib/index.global.js'
  ];

  function sdkOk() {
    return !!(window.WorkBuddyCloud && typeof window.WorkBuddyCloud.createWorkBuddyCloud === 'function');
  }

  function get() {
    if (client) return client;
    if (!sdkOk()) throw new Error('SDK_LOAD_FAILED');
    var cfg = window.CLOUD_CONFIG;
    if (!cfg || !cfg.endpoint || !cfg.publishableKey) throw new Error('CONFIG_MISSING');
    client = window.WorkBuddyCloud.createWorkBuddyCloud({
      endpoint: cfg.endpoint,
      publishableKey: cfg.publishableKey
    });
    return client;
  }

  /* 真正去拉组件；失败后 loading 置空，下次调用会重试（重试按钮靠这个生效） */
  function loadOnce() {
    if (sdkOk()) return Promise.resolve(true);
    if (loading) return loading;
    loading = new Promise(function (resolve) {
      var i = 0, done = false;
      function finish(ok) { if (!done) { done = true; resolve(ok); } }
      (function next() {
        if (sdkOk()) return finish(true);
        if (i >= SRC.length) return finish(false);
        var s = document.createElement('script');
        s.src = SRC[i++];
        s.async = true;
        s.onload = function () {
          setTimeout(function () { sdkOk() ? finish(true) : next(); }, 40);
        };
        s.onerror = next;
        document.head.appendChild(s);
      })();
    }).then(function (ok) {
      if (!ok) loading = null;
      return ok;
    });
    return loading;
  }

  /* 等组件就位，最多等 timeout 毫秒 */
  function ready(timeout) {
    if (sdkOk()) return Promise.resolve(true);
    return Promise.race([
      loadOnce(),
      new Promise(function (res) {
        setTimeout(function () { res(sdkOk()); }, timeout || 9000);
      })
    ]);
  }

  return { client: get, ready: ready, ok: sdkOk };
})();
