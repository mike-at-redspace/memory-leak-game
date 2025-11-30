/**
 * Manages cheat code detection and state.
 * Tracks active cheats and handles input buffer for cheat code sequences.
 */
export class CheatCodeHandler {
  constructor() {
    /**
     * @type {string}
     */
    this._cheatBuffer = ''

    /**
     * @type {Set<string>}
     */
    this._activeCheats = new Set()

    /**
     * @type {Map<string, Function>}
     */
    this._cheatCallbacks = new Map()

    this._boundKeydown = this._handleKeydown.bind(this)
  }

  /**
   * Registers a cheat code with an optional callback.
   *
   * @param {string}   code        - The cheat code sequence (e.g., 'jump',
   *                               'hitbox')
   * @param {Function} [callback]  - Optional callback to execute when cheat is
   *                               activated.
   * @returns {void}
   */
  register(code, callback) {
    this._cheatCallbacks.set(code, callback)
  }

  /**
   * Checks if a cheat is currently active.
   *
   * @param {string} code  - The cheat code to check.
   * @returns {boolean}
   */
  isActive(code) {
    return this._activeCheats.has(code)
  }

  /**
   * Activates a cheat code.
   *
   * @param {string} code  - The cheat code to activate.
   * @returns {void}
   */
  activate(code) {
    this._activeCheats.add(code)
    const callback = this._cheatCallbacks.get(code)
    if (callback) {
      callback()
    }
    console.log(`CHEAT ACTIVATED: ${code.toUpperCase()}`)
  }

  /**
   * Deactivates a cheat code.
   *
   * @param {string} code  - The cheat code to deactivate.
   * @returns {void}
   */
  deactivate(code) {
    this._activeCheats.delete(code)
  }

  /**
   * Toggles a cheat code on/off.
   *
   * @param {string} code  - The cheat code to toggle.
   * @returns {void}
   */
  toggle(code) {
    if (this.isActive(code)) {
      this.deactivate(code)
    } else {
      this.activate(code)
    }
  }

  /**
   * Handles keyboard input for cheat code detection.
   *
   * @param {KeyboardEvent} e  - The keyboard event.
   * @returns {void}
   */
  _handleKeydown(e) {
    this._cheatBuffer += e.key.toLowerCase()

    // Keep buffer size manageable
    if (this._cheatBuffer.length > 10) {
      this._cheatBuffer = this._cheatBuffer.slice(-10)
    }

    // Check all registered cheat codes
    for (const [code, callback] of this._cheatCallbacks) {
      if (this._cheatBuffer.endsWith(code)) {
        this.toggle(code)
        this._cheatBuffer = ''
        break
      }
    }
  }

  /**
   * Attaches the keydown event listener.
   *
   * @param {Window} windowRef  - The window object to attach to.
   * @returns {void}
   */
  attach(windowRef) {
    windowRef.addEventListener('keydown', this._boundKeydown)
  }

  /**
   * Detaches the keydown event listener.
   *
   * @param {Window} windowRef  - The window object to detach from.
   * @returns {void}
   */
  detach(windowRef) {
    windowRef.removeEventListener('keydown', this._boundKeydown)
  }
}
