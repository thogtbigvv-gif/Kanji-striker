'use strict';
/* js/waves.js - Stage Wave System: wave plans, group spawning, wave bonuses, stage completion.
   Load after audio.js. Wave numbers and timings live in config.js (WAVE_DEFS, STAGE_TUNING). */

var swayClock = 0;      // one shared clock for every swaying ship (reset when a stage starts)
var lastLaneStart = -1; // the lane used by the last group, so the next group tries another lane

// ---------- Adaptive difficulty (v0.9.0) ----------
// adaptLevel moves between ADAPT_MIN and ADAPT_MAX depending on the accuracy of the last answers (and low HP).
// It scales ship speed, enemy fire chance and the pause between groups. Campaign only.
var adaptLevel = 1;
var adaptResults = []; // 1 = correct, 0 = wrong shot or missed target (the first result of each question)
var adaptCounted = -1; // serial of the last question that was counted

function resetAdaptive() {
  adaptLevel = 1;
  adaptResults = [];
  adaptCounted = -1;
}

function adaptNote(correct) {
  if (!ADAPT_ENABLED || gameMode === MODE_ENDLESS) {
    return;
  }
  if (adaptCounted === questionSerial) {
    return; // one question counts once, however many wrong shots it took
  }
  adaptCounted = questionSerial;
  adaptResults.push(correct ? 1 : 0);
  while (adaptResults.length > ADAPT_WINDOW) {
    adaptResults.shift();
  }
  var target = adaptLevel;
  if (adaptResults.length >= ADAPT_MIN_SAMPLES) {
    var sum = 0;
    for (var i = 0; i < adaptResults.length; i++) {
      sum += adaptResults[i];
    }
    var accuracy = sum / adaptResults.length;
    if (accuracy >= ADAPT_UP_ACCURACY) {
      target = ADAPT_MAX;
    } else if (accuracy <= ADAPT_DOWN_ACCURACY) {
      target = ADAPT_MIN;
    } else {
      target = 1;
    }
  }
  if (combatStats && hp <= combatStats.maxHp * ADAPT_LOW_HP) {
    target = Math.min(target, ADAPT_MIN); // nearly dead: never speed up
  }
  if (adaptLevel < target) {
    adaptLevel = Math.min(target, adaptLevel + ADAPT_STEP);
  } else if (adaptLevel > target) {
    adaptLevel = Math.max(target, adaptLevel - ADAPT_STEP);
  }
}

// The multiplier in use (always 1 in endless mode or when switched off)
function adaptFactor() {
  return ADAPT_ENABLED && gameMode !== MODE_ENDLESS ? adaptLevel : 1;
}

// The wave plan of a stage: the base waves, made faster / longer depending on the stage number
// Adds one single-ship group for every special kind (repeated `times` times), spread evenly through the wave
function withSpecialGroups(groups, specials, times) {
  if (!specials || specials.length === 0) {
    return groups;
  }
  var extra = [];
  for (var r = 0; r < times; r++) {
    for (var s = 0; s < specials.length; s++) {
      extra.push({ count: 1, shape: 'single', kind: specials[s] });
    }
  }
  var out = [];
  var step = groups.length / (extra.length + 1);
  var next = 0;
  for (var g = 0; g < groups.length; g++) {
    while (next < extra.length && g >= Math.round(step * (next + 1))) {
      out.push(extra[next]);
      next += 1;
    }
    out.push(groups[g]);
  }
  while (next < extra.length) {
    out.push(extra[next]);
    next += 1;
  }
  return out;
}

// The boss fight wave: the boss comes in, kanji ships keep coming (the groups repeat) until the boss is defeated
function buildBossWave(tuning, fire) {
  return {
    name: 'Boss Battle',
    boss: true,
    loop: true,
    speed: Math.round(BOSS_WAVE_SPEED * tuning.speed),
    groupGap: Math.round(2.6 * tuning.gap * 100) / 100,
    sway: tuning.sway > 0 ? { chance: 0.4, amplitude: 26 * tuning.sway, period: 2.6 } : null,
    fire: fire,
    paths: tuning.paths || [],
    pathChance: tuning.pathChance || 0,
    groups: [
      { count: 1, shape: 'single' },
      { count: 2, shape: 'row' },
      { count: 1, shape: 'single', kind: 'fast' },
      { count: 1, shape: 'single' },
      { count: 2, shape: 'row' },
      { count: 1, shape: 'single', kind: 'big' }
    ]
  };
}

