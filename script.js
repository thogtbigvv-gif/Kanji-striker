/* KANJI STRIKER - Phase 04 (logic fixes)
   Kanji collection, saved progress, settings, sound effects and learning messages. */

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

  var currentState = STATE_MENU;
  var animationFrameId = null;
  var lastTime = 0;
  var totalTime = 0;

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
    pointerId: null
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
  var MASTERED_HITS = 3;

  var question = KANJI_LIST[0];
  var enemies = [];
  var bullets = [];
  var particles = [];
  var spawnTimer = 0;
  var fireTimer = 0;
  var damageFlash = 0;
  var gameOverAt = 0;
  var bestScore = 0;
  var newBest = false;
  var toast = { text: '', color: '#ffffff', time: 0 };
  var progress = {};
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
        if (parsed && typeof parsed === 'object') {
          progress = parsed;
        }
      } catch (error) {
        progress = {};
      }
    }

    soundEnabled = readStorage(KEY_SOUND) !== 'off';
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
    if (!progress[kanji]) {
      progress[kanji] = { hits: 0, misses: 0 };
    }
    return progress[kanji];
  }

  function recordHit(kanji) {
    getEntry(kanji).hits += 1;
    saveProgress();
  }

  function recordMiss(kanji) {
    getEntry(kanji).misses += 1;
    saveProgress();
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

    var dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;

    var oldWidth = viewWidth;
    viewWidth = width;
    viewHeight = height;

    player.y = viewHeight - 60;
    if (oldWidth > 0) {
      var ratio = viewWidth / oldWidth;
      player.x = player.x * ratio;
      player.targetX = player.targetX * ratio;
      for (var i = 0; i < enemies.length; i++) {
        enemies[i].x *= ratio;
      }
      for (var j = 0; j < bullets.length; j++) {
        bullets[j].x *= ratio;
      }
    } else {
      player.x = viewWidth / 2;
      player.targetX = player.x;
    }

    createStars();
  }

  // ---------- Game control ----------
  function startGame() {
    hp = 100;
    score = 0;
    combo = 0;
    updateHud();
    getAudio();

    enemies = [];
    bullets = [];
    particles = [];
    spawnTimer = 0;
    fireTimer = 0;
    damageFlash = 0;
    toast.time = 0;
    newBest = false;
    totalTime = 0;
    pickQuestion();

    currentState = STATE_PLAYING;
    pauseButton.textContent = 'PAUSE';
    pauseButton.setAttribute('aria-label', 'Pause game');

    showGame();
    viewWidth = 0;
    resizeCanvas();

    player.isDragging = false;
    player.pointerId = null;
    startLoop();
  }

  function backToMenu() {
    if (currentState === STATE_PLAYING || currentState === STATE_PAUSED) {
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
  function pickQuestion() {
    var next = question;
    while (next === question) {
      next = KANJI_LIST[Math.floor(Math.random() * KANJI_LIST.length)];
    }
    question = next;
  }

  function questionIsOnScreen() {
    for (var i = 0; i < enemies.length; i++) {
      if (enemies[i].data === question) {
        return true;
      }
    }
    return false;
  }

  function spawnEnemy() {
    var data;
    if (!questionIsOnScreen() || Math.random() < 0.3) {
      data = question;
    } else {
      data = KANJI_LIST[Math.floor(Math.random() * KANJI_LIST.length)];
    }
    var margin = ENEMY_WIDTH / 2 + 4;
    enemies.push({
      data: data,
      x: margin + Math.random() * (viewWidth - margin * 2),
      y: -ENEMY_HEIGHT
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
      player.isDragging = false;
      player.pointerId = null;
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
    combo += 1;
    var points = 10 * combo;
    score += points;
    recordHit(data.kanji);
    showToast(data.kanji + ' = ' + data.meaning.toUpperCase() + '   +' + points, '#5dff8a');
    playCorrectSound();
    pickQuestion();
    updateHud();
  }

  function wrongHit(data) {
    recordMiss(question.kanji);
    showToast(data.kanji + ' = ' + data.meaning.toUpperCase(), '#ff6b86');
    loseHp(10, true);
    if (currentState !== STATE_GAME_OVER) {
      playWrongSound();
    }
  }

  function updateGameplay(dt) {
    var enemySpeed = 60 + Math.min(score * 0.3, 90);
    var i;
    var j;

    // Auto-fire
    fireTimer -= dt;
    if (fireTimer <= 0) {
      fireTimer = 0.25;
      bullets.push({ x: player.x, y: player.y - SHIP_HEIGHT / 2 });
    }

    // Spawn enemies
    spawnTimer -= dt;
    if (spawnTimer <= 0) {
      spawnTimer = 1.3;
      spawnEnemy();
    }

    // Move bullets
    for (i = bullets.length - 1; i >= 0; i--) {
      bullets[i].y -= 480 * dt;
      if (bullets[i].y < -10) {
        bullets.splice(i, 1);
      }
    }

    // Move enemies
    for (i = enemies.length - 1; i >= 0; i--) {
      var enemy = enemies[i];
      enemy.y += enemySpeed * dt;

      // Enemy reached the bottom
      if (enemy.y > viewHeight) {
        var wasAnswer = enemy.data === question;
        enemies.splice(i, 1);
        if (wasAnswer) {
          recordMiss(question.kanji);
          showToast(question.kanji + ' = ' + question.meaning.toUpperCase(), '#ff6b86');
          loseHp(10);
          if (currentState === STATE_GAME_OVER) {
            return;
          }
        }
        continue;
      }

      // Enemy crashed into the player
      if (
        Math.abs(enemy.x - player.x) < (ENEMY_WIDTH + SHIP_WIDTH) / 2 - 4 &&
        enemy.y + ENEMY_HEIGHT > player.y - SHIP_HEIGHT / 2 &&
        enemy.y < player.y + SHIP_HEIGHT / 2
      ) {
        enemies.splice(i, 1);
        burst(enemy.x, enemy.y + ENEMY_HEIGHT / 2, '#ff6b86');
        loseHp(15);
        if (currentState === STATE_GAME_OVER) {
          return;
        }
      }
    }

    // Bullets hitting enemies
    for (i = bullets.length - 1; i >= 0; i--) {
      for (j = enemies.length - 1; j >= 0; j--) {
        var b = bullets[i];
        var e = enemies[j];
        if (
          b.x > e.x - ENEMY_WIDTH / 2 &&
          b.x < e.x + ENEMY_WIDTH / 2 &&
          e.y > KANJI_VISIBLE_Y &&
          b.y > e.y &&
          b.y < e.y + ENEMY_HEIGHT
        ) {
          bullets.splice(i, 1);
          enemies.splice(j, 1);
          if (e.data === question) {
            burst(e.x, e.y + ENEMY_HEIGHT / 2, '#5dff8a');
            correctHit(e.data);
          } else {
            burst(e.x, e.y + ENEMY_HEIGHT / 2, '#ff6b86');
            wrongHit(e.data);
            if (currentState === STATE_GAME_OVER) {
              return;
            }
          }
          break;
        }
      }
    }
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
    } else if (currentState === STATE_GAME_OVER) {
      updateEffects(dt);
    }
    render();

    if (currentState !== STATE_MENU) {
      animationFrameId = requestAnimationFrame(gameLoop);
    }
  }

  function update(dt) {
    totalTime += dt;

    // Smooth movement toward the target position
    player.x += (player.targetX - player.x) * 0.2;

    var halfShip = SHIP_WIDTH / 2;
    if (player.x < halfShip) {
      player.x = halfShip;
    }
    if (player.x > viewWidth - halfShip) {
      player.x = viewWidth - halfShip;
    }

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

    if (currentState === STATE_PAUSED) {
      drawOverlayText('PAUSED', 'Press RESUME to continue', '#ffd21f');
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
    return event.clientX - rect.left;
  }

  canvas.addEventListener('pointerdown', function (event) {
    if (currentState === STATE_GAME_OVER) {
      // Short delay so a finishing tap does not restart the game by accident
      if (performance.now() - gameOverAt > 700) {
        startGame();
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
    player.targetX = getPointerX(event);
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
    player.targetX = getPointerX(event);
    event.preventDefault();
  });

  function stopDragging(event) {
    if (event && player.pointerId !== null && event.pointerId !== player.pointerId) {
      return;
    }
    player.isDragging = false;
    player.pointerId = null;
  }

  canvas.addEventListener('pointerup', stopDragging);
  canvas.addEventListener('pointercancel', stopDragging);
  window.addEventListener('pointerup', stopDragging);

  // Keyboard (for computers)
  window.addEventListener('keydown', function (event) {
    if (currentState !== STATE_PLAYING) {
      return;
    }
    if (event.key === 'ArrowLeft') {
      player.targetX -= 40;
    } else if (event.key === 'ArrowRight') {
      player.targetX += 40;
    }
    if (player.targetX < 0) {
      player.targetX = 0;
    }
    if (player.targetX > viewWidth) {
      player.targetX = viewWidth;
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
    settingsMessage.textContent = 'PROGRESS RESET';
  });

  // ---------- Window events ----------
  window.addEventListener('resize', function () {
    if (currentState !== STATE_MENU) {
      resizeCanvas();
    }
  });

  window.addEventListener('orientationchange', function () {
    if (currentState !== STATE_MENU) {
      setTimeout(resizeCanvas, 200);
    }
  });

  // Pause automatically when the page is hidden
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      pauseGame();
    }
  });

  // ---------- Start ----------
  loadSavedData();
  updateSoundButton();
  updateHud();
  showMenu();
})();
