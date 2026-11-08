'use strict';
/* js/render.js - screen switching, HUD, canvas size and everything that is drawn.
   Load after game.js. */

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
  resultsSection.hidden = section !== resultsSection;
  galaxySection.hidden = section !== galaxySection;
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

// ---------- Galaxy map screen ----------
function starText(count) {
  var text = '';
  for (var i = 0; i < 3; i++) {
    text += i < count ? '\u2605' : '\u2606';
  }
  return text;
}

function makeStageRow(stage, continueId) {
  var done = isStageCompleted(stage.id);
  var playable = isStagePlayable(stage.id) || (stage.id === debugStageId && stage.ready);
  var row = document.createElement('button');
  row.type = 'button';
  row.className = 'stage-row';
  if (done) {
    row.className += ' is-done';
  }
  if (stage.id === continueId && playable) {
    row.className += ' is-current';
  }
  if (!playable) {
    row.className += ' is-locked';
    row.disabled = true;
  }

  var num = document.createElement('span');
  num.className = 'stage-num';
  num.textContent = stage.boss ? 'B' : String(stage.number);
  var name = document.createElement('span');
  name.className = 'stage-name';
  name.textContent = stage.name.toUpperCase();
  var status = document.createElement('span');
  status.className = 'stage-status';
  var progressInfo = getStageProgress(stage.id);
  if (done) {
    status.textContent = starText(progressInfo.stars);
  } else {
    status.textContent = playable ? 'PLAY' : 'LOCKED';
  }
  row.appendChild(num);
  row.appendChild(name);
  row.appendChild(status);
  row.setAttribute('aria-label', 'World ' + stage.worldId + ' stage ' + stage.number + ' ' + stage.name +
    (playable ? '' : ' (locked)'));

  if (playable) {
    row.addEventListener('click', function () {
      startStage(stage.id);
    });
  }
  return row;
}

function buildGalaxyMap() {
  while (galaxyList.firstChild) {
    galaxyList.removeChild(galaxyList.firstChild);
  }
  var continueId = getContinueStageId();
  var totalStars = 0;
  var maxStars = 0;

  for (var w = 0; w < CAMPAIGN_WORLDS.length; w++) {
    var world = CAMPAIGN_WORLDS[w];
    var unlocked = world.ready && isWorldUnlocked(world.id);
    var worldStars = 0;
    var card = document.createElement('div');
    card.className = 'world-card' + (unlocked ? '' : ' is-locked');

    var head = document.createElement('div');
    head.className = 'world-head';
    var title = document.createElement('span');
    title.className = 'world-title';
    title.textContent = 'WORLD ' + world.id + ' - ' + world.name.toUpperCase();
    var level = document.createElement('span');
    level.className = 'world-level';
    level.textContent = world.jlpt;
    head.appendChild(title);
    head.appendChild(level);
    card.appendChild(head);

    var info = document.createElement('p');
    info.className = 'world-info';
    card.appendChild(info);

    if (!world.ready) {
      info.textContent = 'COMING SOON';
    } else {
      for (var s = 0; s < world.stages.length; s++) {
        var stage = world.stages[s];
        worldStars += getStageProgress(stage.id).stars;
        maxStars += 3;
        card.appendChild(makeStageRow(stage, continueId));
      }
      totalStars += worldStars;
      info.textContent = unlocked
        ? worldStars + ' / ' + (world.stages.length * 3) + ' STARS'
        : 'LOCKED - CLEAR WORLD ' + (world.id - 1) + ' FIRST';
    }
    galaxyList.appendChild(card);
  }
  galaxySummary.textContent = 'STARS ' + totalStars + ' / ' + maxStars;
}

function showGalaxyMap() {
  buildGalaxyMap();
  showOnly(galaxySection, true);
  var current = galaxyList.querySelector('.stage-row.is-current');
  galaxyList.scrollTop = 0;
  if (current) {
    // put the stage the player should play next in the middle of the list
    galaxyList.scrollTop = Math.max(0, current.offsetTop - galaxyList.clientHeight / 2 + current.offsetHeight / 2);
  }
}

