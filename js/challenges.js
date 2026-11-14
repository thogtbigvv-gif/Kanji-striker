'use strict';
/* js/challenges.js - Phase 2 learning questions: READING, VOCABULARY and CONTEXT challenges.
   Load after waves.js (before enemies.js). Numbers and switches live in config.js ("Learning challenges").

   How it works:
   - The game still asks about ONE kanji at a time (question = an entry of KANJI_LIST). That never changes, so the
     targets, the rescue ship, promotion, saved progress, combo, XP and stars all work exactly as before.
   - On top of that, pickQuestion() asks buildChallengeFor(question): it may return a challenge object (or null = the
     plain kanji question). A challenge only changes WHAT IS SHOWN:
       reading  - the bar shows a word (火山), the ship plates show readings (かざん, ひやま ...)
       vocab    - the bar shows a word (火山), the ship plates show Mongolian meanings (Галт уул ...)
       context  - the bar shows a sentence (山に登ります。), the ship plates show Mongolian translations
   - The correct ship (enemy.isTarget) carries challenge.correct, every other ship carries a different wrong option.
     Which ship is correct is still decided by isActiveTarget(), never by the text.
   - All words and sentences come from the Phase 1 data (read through js/kanji-info.js); nothing is stored twice.
     A word is only used when every kanji in it is unlocked (part of decoyPool = the stage's kanji + review kanji). */

var CJK_RE = /[\u3400-\u9FFF]/;
var HIRAGANA_RE = /^[\u3040-\u309F\u30FC]+$/;

var lastChallengeType = 'kanji'; // type of the previous question
var challengeStreak = 0;         // how many questions in a row had that type
var recentChallengeKeys = [];    // words / sentences asked lately
var challengeWordList = null;    // every vocabulary word of the database (built once)

// Called when a run starts: nothing is remembered from the run before
function resetChallengeState() {
  challenge = null;
  lastChallengeType = 'kanji';
  challengeStreak = 0;
  recentChallengeKeys = [];
}

// ---------- small helpers ----------
function kataToHira(text) {
  return text.replace(/[\u30A1-\u30F6]/g, function (ch) {
    return String.fromCharCode(ch.charCodeAt(0) - 0x60);
  });
}

// Lower case, no spaces or punctuation: used to compare Mongolian options
function normalizeText(text) {
  return String(text).toLowerCase().replace(/[\s.,!?;:()\u3001\u3002]/g, '');
}

function isUsableText(text, maxChars) {
  return typeof text === 'string' && text.length > 0 && text.length <= maxChars;
}

function shuffled(list) {
  return shuffle(list.slice());
}

// The kanji (characters) the player has unlocked in this run
function unlockedKanjiSet() {
  var set = {};
  for (var i = 0; i < decoyPool.length; i++) {
    set[decoyPool[i].kanji] = true;
  }
  return set;
}

// True when every kanji of the word is unlocked (kana are always fine)
function wordIsUnlocked(word, unlocked) {
  for (var i = 0; i < word.length; i++) {
    var ch = word.charAt(i);
    if (CJK_RE.test(ch) && !unlocked[ch]) {
      return false;
    }
  }
  return true;
}

// A sentence may contain kanji that are not in the database (the bar shows its hiragana reading, so the player can
// still read it), but a database kanji that is not unlocked yet makes the sentence unavailable.
function sentenceIsUnlocked(sentence, unlocked) {
  for (var i = 0; i < sentence.length; i++) {
    var ch = sentence.charAt(i);
    if (CJK_RE.test(ch) && KANJI_BY_CHAR[ch] && !unlocked[ch]) {
      return false;
    }
  }
  return true;
}

