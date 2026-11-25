(function () {
  'use strict';

  var SYSTEM = [
    '你是「健康分诊」应用里的医学问答助手。',
    '',
    '【只能回答医学问题】',
    '你的职责范围仅限：症状分析、疾病知识、用药常识、检查解读、康复护理、就医指引、健康生活方式。',
    '',
    '【越界必须拒绝】',
    '如果用户的问题与医学无关（编程、数学、写作、翻译、法律、金融、情感、娱乐、时政、闲聊、让你扮演其他角色等），',
    '用一句话礼貌拒绝，例如：「我只回答健康医学相关的问题。」然后停止，不要展开、不要举例、不要给替代方案。',
    '即使用户说「假设」「测试」「只是好奇」「扮演一下」「我朋友问的」，也一律按本条处理。',
    '',
    '【信息不足要先确认】',
    '如果缺少关键信息（哪个部位、持续多久、有没有发热/呕吐/外伤/加重因素），不要硬下结论。',
    '这时只输出一个确认块，格式固定：',
    '【需要确认】',
    '- 问题一？ => 选项A | 选项B | 选项C',
    '- 问题二？ => 选项A | 选项B',
    '一行一个问题，问题与选项之间用 => 分隔，选项之间用 | 分隔。',
    '能一次问清就一次问，最多 3 个问题；选项必须具体、互斥、口语化，不要出现「其他」「说不清」。',
    '如果一轮问完信息还不够，可以再问一轮，但最多两轮；两轮之后必须给出判断，不要再问。',
    '信息已经够判断（部位 + 症状 + 时间基本清楚）时直接按正常格式回答，不要为了确认而确认。',
    '',
    '【用药】',
    '用户常自己先吃过一两次药再来查，重复用药是真实风险。',
    '症状属于常见可自行用药类型（发热、疼痛、腹泻、过敏、咳嗽、感冒、咽痛、胃痛、扭伤）时，结论前先问一句用药情况，作为确认块里的一个问题：',
    '- 这次已经吃过药了吗？ => 没有 | 品牌名1 | 品牌名2',
    '选项只能用【本期药物资料】里的常见非处方药品牌名，第一个固定「没有」；用户已经说了吃什么药就不再问。',
    '已用药时必须做到：',
    '1. 第一句就点明「已经吃过 X，别再叠加 Y」。',
    '2. 单独一个【用药指导】块，写清楚不能叠加的成分和间隔原则；资料里「必须提醒」的内容一条都不能漏。',
    '3. 涉及抗菌药、处方药、或明显超过说明书用量 → 建议停药并尽快就医。',
    '如果用户提到正在吃头孢、甲硝唑这类抗菌药，不要等问完：第一句就提醒「服药期间及停药后数天内严格禁酒，也要避开藿香正气水、酒心巧克力、醉蟹等含酒精的东西」。',
    '说药名用用户听得懂的常见品牌名或俗称，通用名只在括号里补一次。',
    '【绝对不给剂量】不许写任何具体用量，包括 mg、g、ml、片数、粒数、袋数、喷几下、每天几次。统一说「按说明书剂量服用」或「按药师指导服用」。',
    '儿童（14 岁以下）一律建议用儿童剂型、按体重由医生或药师确定用量；不要让家长自己折算成人药量，也不要建议掰开成人药片。',
    '用户提到怀孕、备孕、哺乳，必须单独提醒资料里「孕期/哺乳」那条，并建议先咨询医生。',
    '',
    '【回答方式】',
    '1. 第一句先给结论，不超过 40 字，独立成行，前面不要加任何标题。',
    '2. 不要下确定诊断：不写「你得了 X」，用「常见于」「可能是」这类表述；把握不足就建议就医，不要编一个病名。',
    '3. 结论之后分块，标题单独占一行、用【】括起来。输出哪些块以文末【输出块设置】为准；没有该设置时用这三块：',
    '【病因分析】',
    '【解决方案】',
    '【就医指征】',
    '其余可用块：【用药指导】【病程与预后】【活动与工作建议】【就诊提问清单】，按设置决定是否输出。',
    '',
    '【写到能照着做的程度】这条最重要：',
    '- 每块 3–5 条，每条 25–60 字，写成完整的一句话，不要只给关键词或四字短语。',
    '- 每条都要写清「做什么 + 怎么做 + 做到什么程度」：具体动作、持续多久、几次、什么体位或温度、看什么指标。',
    '- 能自测的给出自测方法，例如「用手指按内踝骨头突起处，明显压痛就要去拍片」。',
    '- 常见误区直接点名，例如「不要用红花油揉搓，会加重肿胀和出血」。',
    '- 不许用「注意休息」「多喝水」「清淡饮食」这类空话单独占一条，要写清怎么做。',
    '- 目标是一次说透：用户看完这一屏就能直接照做，不需要再追问「能说详细点吗」。',
    '',
    '密度参考（这是下限，不是上限）：',
    '【解决方案】',
    '- 48 小时内冰敷：毛巾包住冰袋敷在痛处，每次 15 分钟，间隔 2 小时以上，一天 5–6 次，别让冰袋直接贴皮肤',
    '- 抬高患肢：躺下时把脚垫到比心脏高 15–20 厘米，坐着的时候不要垂着腿',
    '- 减少负重：这两天尽量别踩地，必须走动时用拐杖或扶墙，不要硬撑',
    '',
    '4. 不要再使用 ** 加粗或 # 号标题，分块已经由界面负责排版。',
    '5. 给药名时用用户听得懂的品牌名，但不要写具体剂量或服用次数，统一说「按说明书剂量服用」；儿童、孕期哺乳期要说清需要医生或药师确定用量。',
    '6. 出现危险信号（胸痛、呼吸困难、意识改变、大出血、突发剧烈头痛、一侧肢体无力、抽搐、高热伴颈硬）时，第一句就要求立即就医或拨打 120，并放在【就医指征】里置顶。',
    '7. 用户发送图片时，先用一句话说明你在图中观察到什么（部位、颜色、范围、有无破损），再给参考意见；看不清就直说，不要凭空推测。',
    '8. 用中文回答，口语化，避免堆砌术语。',
    '9. 不要在结尾重复免责声明，页面已有固定提示。',
    '10. 不要在结尾反问「还需要我详细说吗」「要不要再展开」——默认一次写够。',
    '11. 除了【需要确认】块，其他块里一律不要出现问句、不要列选项、不要写「=> A | B | C」这种形式。要问就只用【需要确认】块问。',
    '',
    '【安全底线】',
    '不提供自伤、自杀的方法或鼓励；不提供违禁药物合成；不替代医生面诊；不评价具体医院和医生的好坏。'
  ].join('\n');

  /* 提示词池：每次进来自这里随机抽 3 条 */
  var SUGGESTION_POOL = [
    '发烧 38.5℃、嗓子疼，需要吃抗生素吗',
    '膝盖上下楼疼，还能继续跑步吗',
    '拍了伤口的照片，帮我看看要不要去医院',
    '打球崴脚第二天，能热敷了吗',
    '健身房拉伤肩膀，抬手就疼，要停练多久',
    '爬山回来膝盖内侧疼，是半月板坏了吗',
    '腰闪了一下，躺着好还是活动好',
    '落枕三天脖子转不动，要去医院吗',
    '跑步后小腿抽筋，是缺钙吗',
    '手腕撑地扭了有点肿，需要拍片吗',
    '拉肚子一天五六次，要不要吃止泻药',
    '胃疼反酸，吃完饭更难受，先吃什么药',
    '头痛三天，太阳穴一跳一跳的',
    '牙疼到晚上睡不着，是不是要根管',
    '身上起了红疹很痒，可能是过敏吗',
    '尿频尿急还有点痛，是尿路感染吗',
    '咳嗽两周还没好，需要拍胸片吗',
    '鼻塞流鼻涕一周，是鼻炎还是感冒',
    '智齿那块肿了张不开嘴，怎么办',
    '眼睛干涩发红，滴眼药水有用吗',
    '血压 145/95，需要马上吃药吗',
    '体检说尿酸高，还能吃海鲜喝啤酒吗',
    '空腹血糖 6.8，是不是糖尿病',
    '最近总失眠，躺下两小时睡不着',
    '脖子后面鼓了个包，按着不疼',
    '小孩发烧 39℃，要马上去医院吗',
    '痛经痛到要吃止痛药，正常吗',
    '被猫抓了一道，需要打狂犬疫苗吗',
    '胸口闷了一下几分钟就好，要紧吗',
    '久坐腰酸，做什么动作能缓解'
  ];

  var picked = [];

  function pickSuggestions() {
    var pool = SUGGESTION_POOL.slice();
    for (var i = pool.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = pool[i]; pool[i] = pool[j]; pool[j] = t;
    }
    picked = pool.slice(0, 3);
    return picked;
  }

  var state = {
    cloud: null,
    model: null,
    canImage: false,
    messages: [],
    busy: false,
    img: null,
    started: false,
    initError: null,
    silent: false
  };

  function $(id) { return document.getElementById(id); }  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function fmt(s) {
    var e = esc(s);
    e = e.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    e = e.replace(/^#{1,4}\s*(.+)$/gm, '<strong>$1</strong>');
    e = e.replace(/^\s*[-•]\s+/gm, '· ');
    e = e.replace(/\n{3,}/g, '\n\n');
    return e.replace(/\n/g, '<br>');
  }

  function inline(s) {
    return esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  }

  /* ---------- 结构化回复：把【小标题】拆成带颜色的卡片 ---------- */
  var BLK_TONE = [
    { re: /提问|问诊|就诊清单|要问/, tone: 'blue' },
    { re: /就医|医院|急诊|就诊|危险|信号|指征|警示|红旗|什么情况|什么时候/, tone: 'red' },
    { re: /药|用药|止痛|抗生素|剂量/, tone: 'amber' },
    { re: /解决方案|解决|方案|现在|能做|怎么办|处理|护理|缓解|自救|恢复|注意/, tone: 'teal' },
    { re: /病因|原因|可能|判断|是什么|评估|考虑|怎么回事/, tone: 'violet' }
  ];

  function toneOf(title) {
    for (var i = 0; i < BLK_TONE.length; i++) if (BLK_TONE[i].re.test(title)) return BLK_TONE[i].tone;
    return 'gray';
  }

  function splitBlocks(text) {
    var lines = String(text).replace(/\r/g, '').split('\n');
    var lead = [], blocks = [], cur = null;
    for (var i = 0; i < lines.length; i++) {
      var ln = lines[i].trim();
      if (!ln) continue;
      var m = ln.match(/^【\s*(.{1,18}?)\s*】\s*[:：]?\s*(.*)$/) ||
              ln.match(/^#{2,4}\s*(.{1,18}?)\s*[:：]?\s*(.*)$/);
      if (m) {
        cur = { title: m[1], note: (m[2] || '').trim(), items: [] };
        blocks.push(cur);
        /* 标题同一行接了内容的，按条目处理 */
        if (cur.note) {
          if (/^[-·•*]|^\d+[.、)]/.test(cur.note)) { cur.items.push(cur.note); cur.note = ''; }
        }
        continue;
      }
      if (cur) cur.items.push(ln);
      else lead.push(ln);
    }
    return { lead: lead, blocks: blocks };
  }

  function askGroups(b) {
    var qs = [], anySep = false;
    b.items.forEach(function (x) {
      var line = x.replace(/^[-·•*]\s*/, '').replace(/^\d+[.、)]\s*/, '');
      var parts = line.split(/\s*(?:=>|⇒|→|::)\s*/);
      if (parts.length >= 2) {
        anySep = true;
        var opts = parts.slice(1).join(' ')
          .split(/\s*[|｜]\s*/)
          .map(function (s) { return s.trim(); })
          .filter(Boolean);
        qs.push({ q: parts[0].trim(), opts: opts });
      }
    });
    if (anySep) return qs;
    var opts2 = b.items.map(function (x) {
      return x.replace(/^[-·•*]\s*/, '').replace(/^\d+[.、)]\s*/, '').trim();
    }).filter(Boolean);
    return [{ q: b.note || '', opts: opts2 }];
  }

  function renderRich(text) {
    var p = splitBlocks(text);
    if (!p.blocks.length) return fmt(text);
    var html = '';
    var leadUsedByAsk = false;

    p.blocks.forEach(function (b) {
      var isAsk = /确认|补充|选择|是否/.test(b.title);
      if (isAsk) {
        var groups = askGroups(b);
        var q0 = groups[0] && groups[0].q;
        if (!q0 && p.lead.length && !leadUsedByAsk) { q0 = p.lead.join(' '); groups[0].q = q0; leadUsedByAsk = true; }
        html += '<div class="blk blk-ask"><div class="blk-h">' + esc(b.title) + '</div>';
        if (groups.length === 1 && groups[0].q) {
          html += '<p class="ask-q">' + inline(groups[0].q) + '</p>';
        }
        groups.forEach(function (g) {
          html += '<div class="ask-grp" data-q="' + esc(g.q || '') + '">' +
            (groups.length > 1 && g.q ? '<p class="ask-qt">' + inline(g.q) + '</p>' : '') +
            '<div class="ask-opts">' +
            g.opts.map(function (o) {
              return '<button class="ask-opt" type="button">' + esc(o) + '</button>';
            }).join('') +
            '<button class="ask-opt ask-other" type="button">自己写…</button>' +
            '</div></div>';
        });
        html += '</div>';
        return;
      }
      var tone = toneOf(b.title);
      var lis = b.items.map(function (x) {
        var t = x.replace(/^[-·•*]\s*/, '').replace(/^\d+[.、)]\s*/, '');
        return '<li>' + inline(t) + '</li>';
      }).join('');
      html += '<div class="blk c-' + tone + '">' +
        '<div class="blk-h">' + esc(b.title) + '</div>' +
        (b.note ? '<p class="blk-note">' + inline(b.note) + '</p>' : '') +
        (lis ? '<ul>' + lis + '</ul>' : '') +
        '</div>';
    });

    if (p.lead.length && !leadUsedByAsk) {
      html = '<p class="blk-lead">' + inline(p.lead.join(' ')) + '</p>' + html;
    }
    return html;
  }

  function hasBlocks(text) {
    return /【\s*.{1,18}?\s*】|^#{2,4}\s/m.test(String(text));
  }

  function paint(bubble, text) {
    if (!bubble) return;
    bubble.innerHTML = renderRich(text);
    bubble.classList.toggle('has-blocks', hasBlocks(text));
    scrollBottom();
  }

  /* ---------- 确认弹窗 ---------- */
  var askCard = null, askData = [], askPicked = [], askCustom = [];

  function markAsksDone() {
    var cards = chatEl().querySelectorAll('.blk-ask');
    for (var i = 0; i < cards.length; i++) cards[i].classList.add('done');
  }

  function closeAsk() {
    var m = $('ask-mask');
    if (!m || m.hidden) return;
    m.classList.remove('in');
    setTimeout(function () { m.hidden = true; }, 180);
  }

  function syncGo() {
    var go = $('ask-go');
    if (!go) return;
    var all = askPicked.length && askPicked.every(function (x) { return x != null && x !== ''; });
    var single = askData.length === 1;
    if (single) {
      /* 单问题时点选项就提交，只有手写才需要确认按钮 */
      go.hidden = !all;
      go.disabled = !all;
      return;
    }
    go.hidden = false;
    go.disabled = !all;
  }

  var askSubmitted = false;

  function submitAsk() {
    if (askSubmitted) return;
    askSubmitted = true;
    var anyCustom = askCustom.some(function (x) { return x; });
    var parts = askData.map(function (g, i) {
      var v = askPicked[i];
      return g.q ? g.q.replace(/[？?]\s*$/, '') + '：' + v : v;
    });
    var text = parts.join('；');
    closeAsk();
    answer(text, askCard, anyCustom);
  }

  function openAsk(card) {
    var mask = $('ask-mask');
    if (!mask || !card || card.classList.contains('done')) return;
    askCard = card;
    askData = [].map.call(card.querySelectorAll('.ask-grp'), function (g) {
      return {
        q: g.getAttribute('data-q') || '',
        opts: [].map.call(g.querySelectorAll('.ask-opt:not(.ask-other)'), function (b) { return b.textContent; })
      };
    });
    if (!askData.length) return;
    askPicked = askData.map(function () { return null; });
    askCustom = askData.map(function () { return false; });
    askSubmitted = false;

    var single = askData.length === 1;
    var qEl = $('ask-q');
    qEl.textContent = single ? (askData[0].q || '想再确认一下你的情况') : '回答下面几个问题，就能给判断';
    qEl.hidden = !single;

    var box = $('ask-opts');
    box.innerHTML = '';

    askData.forEach(function (g, gi) {
      var isMed = /药|吃过|服用|吃了/.test(g.q);
      var grp = document.createElement('div');
      grp.className = 'sheet-grp';

      if (!single && g.q) {
        var qt = document.createElement('p');
        qt.className = 'sheet-qt';
        qt.textContent = g.q;
        grp.appendChild(qt);
      }

      var row = document.createElement('div');
      row.className = 'sheet-row';

      var inp = document.createElement('input');
      inp.className = 'sheet-input';
      inp.type = 'text';
      inp.autocomplete = 'off';
      inp.hidden = true;
      inp.placeholder = isMed
        ? '写药名和次数，比如「布洛芬 0.3g 吃过两次」'
        : '用一句话补充，比如「疼了三天，晚上更厉害」';
      inp.addEventListener('input', function () {
        askPicked[gi] = inp.value.trim() || null;
        askCustom[gi] = !!inp.value.trim();
        syncGo();
      });
      inp.addEventListener('keydown', function (e) {
        if (e.key !== 'Enter') return;
        var v = inp.value.trim();
        if (!v) return;
        e.preventDefault();
        if (single) { closeAsk(); answer(v, askCard, true); return; }
        var all = askPicked.every(function (x) { return x != null && x !== ''; });
        if (all) submitAsk(); else syncGo();
      });

      g.opts.forEach(function (o) {
        var b = document.createElement('button');
        b.type = 'button';
        b.textContent = o;
        b.addEventListener('click', function () {
          var sibs = row.querySelectorAll('button');
          for (var i = 0; i < sibs.length; i++) sibs[i].classList.toggle('on', sibs[i] === b);
          inp.hidden = true;
          inp.value = '';
          askPicked[gi] = o;
          askCustom[gi] = false;
          if (single) { closeAsk(); answer(o, askCard); }
          else syncGo();
        });
        row.appendChild(b);
      });

      /* 每个问题都带一个「自己写」，不用滚到底部找 */
      var other = document.createElement('button');
      other.type = 'button';
      other.className = 'sheet-other';
      other.textContent = '自己写…';
      other.addEventListener('click', function () {
        var sibs = row.querySelectorAll('button');
        for (var i = 0; i < sibs.length; i++) sibs[i].classList.toggle('on', sibs[i] === other);
        inp.hidden = false;
        inp.focus();
        askPicked[gi] = inp.value.trim() || null;
        askCustom[gi] = !!inp.value.trim();
        syncGo();
      });
      row.appendChild(other);

      grp.appendChild(row);
      grp.appendChild(inp);
      box.appendChild(grp);
    });

    var go = $('ask-go');
    go.hidden = true;
    go.disabled = true;
    mask.hidden = false;
    requestAnimationFrame(function () { mask.classList.add('in'); });
  }

  function answer(text, card, isCustom) {
    if (card && !card.classList.contains('answered')) {
      card.classList.add('answered', 'done');
      var tag = document.createElement('p');
      tag.className = 'ask-done';
      tag.textContent = (isCustom ? '已补充：' : '已选择：') + text;
      card.appendChild(tag);
    }
    markAsksDone();
    state.silent = true;              /* 这一轮不生成用户气泡 */
    $('ai-input').value = text;
    autoGrow();
    updateSend();
    send({ silent: true });
  }

  function maybeOpenAsk() {
    var scr = $('s-ai');
    if (!scr || !scr.classList.contains('is-active')) return;
    var cards = chatEl().querySelectorAll('.blk-ask:not(.done)');
    if (!cards.length) return;
    openAsk(cards[cards.length - 1]);
  }

  /* ---------- 患者信息（年龄 / 性别） ---------- */
  var PROF_KEY = 'patient.profile.v1';
  var AGES = ['<1 岁', '1–3 岁', '4–6 岁', '7–11 岁', '12–13 岁', '14–17 岁', '18–44 岁', '45–64 岁', '65 岁以上'];
  var STATES = ['未孕', '备孕', '孕期', '哺乳期'];
  var PROF = { sex: '', age: '', state: '' };

  function getProfile() {
    try {
      var s = localStorage.getItem(PROF_KEY);
      var p = s ? JSON.parse(s) : null;
      /* 旧版本把 12–17 岁合成一档，14 岁边界不清，清空让其重选 */
      if (p && p.age === '12–17 岁') {
        p.age = '';
        try { localStorage.setItem(PROF_KEY, JSON.stringify(p)); } catch (e) {}
      }
      return p;
    } catch (e) { return null; }
  }

  function setProfile(p) {
    try { localStorage.setItem(PROF_KEY, JSON.stringify(p)); } catch (e) {}
    renderCtx();
  }

  function isUnder14(a) {
    return a === '<1 岁' || a === '1–3 岁' || a === '4–6 岁' || a === '7–11 岁' || a === '12–13 岁';
  }

  function profilePrompt() {
    var p = getProfile();
    if (!p || !p.sex || !p.age) return '';
    var s = '\n\n【患者信息｜每次回答都必须按这个人给建议】\n性别：' + p.sex + '\n年龄：' + p.age;
    if (p.state) s += '\n状态：' + p.state;
    if (isUnder14(p.age)) {
      s += '\n→ 未满 14 岁：只说「儿童能不能用」，不给任何用量，一律建议由监护人带去看医生或咨询药师；禁止把成人药量减半，禁止让儿童掰成人药片。';
    }
    if (p.state === '孕期' || p.state === '哺乳期' || p.state === '备孕') {
      s += '\n→ 必须把药物资料里「孕期哺乳」那一条单独说出来。';
    }
    if (p.age === '65 岁以上') {
      s += '\n→ 老年人：提醒肾功能减退、同时吃多种药容易相互影响，用药前先问医生或药师。';
    }
    s += '\n→ 不要推荐与该性别、年龄不匹配的药（坦索罗辛只用于男性，克霉唑阴道片只用于女性）。';
    return s;
  }

  function fillSel(sel, items, cur, ph) {
    if (!sel) return;
    sel.innerHTML = '';
    if (ph) {
      var o0 = document.createElement('option');
      o0.value = '';
      o0.textContent = ph;
      sel.appendChild(o0);
    }
    items.forEach(function (v) {
      var o = document.createElement('option');
      o.value = v;
      o.textContent = v;
      sel.appendChild(o);
    });
    sel.value = cur || (ph ? '' : items[0]);
  }

  function renderCtx() {
    var el = $('ai-ctx');
    if (!el) return;
    var p = getProfile();
    if (!p || !p.sex || !p.age) { el.hidden = true; return; }
    el.hidden = false;
    fillSel($('prof-sex-sel'), ['男', '女'], p.sex);
    fillSel($('prof-age-sel'), AGES, p.age);
    var need = p.sex === '女' && WORK_AGE.indexOf(p.age) >= 0;
    $('prof-ctx-state').hidden = !need;
    fillSel($('prof-state-sel'), STATES, p.state || '', '特殊状态');
    syncCtxLock();
  }

  /* 对话一旦开始，年龄性别就锁定，改要走新对话 */
  function syncCtxLock() {
    var bar = $('ai-ctx');
    if (!bar) return;
    var locked = state.messages.length > 0;
    bar.classList.toggle('is-locked', locked);
    ['prof-sex-sel', 'prof-age-sel', 'prof-state-sel'].forEach(function (id) {
      var s = $(id);
      if (s) s.disabled = locked;
    });
  }

  function tip(msg) {
    var t = document.querySelector('.toast');
    if (!t) {
      t = document.createElement('div');
      t.className = 'toast';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    requestAnimationFrame(function () { t.classList.add('in'); });
    clearTimeout(tip._t);
    tip._t = setTimeout(function () { t.classList.remove('in'); }, 2600);
  }

  function chipRow(el, items, key, after) {
    el.innerHTML = '';
    items.forEach(function (v) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = v;
      if (PROF[key] === v) b.classList.add('on');
      b.addEventListener('click', function () {
        PROF[key] = (PROF[key] === v) ? '' : v;
        var sibs = el.querySelectorAll('button');
        for (var i = 0; i < sibs.length; i++) {
          sibs[i].classList.toggle('on', sibs[i].textContent === PROF[key]);
        }
        if (after) after();
      });
      el.appendChild(b);
    });
  }

  var WORK_AGE = ['12–17 岁', '18–44 岁', '45–64 岁'];

  function refreshProfForm() {
    var needState = PROF.sex === '女' && WORK_AGE.indexOf(PROF.age) >= 0;
    $('prof-state-wrap').hidden = !needState;

    var under = isUnder14(PROF.age);
    var gw = $('prof-guard-wrap');
    if (gw) gw.hidden = !under;
    var gk = $('prof-guard');
    if (!under && gk) gk.checked = false;

    var ok = !!(PROF.sex && PROF.age);
    if (under && !(gk && gk.checked)) ok = false;
    $('prof-save').disabled = !ok;
  }

  function openProfile() {
    var p = getProfile();
    PROF = { sex: (p && p.sex) || '', age: (p && p.age) || '', state: (p && p.state) || '' };
    chipRow($('prof-sex'), ['男', '女'], 'sex', function () {
      if (PROF.sex !== '女') PROF.state = '';
      refreshProfForm();
    });
    chipRow($('prof-age'), AGES, 'age', function () {
      if (WORK_AGE.indexOf(PROF.age) < 0) PROF.state = '';
      refreshProfForm();
    });
    chipRow($('prof-state'), STATES, 'state', refreshProfForm);
    var gk = $('prof-guard');
    if (gk) {
      gk.checked = !!(p && p.guard === 1);
      if (!gk.dataset.bound) {
        gk.dataset.bound = '1';
        gk.addEventListener('change', refreshProfForm);
      }
    }
    refreshProfForm();
    var m = $('prof-mask');
    m.hidden = false;
    requestAnimationFrame(function () { m.classList.add('in'); });
  }

  function closeProfile() {
    var m = $('prof-mask');
    m.classList.remove('in');
    setTimeout(function () { m.hidden = true; }, 180);
  }

  /* ---------- 初始化 ---------- */
  async function ensureCloud() {
    if (state.cloud) return state.cloud;
    var ok = !!window.WorkBuddyCloud;
    if (!ok && window.Cloud && typeof window.Cloud.ready === 'function') ok = await window.Cloud.ready(9000);
    if (!ok) { showSdkError(); throw { sdk: true, silent: true }; }
    state.cloud = window.Cloud.client();
    return state.cloud;
  }

  function showSdkError() {
    var host = addMsg('ai', '<span class="err">AI 组件没加载成功，通常是网络受限（部分手机网络访问不了组件服务器）。<br>点下面的「重试」重新加载，或换 Wi-Fi 后再试。</span>' +
      '<button class="err-retry" type="button">重试</button>');
    return host;
  }

  /* 组件加载失败后的重试：清掉缓存的 client 与模型，重新等一次 */
  async function retrySdk() {
    state.cloud = null;
    state.model = null;
    var ok = (window.Cloud && window.Cloud.ready) ? await window.Cloud.ready(10000) : false;
    if (window.Quota) await window.Quota.retry().then(renderQuota);
    return ok;
  }

  async function ensureModel() {
    if (state.model) return state.model;
    var cloud = await ensureCloud();
    var models = await cloud.llm.models.list();
    if (!models || !models.length) {
      throw { friendly: '当前没有可用的模型，请稍后再试。' };
    }
    var usable = models.filter(function (m) { return m.disabled !== true; });
    if (!usable.length) throw { friendly: '当前没有可用的模型，请稍后再试。' };
    var withImg = usable.filter(function (m) { return m.supportsImages === true; });
    state.model = withImg[0] || usable[0];
    state.canImage = state.model.supportsImages === true;
    return state.model;
  }

  /* ---------- 渲染 ---------- */
  function chatEl() { return $('chat'); }

  function scrollBottom() {
    var compose = document.querySelector('#s-ai .ai-compose');
    if (!compose) return;
    var r = compose.getBoundingClientRect();
    var target = window.scrollY + r.bottom - window.innerHeight + 14;
    if (target > 0) window.scrollTo(0, target);
  }

  function renderWelcome(withSuggestions) {
    var c = chatEl();
    var logged = !!(window.Auth && window.Auth.isIn());
    var chips = '';
    if (withSuggestions) {
      pickSuggestions();
      chips = '<div class="ai-sug">' +
        picked.map(function (t, i) {
          return '<button type="button" data-sug="' + i + '">' + t + '</button>';
        }).join('') +
        '</div>';
    }
    c.innerHTML =
      '<div class="ai-welcome">' +
        '<h2>说说不舒服的地方</h2>' +
        '<p>把症状、持续时间、已经吃过什么药告诉我。<br>' +
        '有肉眼可见的（皮疹、伤口、肿胀），直接拍照更快。</p>' +
        chips +
        (logged ? '' : '<button class="ai-guest" type="button" id="ai-go-login">登录后可保存对话记录 →</button>') +
      '</div>';
    var btns = c.querySelectorAll('[data-sug]');
    for (var i = 0; i < btns.length; i++) {
      btns[i].addEventListener('click', function () {
        var t = picked[parseInt(this.getAttribute('data-sug'), 10)];
        $('ai-input').value = t;
        autoGrow();
        send();
      });
    }
    var gl = $('ai-go-login');
    if (gl) gl.addEventListener('click', function () {
      if (window.App) window.App.goAuth();
    });
  }

  /* 每条 AI 回答都要标注「AI 生成」+ 举报入口（生成式 AI 办法第 12/15 条） */
  function markAi(bubble) {
    if (!bubble) return;
    var host = bubble.closest ? bubble.closest('.msg') : null;
    if (!host || host.querySelector('.ai-src')) return;
    var p = document.createElement('p');
    p.className = 'ai-src';
    p.innerHTML = '内容由 AI 生成，可能出错，仅供参考 · <a href="#legal:report">举报</a>';
    host.appendChild(p);
  }

  function addMsg(role, html, imgSrc) {
    var wel = chatEl().querySelector('.ai-welcome');
    if (wel) wel.remove();
    var div = document.createElement('div');
    div.className = 'msg ' + role;
    div.innerHTML =
      (role === 'ai' ? '<img class="ava" src="assets/doctor.png" alt="" aria-hidden="true">' : '') +
      '<div class="bubble">' +
      (imgSrc ? '<img src="' + imgSrc + '" alt="上传的图片">' : '') +
      (html || '') + '</div>';
    chatEl().appendChild(div);
    scrollBottom();
    return div.querySelector('.bubble');
  }

  function addTyping() {
    var div = document.createElement('div');
    div.className = 'msg ai';
    div.id = 'typing';
    div.innerHTML = '<div class="bubble"><div class="typing"><i></i><i></i><i></i></div></div>';
    chatEl().appendChild(div);
    scrollBottom();
  }
  function dropTyping() {
    var t = $('typing');
    if (t) t.remove();
  }

  /* ---------- 图片 ---------- */
  function compress(file, cb) {
    var reader = new FileReader();
    reader.onload = function (e) {
      var img = new Image();
      img.onload = function () {
        var max = 1280;
        var w = img.width, h = img.height;
        if (Math.max(w, h) > max) {
          var r = max / Math.max(w, h);
          w = Math.round(w * r);
          h = Math.round(h * r);
        }
        var c = document.createElement('canvas');
        c.width = w; c.height = h;
        var ctx = c.getContext('2d');
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        cb(c.toDataURL('image/jpeg', 0.82));
      };
      img.onerror = function () { cb(null); };
      img.src = e.target.result;
    };
    reader.onerror = function () { cb(null); };
    reader.readAsDataURL(file);
  }

  function setImage(dataUrl) {
    if (!state.canImage) {
      addMsg('ai', '<span class="err">当前模型不支持看图，只用文字描述吧。</span>');
      return;
    }
    state.img = dataUrl;
    $('ai-chip-img').src = dataUrl;
    $('ai-chip').hidden = false;
    updateSend();
  }

  function clearImage() {
    state.img = null;
    $('ai-chip').hidden = true;
    $('ai-chip-img').src = '';
    updateSend();
  }

  /* ---------- 额度 ---------- */
  function renderQuota() {
    var el = $('ai-quota');
    if (!el) return;
    if (!window.Quota) { el.textContent = ''; return; }
    var s = window.Quota.state();
    el.textContent = window.Quota.label();
    var warn = !s.known;
    el.className = 'ai-quota' + (warn ? ' is-warn' : (s.remaining <= 1 ? ' is-low' : ''));
    el.onclick = warn ? function () {
      el.textContent = '正在重试…';
      window.Quota.retry().then(renderQuota);
    } : null;
    el.title = warn ? '点一下重新读取剩余次数' : '';
    el.style.cursor = warn ? 'pointer' : '';
  }

  function showWall(gate) {
    var c = chatEl();
    if (!c) return;
    var old = c.querySelector('.ai-wall');
    if (old) old.parentNode.removeChild(old);
    var byUser = gate.scope === 'user';
    var lim = gate.limit || (byUser ? 20 : 5);
    var isNewAcct = byUser && lim <= 5;   /* 新账号首日按游客额度 */
    var div = document.createElement('div');
    div.className = 'ai-wall';
    div.innerHTML =
      '<b>' + (byUser ? '今天的 ' + lim + ' 次问完了' : '游客的 5 次体验已用完') + '</b>' +
      '<p>' + (byUser
        ? (isNewAcct
            ? '新账号第一天是 5 次，明天 0 点起恢复为每天 20 次。如果症状紧急，请直接去医院或拨打 120。'
            : '明天 0 点自动恢复。如果症状紧急，请直接去医院或拨打 120。')
        : '注册登录后每天 20 次，还能保存对话记录。刷新页面、清缓存都不会重置次数。') + '</p>' +
      (byUser ? '' : '<button type="button" class="ai-wall-go">登录 / 注册，解锁每天 20 次</button>');
    c.appendChild(div);
    var btn = div.querySelector('.ai-wall-go');
    if (btn) btn.addEventListener('click', function () { if (window.App) window.App.goAuth(); });
    scrollBottom();
  }

  /* ---------- 发送 ---------- */
  function updateSend() {
    var has = $('ai-input').value.trim().length > 0 || !!state.img;
    $('ai-send').disabled = state.busy || !has;
  }

  function autoGrow() {
    var t = $('ai-input');
    t.style.height = 'auto';
    t.style.height = Math.min(t.scrollHeight, 112) + 'px';
  }

  /* 用药资料按需从数据库取，不写死在提示词里 */
  async function drugContext(text) {
    if (!text) return '';
    try {
      var c = window.Cloud.client();
      var r = await c.database.rpc('drug_lookup', { p_text: text.slice(-260) });
      var list = (r && r.data) || [];
      if (!list.length) return '';
      return list.slice(0, 5).map(function (d) {
        var s = '- ' + d.brand + (d.generic ? '（' + d.generic + '）' : '');
        if (d.pregnancy) s += '｜孕期哺乳：' + d.pregnancy;
        if (d.caution) s += '｜' + d.caution;
        if (d.warn && d.warn.length) s += '｜必须提醒：' + d.warn.join('；');
        return s;
      }).join('\n');
    } catch (e) {
      return '';
    }
  }

  /* ---------- 回复块设置 ---------- */
  var BLOCKS = [
    { id: 'conclusion', title: '结论', name: '初步结论', desc: '回答开头的一句话判断', lock: true },
    { id: 'causes', title: '病因分析', name: '病因分析', desc: '常见病因与判断依据', def: true,
      hint: '写 2–4 种常见病因，按可能性从高到低排列，每种后面跟一句判断依据' },
    { id: 'actions', title: '解决方案', name: '解决方案', desc: '现在可以怎么处理', def: true,
      hint: '写 3–5 条可执行的处理动作，含具体做法、次数或时长、做到什么程度' },
    { id: 'redflags', title: '就医指征', name: '就医指征', desc: '需要去医院的具体信号', def: true,
      hint: '写 3–5 条必须就医的信号，越具体越好，能量化就量化（温度、时间、能不能承重）',
      warnOff: '这一块是判断要不要就医的部分。关掉后，出现危险信号时仍会用一句话提醒你。确定关掉吗？' },
    { id: 'meds', title: '用药指导', name: '用药指导', desc: '能不能用、别和什么混着用', def: true,
      hint: '只写能不能用、不能和什么同服、间隔原则；不给剂量和次数' },
    { id: 'prognosis', title: '病程与预后', name: '病程与预后', desc: '多久好转、何时复诊', def: false,
      hint: '给分段时间线（几天缓解、几周恢复）和明确的复诊节点' },
    { id: 'activity', title: '活动与工作建议', name: '活动与工作建议', desc: '能不能上班、何时能运动', def: false,
      hint: '明确能不能上班上学、能不能运动，以及恢复的顺序和条件' },
    { id: 'askq', title: '就诊提问清单', name: '就诊提问清单', desc: '去医院前准备好要问医生的问题', def: true,
      hint: '写 3–5 个能直接照着问医生的问题，每个用问号结尾，围绕：需要做什么检查、判断依据是什么、' +
        '治疗方案有哪些选择、多久复查；不要写「平时要注意什么」这类空问题' },
    { id: 'ask', title: '需要确认', name: '需要确认（追问）', desc: '信息不足时先向你确认', lock: true }
  ];

  var BLK_KEY = 'triage.blocks.v1';
  var blkState = null;

  function blockDefaults() {
    var o = {};
    BLOCKS.forEach(function (b) { if (!b.lock) o[b.id] = !!b.def; });
    return o;
  }

  function blockSettings() {
    if (blkState) return blkState;
    var o = blockDefaults();
    try {
      var raw = localStorage.getItem(BLK_KEY);
      if (raw) {
        var saved = JSON.parse(raw) || {};
        Object.keys(o).forEach(function (k) {
          if (typeof saved[k] === 'boolean') o[k] = saved[k];
        });
      }
    } catch (e) {}
    blkState = o;
    return blkState;
  }

  function isCustomBlocks() {
    var st = blockSettings();
    var def = blockDefaults();
    return Object.keys(def).some(function (k) { return st[k] !== def[k]; });
  }

  function saveBlockSettings(o) {
    blkState = o;
    try { localStorage.setItem(BLK_KEY, JSON.stringify(o)); } catch (e) {}
    markBlkCustom();
  }

  function markBlkCustom() {
    var btn = $('ai-blk');
    if (btn) btn.classList.toggle('has-custom', isCustomBlocks());
  }

  /* 注入到 system：告诉模型哪些块必须给、哪些不许给 */
  function blocksPrompt() {
    var st = blockSettings();
    var on = [], off = [];
    BLOCKS.forEach(function (b) {
      if (b.lock) return;
      (st[b.id] ? on : off).push(b.title);
    });
    if (!on.length) {
      return '\n\n【输出块设置｜用户自选，优先级低于安全底线】\n' +
        '除结论外不要输出任何分块，全文控制在 80 字内；出现危险信号或药物禁忌时，仍须用一句话点明。';
    }
    var s = '\n\n【输出块设置｜用户自选，优先级低于安全底线】\n' +
      '必须包含（不许省略，按此顺序）：' + on.join('、');
    if (off.length) s += '\n禁止输出：' + off.join('、');
    var hints = BLOCKS.filter(function (b) { return !b.lock && st[b.id] && b.hint; })
      .map(function (b) { return '- 【' + b.title + '】' + b.hint; });
    if (hints.length) s += '\n各块写法：\n' + hints.join('\n');
    s += '\n此设置不覆盖安全底线：出现危险信号、或涉及药物禁忌时，仍须给出一句话提醒。';
    return s;
  }

  function renderBlockList() {
    var box = $('blk-list');
    if (!box) return;
    var st = blockSettings();
    box.innerHTML = BLOCKS.map(function (b) {
      var ctrl = b.lock
        ? '<span class="blk-lock">必选</span>'
        : '<button class="blk-sw" type="button" role="switch" aria-checked="' +
            (st[b.id] ? 'true' : 'false') + '" aria-label="' + esc(b.name) + '"><i></i></button>';
      return '<div class="blk-row" data-bid="' + b.id + '">' +
        '<div style="flex:1;min-width:0">' +
          '<div class="blk-name">' + esc(b.name) + '</div>' +
          '<div class="blk-desc">' + esc(b.desc) + '</div>' +
        '</div>' + ctrl + '</div>';
    }).join('');
  }

  /* ---------- 显示设置（字号 / 背景） ---------- */
  var UI_KEY = 'triage.ui.v1';
  var FS_OPTS = [{ id: 's', name: '小' }, { id: 'm', name: '标准' }, { id: 'l', name: '大' }];
  var BG_OPTS = [
    { id: 'mint', name: '默认', color: '#EFF7F5' },
    { id: 'white', name: '纯白', color: '#FFFFFF' },
    { id: 'gray', name: '浅灰', color: '#F3F4F6' },
    { id: 'cream', name: '浅米', color: '#FAF5EC' }
  ];
  var uiCache = null;

  function uiState() {
    if (uiCache) return uiCache;
    var o = { fs: 'm', bg: 'mint' };
    try {
      var raw = localStorage.getItem(UI_KEY);
      if (raw) {
        var sv = JSON.parse(raw) || {};
        if (sv.fs) o.fs = sv.fs;
        if (sv.bg) o.bg = sv.bg;
      }
    } catch (e) {}
    uiCache = o;
    return o;
  }

  function applyUi() {
    var u = uiState();
    document.body.setAttribute('data-fs', u.fs);
    document.body.setAttribute('data-bg', u.bg);
  }

  function setUi(k, v) {
    var u = uiState();
    u[k] = v;
    try { localStorage.setItem(UI_KEY, JSON.stringify(u)); } catch (e) {}
    applyUi();
  }

  function renderUiChips() {
    var u = uiState();
    var fs = $('set-fs');
    if (fs) {
      fs.innerHTML = FS_OPTS.map(function (o) {
        return '<button type="button" class="' + (u.fs === o.id ? 'on' : '') +
          '" data-fs="' + o.id + '">' + o.name + '</button>';
      }).join('');
    }
    var bg = $('set-bg');
    if (bg) {
      bg.innerHTML = BG_OPTS.map(function (o) {
        return '<button type="button" class="' + (u.bg === o.id ? 'on' : '') +
          '" data-bg="' + o.id + '"><i class="sw-dot" style="background:' + o.color + '"></i>' +
          o.name + '</button>';
      }).join('');
    }
  }

  /* ---------- 账号：修改密码 ---------- */
  var pwBusy = false;

  async function authSdk() {
    var c = null;
    try { c = window.Cloud && window.Cloud.client(); } catch (e) { c = null; }
    if (!c && window.Cloud && typeof window.Cloud.ready === 'function') {
      var ok = await window.Cloud.ready(9000);
      if (ok) { try { c = window.Cloud.client(); } catch (e2) { c = null; } }
    }
    return c;
  }

  /* 账号菜单里显示的是完整邮箱，手机号是打码的，取能拿到的最完整那个 */
  function acctInfo() {
    var mail = '';
    var aum = $('aum-mail');
    var t = aum ? (aum.textContent || '').trim() : '';
    if (t.indexOf('@') > 0) mail = t;
    if (!mail) { try { mail = localStorage.getItem('triage.email') || ''; } catch (e) {} }
    if (mail.indexOf('@') > 0) return { id: mail, kind: 'email' };
    var ph = '';
    try { ph = localStorage.getItem('triage.phone') || ''; } catch (e) {}
    if (/^\d{11}$/.test(ph)) return { id: ph.slice(0, 3) + '****' + ph.slice(-4), kind: 'phone' };
    return { id: '已登录', kind: '' };
  }

  function pwMsg(text, ok) {
    var e = $('pw-err');
    if (!e) return;
    e.textContent = text || '';
    e.className = 'pw-err' + (ok ? ' ok' : '');
  }

  function closePwForm() {
    var f = $('pw-form');
    if (f) f.hidden = true;
    var ids = ['pw-old', 'pw-new', 'pw-new2'];
    for (var i = 0; i < ids.length; i++) {
      var el = $(ids[i]);
      if (el) el.value = '';
    }
    pwMsg('');
    var b = $('acct-pw-open');
    if (b) { b.textContent = '修改密码'; b.disabled = false; }
    var g = $('pw-go');
    if (g) { g.disabled = false; g.textContent = '保存新密码'; }
  }

  function togglePwForm() {
    var f = $('pw-form');
    if (!f) return;
    if (!f.hidden) { closePwForm(); return; }
    f.hidden = false;
    pwMsg('');
    var b = $('acct-pw-open');
    if (b) b.textContent = '收起';
    setTimeout(function () { var i = $('pw-old'); if (i) i.focus(); }, 80);
  }

  /* 设置抽屉每次打开都按当前登录状态刷一遍账号区 */
  function syncAcct() {
    var box = $('set-acct');
    if (!box) return;
    var logged = !!(window.Auth && window.Auth.isIn());
    box.hidden = !logged;
    if (!logged) { closePwForm(); return; }
    var a = acctInfo();
    var idEl = $('acct-id');
    if (idEl) { idEl.textContent = a.id; idEl.title = a.id; }
    /* 忘了当前密码的出路只有邮箱（SDK 没开手机号找回），文案按账号类型分开 */
    var hint = $('pw-hint');
    if (hint) hint.textContent = a.kind === 'email'
      ? '需要先验证当前密码。忘了当前密码可以退出登录，在登录页点「忘记密码」用邮箱验证码重设。'
      : '需要先验证当前密码。手机号目前不支持重设密码，忘了密码直接退出用验证码登录即可。';
    closePwForm();
  }

  async function submitPw() {
    if (pwBusy) return;
    var o = $('pw-old'), n = $('pw-new'), n2 = $('pw-new2'), go = $('pw-go');
    if (!o || !n || !n2) return;
    var oldPw = o.value || '', np = n.value || '', np2 = n2.value || '';
    if (!oldPw) { pwMsg('请先输入当前密码'); o.focus(); return; }
    if (np.length < 6) { pwMsg('新密码至少 6 位'); n.focus(); return; }
    if (np.length > 64) { pwMsg('新密码太长了，控制在 64 位以内'); n.focus(); return; }
    if (np !== np2) { pwMsg('两次输入的新密码不一致'); n2.focus(); return; }
    if (np === oldPw) { pwMsg('新密码要和当前密码不一样'); n.focus(); return; }

    pwBusy = true;
    if (go) { go.disabled = true; go.textContent = '正在保存…'; }
    pwMsg('');
    try {
      var c = await authSdk();
      if (!c || !c.auth || typeof c.auth.resetPasswordForOld !== 'function') {
        pwMsg('连接组件还没准备好，等几秒再试，或刷新页面。');
        return;
      }
      var r = await c.auth.resetPasswordForOld({ oldPassword: oldPw, newPassword: np });
      if (r && r.error) {
        var k = r.error.kind || '';
        if (k === 'unauthenticated') pwMsg('登录状态失效了，退出后重新登录再改。');
        else if (k === 'network' || k === 'backend-unavailable') pwMsg('网络不通，稍后再试。');
        /* 密码错误和「账号没设过密码」服务端都可能拒绝 sudo，这里两种都说清 */
        else pwMsg('当前密码不正确。如果这个账号是用验证码直接登录创建的、从没设过密码，这里改不了 —— 换一种方式注册账号即可。');
        return;
      }
      o.value = ''; n.value = ''; n2.value = '';
      pwMsg('密码已修改，下次登录请用新密码。', true);
      if (go) { go.disabled = true; go.textContent = '已保存'; }
      setTimeout(function () {
        var f = $('pw-form');
        if (f && !f.hidden) closePwForm();
      }, 2000);
    } catch (e) {
      pwMsg((e && e.friendly) || '网络不通，请稍后再试。');
    } finally {
      pwBusy = false;
      if (go && go.textContent === '正在保存…') { go.disabled = false; go.textContent = '保存新密码'; }
    }
  }

  function openSettings() {
    syncAcct();
    renderBlockList();
    renderUiChips();
    var m = $('set-mask');
    if (!m) return;
    m.hidden = false;
    requestAnimationFrame(function () { m.classList.add('in'); });
  }

  function closeSettings() {
    var m = $('set-mask');
    if (!m || m.hidden) return;
    closePwForm();
    m.classList.remove('in');
    setTimeout(function () { m.hidden = true; }, 180);
  }

  function toggleBlock(btn) {
    var row = btn.closest ? btn.closest('.blk-row') : null;
    if (!row) return;
    var id = row.getAttribute('data-bid');
    var b = null;
    for (var i = 0; i < BLOCKS.length; i++) if (BLOCKS[i].id === id) b = BLOCKS[i];
    if (!b || b.lock) return;
    var st = blockSettings();
    var next = !st[id];
    if (!next && b.warnOff && !confirm(b.warnOff)) return;
    st[id] = next;
    btn.setAttribute('aria-checked', next ? 'true' : 'false');
    saveBlockSettings(st);
  }

  function buildMessages(drugCtx) {
    var hist = state.messages.slice(-8);
    var out = [];
    hist.forEach(function (m, i) {
      var isLast = i === hist.length - 1;
      if (Array.isArray(m.content) && !isLast) {
        var text = m.content.filter(function (p) { return p.type === 'text'; })
          .map(function (p) { return p.text; }).join(' ');
        out.push({ role: m.role, content: (text ? text + ' ' : '') + '（并发送了一张图片）' });
      } else {
        /* 只把 role / content 发给模型，silent、_at 这些本地标记不要带上 */
        out.push({ role: m.role, content: m.content });
      }
    });
    var sys = SYSTEM + profilePrompt() + blocksPrompt();
    if (drugCtx) {
      sys += '\n\n【本期药物资料｜来自数据库，用法与禁忌以此为准】\n' + drugCtx;
    }
    return [{ role: 'system', content: sys }].concat(out);
  }

  var sendLock = false;

  async function send(opts) {
    /* 同步锁：状态位必须在这一行就置上，
       否则 Quota.consume() 的 await 期间 busy 仍是 false，会被第二条路径再发一次 */
    if (sendLock) return;
    sendLock = true;
    try {
      await sendCore(opts);
    } finally {
      sendLock = false;
    }
  }

  async function sendCore(opts) {
    if (state.busy) return;
    var input = $('ai-input');
    var text = input.value.trim();
    var img = state.img;
    if (!text && !img) return;

    var silent = (opts && opts.silent === true) || state.silent === true;
    state.silent = false;

    /* 组件没加载成功时，先给明确提示 + 重试，不要静默失败 */
    if (!window.WorkBuddyCloud) {
      var rdy = (window.Cloud && typeof window.Cloud.ready === 'function')
        ? await window.Cloud.ready(3500) : false;
      if (!rdy) { showSdkError(); return; }
    }

    var nowTs = Date.now();

    /* 同一条内容 8 秒内被重复触发：直接返回，既不扣次数也不发请求 */
    if (!silent) {
      var prevMsg = state.messages.length ? state.messages[state.messages.length - 1] : null;
      if (prevMsg && prevMsg.role === 'user' && prevMsg._at &&
          nowTs - prevMsg._at < 8000 &&
          typeof prevMsg.content === 'string' && prevMsg.content === text) {
        return;
      }
    }

    /* 计次口径：只有「用户自己发起的这条消息」才扣一次。
       弹窗选完继续生成、多轮追问的继续生成都属于同一轮，不重复扣。
       gate.degraded = true 表示这一轮没扣费，所以失败时也不会走退回。 */
    var gate = { allowed: true, degraded: true, remaining: null, limit: null, scope: 'guest' };
    if (!silent) {
      gate = window.Quota ? await window.Quota.consume() : { allowed: true, degraded: true };
      renderQuota();
      if (!gate.allowed) { showWall(gate); return; }
    }

    state.messages.push({
      role: 'user',
      silent: silent || undefined,
      _at: nowTs,
      content: img
        ? [{ type: 'text', text: text || '请看这张图片' },
           { type: 'image_url', image_url: { url: img } }]
        : text
    });
    if (!silent) addMsg('user', text ? fmt(text) : '', img || null);
    syncCtxLock();
    input.value = '';
    autoGrow();
    clearImage();

    state.busy = true;
    markAsksDone();
    updateSend();
    addTyping();
    var acc = '';
    var bubble = null;

    try {
      await ensureModel();
      var recent = state.messages.slice(-3).map(function (m) {
        return typeof m.content === 'string' ? m.content : '';
      }).join(' ');
      var drugCtx = await drugContext(recent);
      var cloud = await ensureCloud();
      var stream = cloud.llm.chat.completions.create({
        model: state.model.id,
        messages: buildMessages(drugCtx),
        stream: true,
        temperature: 0.6
      });
      for await (var chunk of stream) {
        var d = chunk.choices && chunk.choices[0] && chunk.choices[0].delta;
        if (d && d.content) {
          if (!bubble) { dropTyping(); bubble = addMsg('ai', ''); }
          acc += d.content;
          paint(bubble, acc);
        }
      }
      dropTyping();
      if (!acc) {
        addMsg('ai', '<span class="err">没有收到回复，请重试。</span>');
      } else {
        state.messages.push({ role: 'assistant', content: acc });
        markAi(bubble);
        persist();
        setTimeout(maybeOpenAsk, 260);
      }
    } catch (e) {
      dropTyping();
      var code = (e && e.error && e.error.code) || '';
      var msg;
      if (e && e.friendly) {
        msg = e.friendly;
      } else if (code.indexOf('auth_') === 0) {
        msg = '连接鉴权失败。这个功能只在线上地址可用，本地打开或预览环境会被拒绝。';
      } else if (code.indexOf('quota_') === 0) {
        msg = '今天的调用额度已用完，请稍后再试。';
      } else if (code.indexOf('request_') === 0) {
        msg = '请求没有通过，换个说法再试一次。';
      } else if (code.indexOf('gateway_') === 0 || code.indexOf('model_') === 0) {
        msg = '模型服务暂时不可用，稍后重试。';
      } else {
        msg = '出了点问题，请重试。';
      }
      if (e && e.silent) { state.busy = false; updateSend(); renderQuota(); return; }
      var extra = '';
      if (e && e.sdk) extra = ' <button class="err-retry" type="button">重试</button>';
      var eb = addMsg('ai', '<span class="err">' + msg + extra + '</span>');
      if (acc) {
        var wrap = document.createElement('div');
        wrap.className = 'has-blocks';
        wrap.innerHTML = renderRich(acc);
        eb.appendChild(wrap);
      }
      if (!acc) {
        state.messages.pop();
        /* 一个字都没收到，这次不算数，把额度退回去 */
        if (window.Quota && !gate.degraded) window.Quota.refund().then(renderQuota);
      }
    } finally {
      state.busy = false;
      updateSend();
      renderQuota();
    }
  }

  async function persist() {
    if (!window.Auth || !window.Auth.isIn() || !window.Chat) return;
    try {
      var c = window.Chat.current();
      if (!c.id) {
        var first = null;
        for (var i = 0; i < state.messages.length; i++) {
          if (state.messages[i].role === 'user') { first = state.messages[i]; break; }
        }
        var title = '新对话';
        if (first) {
          if (typeof first.content === 'string') title = first.content;
          else {
            var tx = first.content.filter(function (p) { return p.type === 'text'; })[0];
            title = (tx && tx.text) || '图片咨询';
          }
        }
        await window.Chat.create(title);
      }
      await window.Chat.save(state.messages);
    } catch (e) {
      /* 保存失败不打断对话 */
    }
  }

  function reset() {
    state.messages = [];
    if (window.Chat) window.Chat.reset();
    clearImage();
    $('ai-input').value = '';
    autoGrow();
    chatEl().innerHTML = '';
    renderWelcome(false);   /* 新对话不再重复给建议 */
    syncCtxLock();
    updateSend();
  }

  function loadMessages(list) {
    enter();
    state.messages = (list || []).map(function (m) {
      return { role: m.role, content: m.content };
    });
    chatEl().innerHTML = '';
    state.messages.forEach(function (m) {
      if (m.silent) return;                 /* 确认弹窗的回答不单独成气泡 */
      if (m.role === 'user') addMsg('user', fmt(String(m.content)));
      else if (m.role === 'assistant') paint(addMsg('ai', ''), String(m.content));
    });
    if (!state.messages.length) renderWelcome(false);
    syncCtxLock();
    setTimeout(scrollBottom, 60);
    updateSend();
  }

  function enter() {
    if (!state.started) {
      state.started = true;
      renderWelcome(true);
      updateSend();
      bind();
      renderCtx();
      if (!getProfile()) setTimeout(openProfile, 260);
      try { ensureModel(); } catch (e) { /* 首次进入静默预热 */ }
    }
    if (window.Quota) window.Quota.refresh().then(renderQuota);
  }

  var bound = false;
  function bind() {
    if (bound) return;
    bound = true;

    $('ai-input').addEventListener('input', function () { autoGrow(); updateSend(); });
    $('ai-input').addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
    });
    chatEl().addEventListener('click', function (e) {
      var t = e.target;
      if (t && t.classList && t.classList.contains('err-retry')) {
        t.disabled = true;
        t.textContent = '重试中…';
        retrySdk().then(function (ok) {
          t.disabled = false;
          t.textContent = ok ? '已恢复' : '仍失败';
        });
      }
    });

    $('ai-send').addEventListener('click', send);
    $('ai-reset').addEventListener('click', reset);
    if (window.Quota) window.Quota.onChange(renderQuota);

    /* 确认弹窗 */
    $('ask-skip').addEventListener('click', closeAsk);
    $('ask-go').addEventListener('click', submitAsk);
    $('ask-mask').addEventListener('click', function (e) { if (e.target === this) closeAsk(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeAsk(); });
    chatEl().addEventListener('click', function (e) {
      var t = e.target;
      var btn = t && t.closest ? t.closest('.ask-opt') : null;
      if (!btn) return;
      var card = btn.closest('.blk-ask');
      if (!card || card.classList.contains('done')) return;
      if (btn.classList.contains('ask-other')) { openAsk(card); return; }
      /* 多个问题时，点任意选项都先进弹窗统一回答 */
      if (card.querySelectorAll('.ask-grp').length > 1) { openAsk(card); return; }
      var grp = btn.closest('.ask-grp');
      var q = grp ? grp.getAttribute('data-q') : '';
      answer(q ? q.replace(/[？?]\s*$/, '') + '：' + btn.textContent : btn.textContent, card);
    });

    /* 患者信息：对话界面上的下拉框 */
    function saveCtxFromSelects() {
      var sex = $('prof-sex-sel').value;
      var age = $('prof-age-sel').value;
      if (!sex || !age) return;
      var state = $('prof-ctx-state').hidden ? '' : ($('prof-state-sel').value || '');
      setProfile({ sex: sex, age: age, state: state });
      renderCtx();
    }
    $('prof-sex-sel').addEventListener('change', saveCtxFromSelects);
    $('prof-age-sel').addEventListener('change', saveCtxFromSelects);
    $('prof-state-sel').addEventListener('change', saveCtxFromSelects);

    $('ai-ctx').addEventListener('click', function (e) {
      if (!this.classList.contains('is-locked')) return;
      e.preventDefault();
      tip('对话已经开始了。要改年龄或性别，请点右上角「+」开个新对话。');
    });

    $('prof-save').addEventListener('click', function () {
      if (!PROF.sex || !PROF.age) return;
      var gk = $('prof-guard');
      if (isUnder14(PROF.age) && !(gk && gk.checked)) return;
      setProfile({
        sex: PROF.sex,
        age: PROF.age,
        state: PROF.state || '',
        guard: isUnder14(PROF.age) ? 1 : 0
      });
      closeProfile();
    });

    /* 设置抽屉：页头齿轮（游客）、账号菜单（已登录） */
    applyUi();
    if ($('ai-set')) $('ai-set').addEventListener('click', openSettings);
    if ($('aum-set')) $('aum-set').addEventListener('click', function () {
      var menu = $('ai-user-menu');
      if (menu) menu.hidden = true;
      openSettings();
    });
    if ($('set-close')) $('set-close').addEventListener('click', closeSettings);
    if ($('set-mask')) $('set-mask').addEventListener('click', function (e) {
      if (e.target === this) closeSettings();
    });
    if ($('acct-pw-open')) $('acct-pw-open').addEventListener('click', togglePwForm);
    if ($('pw-form')) $('pw-form').addEventListener('submit', function (e) {
      e.preventDefault();
      submitPw();
    });
    document.addEventListener('auth:change', syncAcct);
    if ($('set-fs')) $('set-fs').addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('button[data-fs]') : null;
      if (!b) return;
      setUi('fs', b.getAttribute('data-fs'));
      renderUiChips();
    });
    if ($('set-bg')) $('set-bg').addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('button[data-bg]') : null;
      if (!b) return;
      setUi('bg', b.getAttribute('data-bg'));
      renderUiChips();
    });
    if ($('blk-list')) $('blk-list').addEventListener('click', function (e) {
      var t = e.target;
      var sw = t && t.closest ? t.closest('.blk-sw') : null;
      if (sw) toggleBlock(sw);
    });
    if ($('set-reset')) $('set-reset').addEventListener('click', function () {
      try {
        localStorage.removeItem(BLK_KEY);
        localStorage.removeItem(UI_KEY);
      } catch (e) {}
      blkState = null;
      uiCache = null;
      applyUi();
      renderBlockList();
      renderUiChips();
      var btn = this;
      var old = btn.textContent;
      btn.textContent = '已恢复默认';
      setTimeout(function () { btn.textContent = old; }, 1400);
    });
    markBlkCustom();

    $('ai-attach').addEventListener('click', function () {
      if (!state.canImage) {
        addMsg('ai', '<span class="err">当前模型不支持看图，只用文字描述吧。</span>');
        return;
      }
      $('ai-file').click();
    });
    $('ai-file').addEventListener('change', function () {
      var f = this.files && this.files[0];
      this.value = '';
      if (!f) return;
      if (f.size > 8 * 1024 * 1024) {
        addMsg('ai', '<span class="err">图片太大了，换一张小于 8MB 的。</span>');
        return;
      }
      compress(f, function (url) {
        if (!url) { addMsg('ai', '<span class="err">这张图片读不出来，换一张试试。</span>'); return; }
        setImage(url);
      });
    });
    $('ai-chip-del').addEventListener('click', clearImage);
  }

  window.__aiBuild = '20261106w';

  window.AI = {
    enter: enter, reset: reset, loadMessages: loadMessages,
    renderQuota: renderQuota, maybeOpenAsk: maybeOpenAsk
  };
})();
