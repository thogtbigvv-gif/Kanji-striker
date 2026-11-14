'use strict';
/* js/config.js - tuning numbers, sprites, enemy kinds and wave plans.
   Load after data.js. To change how the game FEELS, edit the numbers here. */

// ---------- Game state names ----------
var STATE_MENU = 'MENU';
var STATE_PLAYING = 'PLAYING';
var STATE_PAUSED = 'PAUSED';
var STATE_GAME_OVER = 'GAME_OVER';
var STATE_STAGE_COMPLETE = 'STAGE_COMPLETE'; // every wave of the stage was cleared

// ---------- Saved data keys (never change the old ones) ----------
var KEY_BEST = 'kanjiStrikerBestScore';
var KEY_PROGRESS = 'kanjiStrikerProgress';
var KEY_SOUND = 'kanjiStrikerSound';
var KEY_CAMPAIGN = 'kanjiStrikerCampaign'; // new key; the keys above are never changed
var KEY_HELP = 'kanjiStrikerHelpSeen';       // set after the HOW TO PLAY screen was shown once
var KEY_XP = 'kanjiStrikerXp';             // total XP earned from stage results (added in v0.4.0)
var KEY_ENDLESS_BEST = 'kanjiStrikerEndlessBest'; // best score of the ENDLESS mode (added in v0.7.0)

// ---------- Game modes (v0.7.0) ----------
var MODE_CAMPAIGN = 'campaign'; // galaxy stages, one correct kanji per question
var MODE_ENDLESS = 'endless';   // waves never stop; every ship can be shot down for points

// ---------- Gameplay tuning ----------
var FIRE_INTERVAL = 0.2;   // seconds between shots
var BULLET_SPEED = 560;    // pixels per second
var BULLET_HIT_PADDING = 3; // extra pixels on each side of an enemy where a bullet still counts as a hit
var BULLET_OFFSCREEN_Y = -10; // a bullet higher than this has left the screen and is removed
var ARMOR_HIT_FLASH = 0.12;   // seconds an armored ship flashes after a hit that only cracks its armor
var MAX_FRAME_TIME = 0.05;    // longest time step (seconds) simulated in one frame, so a lag spike never skips ahead
var PLAYER_FOLLOW = 16;    // how fast the ship follows the finger (per second)
var RELATIVE_CONTROL = true;   // true: the ship moves by how far the finger moved (finger can be anywhere)
                               // false: the ship goes to the exact spot where the finger is
// Aim lock: the ship shoots ONLY while the finger rests on one spot. Touching the screen does not shoot
// at once: the finger must stay still for AIM_DELAY seconds first. Moving the finger further than
// AIM_TOLERANCE pixels stops shooting immediately, and the finger must rest again before the next shot.
// So moving the ship never shoots, and a wrong kanji can be passed (or dodged) safely.
var AIM_DELAY = 0.2;     // seconds the finger must rest before the ship starts shooting
var AIM_TOLERANCE = 10;  // pixels the finger may wobble while still counting as resting
var CONTROL_SENSITIVITY = 1.2; // relative control only: 1 = ship moves as far as the finger, 1.2 = a bit more
// Weapon power-up: the ship shoots more bullets side by side while the combo is high.
// Any damage resets the combo, so it also drops the weapon back to a single shot.
var DOUBLE_SHOT_COMBO = 5;  // combo needed for 2 bullets
var TRIPLE_SHOT_COMBO = 10; // combo needed for 3 bullets
var BULLET_SPREAD = 7;      // pixels between bullets that are fired side by side

// Dash: a quick flick of the finger (touch / mouse) or Space / Shift (keyboard) throws the ship sideways.
// While the dash lasts (and a moment after it) the ship is a ghost: enemy ships and enemy bullets pass through it
// without any damage. Dashing is a pure dodge: it does not shoot, and it needs DASH_COOLDOWN seconds to recharge.
var DASH_DISTANCE = 130;      // pixels the ship travels during one dash
var DASH_TIME = 0.16;         // seconds the dash movement lasts
var DASH_GRACE = 0.1;         // extra seconds of ghost time after the movement ends
var DASH_COOLDOWN = 1.2;      // seconds from the start of a dash until the next dash is possible
var DASH_FLICK_DIST = 70;     // the finger must move this many pixels ...
var DASH_FLICK_TIME = 0.1;    // ... within this many seconds to count as a flick
var DASH_MIN_ROOM = 25;       // no dash when the screen edge is closer than this in the flick direction (pixels)
var DASH_GHOST_LIFE = 0.25;   // seconds an afterimage of the dash takes to fade out

