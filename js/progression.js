'use strict';
/* js/progression.js - progression foundation (Phase 1).
   Load after storage.js (it uses readStorage / writeStorage / removeStorage / safeCount and the config.js numbers).

   What lives here:
     1. Player level      - DERIVED from the existing total XP (totalXp / kanjiStrikerXp). Nothing is stored.
     2. Progression save  - the new key "kanjiStrikerProgressionV1": Credits, upgrade / weapon / module ownership
                            (the last three are empty placeholders until later phases) and a reward-transaction log.
     3. Credit API        - addCredits / spendCredits (validated, never negative, duplicate-proof).
     4. getCombatStats()  - the ONE place that tells the game its combat numbers. In Phase 1 it returns the exact
                            baseline values from config.js, so gameplay is unchanged.

   Existing XP, kanji progress, campaign progress, scores and sound are NOT copied into the new save. */

// ---------- Storage key ----------
var KEY_PROGRESSION = 'kanjiStrikerProgressionV1';
var PROGRESSION_VERSION = 1;

// ---------- Level thresholds (adjust here later) ----------
// XP needed to go from level L to level L+1:  LEVEL_FIRST_STEP + LEVEL_STEP_GROWTH * (L - 1)
//   level 1 -> 2 needs 100 XP, 2 -> 3 needs 150, 3 -> 4 needs 200, ... (each level asks 50 XP more than the last)
// Total XP needed to REACH level L = 100 * (L - 1) + 25 * (L - 1) * (L - 2):
//   L2 = 100, L3 = 250, L4 = 450, L5 = 700, L6 = 1000, L10 = 2700, L20 = 11400, L50 = 63700
// (one cleared stage is worth roughly 200-300 XP, so the first world is about level 5-6)
// LEVEL_THRESHOLDS[i] = total XP needed to reach level i + 1. It is built once from the three numbers below.
var LEVEL_MAX = 50;
var LEVEL_FIRST_STEP = 100;
var LEVEL_STEP_GROWTH = 50;
var LEVEL_THRESHOLDS = (function () {
  var list = [0];
  var total = 0;
  for (var level = 1; level < LEVEL_MAX; level++) {
    total += LEVEL_FIRST_STEP + LEVEL_STEP_GROWTH * (level - 1);
    list.push(total);
  }
  return list;
})();

// ---------- Limits and known ids ----------
var CREDITS_MAX = 999999999;       // the balance never goes above this
var CREDITS_MAX_PER_TRANSACTION = 10000000;
var TRANSACTION_LOG_SIZE = 60;     // how many recent reward / purchase ids are remembered for duplicate protection
var UPGRADE_IDS = ['hull', 'shield', 'engine', 'weaponPower', 'fireRate', 'energy'];
var UPGRADE_MAX_LEVEL = 5;
var WEAPON_IDS = ['plasma', 'spread', 'missile', 'beam'];
var WEAPON_MAX_LEVEL = 5;
var MODULE_SLOTS = 3;

var progressionData = null;          // the loaded progression save (see freshProgression)
var progressionReadOnly = false;     // true when the save was written by a NEWER version: never overwrite it
var progressionLastJson = '';        // last text written / read, so identical data is never written twice

// ---------- Player level (derived from the existing XP, never stored) ----------
// Returns { level, xp, levelStartXp, nextLevelXp (null at max level), xpIntoLevel, xpForNext, progress (0-1), maxed }
function getLevelInfo(xp) {
  var total = Math.floor(Number(xp));
  if (!isFinite(total) || total < 0) {
    total = 0;
  }
  var level = 1;
  while (level < LEVEL_MAX && total >= LEVEL_THRESHOLDS[level]) {
    level += 1;
  }
  var start = LEVEL_THRESHOLDS[level - 1];
  var maxed = level >= LEVEL_MAX;
  var next = maxed ? null : LEVEL_THRESHOLDS[level];
  return {
    level: level,
    xp: total,
    levelStartXp: start,
    nextLevelXp: next,
    xpIntoLevel: total - start,
    xpForNext: maxed ? 0 : next - start,
    progress: maxed ? 1 : (total - start) / (next - start),
    maxed: maxed
  };
}

// The player's level right now, from the saved total XP (the global totalXp of state.js)
function getPlayerLevel() {
  return getLevelInfo(totalXp).level;
}

