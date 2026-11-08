'use strict';
/* js/enemies.js - questions, enemy creation, damage and answer rules (correct / wrong / missed).
   Load after waves.js. */

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
    // Prefer a ship of this stage's own kanji that is not the old question; the highest one gives the most time.
    // Splitters and their mini ships are always wrong answers, so they can never be promoted.
    // A ship still flying in from the screen edge (entering) is not promoted either.
    if (en.kind !== 'split' && en.kind !== 'mini' && !en.entering &&
        en.data !== question && questionPool.indexOf(en.data) !== -1 && (promote === null || en.y < promote.y)) {
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

// Builds one enemy object of the given kind (used for normal spawns and for the mini ships of a splitter)
function buildEnemy(data, isTarget, x, y, speed, motion, kind) {
  var def = ENEMY_KINDS[kind];
  var w = ENEMY_WIDTH * def.scale;
  var h = ENEMY_HEIGHT * def.scale;
  var margin = w / 2 + 4;
  var px = Math.max(margin, Math.min(viewWidth - margin, x));
  var finalSpeed = speed * def.speedMult;
  if (def.maxSpeed > 0) {
    finalSpeed = Math.min(finalSpeed, def.maxSpeed);
  }
  var moving = motion && kind === 'normal'; // special ships fly straight, so they are easy to read
  var swaying = moving && motion.amp;       // sway, zigzag and circle all use amp / freq
  var path = moving && motion.type ? motion.type : ''; // '' = plain sway or straight
  return {
    data: data,
    isTarget: isTarget,
    qid: questionSerial,
    dead: false,
    kind: kind,
    w: w,
    h: h,
    armor: def.armor,                 // hits needed before the ship is destroyed
    hitFlash: 0,                      // seconds left of the white flash after an armor hit
    vx: 0,                            // sideways drift (mini ships only)
    x: px,
    baseX: px,                        // centre line the ship sways around
    swayAmp: swaying ? motion.amp : 0, // 0 = flies straight
    swayFreq: swaying ? motion.freq : 0,
    path: path,                       // '', 'zigzag', 'circle' or 'side'
    orbitY: path === 'circle' ? motion.orbitY : 0, // vertical radius of a circle path
    orbitOff: 0,                      // how far the circle has moved the ship vertically so far
    entering: false,                  // true while a 'side' ship is still flying in from the edge
    age: 0,
    y: y - (h - ENEMY_HEIGHT),        // a bigger ship starts higher, so it still enters from above the screen
    speed: finalSpeed,    // pixels per second at the reference screen height (set by the wave)
    wave: waveState.index, // which wave this ship belongs to
    shooter: false,        // true = carries a gun (see Enemy fire)
    fireTimer: 0           // seconds until the next shot (counts down only inside the firing zone)
  };
}

function spawnEnemy(x, y, speed, motion, kind) {
  // Exactly one correct target per question: spawn it only when none is active
  var needTarget = !activeTargetOnScreen();
  if (needTarget) {
    targetLost = false; // the correct target is back on screen
    rescueTimer = -1;
  }
  if (!ENEMY_KINDS[kind] || (needTarget && (kind === 'split' || kind === 'mini'))) {
    kind = 'normal'; // these two kinds are always wrong answers and can never be the target
  }
  var made = buildEnemy(needTarget ? question : pickDecoy(), needTarget, x, y, speed, motion, kind);
  if (made.path === 'side') {
    // starts just outside the left or right edge and flies in towards its lane (made.baseX)
    made.entering = true;
    made.x = motion.fromLeft ? -made.w / 2 - 6 : viewWidth + made.w / 2 + 6;
    made.y = motion.startY;
  }
  var waveDef = stageWaves[waveState.index];
  if (waveDef && waveDef.fire > 0 && (kind === 'normal' || kind === 'fast' || kind === 'big') && Math.random() < waveDef.fire) {
    made.shooter = true;
    made.fireTimer = ENEMY_FIRE_FIRST_MIN + Math.random() * (ENEMY_FIRE_FIRST_MAX - ENEMY_FIRE_FIRST_MIN);
  }
  enemies.push(made);
}

// The splitter breaks into two mini ships that drift apart (always wrong answers)
function splitEnemy(enemy) {
  enemy.dead = true;
  burst(enemy.x, enemy.y + enemy.h / 2, '#5dff8a');
  playTone(260, 0.1, 'square', 0.06);
  playTone(390, 0.1, 'square', 0.06, 0.07);
  var baseSpeed = enemy.speed / ENEMY_KINDS.split.speedMult; // the wave speed the splitter was made with
  for (var side = -1; side <= 1; side += 2) {
    var mini = buildEnemy(pickDecoy(), false, enemy.x + side * 16, enemy.y + enemy.h * 0.25, baseSpeed, null, 'mini');
    mini.vx = side * MINI_DRIFT;
    enemies.push(mini);
  }
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
  // A shield blocks the whole hit: no HP loss and the combo stays
  if (shieldActive) {
    shieldActive = false;
    damageFlash = 0.1;
    showToast('SHIELD BLOCKED THE HIT', '#66e0ff');
    playTone(520, 0.1, 'square', 0.07);
    playTone(390, 0.14, 'square', 0.07, 0.08);
    return;
  }
  hp -= amount;
  waveHpLost = true;
  powerLevel = Math.max(0, powerLevel - 1); // real damage costs one weapon level
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

function correctHit(data, x, y, kind) {
  var levelBefore = weaponLevel();
  combo += 1;
  answered += 1;
  runStats.correct += 1;
  if (combo > runStats.maxCombo) {
    runStats.maxCombo = combo;
  }
  var kindScore = (ENEMY_KINDS[kind] || ENEMY_KINDS.normal).score; // fast x1.5, big x2
  var points = Math.round(10 * Math.min(combo, MAX_SCORE_MULTIPLIER) * kindScore);
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
  if (boss && boss.state === 'fight') {
    damageBoss(BOSS_ANSWER_DAMAGE, true); // KANJI STRIKE: a correct answer hits the boss hard
  }
  if (answered % POWERUP_EVERY === 0) {
    dropPowerup(x, y);
  }
  pickQuestion();
  updateHud();
}

function wrongHit(data) {
  runStats.wrong += 1;
  recordMiss(question.kanji);
  showToast(data.kanji + ' = ' + data.meaning.toUpperCase(), '#ff6b86');
  loseHp(WRONG_HIT_DAMAGE, true);
  if (currentState !== STATE_GAME_OVER) {
    playWrongSound();
  }
}

// The correct target left the game without being shot (bottom of the screen or crashed into the ship)
function targetMissed(amount) {
  runStats.missed += 1;
  recordMiss(question.kanji);
  showToast(question.kanji + ' = ' + question.meaning.toUpperCase(), '#ff6b86');
  targetLost = true; // the same question stays; a new target must come (next group or rescue ship)
  loseHp(amount);
}