// Smart questions: kanji the player struggles with are asked and shown more often,
// new kanji sooner, and well-known kanji less often.
var WEIGHT_PER_STRUGGLE = 0.8; // extra chance for each time (misses - hits) the player got a kanji wrong
var MAX_STRUGGLE = 5;          // limit of that bonus, so one hard kanji cannot take over the game
var NEW_KANJI_WEIGHT = 2;      // a kanji the player has never seen yet
var MASTERED_WEIGHT = 0.5;     // a kanji answered correctly many times without trouble

// Score / HP balance
var MAX_HP = 100;
var MAX_SCORE_MULTIPLIER = 5; // points = 10 x min(combo, this), so a long streak cannot make the score explode
var COMBO_HEAL_EVERY = 5;     // every this many correct answers in a row heal the ship
var HEAL_AMOUNT = 5;          // HP restored by one streak reward (never above MAX_HP)
var WRONG_HIT_DAMAGE = 10;    // shooting a wrong kanji
var TARGET_ESCAPE_DAMAGE = 10; // the correct kanji reached the bottom
var TARGET_CRASH_DAMAGE = 15;  // the correct kanji crashed into the ship
var DECOY_CRASH_DAMAGE = 10;   // a wrong kanji crashed into the ship (same as shooting a wrong kanji)
var REF_HEIGHT = 640;      // screen height the enemy speed is tuned for
var MAX_DPR = 3;           // limits canvas size on very dense Android screens
var MAX_PARTICLES = 240;   // most sparks on screen at once, so a bomb in a busy endless wave cannot slow down a weak phone

// Power-up capsules: every POWERUP_EVERY-th correct answer drops a capsule where the target was destroyed.
// Fly the ship into it to collect it. Bullets pass through capsules, and missed capsules just fall away.
//   SHIELD = blocks the next damage completely (HP and combo are both kept)
//   SLOW   = every enemy moves slower for SLOW_DURATION seconds
//   REPAIR = restores REPAIR_AMOUNT HP (at full HP it gives bonus points instead)
// The capsule type is not fully random: REPAIR is likely when HP is low, SHIELD never drops while a
// shield is already carried, SLOW is rare while it is still running.
var POWERUP_EVERY = 3;       // a capsule drops every this many correct answers (answered counter of the run)
var POWERUP_FALL_SPEED = 90; // pixels per second (at the reference screen height)
var POWERUP_SIZE = 22;       // capsule size in pixels
var SLOW_DURATION = 5;       // seconds the SLOW effect lasts
var SLOW_FACTOR = 0.5;       // enemy speed while SLOW is active (0.5 = half speed)
var REPAIR_AMOUNT = 20;      // HP restored by a REPAIR capsule (never above MAX_HP)
var REPAIR_FULL_HP_SCORE = 50; // points given when a REPAIR capsule is collected at full HP
var LOW_HP_LIMIT = 50;       // at or below this HP, REPAIR capsules become much more likely
var REPAIR_LOW_HP_WEIGHT = 3;  // chance weight of REPAIR when HP is low (SHIELD = 1)
var REPAIR_HURT_WEIGHT = 0.5;  // chance weight of REPAIR when HP is below max but not low (0 at full HP)
var SLOW_ACTIVE_WEIGHT = 0.3;  // chance weight of SLOW while a SLOW is still running
var POWERUP_TYPES = ['shield', 'slow', 'repair', 'power', 'bomb'];
var POWERUP_STYLE = {
  shield: { color: '#66e0ff', letter: 'S' },
  slow:   { color: '#c58bff', letter: 'T' },
  repair: { color: '#5dff8a', letter: 'R' },
  power:  { color: '#ffb347', letter: 'P' },
  bomb:   { color: '#ff6b86', letter: 'B' }
};