// ---------- Stage results screen ----------
function fillChips(container, kanjiList) {
  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }
  if (kanjiList.length === 0) {
    var none = document.createElement('span');
    none.className = 'chip-empty';
    none.textContent = '-';
    container.appendChild(none);
    return;
  }
  for (var i = 0; i < kanjiList.length; i++) {
    var item = KANJI_BY_CHAR[kanjiList[i]];
    var chip = document.createElement('span');
    chip.className = 'chip';
    var charSpan = document.createElement('span');
    charSpan.className = 'chip-char';
    charSpan.textContent = kanjiList[i];
    var meaningSpan = document.createElement('span');
    meaningSpan.className = 'chip-meaning';
    meaningSpan.textContent = item ? item.meaning : '';
    chip.appendChild(charSpan);
    chip.appendChild(meaningSpan);
    container.appendChild(chip);
  }
}

function showResults() {
  if (!stageResult || !currentStage) {
    backToMenu();
    return;
  }
  var r = stageResult;
  var slots = resultsStars.querySelectorAll('.star-slot');
  for (var s = 0; s < slots.length; s++) {
    slots[s].className = s < r.stars ? 'star-slot is-earned' : 'star-slot';
  }
  resultsStars.setAttribute('aria-label', r.stars + ' of 3 stars');

  resultsKicker.textContent = 'WORLD ' + r.worldId + ' - STAGE ' + r.stageNumber;
  resultsTitle.textContent = r.boss ? 'BOSS DEFEATED' : 'STAGE CLEAR';
  resultsStageName.textContent = currentStage.name.toUpperCase();
  resultsBadge.hidden = !newBest;

  resStatScore.textContent = String(r.score);
  resStatDefeated.textContent = String(r.correct + r.wrong);
  resStatAccuracy.textContent = r.accuracy + '%';
  resStatCorrect.textContent = String(r.correct);
  resStatIncorrect.textContent = String(r.wrong + r.missed);
  resStatCombo.textContent = 'x' + r.maxCombo;
  resStatHp.textContent = String(r.hp);

  resXpClear.textContent = '+' + r.xpClear;
  resXpAnswersLabel.textContent = 'CORRECT ANSWERS x' + r.correct;
  resXpAnswers.textContent = '+' + r.xpAnswers;
  resXpWavesLabel.textContent = 'WAVES CLEARED x' + r.wavesCleared;
  resXpWaves.textContent = '+' + r.xpWaves;
  resXpBonus.textContent = '+' + r.xpBonus;
  resXpTotal.textContent = '+' + r.xpTotal + ' XP';
  resXpOverall.textContent = 'TOTAL XP ' + totalXp;

  // Kanji learning summary
  var newList = [];
  var correctList = [];
  var wrongList = [];
  var reviewList = [];
  var k;
  for (k in runKanji) {
    if (!Object.prototype.hasOwnProperty.call(runKanji, k)) {
      continue;
    }
    if (runKanji[k].correct > 0) {
      correctList.push(k);
      if (!priorHits[k]) {
        newList.push(k);
      }
    }
    if (runKanji[k].wrong > 0) {
      wrongList.push(k);
    }
  }
  for (var q = 0; q < questionPool.length; q++) {
    var entry = progress[questionPool[q].kanji];
    if (entry && entry.misses > entry.hits) {
      reviewList.push(questionPool[q].kanji);
    }
  }
  fillChips(learnNewChips, newList);
  fillChips(learnCorrectChips, correctList);
  fillChips(learnWrongChips, wrongList);
  fillChips(learnReviewChips, reviewList);

  // What comes next
  var nextId = getNextStageId(r.stageId);
  resultsNextButton.hidden = nextId === null;
  if (nextId !== null) {
    var nextStage = CAMPAIGN_STAGES[nextId];
    resultsNext.textContent = 'NEXT: WORLD ' + nextStage.worldId + ' - STAGE ' + nextStage.number + '  ' + nextStage.name.toUpperCase();
  } else {
    resultsNext.textContent = 'NO MORE STAGES READY YET. NEW GALAXIES ARE COMING SOON!';
  }
  if (!r.saved) {
    resultsNote.textContent = 'TEST STAGE: PROGRESS WAS NOT SAVED';
  } else if (campaignReadOnly) {
    resultsNote.textContent = 'PROGRESS IS READ-ONLY (SAVED BY A NEWER VERSION)';
  } else {
    resultsNote.textContent = '';
  }

  showOnly(resultsSection, false);
  resultsSection.scrollTop = 0;
  var scroller = document.getElementById('resultsScroll');
  if (scroller) {
    scroller.scrollTop = 0;
  }
  stopLoop(); // nothing is drawn behind the results screen
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
      for (var q = 0; q < powerups.length; q++) {
        powerups[q].x *= ratio;
      }
      for (var r = 0; r < enemyBullets.length; r++) {
        enemyBullets[r].x *= ratio;
      }
      if (boss) {
        boss.x *= ratio;
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

// ---------- Drawing ----------
// Afterimages of a dash: blue silhouettes of the ship that fade out
function drawDashGhosts() {
  for (var g = 0; g < dashGhosts.length; g++) {
    var ghost = dashGhosts[g];
    var ghostLeft = Math.round(ghost.x - SHIP_WIDTH / 2);
    var ghostTop = Math.round(ghost.y - SHIP_HEIGHT / 2);
    ctx.globalAlpha = Math.max(0, ghost.life / 0.25) * 0.4;
    ctx.fillStyle = '#66e0ff';
    for (var row = 0; row < SHIP_PIXELS.length; row++) {
      for (var col = 0; col < SHIP_PIXELS[row].length; col++) {
        if (SHIP_PIXELS[row][col] !== '.') {
          ctx.fillRect(ghostLeft + col * PIXEL, ghostTop + row * PIXEL, PIXEL, PIXEL);
        }
      }
    }
  }
  ctx.globalAlpha = 1;
}

// Thin bar under the ship that fills up while the dash recharges (nothing is shown when the dash is ready)
function drawDashCooldown() {
  if (dashCooldown <= 0 || currentState === STATE_GAME_OVER) {
    return;
  }
  var barWidth = SHIP_WIDTH + 8;
  var barLeft = Math.round(player.x - barWidth / 2);
  var barTop = Math.round(player.y + SHIP_HEIGHT / 2 + 12);
  ctx.fillStyle = 'rgba(143, 153, 168, 0.35)';
  ctx.fillRect(barLeft, barTop, barWidth, 2);
  ctx.fillStyle = '#66e0ff';
  ctx.fillRect(barLeft, barTop, Math.round(barWidth * (1 - dashCooldown / DASH_COOLDOWN)), 2);
}

function drawShip() {
  var left = Math.round(player.x - SHIP_WIDTH / 2);
  var top = Math.round(player.y - SHIP_HEIGHT / 2);
  if (dashInvuln > 0) {
    ctx.globalAlpha = 0.55; // a see-through ship = a ghost: nothing can hurt it
  }

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
  ctx.globalAlpha = 1;
}

// Shield bubble around the ship
function drawShield() {
  if (!shieldActive || currentState === STATE_GAME_OVER) {
    return;
  }
  var pulse = 0.55 + 0.25 * Math.sin(totalTime * 8);
  ctx.strokeStyle = 'rgba(102, 224, 255, ' + pulse + ')';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(player.x, player.y, SHIP_WIDTH * 0.85, 0, Math.PI * 2);
  ctx.stroke();
}

function drawPowerups() {
  var half = POWERUP_SIZE / 2;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 14px "Courier New", monospace';
  for (var i = 0; i < powerups.length; i++) {
    var item = powerups[i];
    var style = POWERUP_STYLE[item.type] || POWERUP_STYLE.slow;
    var left = Math.round(item.x - half);
    var top = Math.round(item.y - half);
    ctx.fillStyle = style.color;
    ctx.fillRect(left, top, POWERUP_SIZE, POWERUP_SIZE);
    ctx.fillStyle = '#0b0b10';
    ctx.fillRect(left + 2, top + 2, POWERUP_SIZE - 4, POWERUP_SIZE - 4);
    ctx.fillStyle = style.color;
    ctx.fillText(style.letter, Math.round(item.x), Math.round(item.y) + 1);
  }
}

// Bottom-right status label while SHIELD or SLOW is active
function drawPowerupStatus() {
  if (currentState === STATE_GAME_OVER) {
    return;
  }
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 11px "Courier New", monospace';
  var y = viewHeight - 12;
  if (slowTimer > 0) {
    var text = 'SLOW ' + Math.ceil(slowTimer) + 's';
    ctx.fillStyle = '#000000';
    ctx.fillText(text, viewWidth - 7, y + 1);
    ctx.fillStyle = '#c58bff';
    ctx.fillText(text, viewWidth - 8, y);
    y -= 14;
  }
  if (shieldActive) {
    ctx.fillStyle = '#000000';
    ctx.fillText('SHIELD', viewWidth - 7, y + 1);
    ctx.fillStyle = '#66e0ff';
    ctx.fillText('SHIELD', viewWidth - 8, y);
  }
}

function drawEnemy(enemy) {
  var def = ENEMY_KINDS[enemy.kind] || ENEMY_KINDS.normal;
  var colors = enemy.hitFlash > 0 ? ENEMY_FLASH_COLORS : def.colors;
  var spriteWidth = ENEMY_PIXELS[0].length * ENEMY_PIXEL;

  // Everything below is drawn for a normal-size ship at (0, 0) = top centre; scale() makes other kinds bigger/smaller
  ctx.save();
  ctx.translate(Math.round(enemy.x), Math.round(enemy.y));
  ctx.scale(def.scale, def.scale);
  var left = -spriteWidth / 2;

  // Speed lines behind a fast ship
  if (enemy.kind === 'fast') {
    var trail = Math.floor(totalTime * 24) % 2 === 0 ? 14 : 20;
    ctx.fillStyle = 'rgba(255, 154, 60, 0.55)';
    ctx.fillRect(-12, -trail, 3, trail - 2);
    ctx.fillRect(-1, -trail - 4, 3, trail + 2);
    ctx.fillRect(10, -trail, 3, trail - 2);
  }

  for (var row = 0; row < ENEMY_PIXELS.length; row++) {
    for (var col = 0; col < ENEMY_PIXELS[row].length; col++) {
      var key = ENEMY_PIXELS[row][col];
      if (key === '.') {
        continue;
      }
      ctx.fillStyle = colors[key];
      ctx.fillRect(left + col * ENEMY_PIXEL, row * ENEMY_PIXEL, ENEMY_PIXEL, ENEMY_PIXEL);
    }
  }

  // Kanji plate
  var plateTop = ENEMY_PIXELS.length * ENEMY_PIXEL + 4;
  var plateHeight = ENEMY_HEIGHT - plateTop;
  var plateLeft = -ENEMY_WIDTH / 2;
  ctx.fillStyle = '#0b0b10';
  ctx.fillRect(plateLeft, plateTop, ENEMY_WIDTH, plateHeight);
  ctx.strokeStyle = def.border;
  ctx.lineWidth = 2;
  ctx.strokeRect(plateLeft, plateTop, ENEMY_WIDTH, plateHeight);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 24px ' + KANJI_FONT;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(enemy.data.kanji, 0, plateTop + plateHeight / 2 + 1);

  // Armor pips above a big ship: one filled pip for every hit it can still take
  if (def.armor > 1) {
    for (var p = 0; p < def.armor; p++) {
      ctx.fillStyle = p < enemy.armor ? '#b99bff' : 'rgba(185, 155, 255, 0.25)';
      ctx.fillRect(-9 + p * 11, -7, 8, 3);
    }
  }

  // Gun under the plate of a shooting ship; it flashes white just before the shot
  if (enemy.shooter) {
    var aboutToFire = enemy.fireTimer < 0.35 && enemy.y >= ENEMY_FIRE_MIN_Y;
    ctx.fillStyle = aboutToFire ? '#ffffff' : '#ff4d6d';
    ctx.fillRect(-6, ENEMY_HEIGHT, 12, aboutToFire ? 6 : 3);
  }
  ctx.restore();
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
    ctx.fillText(stageWaves[waveState.index] && stageWaves[waveState.index].boss ? 'BOSS BATTLE' : 'WAVE ' + (waveState.index + 1) + '/' + stageWaves.length, 8, 13);
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
  var title = def.boss ? 'WARNING!' : 'WAVE ' + (waveState.index + 1);

  ctx.globalAlpha = alpha;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.font = 'bold 34px "Courier New", monospace';
  ctx.fillStyle = '#000000';
  ctx.fillText(title, centerX + 2, centerY + 2);
  ctx.fillStyle = def.boss ? '#ff4d6d' : '#ffd21f';
  ctx.fillText(title, centerX, centerY);

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

// While the finger is down but the ship is not shooting: a small bar above the ship fills up while
// the finger rests (AIM_DELAY), and a short hint is shown at the bottom
function drawFirePaused() {
  if (currentState !== STATE_PLAYING || !player.isDragging || player.fireHeld) {
    return;
  }
  var barWidth = SHIP_WIDTH + 8;
  var barLeft = Math.round(player.x - barWidth / 2);
  var barTop = Math.round(player.y - SHIP_HEIGHT / 2 - 12);
  ctx.fillStyle = 'rgba(143, 153, 168, 0.35)';
  ctx.fillRect(barLeft, barTop, barWidth, 3);
  ctx.fillStyle = '#ffd21f';
  ctx.fillRect(barLeft, barTop, Math.round(barWidth * Math.min(player.aimTimer / AIM_DELAY, 1)), 3);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 11px "Courier New", monospace';
  ctx.fillStyle = '#000000';
  ctx.fillText('HOLD STILL TO FIRE', viewWidth / 2 + 1, viewHeight - 11);
  ctx.fillStyle = '#8f99a8';
  ctx.fillText('HOLD STILL TO FIRE', viewWidth / 2, viewHeight - 12);
}

// Small label in the bottom-left corner while a power-up weapon is active
function drawWeaponLabel() {
  var level = weaponLevel();
  if (level < 2 || currentState === STATE_GAME_OVER) {
    return;
  }
  var text = WEAPON_NAMES[level] + (powerLevel > 0 ? ' +P' + powerLevel : '');
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 11px "Courier New", monospace';
  ctx.fillStyle = '#000000';
  ctx.fillText(text, 9, viewHeight - 11);
  ctx.fillStyle = WEAPON_COLORS[level];
  ctx.fillText(text, 8, viewHeight - 12);
}

function drawBoss() {
  if (!boss) {
    return;
  }
  if (boss.state === 'dying' && Math.floor(totalTime * 20) % 2 === 0) {
    return; // blinks while it explodes
  }
  var colors = boss.flash > 0 ? BOSS_FLASH_COLORS : BOSS_COLORS[boss.phase - 1];
  var left = Math.round(boss.x - BOSS_W / 2);
  var top = Math.round(boss.y);
  for (var row = 0; row < BOSS_PIXELS.length; row++) {
    for (var col = 0; col < BOSS_PIXELS[row].length; col++) {
      var key = BOSS_PIXELS[row][col];
      if (key === '.') {
        continue;
      }
      ctx.fillStyle = colors[key];
      ctx.fillRect(left + col * BOSS_PIXEL, top + row * BOSS_PIXEL, BOSS_PIXEL, BOSS_PIXEL);
    }
  }
}

// Boss life bar under the question banner
function drawBossBar() {
  if (!boss) {
    return;
  }
  var left = 52;
  var width = viewWidth - left - 10;
  var top = 53;
  var height = 8;
  ctx.fillStyle = 'rgba(11, 11, 16, 0.85)';
  ctx.fillRect(left - 1, top - 1, width + 2, height + 2);
  var ratio = Math.max(0, boss.hp / boss.maxHp);
  ctx.fillStyle = BOSS_COLORS[boss.phase - 1].R;
  ctx.fillRect(left, top, Math.round(width * ratio), height);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 11px "Courier New", monospace';
  ctx.fillStyle = '#000000';
  ctx.fillText('BOSS', 11, top + height / 2 + 1);
  ctx.fillStyle = '#ff6b86';
  ctx.fillText('BOSS', 10, top + height / 2);
}

// Shots of the enemies and the boss
function drawEnemyBullets() {
  for (var i = 0; i < enemyBullets.length; i++) {
    var eb = enemyBullets[i];
    var x = Math.round(eb.x);
    var y = Math.round(eb.y);
    ctx.fillStyle = '#ff2d55';
    ctx.fillRect(x - ENEMY_BULLET_W / 2, y, ENEMY_BULLET_W, ENEMY_BULLET_H);
    ctx.fillStyle = '#ffd1d9';
    ctx.fillRect(x - 1, y + 2, 2, ENEMY_BULLET_H - 4);
  }
}

// Bomb stock in the bottom-left corner (above the weapon label)
function drawBombStock() {
  if (currentState === STATE_GAME_OVER || currentState === STATE_STAGE_COMPLETE) {
    return;
  }
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 11px "Courier New", monospace';
  var text = 'BOMB x' + bombs + (bombs > 0 ? '  (DOUBLE TAP)' : '');
  ctx.fillStyle = '#000000';
  ctx.fillText(text, 9, viewHeight - 27);
  ctx.fillStyle = bombs > 0 ? '#ff6b86' : '#8f99a8';
  ctx.fillText(text, 8, viewHeight - 28);
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

  drawBoss();

  // Bullets
  ctx.fillStyle = '#ffd21f';
  for (var b = 0; b < bullets.length; b++) {
    ctx.fillRect(Math.round(bullets[b].x) - 1, Math.round(bullets[b].y), 3, 10);
  }

  // Enemies
  for (var e = 0; e < enemies.length; e++) {
    drawEnemy(enemies[e]);
  }

  drawEnemyBullets();
  drawPowerups();

  if (currentState !== STATE_GAME_OVER) {
    drawDashGhosts();
    drawShip();
    drawShield();
    drawDashCooldown();
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

  // White flash of a bomb
  if (bombFlash > 0) {
    ctx.fillStyle = 'rgba(255, 255, 255, ' + Math.min(bombFlash / 0.4, 1) * 0.6 + ')';
    ctx.fillRect(0, 0, viewWidth, viewHeight);
  }

  drawQuestion();
  drawBossBar();
  drawToast();
  drawWaveBanner();
  drawWeaponLabel();
  drawBombStock();
  drawPowerupStatus();
  drawFirePaused();

  if (currentState === STATE_PAUSED) {
    drawOverlayText('PAUSED', 'Press RESUME to continue', '#ffd21f');
  } else if (currentState === STATE_STAGE_COMPLETE) {
    // Short celebration text; the results screen opens after STAGE_RESULTS_DELAY seconds
    drawOverlayText(stageResult && stageResult.boss ? 'BOSS DEFEATED' : 'STAGE COMPLETE',
      'ALL ' + stageWaves.length + ' WAVES CLEARED', '#5dff8a');
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px "Courier New", monospace';
    ctx.fillText('SCORE ' + score + '   BEST ' + bestScore, viewWidth / 2, viewHeight / 2 + 44);
    if (stageResult) {
      ctx.fillText('ACCURACY ' + stageResult.accuracy + '%   MAX COMBO x' + stageResult.maxCombo,
        viewWidth / 2, viewHeight / 2 + 66);
    }
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
