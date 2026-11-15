# 🚀 KANJI STRIKER

> **Learn Japanese. Fight through the galaxy.**

**KANJI STRIKER** is a mobile-first Japanese Kanji learning arcade game built around a classic vertical 2D space shooter. It combines retro pixel-art arcade action with Japanese kanji practice (JLPT N5–N1 focus). Meanings are shown in Mongolian.

---

## ✨ Features

- **Arcade shooter gameplay:** Drag to move your ship. Hold your finger still for a moment and the ship starts shooting, so you never fire by accident while moving.
- **Learning challenges (Phase 2):** From the second stage on, a question can also be a **Reading** challenge (read a word, shoot the right reading), a **Vocabulary** challenge (shoot the Mongolian meaning of a word) or a **Context** challenge (shoot the translation of a sentence). All settings are in `config.js` ("Learning challenges"); `CHALLENGE_ENABLED = false` turns them off.
- **Learn while you play:** A Mongolian meaning is shown as the question. Shoot the enemy ship that carries the matching kanji. Shooting a wrong kanji costs HP and resets your combo.
- **Campaign:** 5 galaxies (JLPT N5 → N1), each with 5 stages: New Kanji, Review Run, Big Waves, Hard Fight and Boss Gate. Progress is saved by stage.
- **Wave system:** Every stage is played in waves (introduction, formation attack, mixed attack, final wave).
- **Enemy types:** Normal, fast, big (armored), and splitting ships.
- **Boss fights:** The Boss Gate stage ends with a boss that shoots back while kanji ships keep coming.
- **Power-up capsules:** Shield (S), Slow time (T), Repair (R), Power (P) and Bomb (B). Fly into a capsule to collect it.
- **Bombs:** Double tap the screen (or press `B`) to destroy every wrong ship and enemy bullet. The correct kanji ship survives, so you still have to answer.
- **Dash:** Flick your finger sideways (or press `Space` / `Shift`) to dash. The ship is a ghost during the dash. Cooldown 1.2 s.
- **Stage results screen:** Score, accuracy, best combo, XP, 1–3 stars and a kanji learning summary (new, correct, incorrect, needs review).
- **Kanji collection and kanji cards (v0.11.0):** See which kanji you have discovered. Tap a collected kanji to open its **kanji card**: meaning, on / kun readings, common words, example sentences and the review state (mastery bar, next review time) of every question type. PREV / NEXT move through the collected kanji.
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
├── index.html        # Page structure and all screens (menu, collection, kanji card, settings, game, results)
├── css/              # Retro pixel-art styling and mobile layout, one file per part (v0.11.1)
│   ├── base.css          # Colour palette (:root), reset, app frame, footer, keyboard focus
│   ├── buttons.css       # .menu-button family (used on every screen)
│   ├── menu.css          # Main menu: layout and v0.6.0 additions
│   ├── menu-attract.css  # Main menu: arcade attract look (v0.7.0), overrides menu.css
│   ├── game.css          # Game screen: HUD, canvas, controls, HP bar, question bar
│   ├── panels.css        # Kanji collection and settings
│   ├── how-to.css        # HOW TO PLAY screen
│   ├── results.css       # Stage results screen
│   ├── galaxy.css        # Galaxy map
│   ├── mode-select.css   # CAMPAIGN / ENDLESS screen
│   └── kanji-card.css    # Kanji card
├── manifest.webmanifest  # App name, colours and icons (install as an app)
├── sw.js             # Service worker: offline play and install (v0.11.2)
├── icon-192.png, icon-512.png, icon-maskable-512.png, apple-touch-icon.png   # App icons (project root)
└── js/
    ├── data.js       # Kanji list (meaning, readings, vocabulary, example sentences, JLPT), worlds and stages
    ├── kanji-info.js # Safe helper functions to read the kanji learning data
    ├── srs.js        # Spaced repetition: review schedule, mastery, weak kanji, review queue (Phase 3)
    ├── challenges.js # Reading / Vocabulary / Context questions (text on ships, question bar, feedback)
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
    ├── script.js     # Startup
    └── pwa.js        # Service worker registration and the INSTALL APP button (v0.11.2)