// Every vocabulary word of the database once: { word, reading, meaning } (words listed under two kanji count once)
function getChallengeWords() {
  if (challengeWordList) {
    return challengeWordList;
  }
  var list = [];
  var seen = {};
  for (var i = 0; i < KANJI_LIST.length; i++) {
    var vocab = getKanjiVocabulary(KANJI_LIST[i].kanji);
    for (var j = 0; j < vocab.length; j++) {
      var v = vocab[j];
      if (!v || typeof v.word !== 'string' || typeof v.reading !== 'string' || typeof v.meaning !== 'string' ||
          !v.word || !HIRAGANA_RE.test(v.reading) || !v.meaning) {
        continue; // missing or odd data is skipped, never guessed
      }
      var key = v.word + '|' + v.reading + '|' + v.meaning;
      if (!seen[key]) {
        seen[key] = true;
        list.push({ word: v.word, reading: v.reading, meaning: v.meaning });
      }
    }
  }
  challengeWordList = list;
  return list;
}

// The words that contain this kanji and only unlocked kanji
function unlockedWordsFor(item, unlocked) {
  var all = getChallengeWords();
  var result = [];
  for (var i = 0; i < all.length; i++) {
    if (all[i].word.indexOf(item.kanji) !== -1 && wordIsUnlocked(all[i].word, unlocked)) {
      result.push(all[i]);
    }
  }
  return result;
}

// Prefers words of two or more characters (a one-kanji word is almost the plain kanji question)
function pickFresh(candidates, type) {
  var fresh = [];
  var longer = [];
  for (var i = 0; i < candidates.length; i++) {
    var c = candidates[i];
    var key = type + ':' + (c.word || c.sentence);
    if (recentChallengeKeys.indexOf(key) === -1) {
      fresh.push(c);
      if ((c.word || '').length > 1) {
        longer.push(c);
      }
    }
  }
  var use = longer.length > 0 ? longer : fresh;
  return use.length > 0 ? use[Math.floor(Math.random() * use.length)] : null;
}

// Adds text to a list of options unless it is empty, too long, the correct answer, already there,
// or so close to the correct answer that it could count as right too
function addOption(options, text, correct, maxChars) {
  if (!isUsableText(text, maxChars)) {
    return;
  }
  var n = normalizeText(text);
  var c = normalizeText(correct);
  if (n === c || n.indexOf(c) !== -1 || c.indexOf(n) !== -1) {
    return;
  }
  for (var i = 0; i < options.length; i++) {
    if (normalizeText(options[i]) === n) {
      return;
    }
  }
  options.push(text);
}

// ---------- Reading challenge ----------
// The readings a kanji can contribute inside a word (hiragana). kun readings lose their okurigana: おお(きい) -> おお
function kanjiReadingChoices(ch) {
  var list = [];
  var on = getKanjiOnyomi(ch);
  var kun = getKanjiKunyomi(ch);
  var i;
  for (i = 0; i < on.length; i++) {
    list.push(kataToHira(on[i]));
  }
  for (i = 0; i < kun.length; i++) {
    list.push(kun[i].split('(')[0]);
  }
  var unique = [];
  for (i = 0; i < list.length; i++) {
    if (list[i] && unique.indexOf(list[i]) === -1) {
      unique.push(list[i]);
    }
  }
  return unique;
}

// Every reading that is correct for this written word (some words are listed twice or have several readings)
function validReadingsOf(word) {
  var all = getChallengeWords();
  var list = [];
  for (var i = 0; i < all.length; i++) {
    if (all[i].word === word) {
      list.push(all[i].reading);
    }
  }
  return list;
}

// How close two readings look (longer shared start / end and the same length = more plausible mistake)
function readingLikeness(a, b) {
  var score = a.length === b.length ? 2 : -Math.abs(a.length - b.length);
  var p = 0;
  while (p < a.length && p < b.length && a.charAt(p) === b.charAt(p)) {
    p++;
  }
  var s = 0;
  while (s < a.length - p && s < b.length - p && a.charAt(a.length - 1 - s) === b.charAt(b.length - 1 - s)) {
    s++;
  }
  return score + p + s;
}

