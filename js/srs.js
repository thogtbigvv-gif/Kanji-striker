'use strict';
/* js/srs.js - Phase 3: adaptive spaced repetition.
   Load after storage.js and kanji-info.js. Numbers live in config.js ("Spaced repetition").

   What is saved (KEY_LEARNING, versioned, separate from the old KEY_PROGRESS which is never changed):
     { version: 1, kanji: { '山': { kanji: REC, reading: REC, vocab: REC, context: REC } } }
     REC = { n attempts, c correct, s streak, t last review (ms), d next review (ms), i interval (days),
             e ease, l lapses (wrong answers), w last wrong answer (ms) }
   Only categories that were really asked are saved. The kanji character is the stable id.

   The game only knows right / wrong, so a result is mapped to a grade:
     wrong -> again (10 min), right and very slow -> hard, right and fast -> easy, otherwise good.
   Each question counts once (the first wrong answer, or the correct answer if nothing went wrong before). */

var SRS_CATEGORIES = ['kanji', 'reading', 'vocab', 'context'];
var SRS_CATEGORY_NAMES = { kanji: 'Recognition', reading: 'Reading', vocab: 'Vocabulary', context: 'Context' };
var DAY_MS = 86400000;

var learning = { version: 1, kanji: {} };
var learningReadOnly = false;   // data from a newer version of the game is never overwritten
var learningDirty = false;
var learningSaveTimer = null;
var learningRevision = 0;       // changes whenever the data changes (cache key)
var srsStatusCache = {};
var srsQuestion = null;         // the question that is being answered right now
var srsRecentKanji = [];        // the last few kanji that were asked

// ---------- data cleaning ----------
function cleanNumber(value, min, max, fallback) {
  var n = typeof value === 'number' && isFinite(value) ? value : fallback;
  return Math.min(max, Math.max(min, n));
}

function emptyRecord() {
  return { n: 0, c: 0, s: 0, t: 0, d: 0, i: 0, e: SRS_EASE_START, l: 0, w: 0 };
}

// Any saved record becomes a valid one (missing / wrong fields are repaired, times can never be in the future)
function cleanRecord(raw, now) {
  var rec = emptyRecord();
  if (!raw || typeof raw !== 'object') {
    return rec;
  }
  var farFuture = now + SRS_MAX_DAYS * DAY_MS;
  rec.n = Math.floor(cleanNumber(raw.n, 0, 1e6, 0));
  rec.c = Math.floor(cleanNumber(raw.c, 0, rec.n, 0));
  rec.s = Math.floor(cleanNumber(raw.s, 0, rec.c, 0));
  rec.t = cleanNumber(raw.t, 0, now, 0);
  rec.d = cleanNumber(raw.d, 0, farFuture, 0);
  rec.i = cleanNumber(raw.i, 0, SRS_MAX_DAYS, 0);
  rec.e = cleanNumber(raw.e, SRS_EASE_MIN, SRS_EASE_MAX, SRS_EASE_START);
  rec.l = Math.floor(cleanNumber(raw.l, 0, rec.n, 0));
  rec.w = cleanNumber(raw.w, 0, now, 0);
  return rec;
}

// ---------- scheduling ----------
// Maps the right / wrong answer of the game to again / hard / good / easy
function srsGradeFor(correct, elapsedMs) {
  if (!correct) {
    return 'again';
  }
  if (typeof elapsedMs !== 'number' || !isFinite(elapsedMs) || elapsedMs < 0 || elapsedMs > SRS_MAX_ANSWER_MS) {
    return 'good';
  }
  if (elapsedMs <= SRS_EASY_MS) {
    return 'easy';
  }
  return elapsedMs >= SRS_HARD_MS ? 'hard' : 'good';
}

