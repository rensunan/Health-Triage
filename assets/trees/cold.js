window.TREES = window.TREES || [];
window.TREES.push({
  id: 'cold',
  mod: 'sick',
  glyph: '感',
  title: '感冒发烧',
  line: '发烧 · 咽痛 · 咳嗽 · 鼻塞',
  hub: true,
  nodes: {
    q1: {
      type: 'q',
      ask: '现在最难受的是哪一块？',
      hint: '选最突出的那个，其他症状后面还会问到',
      opts: [
        { t: '发烧、浑身酸痛', sub: '体温高、没力气', go: 'fever:q1' },
        { t: '嗓子疼、咽东西疼', sub: '咽部为主', go: 'throat:q1' },
        { t: '咳嗽、有痰、停不下来', sub: '咳得影响睡觉', go: 'cough:q1' },
        { t: '鼻塞、流鼻涕、打喷嚏', sub: '鼻子不通气', go: 'rhinitis:q1' }
      ]
    }
  }
});
