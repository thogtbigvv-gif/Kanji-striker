'use strict';
/* js/data.js - kanji list and campaign structure (World -> Stage).
   Load this file FIRST. */

// ---------- Kanji data ----------
// Every entry keeps the two original fields (kanji, meaning) that the game uses.
// The extra learning fields are optional for the game and are read through js/kanji-info.js:
//   jlpt        - JLPT level (string)
//   onyomi      - on readings in katakana (array)
//   kunyomi     - kun readings in hiragana, okurigana in ( ) (array, may be empty)
//   vocabulary  - [{ word, reading, meaning }]   (2-3 common N5 words, meaning in Mongolian)
//   examples    - [{ sentence, reading, meaning }] (reading = hiragana, meaning = Mongolian)
var KANJI_LIST = [
  {
    kanji: '日', meaning: 'Нар', jlpt: 'N5',
    onyomi: ['ニチ', 'ジツ'], kunyomi: ['ひ', 'か'],
    vocabulary: [
      { word: '日曜日', reading: 'にちようび', meaning: 'Ням гараг' },
      { word: '毎日', reading: 'まいにち', meaning: 'Өдөр бүр' },
      { word: '誕生日', reading: 'たんじょうび', meaning: 'Төрсөн өдөр' }
    ],
    examples: [
      { sentence: '今日は何日ですか。', reading: 'きょうはなんにちですか。', meaning: 'Өнөөдөр хэдний өдөр вэ?' }
    ]
  },
  {
    kanji: '月', meaning: 'Сар', jlpt: 'N5',
    onyomi: ['ゲツ', 'ガツ'], kunyomi: ['つき'],
    vocabulary: [
      { word: '月曜日', reading: 'げつようび', meaning: 'Даваа гараг' },
      { word: '今月', reading: 'こんげつ', meaning: 'Энэ сар' },
      { word: '一月', reading: 'いちがつ', meaning: 'Нэгдүгээр сар' }
    ],
    examples: [
      { sentence: '今夜は月がきれいです。', reading: 'こんやはつきがきれいです。', meaning: 'Өнөө орой сар үзэсгэлэнтэй байна.' }
    ]
  },
  {
    kanji: '火', meaning: 'Гал', jlpt: 'N5',
    onyomi: ['カ'], kunyomi: ['ひ', 'ほ'],
    vocabulary: [
      { word: '火曜日', reading: 'かようび', meaning: 'Мягмар гараг' },
      { word: '火山', reading: 'かざん', meaning: 'Галт уул' },
      { word: '花火', reading: 'はなび', meaning: 'Салют' }
    ],
    examples: [
      { sentence: '火に気をつけてください。', reading: 'ひにきをつけてください。', meaning: 'Галд болгоомжтой байгаарай.' }
    ]
  },
  {
    kanji: '水', meaning: 'Ус', jlpt: 'N5',
    onyomi: ['スイ'], kunyomi: ['みず'],
    vocabulary: [
      { word: '水曜日', reading: 'すいようび', meaning: 'Лхагва гараг' },
      { word: '水道', reading: 'すいどう', meaning: 'Усны хоолой, ус хангамж' },
      { word: '水', reading: 'みず', meaning: 'Ус' }
    ],
    examples: [
      { sentence: '冷たい水を飲みます。', reading: 'つめたいみずをのみます。', meaning: 'Хүйтэн ус ууна.' }
    ]
  },
  {
    kanji: '木', meaning: 'Мод', jlpt: 'N5',
    onyomi: ['モク', 'ボク'], kunyomi: ['き', 'こ'],
    vocabulary: [
      { word: '木曜日', reading: 'もくようび', meaning: 'Пүрэв гараг' },
      { word: '木', reading: 'き', meaning: 'Мод' },
      { word: '木陰', reading: 'こかげ', meaning: 'Модны сүүдэр' }
    ],
    examples: [
      { sentence: '庭に木があります。', reading: 'にわにきがあります。', meaning: 'Хашаанд мод байна.' }
    ]
  },
  {
    kanji: '金', meaning: 'Алт', jlpt: 'N5',
    onyomi: ['キン', 'コン'], kunyomi: ['かね', 'かな'],
    vocabulary: [
      { word: '金曜日', reading: 'きんようび', meaning: 'Баасан гараг' },
      { word: 'お金', reading: 'おかね', meaning: 'Мөнгө' },
      { word: '金', reading: 'きん', meaning: 'Алт' }
    ],
    examples: [
      { sentence: 'お金がありません。', reading: 'おかねがありません。', meaning: 'Надад мөнгө алга.' }
    ]
  },
  {
    kanji: '土', meaning: 'Шороо', jlpt: 'N5',
    onyomi: ['ド', 'ト'], kunyomi: ['つち'],
    vocabulary: [
      { word: '土曜日', reading: 'どようび', meaning: 'Бямба гараг' },
      { word: '土', reading: 'つち', meaning: 'Шороо, хөрс' },
      { word: '土地', reading: 'とち', meaning: 'Газар, газар нутаг' }
    ],
    examples: [
      { sentence: '土曜日は休みです。', reading: 'どようびはやすみです。', meaning: 'Бямба гараг амралтын өдөр.' }
    ]
  },
  {
    kanji: '人', meaning: 'Хүн', jlpt: 'N5',
    onyomi: ['ジン', 'ニン'], kunyomi: ['ひと'],
    vocabulary: [
      { word: '日本人', reading: 'にほんじん', meaning: 'Япон хүн' },
      { word: '三人', reading: 'さんにん', meaning: 'Гурван хүн' },
      { word: '大人', reading: 'おとな', meaning: 'Насанд хүрэгч' }
    ],
    examples: [
      { sentence: 'あの人は先生です。', reading: 'あのひとはせんせいです。', meaning: 'Тэр хүн багш.' }
    ]
  },
  {
    kanji: '大', meaning: 'Том', jlpt: 'N5',
    onyomi: ['ダイ', 'タイ'], kunyomi: ['おお(きい)', 'おお'],
    vocabulary: [
      { word: '大学', reading: 'だいがく', meaning: 'Их сургууль' },
      { word: '大きい', reading: 'おおきい', meaning: 'Том' },
      { word: '大切', reading: 'たいせつ', meaning: 'Чухал, үнэтэй' }
    ],
    examples: [
      { sentence: '大きい犬がいます。', reading: 'おおきいいぬがいます。', meaning: 'Том нохой байна.' }
    ]
  },
  {
    kanji: '小', meaning: 'Жижиг', jlpt: 'N5',
    onyomi: ['ショウ'], kunyomi: ['ちい(さい)', 'こ', 'お'],
    vocabulary: [
      { word: '小さい', reading: 'ちいさい', meaning: 'Жижиг' },
      { word: '小学生', reading: 'しょうがくせい', meaning: 'Бага ангийн сурагч' },
      { word: '小鳥', reading: 'ことり', meaning: 'Жижиг шувуу' }
    ],
    examples: [
      { sentence: '小さい花が好きです。', reading: 'ちいさいはながすきです。', meaning: 'Би жижиг цэцэгт дуртай.' }
    ]
  },
  {
    kanji: '山', meaning: 'Уул', jlpt: 'N5',
    onyomi: ['サン'], kunyomi: ['やま'],
    vocabulary: [
      { word: '火山', reading: 'かざん', meaning: 'Галт уул' },
      { word: '山道', reading: 'やまみち', meaning: 'Уулын зам' },
      { word: '富士山', reading: 'ふじさん', meaning: 'Фүжи уул' }
    ],
    examples: [
      { sentence: '山に登ります。', reading: 'やまにのぼります。', meaning: 'Би ууланд авирна.' }
    ]
  },
  {
    kanji: '川', meaning: 'Гол', jlpt: 'N5',
    onyomi: ['セン'], kunyomi: ['かわ'],
    vocabulary: [
      { word: '川', reading: 'かわ', meaning: 'Гол' },
      { word: '小川', reading: 'おがわ', meaning: 'Жижиг горхи' },
      { word: '川岸', reading: 'かわぎし', meaning: 'Голын эрэг' }
    ],
    examples: [
      { sentence: '川で泳ぎます。', reading: 'かわでおよぎます。', meaning: 'Голд сэлнэ.' }
    ]
  },
  {
    kanji: '口', meaning: 'Ам', jlpt: 'N5',
    onyomi: ['コウ', 'ク'], kunyomi: ['くち'],
    vocabulary: [
      { word: '入口', reading: 'いりぐち', meaning: 'Орох хаалга' },
      { word: '出口', reading: 'でぐち', meaning: 'Гарах гарц' },
      { word: '人口', reading: 'じんこう', meaning: 'Хүн ам' }
    ],
    examples: [
      { sentence: '口を大きく開けてください。', reading: 'くちをおおきくあけてください。', meaning: 'Амаа том ангайгаарай.' }
    ]
  },
  {
    kanji: '目', meaning: 'Нүд', jlpt: 'N5',
    onyomi: ['モク'], kunyomi: ['め'],
    vocabulary: [
      { word: '目', reading: 'め', meaning: 'Нүд' },
      { word: '目薬', reading: 'めぐすり', meaning: 'Нүдний дусаалга' },
      { word: '目的', reading: 'もくてき', meaning: 'Зорилго' }
    ],
    examples: [
      { sentence: '目が痛いです。', reading: 'めがいたいです。', meaning: 'Нүд минь өвдөж байна.' }
    ]
  },
  {
    kanji: '手', meaning: 'Гар', jlpt: 'N5',
    onyomi: ['シュ'], kunyomi: ['て'],
    vocabulary: [
      { word: '上手', reading: 'じょうず', meaning: 'Чадварлаг, сайн' },
      { word: '手紙', reading: 'てがみ', meaning: 'Захидал' },
      { word: '歌手', reading: 'かしゅ', meaning: 'Дуучин' }
    ],
    examples: [
      { sentence: '彼は日本語が上手です。', reading: 'かれはにほんごがじょうずです。', meaning: 'Тэр япон хэлээр сайн ярьдаг.' }
    ]
  },
  {
    kanji: '足', meaning: 'Хөл', jlpt: 'N5',
    onyomi: ['ソク'], kunyomi: ['あし', 'た(りる)'],
    vocabulary: [
      { word: '足', reading: 'あし', meaning: 'Хөл' },
      { word: '遠足', reading: 'えんそく', meaning: 'Явган аялал' },
      { word: '足りる', reading: 'たりる', meaning: 'Хүрэлцэх' }
    ],
    examples: [
      { sentence: '時間が足りません。', reading: 'じかんがたりません。', meaning: 'Цаг хүрэхгүй байна.' }
    ]
  },
  {
    kanji: '耳', meaning: 'Чих', jlpt: 'N5',
    onyomi: ['ジ'], kunyomi: ['みみ'],
    vocabulary: [
      { word: '耳', reading: 'みみ', meaning: 'Чих' },
      { word: '右耳', reading: 'みぎみみ', meaning: 'Баруун чих' }
    ],
    examples: [
      { sentence: 'うさぎの耳は長いです。', reading: 'うさぎのみみはながいです。', meaning: 'Туулайн чих урт.' }
    ]
  },
  {
    kanji: '犬', meaning: 'Нохой', jlpt: 'N5',
    onyomi: ['ケン'], kunyomi: ['いぬ'],
    vocabulary: [
      { word: '犬', reading: 'いぬ', meaning: 'Нохой' },
      { word: '子犬', reading: 'こいぬ', meaning: 'Гөлөг' },
      { word: '番犬', reading: 'ばんけん', meaning: 'Манаач нохой' }
    ],
    examples: [
      { sentence: '私は犬が好きです。', reading: 'わたしはいぬがすきです。', meaning: 'Би нохойд дуртай.' }
    ]
  },
  {
    kanji: '雨', meaning: 'Бороо', jlpt: 'N5',
    onyomi: ['ウ'], kunyomi: ['あめ', 'あま'],
    vocabulary: [
      { word: '大雨', reading: 'おおあめ', meaning: 'Хүчтэй бороо' },
      { word: '雨', reading: 'あめ', meaning: 'Бороо' },
      { word: '雨具', reading: 'あまぐ', meaning: 'Борооны хэрэгсэл' }
    ],
    examples: [
      { sentence: '今日は雨です。', reading: 'きょうはあめです。', meaning: 'Өнөөдөр бороотой.' }
    ]
  },
  {
    kanji: '花', meaning: 'Цэцэг', jlpt: 'N5',
    onyomi: ['カ'], kunyomi: ['はな'],
    vocabulary: [
      { word: '花', reading: 'はな', meaning: 'Цэцэг' },
      { word: '花見', reading: 'はなみ', meaning: 'Цэцэг үзэх (сакура үзэх)' },
      { word: '花屋', reading: 'はなや', meaning: 'Цэцгийн дэлгүүр' }
    ],
    examples: [
      { sentence: '白い花が咲いています。', reading: 'しろいはながさいています。', meaning: 'Цагаан цэцэг дэлгэрч байна.' }
    ]
  },
  {
    kanji: '本', meaning: 'Ном', jlpt: 'N5',
    onyomi: ['ホン'], kunyomi: ['もと'],
    vocabulary: [
      { word: '本', reading: 'ほん', meaning: 'Ном' },
      { word: '日本', reading: 'にほん', meaning: 'Япон' },
      { word: '本屋', reading: 'ほんや', meaning: 'Номын дэлгүүр' }
    ],
    examples: [
      { sentence: '本を読みます。', reading: 'ほんをよみます。', meaning: 'Ном уншина.' }
    ]
  },
  {
    kanji: '車', meaning: 'Машин', jlpt: 'N5',
    onyomi: ['シャ'], kunyomi: ['くるま'],
    vocabulary: [
      { word: '車', reading: 'くるま', meaning: 'Машин' },
      { word: '電車', reading: 'でんしゃ', meaning: 'Цахилгаан галт тэрэг' },
      { word: '自転車', reading: 'じてんしゃ', meaning: 'Дугуй' }
    ],
    examples: [
      { sentence: '電車で学校へ行きます。', reading: 'でんしゃでがっこうへいきます。', meaning: 'Галт тэргээр сургуульд явдаг.' }
    ]
  },
  {
    kanji: '王', meaning: 'Хаан', jlpt: 'N5',
    onyomi: ['オウ'], kunyomi: [],
    vocabulary: [
      { word: '王様', reading: 'おうさま', meaning: 'Хаан' },
      { word: '女王', reading: 'じょおう', meaning: 'Хатан хаан' },
      { word: '王子', reading: 'おうじ', meaning: 'Хунтайж' }
    ],
    examples: [
      { sentence: '王様は優しいです。', reading: 'おうさまはやさしいです。', meaning: 'Хаан эелдэг сайхан хүн.' }
    ]
  },
  {
    kanji: '女', meaning: 'Эмэгтэй', jlpt: 'N5',
    onyomi: ['ジョ', 'ニョ', 'ニョウ'], kunyomi: ['おんな', 'め'],
    vocabulary: [
      { word: '女の子', reading: 'おんなのこ', meaning: 'Охин' },
      { word: '彼女', reading: 'かのじょ', meaning: 'Тэр эмэгтэй; найз охин' },
      { word: '女性', reading: 'じょせい', meaning: 'Эмэгтэй хүн' }
    ],
    examples: [
      { sentence: '女の子が歌っています。', reading: 'おんなのこがうたっています。', meaning: 'Охин дуулж байна.' }
    ]
  },
  {
    kanji: '男', meaning: 'Эрэгтэй', jlpt: 'N5',
    onyomi: ['ダン', 'ナン'], kunyomi: ['おとこ'],
    vocabulary: [
      { word: '男の子', reading: 'おとこのこ', meaning: 'Хөвгүүн' },
      { word: '男性', reading: 'だんせい', meaning: 'Эрэгтэй хүн' },
      { word: '男', reading: 'おとこ', meaning: 'Эрэгтэй хүн' }
    ],
    examples: [
      { sentence: '男の子が走っています。', reading: 'おとこのこがはしっています。', meaning: 'Хөвгүүн гүйж байна.' }
    ]
  },
  {
    kanji: '子', meaning: 'Хүүхэд', jlpt: 'N5',
    onyomi: ['シ', 'ス'], kunyomi: ['こ'],
    vocabulary: [
      { word: '子供', reading: 'こども', meaning: 'Хүүхэд' },
      { word: '親子', reading: 'おやこ', meaning: 'Эцэг эх ба хүүхэд' },
      { word: '帽子', reading: 'ぼうし', meaning: 'Малгай' }
    ],
    examples: [
      { sentence: '子供が公園で遊んでいます。', reading: 'こどもがこうえんであそんでいます。', meaning: 'Хүүхдүүд цэцэрлэгт хүрээлэнд тоглож байна.' }
    ]
  },
  {
    kanji: '天', meaning: 'Тэнгэр', jlpt: 'N5',
    onyomi: ['テン'], kunyomi: ['あめ', 'あま'],
    vocabulary: [
      { word: '天気', reading: 'てんき', meaning: 'Цаг агаар' },
      { word: '天の川', reading: 'あまのがわ', meaning: 'Сүүн зам' },
      { word: '天才', reading: 'てんさい', meaning: 'Суутан' }
    ],
    examples: [
      { sentence: '今日は天気がいいです。', reading: 'きょうはてんきがいいです。', meaning: 'Өнөөдөр цаг агаар сайхан байна.' }
    ]
  },
  {
    kanji: '上', meaning: 'Дээр', jlpt: 'N5',
    onyomi: ['ジョウ', 'ショウ'], kunyomi: ['うえ', 'あ(がる)', 'のぼ(る)'],
    vocabulary: [
      { word: '上着', reading: 'うわぎ', meaning: 'Гадуур хувцас' },
      { word: '上がる', reading: 'あがる', meaning: 'Дээшлэх, өгсөх' },
      { word: '上手', reading: 'じょうず', meaning: 'Чадварлаг, сайн' }
    ],
    examples: [
      { sentence: '机の上に本があります。', reading: 'つくえのうえにほんがあります。', meaning: 'Ширээн дээр ном байна.' }
    ]
  },
  {
    kanji: '下', meaning: 'Доор', jlpt: 'N5',
    onyomi: ['カ', 'ゲ'], kunyomi: ['した', 'さ(げる)', 'くだ(さる)'],
    vocabulary: [
      { word: '地下鉄', reading: 'ちかてつ', meaning: 'Метро' },
      { word: '下手', reading: 'へた', meaning: 'Муу, чадваргүй' },
      { word: '下さい', reading: 'ください', meaning: 'Өгөөч, гуйя' }
    ],
    examples: [
      { sentence: '机の下に猫がいます。', reading: 'つくえのしたにねこがいます。', meaning: 'Ширээний доор муур байна.' }
    ]
  },
  {
    kanji: '中', meaning: 'Дунд', jlpt: 'N5',
    onyomi: ['チュウ', 'ジュウ'], kunyomi: ['なか'],
    vocabulary: [
      { word: '中国', reading: 'ちゅうごく', meaning: 'Хятад' },
      { word: '一日中', reading: 'いちにちじゅう', meaning: 'Өдөржин' },
      { word: '中学校', reading: 'ちゅうがっこう', meaning: 'Дунд сургууль' }
    ],
    examples: [
      { sentence: 'かばんの中にペンがあります。', reading: 'かばんのなかにペンがあります。', meaning: 'Цүнхэнд үзэг байна.' }
    ]
  },
  {
    kanji: '白', meaning: 'Цагаан', jlpt: 'N5',
    onyomi: ['ハク', 'ビャク'], kunyomi: ['しろ', 'しろ(い)'],
    vocabulary: [
      { word: '白い', reading: 'しろい', meaning: 'Цагаан' },
      { word: '白鳥', reading: 'はくちょう', meaning: 'Хун шувуу' },
      { word: '白紙', reading: 'はくし', meaning: 'Цагаан цаас' }
    ],
    examples: [
      { sentence: 'この紙は白いです。', reading: 'このかみはしろいです。', meaning: 'Энэ цаас цагаан.' }
    ]
  },
  {
    kanji: '力', meaning: 'Хүч', jlpt: 'N5',
    onyomi: ['リョク', 'リキ'], kunyomi: ['ちから'],
    vocabulary: [
      { word: '力', reading: 'ちから', meaning: 'Хүч' },
      { word: '体力', reading: 'たいりょく', meaning: 'Биеийн хүч' },
      { word: '力持ち', reading: 'ちからもち', meaning: 'Хүчтэй хүн' }
    ],
    examples: [
      { sentence: '彼は力が強いです。', reading: 'かれはちからがつよいです。', meaning: 'Тэр хүчтэй.' }
    ]
  },
  {
    kanji: '入', meaning: 'Орох', jlpt: 'N5',
    onyomi: ['ニュウ'], kunyomi: ['い(る)', 'い(れる)', 'はい(る)'],
    vocabulary: [
      { word: '入る', reading: 'はいる', meaning: 'Орох' },
      { word: '入口', reading: 'いりぐち', meaning: 'Орох хаалга' },
      { word: '入学', reading: 'にゅうがく', meaning: 'Сургуульд элсэх' }
    ],
    examples: [
      { sentence: '部屋に入ります。', reading: 'へやにはいります。', meaning: 'Өрөөнд орно.' }
    ]
  },
  {
    kanji: '出', meaning: 'Гарах', jlpt: 'N5',
    onyomi: ['シュツ', 'スイ'], kunyomi: ['で(る)', 'だ(す)'],
    vocabulary: [
      { word: '出る', reading: 'でる', meaning: 'Гарах' },
      { word: '出口', reading: 'でぐち', meaning: 'Гарах гарц' },
      { word: '出発', reading: 'しゅっぱつ', meaning: 'Хөдлөх, явах' }
    ],
    examples: [
      { sentence: '七時に家を出ます。', reading: 'しちじにいえをでます。', meaning: 'Долоон цагт гэрээсээ гарна.' }
    ]
  },
  {
    kanji: '見', meaning: 'Харах', jlpt: 'N5',
    onyomi: ['ケン'], kunyomi: ['み(る)', 'み(える)', 'み(せる)'],
    vocabulary: [
      { word: '見る', reading: 'みる', meaning: 'Харах' },
      { word: '花見', reading: 'はなみ', meaning: 'Цэцэг үзэх (сакура үзэх)' },
      { word: '見物', reading: 'けんぶつ', meaning: 'Үзвэр үзэх, үзэж сонирхох' }
    ],
    examples: [
      { sentence: '毎晩テレビを見ます。', reading: 'まいばんテレビをみます。', meaning: 'Орой болгон телевиз үздэг.' }
    ]
  },
  {
    kanji: '食', meaning: 'Идэх', jlpt: 'N5',
    onyomi: ['ショク'], kunyomi: ['た(べる)', 'く(う)'],
    vocabulary: [
      { word: '食べる', reading: 'たべる', meaning: 'Идэх' },
      { word: '食事', reading: 'しょくじ', meaning: 'Хоол' },
      { word: '食堂', reading: 'しょくどう', meaning: 'Хоолны газар' }
    ],
    examples: [
      { sentence: '朝ごはんを食べます。', reading: 'あさごはんをたべます。', meaning: 'Өглөөний хоолоо иднэ.' }
    ]
  },
  {
    kanji: '飲', meaning: 'Уух', jlpt: 'N5',
    onyomi: ['イン'], kunyomi: ['の(む)'],
    vocabulary: [
      { word: '飲む', reading: 'のむ', meaning: 'Уух' },
      { word: '飲み物', reading: 'のみもの', meaning: 'Ундаа' },
      { word: '飲食', reading: 'いんしょく', meaning: 'Хоол ундны зүйл' }
    ],
    examples: [
      { sentence: '毎朝お茶を飲みます。', reading: 'まいあさおちゃをのみます。', meaning: 'Өглөө болгон цай уудаг.' }
    ]
  },
  {
    kanji: '行', meaning: 'Явах', jlpt: 'N5',
    onyomi: ['コウ', 'ギョウ'], kunyomi: ['い(く)', 'ゆ(く)', 'おこな(う)'],
    vocabulary: [
      { word: '行く', reading: 'いく', meaning: 'Явах' },
      { word: '銀行', reading: 'ぎんこう', meaning: 'Банк' },
      { word: '旅行', reading: 'りょこう', meaning: 'Аялал' }
    ],
    examples: [
      { sentence: '明日、銀行へ行きます。', reading: 'あした、ぎんこうへいきます。', meaning: 'Маргааш банк руу явна.' }
    ]
  },
  {
    kanji: '休', meaning: 'Амрах', jlpt: 'N5',
    onyomi: ['キュウ'], kunyomi: ['やす(む)'],
    vocabulary: [
      { word: '休む', reading: 'やすむ', meaning: 'Амрах' },
      { word: '休み', reading: 'やすみ', meaning: 'Амралт' },
      { word: '夏休み', reading: 'なつやすみ', meaning: 'Зуны амралт' }
    ],
    examples: [
      { sentence: '少し休みましょう。', reading: 'すこしやすみましょう。', meaning: 'Жаахан амарцгаая.' }
    ]
  },
  {
    kanji: '立', meaning: 'Зогсох', jlpt: 'N5',
    onyomi: ['リツ', 'リュウ'], kunyomi: ['た(つ)', 'た(てる)'],
    vocabulary: [
      { word: '立つ', reading: 'たつ', meaning: 'Зогсох' },
      { word: '国立', reading: 'こくりつ', meaning: 'Улсын, төрийн' },
      { word: '立派', reading: 'りっぱ', meaning: 'Гайхамшигтай, сайхан' }
    ],
    examples: [
      { sentence: 'ここに立ってください。', reading: 'ここにたってください。', meaning: 'Энд зогсоорой.' }
    ]
  }
];
var KANJI_BY_CHAR = {}; // kanji character -> its entry in KANJI_LIST (used to load a stage's kanji)
(function () {
  for (var i = 0; i < KANJI_LIST.length; i++) {
    KANJI_BY_CHAR[KANJI_LIST[i].kanji] = KANJI_LIST[i];
  }
})();
var MASTERED_HITS = 3;

