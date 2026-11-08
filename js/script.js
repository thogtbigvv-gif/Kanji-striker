'use strict';
/* KANJI STRIKER - startup.
   The game code is split into files inside the js/ folder (load order is set in index.html):
     js/data.js      kanji list, world / stage structure
     js/config.js    tuning numbers, sprites, enemy kinds, wave plans
     js/state.js     page elements and game variables
     js/storage.js   localStorage, kanji progress, campaign progress
     js/audio.js     sound effects
     js/waves.js     wave system, stage plan, stage complete
     js/enemies.js   questions, enemy spawning, damage and answer rules
     js/arcade.js    enemy fire, boss, bomb, power-up capsules
     js/game.js      start / pause / menu, gameplay update, game loop
     js/render.js    screens, HUD, canvas size, drawing
     js/input.js     touch / mouse / keyboard, buttons, window events
   Test links: add ?stage=w1-s4 (shooters) or ?stage=w1-s5 (boss) to the page address. */

lockPageScroll();
loadSavedData();
updateSoundButton();
updateHud();
showMenu();