// Updates one record after an answer (modified SM-2). Wrong = early review, right = longer interval every time.
function srsSchedule(rec, grade, now) {
  var againDays = SRS_AGAIN_MINUTES / 1440;
  rec.n += 1;
  if (grade === 'again') {
    rec.l += 1;
    rec.s = 0;
    rec.w = now;
    rec.e = Math.max(SRS_EASE_MIN, rec.e + SRS_EASE_AGAIN);
    rec.i = againDays;
  } else {
    rec.c += 1;
    rec.s += 1;
    var fresh = rec.i < 1; // new, or coming back after a mistake: start again from the first steps
    var days;
    if (grade === 'hard') {
      rec.e = Math.max(SRS_EASE_MIN, rec.e + SRS_EASE_HARD);
      days = fresh ? SRS_FIRST_HARD_DAYS : rec.i * SRS_HARD_FACTOR;
    } else if (grade === 'easy') {
      rec.e = Math.min(SRS_EASE_MAX, rec.e + SRS_EASE_EASY);
      days = fresh ? SRS_FIRST_EASY_DAYS : rec.i * rec.e * SRS_EASY_BONUS;
    } else {
      days = fresh ? SRS_FIRST_GOOD_DAYS : rec.i * rec.e;
    }
    if (!fresh) {
      days = Math.max(days, rec.i); // a successful review never shortens the interval
    }
    rec.i = Math.min(SRS_MAX_DAYS, Math.max(againDays, days));
  }
  rec.t = now;
  rec.d = now + rec.i * DAY_MS;
  return rec;
}

// ---------- mastery ----------
// Status of one category: { attempts, correct, incorrect, accuracy, score 0..1, state, due, overdueMs, weak, forgotten }
// state: new / learning / reviewing / mastered
function srsCategoryStatus(rec, now) {
  var st = {
    attempts: 0, correct: 0, incorrect: 0, accuracy: null, streak: 0, score: 0, state: 'new',
    due: false, overdueMs: 0, weak: false, forgotten: false, last: 0, next: 0, interval: 0, lastWrong: 0
  };
  if (!rec || rec.n <= 0) {
    return st;
  }
  st.attempts = rec.n;
  st.correct = rec.c;
  st.incorrect = rec.n - rec.c;
  st.accuracy = rec.c / rec.n;
  st.streak = rec.s;
  st.last = rec.t;
  st.next = rec.d;
  st.interval = rec.i;
  st.lastWrong = rec.w;
  st.due = rec.d <= now;
  st.overdueMs = st.due ? now - rec.d : 0;

  // score: accuracy and interval strength, scaled by how many attempts it is based on, lowered when a review is late
  var confidence = Math.min(1, rec.n / MASTERY_MIN_ATTEMPTS);
  var intervalScore = Math.min(1, rec.i / MASTERY_MIN_INTERVAL_DAYS);
  var freshness = 1;
  if (st.due) {
    freshness = Math.max(0.5, 1 - st.overdueMs / (DAY_MS * Math.max(rec.i, 1) * 3));
  }
  st.score = confidence * (0.5 * st.accuracy + 0.5 * intervalScore) * freshness;

  var lateLimit = Math.max(FORGOTTEN_DAYS, rec.i * 3) * DAY_MS;
  st.forgotten = rec.n >= WEAK_MIN_ATTEMPTS && st.overdueMs > lateLimit;
  st.weak = rec.n >= WEAK_MIN_ATTEMPTS && (
    st.accuracy < WEAK_ACCURACY ||
    (rec.l >= WEAK_LAPSES && rec.s === 0 && st.accuracy < WEAK_LAPSE_ACCURACY) ||
    st.forgotten
  );

  var notTooLate = st.overdueMs <= (rec.i * DAY_MS) / 2;
  if (rec.n >= MASTERY_MIN_ATTEMPTS && rec.s >= MASTERY_MIN_STREAK && st.accuracy >= MASTERY_MIN_ACCURACY &&
      rec.i >= MASTERY_MIN_INTERVAL_DAYS && notTooLate) {
    st.state = 'mastered';
  } else if (rec.n >= WEAK_MIN_ATTEMPTS && st.accuracy >= MASTERY_REVIEWING_ACCURACY && !st.weak) {
    st.state = 'reviewing';
  } else {
    st.state = 'learning';
  }
  return st;
}

