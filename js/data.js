'use strict';
/* js/data.js - kanji list and campaign structure (World -> Stage).
   Load this file FIRST. */

// ---------- Kanji data (kanji + Mongolian meaning) ----------
var KANJI_LIST = [
  { kanji: '日', meaning: 'Нар' },
  { kanji: '月', meaning: 'Сар' },
  { kanji: '火', meaning: 'Гал' },
  { kanji: '水', meaning: 'Ус' },
  { kanji: '木', meaning: 'Мод' },
  { kanji: '金', meaning: 'Алт' },
  { kanji: '土', meaning: 'Шороо' },
  { kanji: '人', meaning: 'Хүн' },
  { kanji: '大', meaning: 'Том' },
  { kanji: '小', meaning: 'Жижиг' },
  { kanji: '山', meaning: 'Уул' },
  { kanji: '川', meaning: 'Гол' },
  { kanji: '口', meaning: 'Ам' },
  { kanji: '目', meaning: 'Нүд' },
  { kanji: '手', meaning: 'Гар' },
  { kanji: '足', meaning: 'Хөл' },
  { kanji: '耳', meaning: 'Чих' },
  { kanji: '犬', meaning: 'Нохой' },
  { kanji: '雨', meaning: 'Бороо' },
  { kanji: '花', meaning: 'Цэцэг' },
  { kanji: '本', meaning: 'Ном' },
  { kanji: '車', meaning: 'Машин' },
  { kanji: '王', meaning: 'Хаан' },
  { kanji: '女', meaning: 'Эмэгтэй' },
  { kanji: '男', meaning: 'Эрэгтэй' },
  { kanji: '子', meaning: 'Хүүхэд' },
  { kanji: '天', meaning: 'Тэнгэр' },
  { kanji: '上', meaning: 'Дээр' },
  { kanji: '下', meaning: 'Доор' },
  { kanji: '中', meaning: 'Дунд' },
  { kanji: '白', meaning: 'Цагаан' },
  { kanji: '力', meaning: 'Хүч' },
  { kanji: '入', meaning: 'Орох' },
  { kanji: '出', meaning: 'Гарах' },
  { kanji: '見', meaning: 'Харах' },
  { kanji: '食', meaning: 'Идэх' },
  { kanji: '飲', meaning: 'Уух' },
  { kanji: '行', meaning: 'Явах' },
  { kanji: '休', meaning: 'Амрах' },
  { kanji: '立', meaning: 'Зогсох' }
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
