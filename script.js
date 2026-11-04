/* KANJI STRIKER - Main Script & Application Lifecycle */

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

    // Canvas Resizing for High-DPI & Mobile Fit
    function resizeCanvas() {
        const container = canvas.parentElement;
        const width = container.clientWidth;
        const height = container.clientHeight;

        // Set display size
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';

        // Set actual size in memory (scaled for high-DPI displays)
        const dpr = window.devicePixelRatio || 1;
        canvas.width = width * dpr;
        canvas.height = height * dpr;

        ctx.scale(dpr, dpr);
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
            // TODO: Stop game loop / show pause overlay
        } else if (currentState === GameState.PAUSED) {
            currentState = GameState.PLAYING;
            pauseBtn.textContent = '⏸';
            // TODO: Resume game loop
        }
    });

    collectionBtn.addEventListener('click', () => {
        alert('KANJI COLLECTION хэсэг дараагийн хөгжүүлэлтэд нэмэгдэнэ.');
    });

    settingsBtn.addEventListener('click', () => {
        alert('SETTINGS хэсэг дараагийн хөгжүүлэлтэд нэмэгдэнэ.');
    });

    // Placeholder for Game Loop / Canvas Rendering (Phase 01 & 02 preparation)
    let animationFrameId = null;

    function initGameEngine() {
        console.log('Game Engine Initialized');
        runGameLoop();
    }

    function stopGameEngine() {
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
        console.log('Game Engine Stopped');
    }

    function runGameLoop() {
        if (currentState !== GameState.PLAYING) return;

        // Clear canvas and draw background placeholder / stars
        ctx.fillStyle = '#050508';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw temporary placeholder text on canvas
        ctx.fillStyle = '#00ffff';
        ctx.font = '16px "Courier New", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('SHOOTER ENGINE READY (PHASE 01)', canvas.width / (2 * (window.devicePixelRatio || 1)), canvas.height / (2 * (window.devicePixelRatio || 1)));

        animationFrameId = requestAnimationFrame(runGameLoop);
    }
});
