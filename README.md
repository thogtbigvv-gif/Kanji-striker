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
- **Stage results screen:** Score, accuracy, best combo, XP, 1–3 stars and a kanji learning summary (new, correct, incorrect, needs review).
- **Kanji collection:** See which kanji you have discovered.
- **Sound effects:** Simple generated beeps (no audio files). Can be turned off in Settings.
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

---

## 📂 Project Structure

```text
Kanji-striker/
│
├── index.html        # Page structure and all screens (menu, collection, settings, game, results)
├── style.css         # Retro pixel-art styling and mobile layout
└── js/
    ├── data.js       # Kanji list (kanji + Mongolian meaning), worlds and stages
    ├── config.js     # Tuning numbers, sprites, enemy kinds, wave plans
    ├── state.js      # Page elements and game variables
    ├── storage.js    # localStorage: best score, kanji progress, campaign progress
    ├── audio.js      # Sound effects
    ├── waves.js      # Wave system, stage plan, stage complete
    ├── enemies.js    # Questions, enemy spawning, damage and answer rules
    ├── arcade.js     # Enemy fire, boss, bombs, power-up capsules
    ├── game.js       # Start / pause / menu, gameplay update, game loop
    ├── render.js     # Screens, HUD, canvas size, drawing
    ├── input.js      # Touch / mouse / keyboard, buttons, window events
    └── script.js     # Startup
```

The scripts are plain `<script>` files (not ES modules) that share global variables, so **the load order in `index.html` matters**. Keep it exactly as listed above: `data → config → state → storage → audio → waves → enemies → arcade → game → render → input → script`.

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

## 📌 Version

Current version: **v0.3.0** (shown in the footer of the menu).
