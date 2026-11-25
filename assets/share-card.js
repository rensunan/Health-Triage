window.ShareCard = (function () {
  'use strict';

  var W = 750;            /* 逻辑宽度 */
  var PAD = 56;
  var CW = W - PAD * 2;
  var FONT = '"PingFang SC","Microsoft YaHei","Hiragino Sans GB",-apple-system,"Segoe UI",sans-serif';
  var INK = '#14171F';
  var INK2 = '#434B5A';
  var MUTED = '#8E96A3';
  var LINE = '#E6EAF0';

  function wrap(ctx, text, maxW, font) {
    ctx.font = font;
    var out = [], cur = '';
    String(text).split('\n').forEach(function (para) {
      cur = '';
      for (var i = 0; i < para.length; i++) {
        var t = cur + para[i];
        if (ctx.measureText(t).width > maxW && cur) { out.push(cur); cur = para[i]; }
        else cur = t;
      }
      if (cur) out.push(cur);
    });
    return out;
  }

  /* 浅色底（如 L1 黄）上用深色字，深色底上用白字 */
  function inkOn(hex) {
    if (!hex || hex.charAt(0) !== '#' || hex.length < 7) return '#FFFFFF';
    var r = parseInt(hex.slice(1, 3), 16);
    var g = parseInt(hex.slice(3, 5), 16);
    var b = parseInt(hex.slice(5, 7), 16);
    var l = 0.299 * r + 0.587 * g + 0.114 * b;
    return l > 168 ? '#1A1D26' : '#FFFFFF';
  }

  function rrect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  /* 组装成块：先算高度，再统一画 */
  function build(model) {
    var c = document.createElement('canvas');
    var ctx = c.getContext('2d');
    var fontH = '700 32px ' + FONT;
    var fontB = '29px ' + FONT;
    var blocks = [];
    var y = 0;

    /* 顶部品牌 */
    blocks.push({ h: 96, draw: function (g, top) {
      g.fillStyle = INK; g.font = '700 34px ' + FONT; g.textBaseline = 'alphabetic';
      g.fillText('健康分诊', PAD, top + 52);
      g.fillStyle = MUTED; g.font = '24px ' + FONT; g.textAlign = 'right';
      var d = new Date();
      g.fillText(d.getFullYear() + '.' + (d.getMonth() + 1) + '.' + d.getDate(), W - PAD, top + 50);
      g.textAlign = 'left';
      g.strokeStyle = LINE; g.lineWidth = 2;
      g.beginPath(); g.moveTo(PAD, top + 78); g.lineTo(W - PAD, top + 78); g.stroke();
    }});
    y += 96;

    /* 结论卡 */
    var lvName = model.levelName || '';
    var vFont = '700 46px ' + FONT;
    var sFont = '28px ' + FONT;
    var vLines = wrap(ctx, model.verdict, CW - 80, vFont);
    var sLines = model.sub ? wrap(ctx, model.sub, CW - 80, sFont) : [];
    var cardH = 40 + 38 + 20 + vLines.length * 62 + (sLines.length ? 16 + sLines.length * 44 : 0) + 34;
    var cardColor = model.color || '#0E9F8E';
    var fg = inkOn(cardColor);
    var fgSoft = fg === '#FFFFFF' ? 'rgba(255,255,255,.9)' : 'rgba(26,29,38,.72)';
    blocks.push({ h: cardH + 34, draw: function (g, top) {
      g.fillStyle = cardColor;
      rrect(g, PAD, top + 6, CW, cardH, 30); g.fill();
      var ty = top + 6 + 40;
      g.fillStyle = fgSoft; g.font = '600 27px ' + FONT;
      g.fillText((model.level || '') + (lvName ? ' · ' + lvName : ''), PAD + 40, ty + 24);
      ty += 38 + 20;
      g.fillStyle = fg; g.font = vFont;
      vLines.forEach(function (ln) { g.fillText(ln, PAD + 40, ty + 40); ty += 62; });
      if (sLines.length) {
        ty += 16; g.font = sFont; g.fillStyle = fgSoft;
        sLines.forEach(function (ln) { g.fillText(ln, PAD + 40, ty + 22); ty += 44; });
      }
    }});
    y += cardH + 34;

    /* 通用小节 */
    function section(title, items, opts) {
      if (!items || !items.length) return;
      opts = opts || {};
      var itemFont = fontB;
      var bulletW = 26;
      var total = 34 + 44;                 /* 顶部留白 + 标题行 */
      items.forEach(function (it) {
        var n = wrap(ctx, it, CW - bulletW - 8, itemFont).length;
        total += n * 50 + 16;
      });
      var h = total + 30;
      blocks.push({ h: h, draw: function (g, top) {
        var ty = top + 34;
        g.fillStyle = opts.color || '#0E9F8E';
        rrect(g, PAD, ty - 4, 8, 30, 4); g.fill();
        g.fillStyle = INK; g.font = fontH;
        g.fillText(title, PAD + 22, ty + 20);
        ty += 44;
        g.font = itemFont;
        items.forEach(function (it) {
          var ls = wrap(ctx, it, CW - bulletW - 8, itemFont);
          ls.forEach(function (ln, i) {
            if (i === 0) {
              g.fillStyle = opts.bullet || '#B9C2CE';
              g.fillText('·', PAD + 2, ty + 22);
            }
            g.fillStyle = opts.bodyColor || INK2;
            g.fillText(ln, PAD + bulletW + 8, ty + 23);
            ty += 50;
          });
          ty += 16;
        });
      }});
      y += h;
    }

    section('现在做什么', (model.now || []).slice(0, 5), {});
    section('出现这些，必须就医', (model.seeDoctor || []).slice(0, 4), {
      color: '#EF4444', bullet: '#F3B4B4', bodyColor: '#8A2B2B'
    });
    if (model.meds && model.meds.length) {
      section('用药提醒', model.meds.slice(0, 4), { color: '#B45309', bullet: '#E7C89A' });
    }

    /* 页脚 */
    var footFont = '23px ' + FONT;
    var f1 = wrap(ctx, '本工具不是医疗器械，不构成诊断，不能替代医生面诊。症状加重请及时就医。', CW, footFont);
    var footH = 40 + f1.length * 34 + 40 + 40;
    blocks.push({ h: footH, draw: function (g, top) {
      var ty = top + 24;
      g.strokeStyle = LINE; g.lineWidth = 2;
      g.beginPath(); g.moveTo(PAD, ty); g.lineTo(W - PAD, ty); g.stroke();
      ty += 40;
      g.font = footFont; g.fillStyle = MUTED; g.textAlign = 'center';
      f1.forEach(function (ln) { g.fillText(ln, W / 2, ty); ty += 34; });
      ty += 8;
      g.fillStyle = '#0E9F8E'; g.font = '600 24px ' + FONT;
      g.fillText('健康分诊 · 3 分钟自查', W / 2, ty);
      g.textAlign = 'left';
    }});
    y += footH;

    return { blocks: blocks, height: Math.ceil(y + PAD * 0.6) };
  }

  function render(model, cb) {
    var built = build(model);
    var scale = Math.min(2, (window.devicePixelRatio || 1) * 1.5, 2);
    var cv = document.createElement('canvas');
    cv.width = W * scale;
    cv.height = built.height * scale;
    var ctx = cv.getContext('2d');
    ctx.scale(scale, scale);
    ctx.fillStyle = '#F6F7F9';
    ctx.fillRect(0, 0, W, built.height);
    ctx.textBaseline = 'alphabetic';

    var top = PAD * 0.5;
    built.blocks.forEach(function (b) {
      b.draw(ctx, top);
      top += b.h;
    });

    if (cv.toBlob) cv.toBlob(function (blob) { cb(blob, cv); }, 'image/png');
    else {
      var url = cv.toDataURL('image/png');
      var bin = atob(url.split(',')[1]);
      var arr = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      cb(new Blob([arr], { type: 'image/png' }), cv);
    }
  }

  return { render: render };
})();