// Wrong readings made from the readings of the word's own kanji (火山 -> かさん, ひやま, ほやま ...),
// then real readings of other unlocked words as a back-up. Best (most plausible) first.
function buildReadingOptions(entry, unlocked) {
  var correct = entry.reading;
  var valid = validReadingsOf(entry.word);
  var maxChars = CHALLENGE_LABEL_MAX_CHARS.reading;

  // every combination of the readings of the characters of the word
  var combos = [''];
  for (var i = 0; i < entry.word.length; i++) {
    var ch = entry.word.charAt(i);
    var choices = KANJI_BY_CHAR[ch] ? kanjiReadingChoices(ch) : [ch];
    if (choices.length === 0) {
      choices = [ch];
    }
    var next = [];
    for (var a = 0; a < combos.length; a++) {
      for (var b = 0; b < choices.length; b++) {
        if (next.length < 400) {
          next.push(combos[a] + choices[b]);
        }
      }
    }
    combos = next;
  }
  var scored = [];
  var seen = {};
  for (var k = 0; k < combos.length; k++) {
    var text = combos[k];
    if (seen[text] || valid.indexOf(text) !== -1 || !HIRAGANA_RE.test(text) || text.length > maxChars) {
      continue;
    }
    seen[text] = true;
    scored.push({ text: text, score: readingLikeness(correct, text) + Math.random() * 0.5 });
  }
  scored.sort(function (x, y) { return y.score - x.score; });

  var options = [];
  for (var m = 0; m < scored.length && options.length < 8; m++) {
    options.push(scored[m].text);
  }
  // back-up: real readings of other unlocked words, nearest in length first
  var others = [];
  var all = getChallengeWords();
  for (var n = 0; n < all.length; n++) {
    if (all[n].word !== entry.word && wordIsUnlocked(all[n].word, unlocked) && valid.indexOf(all[n].reading) === -1 &&
        all[n].reading.length <= maxChars && options.indexOf(all[n].reading) === -1 && others.indexOf(all[n].reading) === -1) {
      others.push(all[n].reading);
    }
  }
  others = shuffled(others);
  others.sort(function (x, y) { return Math.abs(x.length - correct.length) - Math.abs(y.length - correct.length); });
  for (var o = 0; o < others.length && options.length < CHALLENGE_MAX_OPTIONS; o++) {
    options.push(others[o]);
  }
  return options.slice(0, CHALLENGE_MAX_OPTIONS);
}

// ---------- Vocabulary challenge ----------
// Mongolian meanings of other words. Meanings of unlocked words come first; the rest of the database is only a
// back-up (only the Mongolian text is shown, no Japanese the player has not unlocked).
function buildMeaningOptions(entry, unlocked) {
  var maxChars = CHALLENGE_LABEL_MAX_CHARS.vocab;
  var all = getChallengeWords();
  var first = [];
  var second = [];
  for (var i = 0; i < all.length; i++) {
    if (all[i].word === entry.word) {
      continue;
    }
    (wordIsUnlocked(all[i].word, unlocked) ? first : second).push(all[i].meaning);
  }
  var options = [];
  var pool = shuffled(first).concat(shuffled(second));
  for (var j = 0; j < pool.length && options.length < CHALLENGE_MAX_OPTIONS; j++) {
    addOption(options, pool[j], entry.meaning, maxChars);
  }
  return options;
}

// ---------- Context challenge ----------
function buildTranslationOptions(item, correctMeaning, unlocked) {
  var maxChars = CHALLENGE_LABEL_MAX_CHARS.context;
  var first = [];
  var second = [];
  for (var i = 0; i < KANJI_LIST.length; i++) {
    var other = KANJI_LIST[i];
    if (other === item) {
      continue;
    }
    var examples = getKanjiExamples(other.kanji);
    for (var j = 0; j < examples.length; j++) {
      if (examples[j] && typeof examples[j].meaning === 'string') {
        (unlocked[other.kanji] ? first : second).push(examples[j].meaning);
      }
    }
  }
  var options = [];
  var pool = shuffled(first).concat(shuffled(second));
  for (var k = 0; k < pool.length && options.length < CHALLENGE_MAX_OPTIONS; k++) {
    addOption(options, pool[k], correctMeaning, maxChars);
  }
  return options;
}

// ---------- Feedback text (uses the Phase 1 data only) ----------
// The on and kun readings of a kanji for the explanation line (kun without okurigana, no duplicates)
function kanjiReadingList(ch) {
  var all = getKanjiOnyomi(ch).concat(getKanjiKunyomi(ch).map(function (k) { return k.split('(')[0]; }));
  var unique = [];
  for (var i = 0; i < all.length; i++) {
    if (all[i] && unique.indexOf(all[i]) === -1) {
      unique.push(all[i]);
    }
  }
  return unique;
}

