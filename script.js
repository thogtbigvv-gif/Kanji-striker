/* KANJI STRIKER - Phase 02: Player & Input System */

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const menuScreen = document.getElementById('menu-screen');
    const gameScreen = document.getElementById('game-screen');
    const startGameBtn = document.getElementById('start-game-btn');
    const collectionBtn = document.getElementById('collection-btn');
    const settingsBtn = document.getElementById('settings-btn');
    const pauseBtn = document.getElementById('pause-btn');
    const backToMenuBtn = document.getElementById('back-to-menu-btn');
    
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');

    // Game States
    const GameState = {
        MENU: 'MENU',
        READY: 'READY',
        PLAYING: 'PLAYING',
        PAUSED: 'PAUSED',
        GAME_OVER: 'GAME_OVER'
    };

    let currentState = GameState.MENU;
    let animationFrameId = null;
    let lastTime = 0;

    // Player Object
    let player = {
        x: 0,
        y: 0,
        width: 40,
        height: 40,
        speed: 5,
        targetX: 0,
        isDragging: false
    };

    // Canvas Resizing for High-DPI & Mobile Fit
    function resizeCanvas() {
        const container = canvas.parentElement;
        const width = container.clientWidth;
        const height = container.clientHeight;

        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';

        const dpr = window.devicePixelRatio || 1;
        canvas.width = width * dpr;
        canvas.height = height * dpr;

        ctx.scale(dpr, dpr);

        // Reset player position to bottom-center when resizing/starting
        if (player) {
            player.x = width / 2;
            player.y = height - 70;
            player.targetX = player.x;
        }
    }

    window.addEventListener('resize', () => {
        if (currentState !== GameState.MENU) {
            resizeCanvas();
        }
    });

    // Screen Switching Logic
    function switchScreen(screenId) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        const targetScreen = document.getElementById(screenId);
        if (targetScreen) {
            targetScreen.classList.add('active');
        }
    }

    // Event Listeners for Navigation
    startGameBtn.addEventListener('click', () => {
        currentState = GameState.PLAYING;
        switchScreen('game-screen');
        resizeCanvas();
        initGameEngine();
    });

    backToMenuBtn.addEventListener('click', () => {
        currentState = GameState.MENU;
        switchScreen('menu-screen');
        stopGameEngine();
    });

    pauseBtn.addEventListener('click', () => {
        if (currentState === GameState.PLAYING) {
            currentState = GameState.PAUSED;
            pauseBtn.textContent = '▶';
        } else if (currentState === GameState.PAUSED) {
            currentState = GameState.PLAYING;
            pauseBtn.textContent = '⏸';
            lastTime = performance.now();
            runGameLoop(lastTime);
        }
    });

    collectionBtn.addEventListener('click', () => {
        alert('KANJI COLLECTION хэсэг дараагийн хөгжүүлэлтэд нэмэгдэнэ.');
    });

    settingsBtn.addEventListener('click', () => {
        alert('SETTINGS хэсэг дараагийн хөгжүүлэлтэд нэмэгдэнэ.');
    });

    // --- INPUT HANDLING (Touch & Mouse) ---
    function getEventPosition(e) {
        const rect = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        return clientX - rect.left;
    }

    canvas.addEventListener('pointerdown', (e) => {
        if (currentState !== GameState.PLAYING) return;
        player.isDragging = true;
        player.targetX = getEventPosition(e);
        e.preventDefault();
    });

    canvas.addEventListener('pointermove', (e) => {
        if (currentState !== GameState.PLAYING || !player.isDragging) return;
        player.targetX = getEventPosition(e);
        e.preventDefault();
    });

    window.addEventListener('pointerup', () => {
        player.isDragging = false;
    });

    // --- GAME ENGINE & LOOP ---
    function initGameEngine() {
        console.log('Game Engine Initialized with Player');
        lastTime = performance.now();
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
        animationFrameId = requestAnimationFrame(runGameLoop);
    }

    function stopGameEngine() {
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
        console.log('Game Engine Stopped');
    }

    function update(dt) {
        // Smooth interpolation (lerp) towards targetX for fluid movement
        const lerpFactor = 0.2;
        player.x += (player.targetX - player.x) * lerpFactor;

        // Constrain player within canvas horizontal boundaries
        const logicalWidth = canvas.width / (window.devicePixelRatio || 1);
        const halfWidth = player.width / 2;
        if (player.x < halfWidth) player.x = halfWidth;
        if (player.x > logicalWidth - halfWidth) player.x = logicalWidth - halfWidth;
    }

    function render() {
        const logicalWidth = canvas.width / (window.devicePixelRatio || 1);
        const logicalHeight = canvas.height / (window.devicePixelRatio || 1);

        // Clear Background
        ctx.fillStyle = '#050508';
        ctx.fillRect(0, 0, logicalWidth, logicalHeight);

        // Draw Starfield Effect (Simple background decor)
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(50, 100, 2, 2);
        ctx.fillRect(180, 250, 1.5, 1.5);
        ctx.fillRect(300, 80, 2, 2);
        ctx.fillRect(100, 400, 1, 1);

        // Draw Player Spaceship (Retro Pixel Style Placeholder)
        ctx.save();
        ctx.translate(player.x, player.y);

        // Ship Body (Crimson Red)
        ctx.fillStyle = '#ff0055';
        ctx.beginPath();
        ctx.moveTo(0, -player.height / 2); // Nose
        ctx.lineTo(player.width / 2, player.height / 2); // Right wing
        ctx.lineTo(-player.width / 2, player.height / 2); // Left wing
        ctx.closePath();
        ctx.fill();

        // Cockpit (Cyan highlight)
        ctx.fillStyle = '#00ffff';
        ctx.fillRect(-4, -5, 8, 12);

        ctx.restore();
    }

    function runGameLoop(timestamp) {
        if (currentState !== GameState.PLAYING) return;

        const dt = (timestamp - lastTime) / 1000;
        lastTime = timestamp;

        update(dt);
        render();

        animationFrameId = requestAnimationFrame(runGameLoop);
    }
});
