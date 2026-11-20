/* 字芽 · 主程序：状态、界面、交互。
   设计约束：4 岁，不识字也能玩；单次 12 分钟；错题不惩罚，只重听。 */
(function (g) {
  var D = g.ZIYA_DATA, S = g.ZStore, SRS = g.ZSRS, A = g.ZYAudio, Gen = g.ZYGen;

  /* 年龄档位只决定「默认打开哪些能力」，不锁内容 —— 家长随时可改 */
  var AGES = {
    '4': { label: '4 岁', pinyin: false, readMax: 5, note: '识字 + 语音意识' },
    '5': { label: '5 岁', pinyin: true, readMax: 7, note: '+ 拼音 + 短句' },
    '6': { label: '6 岁', pinyin: true, readMax: 99, note: '全部解锁' }
  };
  function ageCfg() { return AGES[S.data.settings.age] || AGES['4']; }
  var PH = g.ZYPhonics, PY = g.ZPY;
  var TIME_LIMIT = 12 * 60 * 1000;
  var stage = null;

  var App = {
    screen: 'home',
    mod: 'm1',
    qs: [], qi: 0, tries: 0, right: 0,
    locked: false, t0: 0, revealed: false,
    m3group: 'dan', blend: { ini: null, fin: null }, read: null, stroke: { list: [], i: 0 },
    log: []
  };

  function q(sel) { return document.querySelector(sel); }
  function h(html) { var d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstChild; }
  function starSVG(n) {
    var s = '';
    for (var i = 0; i < 3; i++) {
      s += '<svg viewBox="0 0 24 24" class="star' + (i < n ? ' on' : '') + '"><path d="M12 2.6l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.4 6.2 20.5l1.1-6.5L2.6 9.4l6.5-.9z"/></svg>';
    }
    return s;
  }

  /* ---------------- 首页 ---------------- */
  function viewHome() {
    var due = SRS.dueList().length;
    var fresh = SRS.newList().length;
    var st = SRS.stats();
    var today = S.data.days[S.today()] || { sec: 0, done: 0 };
    return '' +
      '<section class="home">' +
      '<div class="brand"><svg class="logo" viewBox="0 0 40 40" aria-hidden="true">' +
      '<rect width="40" height="40" rx="12" fill="#2F7A66"/>' +
      '<path d="M20 30V19" stroke="#FBF6EC" stroke-width="3" stroke-linecap="round"/>' +
      '<ellipse cx="13.6" cy="16.4" rx="6" ry="4" fill="#FBF6EC" transform="rotate(-22 13.6 16.4)"/>' +
      '<ellipse cx="26.4" cy="12.8" rx="6" ry="4" fill="#FBF6EC" transform="rotate(22 26.4 12.8)"/>' +
      '<ellipse cx="20" cy="31" rx="7.4" ry="3.2" fill="#2F7A66" stroke="#FBF6EC" stroke-width="1.4"/>' +
      '</svg><b>字芽</b></div>' +
      '<p class="lede">今天 <b>' + Math.min(5, fresh) + '</b> 个新字，<b>' + due + '</b> 个要复习</p>' +
      '<button class="big primary" data-act="go" data-mod="m1">' +
      '<span class="glyph">认</span><span class="lbl">认字</span>' +
      '<span class="sub">' + st.started + ' / ' + D.items.length + ' 字 已开始</span></button>' +
      '<button class="big" data-act="go" data-mod="m2">' +
      '<span class="glyph">听</span><span class="lbl">听音游戏</span>' +
      '<span class="sub">押韵 · 声调 · 音节</span></button>' +
      '<button class="big" data-act="map"><span class="glyph">图</span><span class="lbl">地图</span>' +
      '<span class="sub">31 个主题 · 挑一组练</span></button>' +
      (S.data.settings.pinyin
        ? '<button class="big" data-act="m3"><span class="glyph">拼</span><span class="lbl">拼音</span>' +
          '<span class="sub">63 个符号 · 拼一拼</span></button>'
        : '') +
      '<div class="foot">' +
      '<span class="tiny">今天玩了 ' + Math.round(today.sec / 60) + ' 分钟</span>' +
      '<span class="footbtns"><button class="ghost" data-act="more">更多</button>' +
      '<button class="ghost" data-act="parent">家长</button></span>' +
      '</div></section>';
  }

  /* ---------------- 题目 ---------------- */
  function cur() { return App.qs[App.qi]; }

  function viewPrompt(p) {
    if (p.kind === 'gap') {
      var L = p.left ? '<span>' + p.left + '</span>' : '<span class="blank"></span>';
      var R = p.right ? '<span>' + p.right + '</span>' : '<span class="blank"></span>';
      return '<div class="prompt"><div class="bigchar">' + p.char + '</div>' +
        '<div class="gap-py">' + L + R + '</div>' +
        '<div class="psub">听一听，再选</div></div>';
    }
    if (p.kind === 'img') {
      return '<div class="prompt"><img class="promptimg" src="img/' + p.src + '" alt="">' +
        '<div class="psub">看图，选一个字</div></div>';
    }
    if (p.kind === 'char') {
      return '<div class="prompt"><div class="bigchar">' + p.text + '</div>' +
        (p.sub ? '<div class="psub">' + p.sub + '</div>' : '') + '</div>';
    }
    if (p.kind === 'speaker2') {
      return '<div class="prompt"><div class="two-spk">' +
        '<button class="spk" data-act="play" data-key="' + p.a + '"><i></i></button>' +
        '<button class="spk" data-act="play" data-key="' + p.b + '"><i></i></button>' +
        '</div><div class="psub">点一下，听两遍</div></div>';
    }
    return '<div class="prompt"><button class="spk big" data-act="play" data-key="' + (cur().audio || '') + '"><i></i></button>' +
      '<div class="psub">点一下，再听一遍</div></div>';
  }

  function viewOptions(qq) {
    var n = qq.options.length;
    var cls = 'opts n' + n + (qq.type === 'match' || qq.type === 'read' ? ' text' : '') +
      (qq.type === 'picmatch' ? ' pics' : '');
    var body = qq.options.map(function (o, i) {
      var inner;
      if (o.img) inner = '<img class="optimg" src="img/' + o.img + '" alt="">';
      else if (o.py) inner = '<span class="opt-py">' + o.label + '</span>';
      else if (o.big) inner = '<span class="opt-char">' + o.label + '</span>';
      else if (o.dots) inner = '<span class="opt-dots">' + dots(o.dots) + '</span>';
      else if (o.d) inner = toneSVG(o.d) + '<span class="opt-word">' + o.t + '</span>';
      else inner = '<span class="opt-word">' + o.label + '</span>';
      return '<button class="opt" data-act="opt" data-i="' + i + '">' + inner + '</button>';
    }).join('');
    return '<div class="' + cls + '">' + body + '</div>';
  }

  function dots(n) {
    var s = '';
    for (var i = 0; i < n; i++) s += '<b></b>';
    return s;
  }
  function toneSVG(d) {
    var path = d === 'flat' ? 'M8 20 L56 20' : d === 'up' ? 'M8 34 L56 8' : 'M8 8 L56 34';
    return '<svg class="tone" viewBox="0 0 64 42"><path d="' + path + '" fill="none" stroke-width="6" stroke-linecap="round"/></svg>';
  }

  function viewPlay() {
    var qq = cur();
    if (!qq) return viewDone();
    var pct = Math.round(App.qi / App.qs.length * 100);
    return '<section class="play"><div class="pbar"><i style="width:' + pct + '%"></i></div>' +
      '<h2 class="qq">' + qq.q + '</h2>' +
      viewPrompt(qq.prompt) + viewOptions(qq) +
      '<div class="hint" id="hint"></div></section>';
  }

  /* ---------------- 结算 ---------------- */
  function stars() {
    var r = App.right, t = App.qs.length || 1;
    if (r >= t - 1) return 3;
    if (r >= Math.ceil(t * 0.6)) return 2;
    return 1;
  }

  function viewDone() {
    var t = App.qs.length || 1;
    var mins = Math.round((Date.now() - App.t0) / 60000);
    return '<section class="done">' +
      '<div class="stars">' + starSVG(stars()) + '</div>' +
      '<p class="score">答对 <b>' + App.right + '</b> / ' + t + '</p>' +
      '<p class="tiny">用了 ' + Math.max(1, mins) + ' 分钟</p>' +
      '<div class="done-btns">' +
      '<button class="big primary" data-act="again"><span class="lbl">再来一组</span></button>' +
      '<button class="ghost wide" data-act="home">回家</button>' +
      '</div></section>';
  }

  /* ---------------- 家长 ---------------- */
  function viewParent() {
    var st = SRS.stats(), dist = st.dist;
    var bars = '';
    for (var i = 5; i >= 1; i--) {
      var c = dist[i] || 0;
      var pct = Math.min(100, c / 30 * 100);
      bars += '<div class="barrow"><span class="bl">' + i + ' 级</span>' +
        '<span class="bar"><i style="width:' + pct + '%"></i></span><span class="bn">' + c + '</span></div>';
    }
    var ms = SRS.mistakes(8);
    var mis = ms.length ? ms.map(function (m) {
      return '<span class="chip">' + m.c + '<em>' + m.w + '</em></span>';
    }).join('') : '<span class="tiny">暂时没有错字</span>';

    var days = [], today = new Date();
    for (var d = 6; d >= 0; d--) {
      var dt = new Date(today.getTime() - d * 86400000);
      var k = dt.getFullYear() + '-' + ('0' + (dt.getMonth() + 1)).slice(-2) + '-' + ('0' + dt.getDate()).slice(-2);
      days.push({ k: k, sec: (S.data.days[k] || {}).sec || 0 });
    }
    var maxSec = Math.max(60, Math.max.apply(null, days.map(function (x) { return x.sec; })));
    var chart = days.map(function (x) {
      var hp = Math.max(2, x.sec / maxSec * 60);
      return '<span class="col"><i style="height:' + hp + 'px"></i><em>' + Math.round(x.sec / 60) + '</em></span>';
    }).join('');

    return '<section class="parent">' +
      '<h1>家长面板</h1>' +
      '<div class="card"><h3>掌握度分布</h3>' + bars +
      '<p class="tiny">已开始 ' + st.started + ' 字 · 掌握（5 级）' + (dist[5] || 0) + ' 字</p></div>' +
      '<div class="card"><h3>错字榜</h3><div class="chips">' + mis + '</div></div>' +
      '<div class="card"><h3>近 7 天（分钟）</h3><div class="chart">' + chart + '</div></div>' +
      '<div class="card"><h3>设置</h3>' +
      '<div class="row"><span>年龄档</span></div>' +
      '<div class="seg" id="seg-age">' +
      ['4', '5', '6'].map(function (a) {
        return '<button data-age="' + a + '"' +
          (S.data.settings.age === a ? ' class="on"' : '') + '>' + AGES[a].label + '</button>';
      }).join('') + '</div>' +
      '<p class="tiny">' + ageCfg().note + '。档位只改默认开关，不锁内容。</p>' +
      '<label class="row"><span>拼音解锁</span>' +
      '<input type="checkbox" id="sw-pinyin"' + (S.data.settings.pinyin ? ' checked' : '') + '>' +
      '<i class="sw"></i></label>' +
      '<p class="tiny">打开后，认字里会出现「看字选读音」题型。建议满 5 岁再开。</p>' +
      '<label class="row"><span>静音</span>' +
      '<input type="checkbox" id="sw-mute"' + (S.data.settings.muted ? ' checked' : '') + '><i class="sw"></i></label>' +
      '</div>' +
      '<div class="card"><h3>数据</h3>' +
      '<div class="row-btns">' +
      '<button class="ghost" data-act="export">导出备份</button>' +
      '<button class="ghost" data-act="import">导入备份</button>' +
      '<input type="file" id="f-import" accept="application/json" hidden>' +
      '<button class="ghost danger" data-act="reset">清空</button>' +
      '</div><p class="tiny">换设备前先导出，新设备导入即可继续。</p></div>' +
      '<p class="tiny center">字芽 v0.4 · ' + D.items.length + ' 字 · ' + Object.keys(g.ZY_IMG || {}).length +
      ' 图 · 本地存储</p>' +
      '</section>';
  }

  /* ---------------- 字卡（可打印） ---------------- */
  function viewCards() {
    var learned = D.items.filter(function (it) {
      var r = S.data.chars[it.c];
      return r && r.lvl >= 1;
    });
    var list = learned.length ? learned : D.items.slice(0, 24);
    var tiles = list.map(function (it) {
      var img = Gen.hasImg(it.c)
        ? '<img class="pc-img" src="img/' + Gen.imgKey(it.c) + '" alt="">'
        : '<span class="pc-img blank"></span>';
      return '<div class="pcard">' + img +
        '<span class="pc-char">' + it.c + '</span>' +
        '<span class="pc-py">' + it.p + '</span></div>';
    }).join('');
    return '<section class="cards">' +
      '<div class="row-btns"><button class="ghost" data-act="print">打印 / 存成 PDF</button>' +
      '<span class="tiny">' + list.length + ' 张 · ' + (learned.length ? '已学过的字' : '尚未开始，先给你前 24 张') + '</span></div>' +
      '<div class="pgrid">' + tiles + '</div></section>';
  }

  /* ---------------- 地图 ---------------- */
  function viewMap() {
    var tiles = D.groups.map(function (gr, i) {
      var n = gr.chars.length;
      var got = gr.chars.filter(function (it) {
        var r = S.data.chars[it.c];
        return r && r.lvl >= 1;
      }).length;
      var pct = Math.round(got / n * 100);
      return '<button class="mtile' + (got === n ? ' full' : '') + '" data-act="mg" data-g="' + i + '">' +
        '<b>' + gr.theme + '</b>' +
        '<span class="mnum">' + got + '/' + n + '</span>' +
        '<i class="mbar"><em style="width:' + pct + '%"></em></i>' +
        '</button>';
    }).join('');
    return '<section class="map">' +
      '<h1>地图</h1>' +
      '<p class="lede">31 个主题、' + D.items.length + ' 个字。点一组就练这一组。</p>' +
      '<div class="mgrid2">' + tiles + '</div></section>';
  }

  /* ---------------- 拼音 ---------------- */
  function viewM3() {
    var cards = PY.groups.map(function (gid) {
      var items = PY.inGroup(gid);
      var sample = items.slice(0, 6).map(function (x) { return x.s; }).join(' ');
      return '<button class="mcard" data-act="go" data-mod="m3sym" data-g="' + gid + '">' +
        '<b>' + PY.groupName(gid) + '</b>' +
        '<span>' + items.length + ' 个</span>' +
        '<em>' + sample + '</em></button>';
    }).join('');
    cards += '<button class="mcard all" data-act="go" data-mod="m3sym" data-g="all">' +
      '<b>全部复习</b><span>63 个</span><em>随机抽查</em></button>';
    return '<section class="m3">' +
      '<h1>拼音</h1>' +
      '<p class="lede">先听声音，再看符号。拼出来的音，就是一个真的字。</p>' +
      '<div class="mgrid">' + cards + '</div>' +
      '<button class="big primary" data-act="go" data-mod="m3blend">' +
      '<span class="glyph">拼</span><span class="lbl">拼读闯关</span>' +
      '<span class="sub">补声母 · 补韵母</span></button>' +
      '<button class="big" data-act="blend">' +
      '<span class="glyph">合</span><span class="lbl">拼读机</span>' +
      '<span class="sub">自己拼，拼出真的字</span></button>' +
      '</section>';
  }

  function viewBlend() {
    var b = App.blend;
    var syl = '', ch = '', hint = '选一个声母，再选一个韵母';
    if (b.ini && b.fin) {
      var item = PH.blend[b.ini + '|' + b.fin];
      if (item) { syl = item.p; ch = item.c; hint = '拼出来是「' + item.c + '」'; }
      else { hint = '这个音还没收进字表，换一个试试'; }
    } else if (b.ini) hint = '再选一个韵母';
    else if (b.fin) hint = '先选一个声母';

    function chips(list, act, cur) {
      return list.map(function (s) {
        return '<button class="chipbtn' + (cur === s ? ' on' : '') + '" data-act="' + act +
          '" data-v="' + s + '">' + s + '</button>';
      }).join('');
    }

    return '<section class="blend">' +
      '<h1>拼读机</h1>' +
      '<div class="bresult">' +
      '<div class="bformula">' +
      '<span class="bslot' + (b.ini ? ' on' : '') + '">' + (b.ini || '?') + '</span>' +
      '<span class="bop">+</span>' +
      '<span class="bslot' + (b.fin ? ' on' : '') + '">' + (b.fin || '?') + '</span>' +
      '<span class="bop">=</span>' +
      '<span class="bsyl">' + syl + '</span>' +
      '</div>' +
      '<div class="bchar' + (ch ? ' pop' : '') + '">' + ch + '</div>' +
      '<div class="psub">' + hint + '</div>' +
      '<button class="ghost" data-act="blend-reset">重选</button>' +
      '</div>' +
      '<div class="bgroup"><h3>声母 23</h3><div class="chips">' + chips(PH.inis(), 'ini', b.ini) + '</div></div>' +
      '<div class="bgroup"><h3>韵母 24</h3><div class="chips">' + chips(PH.fins(), 'fin', b.fin) + '</div></div>' +
      '</section>';
  }

  /* ---------------- 更多 / 描红 ---------------- */
  function viewMore() {
    return '<section class="more">' +
      '<h1>更多</h1>' +
      '<button class="big" data-act="stroke"><span class="glyph">写</span>' +
      '<span class="lbl">描一描</span><span class="sub">看笔顺，跟着写</span></button>' +
      '<button class="big" data-act="read"><span class="glyph">读</span>' +
      '<span class="lbl">读一读</span><span class="sub">用学过的字读短句</span></button>' +
      '<button class="big" data-act="cards"><span class="glyph">卡</span>' +
      '<span class="lbl">字卡</span><span class="sub">打印出来，剪开就能用</span></button>' +
      '</section>';
  }

  function strokeList() {
    var learned = D.items.filter(function (it) {
      var r = S.data.chars[it.c];
      return r && r.lvl >= 1 && r.lvl <= 3;
    });
    if (learned.length < 6) {
      learned = learned.concat(D.items.filter(function (it) {
        var r = S.data.chars[it.c];
        return (!r || r.lvl === 0) && learned.indexOf(it) < 0;
      }).slice(0, 6 - learned.length));
    }
    return learned.slice(0, 6).map(function (it) { return it.c; });
  }

  function viewStroke() {
    var st = App.stroke, ch = st.list[st.i], it = Gen.byChar(ch);
    var pct = Math.round((st.i + 1) / st.list.length * 100);
    return '<section class="stroke">' +
      '<div class="pbar"><i style="width:' + pct + '%"></i></div>' +
      '<div class="sphead"><span class="sppy">' + (it ? it.p : '') +
      (it ? ' · ' + it.w[0] : '') + '</span></div>' +
      '<div class="hw" id="hw"></div>' +
      '<div class="spresult"></div>' +
      '<div class="spbtns">' +
      '<button class="ghost" data-act="st-play">再看一遍</button>' +
      '<button class="ghost primary-ghost" data-act="st-trace">描一描</button>' +
      '</div>' +
      '<div class="spnav">' +
      '<button class="ghost" data-act="st-prev"' + (st.i === 0 ? ' disabled' : '') + '>上一个</button>' +
      '<span class="tiny">' + (st.i + 1) + ' / ' + st.list.length + '</span>' +
      '<button class="ghost" data-act="st-next"' + (st.i === st.list.length - 1 ? ' disabled' : '') + '>下一个</button>' +
      '</div></section>';
  }

  function mountStroke() {
    var ch = App.stroke.list[App.stroke.i];
    var it = Gen.byChar(ch);
    if (!it) return;
    var gid = 'g' + (Math.floor(it.i / 10) + 1 < 10 ? '0' : '') + (Math.floor(it.i / 10) + 1);
    g.ZStroke.load(gid).then(function () {
      var el = document.getElementById('hw');
      if (!el) return;
      el.innerHTML = '';
      if (!g.ZY_STROKES || !g.ZY_STROKES[ch] || !g.HanziWriter) {
        el.innerHTML = '<p class="tiny">这个字的笔顺还没有</p>';
        return;
      }
      var w = Math.min(300, (stage.clientWidth || 360) - 70);
      el.style.width = w + 'px';
      el.style.height = w + 'px';
      App.writer = g.HanziWriter.create(el, ch, {
        width: w, height: w, padding: 4, showOutline: true,
        strokeColor: '#2E2A26', radicalColor: '#2F7A66',
        outlineColor: '#E7DFD2', highlightColor: '#E08A3C',
        drawingColor: '#2F7A66', drawingWidth: 18,
        strokeAnimationSpeed: 1, delayBetweenStrokes: 260,
        charDataLoader: function (c, onComplete) { onComplete(g.ZY_STROKES[c]); }
      });
      App.writer.animateCharacter();
    });
  }

  /* ---------------- 阅读 ---------------- */
  function viewRead() {
    var groups = {}, order = [];
    var maxLen = ageCfg().readMax;
    var pool = g.ZREADS.filter(function (r) {
      return (r.t.match(/[\u4e00-\u9fa5]/g) || []).length <= maxLen;
    });
    if (!pool.length) pool = g.ZREADS.slice();
    pool.forEach(function (r) {
      if (!groups[r.tag]) { groups[r.tag] = []; order.push(r.tag); }
      groups[r.tag].push(r);
    });
    var html = order.map(function (tag) {
      return '<div class="rgroup"><h3>' + tag + '</h3><div class="rgrid">' +
        groups[tag].map(function (r) {
          return '<button class="rcard" data-act="r-open" data-k="' + r.k + '">' + r.t + '</button>';
        }).join('') + '</div></div>';
    }).join('');
    return '<section class="read"><h1>读一读</h1>' +
      '<p class="lede">每一句都只用你学过的字，可以自己读下来。' +
      (maxLen < 99 ? '（当前 ' + ageCfg().label + ' 档，只显示 ' + maxLen + ' 字以内的句子）' : '') +
      '</p>' + html + '</section>';
  }

  function viewReadDetail() {
    var r = App.read;
    if (!r) return viewRead();
    var spans = [].map.call(r.t, function (c, i) {
      var isHan = /[\u4e00-\u9fa5]/.test(c);
      return '<span class="rc' + (isHan ? '' : ' punct') + '">' + c + '</span>';
    }).join('');
    return '<section class="readd">' +
      '<div class="rline" id="rline">' + spans + '</div>' +
      '<div class="psub">跟着亮起来的字读</div>' +
      '<div class="spbtns"><button class="ghost primary-ghost" data-act="r-play">再读一遍</button></div>' +
      '<div class="rnav">' +
      '<button class="ghost" data-act="r-prev"' + (r.i === 0 ? ' disabled' : '') + '>上一句</button>' +
      '<button class="ghost" data-act="r-next"' + (r.i === g.ZREADS.length - 1 ? ' disabled' : '') + '>下一句</button>' +
      '</div></section>';
  }

  /* 指读：按音频时长均分，逐字点亮 */
  function playRead() {
    var r = App.read;
    if (!r) return;
    var spans = stage.querySelectorAll('.rc');
    var han = [].filter.call(spans, function (s) { return !s.classList.contains('punct'); });
    for (var i = 0; i < spans.length; i++) spans[i].classList.remove('on');
    if (!han.length) return;
    A.loadPack('rd').then(function () {
      var a = A.play(r.k);
      var dur = A.dur[r.k] || (han.length * 0.62);
      var step = Math.max(0.35, (dur - 0.25) / han.length);
      han.forEach(function (s, i) {
        setTimeout(function () {
          for (var j = 0; j < han.length; j++) han[j].classList.remove('on');
          s.classList.add('on');
        }, 150 + i * step * 1000);
      });
      setTimeout(function () {
        for (var j = 0; j < han.length; j++) han[j].classList.remove('on');
      }, 150 + han.length * step * 1000 + 300);
    });
  }

  /* ---------------- 渲染 ---------------- */
  function render() {
    var body = App.screen === 'home' ? viewHome()
      : App.screen === 'play' ? viewPlay()
        : App.screen === 'done' ? viewDone()
        : App.screen === 'm3' ? viewM3()
          : App.screen === 'blend' ? viewBlend()
            : App.screen === 'more' ? viewMore()
              : App.screen === 'stroke' ? viewStroke()
                : App.screen === 'cards' ? viewCards()
                  : App.screen === 'map' ? viewMap()
                  : App.screen === 'read' ? viewRead()
                  : App.screen === 'readd' ? viewReadDetail() : viewParent();
    var backable = ['m3', 'blend', 'stroke', 'read', 'readd', 'more', 'parent', 'map', 'cards'].indexOf(App.screen) >= 0;
    stage.innerHTML = (backable
      ? '<div class="navrow"><button class="ghost" data-act="back">' +
        (App.screen === 'readd' ? '← 全部句子' : '← 回家') + '</button></div>'
      : '') + body;
    document.body.setAttribute('data-screen', App.screen);
    if (App.screen === 'stroke') mountStroke();
  }

  function autoSpeak() {
    var qq = cur();
    if (!qq) return;
    if (qq.seq) {
      setTimeout(function () {
        A.sequence(qq.seq, 1500, function (k, i) {
          var os = stage.querySelectorAll('.opt');
          for (var j = 0; j < os.length; j++) os[j].classList.remove('speaking');
          if (i >= 1 && os[i - 1]) os[i - 1].classList.add('speaking');
        }, function () {
          var os = stage.querySelectorAll('.opt');
          for (var j = 0; j < os.length; j++) os[j].classList.remove('speaking');
        });
      }, 300);
    } else if (qq.audio) {
      setTimeout(function () { A.play(qq.audio); }, 320);
    }
  }

  /* ---------------- 流程 ---------------- */
  function start(mod, groupId) {
    App.mod = mod;
    App.t0 = Date.now();
    App.qi = 0; App.right = 0; App.tries = 0; App.locked = false; App.log = [];
    if (groupId) App.m3group = groupId;
    if (mod === 'm1group') App.screen = 'play';
    if (mod === 'm1') App.qs = Gen.lessonM1(SRS.queue(8, 5), !!S.data.settings.pinyin);
    else if (mod === 'm1group') {
      var gr = D.groups[+groupId];
      App.qs = gr
        ? Gen.lessonM1(gr.chars.map(function (it) { return it.c; }), !!S.data.settings.pinyin)
        : [];
    }
    else if (mod === 'm2') App.qs = Gen.lessonM2(8);
    else if (mod === 'm3sym') App.qs = PH.lessonSymbols(App.m3group || 'dan');
    else App.qs = PH.lessonBlend(8);
    if (!App.qs.length) { App.screen = 'home'; render(); return; }
    App.screen = 'play';
    render();
    var packs = (mod === 'm3sym' || mod === 'm3blend') ? PH.packsOf(App.qs) : Gen.packsOf(App.qs);
    A.preload(packs).then(function () {
      A.play('u11');
      autoSpeak();
    });
  }

  function next() {
    App.qi++;
    App.tries = 0;
    App.revealed = false;
    App.locked = false;
    if (App.qi >= App.qs.length) return finish();
    render();
    autoSpeak();
  }

  function finish() {
    var elapsed = Date.now() - App.t0;
    S.addSeconds(Math.round(elapsed / 1000));
    S.addDone(1);
    if (App.mod === 'm1' || App.mod === 'm1group') {
      App.log.forEach(function (r) { SRS.record(r.c, r.ok); });
    } else if (App.mod === 'm3sym' || App.mod === 'm3blend') {
      if (!S.data.m3) S.data.m3 = { right: 0, wrong: 0, plays: 0 };
      App.log.forEach(function (r) { if (r.ok) S.data.m3.right++; else S.data.m3.wrong++; });
      S.data.m3.plays++;
    } else {
      App.log.forEach(function (r) { if (r.ok) S.data.m2.right++; else S.data.m2.wrong++; });
      S.data.m2.plays++;
    }
    S.save();
    App.screen = 'done';
    render();
    A.play(elapsed > TIME_LIMIT ? 'u18' : 'u09');
  }

  function choose(i) {
    if (App.locked) return;
    var qq = cur();
    var o = qq.options[i];
    if (!o) return;
    if (o.audio) A.play(o.audio);

    var btns = stage.querySelectorAll('.opt');
    if (o.ok) {
      App.locked = true;
      btns[i].classList.add('ok');
      if (App.tries === 0) App.right++;
      App.log.push({ c: qq.target, ok: App.tries === 0 });
      A.play(App.tries === 0 ? (Math.random() < 0.5 ? 'u01' : 'u02') : 'u03');
      setTimeout(next, 950);
    } else {
      App.tries++;
      btns[i].classList.add('bad');
      btns[i].disabled = true;
      if (App.tries >= 2) {
        App.locked = true;
        App.log.push({ c: qq.target, ok: false });
        for (var j = 0; j < qq.options.length; j++) if (qq.options[j].ok) btns[j].classList.add('reveal');
        A.play('u12');
        setTimeout(next, 1700);
      } else {
        A.play('u05');
      }
    }
  }

  /* ---------------- 事件 ---------------- */
  function bind() {
    stage.addEventListener('click', function (e) {
      var t = e.target.closest('[data-act]');
      if (!t) return;
      var act = t.getAttribute('data-act');
      if (act === 'back') {
        if (App.screen === 'readd') { App.screen = 'read'; }
        else { App.screen = 'home'; }
        render();
      }
      else if (act === 'go') { start(t.getAttribute('data-mod'), t.getAttribute('data-g')); }
      else if (t.hasAttribute('data-age')) {
        var a = t.getAttribute('data-age');
        S.data.settings.age = a;
        S.data.settings.pinyin = AGES[a].pinyin;
        S.save(); render();
      }
      else if (act === 'map') { App.screen = 'map'; render(); }
      else if (act === 'mg') { start('m1group', t.getAttribute('data-g')); }
      else if (act === 'm3') { App.screen = 'm3'; render(); }
      else if (act === 'blend') { App.blend = { ini: null, fin: null }; App.screen = 'blend'; render(); A.preload(['py1', 'py2']); }
      else if (act === 'ini' || act === 'fin') {
        var v = t.getAttribute('data-v');
        if (act === 'ini') App.blend.ini = App.blend.ini === v ? null : v;
        else App.blend.fin = App.blend.fin === v ? null : v;
        var sy = PY.bySymbol(v);
        if (sy) A.play(sy.k);
        var both = App.blend.ini && App.blend.fin;
        render();
        if (both) {
          var hit = PH.blend[App.blend.ini + '|' + App.blend.fin];
          if (hit) setTimeout(function () { A.play(Gen.akey(hit.c, 'c')); }, 520);
        }
      }
      else if (act === 'blend-reset') { App.blend = { ini: null, fin: null }; render(); }
      else if (act === 'more') { App.screen = 'more'; render(); }
      else if (act === 'stroke') {
        App.stroke = { list: strokeList(), i: 0 };
        App.screen = 'stroke'; render();
      }
      else if (act === 'read') { App.screen = 'read'; render(); }
      else if (act === 'cards') { App.screen = 'cards'; render(); }
      else if (act === 'print') { window.print(); }
      else if (act === 'r-open') {
        var kk = t.getAttribute('data-k');
        App.read = g.ZREADS.filter(function (x) { return x.k === kk; })[0];
        App.screen = 'readd'; render(); playRead();
      }
      else if (act === 'r-play') { playRead(); }
      else if (act === 'r-prev' && App.read && App.read.i > 0) {
        App.read = g.ZREADS[App.read.i - 1]; render(); playRead();
      }
      else if (act === 'r-next' && App.read && App.read.i < g.ZREADS.length - 1) {
        App.read = g.ZREADS[App.read.i + 1]; render(); playRead();
      }
      else if (act === 'st-play') { if (App.writer) App.writer.animateCharacter(); }
      else if (act === 'st-trace') {
        if (!App.writer) return;
        var res = stage.querySelector('.spresult');
        if (res) { res.classList.remove('show'); res.textContent = ''; }
        App.writer.quiz({
          onMistake: function () { App.writer.__m = (App.writer.__m || 0) + 1; },
          onComplete: function (sum) {
            var m = (sum && sum.totalMistakes) || App.writer.__m || 0;
            if (res) {
              res.textContent = m === 0 ? '一笔都没错，真棒！' : '写完了，错了 ' + m + ' 笔，再来一次？';
              res.classList.add('show');
            }
            A.play(m === 0 ? 'u01' : 'u02');
            setTimeout(function () { if (App.writer) App.writer.animateCharacter(); }, 1400);
          }
        });
      }
      else if (act === 'st-prev' && App.stroke.i > 0) { App.stroke.i--; render(); }
      else if (act === 'st-next' && App.stroke.i < App.stroke.list.length - 1) { App.stroke.i++; render(); }
      else if (act === 'opt') { choose(+t.getAttribute('data-i')); }
      else if (act === 'play') { A.play(t.getAttribute('data-key')); }
      else if (act === 'home') {
        App.screen = (App.mod === 'm3sym' || App.mod === 'm3blend') ? 'm3' : 'home';
        render();
      }
      else if (act === 'parent') { App.screen = 'parent'; render(); }
      else if (act === 'again') { start(App.mod, App.m3group); }
      else if (act === 'export') { doExport(); }
      else if (act === 'import') { var f = q('#f-import'); if (f) f.click(); }
      else if (act === 'reset') { doReset(); }
    });

    stage.addEventListener('change', function (e) {
      var id = e.target.id;
      if (id === 'sw-pinyin') {
        S.data.settings.pinyin = e.target.checked;
        S.save();
        A.play('u11');
      }
      if (id === 'sw-mute') {
        S.data.settings.muted = e.target.checked;
        A.muted = e.target.checked;
        S.save();
      }
      if (id === 'f-import' && e.target.files && e.target.files[0]) {
        var fr = new FileReader();
        fr.onload = function () {
          try { S.importJSON(fr.result); alert('导入成功'); App.screen = 'home'; render(); }
          catch (err) { alert('文件读不出来：' + err.message); }
        };
        fr.readAsText(e.target.files[0]);
      }
    });
  }

  function doExport() {
    var blob = new Blob([S.exportJSON()], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'ziya-' + S.today() + '.json';
    a.click();
  }

  function doReset() {
    if (!confirm('确定清空全部进度？此操作不可撤销。')) return;
    if (!confirm('再确认一次：孩子的 300 字掌握记录会全部消失。')) return;
    S.reset();
    App.screen = 'home';
    render();
  }

  /* ---------------- 启动 ---------------- */
  function boot() {
    stage = q('#stage');
    S.load();
    A.muted = !!S.data.settings.muted;
    Gen.init();
    if (PH) PH.init();
    bind();
    render();
    A.preload(['ui', 'g01']);
    if ('serviceWorker' in navigator && /^https?:/.test(location.protocol) &&
      !/^(127\.0\.0\.1|localhost)$/.test(location.hostname)) {
      navigator.serviceWorker.register('sw.js').catch(function () { });
    }
  }

  g.ZYApp = App;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(window);
