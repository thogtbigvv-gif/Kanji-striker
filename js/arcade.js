'use strict';
/* js/arcade.js - arcade features: enemy fire, boss fight, bomb, power-up capsules.
   Load after enemies.js. Numbers (damage, speeds, weights) live in config.js. */

// ---------- Enemy fire ----------
function playEnemyShotSound() {
  playTone(190, 0.06, 'square', 0.035);
}

function addEnemyBullet(x, y, vx) {
  enemyBullets.push({ x: x, y: y, vx: vx, vy: ENEMY_BULLET_SPEED, dead: false });
}

// Ships with a gun shoot one straight bullet downward every ENEMY_FIRE_INTERVAL seconds
function updateEnemyFire(dt, speedFactor) {
  for (var i = 0; i < enemies.length; i++) {
    var en = enemies[i];
    if (en.dead || !en.shooter) {
      continue;
    }
    if (en.y < ENEMY_FIRE_MIN_Y || en.y > viewHeight * ENEMY_FIRE_MAX_Y) {
      continue; // outside the firing zone the timer waits
    }
    en.fireTimer -= dt * speedFactor;
    if (en.fireTimer <= 0) {
      en.fireTimer = ENEMY_FIRE_INTERVAL;
      addEnemyBullet(en.x, en.y + en.h, 0);
      playEnemyShotSound();
    }
  }
}

// Moves the enemy bullets; a bullet that touches the ship is real damage (a shield blocks it)
function updateEnemyBullets(dt, scale, speedFactor) {
  var n = 0;
  for (var i = 0; i < enemyBullets.length; i++) {
    var eb = enemyBullets[i];
    eb.y += eb.vy * scale * speedFactor * dt;
    eb.x += eb.vx * speedFactor * dt;
    if (eb.y > viewHeight + 12 || eb.x < -12 || eb.x > viewWidth + 12) {
      eb.dead = true;
    } else if (
      Math.abs(eb.x - player.x) < SHIP_WIDTH * 0.35 + ENEMY_BULLET_W / 2 &&
      Math.abs(eb.y - player.y) < SHIP_HEIGHT / 2 + ENEMY_BULLET_H / 2 - 4
    ) {
      eb.dead = true;
      burst(player.x, player.y, '#ff6b86');
      loseHp(ENEMY_BULLET_DAMAGE);
      if (currentState === STATE_GAME_OVER) {
        return;
      }
    }
    if (!eb.dead) {
      enemyBullets[n++] = eb;
    }
  }
  enemyBullets.length = n;
}

// ---------- Boss ----------
// Bullets of a volley: vxList = sideways speeds, one bullet for each
function bossFan(vxList) {
  for (var i = 0; i < vxList.length; i++) {
    addEnemyBullet(boss.x, boss.y + BOSS_H, vxList[i]);
  }
}

// Sideways speed that makes a bullet fired from (x, y) fly toward the ship's current position
function aimedVx(x, y) {
  var flightTime = Math.max(0.3, (player.y - y) / (ENEMY_BULLET_SPEED * sizeScale()));
  return Math.max(-220, Math.min(220, (player.x - x) / flightTime));
}

// Phase 1: 3-way fan. Phase 2: 5-way fan. Phase 3: 5-way fan and an aimed triple shot, one after the other.
function bossFire() {
  if (boss.phase === 1) {
    bossFan([-60, 0, 60]);
  } else if (boss.phase === 2) {
    bossFan([-100, -50, 0, 50, 100]);
  } else {
    boss.volley += 1;
    if (boss.volley % 2 === 1) {
      bossFan([-110, -55, 0, 55, 110]);
    } else {
      var aim = aimedVx(boss.x, boss.y + BOSS_H);
      bossFan([aim - 45, aim, aim + 45]);
    }
  }
  playTone(140, 0.12, 'sawtooth', 0.05);
}

function spawnBoss() {
  boss = {
    x: viewWidth / 2,
    y: -BOSS_H,
    hp: BOSS_HP,
    maxHp: BOSS_HP,
    phase: 1,
    state: 'enter', // enter -> fight -> dying
    fireTimer: 1,
    swayPhase: 0,
    flash: 0,
    volley: 0,
    dyingTimer: 0
  };
  showToast('WARNING: BOSS APPROACHING', '#ff6b86');
}

