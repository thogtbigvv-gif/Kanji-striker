# 🚀 KANJI STRIKER

> **Learn Japanese. Fight through the galaxy.**

**KANJI STRIKER** is a mobile-first Japanese Kanji learning arcade game built around a classic vertical 2D space shooter. It combines retro pixel-art arcade action with Japanese kanji practice (JLPT N5–N1 focus). Meanings are shown in Mongolian.

---

## ✨ Features

- **Arcade shooter gameplay:** Drag to move your ship. Hold your finger still for a moment and the ship starts shooting, so you never fire by accident while moving.
- **Learn while you play:** A Mongolian meaning is shown as the question. Shoot the enemy ship that carries the matching kanji. Shooting a wrong kanji costs HP and resets your combo.
- **Campaign:** 5 galaxies (JLPT N5 → N1), each with 5 stages: New Kanji, Review Run, Big Waves, Hard Fight and Boss Gate. Progress is saved by stage.
- **Wave system:** Every stage is played in waves (introduction, formation attack, mixed attack, final wave).
- **Enemy types:** Normal, fast, big (armored), and splitting ships.
- **Boss fights:** The Boss Gate stage ends with a boss that shoots back while kanji ships keep coming.
- **Power-up capsules:** Shield (S), Slow time (T), Repair (R), Power (P) and Bomb (B). Fly into a capsule to collect it.
- **Bombs:** Double tap the screen (or press `B`) to destroy every wrong ship and enemy bullet. The correct kanji ship survives, so you still have to answer.
- **Dash:** Flick your finger sideways (or press `Space` / `Shift`) to dash. The ship is a ghost during the dash. Cooldown 1.2 s.
- **Stage results screen:** Score, accuracy, best combo, XP, 1–3 stars and a kanji learning summary (new, correct, incorrect, needs review).
- **Kanji collection:** See which kanji you have discovered.
- **Sound effects:** Simple generated beeps (no audio files). Can be turned off in Settings.
- **Two game modes (v0.7.0):** PRESS START opens a mode screen. **CAMPAIGN** is the galaxy stage game. **ENDLESS** never stops: every ship that appears can be shot down for points, the waves get harder, and every 5th wave is a boss.
- **Mobile-first design:** Optimized for portrait smartphone browsers with responsive Canvas rendering.
- **Zero dependencies:** Pure **HTML5, CSS3 and Vanilla JavaScript**. No frameworks, no npm, no build tools.

> Note: Only **World 1 (N5)** has kanji data so far (40 kanji, used in stages 1–4; stage 5 is the Boss Gate). Worlds 2–5 are marked "not ready" until their kanji are added.

---

## 🎮 Controls

| Action | Touch / mouse | Keyboard |
| --- | --- | --- |
| Move ship | Drag your finger or mouse | `←` / `→` |
| Shoot | Hold still for a moment | Hold the mouse button still (the keyboard only moves the ship) |
| Bomb | Double tap | `B` |
| Dash | Flick sideways | `Space` / `Shift` |

---

## 📂 Project Structure

```text
Kanji-striker/
│
├── index.html        # Page structure and all screens (menu, collection, settings, game, results)
├── style.css         # Retro pixel-art styling and mobile layout
├── manifest.webmanifest  # Install-as-app settings
├── icons/            # App icons (192, 512, maskable, Apple touch)
└── js/
    ├── data.js       # Kanji list (meaning, readings, vocabulary, example sentences, JLPT), worlds and stages
    ├── kanji-info.js # Safe helper functions to read the kanji learning data
    ├── config.js     # Tuning numbers, sprites, enemy kinds, wave plans
    ├── state.js      # Page elements and game variables
    ├── storage.js    # localStorage: best score, kanji progress, campaign progress
    ├── progression.js # Player level, progression save, credit API, combat stats
    ├── audio.js      # Sound effects
    ├── waves.js      # Wave system, stage plan, stage complete
    ├── enemies.js    # Questions, enemy spawning, damage and answer rules
    ├── arcade.js     # Enemy fire, boss, bombs, power-up capsules
    ├── endless.js    # Endless mode: wave generator, kill rules, start
    ├── game.js       # Start / pause / menu, gameplay update, game loop
    ├── render.js     # Screens, HUD, canvas size, drawing
    ├── input.js      # Touch / mouse / keyboard, buttons, window events
    └── script.js     # Startup
```

The scripts are plain `<script>` files (not ES modules) that share global variables, so **the load order in `index.html` matters**. Keep it exactly as listed above: `data → config → state → storage → progression → audio → waves → enemies → arcade → endless → game → render → input → script`.

---

## ▶️ How to Run

1. Download or clone the repository.
2. Open `index.html` in a browser. No server or install is needed.
3. For the best experience, open it on a phone in portrait mode.

---

## 💾 Saved Data

Progress is stored in the browser with `localStorage`. These keys must never be renamed, or players lose their saved progress:

