'use strict';

// KANJI STRIKER service worker (v0.11.3)
// 1. The whole game is saved on the phone at the first visit, so it opens with no internet.
// 2. It makes the game installable (Add to Home Screen / Install app).
// 3. Updates: a file is served from the saved copy at once and refreshed from the network in the
//    background, so a new version shows up the next time the game is opened.
// Your progress is NOT stored here (it lives in localStorage), so an update never touches it.
// When you add or rename a file, add it to APP_FILES and change the number in CACHE_NAME.

var CACHE_NAME = 'kanji-striker-v0.11.3';

var APP_FILES = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/base.css',
  'css/buttons.css',
  'css/menu.css',
  'css/menu-attract.css',
  'css/game.css',
  'css/panels.css',
  'css/how-to.css',
  'css/results.css',
  'css/galaxy.css',
  'css/mode-select.css',
  'css/kanji-card.css',
  'js/data.js',
  'js/kanji-info.js',
  'js/config.js',
  'js/state.js',
  'js/storage.js',
  'js/progression.js',
  'js/audio.js',
  'js/waves.js',
  'js/challenges.js',
  'js/srs.js',
  'js/enemies.js',
  'js/arcade.js',
  'js/endless.js',
  'js/game.js',
  'js/render.js',
  'js/input.js',
  'js/script.js',
  'js/pwa.js',
  'icon-192.png',
  'icon-512.png',
  'icon-maskable-512.png',
  'apple-touch-icon.png'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function (cache) { return cache.addAll(APP_FILES); })
      .then(function () { return self.skipWaiting(); })
  );
});

// Remove the saved files of older versions
self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys()
      .then(function (names) {
        return Promise.all(names.map(function (name) {
          if (name.indexOf('kanji-striker-') === 0 && name !== CACHE_NAME) {
            return caches.delete(name);
          }
          return null;
        }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (event) {
  var request = event.request;
  if (request.method !== 'GET') {
    return;
  }
  var url = new URL(request.url);
  if (url.origin !== self.location.origin) {
    return;
  }
  event.respondWith(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.match(request, { ignoreSearch: true }).then(function (saved) {
        var fresh = fetch(request).then(function (response) {
          if (response && response.ok) {
            cache.put(request, response.clone());
          }
          return response;
        }).catch(function () {
          if (saved) {
            return saved;
          }
          // Offline and not saved: a page request gets the game itself
          if (request.mode === 'navigate') {
            return cache.match('index.html');
          }
          return Response.error();
        });
        return saved || fresh;
      });
    })
  );
});
