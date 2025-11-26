/**
 * Generates a deterministic pseudo-random number based on a seed.
 *
 * @param {number} seed  - The seed value for random generation.
 * @returns {number} A pseudo-random number between 0 and 1.
 */
export function seededRandom(seed) {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

/**
 * Performs linear interpolation between two values.
 *
 * @param {number} start   - The starting value.
 * @param {number} end     - The ending value.
 * @param {number} factor  - The interpolation factor (0-1)
 * @returns {number} The interpolated value.
 */
export function lerp(start, end, factor) {
  return start + (end - start) * factor
}

/**
 * Clamps a value between a minimum and maximum.
 *
 * @param {number} value  - The value to clamp.
 * @param {number} min    - The minimum allowed value.
 * @param {number} max    - The maximum allowed value.
 * @returns {number} The clamped value.
 */
export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}
