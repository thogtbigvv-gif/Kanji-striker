'use strict';
/* js/audio.js - simple beeps (no sound files needed). Load after storage.js. */

function getAudio() {
  if (!soundEnabled) {
    return null;
  }
  if (!audioContext) {
    var AudioClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioClass) {
      return null;
    }
    try {
      audioContext = new AudioClass();
    } catch (error) {
      return null;
    }
    buildAudioOutput();
  }
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
  return audioContext;
}

// All sounds go through one volume control and a compressor, so many sounds at once (a busy endless wave)
// never clip or crackle. If the browser cannot do that, the sounds go straight to the speakers.
function buildAudioOutput() {
  audioOutput = audioContext.destination;
  try {
    var master = audioContext.createGain();
    master.gain.value = MASTER_VOLUME;
    if (typeof audioContext.createDynamicsCompressor === 'function') {
      var limiter = audioContext.createDynamicsCompressor();
      limiter.threshold.value = -12;
      limiter.ratio.value = 8;
      master.connect(limiter);
      limiter.connect(audioContext.destination);
    } else {
      master.connect(audioContext.destination);
    }
    audioOutput = master;
  } catch (error) {
    audioOutput = audioContext.destination;
  }
}

function playTone(frequency, duration, type, volume, delay, endFrequency) {
  var audio = getAudio();
  if (!audio) {
    return;
  }
  var startAt = audio.currentTime + (delay || 0);
  var oscillator = audio.createOscillator();
  var gain = audio.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, startAt);
  if (endFrequency) {
    oscillator.frequency.linearRampToValueAtTime(endFrequency, startAt + duration);
  }
  gain.gain.setValueAtTime(volume, startAt);
  gain.gain.linearRampToValueAtTime(0.0001, startAt + duration);
  oscillator.connect(gain);
  gain.connect(audioOutput || audio.destination);
  oscillator.start(startAt);
  oscillator.stop(startAt + duration + 0.02);
}

function playCorrectSound() {
  playTone(660, 0.1, 'square', 0.08, 0);
  playTone(990, 0.16, 'square', 0.08, 0.09);
}

function playWrongSound() {
  playTone(220, 0.25, 'sawtooth', 0.08, 0, 90);
}

function playHurtSound() {
  playTone(150, 0.2, 'square', 0.09, 0, 60);
}

function playGameOverSound() {
  playTone(440, 0.2, 'triangle', 0.1, 0);
  playTone(330, 0.2, 'triangle', 0.1, 0.2);
  playTone(220, 0.4, 'triangle', 0.1, 0.4);
}

function playWaveSound() {
  playTone(520, 0.1, 'square', 0.06, 0);
  playTone(780, 0.14, 'square', 0.06, 0.1);
}

function playStageCompleteSound() {
  playTone(523, 0.12, 'square', 0.08, 0);
  playTone(659, 0.12, 'square', 0.08, 0.12);
  playTone(784, 0.12, 'square', 0.08, 0.24);
  playTone(1047, 0.3, 'square', 0.08, 0.36);
}

function updateSoundButton() {
  soundToggleButton.textContent = soundEnabled ? 'SOUND: ON' : 'SOUND: OFF';
}