// Status of one kanji (all categories). Cached until the data changes or 30 seconds pass.
function getKanjiStatus(kanji, now) {
  var time = typeof now === 'number' ? now : Date.now();
  var cached = srsStatusCache[kanji];
  if (cached && cached.rev === learningRevision && Math.abs(time - cached.at) < 30000) {
    return cached.status;
  }
  var data = learning.kanji[kanji] || {};
  var cats = {};
  var attempts = 0;
  var correct = 0;
  var scoreSum = 0;
  var last = 0;
  var next = 0;
  var lastWrong = 0;
  var anyDue = false;
  var weakest = null;
  var masteredOthers = 0;
  var i;
  for (i = 0; i < SRS_CATEGORIES.length; i++) {
    var name = SRS_CATEGORIES[i];
    var cs = srsCategoryStatus(data[name], time);
    cats[name] = cs;
    attempts += cs.attempts;
    correct += cs.correct;
    scoreSum += cs.score;
    last = Math.max(last, cs.last);
    lastWrong = Math.max(lastWrong, cs.lastWrong);
    if (cs.attempts > 0) {
      next = next === 0 ? cs.next : Math.min(next, cs.next);
      anyDue = anyDue || cs.due;
    }
    if (name !== 'kanji' && cs.state === 'mastered') {
      masteredOthers += 1;
    }
    if (cs.weak && (weakest === null || cs.score < cats[weakest].score)) {
      weakest = name;
    }
  }
  // A kanji is never "mastered" because its meaning is known: recognition AND other categories are needed
  var state;
  if (attempts === 0) {
    state = 'new';
  } else if (cats.kanji.state === 'mastered' && masteredOthers >= MASTERY_OTHER_CATEGORIES) {
    state = 'mastered';
  } else if (weakest !== null) {
    state = 'learning';
  } else if (cats.kanji.state !== 'learning' && cats.kanji.state !== 'new' && attempts > cats.kanji.attempts) {
    state = 'reviewing';
  } else {
    state = 'learning';
  }
  var status = {
    kanji: kanji,
    categories: cats,
    attempts: attempts,
    correct: correct,
    accuracy: attempts > 0 ? correct / attempts : null,
    score: scoreSum / SRS_CATEGORIES.length,
    state: state,
    anyDue: anyDue,
    weak: weakest !== null,
    weakest: weakest,
    last: last,
    next: next,
    lastWrong: lastWrong
  };
  srsStatusCache[kanji] = { rev: learningRevision, at: time, status: status };
  return status;
}

// ---------- review queue ----------
// 1 overdue, 2 recently incorrect, 3 weak, 4 new, 5 mastered (maintenance), 0 = nothing special
function srsReviewTier(status, now) {
  if (status.attempts === 0) {
    return 4;
  }
  if (status.anyDue) {
    return 1;
  }
  if (status.lastWrong > 0 && now - status.lastWrong < RECENT_WRONG_MS) {
    return 2;
  }
  if (status.weak) {
    return 3;
  }
  return status.state === 'mastered' ? 5 : 0;
}

// The category to practise for a kanji: the weakest one, otherwise the most overdue one
function srsFocusCategory(status) {
  if (status.weakest) {
    return status.weakest;
  }
  var best = null;
  for (var i = 0; i < SRS_CATEGORIES.length; i++) {
    var cs = status.categories[SRS_CATEGORIES[i]];
    if (cs.attempts > 0 && cs.due && (best === null || cs.overdueMs > status.categories[best].overdueMs)) {
      best = SRS_CATEGORIES[i];
    }
  }
  return best;
}

// The review queue, most important first: [{ kanji, tier, category, reason }]
function getReviewQueue(limit, now) {
  var time = typeof now === 'number' ? now : Date.now();
  var names = { 1: 'overdue', 2: 'recently incorrect', 3: 'weak', 4: 'new', 5: 'maintenance' };
  var list = [];
  for (var i = 0; i < KANJI_LIST.length; i++) {
    var status = getKanjiStatus(KANJI_LIST[i].kanji, time);
    var tier = srsReviewTier(status, time);
    if (tier > 0) {
      var cat = srsFocusCategory(status);
      list.push({
        kanji: KANJI_LIST[i].kanji, tier: tier, category: cat, reason: names[tier],
        overdueMs: cat ? status.categories[cat].overdueMs : 0, score: status.score
      });
    }
  }
  list.sort(function (a, b) {
    return a.tier - b.tier || b.overdueMs - a.overdueMs || a.score - b.score;
  });
  return typeof limit === 'number' ? list.slice(0, limit) : list;
}

// Counts for the screens: { due, weak, mastered, total }
function getReviewSummary(now) {
  var time = typeof now === 'number' ? now : Date.now();
  var sum = { due: 0, weak: 0, mastered: 0, total: KANJI_LIST.length };
  for (var i = 0; i < KANJI_LIST.length; i++) {
    var st = getKanjiStatus(KANJI_LIST[i].kanji, time);
    sum.due += st.anyDue ? 1 : 0;
    sum.weak += st.weak ? 1 : 0;
    sum.mastered += st.state === 'mastered' ? 1 : 0;
  }
  return sum;
}