// ---------- Arcade: weapon power, bombs, shooting enemies, boss ----------
// POWER (P) = +1 weapon level (max MAX_POWER_LEVEL from capsules). The weapon level is the combo bonus
// (1 / 2 / 3 bullets) plus the power level, at most MAX_WEAPON_LEVEL bullets. Real damage costs one power level.
// BOMB (B) = +1 bomb (max MAX_BOMBS). Double tap the screen (or press B) to use one: every WRONG ship and every
// enemy bullet is destroyed, the boss takes damage, but the CORRECT kanji ship survives (you still have to answer).
var MAX_WEAPON_LEVEL = 5;
var MAX_POWER_LEVEL = 2;
var POWER_WEIGHT = 1.5;      // capsule chance weight of POWER (SHIELD = 1); 0 when the power level is already max
var BOMB_WEIGHT = 0.6;       // capsule chance weight of BOMB; 0 when the bomb stock is full
var MAX_BOMBS = 3;
var BOMB_START = 1;          // bombs at the start of every stage
var BOMB_SCORE_PER_SHIP = 10;
var BOMB_BOSS_DAMAGE = 12;
var TAP_MAX_TIME = 0.18;     // a touch shorter than this (and without moving) is a tap; below AIM_DELAY so a tap never shoots
var TAP_MAX_MOVE = 14;       // pixels the finger may move during a tap
var DOUBLE_TAP_TIME = 0.35;  // two taps within this many seconds = bomb
var WEAPON_NAMES = ['', 'SINGLE SHOT', 'DOUBLE SHOT', 'TRIPLE SHOT', 'QUAD SHOT', 'MAX SHOT'];
var WEAPON_COLORS = ['', '#ffd21f', '#ffd21f', '#ff6b86', '#ff9a3c', '#c58bff'];

// Enemy fire: ships of the shooting kinds (normal / fast / big) may carry a gun (a small red bar under the kanji plate,
// it flashes white just before the shot). STAGE_FIRE = chance per ship, only from wave 2 on. Bullets fly straight down.
var ENEMY_BULLET_SPEED = 190;   // pixels per second at the reference screen height
var ENEMY_BULLET_DAMAGE = 10;
var ENEMY_FIRE_INTERVAL = 2.4;  // seconds between two shots of one ship
var ENEMY_FIRE_FIRST_MIN = 0.5; // first shot comes this many seconds after the ship is in the firing zone (random up to MAX)
var ENEMY_FIRE_FIRST_MAX = 1.3;
var ENEMY_FIRE_MIN_Y = 30;      // ships shoot only when their top is below this y ...
var ENEMY_FIRE_MAX_Y = 0.55;    // ... and above this part of the screen height (so a shot can always be dodged)
var ENEMY_BULLET_W = 6;
var ENEMY_BULLET_H = 12;
var STAGE_FIRE = { 1: 0, 2: 0.2, 3: 0.3, 4: 0.4, 5: 0.3 };

// Boss (the Boss Gate stage, stage 5 of every world): a boss fight is the last wave. Kanji ships keep coming
// while the boss shoots. Damage: a correct answer = BOSS_ANSWER_DAMAGE, one bullet = BOSS_SHOT_DAMAGE, bomb = BOMB_BOSS_DAMAGE.
var BOSS_PIXEL = 6;
var BOSS_HP = 160;
var BOSS_ANSWER_DAMAGE = 8;
var BOSS_SHOT_DAMAGE = 0.12;
var BOSS_DEFEAT_BONUS = 1000;
var BOSS_REST_Y = 70;           // top of the boss when it is in position
var BOSS_ENTER_SPEED = 80;      // pixels per second while it flies in
var BOSS_DYING_TIME = 1.4;      // seconds of explosions before the stage is complete
var BOSS_FIRE_INTERVAL = [1.9, 1.6, 1.25]; // seconds between volleys in phase 1 / 2 / 3
var BOSS_SWAY_SPEED = [0.7, 1.0, 1.35];   // sideways speed (radians per second) in phase 1 / 2 / 3
var BOSS_WAVE_SPEED = 70;       // speed of the kanji ships during the boss fight (slower: you also have to dodge)
var BOSS_FIRST_GROUP_DELAY = 2.2;
var BOSS_PIXELS = [
  'R.....RRR.....R',
  'RR...RRRRR...RR',
  'RRRRRRRRRRRRRRR',
  'RRDRRWRRRWRRDRR',
  'RRDDRRRRRRRDDRR',
  '.RRRRRDDDRRRRR.',
  '..RRRR...RRRR..',
  '...RR.....RR...',
  '...D.......D...'
];
var BOSS_W = BOSS_PIXELS[0].length * BOSS_PIXEL;
var BOSS_H = BOSS_PIXELS.length * BOSS_PIXEL;
var BOSS_COLORS = [
  { R: '#9b6bff', D: '#4b2a9a', W: '#ffffff' },   // phase 1
  { R: '#ff7a1f', D: '#8a3a0a', W: '#ffe36b' },   // phase 2
  { R: '#ff4d6d', D: '#8a0a26', W: '#ffffff' }    // phase 3
];
var BOSS_FLASH_COLORS = { R: '#ffffff', D: '#cfd6e6', W: '#ffffff' };