// ---------- Campaign data: Galaxy -> World -> Stage ----------
// Progress is saved by stage id, so the stage lists below can be changed
// later without breaking saved data.
var CAMPAIGN_VERSION = 1;
var STAGES_PER_WORLD = 5;

var WORLD_DEFS = [
  { id: 1, name: 'Beginner Galaxy', jlpt: 'N5' },
  { id: 2, name: 'Rising Galaxy', jlpt: 'N4' },
  { id: 3, name: 'Advanced Galaxy', jlpt: 'N3' },
  { id: 4, name: 'Elite Galaxy', jlpt: 'N2' },
  { id: 5, name: 'Master Galaxy', jlpt: 'N1' }
];

// The same five-stage template is used for every world
var STAGE_DEFS = [
  { kind: 'learn', name: 'New Kanji' },
  { kind: 'review', name: 'Review Run' },
  { kind: 'waves', name: 'Big Waves' },
  { kind: 'challenge', name: 'Hard Fight' },
  { kind: 'boss', name: 'Boss Gate' }
];

// Kanji available for each world. Only World 1 has data so far (the current kanji list).
// Other worlds stay empty until verified kanji data is added; they are marked "not ready".
var WORLD_KANJI = { 1: KANJI_LIST.map(function (item) { return item.kanji; }) };