// ---------- question selection ----------
// Multiplier for kanjiWeight(): overdue / recently wrong / weak kanji come more often, mastered ones only occasionally
function srsKanjiMultiplier(kanji) {
  if (!SRS_ENABLED) {
    return 1;
  }
  var now = Date.now();
  var status = getKanjiStatus(kanji, now);
  var m = 1;
  if (status.attempts > 0) {
    var tier = srsReviewTier(status, now);
    if (tier === 1) {
      m = SRS_W_OVERDUE;
    } else if (tier === 2) {
      m = SRS_W_RECENT_WRONG;
    } else if (tier === 3) {
      m = SRS_W_WEAK;
    } else if (tier === 5) {
      m = SRS_W_MAINTENANCE;
    } else {
      m = SRS_W_NOT_DUE;
    }
  }
  if (srsRecentKanji.indexOf(kanji) !== -1) {
    m *= SRS_W_JUST_ASKED; // not the same kanji again and again
  }
  return Math.min(8, Math.max(0.1, m));
}

// Multiplier for the chance of a question type (kanji / reading / vocab / context) for this kanji
function srsCategoryFactor(kanji, category) {
  if (!SRS_ENABLED) {
    return 1;
  }
  var status = getKanjiStatus(kanji, Date.now());
  var cs = status.categories[category];
  if (!cs) {
    return 1;
  }
  var f = 1;
  if (cs.attempts === 0) {
    f = SRS_W_CAT_NEW;
  } else if (cs.weak) {
    f = SRS_W_CAT_WEAK;
  } else if (cs.due) {
    f = SRS_W_CAT_DUE;
  } else if (cs.state === 'mastered') {
    f = SRS_W_CAT_MASTERED;
  }
  if (status.weak && !cs.weak) {
    f *= SRS_W_CAT_OTHER_WHEN_WEAK; // practise the weak category instead of repeating all four
  }
  return f;
}

// ---------- recording answers ----------
// A new question was picked (called from pickQuestion after the challenge is chosen)
function srsOnQuestion() {
  srsQuestion = {
    serial: questionSerial,
    kanji: question.kanji,
    category: challenge && SRS_CATEGORIES.indexOf(challenge.type) !== -1 ? challenge.type : 'kanji',
    start: Date.now(),
    done: false
  };
  srsRecentKanji.push(question.kanji);
  while (srsRecentKanji.length > SRS_RECENT_KANJI) {
    srsRecentKanji.shift();
  }
}

function getLearningRecord(kanji, category) {
  var data = learning.kanji[kanji];
  if (!data) {
    data = {};
    learning.kanji[kanji] = data;
  }
  if (!data[category]) {
    data[category] = emptyRecord();
  }
  return data[category];
}

// Records the result of the current question once: the first wrong answer, or the correct answer.
function srsRecordAnswer(correct) {
  var q = srsQuestion;
  if (!q || q.serial !== questionSerial || q.done || !KANJI_BY_CHAR[q.kanji]) {
    return false;
  }
  q.done = true;
  var now = Date.now();
  var grade = srsGradeFor(correct, now - q.start);
  srsSchedule(getLearningRecord(q.kanji, q.category), grade, now);
  markLearningChanged();
  return grade;
}

function markLearningChanged() {
  learningRevision += 1;
  learningDirty = true;
  if (learningSaveTimer === null) {
    learningSaveTimer = setTimeout(flushLearning, SRS_SAVE_DELAY_MS);
  }
}

// ---------- wave-linked review (v0.8.0) ----------
// The review data above decides how OFTEN a kanji is asked. These helpers decide WHERE the waves ask it:
//  1. Review injection: kanji of EARLIER stages that are overdue / recently wrong / weak come back as questions
//     (more often during a boss wave), so a stage never only teaches its own kanji.
//  2. In-run retry: a kanji that was missed is asked again a few questions later in the same run.
//  3. Confusion memory: a kanji the player mixed up with the question appears as a decoy more often.
var reviewPool = [];      // kanji of earlier stages that need review (campaign only; empty in endless)
var retryQueue = [];      // [{ kanji, at }] kanji to ask again once runQuestionNo reaches `at`
var retryCount = {};      // kanji -> retries queued in this run
var runQuestionNo = 0;    // questions asked in this run
var lastReviewNo = -99;   // question number of the last forced (retry / review) question
var confusions = {};      // question kanji -> { decoy kanji: times it was shot instead } (this session)

function srsResetRun() {
  retryQueue = [];
  retryCount = {};
  runQuestionNo = 0;
  lastReviewNo = -99;
}