// Score bonuses (added to the score when the wave / stage is cleared)
var WAVE_CLEAR_BONUS = 200;    // every cleared wave
var PERFECT_WAVE_BONUS = 100;  // extra, when the ship lost no HP during that wave
var STAGE_CLEAR_BONUS = 500;   // extra, for clearing the last wave of the stage

// ---------- Sizes and fonts ----------
var ENEMY_WIDTH = 44;
var ENEMY_HEIGHT = 54;
var KANJI_VISIBLE_Y = 12; // an enemy can be hit only after its kanji is below the question banner
var KANJI_FONT = '"Hiragino Sans", "Yu Gothic", "Noto Sans JP", "Noto Sans CJK JP", "MS Gothic", sans-serif';

// ---------- Pixel ship drawing ----------
var PIXEL = 3;
var SHIP_COLORS = {
  R: '#e0123c', // body
  L: '#ff6b86', // light red highlight (nose and spine)
  D: '#8a0a26', // dark red shade
  C: '#66e0ff', // canopy
  B: '#d8f8ff', // canopy glint
  W: '#ffffff', // nose tip
  G: '#aeb6c6', // metal wing edge
  M: '#5b6578', // engine nozzle
  Y: '#ffd21f'  // wing tip light
};
// The shape is symmetric. Keep it 11 pixels wide and 10 rows high: the size is used for collisions.
var SHIP_PIXELS = [
  '.....W.....',
  '....RLR....',
  '....RBR....',
  '...RRCRR...',
  '..RRRCRRR..',
  '.GRRRCRRRG.',
  'GRDRRLRRDRG',
  'YG.DRLRD.GY',
  'Y..RRDRR..Y',
  '...M...M...'
];
// Engine flame under each nozzle (columns 3 and 7): hot core first, cooler tip last (the last colour flickers)
var SHIP_FLAME_COLORS = ['#ffd21f', '#ff7a1f', '#d4143c'];
var SHIP_WIDTH = SHIP_PIXELS[0].length * PIXEL;
var SHIP_HEIGHT = SHIP_PIXELS.length * PIXEL;

var ENEMY_PIXEL = 4;
var ENEMY_PIXELS = [
  'B.......B',
  'BB.YYY.BB',
  'BBBYYYBBB',
  '.BBDDDBB.',
  '..B.D.B..'
];