function updateBoss(dt, speedFactor) {
  if (!boss) {
    return;
  }
  if (boss.flash > 0) {
    boss.flash -= dt;
  }
  if (boss.state === 'enter') {
    boss.y += BOSS_ENTER_SPEED * dt;
    if (boss.y >= BOSS_REST_Y) {
      boss.y = BOSS_REST_Y;
      boss.state = 'fight';
      boss.fireTimer = 1.2;
    }
    return;
  }
  if (boss.state === 'dying') {
    boss.dyingTimer -= dt;
    if (Math.random() < 0.5) {
      burst(boss.x + (Math.random() - 0.5) * BOSS_W, boss.y + Math.random() * BOSS_H, Math.random() < 0.5 ? '#ffd21f' : '#ff9a3c');
    }
    if (boss.dyingTimer <= 0) {
      boss = null;
      waveState.phase = 'clearing'; // nothing is left on screen: checkWaveCleared completes the stage
    }
    return;
  }
  // fight: sway left and right, shoot volleys
  var amplitude = Math.max(0, (viewWidth - BOSS_W) / 2 - 6);
  boss.swayPhase += dt * speedFactor * BOSS_SWAY_SPEED[boss.phase - 1];
  boss.x = viewWidth / 2 + amplitude * Math.sin(boss.swayPhase);
  boss.fireTimer -= dt * speedFactor;
  if (boss.fireTimer <= 0) {
    bossFire();
    boss.fireTimer = BOSS_FIRE_INTERVAL[boss.phase - 1];
  }
}

// big = true for answers and bombs (sparks + sound), false for ordinary bullets
function damageBoss(amount, big) {
  if (!boss || boss.state !== 'fight') {
    return;
  }
  boss.hp -= amount;
  boss.flash = 0.08;
  if (big) {
    burst(boss.x, boss.y + BOSS_H / 2, '#ff9a3c');
    playTone(220, 0.08, 'square', 0.06);
  }
  if (boss.hp <= 0) {
    boss.hp = 0;
    defeatBoss();
    return;
  }
  var ratio = boss.hp / boss.maxHp;
  var phase = ratio > 0.66 ? 1 : ratio > 0.33 ? 2 : 3;
  if (phase > boss.phase) {
    boss.phase = phase;
    boss.fireTimer = Math.min(boss.fireTimer, 1);
    showToast('BOSS PHASE ' + phase, '#ff6b86');
    playTone(110, 0.25, 'sawtooth', 0.07);
  }
}

function defeatBoss() {
  boss.state = 'dying';
  boss.dyingTimer = BOSS_DYING_TIME;
  waveState.phase = 'bossdown'; // no more ships spawn while the boss explodes
  score += BOSS_DEFEAT_BONUS;
  bonusScore += BOSS_DEFEAT_BONUS;
  enemyBullets = [];
  for (var i = 0; i < enemies.length; i++) {
    if (!enemies[i].dead) {
      enemies[i].dead = true;
      burst(enemies[i].x, enemies[i].y + enemies[i].h / 2, '#ffd21f');
    }
  }
  targetLost = false;
  rescueTimer = -1;
  showToast('BOSS DEFEATED   +' + BOSS_DEFEAT_BONUS, '#ffd21f');
  playTone(523, 0.12, 'square', 0.07);
  playTone(659, 0.12, 'square', 0.07, 0.12);
  playTone(784, 0.12, 'square', 0.07, 0.24);
  playTone(1047, 0.3, 'square', 0.07, 0.36);
  updateHud();
}

// ---------- Bomb ----------
// Every wrong ship and every enemy bullet is destroyed, the boss is hurt, the correct kanji ship survives
function useBomb() {
  if (currentState !== STATE_PLAYING || bombs <= 0) {
    return;
  }
  bombs -= 1;
  runStats.bombsUsed += 1;
  bombFlash = 0.4;
  var cleared = 0;
  for (var i = 0; i < enemies.length; i++) {
    var en = enemies[i];
    if (en.dead) {
      continue;
    }
    if (isActiveTarget(en)) {
      en.hitFlash = 0.3; // the correct answer stays: the player still has to shoot it
      continue;
    }
    en.dead = true;
    cleared += 1;
    burst(en.x, en.y + en.h / 2, '#ffb347');
  }
  score += cleared * BOMB_SCORE_PER_SHIP;
  enemyBullets = [];
  if (boss && boss.state === 'fight') {
    damageBoss(BOMB_BOSS_DAMAGE, true);
  }
  sweepDead();
  showToast('BOMB!   ' + cleared + ' SHIPS CLEARED', '#ff6b86');
  playTone(120, 0.35, 'sawtooth', 0.09);
  playTone(80, 0.4, 'square', 0.08, 0.05);
  updateHud();
}

