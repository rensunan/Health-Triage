window.Chat = (function () {
  'use strict';

  var cur = { id: null, title: '' };
  function db() { return window.Cloud.client().database; }

  function strip(messages) {
    return messages.map(function (m) {
      if (Array.isArray(m.content)) {
        var hasImg = m.content.some(function (p) { return p.type === 'image_url'; });
        var text = m.content.filter(function (p) { return p.type === 'text'; })
          .map(function (p) { return p.text; }).join(' ');
        var o = { role: m.role, content: (text || '') + (hasImg ? '（图片已省略）' : '') };
        if (m.silent) o.silent = 1;
        return o;
      }
      var r = { role: m.role, content: m.content };
      if (m.silent) r.silent = 1;
      return r;
    });
  }

  async function create(firstText) {
    var title = (firstText || '新对话').replace(/\s+/g, ' ').slice(0, 24);
    var r = await db().from('conversations').insert({ title: title }).select();
    if (r.error) throw r.error;
    cur.id = r.data && r.data[0] ? r.data[0].id : null;
    cur.title = title;
    return cur.id;
  }

  async function save(messages) {
    if (!cur.id || !window.Auth.isIn()) return;
    var r = await db().from('conversations')
      .update({ messages: strip(messages), updated_at: new Date().toISOString() })
      .eq('id', cur.id)
      .select();
    if (r.error) throw r.error;
    if (!r.data || !r.data.length) throw new Error('RLS_BLOCKED');
  }

  async function list() {
    var r = await db().from('conversations')
      .select('id,title,updated_at,messages')
      .order('updated_at', { ascending: false })
      .limit(40);
    if (r.error) throw r.error;
    return r.data || [];
  }

  async function load(id) {
    var r = await db().from('conversations')
      .select('id,title,messages')
      .eq('id', id)
      .maybeSingle();
    if (r.error) throw r.error;
    if (!r.data) return null;
    cur.id = r.data.id;
    cur.title = r.data.title || '';
    return r.data;
  }

  async function remove(id) {
    var r = await db().from('conversations').delete().eq('id', id).select();
    if (r.error) throw r.error;
    if (!r.data || !r.data.length) throw new Error('RLS_BLOCKED');
    if (cur.id === id) reset();
  }

  function reset() { cur.id = null; cur.title = ''; }
  function current() { return cur; }

  function fmtTime(iso) {
    var d = new Date(iso), n = new Date();
    var hm = ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
    if (d.toDateString() === n.toDateString()) return '今天 ' + hm;
    var y = new Date(n.getTime() - 86400000);
    if (d.toDateString() === y.toDateString()) return '昨天 ' + hm;
    return (d.getMonth() + 1) + '月' + d.getDate() + '日 ' + hm;
  }

  async function renderList(boxId) {
    var box = document.getElementById(boxId);
    if (!box) return;
    box.innerHTML = '<p class="hist-loading">加载中…</p>';
    try {
      var rows = await list();
      if (!rows.length) {
        box.innerHTML = '<div class="hist-empty">还没有保存的对话<br>' +
          '<span>去健康助手问一句，就会自动存下来</span></div>';
        return;
      }
      box.innerHTML = rows.map(function (r) {
        var n = Array.isArray(r.messages) ? r.messages.length : 0;
        return '<div class="hist-item" data-id="' + r.id + '">' +
          '<div class="hist-body">' +
            '<span class="hist-title">' + escapeHtml(r.title || '未命名对话') + '</span>' +
            '<span class="hist-meta">' + fmtTime(r.updated_at) + ' · ' + Math.ceil(n / 2) + ' 轮</span>' +
          '</div>' +
          '<button class="hist-del" type="button" data-del="' + r.id + '">删除</button>' +
          '</div>';
      }).join('');

      var items = box.querySelectorAll('.hist-item');
      for (var i = 0; i < items.length; i++) {
        items[i].addEventListener('click', function (e) {
          if (e.target.classList.contains('hist-del')) return;
          window.App.openConversation(parseInt(this.getAttribute('data-id'), 10));
        });
      }
      var dels = box.querySelectorAll('.hist-del');
      for (var j = 0; j < dels.length; j++) {
        dels[j].addEventListener('click', async function (e) {
          e.stopPropagation();
          var id = parseInt(this.getAttribute('data-del'), 10);
          if (!confirm('删除这条对话？删除后无法恢复。')) return;
          try {
            await remove(id);
            renderList(boxId);
          } catch (err) {
            alert('删除失败，请重试');
          }
        });
      }
    } catch (e) {
      box.innerHTML = '<div class="hist-empty">读取失败，请确认已登录后重试</div>';
    }
  }

  function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  return {
    create: create, save: save, list: list, load: load, remove: remove,
    reset: reset, current: current, renderList: renderList
  };
})();
