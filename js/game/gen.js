/* 题目生成器：全部从 300 字表 + 拼音推导，不预写题库。
   改动一个字表读音，全部题目自动跟着改，也不会出现「背题库」。
   选项优先从相邻主题组取，保证一次闯关只需加载 1-2 个音频包。 */
(function (g) {
  var BY = {}, LIST = [], RHYME = {}, INI_POOL = [];
  /* 孤立读音会有歧义的多音字：不生成单字音频，出题一律改走词音频 */
  var NO_SOLO = { '数': 1, '只': 1 };
  function hasSolo(c) { return !NO_SOLO[c]; }

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function rnd(n) { return Math.floor(Math.random() * n); }
  function pick(a) { return a[rnd(a.length)]; }
  function shuffle(a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = rnd(i + 1); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }

  function akey(ch, kind) {
    var it = BY[ch];
    if (!it) return null;
    return (kind === 'w' ? 'w' : 'c') + pad(Math.floor(it.i / 10) + 1) + pad(it.i % 10 + 1);
  }
  function packOf(ch) {
    var it = BY[ch];
    return it ? 'g' + pad(Math.floor(it.i / 10) + 1) : 'ui';
  }
  /* 同框会互相干扰的图：一碗饭/一碗粥/一碗汤、几个圆器皿、两片叶子/一丛草。
     它们不能同时作为一道题的选项，否则考的是「猜」而不是「认」。 */
  var CLASH = {
    '饭': '粥汤米', '粥': '饭汤', '汤': '饭粥', '米': '饭',
    '碗': '盘锅', '盘': '碗锅', '锅': '碗盘',
    '叶': '草', '草': '叶',
    '树': '松柳林', '松': '树', '柳': '树', '林': '树',
    '苗': '芽', '芽': '苗',
    '日': '阳', '阳': '日',
    '白': '灰', '灰': '白',
    '走': '跑', '跑': '走',
    '推': '拉', '拉': '推',
    '拿': '抱', '抱': '拿'
  };
  function clash(a, b) { var s = CLASH[a]; return !!(s && s.indexOf(b) >= 0); }

  function hasImg(c) { return !!(g.ZY_IMG && BY[c] && g.ZY_IMG[akey(c, 'c')]); }
  function imgKey(c) { return akey(c, 'c') + '.webp'; }

  function packOfKey(k) { return k && k.length >= 3 && 'cw'.indexOf(k[0]) >= 0 ? 'g' + k.substr(1, 2) : 'ui'; }

  /* 就近取样：先在同组，再向两侧扩，控制音频包数量 */
  function near(target, n, pred) {
    var p = LIST.filter(function (it) {
      return it.c !== target.c && (!pred || pred(it));
    });
    p.sort(function (a, b) { return Math.abs(a.i - target.i) - Math.abs(b.i - target.i); });
    var head = p.slice(0, Math.max(n * 2, 16));
    return shuffle(head).slice(0, n);
  }

  function init() {
    LIST = g.ZIYA_DATA.items;
    LIST.forEach(function (it, i) {
      it.i = i;
      BY[it.c] = it;
      var p = g.ZPinyin.parse(it.p);
      it.ini = p.ini; it.fin = p.fin; it.tone = p.tone;
      var r = g.ZPinyin.rhyme(it.p);
      (RHYME[r] = RHYME[r] || []).push(it.c);
      if (p.ini) INI_POOL.push(it.c);
    });
  }

  /* ---------- M1 识字 ---------- */

  function qListen(target) {
    if (!hasSolo(target.c)) return qWord(target);
    var ds = near(target, 3, function (it) { return hasSolo(it.c); });
    if (ds.length < 3) return null;
    return {
      mod: 'm1', type: 'listen', target: target.c,
      q: '听一听，是哪个字？',
      audio: akey(target.c, 'c'),
      prompt: { kind: 'speaker' },
      options: shuffle([target].concat(ds)).map(function (it) {
        return { label: it.c, big: true, ok: it.c === target.c, audio: hasSolo(it.c) ? akey(it.c, 'c') : null };
      })
    };
  }

  function qWord(target) {
    var ds = near(target, 3, function (it) { return hasSolo(it.c); });
    if (ds.length < 3) return null;
    return {
      mod: 'm1', type: 'word', target: target.c,
      q: '哪一个字藏在这个词里？',
      audio: akey(target.c, 'w'),
      prompt: { kind: 'speaker' },
      options: shuffle([target].concat(ds)).map(function (it) {
        return { label: it.c, big: true, ok: it.c === target.c, audio: hasSolo(it.c) ? akey(it.c, 'c') : null };
      })
    };
  }

  function qMatch(target) {
    var correct = target.w[0];
    if (!correct) return null;
    var ds = [];
    var cands = near(target, 16, function (it) {
      var w = it.w[0];
      return w && w.indexOf(target.c) < 0 && w !== correct;
    });
    for (var ci = 0; ci < cands.length && ds.length < 3; ci++) {
      var w0 = cands[ci].w[0];
      if (ds.indexOf(w0) < 0) ds.push(w0);
    }
    if (ds.length < 3) return null;
    return {
      mod: 'm1', type: 'match', target: target.c,
      q: '这个字，藏在哪个词里？',
      audio: akey(target.c, 'w'),
      prompt: { kind: 'char', text: target.c },
      options: shuffle([correct].concat(ds)).map(function (w) {
        return { label: w, ok: w === correct, audio: w === correct ? akey(target.c, 'w') : null };
      })
    };
  }

  /* 看图选字：图片是皮，考的是「音—义—形」三者对应 */
  function qPic(target) {
    if (!hasImg(target.c)) return null;
    var ds = near(target, 3, function (it) { return hasImg(it.c) && !clash(target.c, it.c); });
    if (ds.length < 3) return null;
    return {
      mod: 'm1', type: 'pic', target: target.c,
      q: '这是什么？',
      audio: null,
      prompt: { kind: 'img', src: imgKey(target.c) },
      options: shuffle([target].concat(ds)).map(function (it) {
        return { label: it.c, big: true, ok: it.c === target.c, audio: hasSolo(it.c) ? akey(it.c, 'c') : null };
      })
    };
  }

  /* 看字选图：反过来，考「形→义」 */
  function qPicMatch(target) {
    if (!hasImg(target.c)) return null;
    var ds = near(target, 3, function (it) { return hasImg(it.c) && !clash(target.c, it.c); });
    if (ds.length < 3) return null;
    return {
      mod: 'm1', type: 'picmatch', target: target.c,
      q: '哪个是「' + target.c + '」？',
      audio: akey(target.c, 'c'),
      prompt: { kind: 'char', text: target.c },
      options: shuffle([target].concat(ds)).map(function (it) {
        return { img: imgKey(it.c), label: it.c, ok: it.c === target.c, audio: null };
      })
    };
  }

  function qRead(target) {
    /* 他/她 同音，读音题里不能让两个 tā 同时当选项，否则答案不唯一 */
    var cand = near(target, 14, function (it) { return hasSolo(it.c) && it.p !== target.p; });
    var ds = [], used = {};
    cand.forEach(function (it) {
      if (ds.length < 3 && !used[it.p]) { used[it.p] = 1; ds.push(it); }
    });
    if (ds.length < 3) return null;
    return {
      mod: 'm1', type: 'read', target: target.c,
      q: '这个字怎么读？',
      audio: hasSolo(target.c) ? akey(target.c, 'c') : null,
      prompt: { kind: 'char', text: target.c },
      options: shuffle([target].concat(ds)).map(function (it) {
        return { label: it.p, ok: it.c === target.c, audio: hasSolo(it.c) ? akey(it.c, 'c') : null };
      })
    };
  }

  /* ---------- M2 语音意识 ---------- */

  function qRhyme(target) {
    if (!hasSolo(target.c)) return null;
    var same = (RHYME[target.fin] || []).filter(function (c) { return c !== target.c && hasSolo(c); });
    if (!same.length) return null;
    var correctChar = pick(same);
    var ds = near(target, 2, function (it) { return it.fin !== target.fin && hasSolo(it.c); });
    if (ds.length < 2) return null;
    var opts = shuffle([BY[correctChar]].concat(ds));
    return {
      mod: 'm2', type: 'rhyme', target: target.c,
      q: '哪两个字的尾巴一样？',
      audio: akey(target.c, 'c'),
      prompt: { kind: 'char', text: target.c },
      seq: [akey(target.c, 'c')].concat(opts.map(function (it) { return akey(it.c, 'c'); })),
      options: opts.map(function (it) {
        return { label: it.c, big: true, ok: it.c === correctChar, audio: akey(it.c, 'c') };
      })
    };
  }

  function qOnset(target) {
    var pool = near(target, 10, function (it) { return it.ini && it.ini !== target.ini; });
    var sameIni = near(target, 4, function (it) { return it.ini === target.ini; });
    var useSame = sameIni.length && (!pool.length || Math.random() < 0.5);
    var other = useSame ? sameIni[0] : pool[0];
    if (!other) return null;
    var answer = other.ini === target.ini;
    return {
      mod: 'm2', type: 'onset', target: target.c,
      q: '这两个词，开头的声音一样吗？',
      audio: akey(target.c, 'w'),
      prompt: { kind: 'speaker2', a: akey(target.c, 'w'), b: akey(other.c, 'w') },
      seq: [akey(target.c, 'w'), akey(other.c, 'w')],
      options: shuffle([
        { label: '一样', ok: answer === true },
        { label: '不一样', ok: answer === false }
      ])
    };
  }

  function qSyllable(target) {
    var n = 1 + rnd(3);
    var it = target, word;
    if (n === 1) {
      if (!hasSolo(target.c)) {
        var p1 = near(target, 20, function (x) { return hasSolo(x.c); });
        if (!p1.length) return null;
        target = p1[0];
      }
      word = target.c;
      it = target;
    }
    else {
      var pool = near(target, 20, function (x) { return x.w[0] && x.w[0].length === n; });
      if (!pool.length) return null;
      it = pool[0]; word = it.w[0];
    }
    return {
      mod: 'm2', type: 'syllable', target: it.c,
      q: '数一数，有几个音节？',
      audio: n === 1 ? akey(it.c, 'c') : akey(it.c, 'w'),
      prompt: { kind: 'speaker' },
      options: shuffle([1, 2, 3].map(function (v) { return { label: v + ' 下', dots: v, ok: v === n }; }))
    };
  }

  function qTone(target) {
    if ([1, 2, 4].indexOf(target.tone) < 0 || !hasSolo(target.c)) {
      var p = near(target, 8, function (it) {
        return (it.tone === 1 || it.tone === 2 || it.tone === 4) && hasSolo(it.c);
      });
      if (!p.length) return null;
      target = p[0];
    }
    return {
      mod: 'm2', type: 'tone', target: target.c,
      q: '这个声音是平的、往上、还是往下？',
      audio: akey(target.c, 'c'),
      prompt: { kind: 'char', text: target.c, sub: '听声音' },
      options: shuffle([
        { t: '平', label: '平', d: 'flat', ok: target.tone === 1 },
        { t: '升', label: '升', d: 'up', ok: target.tone === 2 },
        { t: '降', label: '降', d: 'down', ok: target.tone === 4 }
      ])
    };
  }

  /* ---------- 出题 ---------- */

  /* 题型按阶段推进，不搞「一上来六种题型混着来」：
     阶段 1 只看图（形↔义，不需要认字也不需要听辨）
     阶段 2 加听音（音→字）与听词（词→字）
     阶段 3 才上「字→词」「字→读音」这些真正需要识字的题型
     无图的字会自然回落到听音题（qPic 返回 null，由外层 fallback 处理）。 */
  function typeList(phase, withPinyin) {
    if (phase <= 1) return ['pic', 'picmatch', 'pic', 'picmatch', 'listen', 'pic', 'picmatch', 'listen'];
    if (phase <= 2) return ['pic', 'listen', 'picmatch', 'word', 'pic', 'listen', 'picmatch', 'word'];
    return withPinyin
      ? ['pic', 'word', 'picmatch', 'match', 'listen', 'pic', 'read', 'listen']
      : ['pic', 'word', 'picmatch', 'match', 'listen', 'pic', 'match', 'word'];
  }

  function lessonM1(chars, withPinyin, phase) {
    var types = typeList(phase || 3, withPinyin);
    var qs = [];
    chars.forEach(function (ch, i) {
      var it = BY[ch];
      if (!it) return;
      var order = types.slice(i % types.length).concat(types);
      for (var k = 0; k < order.length; k++) {
        var t = order[k], o = null;
        if (t === 'listen') o = qListen(it);
        else if (t === 'word') o = qWord(it);
        else if (t === 'match') o = qMatch(it);
        else if (t === 'pic') o = qPic(it);
        else if (t === 'picmatch') o = qPicMatch(it);
        else o = qRead(it);
        if (o) { qs.push(o); break; }
      }
    });
    return qs;
  }

  function lessonM2(n) {
    var qs = [], gens = [qRhyme, qOnset, qSyllable, qTone], guard = 0;
    while (qs.length < (n || 8) && guard++ < 300) {
      var o = pick(gens)(pick(LIST));
      if (o) qs.push(o);
    }
    return qs;
  }

  /* 一节课涉及的全部音频包 */
  function packsOf(qs) {
    var s = { ui: 1 };
    qs.forEach(function (o) {
      (o.seq || []).forEach(function (k) { s[packOfKey(k)] = 1; });
      if (o.audio) s[packOfKey(o.audio)] = 1;
      o.options.forEach(function (op) { if (op.audio) s[packOfKey(op.audio)] = 1; });
    });
    return Object.keys(s);
  }

  g.ZYGen = {
    init: init, akey: akey, packOf: packOf, packsOf: packsOf,
    byChar: function (c) { return BY[c]; },
    typeList: typeList,
    hasImg: hasImg, imgKey: imgKey,
    lessonM1: lessonM1, lessonM2: lessonM2
  };
})(window);
