/* KANJI STRIKER - Phase 03
   Auto-fire, kanji enemies, meaning question, score/combo/HP, game over and restart. */

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
    isDragging: false
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
    { kanji: '犬', meaning: 'Нохой' },
    { kanji: '雨', meaning: 'Бороо' },
    { kanji: '花', meaning: 'Цэцэг' },
    { kanji: '本', meaning: 'Ном' }
  ];

  var question = KANJI_LIST[0];
  var enemies = [];
  var bullets = [];
  var particles = [];
  var spawnTimer = 0;
  var fireTimer = 0;
  var damageFlash = 0;
  var gameOverAt = 0;
  var bestScore = 0;

  var ENEMY_WIDTH = 44;
  var ENEMY_HEIGHT = 54;
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

  // ---------- Best score (saved in the browser) ----------
  function loadBestScore() {
    try {
      var saved = parseInt(window.localStorage.getItem('kanjiStrikerBestScore'), 10);
      bestScore = isNaN(saved) ? 0 : saved;
    } catch (error) {
      bestScore = 0;
    }
  }

  function saveBestScore() {
    try {
      window.localStorage.setItem('kanjiStrikerBestScore', String(bestScore));
    } catch (error) {
      /* ignore */
    }
  }

  // ---------- Screen switching ----------
  function showMenu() {
    gameSection.hidden = true;
    mainMenuSection.hidden = false;
    appFooter.hidden = false;
  }

  function showGame() {
    mainMenuSection.hidden = true;
    gameSection.hidden = false;
    appFooter.hidden = true;
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

    enemies = [];
    bullets = [];
    particles = [];
    spawnTimer = 0;
    fireTimer = 0;
    damageFlash = 0;
    totalTime = 0;
    pickQuestion();

    currentState = STATE_PLAYING;
    pauseButton.textContent = 'PAUSE';
    pauseButton.setAttribute('aria-label', 'Pause game');

    showGame();
    viewWidth = 0;
    resizeCanvas();

    player.isDragging = false;
    startLoop();
  }

  function backToMenu() {
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

  function loseHp(amount) {
    hp -= amount;
    combo = 0;
    damageFlash = 0.25;
    if (hp <= 0) {
      hp = 0;
      currentState = STATE_GAME_OVER;
      gameOverAt = performance.now();
      player.isDragging = false;
      if (score > bestScore) {
        bestScore = score;
        saveBestScore();
      }
    }
    updateHud();
  }

  function correctHit() {
    combo += 1;
    score += 10 * combo;
    pickQuestion();
    updateHud();
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
          b.y > e.y &&
          b.y < e.y + ENEMY_HEIGHT
        ) {
          bullets.splice(i, 1);
          enemies.splice(j, 1);
          if (e.data === question) {
            burst(e.x, e.y + ENEMY_HEIGHT / 2, '#5dff8a');
            correctHit();
          } else {
            burst(e.x, e.y + ENEMY_HEIGHT / 2, '#ff6b86');
            loseHp(10);
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
    if (dt > 0.05) {
      dt = 0.05;
    }

    if (currentState === STATE_PLAYING) {
      update(dt);
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

    // Scroll the stars downward
    for (var i = 0; i < stars.length; i++) {
      var star = stars[i];
      star.y += star.speed * dt;
      if (star.y > viewHeight) {
        star.y = 0;
        star.x = Math.random() * viewWidth;
      }
    }

    updateGameplay(dt);

    // Particles and damage flash
    if (damageFlash > 0) {
      damageFlash -= dt;
    }
    for (var p = particles.length - 1; p >= 0; p--) {
      var particle = particles[p];
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.life -= dt;
      if (particle.life <= 0) {
        particles.splice(p, 1);
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

    if (currentState === STATE_PAUSED) {
      drawOverlayText('PAUSED', 'Press RESUME to continue', '#ffd21f');
    } else if (currentState === STATE_GAME_OVER) {
      drawOverlayText('GAME OVER', 'SCORE ' + score + '   BEST ' + bestScore, '#ff6b86');
      ctx.fillStyle = '#6fb7ff';
      ctx.font = 'bold 14px "Courier New", monospace';
      ctx.fillText('TAP THE SCREEN TO PLAY AGAIN', viewWidth / 2, viewHeight / 2 + 48);
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
    player.isDragging = true;
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
    player.targetX = getPointerX(event);
    event.preventDefault();
  });

  function stopDragging() {
    player.isDragging = false;
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

  kanjiCollectionButton.addEventListener('click', function () {
    alert('KANJI COLLECTION хэсэг дараагийн хөгжүүлэлтэд нэмэгдэнэ.');
  });

  settingsButton.addEventListener('click', function () {
    alert('SETTINGS хэсэг дараагийн хөгжүүлэлтэд нэмэгдэнэ.');
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
  loadBestScore();
  updateHud();
  showMenu();
})();
