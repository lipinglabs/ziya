/* 音频层：按包懒加载 audio/gNN.js，包内是 base64 data URI。
   真机音色来自豆包语音（项目外生成），运行时零网络依赖。 */
(function (g) {
  var A = {
    bank: {},
    loaded: {},
    muted: false,
    cache: {},
    dur: {},
    loadPack: function (id) {
      if (A.loaded[id]) return A.loaded[id];
      A.loaded[id] = new Promise(function (resolve) {
        var s = document.createElement('script');
        s.src = 'audio/' + id + '.js';
        s.onload = function () { resolve(true); };
        s.onerror = function () { resolve(false); };
        document.head.appendChild(s);
      });
      return A.loaded[id];
    },
    preload: function (ids) {
      return Promise.all(ids.map(A.loadPack));
    },
    has: function (k) { return !!A.bank[k]; },
    /* 同步触发播放：必须在用户手势里调用，iOS 才允许出声 */
    play: function (k) {
      if (A.muted || !k) return null;
      var uri = A.bank[k];
      if (!uri) return null;
      A.stopExcept(k);          /* 单声道：新声音响起前先掐掉旧的，杜绝叠音 */
      try {
        var a = A.cache[k];
        if (!a) {
          a = new Audio(uri);
          A.cache[k] = a;
          a.addEventListener('loadedmetadata', function () {
            if (isFinite(a.duration)) A.dur[k] = a.duration;
          }, { once: true });
        }
        if (isFinite(a.duration) && a.duration > 0) A.dur[k] = a.duration;
        a.currentTime = 0;
        var p = a.play();
        if (p && p.catch) p.catch(function () { });
        return a;
      } catch (e) { return null; }
    },
    stop: function () {
      for (var k in A.cache) {
        try { A.cache[k].pause(); A.cache[k].currentTime = 0; } catch (e) { }
      }
    },
    stopExcept: function (keep) {
      for (var k in A.cache) {
        if (k === keep) continue;
        try {
          if (!A.cache[k].paused) { A.cache[k].pause(); A.cache[k].currentTime = 0; }
        } catch (e) { }
      }
    },
    /* 播完再回调：用于「鼓励语说完才进下一题」，避免压住题干 */
    playThen: function (k, cb) {
      var a = A.play(k);
      var done = false;
      function fin() {
        if (done) return;
        done = true;
        if (cb) cb();
      }
      if (!a) { setTimeout(fin, 120); return; }
      a.addEventListener('ended', fin, { once: true });
      var sec = (isFinite(a.duration) && a.duration > 0)
        ? a.duration
        : (A.dur[k] || 1.6);
      setTimeout(fin, sec * 1000 + 420);   /* 兜底：ended 不触发也不会卡住 */
    },
    /* 顺序播放一串音频，用于「先听题、再听三个选项」 */
    sequence: function (keys, gap, onEach, onDone) {
      var i = 0;
      function step() {
        if (i >= keys.length) { if (onDone) onDone(); return; }
        var k = keys[i++];
        if (onEach) onEach(k, i - 1);
        A.play(k);
        setTimeout(step, gap);
      }
      step();
    }
  };
  g.ZYAudio = A;
})(window);