function getWavesForStage(stage) {
  if (!stage) {
    return [];
  }
  var tuning = STAGE_TUNING[stage.number] || DEFAULT_TUNING;
  var fire = STAGE_FIRE[stage.number] || 0;
  var waves = [];
  var baseCount = stage.boss ? 2 : WAVE_DEFS.length; // a boss stage: two normal waves, then the boss
  for (var i = 0; i < baseCount; i++) {
    var base = WAVE_DEFS[i];
    waves.push({
      name: base.name,
      speed: Math.round(base.speed * tuning.speed),
      groupGap: Math.round(base.groupGap * tuning.gap * 100) / 100,
      sway: base.sway && tuning.sway > 0
        ? { chance: base.sway.chance, amplitude: base.sway.amplitude * tuning.sway, period: base.sway.period }
        : null,
      fire: i >= 1 ? fire : 0, // the first wave never shoots
      paths: i >= 1 ? (tuning.paths || []) : [], // the first wave has no special movement paths either
      pathChance: tuning.pathChance || 0,
      groups: i >= 1
        ? withSpecialGroups(base.groups.concat(tuning.extraGroups), tuning.specials, i === WAVE_DEFS.length - 1 ? 2 : 1)
        : base.groups.concat(tuning.extraGroups)
    });
  }
  if (stage.boss) {
    waves.push(buildBossWave(tuning, fire));
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
// The Boss Gate has no new kanji of its own: its questions come from everything learned in the world before.
function buildStagePools(stage) {
  var own = stage.kanji.length > 0 ? stage.kanji : stage.review;
  return {
    targets: kanjiItemsFor(own),
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
  if (!isStageUnlocked(stageId) && stageId !== debugStageId) {
    return 'locked';
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

// ---------- Lanes ----------
// The playfield is divided into fixed lanes (columns). Ships appear in the middle of a lane, so the screen
// stays tidy. The first and last lane keep LANE_SWAY_PAD pixels of room, so swaying ships never leave the screen.
function laneInfo() {
  var edge = ENEMY_WIDTH / 2 + 4 + LANE_SWAY_PAD;
  var usable = Math.max(0, viewWidth - edge * 2);
  var count = Math.max(3, Math.floor(usable / (ENEMY_WIDTH + LANE_GAP)) + 1);
  var step = usable / (count - 1);
  return { edge: edge, count: count, step: step };
}

function laneX(info, lane) {
  return info.edge + lane * info.step;
}

// A lane is busy while a ship that is still near the top of the screen stands in it
function laneBusy(info, lane) {
  var x = laneX(info, lane);
  for (var i = 0; i < enemies.length; i++) {
    var en = enemies[i];
    if (!en.dead && en.y < LANE_CLEAR_Y && Math.abs(en.x - x) < ENEMY_WIDTH) {
      return true;
    }
  }
  return false;
}

// First lane of a group that needs `span` lanes next to each other. Prefers free lanes and not the last used one.
function pickLaneStart(info, span) {
  var best = [];
  var bestScore = Infinity;
  for (var start = 0; start + span <= info.count; start++) {
    var score = start === lastLaneStart ? 0.5 : 0;
    for (var k = 0; k < span; k++) {
      if (laneBusy(info, start + k)) {
        score += 1;
      }
    }
    if (score < bestScore) {
      bestScore = score;
      best = [start];
    } else if (score === bestScore) {
      best.push(start);
    }
  }
  var chosen = best.length > 0 ? best[Math.floor(Math.random() * best.length)] : 0;
  lastLaneStart = chosen;
  return chosen;
}

// x of a free lane (used for single ships and the rescue ship)
function pickLaneX() {
  var info = laneInfo();
  return laneX(info, pickLaneStart(info, 1));
}

// Start positions of the ships of one group. lift = extra height above the spawn line (V formation).
// Rows and V formations use every second lane when there is room, so their ships do not touch.
function formationSlots(group) {
  var info = laneInfo();
  var slots = [];
  var count = Math.min(group.count, info.count);
  if (count <= 1) {
    slots.push({ x: laneX(info, pickLaneStart(info, 1)), lift: 0 });
    return slots;
  }
  var step = (count - 1) * 2 + 1 <= info.count ? 2 : 1;
  var start = pickLaneStart(info, (count - 1) * step + 1);
  for (var i = 0; i < count; i++) {
    var fromMiddle = Math.abs(i - (count - 1) / 2);
    slots.push({
      x: laneX(info, start + i * step),
      lift: group.shape === 'v' ? Math.round(fromMiddle * V_FORMATION_LIFT) : 0
    });
  }
  return slots;
}

// Spawns every ship of a group at once. The ships are created in random order, so the correct
// target (the first ship created while no target is on screen) is not always on the same side.
// pathType = a special path chosen for this group (or null); the group sways with its wave otherwise.
function spawnGroup(group, speed, sway, waveDef, pathType) {
  // A splitter is always a wrong answer, so when no correct target is on screen yet, a normal ship
  // carrying the target comes first
  if (group.kind === 'split' && !activeTargetOnScreen()) {
    spawnEnemy(pickLaneX(), -ENEMY_HEIGHT, speed, waveSwayMotion(sway), 'normal');
  }
  var slots = shuffle(formationSlots(group));
  var motion = (pathType ? buildPath(pathType, slots) : null) || waveSwayMotion(sway);
  for (var i = 0; i < slots.length; i++) {
    spawnEnemy(slots[i].x, -ENEMY_HEIGHT - slots[i].lift, speed, motion, group.kind);
  }
}

// True when every ship is already in the lower part of the screen: a special path needs open space
function pathZoneClear() {
  for (var i = 0; i < enemies.length; i++) {
    if (!enemies[i].dead && enemies[i].y < viewHeight * PATH_CLEAR_Y) {
      return false;
    }
  }
  return true;
}

// Decides if a single normal ship flies a special path (zigzag / circle / side entry).
// Returns the path type, or null for an ordinary group.
function rollPathType(group, waveDef) {
  if (!waveDef || !waveDef.paths || waveDef.paths.length === 0 || waveDef.pathChance <= 0) {
    return null;
  }
  if (group.count !== 1 || (group.kind && group.kind !== 'normal')) {
    return null;
  }
  if (Math.random() >= waveDef.pathChance) {
    return null;
  }
  return waveDef.paths[Math.floor(Math.random() * waveDef.paths.length)];
}

// Builds the motion of a special path. The lane of the ship is moved inward when needed, so the whole path
// stays on the screen. Returns null for an unknown type or a group that is not a single ship.
function buildPath(type, slots) {
  if (slots.length !== 1) {
    return null;
  }
  var minX = ENEMY_WIDTH / 2 + 2;
  var maxX = viewWidth - ENEMY_WIDTH / 2 - 2;
  var sign = Math.random() < 0.5 ? -1 : 1;
  var reach;
  if (type === 'side') {
    return {
      type: 'side',
      fromLeft: Math.random() < 0.5,
      startY: PATH_SIDE_START_MIN + Math.random() * PATH_SIDE_START_RANGE
    };
  }
  if (type === 'zigzag') {
    reach = PATH_ZIGZAG_AMP;
  } else if (type === 'circle') {
    reach = PATH_CIRCLE_RADIUS;
  } else {
    return null;
  }
  reach = Math.min(reach, (maxX - minX) / 2);
  slots[0].x = Math.max(minX + reach, Math.min(maxX - reach, slots[0].x));
  if (type === 'zigzag') {
    return { type: 'zigzag', amp: sign * reach, freq: (Math.PI * 2) / PATH_ZIGZAG_PERIOD };
  }
  return { type: 'circle', amp: sign * reach, orbitY: reach, freq: (Math.PI * 2) / PATH_CIRCLE_PERIOD };
}

// The sway of a wave: EVERY ship of the wave sways the same distance, in the same direction, on the same clock
// (see swayClock), so neighbours keep their distance. Returns null when the wave does not sway.
function waveSwayMotion(sway) {
  if (!sway || sway.amplitude <= 0) {
    return null;
  }
  var amplitude = Math.min(sway.amplitude, LANE_SWAY_PAD);
  if (amplitude < 6) {
    return null;
  }
  return { amp: amplitude, freq: (Math.PI * 2) / sway.period };
}

function beginWave(index) {
  if (gameMode === MODE_ENDLESS && !stageWaves[index]) {
    stageWaves[index] = buildEndlessWave(index); // endless mode: the next wave is made when it is needed
  }
  waveState.index = index;
  waveState.phase = 'intro';
  waveState.timer = WAVE_INTRO_TIME;
  waveState.groupIndex = 0;
  waveState.groupTimer = 0;
  waveHpLost = false; // every wave starts "perfect"
  waveState.pathRollIndex = -1;
  waveState.pathRoll = null;
  waveState.pathWait = 0;
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
    if (waveState.timer <= 0 && (gameMode === MODE_ENDLESS || waveState.index + 1 < stageWaves.length)) {
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
    if (def.boss && !boss) {
      spawnBoss();
      waveState.groupTimer = BOSS_FIRST_GROUP_DELAY; // the boss comes in first
    }
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
    var group = def.groups[waveState.groupIndex];
    // A special path needs open space: the group may wait a little for it (PATH_WAIT_MAX), then flies a normal way
    if (waveState.pathRollIndex !== waveState.groupIndex) {
      waveState.pathRollIndex = waveState.groupIndex;
      waveState.pathRoll = rollPathType(group, def);
      waveState.pathWait = 0;
    }
    var pathNow = null;
    if (waveState.pathRoll) {
      if (pathZoneClear()) {
        pathNow = waveState.pathRoll;
      } else if (waveState.pathWait < PATH_WAIT_MAX) {
        waveState.pathWait += dt;
        return;
      }
    }
    waveState.pathRollIndex = -1;
    spawnGroup(group, def.speed * adaptFactor(), def.sway, def, pathNow);
    waveState.groupIndex += 1;
    if (waveState.groupIndex >= def.groups.length) {
      if (def.loop) {
        // The boss wave never runs out of kanji ships: the groups start again
        waveState.groupIndex = 0;
        waveState.groupTimer = def.groupGap / adaptFactor();
      } else {
        waveState.phase = 'clearing'; // everything of this wave is on screen now
      }
    } else {
      waveState.groupTimer = def.groupGap / adaptFactor();
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
  spawnEnemy(pickLaneX(), -ENEMY_HEIGHT, def ? def.speed : 62, def ? waveSwayMotion(def.sway) : null);
}

// Answer accuracy of the run in percent: correct answers / (correct + wrong shots + missed targets)
function answerAccuracy() {
  var total = runStats.correct + runStats.wrong + runStats.missed;
  return total === 0 ? 0 : Math.round((runStats.correct / total) * 100);
}

// Points for clearing a wave (more when no HP was lost); the last wave also gives the stage bonus
function awardWaveBonus(isLastWave) {
  var perfect = !waveHpLost;
  var bonus = WAVE_CLEAR_BONUS;
  if (perfect) {
    bonus += PERFECT_WAVE_BONUS;
    perfectWaves += 1;
  }
  if (isLastWave) {
    bonus += STAGE_CLEAR_BONUS;
  }
  if (combatStats.shieldCapacity > 0) {
    shieldBuffer = Math.min(combatStats.shieldCapacity, shieldBuffer + combatStats.shieldCapacity * SHIELD_WAVE_REGEN);
  }
  score += bonus;
  bonusScore += bonus;
  showToast((isLastWave ? 'STAGE CLEAR' : 'WAVE CLEAR') + (perfect ? '  PERFECT' : '') + '   +' + bonus,
    perfect ? '#ffd21f' : '#5dff8a');
  updateHud();
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
  var isLastWave = gameMode !== MODE_ENDLESS && waveState.index + 1 >= stageWaves.length; // endless never ends
  awardWaveBonus(isLastWave); // the bonus is part of the score before the stage result is made
  if (!isLastWave) {
    waveState.phase = 'gap';
    waveState.timer = WAVE_GAP_TIME;
  } else {
    completeStage();
  }
}

// Stars (1-3) for a cleared stage: 1 = cleared, 2 = accuracy >= STAR_2_ACCURACY,
// 3 = accuracy >= STAR_3_ACCURACY and at least STAR_3_MIN_HP left
function calcStars(accuracy, hpLeft) {
  if (accuracy >= STAR_3_ACCURACY && hpLeft >= STAR_3_MIN_HP) {
    return 3;
  }
  return accuracy >= STAR_2_ACCURACY ? 2 : 1;
}

// Works out stars and XP, saves the stage result (this is what unlocks the next stage)
function finishStageRewards() {
  var hpPercent = Math.round((stageResult.hp / combatStats.maxHp) * 100); // STAR_3_MIN_HP is a percent, so a bigger hull is no free star
  var stars = calcStars(stageResult.accuracy, hpPercent);
  var xpAnswers = stageResult.correct * XP_PER_ANSWER;
  var xpWaves = stageResult.wavesCleared * XP_PER_WAVE;
  var xpBonus = stars === 3 ? XP_THREE_STAR_BONUS : 0;
  var xpTotal = XP_STAGE_CLEAR + xpAnswers + xpWaves + xpBonus;
  stageResult.stars = stars;
  stageResult.xpClear = XP_STAGE_CLEAR;
  stageResult.xpAnswers = xpAnswers;
  stageResult.xpWaves = xpWaves;
  stageResult.xpBonus = xpBonus;
  stageResult.xpTotal = xpTotal;
  var wasCleared = !!(campaign.stages[currentStageId] && campaign.stages[currentStageId].completed);
  stageResult.saved = recordStageResult(currentStageId, score, true, stars);
  if (stageResult.saved) {
    totalXp += xpTotal;
    saveXp();
    stageResult.credits = awardRunCredits(true, stars, !wasCleared);
  } else {
    stageResult.credits = 0;
  }
}

// The stage that NEXT STAGE should open (null = nothing playable comes next)
function getNextStageId(stageId) {
  var index = CAMPAIGN_ORDER.indexOf(stageId);
  if (index === -1 || index + 1 >= CAMPAIGN_ORDER.length) {
    return null;
  }
  var nextId = CAMPAIGN_ORDER[index + 1];
  return getStageStartProblem(nextId) === '' ? nextId : null;
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
  enemyBullets = [];
  boss = null;
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
    hp: hp,
    correct: runStats.correct,
    wrong: runStats.wrong,
    missed: runStats.missed,
    maxCombo: runStats.maxCombo,
    accuracy: answerAccuracy(),   // percent, see answerAccuracy()
    shotsFired: runStats.shotsFired,
    shotsHit: runStats.shotsHit,
    perfectWaves: perfectWaves,
    bonusScore: bonusScore,
    boss: !!(currentStage && currentStage.boss),
    bombsUsed: runStats.bombsUsed,
    time: Math.round(totalTime * 10) / 10 // seconds played (pauses are not counted)
  };
  finishStageRewards();
  playStageCompleteSound();
  var finishedStageId = currentStageId;
  resultsTimer = setTimeout(function () {
    resultsTimer = null;
    if (currentState === STATE_STAGE_COMPLETE && currentStageId === finishedStageId) {
      showResults();
    }
  }, STAGE_RESULTS_DELAY * 1000);
  try {
    window.dispatchEvent(new CustomEvent(STAGE_COMPLETE_EVENT, {
      detail: {
        stageId: stageResult.stageId,
        worldId: stageResult.worldId,
        stageNumber: stageResult.stageNumber,
        cleared: true,
        wavesCleared: stageResult.wavesCleared,
        score: stageResult.score,
        hp: stageResult.hp,
        correct: stageResult.correct,
        wrong: stageResult.wrong,
        missed: stageResult.missed,
        maxCombo: stageResult.maxCombo,
        accuracy: stageResult.accuracy,
        shotsFired: stageResult.shotsFired,
        shotsHit: stageResult.shotsHit,
        perfectWaves: stageResult.perfectWaves,
        bonusScore: stageResult.bonusScore,
        boss: stageResult.boss,
        bombsUsed: stageResult.bombsUsed,
        time: stageResult.time,
        stars: stageResult.stars,
        xp: stageResult.xpTotal,
        credits: stageResult.credits
      }
    }));
  } catch {
    /* ignore: STATE_STAGE_COMPLETE and stageResult are still set */
  }
}
