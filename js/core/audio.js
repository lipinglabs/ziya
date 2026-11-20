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
      for (var k in A.cache) { try { A.cache[k].pause(); } catch (e) { } }
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