// ---------- Enemy kinds ----------
// Every kind carries a kanji, exactly like the normal ship. The kind only changes how the ship behaves:
//   normal = the standard blue ship
//   fast   = orange, flies much faster (speedMult, capped by maxSpeed), worth more points
//   big    = purple, large and slow, takes 2 hits (armor) before the answer counts, worth double points
//   split  = green, ALWAYS a wrong answer: when it reaches SPLIT_AT_Y of the screen it breaks into 2 mini ships
//   mini   = small green ship made by a split, always a wrong answer, drifts sideways
// scale = size compared to the normal ship, score = points multiplier for a correct answer
var SPLIT_AT_Y = 0.35;  // the splitter breaks apart when its top is below this part of the screen height
var MINI_DRIFT = 70;    // sideways speed of the mini ships (pixels per second)
var ENEMY_KINDS = {
  normal: { scale: 1,    armor: 1, speedMult: 1,    maxSpeed: 0,   score: 1,   border: '#ffd21f',
            colors: { B: '#2f7bff', D: '#123a8a', Y: '#ffd21f', L: '#7fb2ff', W: '#ffffff' },
            sprite: [ // wings up, wings down (the ship flaps)
              ['B.......B', 'BB.LYL.BB', 'BBBYWYBBB', '.BBDDDBB.', '..B.D.B..'],
              ['.........', 'B..LYL..B', 'BBBYWYBBB', 'BBBDDDBBB', '.B..D..B.']
            ] },
  fast:   { scale: 1,    armor: 1, speedMult: 1.6,  maxSpeed: 170, score: 1.5, border: '#ff9a3c',
            colors: { B: '#ff7a1f', D: '#8a3a0a', Y: '#ffe36b', L: '#ffb36b', W: '#ffffff' },
            sprite: [ // a dart that points down; the wing tips sweep back and forth
              ['B.BBBBB.B', '.BBLYLBB.', '..BBYBB..', '...BDB...', '....D....'],
              ['.B.BBB.B.', 'B.BLYLB.B', '..BBYBB..', '...BDB...', '....D....']
            ] },
  big:    { scale: 1.5,  armor: 2, speedMult: 0.75, maxSpeed: 0,   score: 2,   border: '#b99bff',
            colors: { B: '#9b6bff', D: '#4b2a9a', Y: '#ffd21f', L: '#cbb0ff', W: '#ffffff' },
            sprite: [ // heavy armored hull with plating
              ['DBBBBBBBD', 'BBLLYLLBB', 'BDBYWYBDB', 'BBDDDDDBB', '.D.B.B.D.'],
              ['DBBBBBBBD', 'BBLLYLLBB', 'BDBYWYBDB', 'BBDDDDDBB', 'D..B.B..D']
            ] },
  split:  { scale: 1.25, armor: 1, speedMult: 0.9,  maxSpeed: 0,   score: 1,   border: '#5dff8a',
            colors: { B: '#3ddc84', D: '#1a7a46', Y: '#eaffb0', L: '#9bffbf', W: '#ffffff' },
            sprite: [ // two halves with a seam that opens and closes: it is about to break apart
              ['.BBB.BBB.', 'BLBYDYBLB', 'BBBBDBBBB', '.BBBDBBB.', '..B.D.B..'],
              ['.BBB.BBB.', 'BLBY.YBLB', 'BBBBDBBBB', '.BBBDBBB.', '..B.D.B..']
            ] },
  mini:   { scale: 0.75, armor: 1, speedMult: 1.1,  maxSpeed: 0,   score: 1,   border: '#5dff8a',
            colors: { B: '#3ddc84', D: '#1a7a46', Y: '#eaffb0', L: '#9bffbf', W: '#ffffff' },
            sprite: [ // a compact little bug
              ['.........', 'B.BBBBB.B', 'BBBYWYBBB', '.BBBDBBB.', '..B...B..'],
              ['.........', '.BBBBBBB.', 'BBBYWYBBB', 'B.BBDBB.B', '.........']
            ] }
};
// ---------- Enemy movement paths ----------
// A normal single ship (never a row / V, never a special kind) may fly a special path instead of falling straight.
// Which paths a stage uses, and how often, is set in STAGE_TUNING (paths / pathChance). The Introduction wave never uses them.
//   zigzag = sharp left-right turns (a triangle wave, not a smooth sway)
//   circle = loops around while it falls
//   side   = enters from the left or right edge, flies in diagonally, then falls straight
var PATH_ZIGZAG_AMP = 58;      // pixels from the centre line to each turn
var PATH_ZIGZAG_PERIOD = 2.0;  // seconds for one full left-right-left
var PATH_CIRCLE_RADIUS = 30;   // pixels
var PATH_CIRCLE_PERIOD = 3.0;  // seconds per loop
var PATH_SIDE_SPEED = 170;     // sideways speed (pixels per second) while flying in from the edge
var PATH_SIDE_START_MIN = 70;  // the side ship appears this far from the top (pixels) ...
var PATH_SIDE_START_RANGE = 70; // ... plus a random amount up to this
// Orderly movement: ships appear in fixed LANES (columns) instead of random x positions, every swaying ship moves
// in sync (same clock, same direction), and ships never fly through each other.
var LANE_GAP = 14;        // free space (pixels) between two neighbouring lanes, next to the ship width
var LANE_SWAY_PAD = 30;   // the lanes keep this much room to the screen edge; it is also the biggest sway distance
var LANE_CLEAR_Y = 130;   // a lane counts as busy while a ship is still above this y (pixels)
var SEP_GAP = 6;          // minimum free space (pixels) between a ship and the ship in front of it
var PATH_CLEAR_Y = 0.45;  // special paths (zigzag / circle / side) start only when every ship is below this part of the screen
var PATH_WAIT_MAX = 2.5;  // seconds a special-path ship may wait for that clear space; after that it flies a normal way
var ENEMY_FLASH_COLORS = { B: '#ffffff', D: '#cfd6e6', Y: '#ffffff', L: '#ffffff', W: '#ffffff' }; // shown for a moment when an armor hit lands

