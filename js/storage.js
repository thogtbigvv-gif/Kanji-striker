'use strict';
/* js/storage.js - everything saved in the browser: best score, kanji progress, campaign progress.
   Load after state.js. The localStorage keys are defined in config.js and never change. */

function readStorage(key) {
  try {
    return window.localStorage.getItem(key);
  } catch (error) {
    return null;
  }
}

function writeStorage(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch (error) {
    /* ignore */
  }
}

function removeStorage(key) {
  try {
    window.localStorage.removeItem(key);
  } catch (error) {
    /* ignore */
  }
}

function loadSavedData() {
  var savedBest = parseInt(readStorage(KEY_BEST), 10);
  bestScore = isNaN(savedBest) ? 0 : savedBest;

  progress = {};
  var savedProgress = readStorage(KEY_PROGRESS);
  if (savedProgress) {
    try {
      var parsed = JSON.parse(savedProgress);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        progress = parsed;
      }
    } catch (error) {
      progress = {};
    }
  }

  var savedEndless = parseInt(readStorage(KEY_ENDLESS_BEST), 10);
  endlessBest = isNaN(savedEndless) ? 0 : savedEndless;

  soundEnabled = readStorage(KEY_SOUND) !== 'off';
  totalXp = safeCount(readStorage(KEY_XP));

  campaign = loadCampaign();
}

function saveBestScore() {
  writeStorage(KEY_BEST, String(bestScore));
}

// Saves the score as the best score if it is higher. Returns true when it is a new best.
function commitBestScore() {
  if (gameMode === MODE_ENDLESS) {
    // the endless mode keeps its own best score, so it never mixes with the campaign HI-SCORE
    if (score > endlessBest) {
      endlessBest = score;
      writeStorage(KEY_ENDLESS_BEST, String(endlessBest));
      return true;
    }
    return false;
  }
  if (score > bestScore) {
    bestScore = score;
    saveBestScore();
    return true;
  }
  return false;
}

function saveXp() {
  writeStorage(KEY_XP, String(totalXp));
}

function saveProgress() {
  writeStorage(KEY_PROGRESS, JSON.stringify(progress));
}

function getEntry(kanji) {
  if (!progress[kanji] || typeof progress[kanji] !== 'object') {
    progress[kanji] = { hits: 0, misses: 0 };
  }
  var entry = progress[kanji];
  if (typeof entry.hits !== 'number' || isNaN(entry.hits)) {
    entry.hits = 0;
  }
  if (typeof entry.misses !== 'number' || isNaN(entry.misses)) {
    entry.misses = 0;
  }
  return entry;
}

function recordHit(kanji) {
  getEntry(kanji).hits += 1;
  saveProgress();
}

function recordMiss(kanji) {
  getEntry(kanji).misses += 1;
  saveProgress();
}

// ---------- Campaign progress (saved in the browser) ----------
// Saved shape: { v: 1, stages: { "w1-s1": { completed: true, bestScore: 120, plays: 3, stars: 2 } } }
// ("stars" was added in v0.4.0; older saves without it simply count as 0 stars.)
// Unlocks are calculated from "completed", so saved data can never disagree with itself.
function freshCampaign() {
  return { v: CAMPAIGN_VERSION, stages: {} };
}

function emptyStageProgress() {
  return { completed: false, bestScore: 0, plays: 0, stars: 0 };
}

function safeCount(value) {
  var n = Math.floor(Number(value));
  return isFinite(n) && n > 0 ? Math.min(n, 1000000000) : 0;
}

// Upgrades old saved campaign data to the current shape (only version 1 exists so far)
function migrateCampaign(parsed) {
  var version = parseInt(parsed.v, 10);
  if (isNaN(version) || version < 1) {
    version = 1;
  }
  // Future versions: add one step per version here, e.g. if (version < 2) { ...; version = 2; }
  campaignReadOnly = version > CAMPAIGN_VERSION;
  return parsed;
}

