export const SoundPresets = Object.freeze({
  COLLECT: {
    frequency: 1568,
    type: 'sine',
    duration: 0.15,
    volume: 0.09,
    pitchBend: 350,
    envelope: { attack: 0.005, decay: 0.145 }
  },
  DAMAGE: {
    frequency: 180,
    type: 'sawtooth',
    duration: 0.25,
    volume: 0.12,
    pitchBend: -120,
    envelope: { attack: 0.005, decay: 0.245 }
  },
  POWERUP: {
    frequency: 523,
    type: 'square',
    duration: 0.45,
    volume: 0.12,
    pitchBend: 800,
    envelope: { attack: 0.01, decay: 0.44 }
  },
  DEBUFF: {
    frequency: 440,
    type: 'triangle',
    duration: 0.5,
    volume: 0.1,
    pitchBend: -400,
    envelope: { attack: 0.05, decay: 0.45 }
  },
  HEALTH: {
    frequency: 660,
    type: 'sine',
    duration: 0.35,
    volume: 0.09,
    pitchBend: 300,
    envelope: { attack: 0.03, decay: 0.32 }
  }
})