// ---------- Power-up capsules ----------
// Chooses the capsule type by what the player needs right now (see the Power-up comment in config.js)
function pickPowerupType() {
  var weights = {
    shield: shieldActive ? 0 : 1,
    slow: slowTimer > 0 ? SLOW_ACTIVE_WEIGHT : 1,
    repair: hp <= LOW_HP_LIMIT ? REPAIR_LOW_HP_WEIGHT : (hp < MAX_HP ? REPAIR_HURT_WEIGHT : 0),
    power: powerLevel >= MAX_POWER_LEVEL ? 0 : POWER_WEIGHT,
    bomb: bombs >= MAX_BOMBS ? 0 : BOMB_WEIGHT
  };
  var total = 0;
  var i;
  for (i = 0; i < POWERUP_TYPES.length; i++) {
    total += weights[POWERUP_TYPES[i]];
  }
  var roll = Math.random() * total;
  for (i = 0; i < POWERUP_TYPES.length; i++) {
    roll -= weights[POWERUP_TYPES[i]];
    if (roll <= 0 && weights[POWERUP_TYPES[i]] > 0) {
      return POWERUP_TYPES[i];
    }
  }
  return 'slow'; // slow always has a weight above 0, so this is only a safety net
}

function dropPowerup(x, y) {
  var type = pickPowerupType();
  var half = POWERUP_SIZE / 2;
  var px = Math.max(half, Math.min(viewWidth - half, x));
  powerups.push({ type: type, x: px, y: y, dead: false });
}

function collectPowerup(item) {
  item.dead = true;
  var style = POWERUP_STYLE[item.type] || POWERUP_STYLE.slow;
  burst(item.x, item.y, style.color);
  if (item.type === 'shield') {
    shieldActive = true;
    showToast('SHIELD READY', style.color);
  } else if (item.type === 'repair') {
    var healed = Math.min(REPAIR_AMOUNT, MAX_HP - hp);
    if (healed > 0) {
      hp += healed;
      showToast('REPAIR +' + healed + ' HP', style.color);
    } else {
      score += REPAIR_FULL_HP_SCORE;
      showToast('REPAIR   +' + REPAIR_FULL_HP_SCORE, style.color);
    }
    updateHud();
  } else if (item.type === 'power') {
    powerLevel = Math.min(MAX_POWER_LEVEL, powerLevel + 1);
    showToast('WEAPON UP  ' + WEAPON_NAMES[weaponLevel()], style.color);
  } else if (item.type === 'bomb') {
    bombs = Math.min(MAX_BOMBS, bombs + 1);
    showToast('BOMB +1   DOUBLE TAP TO USE', style.color);
  } else {
    slowTimer = SLOW_DURATION;
    showToast('SLOW TIME ' + SLOW_DURATION + 's', style.color);
  }
  playTone(880, 0.08, 'square', 0.06);
  playTone(1320, 0.12, 'square', 0.06, 0.08);
}

function updatePowerups(dt, scale) {
  if (slowTimer > 0) {
    slowTimer = Math.max(0, slowTimer - dt);
  }
  var half = POWERUP_SIZE / 2;
  for (var i = 0; i < powerups.length; i++) {
    var item = powerups[i];
    if (item.dead) {
      continue;
    }
    item.y += POWERUP_FALL_SPEED * scale * dt;
    if (item.y - half > viewHeight) {
      item.dead = true;
      continue;
    }
    if (
      Math.abs(item.x - player.x) < (POWERUP_SIZE + SHIP_WIDTH) / 2 &&
      item.y + half > player.y - SHIP_HEIGHT / 2 &&
      item.y - half < player.y + SHIP_HEIGHT / 2
    ) {
      collectPowerup(item);
    }
  }
  var n = 0;
  for (var k = 0; k < powerups.length; k++) {
    if (!powerups[k].dead) {
      powerups[n++] = powerups[k];
    }
  }
  powerups.length = n;
}