// ---------- Progression save ----------
// Saved shape (only data that does not exist anywhere else):
// { v: 1, credits: 0,
//   upgrades: { hull: 0, shield: 0, engine: 0, weaponPower: 0, fireRate: 0, energy: 0 },   // levels 0-5 (later phase)
//   weapons: { unlocked: ['plasma'], equipped: 'plasma', levels: { plasma: 1, spread: 0, missile: 0, beam: 0 } },
//   modules: { unlocked: [], equipped: [] },                                                // later phase
//   tx: ['id', ...] }                                                                       // recent transaction ids
function freshProgression() {
  var upgrades = {};
  for (var i = 0; i < UPGRADE_IDS.length; i++) {
    upgrades[UPGRADE_IDS[i]] = 0;
  }
  return {
    v: PROGRESSION_VERSION,
    credits: 0,
    upgrades: upgrades,
    weapons: {
      unlocked: ['plasma'],
      equipped: 'plasma',
      levels: { plasma: 1, spread: 0, missile: 0, beam: 0 }
    },
    modules: { unlocked: [], equipped: [] },
    tx: []
  };
}

function isPlainObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function cleanLevel(value, max) {
  return Math.min(max, safeCount(value));
}

// Transaction ids may contain : . - (like 'clear:w1-s2:123'), so they use their own pattern
var TX_ID_PATTERN = /^[a-zA-Z0-9_:.\-]{1,40}$/;

function cleanIdList(value, limit, pattern) {
  var rule = pattern || /^[a-zA-Z0-9_]{1,40}$/;
  var out = [];
  if (!Array.isArray(value)) {
    return out;
  }
  for (var i = 0; i < value.length && out.length < limit; i++) {
    if (typeof value[i] === 'string' && rule.test(value[i]) && out.indexOf(value[i]) === -1) {
      out.push(value[i]);
    }
  }
  return out;
}

// Builds a complete, valid progression object from untrusted parsed data. A missing or broken field gets its
// default; every valid field is kept.
function cleanProgression(raw) {
  var result = freshProgression();
  var i;
  result.credits = Math.min(CREDITS_MAX, safeCount(raw.credits));

  if (isPlainObject(raw.upgrades)) {
    for (i = 0; i < UPGRADE_IDS.length; i++) {
      result.upgrades[UPGRADE_IDS[i]] = cleanLevel(raw.upgrades[UPGRADE_IDS[i]], UPGRADE_MAX_LEVEL);
    }
  }

  if (isPlainObject(raw.weapons)) {
    var levels = isPlainObject(raw.weapons.levels) ? raw.weapons.levels : {};
    for (i = 0; i < WEAPON_IDS.length; i++) {
      var id = WEAPON_IDS[i];
      var saved = cleanLevel(levels[id], WEAPON_MAX_LEVEL);
      result.weapons.levels[id] = id === 'plasma' ? Math.max(1, saved) : saved; // plasma is always owned
    }
    var unlocked = cleanIdList(raw.weapons.unlocked, 20);
    result.weapons.unlocked = ['plasma'];
    for (i = 0; i < unlocked.length; i++) {
      if (result.weapons.unlocked.indexOf(unlocked[i]) === -1) {
        result.weapons.unlocked.push(unlocked[i]);
      }
    }
    var equipped = raw.weapons.equipped;
    result.weapons.equipped = typeof equipped === 'string' && result.weapons.unlocked.indexOf(equipped) !== -1 ? equipped : 'plasma';
  }

  if (isPlainObject(raw.modules)) {
    result.modules.unlocked = cleanIdList(raw.modules.unlocked, 50);
    var equippedModules = cleanIdList(raw.modules.equipped, MODULE_SLOTS);
    for (i = 0; i < equippedModules.length; i++) {
      if (result.modules.unlocked.indexOf(equippedModules[i]) !== -1) {
        result.modules.equipped.push(equippedModules[i]); // a module can only be equipped when it is owned
      }
    }
  }

  result.tx = cleanIdList(raw.tx, TRANSACTION_LOG_SIZE, TX_ID_PATTERN);
  return result;
}

