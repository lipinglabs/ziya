/* 间隔重复引擎：每个字独立的掌握度 0-5 级，1/3/7/15/30 天复习。
   答对升 1 级，答错降 1 级（不归零）。这是「长期有效」的关键，
   比通关制更能反映真实掌握情况。 */
(function (g) {
  var DAY = 86400000;
  var INTERVAL = { 0: 0, 1: 1, 2: 3, 3: 7, 4: 15, 5: 30 };

  var S = {
    get: function (ch) {
      var d = g.ZStore.data.chars;
      if (!d[ch]) d[ch] = { lvl: 0, due: 0, seen: 0, right: 0, wrong: 0, last: 0 };
      return d[ch];
    },
    record: function (ch, correct) {
      var r = S.get(ch);
      r.seen++;
      r.last = Date.now();
      if (correct) {
        r.right++;
        r.lvl = Math.min(5, r.lvl + 1);
      } else {
        r.wrong++;
        r.lvl = r.lvl <= 1 ? Math.max(r.lvl, 1) : r.lvl - 1;
      }
      r.due = Date.now() + INTERVAL[r.lvl] * DAY;
      return r;
    },
    /* 出现计数：只记「这个字被显示给孩子的次数」，与掌握度无关。
       前 10 次出现要给提示，第 11 次起撤掉。 */
    touch: function (ch) {
      var a = g.ZStore.data.appear || (g.ZStore.data.appear = {});
      a[ch] = (a[ch] || 0) + 1;
      return a[ch];
    },
    appears: function (ch) {
      var a = g.ZStore.data.appear;
      return a ? (a[ch] || 0) : 0;
    },
    hintCount: function () {
      var a = g.ZStore.data.appear || {}, n = 0;
      for (var k in a) if (a[k] <= 10) n++;
      return n;
    },
    dueList: function () {
      var out = [], now = Date.now(), d = g.ZStore.data.chars;
      for (var k in d) {
        if (d[k].lvl > 0 && d[k].due <= now) out.push(k);
      }
      return out;
    },
    newList: function () {
      var arr = g.ZIYA_DATA.items.filter(function (it) {
        var r = g.ZStore.data.chars[it.c];
        return !r || r.lvl === 0;
      });
      /* 先学有插图的字：具体名词先于抽象字，4 岁更容易建立「字—物」对应 */
      var hasImg = g.ZYGen && g.ZYGen.hasImg;
      if (hasImg) {
        arr = arr.slice().sort(function (a, b) {
          var d = (hasImg(a.c) ? 0 : 1) - (hasImg(b.c) ? 0 : 1);
          return d !== 0 ? d : a.i - b.i;
        });
      }
      return arr;
    },
    /* 今日建议队列：先复习到期，再补新字到 need 个 */
    queue: function (need, newCap) {
      var due = S.dueList();
      var fresh = S.newList();
      var pick = due.slice(0, need);
      var cap = Math.max(0, Math.min(newCap === undefined ? 5 : newCap, need - pick.length));
      pick = pick.concat(fresh.slice(0, cap).map(function (i) { return i.c; }));
      /* 还不够就继续从「新字表」里补 —— 新字表是「有图优先」排过序的，
         这样补进来的字也有图，不会突然冒出三个没图的抽象字。 */
      if (pick.length < need) {
        var more = fresh.filter(function (i) { return pick.indexOf(i.c) < 0; });
        pick = pick.concat(more.slice(0, need - pick.length).map(function (i) { return i.c; }));
      }
      /* 仍然不够就用已掌握但未到期的补，保证一关题目数固定 */
      if (pick.length < need) {
        var extra = g.ZIYA_DATA.items.filter(function (i) {
          var r = g.ZStore.data.chars[i.c];
          return r && r.lvl > 0 && pick.indexOf(i.c) < 0;
        }).map(function (i) { return i.c; });
        pick = pick.concat(extra.slice(0, need - pick.length));
      }
      if (pick.length < need) {
        var rest = g.ZIYA_DATA.items.map(function (i) { return i.c; }).filter(function (c) { return pick.indexOf(c) < 0; });
        pick = pick.concat(rest.slice(0, need - pick.length));
      }
      return pick;
    },
    stats: function () {
      var d = g.ZStore.data.chars, c = [0, 0, 0, 0, 0, 0], total = 0;
      for (var k in d) { c[d[k].lvl] = (c[d[k].lvl] || 0) + 1; total++; }
      return { dist: c, started: total, max: g.ZIYA_DATA.items.length };
    },
    mistakes: function (n) {
      var d = g.ZStore.data.chars, arr = [];
      for (var k in d) if (d[k].wrong > 0) arr.push({ c: k, w: d[k].wrong, lvl: d[k].lvl });
      arr.sort(function (a, b) { return b.w - a.w; });
      return arr.slice(0, n || 8);
    }
  };

  g.ZSRS = S;
})(window);