// 火 カ・ひ + 山 サン・やま
function readingBreakdown(word) {
  var parts = [];
  for (var i = 0; i < word.length; i++) {
    var ch = word.charAt(i);
    if (KANJI_BY_CHAR[ch]) {
      var readings = kanjiReadingList(ch);
      parts.push(readings.length > 0 ? ch + ' ' + readings.join('\u30FB') : ch);
    }
  }
  return parts.join(' + ');
}

// 火 Гал + 山 Уул
function meaningBreakdown(word) {
  var parts = [];
  for (var i = 0; i < word.length; i++) {
    var ch = word.charAt(i);
    var info = getKanjiInfo(ch);
    if (info && info.meaning) {
      parts.push(ch + ' ' + info.meaning);
    }
  }
  return parts.join(' + ');
}

// ---------- Building a challenge ----------
function makeReadingChallenge(item, unlocked) {
  var maxChars = CHALLENGE_LABEL_MAX_CHARS.reading;
  var words = unlockedWordsFor(item, unlocked).filter(function (w) { return w.reading.length <= maxChars; });
  var entry = pickFresh(words, 'reading');
  if (!entry) {
    return null;
  }
  var options = buildReadingOptions(entry, unlocked);
  if (options.length < CHALLENGE_MIN_OPTIONS) {
    return null;
  }
  return {
    type: 'reading',
    key: 'reading:' + entry.word,
    label: 'READ THIS WORD',
    prompt: entry.word,
    promptReading: '',
    long: false,
    correct: entry.reading,
    options: options,
    cursor: 0,
    // text shown after an answer: main line, then smaller lines
    answerMain: entry.word + ' = ' + entry.reading,
    answerLines: [entry.meaning, readingBreakdown(entry.word)]
  };
}

function makeVocabChallenge(item, unlocked) {
  var maxChars = CHALLENGE_LABEL_MAX_CHARS.vocab;
  var words = unlockedWordsFor(item, unlocked).filter(function (w) { return isUsableText(w.meaning, maxChars); });
  var entry = pickFresh(words, 'vocab');
  if (!entry) {
    return null;
  }
  var options = buildMeaningOptions(entry, unlocked);
  if (options.length < CHALLENGE_MIN_OPTIONS) {
    return null;
  }
  return {
    type: 'vocab',
    key: 'vocab:' + entry.word,
    label: 'WHAT DOES THIS MEAN?',
    prompt: entry.word,
    promptReading: '',
    long: false,
    correct: entry.meaning,
    options: options,
    cursor: 0,
    answerMain: entry.word + ' = ' + entry.meaning.toUpperCase(),
    answerLines: [entry.reading, meaningBreakdown(entry.word)]
  };
}

function makeContextChallenge(item, unlocked) {
  var maxChars = CHALLENGE_LABEL_MAX_CHARS.context;
  var examples = getKanjiExamples(item.kanji).filter(function (x) {
    return x && isUsableText(x.sentence, 40) && isUsableText(x.meaning, maxChars) &&
      typeof x.reading === 'string' && x.reading.length > 0 && sentenceIsUnlocked(x.sentence, unlocked);
  });
  var entry = pickFresh(examples, 'context');
  if (!entry) {
    return null;
  }
  var options = buildTranslationOptions(item, entry.meaning, unlocked);
  if (options.length < CHALLENGE_MIN_OPTIONS) {
    return null;
  }
  var readings = kanjiReadingList(item.kanji);
  return {
    type: 'context',
    key: 'context:' + entry.sentence,
    label: 'SHOOT THE MEANING OF',
    prompt: entry.sentence,
    promptReading: entry.reading,
    long: true,
    correct: entry.meaning,
    options: options,
    cursor: 0,
    answerMain: entry.meaning,
    answerLines: [entry.reading, item.kanji + ' = ' + item.meaning + (readings.length > 0 ? ' (' + readings.join('\u30FB') + ')' : '')]
  };
}