// Upgrades old saved data to the current shape (only version 1 exists so far).
// A save from a NEWER version is read but never written back.
function migrateProgression(parsed) {
  var version = parseInt(parsed.v, 10);
  if (isNaN(version) || version < 1) {
    version = 1;
  }
  // Future versions: add one step per version here, e.g. if (version < 2) { ...; version = 2; }
  progressionReadOnly = version > PROGRESSION_VERSION;
  return parsed;
}

// Reads the save. Never throws and never writes (a first-time player simply has no key yet).
function loadProgression() {
  progressionReadOnly = false;
  progressionLastJson = '';
  var saved = readStorage(KEY_PROGRESSION);
  if (!saved) {
    return freshProgression();
  }
  try {
    var parsed = JSON.parse(saved);
    if (!isPlainObject(parsed)) {
      throw new Error('bad progression data');
    }
    var cleaned = cleanProgression(migrateProgression(parsed));
    progressionLastJson = saved;
    return cleaned;
  } catch {
    // Keep a copy of the unreadable data instead of silently losing it (the copy is never overwritten)
    if (!readStorage(KEY_PROGRESSION + 'Corrupt')) {
      writeStorage(KEY_PROGRESSION + 'Corrupt', saved);
    }
    return freshProgression();
  }
}

// The loaded progression object (loaded on first use)
function getProgression() {
  if (progressionData === null) {
    progressionData = loadProgression();
  }
  return progressionData;
}

// Writes the given data. Skips the write when nothing changed. Returns true when the data is stored (or already was).
function persistProgression(data) {
  if (progressionReadOnly) {
    return false; // never overwrite data written by a newer version of the game
  }
  data.v = PROGRESSION_VERSION;
  var json = JSON.stringify(data);
  if (json === progressionLastJson) {
    return true;
  }
  writeStorage(KEY_PROGRESSION, json);
  if (readStorage(KEY_PROGRESSION) !== json) {
    return false; // the browser refused to store it (private mode, full storage)
  }
  progressionLastJson = json;
  return true;
}

function cloneProgression(data) {
  return JSON.parse(JSON.stringify(data));
}

// Settings -> RESET PROGRESS: removes the progression save (and its corrupt-data copy) and starts fresh
function resetProgression() {
  removeStorage(KEY_PROGRESSION);
  removeStorage(KEY_PROGRESSION + 'Corrupt');
  progressionData = freshProgression();
  progressionReadOnly = false;
  progressionLastJson = '';
}

// ---------- Credit API ----------
// Every function returns { ok, balance, ... }. ok = false means NOTHING changed.
//   reason: 'invalid' (bad amount) | 'readonly' (newer save) | 'duplicate' (same txId already done) |
//           'insufficient' (spendCredits only) | 'failed' (could not be stored)
// txId (optional but recommended for rewards): a unique text such as 'clear:w1-s2:1712345678' - the same id is
// accepted only once, so a completion callback that runs twice cannot pay twice.

function getCredits() {
  return getProgression().credits;
}

// Whole positive number within limits, or 0 when invalid
function cleanAmount(amount) {
  var n = Number(amount);
  if (!isFinite(n) || n <= 0 || Math.floor(n) !== n || n > CREDITS_MAX_PER_TRANSACTION) {
    return 0;
  }
  return n;
}

function validTransactionId(txId) {
  return typeof txId === 'string' && TX_ID_PATTERN.test(txId);
}

function hasTransaction(txId) {
  return validTransactionId(txId) && getProgression().tx.indexOf(txId) !== -1;
}

// Applies a balance change on a COPY, stores it, and only then replaces the live data (all or nothing)
function commitCreditChange(delta, txId) {
  var current = getProgression();
  var next = cloneProgression(current);
  next.credits = Math.max(0, Math.min(CREDITS_MAX, current.credits + delta));
  if (txId) {
    next.tx.push(txId);
    while (next.tx.length > TRANSACTION_LOG_SIZE) {
      next.tx.shift();
    }
  }
  if (!persistProgression(next)) {
    return { ok: false, reason: progressionReadOnly ? 'readonly' : 'failed', balance: current.credits };
  }
  progressionData = next;
  return { ok: true, balance: next.credits };
}

