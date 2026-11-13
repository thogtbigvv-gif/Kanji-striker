'use strict';
/* js/kanji-info.js - safe read access to the kanji learning data (readings, vocabulary, example sentences).
   Load this file right after data.js. The game itself only needs kanji + meaning;
   every function here works with entries that have no learning data and never throws. */

// The entry of one kanji character (or null)
function getKanjiInfo(char) {
  return (typeof KANJI_BY_CHAR !== 'undefined' && KANJI_BY_CHAR[char]) || null;
}

function kanjiArrayField(char, field) {
  var info = getKanjiInfo(char);
  return info && Array.isArray(info[field]) ? info[field] : [];
}

function getKanjiOnyomi(char) {
  return kanjiArrayField(char, 'onyomi');
}

function getKanjiKunyomi(char) {
  return kanjiArrayField(char, 'kunyomi');
}

// [{ word, reading, meaning }]
function getKanjiVocabulary(char) {
  return kanjiArrayField(char, 'vocabulary');
}

// [{ sentence, reading, meaning }]
function getKanjiExamples(char) {
  return kanjiArrayField(char, 'examples');
}

function getKanjiJlpt(char) {
  var info = getKanjiInfo(char);
  return info && typeof info.jlpt === 'string' ? info.jlpt : '';
}

// True when the entry has readings, at least 2 words and at least 1 example sentence
function hasKanjiLearningData(char) {
  return (getKanjiOnyomi(char).length + getKanjiKunyomi(char).length) > 0 &&
    getKanjiVocabulary(char).length >= 2 &&
    getKanjiExamples(char).length >= 1;
}
