window.TREES = window.TREES || [];
window.TREES.push({
  id: 'gut',
  mod: 'sick',
  glyph: '胃',
  title: '肠胃不适',
  line: '腹泻 · 胃痛 · 反酸烧心',
  hub: true,
  nodes: {
    q1: {
      type: 'q',
      ask: '主要是哪一块？',
      hint: '肚脐以上还是以下，决定了走哪条判断路',
      opts: [
        { t: '拉肚子、水样便', sub: '肚脐以下，一天跑好几趟厕所', go: 'diarrhea:q1' },
        { t: '胃痛、反酸、烧心', sub: '肚脐以上，上腹部不适', go: 'stomach:q1' }
      ]
    }
  }
});
