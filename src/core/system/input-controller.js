import { Directions } from '../../config/index.js'
import { defaultEventTarget } from '../../utils/environment.js'

/**
 * Multiplier for normalizing diagonal movement (1 / Math.sqrt(2)).
 *
 * @constant {number}
 */
const DIAGONAL_FACTOR = Math.SQRT1_2

/** Tracks keyboard and mouse input state to drive game entities. */
export class InputController {
  /**
   * Initializes input listeners on the target element.
   *
   * @param {Object} [options={}]
   * - Configuration options. Default is `{}`
   * @param {EventTarget} [options.target=defaultEventTarget]
   * - The DOM element to listen to (usually window or canvas). Default is
   * `defaultEventTarget`
   */
  constructor({ target = defaultEventTarget } = {}) {
    this._target = target
    this._keysPressed = new Set()
    this._mouse = { x: 0, y: 0 }

    // Bind handlers once to ensure reference equality for removal later
    this._boundHandlers = {
      down: this._handleKeyDown.bind(this),
      up: this._handleKeyUp.bind(this),
      move: this._handleMouseMove.bind(this)
    }

    this._attachListeners()
  }

  /**
   * Attaches event listeners to the target.
   *
   * @returns {void}
   * @access private
   */
  _attachListeners() {
    this._target.addEventListener('keydown', this._boundHandlers.down)
    this._target.addEventListener('keyup', this._boundHandlers.up)
    this._target.addEventListener('mousemove', this._boundHandlers.move)
  }

  /**
   * Internal handler for key down events.
   *
   * @param {KeyboardEvent} event
   * @returns {void}
   * @access private
   */
  _handleKeyDown(event) {
    this._keysPressed.add(event.key)
  }

  /**
   * Internal handler for key up events.
   *
   * @param {KeyboardEvent} event
   * @returns {void}
   * @access private
   */
  _handleKeyUp(event) {
    this._keysPressed.delete(event.key)
  }

  /**
   * Internal handler for mouse movement.
   *
   * @param {MouseEvent} event
   * @returns {void}
   * @access private
   */
  _handleMouseMove(event) {
    this._mouse.x = event.clientX
    this._mouse.y = event.clientY
  }

  /**
   * Calculates the normalized movement vector based on currently held keys.
   * Supports both Arrow keys and WASD.
   *
   * @returns {{ x: number; y: number }} A vector where x and y are between -1
   *                                     and 1.
   */
  getMovementVector() {
    const isRight =
      this._keysPressed.has('ArrowRight') || this._keysPressed.has('d')
    const isLeft =
      this._keysPressed.has('ArrowLeft') || this._keysPressed.has('a')
    const isDown =
      this._keysPressed.has('ArrowDown') || this._keysPressed.has('s')
    const isUp = this._keysPressed.has('ArrowUp') || this._keysPressed.has('w')

    const x = (isRight ? 1 : 0) - (isLeft ? 1 : 0)
    const y = (isDown ? 1 : 0) - (isUp ? 1 : 0)

    // Normalize diagonal movement so player doesn't move faster diagonally
    if (x !== 0 && y !== 0) {
      return { x: x * DIAGONAL_FACTOR, y: y * DIAGONAL_FACTOR }
    }

    return { x, y }
  }

  /**
   * Determines the facing direction based on a movement vector. Defaults to
   * null if there is no movement.
   *
   * @param {number} vx  - Velocity X component.
   * @param {number} vy  - Velocity Y component.
   * @returns {number | null} The direction enum value or null if stationary.
   */
  getDirection(vx, vy) {
    if (vy < 0) return Directions.UP
    if (vy > 0) return Directions.DOWN
    if (vx < 0) return Directions.LEFT
    if (vx > 0) return Directions.RIGHT
    return null
  }

  /**
   * Removes all event listeners to prevent memory leaks.
   *
   * @returns {void}
   */
  dispose() {
    this._target.removeEventListener('keydown', this._boundHandlers.down)
    this._target.removeEventListener('keyup', this._boundHandlers.up)
    this._target.removeEventListener('mousemove', this._boundHandlers.move)
  }

  /**
   * Returns a copy of the current mouse coordinates.
   *
   * @returns {{ x: number; y: number }}
   */
  get mousePosition() {
    return { ...this._mouse }
  }
}
