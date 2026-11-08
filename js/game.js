'use strict';
/* js/game.js - game control (start / pause / menu), the per-frame gameplay update and the game loop.
   Load after arcade.js. */

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
  powerups = [];
  enemyBullets = [];
  boss = null;
  shieldActive = false;
  slowTimer = 0;
  powerLevel = 0;
  bombs = BOMB_START;
  bombFlash = 0;
  tapStart = null;
  lastTapAt = 0;
  dashTimer = 0;
  dashInvuln = 0;
  dashCooldown = 0;
  dashDir = 0;
  dashGhosts = [];
  flickTrail = [];
  runStats = newRunStats();
  runKanji = {};
  priorHits = {};
  for (var k = 0; k < KANJI_LIST.length; k++) {
    var saved = progress[KANJI_LIST[k].kanji];
    priorHits[KANJI_LIST[k].kanji] = saved && typeof saved.hits === 'number' ? saved.hits : 0;
  }
  if (resultsTimer !== null) {
    clearTimeout(resultsTimer);
    resultsTimer = null;
  }
  waveHpLost = false;
  perfectWaves = 0;
  bonusScore = 0;
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
  var stageId = debugStageId || getContinueStageId();
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

// Leaves the stage that is being played (or its results) without opening a screen yet
function leaveStage() {
  if (resultsTimer !== null) {
    clearTimeout(resultsTimer);
    resultsTimer = null;
  }
  if (currentState === STATE_PLAYING || currentState === STATE_PAUSED || currentState === STATE_STAGE_COMPLETE) {
    commitBestScore();
  }
  currentState = STATE_MENU;
  stopLoop();
}

function backToMenu() {
  leaveStage();
  showMenu();
}

function goToGalaxyMap() {
  leaveStage();
  showGalaxyMap();
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

// ---------- Gameplay helpers ----------
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
  if (dashInvuln > 0) {
    return false; // the ship is a ghost while it dashes
  }
  return (
    Math.abs(enemy.x - player.x) < (enemy.w + SHIP_WIDTH) / 2 - 4 &&
    enemy.y + enemy.h > player.y - SHIP_HEIGHT / 2 &&
    enemy.y < player.y + SHIP_HEIGHT / 2
  );
}

// Aim lock: counts how long the finger has rested. Shooting is allowed only after AIM_DELAY.
// (Moving the finger resets aimTimer in the pointermove handler.)
function updateFireControl(dt) {
  if (!player.isDragging) {
    player.fireHeld = false;
    player.aimTimer = 0;
    return;
  }
  player.aimTimer = Math.min(player.aimTimer + dt, AIM_DELAY);
  player.fireHeld = player.aimTimer >= AIM_DELAY;
}

// Number of bullets per shot (1-5): 1 / 2 / 3 from the current combo, plus the levels from P capsules
function weaponLevel() {
  var base = combo >= TRIPLE_SHOT_COMBO ? 3 : combo >= DOUBLE_SHOT_COMBO ? 2 : 1;
  return Math.min(MAX_WEAPON_LEVEL, base + powerLevel);
}

