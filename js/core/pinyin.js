/* 拼音解析：把带声调的拼音拆成 {ini 声母, fin 韵母, tone 声调}。
   用于程序化生成「押韵 / 首音 / 声调」三类题目，无需人工出题。 */
(function (g) {
  var VOWEL = {
    'a': 'a', 'ā': 'a1', 'á': 'a2', 'ǎ': 'a3', 'à': 'a4',
    'e': 'e', 'ē': 'e1', 'é': 'e2', 'ě': 'e3', 'è': 'e4',
    'i': 'i', 'ī': 'i1', 'í': 'i2', 'ǐ': 'i3', 'ì': 'i4',
    'o': 'o', 'ō': 'o1', 'ó': 'o2', 'ǒ': 'o3', 'ò': 'o4',
    'u': 'u', 'ū': 'u1', 'ú': 'u2', 'ǔ': 'u3', 'ù': 'u4',
    'ü': 'v', 'ǖ': 'v1', 'ǘ': 'v2', 'ǚ': 'v3', 'ǜ': 'v4',
    'ń': 'n2', 'ň': 'n3', 'ǹ': 'n4', 'm̄': 'm1'
  };

  var TWO = ['zh', 'ch', 'sh'];
  var ONE = 'bpmfdtnlgkhjqxrzcsyw';

  var YA = { 'a': 'ia', 'an': 'ian', 'ang': 'iang', 'ao': 'iao', 'e': 'ie', 'ou': 'iou', 'in': 'in', 'ing': 'ing', 'ong': 'iong', 'u': 'v', 'ue': 've', 'uan': 'van', 'un': 'vn' };
  var WA = { 'a': 'ua', 'an': 'uan', 'ang': 'uang', 'ai': 'uai', 'ei': 'uei', 'en': 'uen', 'eng': 'ueng', 'u': 'u', 'o': 'uo' };

  function parse(py) {
    if (!py) return { ini: '', fin: '', tone: 0, py: '' };
    var tone = 0, base = '';
    for (var i = 0; i < py.length; i++) {
      var ch = py[i];
      var v = VOWEL[ch];
      if (v) {
        base += v[0];
        if (v.length > 1) tone = +v[1];
      } else {
        base += ch.toLowerCase();
      }
    }
    base = base.replace(/ü/g, 'v');

    var ini = '', fin = base;
    if (TWO.indexOf(base.slice(0, 2)) >= 0) { ini = base.slice(0, 2); fin = base.slice(2); }
    else if (ONE.indexOf(base[0]) >= 0) { ini = base[0]; fin = base.slice(1); }

    if (ini === 'y') { fin = YA[fin] !== undefined ? YA[fin] : fin; ini = ''; }
    else if (ini === 'w') { fin = WA[fin] !== undefined ? WA[fin] : fin; ini = ''; }
    else if (ini === 'j' || ini === 'q' || ini === 'x') { if (fin[0] === 'u') fin = 'v' + fin.slice(1); }

    return { ini: ini, fin: fin, tone: tone, py: py, base: base };
  }

  /* 押韵键：韵母去掉声调，ü 归一为 u（绿 lv 与 鱼 yu 同韵，符合儿歌语感） */
  function rhyme(p) { return parse(p).fin.replace(/v/g, 'u'); }

  /* 声调曲线：1 平 / 2 升 / 3 降升 / 4 降 */
  function toneShape(t) { return ({ 1: '平', 2: '升', 3: '降升', 4: '降' })[t] || '轻声'; }

  g.ZPinyin = { parse: parse, rhyme: rhyme, toneShape: toneShape };
})(window);
