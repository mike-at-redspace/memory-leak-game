import { isTouchDevice } from '../../utils/environment.js'

/**
 * Simple touch-based directional gamepad for mobile devices.
 * Creates a virtual joystick in the bottom-left corner.
 */
export class TouchGamepad {
  constructor() {
    this.canvas = null
    this.ctx = null
    this.isActive = false
    this.centerX = 0
    this.centerY = 0
    this.stickX = 0
    this.stickY = 0
    this.radius = 40
    this.baseRadius = 50
    this.touchId = null
    this.state = { x: 0, y: 0 }

    // Only initialize on touch devices
    if (isTouchDevice()) {
      this.init()
    }
  }

  init() {
    // Create canvas
    this.canvas = document.createElement('canvas')
    this.canvas.id = 'TouchGamepad'
    this.canvas.style.position = 'fixed'
    this.canvas.style.bottom = '20px'
    this.canvas.style.left = '20px'
    this.canvas.style.width = '120px'
    this.canvas.style.height = '120px'
    this.canvas.style.zIndex = '9999'
    this.canvas.style.pointerEvents = 'auto'
    this.canvas.style.touchAction = 'none'
    this.canvas.style.borderRadius = '50%'
    this.canvas.style.overflow = 'visible'
    document.body.appendChild(this.canvas)

    this.ctx = this.canvas.getContext('2d')
    // Make canvas larger to accommodate overflow, but display size stays 120x120
    this.canvas.width = 140
    this.canvas.height = 140

    // Set center position (adjusted for larger canvas)
    this.centerX = 70
    this.centerY = 70
    this.stickX = this.centerX
    this.stickY = this.centerY

    // Add event listeners
    this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this))
    this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this))
    this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this))
    this.canvas.addEventListener('touchcancel', this.handleTouchEnd.bind(this))

    // Listen for fullscreen changes to move gamepad into fullscreen element
    this._boundFullscreenChange = this._handleFullscreenChange.bind(this)
    document.addEventListener('fullscreenchange', this._boundFullscreenChange)
    document.addEventListener(
      'webkitfullscreenchange',
      this._boundFullscreenChange
    )
    document.addEventListener(
      'mozfullscreenchange',
      this._boundFullscreenChange
    )
    document.addEventListener('MSFullscreenChange', this._boundFullscreenChange)

    // Start render loop
    this.draw()
  }

  handleTouchStart(e) {
    e.preventDefault()
    const touch = e.touches[0]
    const rect = this.canvas.getBoundingClientRect()
    const x = touch.clientX - rect.left
    const y = touch.clientY - rect.top

    // Check if touch is within base circle
    const dx = x - this.centerX
    const dy = y - this.centerY
    const dist = Math.sqrt(dx * dx + dy * dy)

    if (dist <= this.baseRadius * 1.5) {
      this.touchId = touch.identifier
      this.isActive = true
      this.updateStick(x, y)
    }
  }

  handleTouchMove(e) {
    if (!this.isActive || this.touchId === null) return

    e.preventDefault()
    const touch = Array.from(e.touches).find(t => t.identifier === this.touchId)
    if (!touch) return

    const rect = this.canvas.getBoundingClientRect()
    const x = touch.clientX - rect.left
    const y = touch.clientY - rect.top

    this.updateStick(x, y)
  }

  handleTouchEnd(e) {
    if (this.touchId === null) return

    const touch = Array.from(e.changedTouches).find(
      t => t.identifier === this.touchId
    )
    if (touch) {
      this.isActive = false
      this.touchId = null
      this.stickX = this.centerX
      this.stickY = this.centerY
      this.state = { x: 0, y: 0 }
      this.draw()
    }
  }

  updateStick(x, y) {
    const dx = x - this.centerX
    const dy = y - this.centerY
    const dist = Math.sqrt(dx * dx + dy * dy)
    const maxDist = this.radius

    if (dist <= maxDist) {
      this.stickX = x
      this.stickY = y
    } else {
      // Clamp to max distance
      const angle = Math.atan2(dy, dx)
      this.stickX = this.centerX + Math.cos(angle) * maxDist
      this.stickY = this.centerY + Math.sin(angle) * maxDist
    }

    // Update state (-1 to 1)
    const normalizedX = (this.stickX - this.centerX) / maxDist
    const normalizedY = (this.stickY - this.centerY) / maxDist
    this.state = { x: normalizedX, y: normalizedY }

    this.draw()
  }

  draw() {
    if (!this.ctx) return

    // Clear entire canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

    // Draw base circle
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.4)'
    this.ctx.beginPath()
    this.ctx.arc(this.centerX, this.centerY, this.baseRadius, 0, Math.PI * 2)
    this.ctx.fill()

    // Draw inner circle
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)'
    this.ctx.beginPath()
    this.ctx.arc(
      this.centerX,
      this.centerY,
      this.baseRadius - 5,
      0,
      Math.PI * 2
    )
    this.ctx.fill()

    // Draw stick
    this.ctx.fillStyle = 'rgba(204, 204, 204, 1)'
    this.ctx.beginPath()
    this.ctx.arc(this.stickX, this.stickY, this.radius - 10, 0, Math.PI * 2)
    this.ctx.fill()

    // Draw center dot
    this.ctx.fillStyle = 'rgba(255, 255, 255, 1)'
    this.ctx.beginPath()
    this.ctx.arc(this.centerX, this.centerY, 10, 0, Math.PI * 2)
    this.ctx.fill()
  }

  observe() {
    return {
      'x-axis': this.state.x,
      'y-axis': this.state.y,
      'x-dir': Math.round(this.state.x),
      'y-dir': Math.round(this.state.y)
    }
  }

  /**
   * Shows the gamepad. Only works on touch devices.
   *
   * @returns {void}
   */
  show() {
    if (isTouchDevice() && this.canvas) {
      this.canvas.style.display = 'block'
      this.canvas.style.visibility = 'visible'
    }
  }

  /**
   * Hides the gamepad.
   *
   * @returns {void}
   */
  hide() {
    if (this.canvas) {
      this.canvas.style.display = 'none'
      this.canvas.style.visibility = 'hidden'
    }
  }

  /**
   * Handles fullscreen changes to keep gamepad visible.
   *
   * @access private
   */
  _handleFullscreenChange() {
    if (!this.canvas) return

    const fullscreenElement =
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.mozFullScreenElement ||
      document.msFullscreenElement

    if (fullscreenElement) {
      // Entering fullscreen - move gamepad into fullscreen element
      if (this.canvas.parentNode !== fullscreenElement) {
        fullscreenElement.appendChild(this.canvas)
      }
    } else {
      // Exiting fullscreen - move gamepad back to body
      if (this.canvas.parentNode !== document.body) {
        document.body.appendChild(this.canvas)
      }
    }
  }

  dispose() {
    // Remove fullscreen listeners
    if (this._boundFullscreenChange) {
      document.removeEventListener(
        'fullscreenchange',
        this._boundFullscreenChange
      )
      document.removeEventListener(
        'webkitfullscreenchange',
        this._boundFullscreenChange
      )
      document.removeEventListener(
        'mozfullscreenchange',
        this._boundFullscreenChange
      )
      document.removeEventListener(
        'MSFullscreenChange',
        this._boundFullscreenChange
      )
    }

    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas)
    }
  }
}