// ---------- Stage Wave System: timings and wave plans ----------
// A stage is played as a sequence of waves. Each wave is a fixed list of enemy groups (a single ship,
// a row or a V formation) that appear one after another. The next wave starts ONLY when every enemy of
// the current wave is defeated or has left the screen. When the last wave is cleared the game enters
// STATE_STAGE_COMPLETE, stores the result in stageResult and fires one "kanjiStriker:stageComplete" event.
var WAVE_INTRO_TIME = 1.6;  // seconds the "WAVE n" banner is shown (nothing spawns during it)
var WAVE_GAP_TIME = 0.5;    // short quiet pause after a wave is cleared, before the next banner
var V_FORMATION_LIFT = 40;  // how much higher the outer ships of a V start (pixels)
var EMPTY_SCREEN_GAP = 0.35; // when the screen is empty, the next group comes after this many seconds
var RESCUE_DELAY = 0.8;      // a missed correct target comes back after this many seconds (last group only)
var STAGE_COMPLETE_EVENT = 'kanjiStriker:stageComplete';

// Stage result screen: stars and XP
var STAGE_RESULTS_DELAY = 1.3; // seconds the STAGE COMPLETE text stays on the canvas before the results screen opens
var STAR_2_ACCURACY = 70;      // 2 stars: accuracy at least this many percent
var STAR_3_ACCURACY = 90;      // 3 stars: accuracy at least this many percent ...
var STAR_3_MIN_HP = 50;        // ... and at least this much HP left
var XP_STAGE_CLEAR = 50;       // XP for clearing a stage
var XP_PER_ANSWER = 5;         // XP for each correct answer
var XP_PER_WAVE = 10;          // XP for each wave cleared
var XP_THREE_STAR_BONUS = 25;  // extra XP for 3 stars

// speed = enemy speed in pixels per second (at the reference screen height), groupGap = seconds between groups
var WAVE_DEFS = [
  {
    name: 'Introduction',
    speed: 62,
    groupGap: 1.6,
    groups: [
      { count: 1, shape: 'single' },
      { count: 1, shape: 'single' },
      { count: 2, shape: 'row' },
      { count: 1, shape: 'single' }
    ]
  },
  {
    name: 'Formation Attack',
    speed: 74,
    groupGap: 2.4,
    groups: [
      { count: 2, shape: 'row' },
      { count: 3, shape: 'v' },
      { count: 3, shape: 'row' }
    ]
  },
  {
    name: 'Mixed Attack',
    speed: 86,
    groupGap: 2.0,
    sway: { chance: 0.5, amplitude: 26, period: 2.6 }, // half of the groups sway left and right
    groups: [
      { count: 1, shape: 'single' },
      { count: 2, shape: 'row' },
      { count: 3, shape: 'v' },
      { count: 1, shape: 'single' },
      { count: 3, shape: 'row' }
    ]
  },
  {
    name: 'Final Wave',
    speed: 98,
    groupGap: 1.7,
    sway: { chance: 0.7, amplitude: 34, period: 2.2 }, // most groups sway left and right
    groups: [
      { count: 2, shape: 'row' },
      { count: 3, shape: 'v' },
      { count: 1, shape: 'single' },
      { count: 3, shape: 'row' },
      { count: 2, shape: 'row' },
      { count: 1, shape: 'single' }
    ]
  }
];

// Difficulty per stage number (1-4). speed and gap multiply the wave values above:
// speed 1.1 = enemies 10% faster, gap 0.9 = the next group comes 10% sooner.
// sway multiplies how far swaying groups move sideways (0 = no swaying in that stage). In a wave with sway EVERY ship sways
// together, at most LANE_SWAY_PAD pixels (the chance value in WAVE_DEFS is no longer used).
// extraGroups are added to the end of every wave of that stage.
// paths = special movement paths (see Enemy movement paths) that single ships of that stage may use; pathChance = chance per single ship.
// specials = enemy kinds (see Enemy kinds) added as single ships to every wave EXCEPT the first one
// (Introduction); the Final Wave gets them twice. Stage 1 has none, so the first stage stays gentle.
var STAGE_TUNING = {
  1: { speed: 0.9, gap: 1.15, sway: 0, extraGroups: [], specials: [], paths: [], pathChance: 0 },                                  // New Kanji: gentle start
  2: { speed: 1.0, gap: 1.0, sway: 0.6, extraGroups: [], specials: ['fast'], paths: ['zigzag'], pathChance: 0.35 },                           // Review Run: fast ships appear
  3: { speed: 1.1, gap: 0.9, sway: 1.0, extraGroups: [{ count: 2, shape: 'row' }], specials: ['fast', 'big'],
       paths: ['zigzag', 'side'], pathChance: 0.4 }, // Big Waves: + armored big ships
  4: { speed: 1.2, gap: 0.8, sway: 1.3, extraGroups: [{ count: 3, shape: 'v' }, { count: 1, shape: 'single' }],
       specials: ['fast', 'big', 'split'], paths: ['zigzag', 'side', 'circle'], pathChance: 0.5 }                                                              // Hard Fight: + splitters
};
// The Boss Gate stage (5): normal waves 1-2 with these values, then the boss fight
STAGE_TUNING[5] = { speed: 1.1, gap: 0.9, sway: 1.0, extraGroups: [], specials: ['fast', 'big'], paths: ['zigzag', 'side'], pathChance: 0.35 };
var DEFAULT_TUNING = { speed: 1.0, gap: 1.0, sway: 1.0, extraGroups: [], specials: [], paths: [], pathChance: 0 };