// Kanji of the stages BEFORE this one that need a review right now, most urgent first
function buildReviewPool(stage) {
  var list = [];
  if (!SRS_ENABLED || !stage) {
    return list;
  }
  var own = {};
  var ownItems = buildStagePools(stage).targets;
  var i;
  for (i = 0; i < ownItems.length; i++) {
    own[ownItems[i].kanji] = true;
  }
  var chars = [];
  for (i = 0; i < CAMPAIGN_ORDER.length; i++) {
    var earlier = CAMPAIGN_STAGES[CAMPAIGN_ORDER[i]];
    if (earlier.id === stage.id) {
      break;
    }
    if (earlier.ready) {
      chars = chars.concat(earlier.kanji, earlier.review);
    }
  }
  var items = kanjiItemsFor(chars);
  var now = Date.now();
  for (i = 0; i < items.length; i++) {
    if (own[items[i].kanji]) {
      continue;
    }
    var status = getKanjiStatus(items[i].kanji, now);
    var tier = srsReviewTier(status, now);
    if (tier >= 1 && tier <= 3) {
      var cat = srsFocusCategory(status);
      list.push({ item: items[i], tier: tier, overdue: cat ? status.categories[cat].overdueMs : 0 });
    }
  }
  list.sort(function (a, b) {
    return a.tier - b.tier || b.overdue - a.overdue;
  });
  return list.slice(0, SRS_REVIEW_POOL_MAX).map(function (entry) {
    return entry.item;
  });
}

// The player missed this kanji: it comes back later in the same run
function srsQueueRetry(kanji) {
  if (!SRS_ENABLED || !KANJI_BY_CHAR[kanji] || (retryCount[kanji] || 0) >= SRS_RETRY_MAX) {
    return;
  }
  for (var i = 0; i < retryQueue.length; i++) {
    if (retryQueue[i].kanji === kanji) {
      return; // already waiting
    }
  }
  retryCount[kanji] = (retryCount[kanji] || 0) + 1;
  retryQueue.push({ kanji: kanji, at: runQuestionNo + SRS_RETRY_GAP });
}

// The player shot `shown` while the question was `asked`: remember the pair (both directions count)
function srsNoteConfusion(asked, shown) {
  if (!asked || !shown || asked === shown) {
    return;
  }
  if (!confusions[asked]) {
    confusions[asked] = {};
  }
  confusions[asked][shown] = (confusions[asked][shown] || 0) + 1;
}

// Weight of a decoy kanji for the CURRENT question: confused pairs appear more often
function srsDecoyMultiplier(item) {
  if (!SRS_ENABLED || !question) {
    return 1;
  }
  var a = confusions[question.kanji];
  var b = confusions[item.kanji];
  var count = (a && a[item.kanji] ? a[item.kanji] : 0) + (b && b[question.kanji] ? b[question.kanji] : 0);
  return Math.min(SRS_CONFUSION_MAX, 1 + count * SRS_CONFUSION_STEP);
}

// Called once per new question. Returns a kanji that MUST be asked now (a due retry first, then a review
// injection), or null for the normal pick. `onScreen` = kanji that already fly as ships (never asked twice at once).
function srsForcedKanji(onScreen) {
  runQuestionNo += 1;
  if (!SRS_ENABLED || runQuestionNo - lastReviewNo < SRS_REVIEW_MIN_GAP) {
    return null;
  }
  var i;
  for (i = 0; i < retryQueue.length; i++) {
    var entry = retryQueue[i];
    var item = KANJI_BY_CHAR[entry.kanji];
    if (entry.at <= runQuestionNo && item && item !== question && !onScreen[entry.kanji]) {
      return item;
    }
  }
  if (reviewPool.length === 0 || runQuestionNo <= SRS_REVIEW_WARMUP) {
    return null;
  }
  var def = stageWaves[waveState.index];
  var chance = def && def.boss ? SRS_REVIEW_INJECT_BOSS : SRS_REVIEW_INJECT;
  if (Math.random() >= chance) {
    return null;
  }
  var pool = [];
  for (i = 0; i < reviewPool.length; i++) {
    if (reviewPool[i] !== question && !onScreen[reviewPool[i].kanji]) {
      pool.push(reviewPool[i]);
    }
  }
  return pool.length > 0 ? weightedPick(pool) : null;
}

// The forced kanji was used as the question: it is no longer waiting
function srsForcedUsed(item) {
  lastReviewNo = runQuestionNo;
  for (var i = retryQueue.length - 1; i >= 0; i--) {
    if (retryQueue[i].kanji === item.kanji) {
      retryQueue.splice(i, 1);
    }
  }
}

