/* M3 拼音模块：符号认读 + 易混辨音 + 声母/韵母填空 + 拼读机。
   拼读不另做音频：直接复用 300 字表里每个字的读音，
   做到「拼出来的音就是一个真实的字」，拼音与识字当场打通。 */
(function (g) {
  var P = g.ZPY, LIST = [], BY = {}, BLEND = {}, INI = [], FIN = [], FIN_SET = {};

  var PAIRS = [
    ['b', 'p'], ['p', 'b'], ['d', 't'], ['t', 'd'], ['n', 'l'], ['l', 'n'],
    ['g', 'k'], ['m', 'n'], ['f', 'h'], ['j', 'q'], ['q', 'x'],
    ['zh', 'z'], ['z', 'zh'], ['ch', 'c'], ['c', 'ch'], ['sh', 's'], ['s', 'sh'],
    ['r', 'l'], ['ang', 'an'], ['an', 'ang'], ['eng', 'en'], ['ing', 'in'],
    ['ai', 'ei'], ['ao', 'ou'], ['ie', 'üe'], ['ui', 'iu'], ['un', 'ün'],
    ['i', 'ü'], ['u', 'ü'], ['zhi', 'zi'], ['chi', 'ci'], ['shi', 'si']
  ];

  function rnd(n) { return Math.floor(Math.random() * n); }
  function pick(a) { return a[rnd(a.length)]; }
  function shuffle(a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = rnd(i + 1); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function toneless(py) {
    return py.replace(/[āáǎà]/g, 'a').replace(/[ēéěè]/g, 'e').replace(/[īíǐì]/g, 'i')
      .replace(/[ōóǒò]/g, 'o').replace(/[ūúǔù]/g, 'u').replace(/[ǖǘǚǜ]/g, 'ü');
  }
  function keyOf(sym) { return P.bySymbol(sym).k; }

  function init() {
    INI = P.inGroup('sheng').map(function (x) { return x.s; });
    FIN = P.inGroup('dan').concat(P.inGroup('fu')).concat(P.inGroup('bi'))
      .map(function (x) { return x.s; });
    FIN.forEach(function (f) { FIN_SET[f.replace(/ü/g, 'v')] = f; });

    LIST = g.ZIYA_DATA.items;
    LIST.forEach(function (it) {
      var p = g.ZPinyin.parse(it.p);
      it.ini = p.ini; it.fin = p.fin; it.tone = p.tone;
      if (!p.ini || INI.indexOf(p.ini) < 0) return;
      var f = FIN_SET[p.fin];
      if (!f) return;
      it.finSym = f;
      var k = p.ini + '|' + f;
      if (!BLEND[k]) BLEND[k] = it;
    });
  }

  function sameGroupOptions(target, n) {
    var pool = P.inGroup(target.g).filter(function (x) { return x.s !== target.s; });
    return shuffle(pool).slice(0, n);
  }

  /* 听音选符号 */
  function qSym(target) {
    var ds = sameGroupOptions(target, 3);
    if (ds.length < 2) return null;
    var opts = shuffle([target].concat(ds)).map(function (x) {
      return { label: x.s, py: true, ok: x.s === target.s, audio: x.k };
    });
    return {
      mod: 'm3', type: 'sym', target: target.s,
      q: '听一听，是哪一个？',
      audio: target.k,
      prompt: { kind: 'speaker' },
      options: opts
    };
  }

  /* 易混辨音：两个音一样吗 */
  function qDisc() {
    var pr = pick(PAIRS);
    var a = P.bySymbol(pr[0]), b = P.bySymbol(pr[1]);
    if (!a || !b) return null;
    var same = Math.random() < 0.4;
    var second = same ? a : b;
    return {
      mod: 'm3', type: 'disc', target: a.s,
      q: '这两个音，一样吗？',
      audio: a.k,
      prompt: { kind: 'speaker2', a: a.k, b: second.k },
      seq: [a.k, second.k],
      options: shuffle([
        { label: '一样', ok: same },
        { label: '不一样', ok: !same }
      ])
    };
  }

  function blendPool() {
    var out = [];
    for (var k in BLEND) out.push(BLEND[k]);
    return out;
  }

  /* 声母填空：包 + ▢āo */
  function qShengFill(item) {
    if (!item || !item.ini) return null;
    var rest = item.p.slice(item.ini.length);
    var ds = shuffle(INI.filter(function (s) { return s !== item.ini; })).slice(0, 3);
    if (ds.length < 3) return null;
    return {
      mod: 'm3', type: 'sheng', target: item.c,
      q: '这里缺了哪个声母？',
      audio: g.ZYGen.akey(item.c, 'c'),
      prompt: { kind: 'gap', char: item.c, left: '', right: rest },
      options: shuffle([item.ini].concat(ds)).map(function (s) {
        return { label: s, py: true, ok: s === item.ini };
      })
    };
  }

  /* 韵母填空：包 + b▢ */
  function qYunFill(item) {
    if (!item || !item.finSym) return null;
    var ds = shuffle(FIN.filter(function (f) { return f !== item.finSym; })).slice(0, 3);
    return {
      mod: 'm3', type: 'yun', target: item.c,
      q: '这里缺了哪个韵母？',
      audio: g.ZYGen.akey(item.c, 'c'),
      prompt: { kind: 'gap', char: item.c, left: item.ini, right: '' },
      options: shuffle([item.finSym].concat(ds)).map(function (f) {
        return { label: f, py: true, ok: f === item.finSym };
      })
    };
  }

  function lessonSymbols(groupId) {
    var pool = (groupId === 'all') ? P.list : P.inGroup(groupId), qs = [];
    var n = Math.min(8, Math.max(4, pool.length));
    var order = shuffle(pool).slice(0, n);
    order.forEach(function (x, i) {
      var q = (i % 4 === 3) ? qDisc() : qSym(x);
      if (q) qs.push(q);
    });
    if (qs.length < 4) {
      pool.slice(0, 4).forEach(function (x) { var q = qSym(x); if (q) qs.push(q); });
    }
    return qs;
  }

  function lessonBlend(n) {
    var pool = blendPool(), qs = [], guard = 0;
    while (qs.length < (n || 8) && guard++ < 100) {
      var it = pick(pool);
      var q = (qs.length % 2 === 0) ? qShengFill(it) : qYunFill(it);
      if (q) qs.push(q);
    }
    return qs;
  }

  function packsOf(qs) {
    var s = { ui: 1 };
    qs.forEach(function (q) {
      (q.seq || []).forEach(function (k) { s[packOfKey(k)] = 1; });
      if (q.audio) s[packOfKey(q.audio)] = 1;
      q.options.forEach(function (o) { if (o.audio) s[packOfKey(o.audio)] = 1; });
    });
    return Object.keys(s);
  }

  function packOfKey(k) {
    if (!k) return 'ui';
    if (k[0] === 'p') return (+k.slice(1) <= 29) ? 'py1' : 'py2';
    return g.ZYGen.packOfKey ? g.ZYGen.packOfKey(k) : ('g' + k.substr(1, 2));
  }

  g.ZYPhonics = {
    init: init, lessonSymbols: lessonSymbols, lessonBlend: lessonBlend,
    packsOf: packsOf, blend: BLEND, inis: function () { return INI; }, fins: function () { return FIN; },
    toneless: toneless
  };
})(window);