// ---------- Endless mode (v0.7.0) ----------
// Every ship that appears can be shot down. The ship that carries the kanji of the question bar is the BONUS target.
// Waves never stop: speed, group size, special ships and enemy fire all grow with the wave number.
var ENDLESS_ESCAPE_DAMAGE = 4;    // HP lost when a ship reaches the bottom (the small mini ships of a splitter are free)
var ENDLESS_KILL_POINTS = 4;      // base points of a normal ship (x combo multiplier x ship kind); a BONUS kanji gives 10
var ENDLESS_HEAL_COMBO = 10;      // every this many kills in a row heal the ship (campaign uses COMBO_HEAL_EVERY)
var ENDLESS_POWERUP_EVERY = 8;    // a capsule drops every this many ordinary kills (BONUS kanji use POWERUP_EVERY)
var ENDLESS_BOSS_EVERY = 5;       // every 5th wave is a boss wave
var ENDLESS_SPEED_START = 62;     // ship speed of wave 1 (pixels per second at the reference height)
var ENDLESS_SPEED_STEP = 5;       // speed added by every wave
var ENDLESS_SPEED_MAX = 150;      // the speed never grows past this
var ENDLESS_WAVE_NAMES = ['Warm Up', 'Rush Hour', 'Swarm', 'Crossfire', 'Meteor Storm', 'Overdrive'];

// ---------- Polish: screen shake, floating points, master volume (v0.7.1) ----------
var SHAKE_ENABLED = true;     // false = never shake the screen (it is also off when the device asks for reduced motion)
var SHAKE_HURT = 6;           // pixels of shake when the ship takes real damage ...
var SHAKE_HURT_TIME = 0.25;   // ... for this many seconds (the shake fades out)
var SHAKE_BOMB = 9;
var SHAKE_BOMB_TIME = 0.35;
var SHAKE_BOSS_DOWN = 10;
var SHAKE_BOSS_DOWN_TIME = 0.7;
var FLOATER_LIFE = 0.9;       // seconds a floating "+points" text stays on screen
var FLOATER_RISE = 46;        // pixels per second it floats upwards
var MASTER_VOLUME = 0.85;     // 0-1, all sounds go through one volume control and a limiter

// ---------- Learning challenges (Phase 2) ----------
// Besides the normal "shoot the kanji for this meaning" question, a question can also be a READING, a VOCABULARY
// or a CONTEXT challenge (see js/challenges.js). The ships, the shooting and the scoring stay exactly the same: only
// the question bar and the text on the ship plates change. Everything here can be tuned without touching the code.
var CHALLENGE_ENABLED = true;               // false = the game plays exactly like before (kanji questions only)
var CHALLENGE_IN_ENDLESS = false;           // the ENDLESS mode keeps the plain kanji questions
var CHALLENGE_SKIP_STAGE_KINDS = ['learn']; // the "New Kanji" stage only introduces kanji
var CHALLENGE_WEIGHTS = { kanji: 5, reading: 2, vocab: 2, context: 1.5 }; // relative chance of every question type
var CHALLENGE_MIN_HITS = 1;                 // a kanji must have been answered correctly this often before it gets a harder question
var CHALLENGE_MAX_STREAK = 2;               // the same question type is never asked more than this many times in a row (new types: once)
var CHALLENGE_RECENT_MEMORY = 6;            // the last few asked words / sentences are not repeated
var CHALLENGE_MIN_OPTIONS = 8;              // fewer wrong options than this = fall back to the plain kanji question
var CHALLENGE_MAX_OPTIONS = 24;             // wrong options prepared per question (more than enough for one screen)
var CHALLENGE_LABEL_MAX_CHARS = { reading: 8, vocab: 22, context: 22 }; // longer answers do not fit on a ship plate
var CHALLENGE_PLATE_WIDTH = 52;             // drawn width of a ship plate that carries a text answer (the hitbox stays ENEMY_WIDTH)
var CHALLENGE_PLATE_MIN_FONT = 9;           // smallest font used on a plate
var CHALLENGE_WRONG_TOAST_TIME = 3.0;       // seconds the explanation of a wrong answer stays on screen (it never pauses the game)

