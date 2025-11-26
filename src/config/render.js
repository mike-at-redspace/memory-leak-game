/**
 * Floating text particle configuration shared between the renderer
 * and any future presentation helpers.
 */
export const ParticleConfig = Object.freeze({
  Life: {
    Default: 1.0
  },
  Decay: {
    Boost: 1.0,
    Default: 0.4
  },
  Gravity: 0.05,
  WobbleSpeed: 50
})