```

The stylesheets are plain `<link>` files. **The load order in `index.html` matters** (later rules override earlier ones of the same strength): `base → buttons → menu → menu-attract → game → panels → how-to → results → galaxy → mode-select → kanji-card`. To change a colour, edit `:root` in `css/base.css`.

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

### v0.12.0 – Galaxy map

- The GALAXY MAP is now a real map. Each world has a header with its own planet (a lit ball with a tilted ring), its JLPT level and a star meter. A world with kanji data shows its five stages as round **nodes on a winding dotted path** instead of a list.
- Node states: **done** = gold with its stars underneath and the best score; **next stage** = pink with a pulsing ring and our ship hovering above it; **locked** = dark and not tappable; **boss** = bigger and purple with a slow glow. Tap a node to play that stage.
- The path you have opened is gold; the road into the next stage has dashes that run toward it. Nodes pop in one after another when the map opens, and the stars drift slowly behind it.
- A star meter under the title shows total progress. The map scrolls so the next stage is in the middle of the screen.
- Worlds without kanji data yet stay compact ("COMING SOON"). All motion stops with `prefers-reduced-motion`.
- Files: `index.html` (meter), `css/galaxy.css` (rewritten), `js/render.js` (map drawing), `js/state.js`, `sw.js` (cache name). Stage rules, saved data and the CONTINUE button are unchanged.

---

### v0.11.3 – Select mode screen

- The SELECT MODE screen got an arcade look. Each mode is a card with a pixel emblem: CAMPAIGN (our ship hovers and fires) and ENDLESS (a boss alien flaps its wings), inside a slowly turning dashed ring.
- Effects (CSS only): drifting stars behind the cards, a title with a glow and a line that draws itself, cards that fly in from the sides one after another, a breathing glow inside the border, a light streak that sweeps across, corner brackets (they open up on mouse hover), a blinking arrow and a press flash. All motion stops with `prefers-reduced-motion`.
- The CAMPAIGN card now also shows your star total (for example `★ 3 / 15`) next to the next stage; ENDLESS shows your best score.
- Smaller layout for short screens (height up to 700px) and very narrow screens (width up to 340px).
- Files: `index.html` (new markup), `css/mode-select.css` (rewritten), `js/state.js` and `js/render.js` (star total), `sw.js` (cache name). Gameplay and saved data are unchanged.

---

### v0.11.2 – Install on a phone and play offline

- **Fix:** the icons were linked as `icons/...` but the files are in the project root, so the app icons returned 404 and a phone could not offer to install the game. `manifest.webmanifest` and `index.html` now point at the root files.
- **New:** `sw.js` (service worker) saves the whole game on the phone at the first visit, so it opens with no internet. A file is shown from the saved copy and refreshed in the background, so an update appears the next time the game is opened. Progress is in `localStorage` and is never touched by an update.
- **New:** SETTINGS → **INSTALL APP**. On Android (Chrome, Edge, Samsung Internet) it opens the install prompt; on iPhone it explains Share → Add to Home Screen; other browsers get a short hint. The button hides itself once the game runs as an installed app.
- **New file:** `js/pwa.js` (registers the service worker, runs the install button).
- Release rule: when a file is added or renamed, list it in `APP_FILES` in `sw.js` and change the number in `CACHE_NAME`.
- The game must be opened over **https** (for example GitHub Pages) for install and offline to work; opening `index.html` as a local file still plays normally.

---

### v0.11.1 – Stylesheet split

- `style.css` is now 11 files in the `css/` folder (see Project Structure). Same rules, same look: every element of every screen was compared before and after at 6 screen sizes with no difference.
- The old `style.css` was removed; `index.html` links the new files in the required order.

---

### v0.11.0 – Kanji card

- **New screen:** tap a collected kanji in KANJI COLLECTION to open its card. It shows the meaning, JLPT level, on / kun readings, words, example sentences (Japanese, hiragana reading, Mongolian meaning) and a MASTERY box: overall mastery and one bar per question type (Recognition, Reading, Vocabulary, Context) with correct / attempts, WEAK marker and the next review time (`due now`, `in 3 d`).
- PREV / NEXT step through the collected kanji; BACK returns to the collection at the same scroll position. Keyboard: `←` / `→` / `Esc`.
- Locked kanji stay closed. Collected cells are now real buttons (keyboard and screen-reader friendly).
- Only reads existing data (`kanji-info.js`, `srs.js`). Gameplay, saved data and balance are unchanged.

---

### v0.10.1 – Logic audit fixes

- **Fix:** a stage could leave the player with a question that had no ship to shoot (about 45% of the time in a headless test). When no ship of the stage's own kanji is flying, a review-kanji ship now becomes the target.
- **Fix:** RESET PROGRESS now also clears the review (SRS) data.
- **Fix:** a locked stage opened with `?stage=` no longer pays credits.
- **Fix:** adaptive difficulty counts a question once (the first result), not every wrong shot.
- See `AUDIT.md` for the full list, including open items.

---

### v0.10.0 – Ship upgrades and credits (game logic; no shop screen yet)

- **Credits:** every run pays when it ends: 1 per correct answer (max 80), plus for a cleared campaign stage 30 + 15 per star, +60 the first time, +50 for a boss stage. A game over still pays the answer credits. Endless adds 1 credit per 150 points (max 120). A run pays only once.
- **Six upgrades, 5 levels each** (`getCombatStats()` adds them up): hull +10 max HP, shield +10 permanent shield points, engine +6% steering and -0.1 s dash cooldown, weaponPower +15% boss damage, fireRate -6% shot interval, energy +1 starting bomb every 2 levels.
- **Price:** next level = base price x level (see `UPGRADE_BASE_COST`). **Player level gate:** levels 1-5 need player level 1 / 2 / 3 / 5 / 7 (from XP).
- **Learning stays fair:** the permanent shield absorbs crashes and enemy bullets but NEVER the penalty for a wrong answer or a missed kanji. Stars use HP in percent, so a bigger hull is no free star.
- **Respec:** `respecUpgrades()` gives every upgrade back for the full price.
- API (progression.js): `buyUpgrade(id)`, `getUpgradeCost(id)`, `getUpgradeRequirement(id)`, `getUpgradeLevel(id)`, `respecUpgrades()`. Without a shop screen, test in the browser console, e.g. `buyUpgrade('hull')`. Numbers: `config.js`, "Ship upgrades and credits".

---

### v0.9.0 – Adaptive difficulty (game logic, no UI change)

- The campaign looks at the last 8 answers. Accuracy of 90% or more makes ships up to 20% faster, shooters up to 20% more common and the pauses between groups shorter. Accuracy of 60% or less (or HP at 30% or lower) eases everything down to 85%. The change is gradual (3% per answer).
- ENDLESS mode keeps its own ramp. Set `ADAPT_ENABLED = false` in `config.js` to switch it off. All numbers are under "Adaptive difficulty".

---

### v0.8.0 – Wave-linked review (learning logic, no UI change)

- **Review injection (campaign):** kanji of EARLIER stages that are overdue, recently wrong or weak (from `srs.js`) now come back as questions: about 25% of questions, 50% during a boss wave. The first 2 questions of a run and two in a row are never review questions, so the stage's own new kanji come first.
- **In-run retry:** a kanji that was shot wrong or missed is asked again 3 questions later in the same run (at most 2 retries per kanji per run).
- **Confusion memory:** when the player shoots kanji B while kanji A was asked, B appears as a decoy next to A more often (session memory, not saved).
- A flying ship only takes over a forced kanji while its kanji is still hidden above the screen, so a kanji never changes in front of the player.
- ENDLESS mode is unchanged. Saved data and keys are unchanged. All numbers: `config.js`, "Wave-linked review".

---

### v0.7.2 – Cleanup, no new gameplay

- **Fix:** the `icons/` folder was missing from the repository, so installing the game as an app and the iPhone home-screen icon did not work. The four icons (192, 512, maskable, Apple touch) are now included.
- **Accessibility:** button names now match the text you see on them (needed for voice control and screen readers), Mongolian texts are marked as Mongolian, and the placeholder `STRPB` symbol in HOW TO PLAY is replaced by a proper icon.
- **Stylesheet:** the colour palette now lives in one place (`:root` at the top of `css/base.css`), so a colour is changed once instead of in 30 places. Looks exactly the same.
- **Kanji display:** the kanji in the Collection and in the result chips are marked as Japanese (`lang="ja"`), so a phone with a Chinese system language still draws the Japanese shape of each character. The kanji font list is defined once (`--font-kanji` in `css/base.css`).
- **Performance:** at most `MAX_PARTICLES` sparks exist at once (`js/config.js`), so a bomb in a busy ENDLESS wave cannot slow down an older phone.
- **Code:** removed unused leftovers (`BANNER_HEIGHT`, `ENEMY_COLORS`, `pickSpawnX`). Gameplay, saved data and balance are unchanged.

---

## 📌 Version

Current version: **v0.12.0** (shown in the footer of the menu).