function updateGameplay(dt) {
  var scale = sizeScale();
  var i;
  var j;

  // Aim-lock fire: the ship shoots only while the finger (or the mouse button) rests on one spot for
  // AIM_DELAY seconds. Move the finger (or lift it) to stop shooting, so a wrong kanji in the lane can be
  // let pass safely. The cooldown keeps counting down even when the finger is lifted, so tapping quickly
  // can never shoot faster than FIRE_INTERVAL.
  updateFireControl(dt);
  if (player.isDragging && player.fireHeld) {
    fireTimer -= dt;
    if (fireTimer <= 0) {
      fireTimer += FIRE_INTERVAL;
      var startY = player.y - SHIP_HEIGHT / 2;
      var level = weaponLevel();
      var offsets = [];
      for (var n = 0; n < level; n++) {
        offsets.push((n - (level - 1) / 2) * BULLET_SPREAD); // bullets side by side, centred on the ship
      }
      for (var o = 0; o < offsets.length; o++) {
        bullets.push({ x: player.x + offsets[o], y: startY, prevY: startY, dead: false });
        runStats.shotsFired += 1;
      }
    }
  } else if (fireTimer > 0) {
    fireTimer = Math.max(0, fireTimer - dt);
  }

  updatePowerups(dt, scale);
  var speedFactor = slowTimer > 0 ? SLOW_FACTOR : 1;

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
    if (enemy.hitFlash > 0) {
      enemy.hitFlash -= dt;
    }
    if (enemy.swayAmp !== 0) {
      enemy.age += dt * speedFactor; // the SLOW power-up slows the sideways motion too
      var phase = enemy.age * enemy.swayFreq;
      if (enemy.path === 'zigzag') {
        // triangle wave: straight sideways runs with sharp turns
        enemy.x = enemy.baseX + enemy.swayAmp * (2 / Math.PI) * Math.asin(Math.sin(phase));
      } else {
        enemy.x = enemy.baseX + enemy.swayAmp * Math.sin(phase);
      }
      if (enemy.orbitY !== 0) {
        // circle path: the vertical part of the loop is added on top of the normal fall
        var orbitNow = enemy.orbitY * (Math.cos(phase) - 1);
        enemy.y += orbitNow - enemy.orbitOff;
        enemy.orbitOff = orbitNow;
      }
    }
    if (enemy.entering) {
      // side path: fly in from the screen edge to the lane, then fall straight
      var enterStep = PATH_SIDE_SPEED * dt * speedFactor;
      var enterDiff = enemy.baseX - enemy.x;
      if (Math.abs(enterDiff) <= enterStep) {
        enemy.x = enemy.baseX;
        enemy.entering = false;
      } else {
        enemy.x += enterDiff > 0 ? enterStep : -enterStep;
      }
    }
    if (enemy.vx !== 0) {
      // Mini ships drift sideways and bounce off the screen edges
      var edge = enemy.w / 2 + 2;
      enemy.x += enemy.vx * dt;
      if (enemy.x < edge) {
        enemy.x = edge;
        enemy.vx = Math.abs(enemy.vx);
      } else if (enemy.x > viewWidth - edge) {
        enemy.x = viewWidth - edge;
        enemy.vx = -Math.abs(enemy.vx);
      }
    }
    enemy.y += enemy.speed * scale * speedFactor * dt;

    if (enemy.kind === 'split' && enemy.y > viewHeight * SPLIT_AT_Y) {
      splitEnemy(enemy);
      continue;
    }

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
      burst(enemy.x, enemy.y + enemy.h / 2, '#ff6b86');
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

  // Shooting ships, the boss and the shots they fire
  updateEnemyFire(dt, speedFactor);
  updateBoss(dt, speedFactor);
  updateEnemyBullets(dt, scale, speedFactor);
  if (currentState === STATE_GAME_OVER) {
    sweepDead();
    return;
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
      if (Math.abs(b.x - e.x) > e.w / 2 + BULLET_HIT_PADDING) {
        continue;
      }
      if (b.y > e.y + e.h || b.prevY < e.y) {
        continue;
      }
      if (target === null || e.y > target.y) {
        target = e;
      }
    }
    if (target === null) {
      // No ship in the way: the bullet may hit the boss
      if (boss && boss.state === 'fight' && Math.abs(b.x - boss.x) < BOSS_W / 2 &&
          b.y <= boss.y + BOSS_H && b.prevY >= boss.y) {
        b.dead = true;
        runStats.shotsHit += 1;
        damageBoss(BOSS_SHOT_DAMAGE, false);
      }
      continue;
    }

    b.dead = true;
    runStats.shotsHit += 1;
    // Armored ship (big): the first hit only cracks the armor, the answer counts when it is destroyed
    if (target.armor > 1) {
      target.armor -= 1;
      target.hitFlash = 0.12;
      burst(b.x, b.y, '#b99bff');
      playTone(300, 0.05, 'square', 0.05);
      continue;
    }

    var wasCorrect = isActiveTarget(target);
    target.dead = true;
    if (wasCorrect) {
      burst(target.x, target.y + target.h / 2, '#5dff8a');
      correctHit(target.data, target.x, target.y, target.kind);
    } else {
      burst(target.x, target.y + target.h / 2, '#ff6b86');
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

// Tries to start a dash (dir = -1 left, 1 right). Returns true when the dash started.
function startDash(dir) {
  if (currentState !== STATE_PLAYING || dashTimer > 0 || dashCooldown > 0 || (dir !== -1 && dir !== 1)) {
    return false;
  }
  var room = dir > 0 ? viewWidth - SHIP_WIDTH / 2 - player.x : player.x - SHIP_WIDTH / 2;
  if (room < DASH_MIN_ROOM) {
    return false; // the ship is already at the screen edge on that side
  }
  dashDir = dir;
  dashTimer = DASH_TIME;
  dashInvuln = DASH_TIME + DASH_GRACE;
  dashCooldown = DASH_COOLDOWN;
  playTone(300, 0.12, 'sawtooth', 0.06, 0, 900);
  return true;
}

// Moves the ship during a dash, and counts down the ghost time and the cooldown
function updateDash(dt) {
  if (dashCooldown > 0) {
    dashCooldown = Math.max(0, dashCooldown - dt);
  }
  if (dashInvuln > 0) {
    dashInvuln = Math.max(0, dashInvuln - dt);
  }
  if (dashTimer <= 0) {
    return;
  }
  var step = Math.min(dt, dashTimer);
  dashGhosts.push({ x: player.x, y: player.y, life: 0.25 });
  player.x = clampX(player.x + dashDir * (DASH_DISTANCE / DASH_TIME) * step);
  dashTimer -= dt;
  if (dashTimer <= 0) {
    // The dash is over: the control starts again from where the ship is now
    dashTimer = 0;
    player.targetX = player.x;
    if (player.isDragging) {
      player.dragShipX = player.x;
      player.dragPointerX = player.lastPointerX;
    }
  }
}

function update(dt) {
  totalTime += dt;

  updateDash(dt);
  if (dashTimer <= 0) {
    // Smooth movement toward the target position (same feel at 30, 60 or 120 fps)
    player.targetX = clampX(player.targetX);
    player.x += (player.targetX - player.x) * (1 - Math.exp(-PLAYER_FOLLOW * dt));
    player.x = clampX(player.x);
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

  for (i = dashGhosts.length - 1; i >= 0; i--) {
    dashGhosts[i].life -= dt;
    if (dashGhosts[i].life <= 0) {
      dashGhosts.splice(i, 1);
    }
  }

  if (damageFlash > 0) {
    damageFlash -= dt;
  }
  if (bombFlash > 0) {
    bombFlash -= dt;
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
