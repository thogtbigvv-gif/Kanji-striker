'use strict';
/* js/endless.js - ENDLESS mode: the waves never stop and every ship can be shot down.
   Load after arcade.js. Numbers (damage, speeds, heal) live in config.js (see "Endless mode").

   How it differs from the campaign:
   - Every ship is a good target: shooting any ship gives points and builds the combo, with no HP penalty.
   - The ship that carries the kanji of the question bar is the BONUS target (more points, and the answer is
     saved to the kanji progress like in the campaign).
   - A ship that reaches the bottom costs a little HP (ENDLESS_ESCAPE_DAMAGE).
   - The difficulty grows with every wave; every ENDLESS_BOSS_EVERY-th wave is a boss wave.
   - The score has its own best score (kanjiStrikerEndlessBest). No stars, no XP, no stage unlocks. */

// Kanji of every stage the player has unlocked (the review kanji too). If that is too few, all kanji are used.
function buildEndlessPools() {
  var chars = [];
  for (var i = 0; i < CAMPAIGN_ORDER.length; i++) {
    var stage = CAMPAIGN_STAGES[CAMPAIGN_ORDER[i]];
    if (stage.ready && isStageUnlocked(stage.id)) {
      chars = chars.concat(stage.kanji, stage.review);
    }
  }
  var items = kanjiItemsFor(chars);
  if (items.length < 4) {
    items = KANJI_LIST.slice();
  }
  return { targets: items, decoys: items };
}

// Picks one of the options with a random roll
function endlessPick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

// The wave with this number (0 = the first wave). Gentle at the start, harder every wave.
function buildEndlessWave(index) {
  var n = index;
  var speedValue = Math.min(ENDLESS_SPEED_MAX, ENDLESS_SPEED_START + n * ENDLESS_SPEED_STEP);
  var gap = Math.max(0.9, 2.0 - n * 0.06);
  var fire = n >= 2 ? Math.min(0.5, 0.08 * (n - 1)) : 0;
  var paths = [];
  if (n >= 2) {
    paths.push('zigzag');
  }
  if (n >= 4) {
    paths.push('side');
  }
  if (n >= 6) {
    paths.push('circle');
  }
  var pathChance = n >= 2 ? Math.min(0.5, 0.15 + 0.04 * n) : 0;

  // Every ENDLESS_BOSS_EVERY-th wave: the boss comes, ships keep coming until the boss is defeated
  if ((n + 1) % ENDLESS_BOSS_EVERY === 0) {
    var boss = buildBossWave({
      speed: Math.min(1.5, 1 + n * 0.03),
      gap: Math.max(0.7, 1 - n * 0.02),
      sway: 1,
      paths: paths,
      pathChance: pathChance
    }, Math.min(0.6, 0.2 + n * 0.03));
    return boss;
  }

  var specials = [];
  if (n >= 1) {
    specials.push('fast');
  }
  if (n >= 2) {
    specials.push('big');
  }
  if (n >= 4) {
    specials.push('split');
  }
  var specialChance = Math.min(0.4, 0.08 * n);
  var shapes = [
    { count: 1, shape: 'single' },
    { count: 2, shape: 'row' },
    { count: 3, shape: 'v' },
    { count: 3, shape: 'row' }
  ];
  var groupTotal = Math.min(14, 5 + Math.floor(n / 2));
  var groups = [];
  for (var g = 0; g < groupTotal; g++) {
    if (specials.length > 0 && Math.random() < specialChance) {
      groups.push({ count: 1, shape: 'single', kind: endlessPick(specials) });
    } else {
      groups.push(endlessPick(shapes));
    }
  }
  return {
    name: ENDLESS_WAVE_NAMES[n % ENDLESS_WAVE_NAMES.length],
    speed: speedValue,
    groupGap: Math.round(gap * 100) / 100,
    sway: n >= 1 ? { chance: 1, amplitude: Math.min(34, 12 + n * 4), period: 2.6 } : null,
    fire: fire,
    paths: paths,
    pathChance: pathChance,
    groups: groups
  };
}

// Starts a new endless run. Returns true when it started.
function startEndless() {
  var pools = buildEndlessPools();
  gameMode = MODE_ENDLESS;
  currentStageId = null;
  currentStage = null;
  questionPool = pools.targets;
  decoyPool = pools.decoys;
  stageWaves = [buildEndlessWave(0)];
  beginRun();
  return true;
}

// A ship that is NOT the bonus kanji was shot down: points, combo, sometimes a heal or a capsule
function endlessKill(enemy) {
  burst(enemy.x, enemy.y + enemy.h / 2, '#ffb347');
  combo += 1;
  endlessKills += 1;
  if (combo > runStats.maxCombo) {
    runStats.maxCombo = combo;
  }
  var kindScore = (ENEMY_KINDS[enemy.kind] || ENEMY_KINDS.normal).score;
  var points = Math.round(ENDLESS_KILL_POINTS * Math.min(combo, MAX_SCORE_MULTIPLIER) * kindScore);
  score += points;
  addFloater(enemy.x, enemy.y, '+' + points, '#ffb347');

  // A long streak of kills heals the ship a little
  if (combo % ENDLESS_HEAL_COMBO === 0 && hp < combatStats.maxHp) {
    var healed = Math.min(combatStats.healAmount, combatStats.maxHp - hp);
    hp += healed;
    showToast('COMBO x' + combo + '   +' + healed + ' HP', '#5dff8a');
    playTone(1320, 0.12, 'square', 0.06, 0.05);
  }
  if (endlessKills % ENDLESS_POWERUP_EVERY === 0) {
    dropPowerup(enemy.x, enemy.y);
  }
  playTone(440 + Math.min(combo, 12) * 30, 0.05, 'square', 0.045);
  updateHud();
}