// ---------- saving and loading ----------
function flushLearning() {
  if (learningSaveTimer !== null) {
    clearTimeout(learningSaveTimer);
    learningSaveTimer = null;
  }
  if (!learningDirty || learningReadOnly) {
    return;
  }
  learningDirty = false;
  var out = { version: 1, kanji: {} };
  for (var kanji in learning.kanji) {
    if (Object.prototype.hasOwnProperty.call(learning.kanji, kanji)) {
      var rows = {};
      var any = false;
      for (var c = 0; c < SRS_CATEGORIES.length; c++) {
        var rec = learning.kanji[kanji][SRS_CATEGORIES[c]];
        if (rec && rec.n > 0) {
          rows[SRS_CATEGORIES[c]] = rec;
          any = true;
        }
      }
      if (any) {
        out.kanji[kanji] = rows;
      }
    }
  }
  writeStorage(KEY_LEARNING, JSON.stringify(out));
}

// Old saves only know hits / misses of the kanji question: they become the recognition record (due again right
// away, so the first real review sets proper times). Nothing is deleted or changed in the old data.
function migrateLearningFromProgress(now) {
  var changed = false;
  for (var i = 0; i < KANJI_LIST.length; i++) {
    var k = KANJI_LIST[i].kanji;
    var old = progress[k];
    var hits = old && typeof old.hits === 'number' && isFinite(old.hits) ? Math.max(0, Math.floor(old.hits)) : 0;
    var misses = old && typeof old.misses === 'number' && isFinite(old.misses) ? Math.max(0, Math.floor(old.misses)) : 0;
    if (hits + misses > 0 && !learning.kanji[k]) {
      var rec = emptyRecord();
      rec.n = hits + misses;
      rec.c = hits;
      rec.l = misses;
      rec.i = hits >= 3 && hits / rec.n >= 0.8 ? 1 : SRS_AGAIN_MINUTES / 1440;
      rec.d = now; // due now
      learning.kanji[k] = { kanji: rec };
      changed = true;
    }
  }
  return changed;
}

function loadLearning() {
  var now = Date.now();
  learning = { version: 1, kanji: {} };
  learningReadOnly = false;
  srsStatusCache = {};
  learningRevision += 1;
  var raw = readStorage(KEY_LEARNING);
  if (raw) {
    var parsed = null;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = null;
    }
    if (parsed && typeof parsed === 'object' && typeof parsed.version === 'number' && parsed.kanji &&
        typeof parsed.kanji === 'object' && !Array.isArray(parsed.kanji)) {
      if (parsed.version > 1) {
        learningReadOnly = true; // saved by a newer game version: use it empty, never overwrite it
      } else {
        for (var key in parsed.kanji) {
          if (Object.prototype.hasOwnProperty.call(parsed.kanji, key) && key.length === 1 && parsed.kanji[key] &&
              typeof parsed.kanji[key] === 'object') {
            var row = {};
            for (var c = 0; c < SRS_CATEGORIES.length; c++) {
              var rec = cleanRecord(parsed.kanji[key][SRS_CATEGORIES[c]], now);
              if (rec.n > 0) {
                row[SRS_CATEGORIES[c]] = rec;
              }
            }
            learning.kanji[key] = row;
          }
        }
      }
    } else if (readStorage(KEY_LEARNING + 'Corrupt') === null) {
      writeStorage(KEY_LEARNING + 'Corrupt', raw); // unreadable data is kept once, then replaced by new data
    }
  }
  if (!learningReadOnly && migrateLearningFromProgress(now)) {
    markLearningChanged();
  }
}

// Settings -> RESET PROGRESS: forgets all review data (memory and storage)
function resetLearning() {
  if (learningSaveTimer !== null) {
    clearTimeout(learningSaveTimer);
    learningSaveTimer = null;
  }
  learning = { version: 1, kanji: {} };
  learningReadOnly = false;
  learningDirty = false;
  srsStatusCache = {};
  learningRevision += 1;
  srsRecentKanji = [];
  confusions = {};
  removeStorage(KEY_LEARNING);
  removeStorage(KEY_LEARNING + 'Corrupt');
}

// Save when the page is hidden or closed (registered once)
document.addEventListener('visibilitychange', function () {
  if (document.hidden) {
    flushLearning();
  }
});
window.addEventListener('pagehide', flushLearning);
