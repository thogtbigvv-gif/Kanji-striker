/* KANJI STRIKER - Phase 01 (core gameplay optimization)
   Kanji collection, saved progress, settings, sound effects and learning messages.
   Phase 01: smooth pointer control, delta-time shooting, one correct target per question,
   safe collisions, gradual difficulty, stable game states and responsive canvas.
   Campaign foundation: World/Stage data and saved campaign progress (data only, no screens yet).
   Stage Wave System: a stage is played as 4 waves (Introduction, Formation Attack, Mixed Attack,
   Final Wave). When the last wave is cleared the game enters STATE_STAGE_COMPLETE (no saving yet).
   Mechanics fixes: the fire cooldown now survives lifting the finger (no tap-spam), a missed
   correct target is brought back (rescue ship) so a wave cannot end without it, and the next group
   comes quickly when the screen is empty. */

(function () {
  'use strict';

  // ---------- Page elements ----------
  var appFooter = document.getElementById('appFooter');
  var mainMenuSection = document.getElementById('mainMenuSection');
  var gameSection = document.getElementById('gameSection');

  var startGameButton = document.getElementById('startGameButton');
  var kanjiCollectionButton = document.getElementById('kanjiCollectionButton');
  var settingsButton = document.getElementById('settingsButton');
  var pauseButton = document.getElementById('pauseButton');
  var backToMenuButton = document.getElementById('backToMenuButton');

  var collectionSection = document.getElementById('collectionSection');
  var collectionSummary = document.getElementById('collectionSummary');
  var collectionGrid = document.getElementById('collectionGrid');
  var collectionBackButton = document.getElementById('collectionBackButton');

  var settingsSection = document.getElementById('settingsSection');
  var soundToggleButton = document.getElementById('soundToggleButton');
  var resetProgressButton = document.getElementById('resetProgressButton');
  var settingsMessage = document.getElementById('settingsMessage');
  var settingsBackButton = document.getElementById('settingsBackButton');

  var hpDisplay = document.getElementById('hpDisplay');
  var scoreDisplay = document.getElementById('scoreDisplay');
  var comboDisplay = document.getElementById('comboDisplay');

  var canvas = document.getElementById('gameCanvas');
  var ctx = canvas.getContext('2d');

  // ---------- Game state ----------
  var STATE_MENU = 'MENU';
  var STATE_PLAYING = 'PLAYING';
  var STATE_PAUSED = 'PAUSED';
  var STATE_GAME_OVER = 'GAME_OVER';
  var STATE_STAGE_COMPLETE = 'STAGE_COMPLETE'; // every wave of the stage was cleared

  var currentState = STATE_MENU;
  var animationFrameId = null;
  var lastTime = 0;
  var totalTime = 0;
  var questionSerial = 0; // changes for every new question, so old enemies can never match a new one
  var answered = 0;       // correct answers in this run

  var viewWidth = 0;
  var viewHeight = 0;

  var hp = 100;
  var score = 0;
  var combo = 0;

  var player = {
    x: 0,
    y: 0,
    targetX: 0,
    isDragging: false,
    pointerId: null,
    dragPointerX: 0, // finger position when the touch started (relative control)
    dragShipX: 0,    // ship target position when the touch started (relative control)
    lastFingerX: 0,  // last finger position (used to measure the finger speed)
    moveAccum: 0,    // finger distance moved since the last frame (pixels)
    fingerSpeed: 0,  // smoothed finger speed (pixels per second)
    fireHeld: false  // true while shooting is allowed (finger down and not moving fast)
  };

  var stars = [];

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

  // Gameplay tuning
  var FIRE_INTERVAL = 0.2;   // seconds between shots
  var BULLET_SPEED = 560;    // pixels per second
  var BULLET_HIT_PADDING = 3; // extra pixels on each side of an enemy where a bullet still counts as a hit
  var PLAYER_FOLLOW = 16;    // how fast the ship follows the finger (per second)
  var RELATIVE_CONTROL = true;   // true: the ship moves by how far the finger moved (finger can be anywhere)
                                 // false: the ship goes to the exact spot where the finger is
  // Fire control: the ship shoots while the finger is down AND moving slowly. A fast swipe (dodging)
  // pauses shooting, so a wrong kanji can be avoided without lifting the finger.
  var FIRE_STOP_SPEED = 240;      // finger speed (pixels per second) above which shooting pauses
  var FIRE_START_SPEED = 150;     // finger speed below which shooting starts again (lower than STOP, so it does not flicker)
  var FIRE_SPEED_SMOOTHING = 18;  // how quickly the measured finger speed reacts (higher = faster)
  var CONTROL_SENSITIVITY = 1.2; // relative control only: 1 = ship moves as far as the finger, 1.2 = a bit more
  // Weapon power-up: the ship shoots more bullets side by side while the combo is high.
  // Any damage resets the combo, so it also drops the weapon back to a single shot.
  var DOUBLE_SHOT_COMBO = 5;  // combo needed for 2 bullets
  var TRIPLE_SHOT_COMBO = 10; // combo needed for 3 bullets
  var BULLET_SPREAD = 7;      // pixels between bullets that are fired side by side

  // Smart questions: kanji the player struggles with are asked and shown more often,
  // new kanji sooner, and well-known kanji less often.
  var WEIGHT_PER_STRUGGLE = 0.8; // extra chance for each time (misses - hits) the player got a kanji wrong
  var MAX_STRUGGLE = 5;          // limit of that bonus, so one hard kanji cannot take over the game
  var NEW_KANJI_WEIGHT = 2;      // a kanji the player has never seen yet
  var MASTERED_WEIGHT = 0.5;     // a kanji answered correctly many times without trouble

  // Score / HP balance
  var MAX_HP = 100;
  var MAX_SCORE_MULTIPLIER = 5; // points = 10 x min(combo, this), so a long streak cannot make the score explode
  var COMBO_HEAL_EVERY = 5;     // every this many correct answers in a row heal the ship
  var HEAL_AMOUNT = 5;          // HP restored by one streak reward (never above MAX_HP)
  var WRONG_HIT_DAMAGE = 10;    // shooting a wrong kanji
  var TARGET_ESCAPE_DAMAGE = 10; // the correct kanji reached the bottom
  var TARGET_CRASH_DAMAGE = 15;  // the correct kanji crashed into the ship
  var DECOY_CRASH_DAMAGE = 15;   // a wrong kanji crashed into the ship
  var REF_HEIGHT = 640;      // screen height the enemy speed is tuned for
  var MAX_DPR = 3;           // limits canvas size on very dense Android screens

  var question = KANJI_LIST[0];
  var questionPool = KANJI_LIST; // kanji that can become the question (replaced by the stage's own kanji)
  var decoyPool = KANJI_LIST;    // kanji that can appear as wrong answers (stage kanji + its review kanji)
  var enemies = [];
  var bullets = [];
  var particles = [];
  var fireTimer = 0;
  var damageFlash = 0;
  var gameOverAt = 0;
  var bestScore = 0;
  var newBest = false;
  var toast = { text: '', color: '#ffffff', time: 0 };
  var progress = {};
  var campaign = null;          // saved campaign progress (see Campaign section)
  var campaignReadOnly = false; // true if the saved campaign data comes from a newer version
  var soundEnabled = true;
  var audioContext = null;

  var ENEMY_WIDTH = 44;
  var ENEMY_HEIGHT = 54;
  var BANNER_HEIGHT = 48;
  var KANJI_VISIBLE_Y = 12; // an enemy can be hit only after its kanji is below the question banner
  var KANJI_FONT = '"Hiragino Sans", "Yu Gothic", "Noto Sans JP", "Noto Sans CJK JP", "MS Gothic", sans-serif';

  // ---------- Pixel ship drawing ----------
  var PIXEL = 3;
  var SHIP_COLORS = {
    R: '#e0123c',
    D: '#8a0a26',
    C: '#66e0ff',
    W: '#ffffff'
  };
  var SHIP_PIXELS = [
    '.....R.....',
    '....RRR....',
    '....RWR....',
    '...RRCRR...',
    '..RRRCRRR..',
    '.RRRRCRRRR.',
    'RRDRRRRRDRR',
    'RR.RRRRR.RR',
    'R..RRDRR..R',
    '...D...D...'
  ];
  var SHIP_WIDTH = SHIP_PIXELS[0].length * PIXEL;
  var SHIP_HEIGHT = SHIP_PIXELS.length * PIXEL;

  var ENEMY_PIXEL = 4;
  var ENEMY_COLORS = {
    B: '#2f7bff',
    D: '#123a8a',
    Y: '#ffd21f'
  };
  var ENEMY_PIXELS = [
    'B.......B',
    'BB.YYY.BB',
    'BBBYYYBBB',
    '.BBDDDBB.',
    '..B.D.B..'
  ];

  // ---------- Saved data (stored in the browser) ----------
  var KEY_BEST = 'kanjiStrikerBestScore';
  var KEY_PROGRESS = 'kanjiStrikerProgress';
  var KEY_SOUND = 'kanjiStrikerSound';
  var KEY_CAMPAIGN = 'kanjiStrikerCampaign'; // new key; the keys above are never changed

  function readStorage(key) {
    try {
      return window.localStorage.getItem(key);
    } catch (error) {
      return null;
    }
  }

  function writeStorage(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch (error) {
      /* ignore */
    }
  }

  function removeStorage(key) {
    try {
      window.localStorage.removeItem(key);
    } catch (error) {
      /* ignore */
    }
  }

  function loadSavedData() {
    var savedBest = parseInt(readStorage(KEY_BEST), 10);
    bestScore = isNaN(savedBest) ? 0 : savedBest;

    progress = {};
    var savedProgress = readStorage(KEY_PROGRESS);
    if (savedProgress) {
      try {
        var parsed = JSON.parse(savedProgress);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          progress = parsed;
        }
      } catch (error) {
        progress = {};
      }
    }

    soundEnabled = readStorage(KEY_SOUND) !== 'off';

    campaign = loadCampaign();
  }

  function saveBestScore() {
    writeStorage(KEY_BEST, String(bestScore));
  }

  // Saves the score as the best score if it is higher. Returns true when it is a new best.
  function commitBestScore() {
    if (score > bestScore) {
      bestScore = score;
      saveBestScore();
      return true;
    }
    return false;
  }

  function saveProgress() {
    writeStorage(KEY_PROGRESS, JSON.stringify(progress));
  }

  function getEntry(kanji) {
    if (!progress[kanji] || typeof progress[kanji] !== 'object') {
      progress[kanji] = { hits: 0, misses: 0 };
    }
    var entry = progress[kanji];
    if (typeof entry.hits !== 'number' || isNaN(entry.hits)) {
      entry.hits = 0;
    }
    if (typeof entry.misses !== 'number' || isNaN(entry.misses)) {
      entry.misses = 0;
    }
    return entry;
  }

  function recordHit(kanji) {
    getEntry(kanji).hits += 1;
    saveProgress();
  }

  function recordMiss(kanji) {
    getEntry(kanji).misses += 1;
    saveProgress();
  }

  // ---------- Campaign data: Galaxy -> World -> Stage ----------
  // Data and saved progress only. No screen or gameplay uses this yet (Waves, Stage Clear and the
  // Galaxy Map come later). Progress is saved by stage id, so the stage lists below can be changed
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

  // ---------- Campaign progress (saved in the browser) ----------
  // Saved shape: { v: 1, stages: { "w1-s1": { completed: true, bestScore: 120, plays: 3 } } }
  // Unlocks are calculated from "completed", so saved data can never disagree with itself.
  function freshCampaign() {
    return { v: CAMPAIGN_VERSION, stages: {} };
  }

  function emptyStageProgress() {
    return { completed: false, bestScore: 0, plays: 0 };
  }

  function safeCount(value) {
    var n = Math.floor(Number(value));
    return isFinite(n) && n > 0 ? Math.min(n, 1000000000) : 0;
  }

  // Upgrades old saved campaign data to the current shape (only version 1 exists so far)
  function migrateCampaign(parsed) {
    var version = parseInt(parsed.v, 10);
    if (isNaN(version) || version < 1) {
      version = 1;
    }
    // Future versions: add one step per version here, e.g. if (version < 2) { ...; version = 2; }
    campaignReadOnly = version > CAMPAIGN_VERSION;
    return parsed;
  }

  function cleanCampaign(raw) {
    var parsed = migrateCampaign(raw);
    var result = freshCampaign();
    var source = parsed.stages;
    if (!source || typeof source !== 'object' || Array.isArray(source)) {
      return result;
    }
    for (var id in source) {
      if (!Object.prototype.hasOwnProperty.call(source, id) || !/^w\d+-s\d+$/.test(id)) {
        continue;
      }
      var entry = source[id];
      if (!entry || typeof entry !== 'object') {
        continue;
      }
      result.stages[id] = {
        completed: entry.completed === true,
        bestScore: safeCount(entry.bestScore),
        plays: safeCount(entry.plays)
      };
    }
    return result;
  }

  function loadCampaign() {
    campaignReadOnly = false;
    var saved = readStorage(KEY_CAMPAIGN);
    if (!saved) {
      return freshCampaign();
    }
    try {
      var parsed = JSON.parse(saved);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('bad campaign data');
      }
      return cleanCampaign(parsed);
    } catch (error) {
      // Keep a copy of the unreadable data instead of silently losing it
      if (!readStorage(KEY_CAMPAIGN + 'Corrupt')) {
        writeStorage(KEY_CAMPAIGN + 'Corrupt', saved);
      }
      return freshCampaign();
    }
  }

  function saveCampaign() {
    if (campaignReadOnly) {
      return; // never overwrite data written by a newer version of the game
    }
    campaign.v = CAMPAIGN_VERSION;
    writeStorage(KEY_CAMPAIGN, JSON.stringify(campaign));
  }

  function getStageProgress(stageId) {
    var saved = campaign.stages[stageId];
    return saved ? { completed: saved.completed, bestScore: saved.bestScore, plays: saved.plays } : emptyStageProgress();
  }

  function isStageCompleted(stageId) {
    return !!(campaign.stages[stageId] && campaign.stages[stageId].completed);
  }

  function isStageUnlocked(stageId) {
    var stage = CAMPAIGN_STAGES[stageId];
    if (!stage) {
      return false;
    }
    if (isStageCompleted(stageId)) {
      return true;
    }
    if (stage.number > 1) {
      return isStageCompleted('w' + stage.worldId + '-s' + (stage.number - 1));
    }
    if (stage.worldId === 1) {
      return true; // the very first stage is always open
    }
    // First stage of a later world opens when the previous world's boss stage is completed
    return isStageCompleted('w' + (stage.worldId - 1) + '-s' + STAGES_PER_WORLD);
  }

  function isWorldUnlocked(worldId) {
    return isStageUnlocked('w' + worldId + '-s1');
  }

  // A stage can be played when it is unlocked and its world already has kanji data
  function isStagePlayable(stageId) {
    var stage = CAMPAIGN_STAGES[stageId];
    return !!stage && stage.ready && isStageUnlocked(stageId);
  }

  // The stage "Continue Campaign" should open: first playable stage that is not completed yet
  function getContinueStageId() {
    var lastReady = null;
    for (var i = 0; i < CAMPAIGN_ORDER.length; i++) {
      var id = CAMPAIGN_ORDER[i];
      if (!CAMPAIGN_STAGES[id].ready) {
        continue;
      }
      lastReady = id;
      if (isStageUnlocked(id) && !isStageCompleted(id)) {
        return id;
      }
    }
    return lastReady; // everything is completed: stay on the last stage
  }

  // Saves the result of one stage attempt. A completed stage never becomes "not completed" again.
  function recordStageResult(stageId, stageScore, cleared) {
    if (!CAMPAIGN_STAGES[stageId] || !isStageUnlocked(stageId)) {
      return false;
    }
    var entry = campaign.stages[stageId] || emptyStageProgress();
    entry.plays += 1;
    var points = safeCount(stageScore);
    if (points > entry.bestScore) {
      entry.bestScore = points;
    }
    if (cleared) {
      entry.completed = true;
    }
    campaign.stages[stageId] = entry;
    saveCampaign();
    return true;
  }

  // ---------- Sound (simple beeps, no sound files needed) ----------
  function getAudio() {
    if (!soundEnabled) {
      return null;
    }
    if (!audioContext) {
      var AudioClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioClass) {
        return null;
      }
      try {
        audioContext = new AudioClass();
      } catch (error) {
        return null;
      }
    }
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }
    return audioContext;
  }

  function playTone(frequency, duration, type, volume, delay, endFrequency) {
    var audio = getAudio();
    if (!audio) {
      return;
    }
    var startAt = audio.currentTime + (delay || 0);
    var oscillator = audio.createOscillator();
    var gain = audio.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, startAt);
    if (endFrequency) {
      oscillator.frequency.linearRampToValueAtTime(endFrequency, startAt + duration);
    }
    gain.gain.setValueAtTime(volume, startAt);
    gain.gain.linearRampToValueAtTime(0.0001, startAt + duration);
    oscillator.connect(gain);
    gain.connect(audio.destination);
    oscillator.start(startAt);
    oscillator.stop(startAt + duration + 0.02);
  }

  function playCorrectSound() {
    playTone(660, 0.1, 'square', 0.08, 0);
    playTone(990, 0.16, 'square', 0.08, 0.09);
  }

  function playWrongSound() {
    playTone(220, 0.25, 'sawtooth', 0.08, 0, 90);
  }

  function playHurtSound() {
    playTone(150, 0.2, 'square', 0.09, 0, 60);
  }

  function playGameOverSound() {
    playTone(440, 0.2, 'triangle', 0.1, 0);
    playTone(330, 0.2, 'triangle', 0.1, 0.2);
    playTone(220, 0.4, 'triangle', 0.1, 0.4);
  }

  function playWaveSound() {
    playTone(520, 0.1, 'square', 0.06, 0);
    playTone(780, 0.14, 'square', 0.06, 0.1);
  }

  function playStageCompleteSound() {
    playTone(523, 0.12, 'square', 0.08, 0);
    playTone(659, 0.12, 'square', 0.08, 0.12);
    playTone(784, 0.12, 'square', 0.08, 0.24);
    playTone(1047, 0.3, 'square', 0.08, 0.36);
  }

  function updateSoundButton() {
    soundToggleButton.textContent = soundEnabled ? 'SOUND: ON' : 'SOUND: OFF';
  }

  // ---------- Learning message (shown under the question) ----------
  function showToast(text, color) {
    toast.text = text;
    toast.color = color;
    toast.time = 1.8;
  }

  // ---------- Screen switching ----------
  function showOnly(section, showFooter) {
    mainMenuSection.hidden = section !== mainMenuSection;
    collectionSection.hidden = section !== collectionSection;
    settingsSection.hidden = section !== settingsSection;
    gameSection.hidden = section !== gameSection;
    appFooter.hidden = !showFooter;
  }

  function showMenu() {
    showOnly(mainMenuSection, true);
  }

  function showGame() {
    showOnly(gameSection, false);
  }

  function showCollection() {
    buildCollection();
    showOnly(collectionSection, true);
  }

  function showSettings() {
    settingsMessage.textContent = '';
    updateSoundButton();
    showOnly(settingsSection, true);
  }

  // ---------- Kanji collection screen ----------
  function buildCollection() {
    while (collectionGrid.firstChild) {
      collectionGrid.removeChild(collectionGrid.firstChild);
    }

    var collected = 0;
    for (var i = 0; i < KANJI_LIST.length; i++) {
      var item = KANJI_LIST[i];
      var entry = progress[item.kanji];
      var hits = entry && typeof entry.hits === 'number' ? entry.hits : 0;

      var cell = document.createElement('div');
      cell.className = 'kanji-cell';
      cell.setAttribute('role', 'listitem');

      var charSpan = document.createElement('span');
      charSpan.className = 'kanji-cell-char';
      var meaningSpan = document.createElement('span');
      meaningSpan.className = 'kanji-cell-meaning';

      if (hits >= MASTERED_HITS) {
        cell.className += ' is-mastered';
        collected += 1;
      } else if (hits >= 1) {
        cell.className += ' is-collected';
        collected += 1;
      } else {
        cell.className += ' is-locked';
      }

      if (hits >= 1) {
        charSpan.textContent = item.kanji;
        meaningSpan.textContent = item.meaning;
        cell.setAttribute('aria-label', item.kanji + ' - ' + item.meaning);
      } else {
        charSpan.textContent = '?';
        meaningSpan.textContent = '???';
        cell.setAttribute('aria-label', 'Locked kanji');
      }

      cell.appendChild(charSpan);
      cell.appendChild(meaningSpan);
      collectionGrid.appendChild(cell);
    }

    collectionSummary.textContent = 'COLLECTED ' + collected + ' / ' + KANJI_LIST.length;
  }

  // ---------- HUD ----------
  function updateHud() {
    hpDisplay.textContent = String(hp);
    scoreDisplay.textContent = String(score);
    comboDisplay.textContent = 'x' + combo;
  }

  // ---------- Canvas size ----------
  function createStars() {
    stars = [];
    var count = 60;
    for (var i = 0; i < count; i++) {
      stars.push({
        x: Math.random() * viewWidth,
        y: Math.random() * viewHeight,
        speed: 20 + Math.random() * 80,
        size: Math.random() < 0.8 ? 1 : 2
      });
    }
  }

  function resizeCanvas() {
    var container = canvas.parentElement;
    var width = container.clientWidth;
    var height = container.clientHeight;
    if (width === 0 || height === 0) {
      return;
    }

    var dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    var pixelWidth = Math.floor(width * dpr);
    var pixelHeight = Math.floor(height * dpr);
    // Changing canvas.width clears the canvas, so only do it when the size really changed
    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;

    var oldWidth = viewWidth;
    var oldHeight = viewHeight;
    viewWidth = width;
    viewHeight = height;

    player.y = viewHeight - 60;
    if (oldWidth > 0) {
      if (oldWidth !== viewWidth) {
        var ratio = viewWidth / oldWidth;
        player.x = player.x * ratio;
        player.targetX = player.targetX * ratio;
        for (var i = 0; i < enemies.length; i++) {
          enemies[i].x *= ratio;
          enemies[i].baseX *= ratio;
          enemies[i].swayAmp *= ratio;
        }
        for (var j = 0; j < bullets.length; j++) {
          bullets[j].x *= ratio;
        }
      }
    } else {
      player.x = viewWidth / 2;
      player.targetX = player.x;
    }
    player.x = clampX(player.x);
    player.targetX = clampX(player.targetX);

    if (oldWidth !== viewWidth || oldHeight !== viewHeight || stars.length === 0) {
      createStars();
    }
  }

  // Keeps the ship fully inside the playable area
  function clampX(x) {
    var half = SHIP_WIDTH / 2;
    var max = Math.max(half, viewWidth - half);
    return x < half ? half : x > max ? max : x;
  }

  // ---------- Stage Wave System ----------
  // A stage is played as a sequence of waves. Each wave is a fixed list of enemy groups (a single ship,
  // a row or a V formation) that appear one after another. The next wave starts ONLY when every enemy of
  // the current wave is defeated or has left the screen. When the last wave is cleared the game enters
  // STATE_STAGE_COMPLETE, stores the result in stageResult and fires one "kanjiStriker:stageComplete"
  // event. Saving the stage result (recordStageResult) is NOT done here: that belongs to the Stage Clear step.
  var WAVE_INTRO_TIME = 1.6;  // seconds the "WAVE n" banner is shown (nothing spawns during it)
  var WAVE_GAP_TIME = 0.5;    // short quiet pause after a wave is cleared, before the next banner
  var V_FORMATION_LIFT = 40;  // how much higher the outer ships of a V start (pixels)
  var EMPTY_SCREEN_GAP = 0.35; // when the screen is empty, the next group comes after this many seconds
  var RESCUE_DELAY = 0.8;      // a missed correct target comes back after this many seconds (last group only)
  var STAGE_COMPLETE_EVENT = 'kanjiStriker:stageComplete';

  // speed = enemy speed in pixels per second (at the reference screen height), groupGap = seconds between groups
  var WAVE_DEFS = [
    {
      name: 'Introduction',
      speed: 62,
      groupGap: 1.6,
      groups: [
        { count: 1, shape: 'single' },
        { count: 1, shape: 'single' },
        { count: 2, shape: 'row' },
        { count: 1, shape: 'single' }
      ]
    },
    {
      name: 'Formation Attack',
      speed: 74,
      groupGap: 2.4,
      groups: [
        { count: 2, shape: 'row' },
        { count: 3, shape: 'v' },
        { count: 3, shape: 'row' }
      ]
    },
    {
      name: 'Mixed Attack',
      speed: 86,
      groupGap: 2.0,
      sway: { chance: 0.5, amplitude: 26, period: 2.6 }, // half of the groups sway left and right
      groups: [
        { count: 1, shape: 'single' },
        { count: 2, shape: 'row' },
        { count: 3, shape: 'v' },
        { count: 1, shape: 'single' },
        { count: 3, shape: 'row' }
      ]
    },
    {
      name: 'Final Wave',
      speed: 98,
      groupGap: 1.7,
      sway: { chance: 0.7, amplitude: 34, period: 2.2 }, // most groups sway left and right
      groups: [
        { count: 2, shape: 'row' },
        { count: 3, shape: 'v' },
        { count: 1, shape: 'single' },
        { count: 3, shape: 'row' },
        { count: 2, shape: 'row' },
        { count: 1, shape: 'single' }
      ]
    }
  ];

  var currentStageId = null;     // id of the stage being played, e.g. "w1-s1"
  var currentStage = null;       // its entry in CAMPAIGN_STAGES (world, number, kanji, ...)
  var stageWaves = [];           // the waves of the stage being played
  var stageCompleteFired = false; // makes sure the completion happens only once per run
  var stageResult = null;        // filled when the last wave is cleared; read by the later Stage Clear step
  var targetLost = false;        // true after the correct target was missed and no new target has spawned yet
  var rescueTimer = -1;          // countdown for the rescue ship (-1 = not running)
  // phase: 'none' | 'intro' (banner) | 'spawning' | 'clearing' (all spawned, waiting) | 'gap' (between waves)
  var waveState = { index: 0, phase: 'none', timer: 0, groupIndex: 0, groupTimer: 0 };

  var START_BUTTON_LABEL = startGameButton.textContent;
  var startLabelTimer = null;

  // Difficulty per stage number (1-4). speed and gap multiply the wave values above:
  // speed 1.1 = enemies 10% faster, gap 0.9 = the next group comes 10% sooner.
  // sway multiplies how far swaying groups move sideways (0 = no swaying in that stage).
  // extraGroups are added to the end of every wave of that stage.
  var STAGE_TUNING = {
    1: { speed: 0.9, gap: 1.15, sway: 0, extraGroups: [] },                                  // New Kanji: gentle start
    2: { speed: 1.0, gap: 1.0, sway: 0.6, extraGroups: [] },                                   // Review Run: normal speed, but old kanji are mixed in
    3: { speed: 1.1, gap: 0.9, sway: 1.0, extraGroups: [{ count: 2, shape: 'row' }] },         // Big Waves: one more group per wave
    4: { speed: 1.2, gap: 0.8, sway: 1.3, extraGroups: [{ count: 3, shape: 'v' }, { count: 1, shape: 'single' }] } // Hard Fight
  };
  var DEFAULT_TUNING = { speed: 1.0, gap: 1.0, sway: 1.0, extraGroups: [] };

  // The wave plan of a stage: the base waves, made faster / longer depending on the stage number
  function getWavesForStage(stage) {
    if (!stage) {
      return [];
    }
    var tuning = STAGE_TUNING[stage.number] || DEFAULT_TUNING;
    var waves = [];
    for (var i = 0; i < WAVE_DEFS.length; i++) {
      var base = WAVE_DEFS[i];
      waves.push({
        name: base.name,
        speed: Math.round(base.speed * tuning.speed),
        groupGap: Math.round(base.groupGap * tuning.gap * 100) / 100,
        sway: base.sway && tuning.sway > 0
          ? { chance: base.sway.chance, amplitude: base.sway.amplitude * tuning.sway, period: base.sway.period }
          : null,
        groups: base.groups.concat(tuning.extraGroups)
      });
    }
    return waves;
  }

  function kanjiItemsFor(chars) {
    var items = [];
    for (var i = 0; i < chars.length; i++) {
      var item = KANJI_BY_CHAR[chars[i]];
      if (item && items.indexOf(item) === -1) {
        items.push(item);
      }
    }
    return items;
  }

  // Questions come from the stage's own kanji. Wrong answers may also use the stage's review kanji.
  function buildStagePools(stage) {
    return {
      targets: kanjiItemsFor(stage.kanji),
      decoys: kanjiItemsFor(stage.kanji.concat(stage.review))
    };
  }

  // Returns '' when the stage can be started, otherwise the reason it cannot
  function getStageStartProblem(stageId) {
    var stage = CAMPAIGN_STAGES[stageId];
    if (!stage) {
      return 'unknown stage';
    }
    if (!stage.ready) {
      return 'not ready (no kanji data yet)';
    }
    if (!isStageUnlocked(stageId)) {
      return 'locked';
    }
    if (stage.boss) {
      return 'boss battle is not built yet';
    }
    if (getWavesForStage(stage).length === 0) {
      return 'no waves';
    }
    var pools = buildStagePools(stage);
    if (pools.targets.length < 2 || pools.decoys.length < 2) {
      return 'not enough kanji';
    }
    return '';
  }

  // Shows "STAGE NOT READY" on the START GAME button for a moment (no new HTML needed)
  function showStageNotReady() {
    startGameButton.textContent = 'STAGE NOT READY';
    if (startLabelTimer !== null) {
      clearTimeout(startLabelTimer);
    }
    startLabelTimer = setTimeout(function () {
      startGameButton.textContent = START_BUTTON_LABEL;
      startLabelTimer = null;
    }, 1800);
  }

  function shuffle(list) {
    for (var i = list.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var temp = list[i];
      list[i] = list[j];
      list[j] = temp;
    }
    return list;
  }

  // Start positions of the ships of one group. lift = extra height above the spawn line (V formation).
  function formationSlots(group) {
    var slots = [];
    var count = group.count;
    var i;
    if (count <= 1) {
      slots.push({ x: pickSpawnX(), lift: 0 });
      return slots;
    }
    var margin = ENEMY_WIDTH / 2 + 4;
    var usable = viewWidth - margin * 2;
    var spacing = Math.min(ENEMY_WIDTH * 2 + 10, usable / (count - 1));
    var half = (spacing * (count - 1)) / 2;
    var minCenter = margin + half;
    var maxCenter = viewWidth - margin - half;
    var center = maxCenter > minCenter ? minCenter + Math.random() * (maxCenter - minCenter) : viewWidth / 2;
    for (i = 0; i < count; i++) {
      var fromMiddle = Math.abs(i - (count - 1) / 2);
      slots.push({
        x: center - half + spacing * i,
        lift: group.shape === 'v' ? Math.round(fromMiddle * V_FORMATION_LIFT) : 0
      });
    }
    return slots;
  }

  // Spawns every ship of a group at once. The ships are created in random order, so the correct
  // target (the first ship created while no target is on screen) is not always on the same side.
  function spawnGroup(group, speed, sway) {
    var slots = shuffle(formationSlots(group));
    var motion = pickMotion(sway, slots);
    for (var i = 0; i < slots.length; i++) {
      spawnEnemy(slots[i].x, -ENEMY_HEIGHT - slots[i].lift, speed, motion);
    }
  }

  // Decides if a group sways left and right. The whole group moves together, so a row or V keeps its
  // shape. The swing is limited so no ship leaves the screen. Returns null for a straight group.
  function pickMotion(sway, slots) {
    if (!sway || sway.amplitude <= 0 || Math.random() >= sway.chance) {
      return null;
    }
    var minX = ENEMY_WIDTH / 2 + 2;
    var maxX = viewWidth - ENEMY_WIDTH / 2 - 2;
    var room = Infinity;
    for (var i = 0; i < slots.length; i++) {
      room = Math.min(room, slots[i].x - minX, maxX - slots[i].x);
    }
    var amplitude = Math.min(sway.amplitude, room);
    if (amplitude < 6) {
      return null; // too close to the screen edge: this group flies straight
    }
    return {
      amp: Math.random() < 0.5 ? -amplitude : amplitude, // the sign decides which way it swings first
      freq: (Math.PI * 2) / sway.period
    };
  }

  function beginWave(index) {
    waveState.index = index;
    waveState.phase = 'intro';
    waveState.timer = WAVE_INTRO_TIME;
    waveState.groupIndex = 0;
    waveState.groupTimer = 0;
    playWaveSound();
  }

  // Runs every frame while playing: banner -> spawn the groups one by one -> wait for the wave to be cleared
  function updateWaveSpawning(dt) {
    var def = stageWaves[waveState.index];
    if (!def) {
      return;
    }

    if (waveState.phase === 'gap') {
      waveState.timer -= dt;
      if (waveState.timer <= 0 && waveState.index + 1 < stageWaves.length) {
        beginWave(waveState.index + 1);
      }
      return;
    }

    if (waveState.phase === 'intro') {
      waveState.timer -= dt;
      if (waveState.timer > 0) {
        return;
      }
      waveState.phase = 'spawning';
      waveState.groupIndex = 0;
      waveState.groupTimer = 0;
    }

    if (waveState.phase === 'spawning') {
      waveState.groupTimer -= dt;
      // No dead time: when every ship is gone, the next group comes after a very short pause
      if (waveState.groupTimer > EMPTY_SCREEN_GAP && waveState.groupIndex > 0 && aliveEnemyCount() === 0) {
        waveState.groupTimer = EMPTY_SCREEN_GAP;
      }
      if (waveState.groupTimer > 0) {
        return;
      }
      spawnGroup(def.groups[waveState.groupIndex], def.speed, def.sway);
      waveState.groupIndex += 1;
      if (waveState.groupIndex >= def.groups.length) {
        waveState.phase = 'clearing'; // everything of this wave is on screen now
      } else {
        waveState.groupTimer = def.groupGap;
      }
    }
  }

  function aliveEnemyCount() {
    var n = 0;
    for (var i = 0; i < enemies.length; i++) {
      if (!enemies[i].dead) {
        n += 1;
      }
    }
    return n;
  }

  // The correct target was missed and every group of the wave is already on screen, so no new target
  // would ever come. After a short pause one rescue ship carrying the same question flies in.
  function updateTargetRescue(dt) {
    if (!targetLost || waveState.phase !== 'clearing' || activeTargetOnScreen()) {
      rescueTimer = -1;
      return;
    }
    if (rescueTimer < 0) {
      rescueTimer = RESCUE_DELAY;
    }
    rescueTimer -= dt;
    if (rescueTimer > 0) {
      return;
    }
    rescueTimer = -1;
    var def = stageWaves[waveState.index];
    // spawnEnemy makes it the correct target (none is active) and clears targetLost
    spawnEnemy(pickSpawnX(), -ENEMY_HEIGHT, def ? def.speed : 62);
  }

  // Runs at the end of every playing frame (after dead enemies were removed)
  function checkWaveCleared() {
    if (currentState !== STATE_PLAYING || waveState.phase !== 'clearing') {
      return;
    }
    if (aliveEnemyCount() > 0) {
      return; // the wave is not over: ships are still on screen
    }
    if (targetLost) {
      return; // the correct target was missed: the rescue ship must come first
    }
    if (waveState.index + 1 < stageWaves.length) {
      waveState.phase = 'gap';
      waveState.timer = WAVE_GAP_TIME;
    } else {
      completeStage();
    }
  }

  // The last wave was cleared while the player was still alive
  function completeStage() {
    if (currentState !== STATE_PLAYING || stageCompleteFired) {
      return;
    }
    stageCompleteFired = true;
    waveState.phase = 'done';
    currentState = STATE_STAGE_COMPLETE;
    resetDrag();
    bullets = [];
    if (commitBestScore()) {
      newBest = true;
    }
    stageResult = {
      stageId: currentStageId,
      worldId: currentStage.worldId,
      stageNumber: currentStage.number,
      cleared: true,
      wavesCleared: stageWaves.length,
      score: score,
      hp: hp
    };
    playStageCompleteSound();
    try {
      window.dispatchEvent(new CustomEvent(STAGE_COMPLETE_EVENT, {
        detail: {
          stageId: stageResult.stageId,
          worldId: stageResult.worldId,
          stageNumber: stageResult.stageNumber,
          cleared: true,
          wavesCleared: stageResult.wavesCleared,
          score: stageResult.score,
          hp: stageResult.hp
        }
      }));
    } catch (error) {
      /* ignore: STATE_STAGE_COMPLETE and stageResult are still set */
    }
  }

  // ---------- Game control ----------
  // Starts one stage. Returns false (and changes nothing) when the stage cannot be played.
  function startStage(stageId) {
    if (getStageStartProblem(stageId) !== '') {
      return false;
    }
    var stage = CAMPAIGN_STAGES[stageId];
    var pools = buildStagePools(stage);
    currentStageId = stageId;
    currentStage = stage;
    questionPool = pools.targets;
    decoyPool = pools.decoys;
    stageWaves = getWavesForStage(stage);
    stageCompleteFired = false;
    stageResult = null;
    targetLost = false;
    rescueTimer = -1;

    hp = MAX_HP;
    score = 0;
    combo = 0;
    updateHud();
    getAudio();

    enemies = [];
    bullets = [];
    particles = [];
    fireTimer = 0;
    damageFlash = 0;
    toast.time = 0;
    newBest = false;
    totalTime = 0;
    answered = 0;
    pickQuestion();

    currentState = STATE_PLAYING;
    pauseButton.textContent = 'PAUSE';
    pauseButton.setAttribute('aria-label', 'Pause game');

    showGame();
    viewWidth = 0;
    resizeCanvas();

    player.isDragging = false;
    player.pointerId = null;
    beginWave(0);
    startLoop();
    return true;
  }

  // START GAME: plays the stage the campaign says is next
  function startGame() {
    var stageId = getContinueStageId();
    if (!stageId || !startStage(stageId)) {
      showStageNotReady();
    }
  }

  // Tap after GAME OVER: try the same stage again
  function restartCurrentStage() {
    if (!currentStageId || !startStage(currentStageId)) {
      backToMenu();
    }
  }

  function backToMenu() {
    if (currentState === STATE_PLAYING || currentState === STATE_PAUSED || currentState === STATE_STAGE_COMPLETE) {
      commitBestScore();
    }
    currentState = STATE_MENU;
    stopLoop();
    showMenu();
  }

  function pauseGame() {
    if (currentState !== STATE_PLAYING) {
      return;
    }
    currentState = STATE_PAUSED;
    resetDrag();
    pauseButton.textContent = 'RESUME';
    pauseButton.setAttribute('aria-label', 'Resume game');
  }

  function resumeGame() {
    if (currentState !== STATE_PAUSED) {
      return;
    }
    currentState = STATE_PLAYING;
    pauseButton.textContent = 'PAUSE';
    pauseButton.setAttribute('aria-label', 'Pause game');
  }

  function togglePause() {
    if (currentState === STATE_PLAYING) {
      pauseGame();
    } else if (currentState === STATE_PAUSED) {
      resumeGame();
    }
  }

  // ---------- Game rules ----------
  function sizeScale() {
    var scale = viewHeight / REF_HEIGHT;
    return scale < 0.8 ? 0.8 : scale > 1.4 ? 1.4 : scale;
  }

  // An enemy is the correct target only if it was spawned as the target of the CURRENT question
  function isActiveTarget(enemy) {
    return !enemy.dead && enemy.isTarget && enemy.qid === questionSerial;
  }

  function activeTargetOnScreen() {
    for (var i = 0; i < enemies.length; i++) {
      if (isActiveTarget(enemies[i])) {
        return true;
      }
    }
    return false;
  }

  // How likely a kanji is to be chosen: 1 = normal. Uses the saved hits/misses of the player.
  function kanjiWeight(item) {
    var entry = progress[item.kanji];
    var hits = entry && typeof entry.hits === 'number' ? entry.hits : 0;
    var misses = entry && typeof entry.misses === 'number' ? entry.misses : 0;
    if (hits + misses === 0) {
      return NEW_KANJI_WEIGHT;
    }
    var struggle = Math.max(0, misses - hits);
    if (struggle === 0 && hits >= MASTERED_HITS) {
      return MASTERED_WEIGHT;
    }
    return 1 + Math.min(struggle, MAX_STRUGGLE) * WEIGHT_PER_STRUGGLE;
  }

  // Random pick from a list of kanji entries, favouring the ones with a higher weight
  function weightedPick(list) {
    var total = 0;
    var i;
    for (i = 0; i < list.length; i++) {
      total += kanjiWeight(list[i]);
    }
    var roll = Math.random() * total;
    for (i = 0; i < list.length; i++) {
      roll -= kanjiWeight(list[i]);
      if (roll <= 0) {
        return list[i];
      }
    }
    return list[list.length - 1];
  }

  function pickQuestion() {
    var onScreen = {};
    var promote = null; // a ship already flying that becomes the new correct target (no empty waiting time)
    var i;
    for (i = 0; i < enemies.length; i++) {
      var en = enemies[i];
      if (en.dead) {
        continue;
      }
      onScreen[en.data.kanji] = true;
      // Prefer a ship of this stage's own kanji that is not the old question; the highest one gives the most time
      if (en.data !== question && questionPool.indexOf(en.data) !== -1 && (promote === null || en.y < promote.y)) {
        promote = en;
      }
    }

    if (promote !== null) {
      question = promote.data;
    } else {
      // Nothing usable on screen: new question, not the previous one and not a kanji already flying
      var pool = [];
      for (i = 0; i < questionPool.length; i++) {
        if (questionPool[i] !== question && !onScreen[questionPool[i].kanji]) {
          pool.push(questionPool[i]);
        }
      }
      if (pool.length === 0) {
        for (i = 0; i < questionPool.length; i++) {
          if (questionPool[i] !== question) {
            pool.push(questionPool[i]);
          }
        }
      }
      question = weightedPick(pool);
    }
    questionSerial += 1;
    targetLost = false; // a new question starts: nothing is lost yet
    rescueTimer = -1;

    // Every enemy that already exists is now a wrong answer, except the promoted ship
    for (i = 0; i < enemies.length; i++) {
      enemies[i].isTarget = false;
      if (enemies[i] !== promote && enemies[i].data === question) {
        enemies[i].dead = true; // safety: never show the answer kanji on a wrong enemy
      }
    }
    if (promote !== null) {
      promote.isTarget = true;
      promote.qid = questionSerial;
    }
  }

  // A wrong-answer kanji that is not the question and not already on screen
  function pickDecoy() {
    var onScreen = {};
    var i;
    for (i = 0; i < enemies.length; i++) {
      if (!enemies[i].dead) {
        onScreen[enemies[i].data.kanji] = true;
      }
    }
    var pool = [];
    for (i = 0; i < decoyPool.length; i++) {
      if (decoyPool[i] !== question && !onScreen[decoyPool[i].kanji]) {
        pool.push(decoyPool[i]);
      }
    }
    if (pool.length === 0) {
      for (i = 0; i < decoyPool.length; i++) {
        if (decoyPool[i] !== question) {
          pool.push(decoyPool[i]);
        }
      }
    }
    return weightedPick(pool);
  }

  // Picks a spawn position that does not overlap enemies that just spawned
  function pickSpawnX() {
    var margin = ENEMY_WIDTH / 2 + 4;
    var span = viewWidth - margin * 2;
    if (span <= 0) {
      return viewWidth / 2;
    }
    var needed = ENEMY_WIDTH + 8;
    var bestX = margin + Math.random() * span;
    var bestGap = -1;
    for (var attempt = 0; attempt < 10; attempt++) {
      var x = margin + Math.random() * span;
      var gap = Infinity;
      for (var i = 0; i < enemies.length; i++) {
        var other = enemies[i];
        if (other.dead || other.y > 12) {
          continue; // far below the spawn line, cannot overlap
        }
        gap = Math.min(gap, Math.abs(other.x - x));
      }
      if (gap > bestGap) {
        bestGap = gap;
        bestX = x;
      }
      if (gap >= needed) {
        break;
      }
    }
    return bestX;
  }

  function spawnEnemy(x, y, speed, motion) {
    // Exactly one correct target per question: spawn it only when none is active
    var needTarget = !activeTargetOnScreen();
    if (needTarget) {
      targetLost = false; // the correct target is back on screen
      rescueTimer = -1;
    }
    enemies.push({
      data: needTarget ? question : pickDecoy(),
      isTarget: needTarget,
      qid: questionSerial,
      dead: false,
      x: x,
      baseX: x,                       // centre line the ship sways around
      swayAmp: motion ? motion.amp : 0, // 0 = flies straight
      swayFreq: motion ? motion.freq : 0,
      age: 0,
      y: y,
      speed: speed,         // pixels per second at the reference screen height (set by the wave)
      wave: waveState.index // which wave this ship belongs to
    });
  }

  function burst(x, y, color) {
    for (var i = 0; i < 12; i++) {
      var angle = Math.random() * Math.PI * 2;
      var speed = 40 + Math.random() * 120;
      particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.5,
        color: color
      });
    }
  }

  function loseHp(amount, quiet) {
    hp -= amount;
    combo = 0;
    damageFlash = 0.25;
    if (hp <= 0) {
      hp = 0;
      currentState = STATE_GAME_OVER;
      gameOverAt = performance.now();
      resetDrag();
      if (commitBestScore()) {
        newBest = true;
      }
      playGameOverSound();
    } else if (!quiet) {
      playHurtSound();
    }
    updateHud();
  }

  function correctHit(data) {
    var levelBefore = weaponLevel();
    combo += 1;
    answered += 1;
    var points = 10 * Math.min(combo, MAX_SCORE_MULTIPLIER);
    score += points;
    recordHit(data.kanji);

    // Streak reward: every COMBO_HEAL_EVERY correct answers in a row restore a little HP
    var healed = 0;
    if (combo % COMBO_HEAL_EVERY === 0 && hp < MAX_HP) {
      healed = Math.min(HEAL_AMOUNT, MAX_HP - hp);
      hp += healed;
    }

    showToast(
      data.kanji + ' = ' + data.meaning.toUpperCase() + '   +' + points + (healed > 0 ? '   +' + healed + ' HP' : ''),
      '#5dff8a'
    );
    playCorrectSound();
    if (healed > 0) {
      playTone(1320, 0.12, 'square', 0.06, 0.2);
    }
    if (weaponLevel() > levelBefore) {
      playTone(880, 0.08, 'square', 0.06, 0.1);
      playTone(1175, 0.08, 'square', 0.06, 0.18);
      playTone(1568, 0.14, 'square', 0.06, 0.26);
    }
    pickQuestion();
    updateHud();
  }

  function wrongHit(data) {
    recordMiss(question.kanji);
    showToast(data.kanji + ' = ' + data.meaning.toUpperCase(), '#ff6b86');
    loseHp(WRONG_HIT_DAMAGE, true);
    if (currentState !== STATE_GAME_OVER) {
      playWrongSound();
    }
  }

  // The correct target left the game without being shot (bottom of the screen or crashed into the ship)
  function targetMissed(amount) {
    recordMiss(question.kanji);
    showToast(question.kanji + ' = ' + question.meaning.toUpperCase(), '#ff6b86');
    targetLost = true; // the same question stays; a new target must come (next group or rescue ship)
    loseHp(amount);
  }

  // Removes everything that was marked dead during this frame
  function sweepDead() {
    var n = 0;
    var k;
    for (k = 0; k < enemies.length; k++) {
      if (!enemies[k].dead) {
        enemies[n++] = enemies[k];
      }
    }
    enemies.length = n;
    n = 0;
    for (k = 0; k < bullets.length; k++) {
      if (!bullets[k].dead) {
        bullets[n++] = bullets[k];
      }
    }
    bullets.length = n;
  }

  function hitsPlayer(enemy) {
    return (
      Math.abs(enemy.x - player.x) < (ENEMY_WIDTH + SHIP_WIDTH) / 2 - 4 &&
      enemy.y + ENEMY_HEIGHT > player.y - SHIP_HEIGHT / 2 &&
      enemy.y < player.y + SHIP_HEIGHT / 2
    );
  }

  // Measures how fast the finger moves and decides if shooting is allowed (with a small hysteresis)
  function updateFireControl(dt) {
    if (!player.isDragging) {
      player.fireHeld = false;
      player.fingerSpeed = 0;
      player.moveAccum = 0;
      return;
    }
    var instantSpeed = dt > 0 ? player.moveAccum / dt : 0;
    player.moveAccum = 0;
    player.fingerSpeed += (instantSpeed - player.fingerSpeed) * (1 - Math.exp(-FIRE_SPEED_SMOOTHING * dt));
    if (player.fingerSpeed > FIRE_STOP_SPEED) {
      player.fireHeld = false;
    } else if (player.fingerSpeed < FIRE_START_SPEED) {
      player.fireHeld = true;
    }
  }

  // 1 = single shot, 2 = double shot, 3 = triple shot (depends on the current combo)
  function weaponLevel() {
    if (combo >= TRIPLE_SHOT_COMBO) {
      return 3;
    }
    if (combo >= DOUBLE_SHOT_COMBO) {
      return 2;
    }
    return 1;
  }

  function updateGameplay(dt) {
    var scale = sizeScale();
    var i;
    var j;

    // Hold-to-fire: the ship shoots only while a finger (or the mouse button) is down and moving slowly.
    // Swipe fast (or lift the finger) to stop shooting, so a wrong kanji in the lane can be let pass safely.
    // The cooldown keeps counting down even when the finger is lifted, so tapping quickly
    // can never shoot faster than FIRE_INTERVAL. The first shot comes the moment the finger touches
    // (when the cooldown is already over).
    updateFireControl(dt);
    if (player.isDragging && player.fireHeld) {
      fireTimer -= dt;
      if (fireTimer <= 0) {
        fireTimer += FIRE_INTERVAL;
        var startY = player.y - SHIP_HEIGHT / 2;
        var level = weaponLevel();
        var offsets = level === 3 ? [-BULLET_SPREAD, 0, BULLET_SPREAD] :
          level === 2 ? [-BULLET_SPREAD / 2, BULLET_SPREAD / 2] : [0];
        for (var o = 0; o < offsets.length; o++) {
          bullets.push({ x: player.x + offsets[o], y: startY, prevY: startY, dead: false });
        }
      }
    } else if (fireTimer > 0) {
      fireTimer = Math.max(0, fireTimer - dt);
    }

    // Spawn enemies: the Wave System decides what appears and when
    updateWaveSpawning(dt);
    updateTargetRescue(dt);

    // Move bullets (they remember the previous position so fast bullets cannot skip an enemy)
    for (i = 0; i < bullets.length; i++) {
      bullets[i].prevY = bullets[i].y;
      bullets[i].y -= BULLET_SPEED * dt;
      if (bullets[i].y < -10) {
        bullets[i].dead = true;
      }
    }

    // Move enemies, then check bottom edge and player collisions
    for (i = 0; i < enemies.length; i++) {
      var enemy = enemies[i];
      if (enemy.dead) {
        continue;
      }
      if (enemy.swayAmp !== 0) {
        enemy.age += dt;
        enemy.x = enemy.baseX + enemy.swayAmp * Math.sin(enemy.age * enemy.swayFreq);
      }
      enemy.y += enemy.speed * scale * dt;

      if (enemy.y > viewHeight) {
        var escapedTarget = isActiveTarget(enemy);
        enemy.dead = true;
        if (escapedTarget) {
          targetMissed(TARGET_ESCAPE_DAMAGE);
          if (currentState === STATE_GAME_OVER) {
            sweepDead();
            return;
          }
        }
        continue;
      }

      if (hitsPlayer(enemy)) {
        var crashedTarget = isActiveTarget(enemy);
        enemy.dead = true;
        burst(enemy.x, enemy.y + ENEMY_HEIGHT / 2, '#ff6b86');
        if (crashedTarget) {
          targetMissed(TARGET_CRASH_DAMAGE);
        } else {
          loseHp(DECOY_CRASH_DAMAGE);
        }
        if (currentState === STATE_GAME_OVER) {
          sweepDead();
          return;
        }
      }
    }

    // Bullets hitting enemies: one bullet hits at most one enemy (the lowest one it reaches)
    for (i = 0; i < bullets.length; i++) {
      var b = bullets[i];
      if (b.dead) {
        continue;
      }
      var target = null;
      for (j = 0; j < enemies.length; j++) {
        var e = enemies[j];
        if (e.dead || e.y <= KANJI_VISIBLE_Y) {
          continue;
        }
        if (Math.abs(b.x - e.x) > ENEMY_WIDTH / 2 + BULLET_HIT_PADDING) {
          continue;
        }
        if (b.y > e.y + ENEMY_HEIGHT || b.prevY < e.y) {
          continue;
        }
        if (target === null || e.y > target.y) {
          target = e;
        }
      }
      if (target === null) {
        continue;
      }

      var wasCorrect = isActiveTarget(target);
      b.dead = true;
      target.dead = true;
      if (wasCorrect) {
        burst(target.x, target.y + ENEMY_HEIGHT / 2, '#5dff8a');
        correctHit(target.data);
      } else {
        burst(target.x, target.y + ENEMY_HEIGHT / 2, '#ff6b86');
        wrongHit(target.data);
        if (currentState === STATE_GAME_OVER) {
          break;
        }
      }
    }

    sweepDead();
    checkWaveCleared();
  }

  // ---------- Game loop ----------
  function startLoop() {
    stopLoop();
    lastTime = performance.now();
    animationFrameId = requestAnimationFrame(gameLoop);
  }

  function stopLoop() {
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
  }

  function gameLoop(timestamp) {
    var dt = (timestamp - lastTime) / 1000;
    lastTime = timestamp;
    if (dt < 0) {
      dt = 0;
    }
    if (dt > 0.05) {
      dt = 0.05;
    }

    if (currentState === STATE_PLAYING) {
      update(dt);
    } else if (currentState === STATE_GAME_OVER || currentState === STATE_STAGE_COMPLETE) {
      updateEffects(dt);
    }
    render();

    if (currentState !== STATE_MENU) {
      animationFrameId = requestAnimationFrame(gameLoop);
    }
  }

  function update(dt) {
    totalTime += dt;

    // Smooth movement toward the target position (same feel at 30, 60 or 120 fps)
    player.targetX = clampX(player.targetX);
    player.x += (player.targetX - player.x) * (1 - Math.exp(-PLAYER_FOLLOW * dt));
    player.x = clampX(player.x);

    updateGameplay(dt);
    updateEffects(dt);
  }

  // Stars, particles, red flash and learning message (these also run on the game over screen)
  function updateEffects(dt) {
    var i;

    for (i = 0; i < stars.length; i++) {
      var star = stars[i];
      star.y += star.speed * dt;
      if (star.y > viewHeight) {
        star.y = 0;
        star.x = Math.random() * viewWidth;
      }
    }

    if (damageFlash > 0) {
      damageFlash -= dt;
    }
    if (toast.time > 0) {
      toast.time -= dt;
    }

    for (i = particles.length - 1; i >= 0; i--) {
      var particle = particles[i];
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.life -= dt;
      if (particle.life <= 0) {
        particles.splice(i, 1);
      }
    }
  }

  // ---------- Drawing ----------
  function drawShip() {
    var left = Math.round(player.x - SHIP_WIDTH / 2);
    var top = Math.round(player.y - SHIP_HEIGHT / 2);

    for (var row = 0; row < SHIP_PIXELS.length; row++) {
      for (var col = 0; col < SHIP_PIXELS[row].length; col++) {
        var key = SHIP_PIXELS[row][col];
        if (key === '.') {
          continue;
        }
        ctx.fillStyle = SHIP_COLORS[key];
        ctx.fillRect(left + col * PIXEL, top + row * PIXEL, PIXEL, PIXEL);
      }
    }

    // Engine flame (flickers)
    var flameLength = Math.floor(totalTime * 20) % 2 === 0 ? 2 : 3;
    ctx.fillStyle = '#ffd21f';
    ctx.fillRect(left + 3 * PIXEL, top + SHIP_HEIGHT, PIXEL, PIXEL * flameLength);
    ctx.fillRect(left + 7 * PIXEL, top + SHIP_HEIGHT, PIXEL, PIXEL * flameLength);
  }

  function drawEnemy(enemy) {
    var spriteWidth = ENEMY_PIXELS[0].length * ENEMY_PIXEL;
    var left = Math.round(enemy.x - spriteWidth / 2);
    var top = Math.round(enemy.y);

    for (var row = 0; row < ENEMY_PIXELS.length; row++) {
      for (var col = 0; col < ENEMY_PIXELS[row].length; col++) {
        var key = ENEMY_PIXELS[row][col];
        if (key === '.') {
          continue;
        }
        ctx.fillStyle = ENEMY_COLORS[key];
        ctx.fillRect(left + col * ENEMY_PIXEL, top + row * ENEMY_PIXEL, ENEMY_PIXEL, ENEMY_PIXEL);
      }
    }

    // Kanji plate
    var plateTop = top + ENEMY_PIXELS.length * ENEMY_PIXEL + 4;
    var plateHeight = ENEMY_HEIGHT - (plateTop - top);
    ctx.fillStyle = '#0b0b10';
    ctx.fillRect(Math.round(enemy.x - ENEMY_WIDTH / 2), plateTop, ENEMY_WIDTH, plateHeight);
    ctx.strokeStyle = '#ffd21f';
    ctx.lineWidth = 2;
    ctx.strokeRect(Math.round(enemy.x - ENEMY_WIDTH / 2), plateTop, ENEMY_WIDTH, plateHeight);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px ' + KANJI_FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(enemy.data.kanji, enemy.x, plateTop + plateHeight / 2 + 1);
  }

  function drawQuestion() {
    ctx.fillStyle = 'rgba(11, 11, 16, 0.85)';
    ctx.fillRect(0, 0, viewWidth, 46);
    ctx.fillStyle = '#ff6b86';
    ctx.fillRect(0, 46, viewWidth, 2);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#6fb7ff';
    ctx.font = 'bold 11px "Courier New", monospace';
    ctx.fillText('SHOOT THE KANJI FOR:', viewWidth / 2, 13);
    ctx.fillStyle = '#ffd21f';
    ctx.font = 'bold 22px "Courier New", monospace';
    ctx.fillText(question.meaning.toUpperCase(), viewWidth / 2, 32);

    // Small wave and stage labels in the corners of the banner
    if (currentStage) {
      ctx.fillStyle = '#8f99a8';
      ctx.font = 'bold 10px "Courier New", monospace';
      ctx.textAlign = 'left';
      ctx.fillText('WAVE ' + (waveState.index + 1) + '/' + stageWaves.length, 8, 13);
      ctx.textAlign = 'right';
      ctx.fillText('STAGE ' + currentStage.worldId + '-' + currentStage.number, viewWidth - 8, 13);
      ctx.textAlign = 'center';
    }
  }

  // Big "WAVE n" announcement that fades in and out when a wave begins
  function drawWaveBanner() {
    if (waveState.phase !== 'intro' || !stageWaves[waveState.index]) {
      return;
    }
    var def = stageWaves[waveState.index];
    var elapsed = WAVE_INTRO_TIME - waveState.timer;
    var alpha = Math.min(1, elapsed / 0.25, waveState.timer / 0.4);
    if (alpha <= 0) {
      return;
    }
    var centerX = viewWidth / 2;
    var centerY = viewHeight * 0.4;

    ctx.globalAlpha = alpha;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.font = 'bold 34px "Courier New", monospace';
    ctx.fillStyle = '#000000';
    ctx.fillText('WAVE ' + (waveState.index + 1), centerX + 2, centerY + 2);
    ctx.fillStyle = '#ffd21f';
    ctx.fillText('WAVE ' + (waveState.index + 1), centerX, centerY);

    ctx.font = 'bold 16px "Courier New", monospace';
    ctx.fillStyle = '#000000';
    ctx.fillText(def.name.toUpperCase(), centerX + 1, centerY + 34);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(def.name.toUpperCase(), centerX, centerY + 33);

    if (waveState.index === 0 && currentStage) {
      ctx.font = 'bold 12px "Courier New", monospace';
      ctx.fillStyle = '#6fb7ff';
      ctx.fillText('STAGE ' + currentStage.worldId + '-' + currentStage.number + '  ' + currentStage.name.toUpperCase(), centerX, centerY + 58);
    }
    ctx.globalAlpha = 1;
  }

  function drawToast() {
    if (toast.time <= 0) {
      return;
    }
    ctx.globalAlpha = Math.min(toast.time / 0.4, 1);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 18px ' + KANJI_FONT;
    ctx.fillStyle = '#000000';
    ctx.fillText(toast.text, viewWidth / 2 + 1, 71);
    ctx.fillStyle = toast.color;
    ctx.fillText(toast.text, viewWidth / 2, 70);
    ctx.globalAlpha = 1;
  }

  // Small hint at the bottom while the finger is down but shooting is paused by a fast swipe
  function drawFirePaused() {
    if (currentState !== STATE_PLAYING || !player.isDragging || player.fireHeld) {
      return;
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 11px "Courier New", monospace';
    ctx.fillStyle = '#000000';
    ctx.fillText('HOLD FIRE', viewWidth / 2 + 1, viewHeight - 11);
    ctx.fillStyle = '#8f99a8';
    ctx.fillText('HOLD FIRE', viewWidth / 2, viewHeight - 12);
  }

  // Small label in the bottom-left corner while a power-up weapon is active
  function drawWeaponLabel() {
    var level = weaponLevel();
    if (level < 2 || currentState === STATE_GAME_OVER) {
      return;
    }
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 11px "Courier New", monospace';
    ctx.fillStyle = '#000000';
    ctx.fillText(level === 3 ? 'TRIPLE SHOT' : 'DOUBLE SHOT', 9, viewHeight - 11);
    ctx.fillStyle = level === 3 ? '#ff6b86' : '#ffd21f';
    ctx.fillText(level === 3 ? 'TRIPLE SHOT' : 'DOUBLE SHOT', 8, viewHeight - 12);
  }

  function drawOverlayText(title, subtitle, color) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, viewWidth, viewHeight);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = color;
    ctx.font = 'bold 32px "Courier New", monospace';
    ctx.fillText(title, viewWidth / 2, viewHeight / 2 - 20);
    if (subtitle) {
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px "Courier New", monospace';
      ctx.fillText(subtitle, viewWidth / 2, viewHeight / 2 + 16);
    }
  }

  function render() {
    ctx.fillStyle = '#050508';
    ctx.fillRect(0, 0, viewWidth, viewHeight);

    // Stars
    ctx.fillStyle = '#ffffff';
    for (var i = 0; i < stars.length; i++) {
      var star = stars[i];
      ctx.fillRect(Math.round(star.x), Math.round(star.y), star.size, star.size);
    }

    // Bullets
    ctx.fillStyle = '#ffd21f';
    for (var b = 0; b < bullets.length; b++) {
      ctx.fillRect(Math.round(bullets[b].x) - 1, Math.round(bullets[b].y), 3, 10);
    }

    // Enemies
    for (var e = 0; e < enemies.length; e++) {
      drawEnemy(enemies[e]);
    }

    if (currentState !== STATE_GAME_OVER) {
      drawShip();
    }

    // Particles
    for (var p = 0; p < particles.length; p++) {
      ctx.fillStyle = particles[p].color;
      ctx.fillRect(Math.round(particles[p].x), Math.round(particles[p].y), 3, 3);
    }

    // Red flash when hurt
    if (damageFlash > 0) {
      ctx.fillStyle = 'rgba(255, 30, 70, ' + Math.min(damageFlash * 1.2, 0.3) + ')';
      ctx.fillRect(0, 0, viewWidth, viewHeight);
    }

    drawQuestion();
    drawToast();
    drawWaveBanner();
    drawWeaponLabel();
    drawFirePaused();

    if (currentState === STATE_PAUSED) {
      drawOverlayText('PAUSED', 'Press RESUME to continue', '#ffd21f');
    } else if (currentState === STATE_STAGE_COMPLETE) {
      // Temporary text only: the real Stage Clear screen is built in a later step
      drawOverlayText('STAGE COMPLETE', 'ALL ' + stageWaves.length + ' WAVES CLEARED', '#5dff8a');
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 14px "Courier New", monospace';
      ctx.fillText('SCORE ' + score + '   BEST ' + bestScore, viewWidth / 2, viewHeight / 2 + 44);
      ctx.fillStyle = '#6fb7ff';
      ctx.fillText('PRESS MENU TO EXIT', viewWidth / 2, viewHeight / 2 + 68);
    } else if (currentState === STATE_GAME_OVER) {
      drawOverlayText('GAME OVER', 'SCORE ' + score + '   BEST ' + bestScore, '#ff6b86');
      ctx.fillStyle = '#6fb7ff';
      ctx.font = 'bold 14px "Courier New", monospace';
      ctx.fillText('TAP THE SCREEN TO PLAY AGAIN', viewWidth / 2, viewHeight / 2 + 48);
      if (newBest) {
        ctx.fillStyle = '#ffd21f';
        ctx.fillText('NEW BEST SCORE!', viewWidth / 2, viewHeight / 2 + 72);
      }
    }
  }

  // ---------- Input ----------
  function getPointerX(event) {
    var rect = canvas.getBoundingClientRect();
    return clampX(event.clientX - rect.left);
  }

  function resetDrag() {
    player.isDragging = false;
    player.pointerId = null;
    player.fireHeld = false;
    player.fingerSpeed = 0;
    player.moveAccum = 0;
  }

  canvas.addEventListener('pointerdown', function (event) {
    if (event.pointerType === 'mouse' && event.button !== 0) {
      return;
    }
    if (currentState === STATE_GAME_OVER) {
      // Short delay so a finishing tap does not restart the game by accident
      if (performance.now() - gameOverAt > 700) {
        restartCurrentStage();
      }
      event.preventDefault();
      return;
    }
    if (currentState !== STATE_PLAYING) {
      return;
    }
    // Follow only the first finger so a second finger cannot make the ship jump
    if (player.isDragging) {
      return;
    }
    player.isDragging = true;
    player.pointerId = event.pointerId;
    var touchX = event.clientX - canvas.getBoundingClientRect().left;
    player.dragPointerX = touchX;
    player.dragShipX = player.targetX;
    player.lastFingerX = touchX;
    player.moveAccum = 0;
    player.fingerSpeed = 0;
    player.fireHeld = true; // the first shot comes the moment the finger touches
    if (!RELATIVE_CONTROL) {
      player.targetX = getPointerX(event);
    }
    if (canvas.setPointerCapture) {
      try {
        canvas.setPointerCapture(event.pointerId);
      } catch (error) {
        /* ignore */
      }
    }
    event.preventDefault();
  });

  canvas.addEventListener('pointermove', function (event) {
    if (currentState !== STATE_PLAYING || !player.isDragging) {
      return;
    }
    if (event.pointerId !== player.pointerId) {
      return;
    }
    var moveX = event.clientX - canvas.getBoundingClientRect().left;
    player.moveAccum += Math.abs(moveX - player.lastFingerX); // used to measure the finger speed
    player.lastFingerX = moveX;
    if (RELATIVE_CONTROL) {
      var wantedX = player.dragShipX + (moveX - player.dragPointerX) * CONTROL_SENSITIVITY;
      var limitedX = clampX(wantedX);
      // At the screen edge the touch anchor slides along, so the ship comes back as soon as the finger does
      player.dragShipX += limitedX - wantedX;
      player.targetX = limitedX;
    } else {
      player.targetX = getPointerX(event);
    }
    event.preventDefault();
  });

  // Finger lifted, pointer cancelled by the browser or capture lost: stop following it
  function stopDragging(event) {
    if (event && player.pointerId !== null && event.pointerId !== player.pointerId) {
      return;
    }
    resetDrag();
  }

  canvas.addEventListener('pointerup', stopDragging);
  canvas.addEventListener('pointercancel', stopDragging);
  canvas.addEventListener('lostpointercapture', stopDragging);
  window.addEventListener('pointerup', stopDragging);
  window.addEventListener('pointercancel', stopDragging);

  // Prevent page scrolling / long-press menu while playing
  canvas.addEventListener('touchmove', function (event) {
    event.preventDefault();
  }, { passive: false });
  canvas.addEventListener('contextmenu', function (event) {
    event.preventDefault();
  });

  function lockPageScroll() {
    try {
      document.documentElement.style.overscrollBehavior = 'none';
      document.body.style.overscrollBehavior = 'none';
    } catch (error) {
      /* ignore */
    }
  }

  // Keyboard (for computers)
  window.addEventListener('keydown', function (event) {
    if (currentState !== STATE_PLAYING) {
      return;
    }
    if (event.key === 'ArrowLeft') {
      player.targetX = clampX(player.targetX - 40);
    } else if (event.key === 'ArrowRight') {
      player.targetX = clampX(player.targetX + 40);
    }
  });

  // ---------- Buttons ----------
  startGameButton.addEventListener('click', startGame);
  backToMenuButton.addEventListener('click', backToMenu);
  pauseButton.addEventListener('click', togglePause);

  kanjiCollectionButton.addEventListener('click', showCollection);
  settingsButton.addEventListener('click', showSettings);
  collectionBackButton.addEventListener('click', showMenu);
  settingsBackButton.addEventListener('click', showMenu);

  soundToggleButton.addEventListener('click', function () {
    soundEnabled = !soundEnabled;
    writeStorage(KEY_SOUND, soundEnabled ? 'on' : 'off');
    updateSoundButton();
    if (soundEnabled) {
      playCorrectSound();
    }
  });

  resetProgressButton.addEventListener('click', function () {
    if (!window.confirm('Бүх хадгалсан ахиц болон дээд оноог устгах уу?')) {
      return;
    }
    progress = {};
    bestScore = 0;
    removeStorage(KEY_PROGRESS);
    removeStorage(KEY_BEST);
    campaign = freshCampaign();
    campaignReadOnly = false;
    removeStorage(KEY_CAMPAIGN);
    removeStorage(KEY_CAMPAIGN + 'Corrupt');
    settingsMessage.textContent = 'PROGRESS RESET';
  });

  // ---------- Window events ----------
  // All size changes go through one throttled function (at most one resize per frame)
  var resizePending = false;
  function scheduleResize() {
    if (resizePending) {
      return;
    }
    resizePending = true;
    requestAnimationFrame(function () {
      resizePending = false;
      if (currentState !== STATE_MENU) {
        resizeCanvas();
      }
    });
  }

  window.addEventListener('resize', scheduleResize);
  window.addEventListener('orientationchange', function () {
    setTimeout(scheduleResize, 200);
  });
  if (typeof window.ResizeObserver === 'function') {
    new window.ResizeObserver(scheduleResize).observe(canvas.parentElement);
  }

  // Pause automatically when the page is hidden
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      pauseGame();
    }
  });

  // ---------- Start ----------
  lockPageScroll();
  loadSavedData();
  updateSoundButton();
  updateHud();
  showMenu();
})();
