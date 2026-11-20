/* 字芽 · 主程序：状态、界面、交互。
   设计约束：4 岁，不识字也能玩；单次 12 分钟；错题不惩罚，只重听。 */
(function (g) {
  var D = g.ZIYA_DATA, S = g.ZStore, SRS = g.ZSRS, A = g.ZYAudio, Gen = g.ZYGen;
  var TIME_LIMIT = 12 * 60 * 1000;
  var stage = null;

  var App = {
    screen: 'home',
    mod: 'm1',
    qs: [], qi: 0, tries: 0, right: 0,
    locked: false, t0: 0, revealed: false,
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
      '<span class="sub">' + st.started + ' / 300 字 已开始</span></button>' +
      '<button class="big" data-act="go" data-mod="m2">' +
      '<span class="glyph">听</span><span class="lbl">听音游戏</span>' +
      '<span class="sub">押韵 · 声调 · 音节</span></button>' +
      '<div class="foot">' +
      '<span class="tiny">今天玩了 ' + Math.round(today.sec / 60) + ' 分钟</span>' +
      '<button class="ghost" data-act="parent">家长</button>' +
      '</div></section>';
  }

  /* ---------------- 题目 ---------------- */
  function cur() { return App.qs[App.qi]; }

  function viewPrompt(p) {
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
    var cls = 'opts n' + n + (qq.type === 'match' || qq.type === 'read' ? ' text' : '');
    var body = qq.options.map(function (o, i) {
      var inner;
      if (o.big) inner = '<span class="opt-char">' + o.label + '</span>';
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
    var prog = '';
    for (var i = 0; i < App.qs.length; i++) prog += '<b class="' + (i < App.qi ? 'done' : i === App.qi ? 'now' : '') + '"></b>';
    return '<section class="play"><div class="dots">' + prog + '</div>' +
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
      '<p class="tiny center">字芽 v0.1 · 300 字 · 本地存储</p>' +
      '</section>';
  }

  /* ---------------- 渲染 ---------------- */
  function render() {
    var body = App.screen === 'home' ? viewHome()
      : App.screen === 'play' ? viewPlay()
        : App.screen === 'done' ? viewDone() : viewParent();
    stage.innerHTML = body;
    document.body.setAttribute('data-screen', App.screen);
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
  function start(mod) {
    App.mod = mod;
    App.t0 = Date.now();
    App.qi = 0; App.right = 0; App.tries = 0; App.locked = false; App.log = [];
    App.qs = mod === 'm1'
      ? Gen.lessonM1(SRS.queue(8, 5), !!S.data.settings.pinyin)
      : Gen.lessonM2(8);
    if (!App.qs.length) { App.screen = 'home'; render(); return; }
    App.screen = 'play';
    render();
    A.preload(Gen.packsOf(App.qs)).then(function () {
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
    if (App.mod === 'm1') {
      App.log.forEach(function (r) { SRS.record(r.c, r.ok); });
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
      if (act === 'go') { start(t.getAttribute('data-mod')); }
      else if (act === 'opt') { choose(+t.getAttribute('data-i')); }
      else if (act === 'play') { A.play(t.getAttribute('data-key')); }
      else if (act === 'home') { App.screen = 'home'; render(); }
      else if (act === 'parent') { App.screen = 'parent'; render(); }
      else if (act === 'again') { start(App.mod); }
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
    bind();
    render();
    A.preload(['ui', 'g01']);
    if ('serviceWorker' in navigator && /^https?:/.test(location.protocol)) {
      navigator.serviceWorker.register('sw.js').catch(function () { });
    }
  }

  g.ZYApp = App;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(window);