var CHALLENGE_BUILDERS = {
  reading: makeReadingChallenge,
  vocab: makeVocabChallenge,
  context: makeContextChallenge
};

// Remembers the type and the word, so the next question can be different
function noteChallengeAsked(type, key) {
  challengeStreak = type === lastChallengeType ? challengeStreak + 1 : 1;
  lastChallengeType = type;
  if (key) {
    recentChallengeKeys.push(key);
    while (recentChallengeKeys.length > CHALLENGE_RECENT_MEMORY) {
      recentChallengeKeys.shift();
    }
  }
}

// The challenge for this question, or null for the plain kanji question.
// Called by pickQuestion() once the kanji of the new question is known.
function buildChallengeFor(item) {
  if (!CHALLENGE_ENABLED || !item) {
    return null;
  }
  if (gameMode === MODE_ENDLESS && !CHALLENGE_IN_ENDLESS) {
    return null;
  }
  if (currentStage && CHALLENGE_SKIP_STAGE_KINDS.indexOf(currentStage.kind) !== -1) {
    return null;
  }
  var saved = progress[item.kanji];
  var hits = saved && typeof saved.hits === 'number' ? saved.hits : 0;
  if (hits < CHALLENGE_MIN_HITS) {
    noteChallengeAsked('kanji', '');
    return null; // not known well enough yet: plain kanji question
  }

  // Weighted choice. A new type is never asked twice in a row, the kanji question at most CHALLENGE_MAX_STREAK times.
  var weights = {};
  var types = ['kanji', 'reading', 'vocab', 'context'];
  var i;
  for (i = 0; i < types.length; i++) {
    var w = CHALLENGE_WEIGHTS[types[i]];
    weights[types[i]] = typeof w === 'number' && w > 0 ? w : 0;
  }
  // Review state of this kanji: weak / overdue question types are asked more, mastered ones less (js/srs.js)
  for (i = 0; i < types.length; i++) {
    weights[types[i]] *= srsCategoryFactor(item.kanji, types[i]);
  }
  var limit = lastChallengeType === 'kanji' ? CHALLENGE_MAX_STREAK : 1;
  if (challengeStreak >= limit && weights[lastChallengeType] > 0) {
    var others = 0;
    for (i = 0; i < types.length; i++) {
      others += types[i] === lastChallengeType ? 0 : weights[types[i]];
    }
    if (others > 0) {
      weights[lastChallengeType] = 0;
    }
  }
  var unlocked = unlockedKanjiSet();
  while (true) {
    var total = 0;
    for (i = 0; i < types.length; i++) {
      total += weights[types[i]];
    }
    if (total <= 0) {
      break;
    }
    var roll = Math.random() * total;
    var chosen = 'kanji';
    for (i = 0; i < types.length; i++) {
      roll -= weights[types[i]];
      if (weights[types[i]] > 0 && roll <= 0) {
        chosen = types[i];
        break;
      }
    }
    if (chosen === 'kanji') {
      break;
    }
    var made = CHALLENGE_BUILDERS[chosen](item, unlocked);
    if (made) {
      noteChallengeAsked(chosen, made.key);
      return made;
    }
    weights[chosen] = 0; // nothing usable for this kanji and type: try another type
  }
  noteChallengeAsked('kanji', '');
  return null;
}

// ---------- Text on the ships ----------
function isLabelInUse(text) {
  for (var i = 0; i < enemies.length; i++) {
    if (!enemies[i].dead && enemies[i].label === text) {
      return true;
    }
  }
  return false;
}

// The text for a new ship: the correct answer for the target, a different wrong option for every other ship.
// Returns null for the plain kanji question (the ship then shows its kanji as before).
function nextChallengeLabel(isTarget) {
  if (!challenge) {
    return null;
  }
  if (isTarget) {
    return challenge.correct;
  }
  var list = challenge.options;
  var n = list.length;
  for (var step = 0; step < n; step++) {
    var text = list[(challenge.cursor + step) % n];
    if (!isLabelInUse(text)) {
      challenge.cursor = (challenge.cursor + step + 1) % n;
      return text;
    }
  }
  return list[challenge.cursor % n]; // more ships than options: cannot happen on a normal screen
}

