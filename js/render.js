'use strict';
/* js/render.js - screen switching, HUD, canvas size and everything that is drawn.
   Load after game.js. */

// ---------- Small helpers ----------
var STAR_COUNT = 60; // background stars on the game canvas

// Canvas font string: bold monospace text of the given pixel size
function monoFont(size) {
  return 'bold ' + size + 'px "Courier New", monospace';
}

// Removes every child of an element
function clearChildren(element) {
  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }
}

// Creates <tag class="className">text</tag> (text is optional)
function makeEl(tag, className, text) {
  var element = document.createElement(tag);
  element.className = className;
  if (text !== undefined) {
    element.textContent = text;
  }
  return element;
}

// Text with a dark drop shadow: the shadow is drawn first, `offset` pixels right and down (default 1)
// maxWidth (optional): the text is squeezed to fit instead of running off the screen
function drawShadowText(text, x, y, color, offset, maxWidth) {
  var shift = offset === undefined ? 1 : offset;
  ctx.fillStyle = '#000000';
  if (maxWidth) {
    ctx.fillText(text, x + shift, y + shift, maxWidth);
    ctx.fillStyle = color;
    ctx.fillText(text, x, y, maxWidth);
    return;
  }
  ctx.fillText(text, x + shift, y + shift);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

// Pixel-art sprite: rows of characters where '.' is empty.
// palette = object (character -> colour) or one flat colour for every pixel.
function drawSprite(rows, palette, left, top, size) {
  var flat = typeof palette === 'string';
  if (flat) {
    ctx.fillStyle = palette;
  }
  for (var row = 0; row < rows.length; row++) {
    for (var col = 0; col < rows[row].length; col++) {
      var key = rows[row][col];
      if (key === '.') {
        continue;
      }
      if (!flat) {
        ctx.fillStyle = palette[key];
      }
      ctx.fillRect(left + col * size, top + row * size, size, size);
    }
  }
}

// ---------- Learning message (shown under the question) ----------
// lines (optional) = smaller lines under the text, time (optional) = seconds on screen
function showToast(text, color, lines, time) {
  toast.text = text;
  toast.color = color;
  toast.lines = Array.isArray(lines) ? lines : [];
  toast.time = typeof time === 'number' ? time : 1.8;
}

// ---------- Screen switching ----------
function showOnly(section, showFooter) {
  mainMenuSection.hidden = section !== mainMenuSection;
  collectionSection.hidden = section !== collectionSection;
  settingsSection.hidden = section !== settingsSection;
  resultsSection.hidden = section !== resultsSection;
  galaxySection.hidden = section !== galaxySection;
  howSection.hidden = section !== howSection;
  modeSection.hidden = section !== modeSection;
  gameSection.hidden = section !== gameSection;
  appFooter.hidden = !showFooter;
}

function showMenu() {
  updateMenuInfo();
  showOnly(mainMenuSection, true);
}

// Progress strip and the "next stage" line on the main menu
function updateMenuInfo() {
  var earnedStars = 0;
  var maxStars = 0;
  for (var w = 0; w < CAMPAIGN_WORLDS.length; w++) {
    if (!CAMPAIGN_WORLDS[w].ready) {
      continue;
    }
    for (var s = 0; s < CAMPAIGN_WORLDS[w].stages.length; s++) {
      earnedStars += getStageProgress(CAMPAIGN_WORLDS[w].stages[s].id).stars;
      maxStars += 3;
    }
  }
  menuStars.textContent = earnedStars + '/' + maxStars;
  menuXp.textContent = String(totalXp);
  menuBest.textContent = String(bestScore);

  var nextId = getContinueStageId();
  var next = nextId ? CAMPAIGN_STAGES[nextId] : null;
  if (!next) {
    menuNext.textContent = '';
  } else if (isStageCompleted(nextId)) {
    menuNext.textContent = 'All ready stages cleared. Replay any stage from the map.';
  } else {
    menuNext.textContent = 'Next: World ' + next.worldId + ', stage ' + next.number + ' - ' + next.name;
  }
}

// HOW TO PLAY. playAfter = true: the GOT IT button also starts the game (first time only)
function showHowTo(playAfter) {
  howPlayAfter = !!playAfter;
  howBackButton.textContent = howPlayAfter ? 'GOT IT - PLAY' : 'GOT IT';
  showOnly(howSection, true);
}

function showGame() {
  showOnly(gameSection, false);
}

// Game mode screen: CAMPAIGN or ENDLESS (opens after PRESS START)
function showModeSelect() {
  modeMessage.textContent = '';
  var nextId = debugStageId || getContinueStageId();
  var next = nextId ? CAMPAIGN_STAGES[nextId] : null;
  modeCampaignMeta.textContent = !next ? 'NO STAGE READY'
    : isStageCompleted(nextId) ? 'ALL READY STAGES CLEARED'
    : 'NEXT: STAGE ' + next.worldId + '-' + next.number + '  ' + next.name.toUpperCase();
  modeEndlessMeta.textContent = 'BEST ' + endlessBest;
  showOnly(modeSection, true);
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
  var row = makeEl('button', 'stage-row');
  row.type = 'button';
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

  var info = getStageProgress(stage.id);
  var num = makeEl('span', 'stage-num', stage.boss ? 'B' : String(stage.number));
  var name = makeEl('span', 'stage-name', stage.name);
  var subLine = makeEl('span', 'stage-sub',
    done ? 'Best ' + info.bestScore : stage.boss ? 'Boss fight' : stage.kanji.length + ' new kanji');
  name.appendChild(subLine);
  var status = makeEl('span', 'stage-status', done ? starText(info.stars) : playable ? 'PLAY' : 'LOCKED');
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
  clearChildren(galaxyList);
  var continueId = getContinueStageId();
  var totalStars = 0;
  var maxStars = 0;

  for (var w = 0; w < CAMPAIGN_WORLDS.length; w++) {
    var world = CAMPAIGN_WORLDS[w];
    var unlocked = world.ready && isWorldUnlocked(world.id);
    var worldStars = 0;
    var card = makeEl('div', 'world-card' + (unlocked ? '' : ' is-locked'));

    var head = makeEl('div', 'world-head');
    head.appendChild(makeEl('span', 'world-title', 'WORLD ' + world.id + ' - ' + world.name.toUpperCase()));
    head.appendChild(makeEl('span', 'world-level', world.jlpt));
    card.appendChild(head);

    var info = makeEl('p', 'world-info');
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
  clearChildren(container);
  if (kanjiList.length === 0) {
    container.appendChild(makeEl('span', 'chip-empty', '-'));
    return;
  }
  for (var i = 0; i < kanjiList.length; i++) {
    var item = KANJI_BY_CHAR[kanjiList[i]];
    var chip = makeEl('span', 'chip');
    var charSpan = makeEl('span', 'chip-char', kanjiList[i]);
    charSpan.lang = 'ja'; // Japanese glyph shapes, not the Chinese ones
    var meaningSpan = makeEl('span', 'chip-meaning', item ? item.meaning : '');
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
  clearChildren(collectionGrid);

  var collected = 0;
  for (var i = 0; i < KANJI_LIST.length; i++) {
    var item = KANJI_LIST[i];
    var entry = progress[item.kanji];
    var hits = entry && typeof entry.hits === 'number' ? entry.hits : 0;

    var cell = makeEl('div', 'kanji-cell');
    cell.setAttribute('role', 'listitem');

    var charSpan = makeEl('span', 'kanji-cell-char');
    charSpan.lang = 'ja';
    var meaningSpan = makeEl('span', 'kanji-cell-meaning');

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
  var hpPercent = Math.max(0, Math.min(100, Math.round((hp / combatStats.maxHp) * 100)));
  hpBarFill.style.width = hpPercent + '%';
  hpBarFill.className = 'hp-fill' + (hpPercent <= 30 ? ' is-low' : hpPercent <= 60 ? ' is-mid' : '');
  var barInfo = getQuestionBarInfo(); // the kanji question, or a reading / vocabulary / context challenge
  var meaningText = barInfo.text;
  var barKey = barInfo.label + '|' + meaningText + '|' + barInfo.reading;
  if (barKey !== lastQuestionText) {
    lastQuestionText = barKey;
    questionLabel.textContent = barInfo.label;
    questionMeaning.textContent = meaningText;
    questionMeaning.classList.toggle('is-long', barInfo.long);
    questionMeaning.lang = challenge ? 'ja' : '';
    questionReading.textContent = barInfo.reading;
    questionReading.hidden = !barInfo.reading;
    questionBar.classList.remove('is-new');
    void questionBar.offsetWidth; // restarts the short highlight animation
    questionBar.classList.add('is-new');
  }
  scoreDisplay.textContent = String(score);
  comboDisplay.textContent = 'x' + combo;
}

// ---------- Canvas size ----------
function createStars() {
  stars = [];
  for (var i = 0; i < STAR_COUNT; i++) {
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
    ctx.globalAlpha = Math.max(0, ghost.life / DASH_GHOST_LIFE) * 0.4;
    drawSprite(SHIP_PIXELS, '#66e0ff', ghostLeft, ghostTop, PIXEL);
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

  drawSprite(SHIP_PIXELS, SHIP_COLORS, left, top, PIXEL);

  // Engine flame (flickers): yellow core, orange middle, and a red tip that blinks on and off
  var flameRows = Math.floor(totalTime * 20) % 2 === 0 ? 2 : 3;
  var flameCols = [3, 7];
  for (var f = 0; f < flameCols.length; f++) {
    for (var part = 0; part < flameRows; part++) {
      ctx.fillStyle = SHIP_FLAME_COLORS[part];
      ctx.fillRect(left + flameCols[f] * PIXEL, top + SHIP_HEIGHT + part * PIXEL, PIXEL, PIXEL);
    }
  }
  ctx.globalAlpha = 1;
}

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
  ctx.font = monoFont(14);
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
  ctx.font = monoFont(11);
  var y = viewHeight - 12;
  if (slowTimer > 0) {
    var text = 'SLOW ' + Math.ceil(slowTimer) + 's';
    drawShadowText(text, viewWidth - 8, y, '#c58bff');
    y -= 14;
  }
  if (shieldActive) {
    drawShadowText('SHIELD', viewWidth - 8, y, '#66e0ff');
  }
}

// Text answers of the challenge questions: fitted on the plate once per text, then reused
var plateTextPlans = {};
function plateTextMeasure(text, size) {
  ctx.font = 'bold ' + size + 'px ' + KANJI_FONT;
  return ctx.measureText(text).width;
}

function drawPlateLabel(text, centerY, plateWidth, plateHeight) {
  var plan = plateTextPlans[text];
  if (!plan) {
    plan = planPlateText(text, plateTextMeasure, plateWidth - 6, plateHeight - 2);
    plateTextPlans[text] = plan;
  }
  ctx.font = 'bold ' + plan.size + 'px ' + KANJI_FONT;
  var top = centerY - (plan.lines.length * plan.lineH) / 2 + plan.lineH / 2;
  for (var i = 0; i < plan.lines.length; i++) {
    ctx.fillText(plan.lines[i], 0, top + i * plan.lineH);
  }
}

function drawEnemy(enemy) {
  var def = ENEMY_KINDS[enemy.kind] || ENEMY_KINDS.normal;
  var colors = enemy.hitFlash > 0 ? ENEMY_FLASH_COLORS : def.colors;
  var spriteWidth = ENEMY_PIXELS[0].length * ENEMY_PIXEL;
  // Every kind has its own two-frame sprite (see ENEMY_KINDS). Ships flap out of step with each other.
  var frames = def.sprite || [ENEMY_PIXELS];
  var frame = frames[Math.floor(totalTime * 3 + (enemy.baseX || 0) * 0.037) % frames.length];

  // Everything below is drawn for a normal-size ship at (0, 0) = top centre; scale() makes other kinds bigger/smaller
  ctx.save();
  ctx.translate(Math.round(enemy.x), Math.round(enemy.y));
  ctx.scale(def.scale, def.scale);
  var left = -spriteWidth / 2;

  // Speed lines behind a fast ship
  if (enemy.kind === 'fast') {
    var trail = Math.floor(totalTime * 24) % 2 === 0 ? 14 : 20;
    // three bars that fade out upwards: bright near the ship, dim far away
    var barX = [-12, -1, 10];
    var barW = 3;
    for (var s = 0; s < 3; s++) {
      var segTop = -trail - (s === 1 ? 4 : 0);
      ctx.fillStyle = 'rgba(255, 210, 130, 0.8)';
      ctx.fillRect(barX[s], -6, barW, 6);
      ctx.fillStyle = 'rgba(255, 160, 70, 0.5)';
      ctx.fillRect(barX[s], -12, barW, 6);
      ctx.fillStyle = 'rgba(255, 140, 60, 0.25)';
      ctx.fillRect(barX[s], segTop, barW, -12 - segTop);
    }
  }

  drawSprite(frame, colors, left, 0, ENEMY_PIXEL);

  // Kanji plate
  var plateTop = ENEMY_PIXELS.length * ENEMY_PIXEL + 4;
  var plateHeight = ENEMY_HEIGHT - plateTop;
  // A challenge question puts a text answer on the plate (a little wider, for longer words); the hitbox is unchanged
  var hasLabel = typeof enemy.label === 'string' && enemy.label !== '';
  var plateWidth = hasLabel ? CHALLENGE_PLATE_WIDTH : ENEMY_WIDTH;
  var plateLeft = -plateWidth / 2;
  ctx.fillStyle = '#0b0b10';
  ctx.fillRect(plateLeft, plateTop, plateWidth, plateHeight);
  ctx.strokeStyle = def.border;
  ctx.lineWidth = 2;
  ctx.strokeRect(plateLeft, plateTop, plateWidth, plateHeight);

  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (hasLabel) {
    drawPlateLabel(enemy.label, plateTop + plateHeight / 2 + 1, plateWidth, plateHeight);
  } else {
    ctx.font = 'bold 24px ' + KANJI_FONT;
    ctx.fillText(enemy.data.kanji, 0, plateTop + plateHeight / 2 + 1);
  }

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

// The question itself is shown in the HTML question bar above the canvas (see updateHud).
// Here only the small wave and stage labels are drawn in the top corners.
function drawQuestion() {
  var endless = gameMode === MODE_ENDLESS;
  if (!currentStage && !endless) {
    return;
  }
  ctx.textBaseline = 'middle';
  ctx.font = monoFont(10);
  var isBossWave = stageWaves[waveState.index] && stageWaves[waveState.index].boss;
  var waveText = isBossWave ? 'BOSS BATTLE'
    : endless ? 'WAVE ' + (waveState.index + 1)
    : 'WAVE ' + (waveState.index + 1) + '/' + stageWaves.length;
  var stageText = endless ? 'ENDLESS  KILLS ' + endlessKills : 'STAGE ' + currentStage.worldId + '-' + currentStage.number;
  ctx.textAlign = 'left';
  drawShadowText(waveText, 8, 11, '#b4bccb');
  ctx.textAlign = 'right';
  drawShadowText(stageText, viewWidth - 8, 11, '#b4bccb');
  ctx.textAlign = 'center';
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

  ctx.font = monoFont(34);
  drawShadowText(title, centerX, centerY, def.boss ? '#ff4d6d' : '#ffd21f', 2);

  ctx.font = monoFont(16);
  drawShadowText(def.name.toUpperCase(), centerX, centerY + 33, '#ffffff');

  if (waveState.index === 0 && (currentStage || gameMode === MODE_ENDLESS)) {
    ctx.font = monoFont(12);
    ctx.fillStyle = '#6fb7ff';
    ctx.fillText(gameMode === MODE_ENDLESS ? 'ENDLESS MODE   SHOOT EVERYTHING!'
      : 'STAGE ' + currentStage.worldId + '-' + currentStage.number + '  ' + currentStage.name.toUpperCase(), centerX, centerY + 58);
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
  drawShadowText(toast.text, viewWidth / 2, 50, toast.color, 1, viewWidth - 16);
  // Optional smaller lines (reading, meaning, short explanation) after a challenge question
  var lines = toast.lines || [];
  var lineY = 50;
  for (var i = 0; i < lines.length && i < 3; i++) {
    lineY += i === 0 ? 20 : 15;
    ctx.font = (i === 0 ? 'bold 14px ' : 'bold 12px ') + KANJI_FONT;
    drawShadowText(lines[i], viewWidth / 2, lineY, i === 0 ? '#ffffff' : '#b4bccb', 1, viewWidth - 16);
  }
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
  ctx.font = monoFont(11);
  drawShadowText('HOLD STILL TO FIRE', viewWidth / 2, viewHeight - 12, '#8f99a8');
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
  ctx.font = monoFont(11);
  drawShadowText(text, 8, viewHeight - 12, WEAPON_COLORS[level]);
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
  drawSprite(BOSS_PIXELS, colors, left, top, BOSS_PIXEL);
}

// Boss life bar under the question banner
function drawBossBar() {
  if (!boss) {
    return;
  }
  var left = 52;
  var width = viewWidth - left - 10;
  var top = 24;
  var height = 8;
  ctx.fillStyle = 'rgba(11, 11, 16, 0.85)';
  ctx.fillRect(left - 1, top - 1, width + 2, height + 2);
  var ratio = Math.max(0, boss.hp / boss.maxHp);
  ctx.fillStyle = BOSS_COLORS[boss.phase - 1].R;
  ctx.fillRect(left, top, Math.round(width * ratio), height);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = monoFont(11);
  drawShadowText('BOSS', 10, top + height / 2, '#ff6b86');
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
  ctx.font = monoFont(11);
  var text = 'BOMB x' + bombs + (bombs > 0 ? '  (DOUBLE TAP)' : '');
  drawShadowText(text, 8, viewHeight - 28, bombs > 0 ? '#ff6b86' : '#8f99a8');
}

function drawOverlayText(title, subtitle, color) {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.fillRect(0, 0, viewWidth, viewHeight);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.font = monoFont(32);
  ctx.fillText(title, viewWidth / 2, viewHeight / 2 - 20);
  if (subtitle) {
    ctx.fillStyle = '#ffffff';
    ctx.font = monoFont(16);
    ctx.fillText(subtitle, viewWidth / 2, viewHeight / 2 + 16);
  }
}

// Floating "+points" texts
function drawFloaters() {
  if (floaters.length === 0) {
    return;
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = monoFont(14);
  for (var i = 0; i < floaters.length; i++) {
    var f = floaters[i];
    var x = Math.max(24, Math.min(viewWidth - 24, f.x));
    ctx.globalAlpha = Math.max(0, Math.min(1, f.life / 0.35));
    drawShadowText(f.text, x, f.y, f.color);
  }
  ctx.globalAlpha = 1;
}

function render() {
  ctx.save();
  if (shakeTime > 0 && !reduceMotion) {
    var shakeNow = shakeMag * (shakeTime / shakeTotal); // the shake fades out
    ctx.translate((Math.random() * 2 - 1) * shakeNow, (Math.random() * 2 - 1) * shakeNow);
  }
  ctx.fillStyle = '#050508';
  ctx.fillRect(-24, -24, viewWidth + 48, viewHeight + 48); // a little bigger than the screen, so a shake shows no gaps

  // Stars
  ctx.fillStyle = '#ffffff';
  for (var i = 0; i < stars.length; i++) {
    var star = stars[i];
    ctx.fillRect(Math.round(star.x), Math.round(star.y), star.size, star.size);
  }

  // The toast is drawn first (behind ships and boss), so it can never cover a kanji the player has to read
  drawToast();
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
    ctx.globalAlpha = Math.max(0, Math.min(1, particles[p].life / particleLife)); // sparks fade out
    ctx.fillStyle = particles[p].color;
    ctx.fillRect(Math.round(particles[p].x), Math.round(particles[p].y), 3, 3);
  }
  ctx.globalAlpha = 1;
  drawFloaters();

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
    ctx.font = monoFont(14);
    ctx.fillText('SCORE ' + score + '   BEST ' + bestScore, viewWidth / 2, viewHeight / 2 + 44);
    if (stageResult) {
      ctx.fillText('ACCURACY ' + stageResult.accuracy + '%   MAX COMBO x' + stageResult.maxCombo,
        viewWidth / 2, viewHeight / 2 + 66);
    }
  } else if (currentState === STATE_GAME_OVER) {
    var shownBest = gameMode === MODE_ENDLESS ? endlessBest : bestScore;
    drawOverlayText('GAME OVER', 'SCORE ' + score + '   BEST ' + shownBest, '#ff6b86');
    ctx.fillStyle = '#6fb7ff';
    ctx.font = monoFont(14);
    ctx.fillText('TAP THE SCREEN TO PLAY AGAIN', viewWidth / 2, viewHeight / 2 + 48);
    var extraY = viewHeight / 2 + 72;
    if (gameMode === MODE_ENDLESS) {
      ctx.fillStyle = '#ffffff';
      ctx.fillText('WAVE ' + (waveState.index + 1) + '   KILLS ' + endlessKills + '   COMBO x' + runStats.maxCombo, viewWidth / 2, extraY);
      extraY += 24;
    }
    if (newBest) {
      ctx.fillStyle = '#ffd21f';
      ctx.fillText('NEW BEST SCORE!', viewWidth / 2, extraY);
    }
  }
  ctx.restore();
}
