// ---------- Install as an app (PWA) ----------
// Registers the service worker (offline play) and wires the INSTALL APP button in SETTINGS.
// Chrome / Edge / Samsung Internet on Android give an install prompt; iPhone and the other
// browsers have no prompt, so the button tells the player which menu to open.

var installAppButton = document.getElementById('installAppButton');
var installPromptEvent = null;

function isInstalledApp() {
  var standalone = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches;
  return standalone || window.navigator.standalone === true;
}

function isIosDevice() {
  var iosAgent = /iphone|ipad|ipod/i.test(window.navigator.userAgent);
  // iPadOS reports itself as a Mac with a touch screen
  var ipadOs = window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1;
  return iosAgent || ipadOs;
}

function updateInstallButton() {
  // Nothing to install when the game already runs as an app
  installAppButton.hidden = isInstalledApp();
}

function onInstallClick() {
  if (installPromptEvent) {
    var promptEvent = installPromptEvent;
    installPromptEvent = null;
    promptEvent.prompt();
    promptEvent.userChoice.then(function (choice) {
      settingsMessage.textContent = choice.outcome === 'accepted' ? 'INSTALLING...' : 'INSTALL CANCELLED';
    });
    return;
  }
  if (isIosDevice()) {
    settingsMessage.textContent = 'TAP THE SHARE BUTTON, THEN ADD TO HOME SCREEN';
  } else {
    settingsMessage.textContent = 'OPEN THE BROWSER MENU, THEN CHOOSE INSTALL APP OR ADD TO HOME SCREEN';
  }
}

window.addEventListener('beforeinstallprompt', function (event) {
  // Keep the prompt so it opens from our button instead of a random moment
  event.preventDefault();
  installPromptEvent = event;
});

window.addEventListener('appinstalled', function () {
  installPromptEvent = null;
  settingsMessage.textContent = 'INSTALLED';
  updateInstallButton();
});

installAppButton.addEventListener('click', onInstallClick);
updateInstallButton();

// A service worker needs https (or localhost); on file:// the game simply works without it
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('sw.js').catch(function () {});
  });
}