// ---------- Spaced repetition (Phase 3) ----------
// Every kanji is tracked in four categories (kanji recognition, reading, vocabulary, context). Each category gets its own
// review schedule (js/srs.js). The learning data is saved under its own key; the old progress key is never changed.
var KEY_LEARNING = 'kanjiStrikerLearning'; // added in Phase 3 (versioned)
var SRS_ENABLED = true;                    // false = no review priorities (answers are still recorded)
// Scheduling (a modified SM-2). Intervals are in days.
var SRS_AGAIN_MINUTES = 10;                // wrong answer: review again after this many minutes
var SRS_FIRST_HARD_DAYS = 1;               // first success after "new" or after a mistake: hard / good / easy
var SRS_FIRST_GOOD_DAYS = 3;
var SRS_FIRST_EASY_DAYS = 7;
var SRS_HARD_FACTOR = 1.2;                 // later successes: interval x 1.2 (hard), x ease (good), x ease x 1.3 (easy)
var SRS_EASY_BONUS = 1.3;
var SRS_EASE_START = 2.5;
var SRS_EASE_MIN = 1.3;                    // a kanji that keeps failing never grows faster than x1.3 per review
var SRS_EASE_MAX = 3.0;
var SRS_EASE_AGAIN = -0.2;                 // ease change after a wrong answer / hard / easy answer
var SRS_EASE_HARD = -0.15;
var SRS_EASE_EASY = 0.15;
var SRS_MAX_DAYS = 180;                    // longest interval
// The game only knows right / wrong. A right answer counts as: easy = fast, hard = very slow, otherwise good.
var SRS_EASY_MS = 5000;
var SRS_HARD_MS = 20000;
var SRS_MAX_ANSWER_MS = 60000;             // slower than this (pause, waiting for a ship) = no information = good
// Mastery (per category and overall)
var MASTERY_MIN_ATTEMPTS = 5;              // a category cannot be mastered with fewer attempts
var MASTERY_MIN_STREAK = 3;                // ... or with a shorter streak of correct answers
var MASTERY_MIN_ACCURACY = 0.8;
var MASTERY_MIN_INTERVAL_DAYS = 14;        // ... or while the next review is closer than this
var MASTERY_OTHER_CATEGORIES = 2;          // a kanji is mastered when recognition AND this many other categories are
var MASTERY_REVIEWING_ACCURACY = 0.6;
// Weak kanji / categories (one wrong answer is never enough)
var WEAK_MIN_ATTEMPTS = 3;
var WEAK_ACCURACY = 0.6;
var WEAK_LAPSES = 2;                       // 2+ wrong answers and the last answer wrong also counts when accuracy < WEAK_LAPSE_ACCURACY
var WEAK_LAPSE_ACCURACY = 0.75;
var FORGOTTEN_DAYS = 7;                    // overdue by more than max(this, 3 x interval) = probably forgotten
var RECENT_WRONG_MS = 30 * 60 * 1000;      // "recently incorrect"
// How strongly the review state changes the chance that a kanji / question type is asked (1 = normal)
var SRS_W_OVERDUE = 3;
var SRS_W_RECENT_WRONG = 2.5;
var SRS_W_WEAK = 2;
var SRS_W_NOT_DUE = 0.7;
var SRS_W_MAINTENANCE = 0.4;               // mastered and not due: only an occasional maintenance review
var SRS_W_JUST_ASKED = 0.25;               // one of the last SRS_RECENT_KANJI kanji
var SRS_RECENT_KANJI = 3;
var SRS_W_CAT_NEW = 1.5;                   // a question type this kanji has not been asked in yet
var SRS_W_CAT_WEAK = 3;
var SRS_W_CAT_DUE = 2;
var SRS_W_CAT_MASTERED = 0.4;
var SRS_W_CAT_OTHER_WHEN_WEAK = 0.6;       // kanji with a weak category: the other types are asked less (focus on the weakness)
var SRS_SAVE_DELAY_MS = 1500;              // learning data is saved at most this often (and when the page is hidden)