function addCredits(amount, txId) {
  var value = cleanAmount(amount);
  if (value === 0) {
    return { ok: false, reason: 'invalid', balance: getCredits() };
  }
  if (txId !== undefined && txId !== null) {
    if (!validTransactionId(txId)) {
      return { ok: false, reason: 'invalid', balance: getCredits() };
    }
    if (hasTransaction(txId)) {
      return { ok: false, reason: 'duplicate', balance: getCredits() };
    }
  }
  return commitCreditChange(value, txId || '');
}

function canAfford(amount) {
  var value = cleanAmount(amount);
  return value > 0 && getCredits() >= value;
}

function spendCredits(amount, txId) {
  var value = cleanAmount(amount);
  if (value === 0) {
    return { ok: false, reason: 'invalid', balance: getCredits() };
  }
  if (txId !== undefined && txId !== null) {
    if (!validTransactionId(txId)) {
      return { ok: false, reason: 'invalid', balance: getCredits() };
    }
    if (hasTransaction(txId)) {
      return { ok: false, reason: 'duplicate', balance: getCredits() };
    }
  }
  if (getCredits() < value) {
    return { ok: false, reason: 'insufficient', balance: getCredits() };
  }
  return commitCreditChange(-value, txId || '');
}

// ---------- Ship upgrades (v0.10.0) ----------
// Upgrades are bought with credits (earned by playing) and gated by the player level (earned by XP).
// The levels are stored in progressionData.upgrades; the numbers each level gives are in config.js ("Ship upgrades").
function getUpgradeLevel(id) {
  if (UPGRADE_IDS.indexOf(id) === -1) {
    return 0;
  }
  return Math.min(UPGRADE_MAX_LEVEL, safeCount(getProgression().upgrades[id]));
}

// Credits the NEXT level costs (0 = invalid id or already at the maximum)
function getUpgradeCost(id) {
  if (UPGRADE_IDS.indexOf(id) === -1) {
    return 0;
  }
  var level = getUpgradeLevel(id);
  return level >= UPGRADE_MAX_LEVEL ? 0 : UPGRADE_BASE_COST[id] * (level + 1);
}

// Player level the NEXT level needs (0 = invalid id or already at the maximum)
function getUpgradeRequirement(id) {
  var level = getUpgradeLevel(id);
  return UPGRADE_IDS.indexOf(id) === -1 || level >= UPGRADE_MAX_LEVEL ? 0 : UPGRADE_LEVEL_REQ[level];
}

// Buys the next level of an upgrade. Credits and level are saved together (all or nothing).
// Returns { ok, reason, id, level, cost, balance }. reason: invalid | max | level | insufficient | readonly | failed
function buyUpgrade(id) {
  if (UPGRADE_IDS.indexOf(id) === -1) {
    return { ok: false, reason: 'invalid', balance: getCredits() };
  }
  var current = getProgression();
  var level = getUpgradeLevel(id);
  if (level >= UPGRADE_MAX_LEVEL) {
    return { ok: false, reason: 'max', id: id, level: level, balance: current.credits };
  }
  if (getPlayerLevel() < UPGRADE_LEVEL_REQ[level]) {
    return { ok: false, reason: 'level', id: id, level: level, need: UPGRADE_LEVEL_REQ[level], balance: current.credits };
  }
  var cost = getUpgradeCost(id);
  if (current.credits < cost) {
    return { ok: false, reason: 'insufficient', id: id, level: level, cost: cost, balance: current.credits };
  }
  var next = cloneProgression(current);
  next.credits -= cost;
  next.upgrades[id] = level + 1;
  if (!persistProgression(next)) {
    return { ok: false, reason: progressionReadOnly ? 'readonly' : 'failed', id: id, level: level, balance: current.credits };
  }
  progressionData = next;
  return { ok: true, id: id, level: level + 1, cost: cost, balance: next.credits };
}

// Gives every upgrade back for the full price, so trying a different build never costs anything
function respecUpgrades() {
  var current = getProgression();
  var refund = 0;
  var next = cloneProgression(current);
  for (var i = 0; i < UPGRADE_IDS.length; i++) {
    var id = UPGRADE_IDS[i];
    for (var l = 1; l <= getUpgradeLevel(id); l++) {
      refund += UPGRADE_BASE_COST[id] * l;
    }
    next.upgrades[id] = 0;
  }
  next.credits = Math.min(CREDITS_MAX, current.credits + refund);
  if (!persistProgression(next)) {
    return { ok: false, reason: progressionReadOnly ? 'readonly' : 'failed', balance: current.credits };
  }
  progressionData = next;
  return { ok: true, refund: refund, balance: next.credits };
}

