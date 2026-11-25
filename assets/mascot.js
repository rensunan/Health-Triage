(function () {
  'use strict';
  if (document.querySelector('.mascot')) return;

  var TIPS = [
    '扭伤头 48 小时冰敷，之后才热敷。顺序反了会更肿。',
    '发烧别急着吃抗生素，大多数是病毒，没用还伤肠胃。',
    '膝盖上下楼疼，先砍跑量，别硬撑。',
    '腰痛卧床超过两天，恢复反而更慢。',
    '肚子疼别先吃止痛药，会盖住阑尾炎的症状。',
    '咽口水都困难，直接去耳鼻喉，别等。',
    '崴脚后脚趾发麻、发凉，是急诊信号。',
    '落枕别硬扭，先热敷再缓慢活动。',
    '跑完拉伸别弹震，静态保持 20 秒以上。',
    '感冒后咳嗽超过 3 周，该拍个胸片了。'
  ];

  var ACTIONS = ['wave', 'jump', 'nod'];
  var tipIdx = -1;

  var root = document.createElement('div');
  root.className = 'mascot';
  root.setAttribute('role', 'button');
  root.setAttribute('tabindex', '0');
  root.setAttribute('aria-label', '医生助手，点一下有提示');
  root.innerHTML =
    '<img class="m-doctor" src="assets/doctor.png" alt="" width="228" height="360" draggable="false">' +
    '<div class="m-tip" hidden></div>';
  document.body.appendChild(root);

  var tipEl = root.querySelector('.m-tip');
  var hideTimer = null;

  function nextTip() {
    if (TIPS.length < 2) return TIPS[0] || '';
    var n;
    do { n = Math.floor(Math.random() * TIPS.length); } while (n === tipIdx);
    tipIdx = n;
    return TIPS[n];
  }

  function showTip(text, mini) {
    tipEl.textContent = text;
    tipEl.classList.toggle('mini', !!mini);
    tipEl.hidden = false;
    tipEl.classList.add('in');
    clearTimeout(hideTimer);
    hideTimer = setTimeout(hideTip, mini ? 5000 : 7000);
  }

  function hideTip() {
    tipEl.classList.remove('in');
    tipEl.hidden = true;
    clearTimeout(hideTimer);
  }

  function clearAction() {
    root.classList.remove('wave', 'jump', 'nod');
  }

  function act() {
    clearAction();
    var a = ACTIONS[Math.floor(Math.random() * ACTIONS.length)];
    void root.offsetWidth;
    root.classList.add(a);
    setTimeout(clearAction, 900);
    showTip(nextTip());
  }

  root.addEventListener('click', function (e) {
    if (e.target === tipEl) return;
    act();
  });
  root.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); act(); }
  });

  /* 首次进入给一次引导，同一会话只提示一次；用短气泡，别挡内容 */
  function hint() {
    var seen = false;
    try { seen = sessionStorage.getItem('mascot.hint') === '1'; } catch (e) {}
    if (seen) return;
    setTimeout(function () {
      if (document.body.classList.contains('view-home') && !root.classList.contains('is-away')) {
        showTip('点我，说个急救常识', true);
        try { sessionStorage.setItem('mascot.hint', '1'); } catch (e) {}
      }
    }, 2400);
  }

  /* 滚远了、或者快到页脚了，就收起来，别挡内容 */
  var away = false;
  function onScroll() {
    var y = window.scrollY || document.documentElement.scrollTop || 0;
    var foot = document.querySelector('.site-foot');
    /* 页脚露出来就收起，别压住免责声明 */
    var nearFoot = !!foot && foot.getBoundingClientRect().top < window.innerHeight - 40;
    var want = y > 340 || nearFoot;
    if (want === away) return;
    away = want;
    root.classList.toggle('is-away', away);
    if (away) hideTip();
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  onScroll();

  if (document.readyState === 'complete') hint();
  else window.addEventListener('load', hint);
})();