- `kanjiStrikerBestScore`
- `kanjiStrikerProgress`
- `kanjiStrikerSound`
- `kanjiStrikerCampaign`
- `kanjiStrikerXp`
- `kanjiStrikerEndlessBest` (added in v0.7.0)

Settings → **RESET PROGRESS** clears all saved data.

---

## 🧪 Test Links

Add a stage id to the page address to play a locked stage while testing:

- `index.html?stage=w1-s4` – World 1, stage 4 (shooter enemies)
- `index.html?stage=w1-s5` – World 1, stage 5 (boss fight)

---

## 🛠️ Tuning the Game

To change how the game feels (speeds, damage, fire rate, power-up drop rate, wave plans), edit the numbers in `js/config.js`. To add kanji, edit `js/data.js`.

---

## 📜 Changelog

### v0.4.0

- Clearing a stage now saves campaign progress (stage unlocks, best score, best stars, plays). Game over counts as an attempt.
- Stage results screen is connected: stars, XP, kanji learning summary, NEXT STAGE / RETRY / MENU.
- Total XP is saved in `kanjiStrikerXp` and cleared by RESET PROGRESS.

### v0.5.0

- New **Galaxy Map** screen: START GAME opens it. All worlds and stages are listed with stars, the next stage is highlighted, locked stages are greyed, worlds without kanji show COMING SOON. Tap a stage to play it, or press CONTINUE.
- The results screen's GALAXY MAP button now opens this screen.

### v0.6.0 – UX / UI

- Main menu: progress strip (stars, XP, best score), a "next stage" line, **PLAY** continues straight into the next stage, separate **GALAXY MAP**, **KANJI**, **HELP**, **SETTINGS**. Slow starfield drift.
- **How to play** screen (Mongolian text). Shown automatically the first time you press PLAY. New key `kanjiStrikerHelpSeen`.
- Game screen: the question is now a large bar above the playfield (new highlight when it changes). HP is a bar that turns yellow and red (pulsing) when low.
- **MENU** during a stage needs a second tap (the first tap pauses), so a slip cannot throw away a run.
- Galaxy Map rows show kanji count or best score. Collection screen has a legend.
- Accessibility: visible keyboard focus, touch targets at least 48px, brighter small text, reduced-motion support.

### v0.7.0 – ENDLESS mode

- **Mode screen** after PRESS START: CAMPAIGN (as before) or ENDLESS. The old PLAY-straight-into-the-next-stage is now the CAMPAIGN button.
- **ENDLESS rules:** every ship can be shot down for points and combo, and shooting a "wrong" kanji costs nothing. The ship that carries the kanji of the question bar is the **BONUS** target (more points, saved to your kanji progress). A ship that reaches the bottom costs 4 HP. 10 kills in a row heal a little, and capsules drop every 8 kills.
- **Difficulty** grows with each wave: faster ships, bigger groups, fast / armored / splitting ships, enemy fire and special flight paths. Every 5th wave is a boss wave.
- ENDLESS has its **own best score** (`kanjiStrikerEndlessBest`). It gives no stars, XP or stage unlocks. All numbers are in `js/config.js` under "Endless mode".

### v0.7.1 – Polish, no new gameplay

- **Game feel:** short screen shake when the ship is hit, when a bomb goes off and when a boss falls (off automatically if the device asks for reduced motion, or set `SHAKE_ENABLED = false`). Floating "+points" texts where a ship was shot down. Sparks now fade out.
- **Sound:** every sound now goes through one master volume and a limiter, so busy moments (a full endless wave) no longer clip or crackle. Volume: `MASTER_VOLUME` in `js/config.js`.
- **Install as an app:** added `manifest.webmanifest`, icons and phone meta tags. On a phone use "Add to Home Screen" and the game opens full screen without the browser bar.
- Fix: a ship escaping in ENDLESS no longer plays the hurt sound twice.

---

### v0.7.2 – Cleanup, no new gameplay

- **Fix:** the `icons/` folder was missing from the repository, so installing the game as an app and the iPhone home-screen icon did not work. The four icons (192, 512, maskable, Apple touch) are now included.
- **Accessibility:** button names now match the text you see on them (needed for voice control and screen readers), Mongolian texts are marked as Mongolian, and the placeholder `STRPB` symbol in HOW TO PLAY is replaced by a proper icon.
- **Stylesheet:** the colour palette now lives in one place (`:root` at the top of `style.css`), so a colour is changed once instead of in 30 places. Looks exactly the same.
- **Kanji display:** the kanji in the Collection and in the result chips are marked as Japanese (`lang="ja"`), so a phone with a Chinese system language still draws the Japanese shape of each character. The kanji font list is defined once (`--font-kanji` in `style.css`).
- **Performance:** at most `MAX_PARTICLES` sparks exist at once (`js/config.js`), so a bomb in a busy ENDLESS wave cannot slow down an older phone.
- **Code:** removed unused leftovers (`BANNER_HEIGHT`, `ENEMY_COLORS`, `pickSpawnX`). Gameplay, saved data and balance are unchanged.

---

## 📌 Version

Current version: **v0.7.2** (shown in the footer of the menu).
