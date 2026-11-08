'use strict';
/* js/state.js - page elements and every variable that changes while the game runs.
   Load after config.js. */

// ---------- Page elements ----------
var appFooter = document.getElementById('appFooter');
var mainMenuSection = document.getElementById('mainMenuSection');
var gameSection = document.getElementById('gameSection');

var startGameButton = document.getElementById('startGameButton');
var kanjiCollectionButton = document.getElementById('kanjiCollectionButton');
var settingsButton = document.getElementById('settingsButton');
var pauseButton = document.getElementById('pauseButton');
var backToMenuButton = document.getElementById('backToMenuButton');

var collectionSection = document.getElementById('collectionSection');
var collectionSummary = document.getElementById('collectionSummary');
var collectionGrid = document.getElementById('collectionGrid');
var collectionBackButton = document.getElementById('collectionBackButton');

var settingsSection = document.getElementById('settingsSection');
var soundToggleButton = document.getElementById('soundToggleButton');
var resetProgressButton = document.getElementById('resetProgressButton');
var settingsMessage = document.getElementById('settingsMessage');
var settingsBackButton = document.getElementById('settingsBackButton');

var hpDisplay = document.getElementById('hpDisplay');
var scoreDisplay = document.getElementById('scoreDisplay');
var comboDisplay = document.getElementById('comboDisplay');

var canvas = document.getElementById('gameCanvas');
var ctx = canvas.getContext('2d');

// ---------- Game state ----------
var currentState = STATE_MENU;
var animationFrameId = null;
var lastTime = 0;
var totalTime = 0;
var questionSerial = 0; // changes for every new question, so old enemies can never match a new one
var answered = 0;       // correct answers in this run

var viewWidth = 0;
var viewHeight = 0;

var hp = 100;
var score = 0;
var combo = 0;

var player = {
  x: 0,
  y: 0,
  targetX: 0,
  isDragging: false,
  pointerId: null,
  dragPointerX: 0, // finger position when the touch started (relative control)
  dragShipX: 0,    // ship target position when the touch started (relative control)
  aimX: 0,         // finger position where it last rested (anchor of the aim lock)
  aimTimer: 0,     // seconds the finger has rested on the anchor
  fireHeld: false  // true while shooting is allowed (finger resting for at least AIM_DELAY)
};

var stars = [];

// Numbers of one run (added to the stage result)
function newRunStats() {
  return { correct: 0, wrong: 0, missed: 0, maxCombo: 0, shotsFired: 0, shotsHit: 0, bombsUsed: 0 };
}

var question = KANJI_LIST[0];
var questionPool = KANJI_LIST; // kanji that can become the question (replaced by the stage's own kanji)
var decoyPool = KANJI_LIST;    // kanji that can appear as wrong answers (stage kanji + its review kanji)
var enemies = [];
var bullets = [];
var particles = [];
var powerups = [];      // falling capsules: { type, x, y, dead }
var shieldActive = false; // true while the ship carries a shield
var slowTimer = 0;        // seconds of SLOW left (0 = not active)
var runStats = newRunStats(); // numbers of the current run (see newRunStats)
var waveHpLost = false;   // true when the ship took damage during the current wave (no PERFECT bonus)
var perfectWaves = 0;     // waves of this run cleared without losing HP
var bonusScore = 0;       // total points of wave / stage bonuses in this run
var powerLevel = 0;       // weapon levels from P capsules (one is lost when the ship takes real damage)
var bombs = 0;            // bombs in stock
var bombFlash = 0;        // seconds left of the white bomb flash
var enemyBullets = [];    // shots of the enemies and the boss: { x, y, vx, vy, dead }
var boss = null;          // the boss of a Boss Gate stage (null = none): see spawnBoss()
var tapStart = null;      // the touch that may become a tap: { id, t, x }
var lastTapAt = 0;        // time of the last tap (0 = none), for the double tap bomb
var fireTimer = 0;
var damageFlash = 0;
var gameOverAt = 0;
var bestScore = 0;
var newBest = false;
var toast = { text: '', color: '#ffffff', time: 0 };
var progress = {};
var campaign = null;          // saved campaign progress (see storage.js)
var campaignReadOnly = false; // true if the saved campaign data comes from a newer version
var soundEnabled = true;
var audioContext = null;

// ---------- Stage / wave state ----------
var currentStageId = null;     // id of the stage being played, e.g. "w1-s1"
var currentStage = null;       // its entry in CAMPAIGN_STAGES (world, number, kanji, ...)
var stageWaves = [];           // the waves of the stage being played
var stageCompleteFired = false; // makes sure the completion happens only once per run
var stageResult = null;        // filled when the last wave is cleared; read by the later Stage Clear step
var targetLost = false;        // true after the correct target was missed and no new target has spawned yet
var rescueTimer = -1;          // countdown for the rescue ship (-1 = not running)
// phase: 'none' | 'intro' (banner) | 'spawning' | 'clearing' (all spawned, waiting) | 'gap' (between waves)
var waveState = { index: 0, phase: 'none', timer: 0, groupIndex: 0, groupTimer: 0 };

// Test hook: open the page with ?stage=w1-s5 and START GAME plays that stage even if it is still locked
var debugStageId = null;
try {
  var debugParam = new URLSearchParams(window.location.search).get('stage');
  if (debugParam && CAMPAIGN_STAGES[debugParam]) {
    debugStageId = debugParam;
  }
} catch (error) {
  /* ignore: no test hook */
}

var START_BUTTON_LABEL = startGameButton.textContent;
var startLabelTimer = null;
