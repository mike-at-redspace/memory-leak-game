import { PhysicsConfig } from '../config/index.js'
import { lerp } from '../utils/math.js'
import { defaultViewport } from '../utils/environment.js'

/** Manages the game view position, smoothly interpolating towards a target. */
export class Camera {
  /**
   * Initializes the camera at origin (0,0).
   *
   * @param {Object} [options={}]
   * - Configuration options. Default is `{}`
   * @param {function():{width:number,height:number}}
   * [options.viewport=defaultViewport]
   * - Callback to retrieve current screen dimensions. Default is
   * `defaultViewport`
   */
  constructor({ viewport = defaultViewport } = {}) {
    this.x = 0
    this.y = 0
    this._getViewport = viewport
  }

  /**
   * Updates the camera position to center on the target, applying linear
   * interpolation (Lerp).
   *
   * @param {number} targetX  - The target entity's X world coordinate.
   * @param {number} targetY  - The target entity's Y world coordinate.
   * @returns {void}
   */
  follow(targetX, targetY) {
    const { width, height } = this._getViewport()

    // Calculate the top-left position needed to center the target
    const desiredX = targetX - width / 2
    const desiredY = targetY - height / 2

    // Apply smoothing
    this.x = lerp(this.x, desiredX, PhysicsConfig.CameraLerpFactor)
    this.y = lerp(this.y, desiredY, PhysicsConfig.CameraLerpFactor)
  }

  /**
   * Updates the viewport measurement strategy (e.g., during window resize or
   * testing).
   *
   * @param {function():{width:number,height:number}} viewportFn
   * - The new dimension provider.
   * @returns {void}
   */
  setViewport(viewportFn) {
    this._getViewport = viewportFn
  }
}