// Credits a run pays when it ends. cleared / stars / firstClear only matter for a cleared campaign stage.
// A run pays once (creditsAwarded). Returns the amount that was added (0 = nothing).
function awardRunCredits(cleared, stars, firstClear) {
  if (creditsAwarded) {
    return 0;
  }
  creditsAwarded = true;
  if (gameMode !== MODE_ENDLESS && (!currentStageId || !isStageUnlocked(currentStageId))) {
    runCredits = 0;
    return 0; // a locked stage opened with ?stage= pays nothing (it is for testing)
  }
  var amount = Math.min(CREDITS_ANSWER_CAP, runStats.correct * CREDITS_PER_ANSWER);
  if (gameMode === MODE_ENDLESS) {
    amount += Math.min(ENDLESS_CREDIT_CAP, Math.floor(score / ENDLESS_CREDIT_SCORE_DIV));
  }
  if (cleared) {
    amount += CREDITS_STAGE_CLEAR + stars * CREDITS_PER_STAR;
    amount += firstClear ? CREDITS_FIRST_CLEAR : 0;
    amount += currentStage && currentStage.boss ? CREDITS_BOSS_CLEAR : 0;
  }
  runCredits = 0;
  if (amount > 0) {
    var paid = addCredits(amount, 'run:' + Date.now() + ':' + Math.floor(Math.random() * 1000000));
    if (paid.ok) {
      runCredits = amount;
    }
  }
  return runCredits;
}

// ---------- Combat stats (the single source of the player's combat numbers) ----------
// With no upgrades bought this returns EXACTLY the baseline values from config.js (gameplay unchanged).
// v0.10.0: the six ship upgrades change maxHp, playerFollow, fireInterval, weaponDamage, shieldCapacity, startBombs and dashCooldown.
// Later phases will change what is returned here; the game code that reads these values stays the same.
//   maxHp          - ship hit points (HP at stage start, heal / repair limit, HP bar scale)
//   playerFollow   - how fast the ship follows the finger (per second)
//   fireInterval   - seconds between shots
//   bulletSpeed    - pixels per second
//   weaponDamage   - damage multiplier of the ship's bullets against the boss (1 = today's value)
//   comboHealEvery, healAmount, repairAmount - the existing streak heal and the Repair capsule
//   shieldCapacity - permanent shield buffer (0 = none; the S capsule is a separate temporary system)
// The wrong-answer penalty (WRONG_HIT_DAMAGE) and the combo reset are NOT stats: they always stay as they are.
function getCombatStats() {
  var hull = getUpgradeLevel('hull');
  var shield = getUpgradeLevel('shield');
  var engine = getUpgradeLevel('engine');
  var power = getUpgradeLevel('weaponPower');
  var rate = getUpgradeLevel('fireRate');
  var energy = getUpgradeLevel('energy');
  return {
    maxHp: MAX_HP + hull * UPG_HULL_HP,
    playerFollow: PLAYER_FOLLOW * (1 + engine * UPG_ENGINE_FOLLOW),
    fireInterval: FIRE_INTERVAL * (1 - rate * UPG_FIRE_RATE),
    bulletSpeed: BULLET_SPEED,
    weaponDamage: 1 + power * UPG_WEAPON_DAMAGE,
    comboHealEvery: COMBO_HEAL_EVERY,
    healAmount: HEAL_AMOUNT,
    repairAmount: REPAIR_AMOUNT,
    shieldCapacity: shield * UPG_SHIELD_BUFFER,
    startBombs: Math.min(MAX_BOMBS, BOMB_START + Math.floor(energy / UPG_ENERGY_BOMB_EVERY)),
    dashCooldown: Math.max(DASH_COOLDOWN_MIN, DASH_COOLDOWN - engine * UPG_ENGINE_DASH)
  };
}

// The stats of the current run. They are calculated once when a stage starts (see startStage) and then only
// read, so nothing is recalculated every frame and the numbers cannot change in the middle of a run.
var combatStats = getCombatStats();
