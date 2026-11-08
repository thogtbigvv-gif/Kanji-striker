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
  runStats = newRunStats();
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
      enemy.age += dt;
      enemy.x = enemy.baseX + enemy.swayAmp * Math.sin(enemy.age * enemy.swayFreq);
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
