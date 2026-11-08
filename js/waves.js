'use strict';
/* js/waves.js - Stage Wave System: wave plans, group spawning, wave bonuses, stage completion.
   Load after audio.js. Wave numbers and timings live in config.js (WAVE_DEFS, STAGE_TUNING). */

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

// Start positions of the ships of one group. lift = extra height above the spawn line (V formation).
function formationSlots(group) {
  var slots = [];
  var count = group.count;
  var i;
  if (count <= 1) {
    slots.push({ x: pickSpawnX(), lift: 0 });
    return slots;
  }
  var margin = ENEMY_WIDTH / 2 + 4;
  var usable = viewWidth - margin * 2;
  var spacing = Math.min(ENEMY_WIDTH * 2 + 10, usable / (count - 1));
  var half = (spacing * (count - 1)) / 2;
  var minCenter = margin + half;
  var maxCenter = viewWidth - margin - half;
  var center = maxCenter > minCenter ? minCenter + Math.random() * (maxCenter - minCenter) : viewWidth / 2;
  for (i = 0; i < count; i++) {
    var fromMiddle = Math.abs(i - (count - 1) / 2);
    slots.push({
      x: center - half + spacing * i,
      lift: group.shape === 'v' ? Math.round(fromMiddle * V_FORMATION_LIFT) : 0
    });
  }
  return slots;
}

// Spawns every ship of a group at once. The ships are created in random order, so the correct
// target (the first ship created while no target is on screen) is not always on the same side.
function spawnGroup(group, speed, sway, waveDef) {
  // A splitter is always a wrong answer, so when no correct target is on screen yet, a normal ship
  // carrying the target comes first
  if (group.kind === 'split' && !activeTargetOnScreen()) {
    spawnEnemy(pickSpawnX(), -ENEMY_HEIGHT, speed, null, 'normal');
  }
  var slots = shuffle(formationSlots(group));
  var motion = pickPath(group, waveDef, slots) || pickMotion(sway, slots);
  for (var i = 0; i < slots.length; i++) {
    spawnEnemy(slots[i].x, -ENEMY_HEIGHT - slots[i].lift, speed, motion, group.kind);
  }
}

// Decides if a single normal ship flies a special path (zigzag / circle / side entry). Returns null otherwise.
// The lane of the ship is moved inward when needed, so the whole path stays on the screen.
function pickPath(group, waveDef, slots) {
  if (!waveDef || !waveDef.paths || waveDef.paths.length === 0 || waveDef.pathChance <= 0) {
    return null;
  }
  if (group.count !== 1 || (group.kind && group.kind !== 'normal') || slots.length !== 1) {
    return null;
  }
  if (Math.random() >= waveDef.pathChance) {
    return null;
  }
  var type = waveDef.paths[Math.floor(Math.random() * waveDef.paths.length)];
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

// Decides if a group sways left and right. The whole group moves together, so a row or V keeps its
// shape. The swing is limited so no ship leaves the screen. Returns null for a straight group.
function pickMotion(sway, slots) {
  if (!sway || sway.amplitude <= 0 || Math.random() >= sway.chance) {
    return null;
  }
  var minX = ENEMY_WIDTH / 2 + 2;
  var maxX = viewWidth - ENEMY_WIDTH / 2 - 2;
  var room = Infinity;
  for (var i = 0; i < slots.length; i++) {
    room = Math.min(room, slots[i].x - minX, maxX - slots[i].x);
  }
  var amplitude = Math.min(sway.amplitude, room);
  if (amplitude < 6) {
    return null; // too close to the screen edge: this group flies straight
  }
  return {
    amp: Math.random() < 0.5 ? -amplitude : amplitude, // the sign decides which way it swings first
    freq: (Math.PI * 2) / sway.period
  };
}

function beginWave(index) {
  waveState.index = index;
  waveState.phase = 'intro';
  waveState.timer = WAVE_INTRO_TIME;
  waveState.groupIndex = 0;
  waveState.groupTimer = 0;
  waveHpLost = false; // every wave starts "perfect"
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
    if (waveState.timer <= 0 && waveState.index + 1 < stageWaves.length) {
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
    spawnGroup(def.groups[waveState.groupIndex], def.speed, def.sway, def);
    waveState.groupIndex += 1;
    if (waveState.groupIndex >= def.groups.length) {
      if (def.loop) {
        // The boss wave never runs out of kanji ships: the groups start again
        waveState.groupIndex = 0;
        waveState.groupTimer = def.groupGap;
      } else {
        waveState.phase = 'clearing'; // everything of this wave is on screen now
      }
    } else {
      waveState.groupTimer = def.groupGap;
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
  spawnEnemy(pickSpawnX(), -ENEMY_HEIGHT, def ? def.speed : 62);
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
  var isLastWave = waveState.index + 1 >= stageWaves.length;
  awardWaveBonus(isLastWave); // the bonus is part of the score before the stage result is made
  if (!isLastWave) {
    waveState.phase = 'gap';
    waveState.timer = WAVE_GAP_TIME;
  } else {
    completeStage();
  }
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
  playStageCompleteSound();
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
        time: stageResult.time
      }
    }));
  } catch (error) {
    /* ignore: STATE_STAGE_COMPLETE and stageResult are still set */
  }
}
