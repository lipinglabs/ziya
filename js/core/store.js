/* 本地存档：localStorage + 导入导出。换设备不丢进度。
   两套数据完全隔离：正式进度 ziya.v1 / 试用沙盒 ziya.sandbox.v1。
   试用模式下所有写入只落在沙盒键上，不会污染孩子的真实学习数据。 */
(function (g) {
  var REAL = 'ziya.v1';
  var SAND = 'ziya.sandbox.v1';
  var MODE = 'ziya.mode';

  function blank() {
    return {
      v: 1,
      born: '2022-10-24',
      created: Date.now(),
      chars: {},
      days: {},
      appear: {},
      settings: { pinyin: false, muted: false, age: '4' },
      m2: { right: 0, wrong: 0, plays: 0 }
    };
  }

  var S = {
    data: null,
    sandbox: false,
    key: function () { return S.sandbox ? SAND : REAL; },
    boot: function () {
      try { S.sandbox = localStorage.getItem(MODE) === 'sandbox'; } catch (e) { S.sandbox = false; }
      return S.load();
    },
    load: function () {
      try {
        var raw = localStorage.getItem(S.key());
        S.data = raw ? JSON.parse(raw) : blank();
      } catch (e) { S.data = blank(); }
      if (!S.data.settings) S.data.settings = { pinyin: false, muted: false, age: '4' };
      if (!S.data.settings.age) S.data.settings.age = '4';
      if (!S.data.days) S.data.days = {};
      if (!S.data.chars) S.data.chars = {};
      if (!S.data.appear) S.data.appear = {};
      return S.data;
    },
    save: function () {
      try { localStorage.setItem(S.key(), JSON.stringify(S.data)); } catch (e) { }
    },
    setSandbox: function (on) {
      S.sandbox = !!on;
      try { localStorage.setItem(MODE, S.sandbox ? 'sandbox' : 'real'); } catch (e) { }
      S.load();
    },
    today: function () {
      var d = new Date();
      return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
    },
    addSeconds: function (sec) {
      var k = S.today();
      if (!S.data.days[k]) S.data.days[k] = { sec: 0, done: 0 };
      S.data.days[k].sec += sec;
    },
    addDone: function (n) {
      var k = S.today();
      if (!S.data.days[k]) S.data.days[k] = { sec: 0, done: 0 };
      S.data.days[k].done += (n || 1);
    },
    exportJSON: function () { return JSON.stringify(S.data, null, 2); },
    importJSON: function (txt) {
      var obj = JSON.parse(txt);
      if (!obj || !obj.chars) throw new Error('格式不对');
      S.data = obj;
      S.save();
    },
    reset: function () { S.data = blank(); S.save(); }
  };

  g.ZStore = S;
})(window);
