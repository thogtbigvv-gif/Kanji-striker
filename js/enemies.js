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

// How likely a kanji is to be chosen: 1 = normal. Uses the saved hits/misses of the player,
// then the review state (js/srs.js): overdue, recently wrong and weak kanji come more often.
function kanjiWeight(item) {
  return baseKanjiWeight(item) * srsKanjiMultiplier(item.kanji);
}

function baseKanjiWeight(item) {
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
// extraWeight (optional) = a second multiplier per entry (used for the decoys, see srsDecoyMultiplier)
function weightedPick(list, extraWeight) {
  var total = 0;
  var i;
  var weights = [];
  for (i = 0; i < list.length; i++) {
    weights.push(kanjiWeight(list[i]) * (extraWeight ? extraWeight(list[i]) : 1));
    total += weights[i];
  }
  var roll = Math.random() * total;
  for (i = 0; i < list.length; i++) {
    roll -= weights[i];
    if (roll <= 0) {
      return list[i];
    }
  }
  return list[list.length - 1];
}

function pickQuestion() {
  var onScreen = {};
  var promote = null; // a ship already flying that becomes the new correct target (no empty waiting time)
  var fallback = null; // same, but carrying a review kanji of the stage (used only when no ship of the stage's own kanji flies)
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
    } else if (en.kind !== 'split' && en.kind !== 'mini' && !en.entering && en.data !== question &&
        decoyPool.indexOf(en.data) !== -1 && (fallback === null || en.y < fallback.y)) {
      fallback = en;
    }
  }

  // No ship of the stage's own kanji is flying: a review-kanji ship becomes the target instead of leaving the
  // player with a question that has no ship (the audit measured about 45% of a stage with no target to shoot)
  if (promote === null && fallback !== null) {
    promote = fallback;
  }
  // Wave-linked review (srs.js): a missed kanji coming back, or a kanji of an earlier stage that needs review.
  // A flying ship takes it over only while its kanji is still hidden above the screen.
  var forced = srsForcedKanji(onScreen);
  if (forced !== null && promote !== null && promote.y > KANJI_VISIBLE_Y) {
    forced = null; // the ship's kanji is already visible: never swap it in front of the player
  }
  if (forced !== null) {
    if (promote !== null) {
      promote.data = forced;
    }
    question = forced;
    srsForcedUsed(forced);
  } else if (promote !== null) {
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

  // Phase 2: the question may become a reading / vocabulary / context challenge (see challenges.js).
  // Only the text shown changes; the target ship is still the one flagged above.
  challenge = buildChallengeFor(question);
  relabelEnemies();
  srsOnQuestion(); // the review system starts timing this question
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
  return weightedPick(pool, srsDecoyMultiplier);
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
  // Every ship except the mini ships may sway with its wave (so neighbours keep their distance).
  // Only the normal ship flies the special paths (zigzag / circle / side).
  var moving = motion && (kind === 'normal' || (kind !== 'mini' && !motion.type));
  var swaying = moving && motion.amp;       // sway, zigzag and circle all use amp / freq
  var path = moving && motion.type ? motion.type : ''; // '' = plain sway or straight
  return {
    data: data,
    isTarget: isTarget,
    qid: questionSerial,
    dead: false,
    label: nextChallengeLabel(isTarget), // text answer of a challenge question (null = the plate shows the kanji)
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
  if (waveDef && waveDef.fire > 0 && (kind === 'normal' || kind === 'fast' || kind === 'big') && Math.random() < waveDef.fire * adaptFactor()) {
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
  for (var i = 0; i < 12 && particles.length < MAX_PARTICLES; i++) {
    var angle = Math.random() * Math.PI * 2;
    var speed = 40 + Math.random() * 120;
    particles.push({
      x: x,
      y: y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: particleLife,
      color: color
    });
  }
}

// Short screen shake (a stronger one replaces a weaker one that is still running)
function addShake(magnitude, time) {
  if (!SHAKE_ENABLED || reduceMotion) {
    return;
  }
  var left = shakeTime > 0 ? shakeMag * (shakeTime / shakeTotal) : 0;
  if (magnitude >= left) {
    shakeMag = magnitude;
    shakeTotal = time;
    shakeTime = time;
  }
}

// A small text that floats up from where something was shot down (the points it gave)
function addFloater(x, y, text, color) {
  floaters.push({ x: x, y: y, text: text, color: color, life: FLOATER_LIFE });
  if (floaters.length > 24) {
    floaters.shift(); // never more than a few at once, even in a very busy endless wave
  }
}

// Remembers what happened to each asked kanji during this run (used by the results screen)
function noteRunKanji(kanji, wasCorrect) {
  var entry = runKanji[kanji];
  if (!entry) {
    entry = { correct: 0, wrong: 0 };
    runKanji[kanji] = entry;
  }
  if (wasCorrect) {
    entry.correct += 1;
  } else {
    entry.wrong += 1;
  }
}

// learningHit = true for the penalty of a wrong answer or a missed target: the permanent shield never blocks those
function loseHp(amount, quiet, learningHit) {
  // A shield blocks the whole hit: no HP loss and the combo stays
  if (shieldActive) {
    shieldActive = false;
    damageFlash = 0.1;
    showToast('SHIELD BLOCKED THE HIT', '#66e0ff');
    playTone(520, 0.1, 'square', 0.07);
    playTone(390, 0.14, 'square', 0.07, 0.08);
    return;
  }
  if (!learningHit && shieldBuffer > 0) {
    var absorbed = Math.min(shieldBuffer, amount);
    shieldBuffer -= absorbed;
    amount -= absorbed;
    if (amount <= 0) {
      damageFlash = 0.1;
      showToast('HULL SHIELD   ' + Math.ceil(shieldBuffer) + ' LEFT', '#66e0ff');
      playTone(520, 0.1, 'square', 0.07);
      return;
    }
  }
  hp -= amount;
  waveHpLost = true;
  powerLevel = Math.max(0, powerLevel - 1); // real damage costs one weapon level
  combo = 0;
  damageFlash = 0.25;
  addShake(SHAKE_HURT, SHAKE_HURT_TIME);
  if (hp <= 0) {
    hp = 0;
    currentState = STATE_GAME_OVER;
    gameOverAt = performance.now();
    resetDrag();
    if (commitBestScore()) {
      newBest = true;
    }
    if (currentStageId) {
      recordStageResult(currentStageId, score, false, 0); // counts the attempt and keeps the stage best score
    }
    awardRunCredits(false, 0, false); // a failed run still pays its answer credits
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
  if (gameMode === MODE_ENDLESS) {
    endlessKills += 1;
  }
  runStats.correct += 1;
  if (combo > runStats.maxCombo) {
    runStats.maxCombo = combo;
  }
  var kindScore = (ENEMY_KINDS[kind] || ENEMY_KINDS.normal).score; // fast x1.5, big x2
  var points = Math.round(10 * Math.min(combo, MAX_SCORE_MULTIPLIER) * kindScore);
  score += points;
  addFloater(x, y, '+' + points, '#5dff8a');
  recordHit(data.kanji);
  noteRunKanji(data.kanji, true);
  srsRecordAnswer(true);
  adaptNote(true);

  // Streak reward: every COMBO_HEAL_EVERY correct answers in a row restore a little HP
  var healed = 0;
  if (combo % combatStats.comboHealEvery === 0 && hp < combatStats.maxHp) {
    healed = Math.min(combatStats.healAmount, combatStats.maxHp - hp);
    hp += healed;
  }

  var rewardText = '+' + points + (healed > 0 ? '   +' + healed + ' HP' : '');
  var learned = getChallengeFeedback(true, rewardText);
  if (learned) {
    showToast(learned.text, '#5dff8a', learned.lines);
  } else {
    showToast(data.kanji + ' = ' + data.meaning.toUpperCase() + '   ' + rewardText, '#5dff8a');
  }
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

// After a wrong answer (or a missed target): the correct answer, its reading and meaning, and a short explanation.
// A plain kanji question keeps its usual message. `shown` is the kanji of the ship that was shot (or the question).
function showWrongAnswerToast(shown) {
  var learned = getChallengeFeedback(false, '');
  if (learned) {
    showToast(learned.text, '#ff6b86', learned.lines, CHALLENGE_WRONG_TOAST_TIME);
  } else {
    showToast(shown.kanji + ' = ' + shown.meaning.toUpperCase(), '#ff6b86');
  }
}

function wrongHit(data) {
  runStats.wrong += 1;
  recordMiss(question.kanji);
  noteRunKanji(question.kanji, false);
  srsRecordAnswer(false);
  adaptNote(false);
  srsQueueRetry(question.kanji);
  srsNoteConfusion(question.kanji, data.kanji);
  showWrongAnswerToast(data);
  loseHp(WRONG_HIT_DAMAGE, true, true);
  if (currentState !== STATE_GAME_OVER) {
    playWrongSound();
  }
}

// The correct target left the game without being shot (bottom of the screen or crashed into the ship)
function targetMissed(amount) {
  runStats.missed += 1;
  recordMiss(question.kanji);
  noteRunKanji(question.kanji, false);
  srsRecordAnswer(false);
  adaptNote(false);
  srsQueueRetry(question.kanji);
  showWrongAnswerToast(question);
  targetLost = true; // the same question stays; a new target must come (next group or rescue ship)
  loseHp(amount, false, true);
}
