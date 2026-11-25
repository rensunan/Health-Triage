(function () {
  'use strict';

  var S = {
    session: null, user: null, pending: null, tab: 'login',
    ch: 'phone', busy: false, timer: null, timer2: null, timer3: null,
    phonePending: null, reset: null, resetMode: false
  };
  var $ = function (id) { return document.getElementById(id); };

  function client() {
    try { return window.Cloud.client(); }
    catch (e) { throw { friendly: '连接组件还没准备好，请稍等几秒再试，或刷新页面。' }; }
  }

  /* 组件可能还在加载，先等它就位再发请求 */
  async function waitSdk() {
    if (!window.Cloud || !window.Cloud.ready) return true;
    return await window.Cloud.ready(9000);
  }
  function setErr(msg, which) {
    var el = which === 'p' ? $('au-perr') : $('au-err');
    if (el) el.textContent = msg || '';
  }
  /* 忘记密码表单单独一条提示，发送成功用绿色 */
  function resetErr(msg, ok) {
    var el = $('au-rerr');
    if (!el) return;
    el.textContent = msg || '';
    el.className = 'au-err' + (ok ? ' ok' : '');
  }
  function email() { return ($('au-email').value || '').trim(); }
  function pwd() { return $('au-pass').value || ''; }
  function code() { return ($('au-code').value || '').trim(); }
  function phoneVal() { return ($('au-phone').value || '').replace(/\D/g, '').slice(0, 11); }
  function pcode() { return ($('au-pcode').value || '').replace(/\D/g, '').slice(0, 6); }
  function ppass() { return $('au-ppass').value || ''; }

  /* 发码限流：同一号码 60 秒冷却 + 每日 5 条。存在本地，刷新也拦得住。
     真正的防刷要靠服务端，这里只是把最容易的滥用挡住。 */
  var RL_KEY = 'triage.otp.rl.v1';
  function rlGet() {
    var today = new Date().toDateString();
    try {
      var o = JSON.parse(localStorage.getItem(RL_KEY) || '{}') || {};
      if (o.day !== today) return { day: today, n: 0, last: 0 };
      return o;
    } catch (e) { return { day: today, n: 0, last: 0 }; }
  }
  function rlSet(o) { try { localStorage.setItem(RL_KEY, JSON.stringify(o)); } catch (e) {} }

  function dispatch() {
    document.dispatchEvent(new CustomEvent('auth:change'));
    if (window.Quota) window.Quota.refresh().then(function () {
      if (window.AI && window.AI.renderQuota) window.AI.renderQuota();
    });
  }

  function render() {
    var tabs = document.querySelectorAll('.auth-tab[data-tab]');
    for (var i = 0; i < tabs.length; i++) {
      tabs[i].classList.toggle('on', tabs[i].getAttribute('data-tab') === S.tab);
    }
    var chs = document.querySelectorAll('.auth-tab[data-ch]');
    for (var j = 0; j < chs.length; j++) {
      chs[j].classList.toggle('on', chs[j].getAttribute('data-ch') === S.ch);
    }
    var isPhone = S.ch === 'phone';
    $('au-phone-form').hidden = !isPhone;
    $('au-email-pane').hidden = isPhone;

    var isSignup = S.tab === 'signup';
    $('au-code-row').hidden = !isSignup;
    $('au-submit').textContent = isSignup ? '注册并登录' : '登录';
    $('au-hint').textContent = isSignup
      ? '先获取邮箱验证码，再设置密码完成注册'
      : '用注册时的邮箱和密码登录';

    /* 忘记密码：邮箱面板切成重设表单，登录/注册开关先收起 */
    var rset = S.resetMode === true;
    if ($('au-tabs')) $('au-tabs').hidden = rset;
    if ($('au-form')) $('au-form').hidden = rset;
    if ($('au-reset-form')) $('au-reset-form').hidden = !rset;
  }

  function switchCh(ch) {
    if (S.busy || S.ch === ch) return;
    S.ch = ch;
    S.phonePending = null;
    S.resetMode = false;
    setErr('', 'e');
    setErr('', 'p');
    render();
  }

  function switchTab(tab) {
    if (S.busy) return;
    S.tab = tab;
    S.pending = null;
    S.resetMode = false;
    setErr('');
    resetErr('');
    $('au-code').value = '';
    $('au-send').textContent = '获取验证码';
    $('au-send').disabled = false;
    clearInterval(S.timer);
    render();
  }

  function countdown(sec, which) {
    var isPhone = which === 'p';
    var isReset = which === 'r';
    var btn = $(isPhone ? 'au-psend' : (isReset ? 'au-rsend' : 'au-send'));
    var key = isPhone ? 'timer2' : (isReset ? 'timer3' : 'timer');
    btn.disabled = true;
    var left = sec;
    clearInterval(S[key]);
    btn.textContent = left + ' 秒后可重发';
    S[key] = setInterval(function () {
      left--;
      if (left <= 0) {
        clearInterval(S[key]);
        btn.disabled = false;
        btn.textContent = '重新发送';
        return;
      }
      btn.textContent = left + ' 秒后可重发';
    }, 1000);
  }

  async function sendCode() {
    var em = email();
    await waitSdk();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) { setErr('请输入正确的邮箱地址'); return; }
    setErr('');
    try {
      var r = await client().auth.sendOtp({ email: em });
      if (r.error) { setErr(r.error.message || '验证码发送失败，稍后再试'); return; }
      S.pending = {
        email: em,
        verificationId: r.data.verificationId,
        isExistingUser: r.data.isExistingUser
      };
      countdown(60, 'e');
      $('au-code').focus();
      setErr('验证码已发送，请查收邮箱（含垃圾箱）');
    } catch (e) {
      setErr(e.friendly || '发送失败，请重试');
    }
  }

  /* ---------- 忘记密码（仅邮箱，SDK 没开手机号找回） ---------- */
  function openReset() {
    if (S.busy) return;
    S.resetMode = true;
    S.tab = 'login';
    var box = $('au-remail');
    var pre = email();
    if (!pre) { try { pre = localStorage.getItem('triage.email') || ''; } catch (e) {} }
    if (box) box.value = pre || '';
    resetErr('');
    $('au-rcode').value = '';
    $('au-rpass').value = '';
    $('au-rpass2').value = '';
    render();
    setTimeout(function () { var i = $('au-remail'); if (i) i.focus(); }, 60);
  }

  function closeReset() {
    S.resetMode = false;
    S.reset = null;
    clearInterval(S.timer3);
    var b = $('au-rsend');
    if (b) { b.disabled = false; b.textContent = '获取验证码'; }
    resetErr('');
    setErr('');
    render();
  }

  async function sendResetCode() {
    var em = ($('au-remail').value || '').trim();
    await waitSdk();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) { resetErr('请输入正确的邮箱地址'); return; }

    var st = rlGet();
    var now = Date.now();
    if (st.last && now - st.last < 60000) {
      var left = Math.ceil((60000 - (now - st.last)) / 1000);
      resetErr('1 分钟只能发一次，' + left + ' 秒后再试');
      countdown(left, 'r');
      return;
    }
    if (st.n >= 5) { resetErr('这台设备今天已经发过 5 次，请明天再试'); return; }

    resetErr('');
    var btn = $('au-rsend');
    btn.disabled = true;
    try {
      /* SDK 内部先 POST /v1/verification 发码，返回的 updateUser 负责「验证 + 改密 + 登录」 */
      var r = await client().auth.resetPasswordForEmail(em);
      if (r.error) {
        btn.disabled = false;
        resetErr('发送失败，确认这个邮箱注册过再试。');
        return;
      }
      S.reset = { email: em, handle: r.data };
      st.last = now;
      st.n = (st.n || 0) + 1;
      rlSet(st);
      countdown(60, 'r');
      $('au-rcode').focus();
      resetErr('验证码已发到 ' + em + '，请查收（含垃圾箱）', true);
    } catch (e) {
      btn.disabled = false;
      resetErr(e.friendly || '发送失败，请重试');
    }
  }

  async function submitReset() {
    if (S.busy) return;
    await waitSdk();
    var em = ($('au-remail').value || '').trim();
    var cd = ($('au-rcode').value || '').replace(/\D/g, '');
    var pw = $('au-rpass').value || '';
    var pw2 = $('au-rpass2').value || '';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) { resetErr('请输入正确的邮箱地址'); return; }
    if (!/^\d{6}$/.test(cd)) { resetErr('请输入 6 位数字验证码'); return; }
    if (!S.reset || S.reset.email !== em) { resetErr('请先获取这个邮箱的验证码'); return; }
    if (pw.length < 6) { resetErr('新密码至少 6 位'); return; }
    if (pw !== pw2) { resetErr('两次输入的新密码不一致'); return; }

    S.busy = true;
    var btn = $('au-rsubmit');
    var label = btn.textContent;
    btn.disabled = true;
    btn.textContent = '正在重置…';
    resetErr('');
    try {
      var r = await S.reset.handle.updateUser({ nonce: cd, password: pw });
      if (r.error) {
        resetErr('验证码不正确或已过期，请重新获取。一直收不到的话，确认这个邮箱是不是注册时用的那个。');
        return;
      }
      S.session = r.data || null;
      S.user = (r.data && r.data.user) || null;
      S.reset = null;
      try {
        localStorage.setItem('triage.email', em);
        localStorage.removeItem('triage.phone');
      } catch (e) {}
      clearInterval(S.timer3);
      $('au-rcode').value = '';
      $('au-rpass').value = '';
      $('au-rpass2').value = '';
      S.resetMode = false;
      dispatch();
      if (window.App && window.App.goAi) window.App.goAi();
    } catch (e) {
      resetErr(e.friendly || '重置失败，请重试');
    } finally {
      S.busy = false;
      btn.disabled = false;
      btn.textContent = label;
    }
  }

  async function submit() {
    if (S.busy) return;
    await waitSdk();
    var em = email(), pw = pwd();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) { setErr('请输入正确的邮箱地址'); return; }
    if (pw.length < 6) { setErr('密码至少 6 位'); return; }

    S.busy = true;
    $('au-submit').disabled = true;
    setErr('');
    try {
      var r;
      if (S.tab === 'signup') {
        var cd = code();
        if (!cd) { setErr('请输入邮箱验证码'); return; }
        if (!S.pending || S.pending.email !== em) { setErr('请先获取该邮箱的验证码'); return; }
        r = await client().auth.verifyOtp({
          email: em,
          verificationId: S.pending.verificationId,
          isExistingUser: S.pending.isExistingUser,
          token: cd,
          password: pw
        });
      } else {
        r = await client().auth.signInWithPassword({ email: em, password: pw });
      }
      if (r.error) {
        var msg = r.error.message || '';
        if (S.tab === 'login') setErr('邮箱或密码不正确');
        else setErr(msg || '注册失败，请检查验证码');
        return;
      }
      S.session = r.data || null;
      S.user = (r.data && r.data.user) || null;
      S.pending = null;
      /* SDK 的 user 对象不带 email，登录时用户输入的邮箱最可靠，记下来。
         同时清掉手机号缓存，避免两个身份缓存并存，页头显示上一个账号的手机号 */
      try {
        localStorage.setItem('triage.email', em);
        localStorage.removeItem('triage.phone');
      } catch (e) {}
      clearInterval(S.timer);
      $('au-pass').value = '';
      $('au-code').value = '';
      dispatch();
      if (window.App && window.App.goAi) window.App.goAi();
    } catch (e) {
      setErr(e.friendly || '操作失败，请重试');
    } finally {
      S.busy = false;
      $('au-submit').disabled = false;
    }
  }

  /* ---------- 手机号验证码 ---------- */
  async function sendPhoneCode() {
    var ph = phoneVal();
    await waitSdk();
    if (!/^1[3-9]\d{9}$/.test(ph)) { setErr('请输入正确的 11 位手机号', 'p'); return; }

    var st = rlGet();
    var now = Date.now();
    if (st.last && now - st.last < 60000) {
      var left = Math.ceil((60000 - (now - st.last)) / 1000);
      setErr('同一号码 1 分钟只能发一次，' + left + ' 秒后再试', 'p');
      countdown(left, 'p');
      return;
    }
    if (st.n >= 5) { setErr('这个号码今天已经发过 5 次，请明天再试', 'p'); return; }

    setErr('', 'p');
    try {
      var r = await client().auth.sendOtp({ phone: ph });
      if (r.error) { setErr(r.error.message || '验证码发送失败，稍后再试', 'p'); return; }
      S.phonePending = {
        phone: ph,
        verificationId: r.data.verificationId,
        isExistingUser: r.data.isExistingUser
      };
      st.last = now;
      st.n = (st.n || 0) + 1;
      rlSet(st);
      countdown(60, 'p');
      $('au-pcode').focus();
      setErr('验证码已发送，请注意查收短信', 'p');
    } catch (e) {
      setErr(e.friendly || '发送失败，请重试', 'p');
    }
  }

  /* 密码登录：手机号 + 密码 */
  async function loginPhonePassword() {
    if (S.busy) return;
    await waitSdk();
    var ph = phoneVal(), pw = ppass();
    if (!/^1[3-9]\d{9}$/.test(ph)) { setErr('请输入正确的 11 位手机号', 'p'); return; }
    if (pw.length < 6) { setErr('请输入密码（至少 6 位）', 'p'); return; }

    S.busy = true;
    $('au-psubmit').disabled = true;
    setErr('', 'p');
    try {
      var r = await client().auth.signInWithPassword({ phone: ph, password: pw });
      if (r.error) {
        setErr('手机号或密码不正确。没设过密码的话，用下面「用验证码登录」进一次。', 'p');
        return;
      }
      afterPhoneIn(r.data, ph);
    } catch (e) {
      setErr(e.friendly || '登录失败，请重试', 'p');
    } finally {
      S.busy = false;
      $('au-psubmit').disabled = false;
    }
  }

  /* 验证码登录 / 注册：新号注册时把密码一并设上（密码只能在注册时设置） */
  async function verifyPhoneCode() {
    if (S.busy) return;
    await waitSdk();
    var ph = phoneVal(), cd = pcode(), pw = ppass();
    if (!/^1[3-9]\d{9}$/.test(ph)) { setErr('请输入正确的 11 位手机号', 'p'); return; }
    if (!/^\d{6}$/.test(cd)) { setErr('请输入 6 位数字验证码', 'p'); return; }
    if (!S.phonePending || S.phonePending.phone !== ph) {
      setErr('请先获取这个号码的验证码', 'p');
      return;
    }
    /* 新号会走注册，密码必须现在设，之后没有补设的接口 */
    if (!S.phonePending.isExistingUser && pw.length < 6) {
      setErr('这个号码还没注册，请在上面的密码框设置至少 6 位密码后再点这里', 'p');
      return;
    }

    S.busy = true;
    $('au-pcodego').disabled = true;
    setErr('', 'p');
    try {
      var r = await client().auth.verifyOtp({
        phone: ph,
        verificationId: S.phonePending.verificationId,
        isExistingUser: S.phonePending.isExistingUser,
        token: cd,
        password: pw || undefined
      });
      if (r.error) { setErr('验证码不正确或已过期，请重新获取', 'p'); return; }
      afterPhoneIn(r.data, ph);
    } catch (e) {
      setErr(e.friendly || '登录失败，请重试', 'p');
    } finally {
      S.busy = false;
      $('au-pcodego').disabled = false;
    }
  }

  function afterPhoneIn(data, ph) {
    S.session = data || null;
    S.user = (data && data.user) || null;
    S.phonePending = null;
    try {
      localStorage.setItem('triage.phone', ph);
      localStorage.removeItem('triage.email');
    } catch (e) {}
    clearInterval(S.timer2);
    $('au-pcode').value = '';
    $('au-ppass').value = '';
    dispatch();
    if (window.App && window.App.goAi) window.App.goAi();
  }

  async function restore() {
    try {
      var r = await client().auth.getSession();
      S.session = (r && r.data) || null;
      S.user = (S.session && S.session.user) || null;
    } catch (e) {
      S.session = null;
      S.user = null;
    }
    dispatch();
  }

  async function signOut() {
    try { await client().auth.signOut(); } catch (e) {}
    try {
      localStorage.removeItem('triage.email');
      localStorage.removeItem('triage.phone');
    } catch (e) {}
    S.session = null;
    S.user = null;
    dispatch();
  }

  function bind() {
    if (bind.done) return;
    bind.done = true;
    var tabs = document.querySelectorAll('.auth-tab');
    for (var i = 0; i < tabs.length; i++) {
      tabs[i].addEventListener('click', function () { switchTab(this.getAttribute('data-tab')); });
    }
    $('au-send').addEventListener('click', sendCode);
    $('au-form').addEventListener('submit', function (e) {
      e.preventDefault();
      submit();
    });

    var chs = document.querySelectorAll('.auth-tab[data-ch]');
    for (var j = 0; j < chs.length; j++) {
      chs[j].addEventListener('click', function () { switchCh(this.getAttribute('data-ch')); });
    }
    $('au-psend').addEventListener('click', sendPhoneCode);
    $('au-pcodego').addEventListener('click', verifyPhoneCode);
    $('au-phone-form').addEventListener('submit', function (e) {
      e.preventDefault();
      loginPhonePassword();
    });
    /* 手机号输入框只留数字 */
    $('au-phone').addEventListener('input', function () {
      var v = this.value.replace(/\D/g, '').slice(0, 11);
      if (v !== this.value) this.value = v;
    });
    $('au-pcode').addEventListener('input', function () {
      var v = this.value.replace(/\D/g, '').slice(0, 6);
      if (v !== this.value) this.value = v;
    });

    /* 忘记密码 */
    $('au-forgot').addEventListener('click', openReset);
    $('au-rback').addEventListener('click', closeReset);
    $('au-rsend').addEventListener('click', sendResetCode);
    $('au-reset-form').addEventListener('submit', function (e) {
      e.preventDefault();
      submitReset();
    });
    $('au-rcode').addEventListener('input', function () {
      var v = this.value.replace(/\D/g, '').slice(0, 6);
      if (v !== this.value) this.value = v;
    });
  }

  window.Auth = {
    init: function () { bind(); render(); restore(); },
    isIn: function () { return !!S.session; },
    user: function () { return S.user; },
    signOut: signOut,
    open: function (tab) {
      bind();
      switchTab(tab || 'login');
      setErr('', 'e');
      setErr('', 'p');
    }
  };
})();