function cleanCampaign(raw) {
  var parsed = migrateCampaign(raw);
  var result = freshCampaign();
  var source = parsed.stages;
  if (!source || typeof source !== 'object' || Array.isArray(source)) {
    return result;
  }
  for (var id in source) {
    if (!Object.prototype.hasOwnProperty.call(source, id) || !/^w\d+-s\d+$/.test(id)) {
      continue;
    }
    var entry = source[id];
    if (!entry || typeof entry !== 'object') {
      continue;
    }
    result.stages[id] = {
      completed: entry.completed === true,
      bestScore: safeCount(entry.bestScore),
      plays: safeCount(entry.plays),
      stars: Math.min(3, safeCount(entry.stars))
    };
  }
  return result;
}

function loadCampaign() {
  campaignReadOnly = false;
  var saved = readStorage(KEY_CAMPAIGN);
  if (!saved) {
    return freshCampaign();
  }
  try {
    var parsed = JSON.parse(saved);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('bad campaign data');
    }
    return cleanCampaign(parsed);
  } catch (error) {
    // Keep a copy of the unreadable data instead of silently losing it
    if (!readStorage(KEY_CAMPAIGN + 'Corrupt')) {
      writeStorage(KEY_CAMPAIGN + 'Corrupt', saved);
    }
    return freshCampaign();
  }
}

function saveCampaign() {
  if (campaignReadOnly) {
    return; // never overwrite data written by a newer version of the game
  }
  campaign.v = CAMPAIGN_VERSION;
  writeStorage(KEY_CAMPAIGN, JSON.stringify(campaign));
}

function getStageProgress(stageId) {
  var saved = campaign.stages[stageId];
  return saved ? { completed: saved.completed, bestScore: saved.bestScore, plays: saved.plays, stars: saved.stars || 0 } : emptyStageProgress();
}

function isStageCompleted(stageId) {
  return !!(campaign.stages[stageId] && campaign.stages[stageId].completed);
}

function isStageUnlocked(stageId) {
  var stage = CAMPAIGN_STAGES[stageId];
  if (!stage) {
    return false;
  }
  if (isStageCompleted(stageId)) {
    return true;
  }
  if (stage.number > 1) {
    return isStageCompleted('w' + stage.worldId + '-s' + (stage.number - 1));
  }
  if (stage.worldId === 1) {
    return true; // the very first stage is always open
  }
  // First stage of a later world opens when the previous world's boss stage is completed
  return isStageCompleted('w' + (stage.worldId - 1) + '-s' + STAGES_PER_WORLD);
}

function isWorldUnlocked(worldId) {
  return isStageUnlocked('w' + worldId + '-s1');
}

// A stage can be played when it is unlocked and its world already has kanji data
function isStagePlayable(stageId) {
  var stage = CAMPAIGN_STAGES[stageId];
  return !!stage && stage.ready && isStageUnlocked(stageId);
}

// The stage "Continue Campaign" should open: first playable stage that is not completed yet
function getContinueStageId() {
  var lastReady = null;
  for (var i = 0; i < CAMPAIGN_ORDER.length; i++) {
    var id = CAMPAIGN_ORDER[i];
    if (!CAMPAIGN_STAGES[id].ready) {
      continue;
    }
    lastReady = id;
    if (isStageUnlocked(id) && !isStageCompleted(id)) {
      return id;
    }
  }
  return lastReady; // everything is completed: stay on the last stage
}

// Saves the result of one stage attempt. A completed stage never becomes "not completed" again.
function recordStageResult(stageId, stageScore, cleared, stars) {
  if (!CAMPAIGN_STAGES[stageId] || !isStageUnlocked(stageId)) {
    return false;
  }
  var entry = campaign.stages[stageId] || emptyStageProgress();
  entry.plays += 1;
  var points = safeCount(stageScore);
  if (points > entry.bestScore) {
    entry.bestScore = points;
  }
  if (cleared) {
    entry.completed = true;
    var earned = Math.min(3, safeCount(stars));
    if (earned > (entry.stars || 0)) {
      entry.stars = earned; // the best star rating is kept
    }
  }
  campaign.stages[stageId] = entry;
  saveCampaign();
  return true;
}
