/* 拼音符号表：63 个（6 单韵母 + 23 声母 + 9 复韵母 + 9 鼻韵母 + 16 整体认读）。
   t 字段是「喂给 TTS 的汉字」而非符号本身 —— 直接读字母会读成英文字母名，
   必须用呼读音汉字（b→玻、zh→知、ai→哀）才能得到正确的教学音。 */
(function (g) {
  var RAW = [
    /* 单韵母 6 */
    ['dan', 'a', '啊', 'a'],
    ['dan', 'o', '喔', 'o'],
    ['dan', 'e', '鹅', 'e'],
    ['dan', 'i', '衣', 'i'],
    ['dan', 'u', '乌', 'u'],
    ['dan', 'ü', '鱼', 'yu'],
    /* 声母 23 */
    ['sheng', 'b', '玻', 'bo'],
    ['sheng', 'p', '坡', 'po'],
    ['sheng', 'm', '摸', 'mo'],
    ['sheng', 'f', '佛', 'fo'],
    ['sheng', 'd', '得', 'de'],
    ['sheng', 't', '特', 'te'],
    ['sheng', 'n', '讷', 'ne'],
    ['sheng', 'l', '勒', 'le'],
    ['sheng', 'g', '哥', 'ge'],
    ['sheng', 'k', '科', 'ke'],
    ['sheng', 'h', '喝', 'he'],
    ['sheng', 'j', '基', 'ji'],
    ['sheng', 'q', '欺', 'qi'],
    ['sheng', 'x', '希', 'xi'],
    ['sheng', 'zh', '知', 'zhi'],
    ['sheng', 'ch', '吃', 'chi'],
    ['sheng', 'sh', '诗', 'shi'],
    ['sheng', 'r', '日', 'ri'],
    ['sheng', 'z', '资', 'zi'],
    ['sheng', 'c', '呲', 'ci'],
    ['sheng', 's', '思', 'si'],
    ['sheng', 'y', '衣', 'yi'],
    ['sheng', 'w', '乌', 'wu'],
    /* 复韵母 9 */
    ['fu', 'ai', '哀', 'ai'],
    ['fu', 'ei', '诶', 'ei'],
    ['fu', 'ui', '威', 'wei'],
    ['fu', 'ao', '熬', 'ao'],
    ['fu', 'ou', '欧', 'ou'],
    ['fu', 'iu', '优', 'you'],
    ['fu', 'ie', '耶', 'ye'],
    ['fu', 'üe', '月', 'yue'],
    ['fu', 'er', '儿', 'er'],
    /* 鼻韵母 9 */
    ['bi', 'an', '安', 'an'],
    ['bi', 'en', '恩', 'en'],
    ['bi', 'in', '因', 'yin'],
    ['bi', 'un', '温', 'wen'],
    ['bi', 'ün', '晕', 'yun'],
    ['bi', 'ang', '昂', 'ang'],
    ['bi', 'eng', '鞥', 'eng'],
    ['bi', 'ing', '英', 'ying'],
    ['bi', 'ong', '翁', 'weng'],
    /* 整体认读 16 */
    ['zheng', 'zhi', '知', 'zhi'],
    ['zheng', 'chi', '吃', 'chi'],
    ['zheng', 'shi', '诗', 'shi'],
    ['zheng', 'ri', '日', 'ri'],
    ['zheng', 'zi', '资', 'zi'],
    ['zheng', 'ci', '呲', 'ci'],
    ['zheng', 'si', '思', 'si'],
    ['zheng', 'yi', '衣', 'yi'],
    ['zheng', 'wu', '乌', 'wu'],
    ['zheng', 'yu', '鱼', 'yu'],
    ['zheng', 'ye', '耶', 'ye'],
    ['zheng', 'yue', '月', 'yue'],
    ['zheng', 'yuan', '圆', 'yuan'],
    ['zheng', 'yin', '因', 'yin'],
    ['zheng', 'yun', '云', 'yun'],
    ['zheng', 'ying', '鹰', 'ying']
  ];

  var GROUP_NAME = { dan: '单韵母', sheng: '声母', fu: '复韵母', bi: '鼻韵母', zheng: '整体认读' };
  var LIST = RAW.map(function (r, i) {
    return { k: 'p' + (i < 9 ? '0' : '') + (i + 1), g: r[0], s: r[1], t: r[2], tts: r[3], i: i };
  });

  var BY = {};
  LIST.forEach(function (x) { BY[x.s] = x; });

  g.ZPY = {
    list: LIST,
    bySymbol: function (s) { return BY[s]; },
    groupName: function (gid) { return GROUP_NAME[gid] || gid; },
    groups: ['dan', 'sheng', 'fu', 'bi', 'zheng'],
    inGroup: function (gid) { return LIST.filter(function (x) { return x.g === gid; }); }
  };
})(window);
