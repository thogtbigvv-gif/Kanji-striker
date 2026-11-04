/* KANJI STRIKER - v0.1.0
   Menu, game screen, moving starfield and player ship with touch/mouse/keyboard control. */

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
      player.x = (player.x / oldWidth) * viewWidth;
      player.targetX = (player.targetX / oldWidth) * viewWidth;
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

  function render() {
    ctx.fillStyle = '#050508';
    ctx.fillRect(0, 0, viewWidth, viewHeight);

    // Stars
    ctx.fillStyle = '#ffffff';
    for (var i = 0; i < stars.length; i++) {
      var star = stars[i];
      ctx.fillRect(Math.round(star.x), Math.round(star.y), star.size, star.size);
    }

    drawShip();

    if (currentState === STATE_PAUSED) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
      ctx.fillRect(0, 0, viewWidth, viewHeight);
      ctx.fillStyle = '#ffd21f';
      ctx.font = 'bold 28px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('PAUSED', viewWidth / 2, viewHeight / 2);
    }
  }

  // ---------- Input ----------
  function getPointerX(event) {
    var rect = canvas.getBoundingClientRect();
    return event.clientX - rect.left;
  }

  canvas.addEventListener('pointerdown', function (event) {
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
  updateHud();
  showMenu();
})();