var CAMPAIGN_WORLDS = [];
var CAMPAIGN_STAGES = {}; // stage id -> stage
var CAMPAIGN_ORDER = [];  // stage ids in play order

function buildCampaign() {
  for (var w = 0; w < WORLD_DEFS.length; w++) {
    var def = WORLD_DEFS[w];
    var pool = WORLD_KANJI[def.id] || [];
    var perStage = Math.ceil(pool.length / (STAGES_PER_WORLD - 1));
    var seen = [];
    var stages = [];

    for (var s = 0; s < STAGES_PER_WORLD; s++) {
      var template = STAGE_DEFS[s];
      var isBoss = template.kind === 'boss';
      var fresh = isBoss ? [] : pool.slice(s * perStage, (s + 1) * perStage);
      var stage = {
        id: 'w' + def.id + '-s' + (s + 1),
        worldId: def.id,
        number: s + 1,
        kind: template.kind,
        name: template.name,
        boss: isBoss,
        ready: pool.length > 0,
        kanji: fresh,        // new kanji introduced in this stage
        review: seen.slice() // kanji from earlier stages of the same world
      };
      stages.push(stage);
      CAMPAIGN_STAGES[stage.id] = stage;
      CAMPAIGN_ORDER.push(stage.id);
      seen = seen.concat(fresh);
    }

    CAMPAIGN_WORLDS.push({
      id: def.id,
      name: def.name,
      jlpt: def.jlpt,
      ready: pool.length > 0,
      stages: stages
    });
  }
}
buildCampaign();
