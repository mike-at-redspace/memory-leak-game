/**
 * Audio configuration data for procedural tone presets.
 */
export const SoundPresets = Object.freeze({
  COLLECT: { frequency: 1047, type: 'sine', duration: 0.08, volume: 0.06 },
  DAMAGE: {
    frequency: 220,
    type: 'sawtooth',
    duration: 0.18,
    volume: 0.1,
    pitchBend: -80
  },
  POWERUP: { frequency: 523, type: 'triangle', duration: 0.1, volume: 0.05 }
})
