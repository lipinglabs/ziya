/* 笔顺数据按主题组懒加载（strokes/gNN.js），与音频包同构。 */
(function (g) {
  var S = {
    loaded: {},
    load: function (id) {
      if (S.loaded[id]) return S.loaded[id];
      S.loaded[id] = new Promise(function (resolve) {
        var s = document.createElement('script');
        s.src = 'strokes/' + id + '.js';
        s.onload = function () { resolve(true); };
        s.onerror = function () { resolve(false); };
        document.head.appendChild(s);
      });
      return S.loaded[id];
    },
    has: function (ch) { return !!(g.ZY_STROKES && g.ZY_STROKES[ch]); }
  };
  g.ZStroke = S;
})(window);
