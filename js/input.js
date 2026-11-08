'use strict';
/* js/input.js - touch / mouse / keyboard input, menu buttons and window events.
   Load LAST of the js/ files (after render.js): the buttons below need the game functions to exist. */

// ---------- Input ----------
function getPointerX(event) {
  var rect = canvas.getBoundingClientRect();
  return clampX(event.clientX - rect.left);
}

function resetDrag() {
  player.isDragging = false;
  player.pointerId = null;
  player.fireHeld = false;
  player.aimTimer = 0;
}

canvas.addEventListener('pointerdown', function (event) {
  if (event.pointerType === 'mouse' && event.button !== 0) {
    return;
  }
  if (currentState === STATE_GAME_OVER) {
    // Short delay so a finishing tap does not restart the game by accident
    if (performance.now() - gameOverAt > 700) {
      restartCurrentStage();
    }
    event.preventDefault();
    return;
  }
  if (currentState !== STATE_PLAYING) {
    return;
  }
  // Follow only the first finger so a second finger cannot make the ship jump
  if (player.isDragging) {
    return;
  }
  player.isDragging = true;
  player.pointerId = event.pointerId;
  var touchX = event.clientX - canvas.getBoundingClientRect().left;
  player.dragPointerX = touchX;
  player.dragShipX = player.targetX;
  player.aimX = touchX;
  player.aimTimer = 0;
  player.fireHeld = false; // no instant shot: the finger must rest for AIM_DELAY first
  tapStart = { id: event.pointerId, t: performance.now() / 1000, x: touchX }; // may become a tap (double tap = bomb)
  if (!RELATIVE_CONTROL) {
    player.targetX = getPointerX(event);
  }
  if (canvas.setPointerCapture) {
    try {
      canvas.setPointerCapture(event.pointerId);
    } catch (error) {
      /* ignore */
    }
  }
  event.preventDefault();
});

canvas.addEventListener('pointermove', function (event) {
  if (currentState !== STATE_PLAYING || !player.isDragging) {
    return;
  }
  if (event.pointerId !== player.pointerId) {
    return;
  }
  var moveX = event.clientX - canvas.getBoundingClientRect().left;
  // Moved too far for a tap: this touch is a drag
  if (tapStart && Math.abs(moveX - tapStart.x) > TAP_MAX_MOVE) {
    tapStart = null;
  }
  // Moved further than the tolerance: shooting stops and the aim lock starts again from this spot
  if (Math.abs(moveX - player.aimX) > AIM_TOLERANCE) {
    player.aimX = moveX;
    player.aimTimer = 0;
    player.fireHeld = false;
  }
  if (RELATIVE_CONTROL) {
    var wantedX = player.dragShipX + (moveX - player.dragPointerX) * CONTROL_SENSITIVITY;
    var limitedX = clampX(wantedX);
    // At the screen edge the touch anchor slides along, so the ship comes back as soon as the finger does
    player.dragShipX += limitedX - wantedX;
    player.targetX = limitedX;
  } else {
    player.targetX = getPointerX(event);
  }
  event.preventDefault();
});

// A short touch without moving is a tap; two taps close together fire a bomb
function checkTap(event) {
  var tap = tapStart;
  tapStart = null;
  if (!tap || !event || event.pointerId !== tap.id || currentState !== STATE_PLAYING) {
    return;
  }
  var now = performance.now() / 1000;
  var moved = Math.abs((event.clientX - canvas.getBoundingClientRect().left) - tap.x);
  if (now - tap.t > TAP_MAX_TIME || moved > TAP_MAX_MOVE) {
    return;
  }
  if (lastTapAt > 0 && now - lastTapAt <= DOUBLE_TAP_TIME) {
    lastTapAt = 0;
    useBomb();
  } else {
    lastTapAt = now;
  }
}

// Finger lifted, pointer cancelled by the browser or capture lost: stop following it
function stopDragging(event) {
  if (event && player.pointerId !== null && event.pointerId !== player.pointerId) {
    return;
  }
  if (event && event.type === 'pointerup') {
    checkTap(event);
  } else {
    tapStart = null;
  }
  resetDrag();
}

canvas.addEventListener('pointerup', stopDragging);
canvas.addEventListener('pointercancel', stopDragging);
canvas.addEventListener('lostpointercapture', stopDragging);
window.addEventListener('pointerup', stopDragging);
window.addEventListener('pointercancel', stopDragging);

// Prevent page scrolling / long-press menu while playing
canvas.addEventListener('touchmove', function (event) {
  event.preventDefault();
}, { passive: false });
canvas.addEventListener('contextmenu', function (event) {
  event.preventDefault();
});

function lockPageScroll() {
  try {
    document.documentElement.style.overscrollBehavior = 'none';
    document.body.style.overscrollBehavior = 'none';
  } catch (error) {
    /* ignore */
  }
}

// Keyboard (for computers)
window.addEventListener('keydown', function (event) {
  if (currentState !== STATE_PLAYING) {
    return;
  }
  if (event.key === 'ArrowLeft') {
    player.targetX = clampX(player.targetX - 40);
  } else if (event.key === 'ArrowRight') {
    player.targetX = clampX(player.targetX + 40);
  } else if (event.key === 'b' || event.key === 'B') {
    useBomb();
  }
});

// ---------- Buttons ----------
startGameButton.addEventListener('click', startGame);
backToMenuButton.addEventListener('click', backToMenu);
pauseButton.addEventListener('click', togglePause);

kanjiCollectionButton.addEventListener('click', showCollection);
settingsButton.addEventListener('click', showSettings);
collectionBackButton.addEventListener('click', showMenu);
settingsBackButton.addEventListener('click', showMenu);

soundToggleButton.addEventListener('click', function () {
  soundEnabled = !soundEnabled;
  writeStorage(KEY_SOUND, soundEnabled ? 'on' : 'off');
  updateSoundButton();
  if (soundEnabled) {
    playCorrectSound();
  }
});

resetProgressButton.addEventListener('click', function () {
  if (!window.confirm('Бүх хадгалсан ахиц болон дээд оноог устгах уу?')) {
    return;
  }
  progress = {};
  bestScore = 0;
  removeStorage(KEY_PROGRESS);
  removeStorage(KEY_BEST);
  campaign = freshCampaign();
  campaignReadOnly = false;
  removeStorage(KEY_CAMPAIGN);
  removeStorage(KEY_CAMPAIGN + 'Corrupt');
  settingsMessage.textContent = 'PROGRESS RESET';
});

// ---------- Window events ----------
// All size changes go through one throttled function (at most one resize per frame)
var resizePending = false;
function scheduleResize() {
  if (resizePending) {
    return;
  }
  resizePending = true;
  requestAnimationFrame(function () {
    resizePending = false;
    if (currentState !== STATE_MENU) {
      resizeCanvas();
    }
  });
}

window.addEventListener('resize', scheduleResize);
window.addEventListener('orientationchange', function () {
  setTimeout(scheduleResize, 200);
});
if (typeof window.ResizeObserver === 'function') {
  new window.ResizeObserver(scheduleResize).observe(canvas.parentElement);
}

// Pause automatically when the page is hidden
document.addEventListener('visibilitychange', function () {
  if (document.hidden) {
    pauseGame();
  }
});
