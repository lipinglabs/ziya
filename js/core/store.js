/* 本地存档：localStorage + 导入导出。换设备不丢进度。 */
(function (g) {
  var KEY = 'ziya.v1';

  function blank() {
    return {
      v: 1,
      born: '2022-10-24',
      created: Date.now(),
      chars: {},
      days: {},
      settings: { pinyin: false, muted: false, age: '4' },
      m2: { right: 0, wrong: 0, plays: 0 }
    };
  }

  var S = {
    data: null,
    load: function () {
      try {
        var raw = localStorage.getItem(KEY);
        S.data = raw ? JSON.parse(raw) : blank();
      } catch (e) { S.data = blank(); }
      if (!S.data.settings) S.data.settings = { pinyin: false, muted: false, age: '4' };
      if (!S.data.settings.age) S.data.settings.age = '4';
      if (!S.data.days) S.data.days = {};
      if (!S.data.chars) S.data.chars = {};
      return S.data;
    },
    save: function () {
      try { localStorage.setItem(KEY, JSON.stringify(S.data)); } catch (e) { }
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
