/* Interpret the original example, then distinguish its meaning from three
   contrasting readings. These are study exercises, not official exam items. */
(() => {
  const contrasts = {
    T: ['因為前項而產生後果', '即使前項成立也不改變', '只限某個對象或範圍'],
    R: ['兩件事同時進行', '雖然如此但結果相反', '只要符合條件就可以'],
    C: ['正因為前項所以有此結果', '為咗達到某個目的', '事情即將開始之前'],
    P: ['做完之後一直冇再做', '雖然如此但結果相反', '從觀察者角度作出判斷'],
    A: ['只限某一項，排除其餘', '由於前項而不得不如此', '剛做完前項就發生後項'],
    L: ['不限條件，一律適用', '附帶做另一件事情', '情況正逐漸改變'],
    U: ['只限呢一種情況先成立', '程度正逐漸減弱', '必須先完成前項先做後項'],
    E: ['程度輕微，幾乎冇影響', '只係轉述別人嘅消息', '先完成前項先再做後項'],
    J: ['唔理條件如何都一樣', '僅表動作發生嘅時間', '一邊做前項一邊做後項'],
    O: ['只表示有可能會發生', '表示動作已經完全結束', '將兩件事作客觀比較'],
    N: ['說話者強烈肯定一定如此', '只限某個時間內成立', '目的係令後項實現'],
    F: ['基於規定而必須咁做', '只表示動作先後次序', '僅表示數量大概幾多'],
    B: ['唔考慮前項，一概如此', '只表示過去經常做', '前項做完即刻發生後項'],
    S: ['由前項引發後項結果', '說話者要求對方必須做', '前項只係一個假設條件'],
    Q: ['表示事情發生之前', '只表示必須遵守嘅義務', '指出動作嘅直接目的']
  };
  const sourceCounts = { N2: [12,10,10,8,9,9,13,14,11,8,8,8,7], N1: [13,13,7,7,11,11,13,9,9,13,12,12,11,15] };
  const all = {};
  for (const level of ['N2', 'N1']) {
    const chapters = window[`__GRAMMAR_${level}_CHAPTERS`];
    if (!Array.isArray(chapters) || chapters.length !== sourceCounts[level].length) {
      throw new Error(`${level}: grammar chapters missing`);
    }
    all[level] = chapters.flatMap((chapter, ci) => {
      const rows = chapter.rows.trim().split('\n');
      if (rows.length !== sourceCounts[level][ci]) throw new Error(`${level} chapter ${ci+1}: incomplete topics`);
      return rows.map((row, ri) => {
        const fields = row.split('|');
        const [page, grammar, meaning, usage, example, focus, contrast] = fields;
        if (fields.length !== 7 || !example.includes(focus) || !contrasts[contrast]) throw new Error(`${level} ${ci+1}.${ri+1}: malformed entry`);
        return { id: `${level.toLowerCase()}-note-${ci+1}-${ri+1}`, level, chapter: ci+1,
          chapterTitle: chapter.title, item: ri+1, page: Number(page), grammar, meaning, usage, example, focus,
          opts: [meaning, ...contrasts[contrast]] };
      });
    });
  }
  window.__GRAMMAR_CATALOG = all;
  window.__GRAMMAR_PRACTICE = Object.fromEntries(Object.entries(all).map(([level, entries]) => [level,
    entries.map(entry => ({
      id: entry.id, catalogId: entry.id, type: 'meaning', cat: `文法筆記 ${String(entry.chapter).padStart(2, '0')} · ${entry.chapterTitle}`,
      grammar: entry.grammar, meaning: entry.meaning,
      q: `${entry.example}\n\n句中「${entry.focus}」表達咩意思？`,
      ans: entry.meaning, opts: entry.opts,
      explain: `「${entry.focus}」喺呢句表示「${entry.meaning}」。${entry.usage}`,
      optionNotes: Object.fromEntries(entry.opts.map(option => [option,
        option === entry.meaning ? entry.usage : `呢個解讀唔符合此句。「${entry.focus}」喺呢個語境表示「${entry.meaning}」。`]))
    }))
  ]));
})();