// A new question: every ship that is already flying gets a new text (the promoted ship the correct one)
function relabelEnemies() {
  var i;
  for (i = 0; i < enemies.length; i++) {
    enemies[i].label = null;
  }
  if (!challenge) {
    return;
  }
  for (i = 0; i < enemies.length; i++) {
    if (!enemies[i].dead && isActiveTarget(enemies[i])) {
      enemies[i].label = challenge.correct;
    }
  }
  for (i = 0; i < enemies.length; i++) {
    if (!enemies[i].dead && enemies[i].label === null) {
      enemies[i].label = nextChallengeLabel(false);
    }
  }
}

// ---------- Question bar and feedback ----------
// What the question bar shows: { label, text, reading, long }
function getQuestionBarInfo() {
  if (challenge) {
    return { label: challenge.label, text: challenge.prompt, reading: challenge.promptReading, long: challenge.long };
  }
  return {
    label: gameMode === MODE_ENDLESS ? 'BONUS KANJI FOR' : 'SHOOT THE KANJI FOR',
    text: question ? question.meaning.toUpperCase() : '-',
    reading: '',
    long: false
  };
}

// The message after an answer, or null for the plain kanji question (enemies.js then shows its usual message).
// correct = true: { text, lines } with the points; false: the right answer with reading, meaning and a short explanation.
function getChallengeFeedback(correct, pointsText) {
  if (!challenge) {
    return null;
  }
  var lines = challenge.answerLines.filter(function (line) { return typeof line === 'string' && line.length > 0; });
  if (correct) {
    return { text: challenge.answerMain + (pointsText ? '   ' + pointsText : ''), lines: lines.slice(0, 1) };
  }
  return { text: challenge.answerMain, lines: lines };
}

// ---------- Fitting a text answer on a ship plate ----------
// Splits text into lines no wider than maxWidth. Words stay together; Japanese text (no spaces) breaks by character.
function wrapPlateText(text, size, measure, maxWidth) {
  var tokens = text.indexOf(' ') !== -1 ? text.split(' ') : text.split('');
  var joiner = text.indexOf(' ') !== -1 ? ' ' : '';
  var lines = [];
  var line = '';
  for (var i = 0; i < tokens.length; i++) {
    var token = tokens[i];
    var tryLine = line === '' ? token : line + joiner + token;
    if (measure(tryLine, size) <= maxWidth) {
      line = tryLine;
      continue;
    }
    if (line !== '') {
      lines.push(line);
      line = '';
    }
    // a single word that is too wide is broken by character
    var rest = token;
    while (rest.length > 1 && measure(rest, size) > maxWidth) {
      var cut = rest.length - 1;
      while (cut > 1 && measure(rest.substring(0, cut), size) > maxWidth) {
        cut--;
      }
      lines.push(rest.substring(0, cut));
      rest = rest.substring(cut);
    }
    line = rest;
  }
  if (line !== '') {
    lines.push(line);
  }
  return lines;
}

// The largest font (down to CHALLENGE_PLATE_MIN_FONT) at which the text fits the plate: { size, lineH, lines }.
// measure(text, size) returns the width in pixels. Too long texts are cut with "..." (they are filtered out before).
function planPlateText(text, measure, maxWidth, maxHeight) {
  var size;
  var lineH;
  var lines;
  for (size = 16; size >= CHALLENGE_PLATE_MIN_FONT; size--) {
    lineH = size <= 10 ? size : size + 1;
    lines = wrapPlateText(text, size, measure, maxWidth);
    if (lines.length * lineH <= maxHeight) {
      return { size: size, lineH: lineH, lines: lines };
    }
  }
  size = CHALLENGE_PLATE_MIN_FONT;
  lineH = size;
  lines = wrapPlateText(text, size, measure, maxWidth);
  var maxLines = Math.max(1, Math.floor(maxHeight / lineH));
  lines = lines.slice(0, maxLines);
  lines[lines.length - 1] = lines[lines.length - 1].replace(/.$/, '\u2026');
  return { size: size, lineH: lineH, lines: lines };
}
