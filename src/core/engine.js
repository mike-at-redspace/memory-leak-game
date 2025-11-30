import { clamp } from '../utils/math.js'
import { AudioController } from './audio.js'
import { InputController } from './system/input-controller.js'
import { CheatCodeHandler } from './system/cheat-code-handler.js'
import { World } from '../world/world.js'
import { Player } from '../world/player.js'
import { Camera } from '../world/camera.js'
import { Renderer, FloatingTextSystem } from './renderer.js'
import {
  Colors,
  GameStates,
  StatsConfig,
  PhysicsConfig,
  SpriteConfig,
  CollisionConfig,
  TARGET_ITEMS,
  ItemOutlineColors,
  HudConfig
} from '../config/index.js'
import { defaultDocument, defaultWindow } from '../utils/environment.js'

/**
 * Orchestrates the primary game loop, state management, and subsystem
 * coordination.
 */
export class GameEngine {
  /**
   * Initializes the game engine and its subsystems.
   *
   * - @param {Object} [options={}] - Configuration options.
   *
   * @param {Window} [options.windowRef=defaultWindow]
   * - Reference to the global window object. Default is `defaultWindow`
   * @param {Document} [options.documentRef=defaultDocument]
   * - Reference to the global document object. Default is `defaultDocument`
   * @param {HTMLCanvasElement} [options.canvasElement=null]
   * - Optional existing canvas to render onto. Default is `null`
   */
  constructor({
    windowRef = defaultWindow,
    documentRef = defaultDocument,
    canvasElement
  } = {}) {
    this._isRunning = false
    this._animationFrameId = null
    this._boundHandlers = {}

    this.window = windowRef
    this.document = documentRef

    this.canvas = canvasElement ?? this.document.getElementById?.('gameCanvas')
    if (!this.canvas) throw new Error('GameEngine: Canvas element not found')

    this.audio = new AudioController({
      audioContextCtor:
        this.window.AudioContext || this.window.webkitAudioContext,
      fetcher: this.window.fetch?.bind(this.window)
    })

    this.input = new InputController({ target: this.window })
    this.world = new World()
    this.player = new Player()

    this.camera = new Camera({
      viewport: () => ({
        width: this.window.innerWidth,
        height: this.window.innerHeight
      })
    })

    this.renderer = new Renderer(this.canvas, {
      windowRef: this.window,
      documentRef: this.document
    })

    this.particles = new FloatingTextSystem()
    this.state = GameStates.START

    this.stats = this._createInitialStats()
    this.hud = this._createInitialHud()
    this.collectedUniqueIds = new Set()

    this._boundHandlers.pointer = this.handlePointer.bind(this)
    this.window.addEventListener('pointerdown', this._boundHandlers.pointer)

    // Cheat code handler
    this.cheats = new CheatCodeHandler()
    this.cheats.register('jump', () => this._activateJumpCheat())
    this.cheats.register('hitbox', () => {}) // Toggle handled by CheatCodeHandler
    this.cheats.attach(this.window)
  }

  /**
   * Initializes resources and triggers the game loop once assets are ready.
   *
   * - @returns {void}
   */
  start() {
    if (!this.renderer.sheet.complete) {
      this.renderer.sheet.onload = () => this._startLoop()
    } else {
      this._startLoop()
    }
  }

  /**
   * Halts the game loop and stops animation frames.
   *
   * - @returns {void}
   */
  stop() {
    this._isRunning = false
    if (this._animationFrameId) {
      cancelAnimationFrame(this._animationFrameId)
    }
  }

  /**
   * Cleans up event listeners and disposes of subsystems to free memory.
   *
   * - @returns {void}
   */
  destroy() {
    this.stop()
    this.window.removeEventListener('pointerdown', this._boundHandlers.pointer)
    this.input.dispose()
    this.renderer.dispose()
    this.audio.dispose()
    this.cheats.detach(this.window)
  }

  /**
   * Internal helper to set the running flag and start the loop.
   *
   * - @private.
   *
   * @returns {void}
   */
  _startLoop() {
    if (!this._isRunning) {
      this._isRunning = true
      this.lastTime = performance.now()
      this._loop(this.lastTime)
    }
  }

  /**
   * Core frame loop. Caps delta time to prevent physics anomalies during lag.
   *
   * - @private.
   *
   * @param {number} time  - Current performance timestamp from
   *                       requestAnimationFrame.
   * @returns {void}
   */
  _loop(time) {
    if (!this._isRunning) return

    const rawDt = time - this.lastTime
    const dt = Math.min(rawDt, 100) // Cap at 100ms
    this.lastTime = time

    if (this.state === GameStates.PLAYING) {
      this.update(dt)
    }

    this.draw()
    this._animationFrameId = requestAnimationFrame(t => this._loop(t))
  }

  /**
   * Updates game logic, physics, and state transitions based on elapsed time.
   *
   * - @param {number} dt - Delta time in milliseconds since the last frame.
   *
   * @returns {void}
   */
  /**
   * Updates game logic, physics, and state transitions based on elapsed time.
   *
   * @param {number} dt  - Delta time in milliseconds since the last frame.
   * @returns {void}
   */
  update(dt) {
    const moveVec = this.input.getMovementVector()
    this.player.move(moveVec, this.world, dt)
    this.player.update(dt)

    const newDir = this.input.getDirection(moveVec.x, moveVec.y)
    if (newDir !== null) this.player.direction = newDir

    const playerHalfWidth = (SpriteConfig.Width * SpriteConfig.Scale) / 2
    const playerHalfHeight = (SpriteConfig.Height * SpriteConfig.Scale) / 2
    const playerCenterX = this.player.x + playerHalfWidth
    const playerCenterY = this.player.y + playerHalfHeight

    this.camera.follow(playerCenterX, playerCenterY)
    this._checkCollisions()

    // === BOOST IMMUNITY: No memory leak drain during boost ===
    if (!this.player.isBoosted) {
      this.stats.playerHealth -= (StatsConfig.MemoryLeakRate * dt) / 1000
    }

    if (this.hud.messageTimer > 0) this.hud.messageTimer -= dt
    this._updateHudPulseTimers(dt)
    this.particles.update(dt)

    this._checkGameStateTransitions()
  }

  /**
   * Checks for item collisions using the player's collision box.
   *
   * @access private
   * @returns {void}
   */
  _checkCollisions() {
    // Calculate player's collision box (matching world.js checkCollision logic)
    const scale = SpriteConfig.Scale
    const sx = this.player.x
    const sy = this.player.y
    const cx = sx + (SpriteConfig.Width * scale) / 2
    const bottomY =
      sy + SpriteConfig.Height * scale - CollisionConfig.VerticalOffset
    const halfWidth = CollisionConfig.Width / 2

    const playerLeft = cx - halfWidth
    const playerRight = cx + halfWidth
    const playerTop = bottomY
    const playerBottom = bottomY + CollisionConfig.Height

    // Get player center for grid calculation
    const playerCenterX = sx + (SpriteConfig.Width * scale) / 2
    const playerCenterY = sy + (SpriteConfig.Height * scale) / 2
    const gridX = Math.floor(playerCenterX / PhysicsConfig.TileSize)
    const gridY = Math.floor(playerCenterY / PhysicsConfig.TileSize)
    const halfTile = PhysicsConfig.TileSize / 2

    // Check items in nearby tiles
    for (let y = gridY - 1; y <= gridY + 1; y++) {
      for (let x = gridX - 1; x <= gridX + 1; x++) {
        const item = this.world.getItemAt(x, y)
        if (!item) continue

        const itemX = x * PhysicsConfig.TileSize + halfTile
        const itemY = y * PhysicsConfig.TileSize + halfTile

        // Check if item point is within player's collision box
        if (
          itemX >= playerLeft &&
          itemX <= playerRight &&
          itemY >= playerTop &&
          itemY <= playerBottom
        ) {
          this.processItem(item, x, y)
        }
      }
    }
  }

  /**
   * Applies the effects of a collected item to the game state.
   *
   * - @param {Object} item - The item definition object containing stats and
   * type info.
   *
   * @param {number} tileX  - The grid X index where the item was located.
   * @param {number} tileY  - The grid Y index where the item was located.
   * @returns {void}
   */
  processItem(item, tileX, tileY) {
    this.world.collectedItems.add(`${tileX},${tileY}`)
    const worldX = tileX * PhysicsConfig.TileSize
    const worldY = tileY * PhysicsConfig.TileSize

    if (item.health) {
      this._handleHealthItem(item, worldX, worldY)
    } else if (item.isBoost || item.isSlow) {
      this._handleSpeedItem(item, worldX, worldY)
    } else {
      this._handleScoreItem(item, worldX, worldY)
    }

    this.stats.score += item.score || 0
    this._updateHudMessage(item)
  }

  /**
   * Handles global pointer down events to interact with UI or transition
   * states.
   *
   * - @param {PointerEvent} event - The browser pointer event.
   *
   * @returns {void}
   */
  handlePointer(event) {
    const rect = this.canvas.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top

    if (this.state === GameStates.PLAYING) {
      const muteBtn = this.renderer.getMuteButtonRect()
      if (this._isPointInRect(x, y, muteBtn)) {
        this.audio.toggleMute()
        return
      }
    }

    this._handleStateClickInteraction()
  }

  /**
   * Renders the current frame based on the active game state.
   *
   * - @returns {void}
   */
  draw() {
    if (this.state === GameStates.START) {
      this.renderer.renderStartScreen()
    } else if (this.state === GameStates.PLAYING) {
      this.renderer.renderGame(
        this.world,
        this.player,
        this.camera,
        this.particles,
        this.stats,
        this.hud,
        this.audio.isMuted,
        this.stats.level,
        this.cheats
      )
    } else {
      this.renderer.renderEndScreen(
        this.state === GameStates.VICTORY,
        this.stats.score
      )
    }
  }

  // --- Private Helpers ---

  /**
   * Handles state transitions triggered by user clicks (Start/Restart).
   *
   * - @private.
   *
   * @returns {void}
   */
  _handleStateClickInteraction() {
    switch (this.state) {
      case GameStates.START:
        this.audio.initialize()
        this.resetGame()
        this.audio.startMusic(this.stats.level)
        this._transitionState(GameStates.PLAYING)
        break
      case GameStates.GAMEOVER:
      case GameStates.VICTORY:
        this.resetGame()
        // Restart music for the current level (level 1 after reset)
        this.audio.startMusic(this.stats.level)
        this._transitionState(GameStates.PLAYING)
        break
    }
  }

  /**
   * Calculates level-based health multiplier. Healing becomes less effective,
   * damage becomes more effective as level increases.
   *
   * - @private.
   *
   * @param {number}  level      - Current level (1-5).
   * @param {boolean} isHealing  - Whether this is a healing item (positive
   *                             health).
   * @returns {number} Multiplier to apply to health value.
   */
  _getHealthMultiplier(level, isHealing) {
    // Level 1: 1.0x (base)
    // Level 2: Healing 0.9x, Damage 1.1x
    // Level 3: Healing 0.8x, Damage 1.2x
    // Level 4: Healing 0.7x, Damage 1.3x
    // Level 5: Healing 0.6x, Damage 1.4x
    const levelOffset = level - 1
    if (isHealing) {
      return 1.0 - levelOffset * 0.1 // Decrease healing by 10% per level
    } else {
      return 1.0 + levelOffset * 0.1 // Increase damage by 10% per level
    }
  }

  /**
   * Rounds a number to the nearest multiple of 4.
   *
   * - @private.
   *
   * @param {number} value  - Value to round.
   * @returns {number} Value rounded to nearest multiple of 4.
   */
  _roundToMultipleOf4(value) {
    return Math.round(value / 4) * 4
  }

  /**
   * Applies health modifications from an item with level-based scaling + BOOST
   * IMMUNITY.
   *
   * @param {Object} item  - The health item object.
   * @param {number} x     - World X position for particle effects.
   * @param {number} y     - World Y position for particle effects.
   * @returns {void}
   * @access private
   */
  _handleHealthItem(item, x, y) {
    const isHeal = item.health > 0

    // === BOOST IMMUNITY: Block damage items completely ===
    if (!isHeal && this.player.isBoosted) {
      this.particles.spawn(x, y, '🛡️ IMMUNE', 'boost')
      this.audio.playPowerUp() // Positive sound for immunity
      return // Skip damage application
    }

    const multiplier = this._getHealthMultiplier(this.stats.level, isHeal)
    const adjustedHealth = this._roundToMultipleOf4(item.health * multiplier)

    this.stats.playerHealth = clamp(
      this.stats.playerHealth + adjustedHealth,
      0,
      StatsConfig.MaxHealth
    )

    this.particles.spawn(
      x,
      y,
      `${isHeal ? '+' : ''}${adjustedHealth}KB`,
      isHeal ? 'heal' : 'damage'
    )
    isHeal ? this.audio.playHealth() : this.audio.playDamage()
  }

  /**
   * Applies speed modifications from an item.
   *
   * - @private.
   *
   * @param {Object} item  - The speed item object (boost or slow).
   * @param {number} x     - World X position for particle effects.
   * @param {number} y     - World Y position for particle effects.
   * @returns {void}
   */
  /**
   * Applies speed modifications from an item + visual effect flags.
   */
  _handleSpeedItem(item, x, y) {
    const isBoost = !!item.isBoost

    // Apply speed multiplier
    this.player.multiplier = isBoost ? StatsConfig.SpeedBoostMultiplier : 0.5

    // SET THE VISUAL FLAGS — THIS WAS MISSING!
    this.player.isBoosted = isBoost
    this.player.isSlowed = !isBoost

    // Clear any existing timer
    if (this.player.speedTimer) {
      clearTimeout(this.player.speedTimer)
      this.player.speedTimer = null
    }

    // Reset multiplier + visual flags when duration ends
    this.player.speedTimer = setTimeout(() => {
      this.player.multiplier = 1
      this.player.isBoosted = false
      this.player.isSlowed = false
      this.player.speedTimer = null
    }, StatsConfig.SpeedBoostDuration)

    // Particles & sound
    this.particles.spawn(
      x + PhysicsConfig.TileSize / 2,
      y + PhysicsConfig.TileSize / 2,
      isBoost ? 'BOOST!' : 'LAG...',
      isBoost ? 'boost' : 'slow'
    )
    isBoost ? this.audio.playPowerUp() : this.audio.playDebuff()
  }

  /**
   * Handles standard score/collectible items.
   *
   * - @private.
   *
   * @param {Object} item  - The collectible item object.
   * @param {number} x     - World X position for particle effects.
   * @param {number} y     - World Y position for particle effects.
   * @returns {void}
   */
  _handleScoreItem(item, x, y) {
    this.stats.itemsCollected++
    if (!this.collectedUniqueIds.has(item.id)) {
      this.collectedUniqueIds.add(item.id)
      this.hud.collectedIds.add(item.id)
      this.hud.collectedPulseTimers.set(item.id, HudConfig.gridPulseDuration)
      this.stats.uniqueFound = this.collectedUniqueIds.size
    }
    this.particles.spawn(x, y, `+${item.score}`, 'score')
    this.audio.playCollect()
  }

  /**
   * Updates the Heads-Up Display message buffer with item details.
   *
   * - @private.
   *
   * @param {Object} item  - The item triggering the message.
   * @returns {void}
   */
  _updateHudMessage(item) {
    this.hud.lastMessage = `${item.emoji} ${item.name}`
    this.hud.messageTimer = 3000

    if (item.health < 0) this.hud.messageColor = ItemOutlineColors.hazard
    else if (item.health > 0) this.hud.messageColor = ItemOutlineColors.heal
    else if (item.isBoost) this.hud.messageColor = ItemOutlineColors.boost
    else if (item.isSlow) this.hud.messageColor = ItemOutlineColors.slow
    else this.hud.messageColor = Colors.Warning
  }

  /**
   * Ticks down the pulse timers used by the cache dump inventory grid.
   *
   * @param {number} dt  - Delta time in milliseconds.
   * @returns {void}
   */
  _updateHudPulseTimers(dt) {
    const timers = this.hud.collectedPulseTimers
    if (!timers || timers.size === 0) return

    for (const [id, remaining] of timers.entries()) {
      const next = remaining - dt
      if (next <= 0) {
        timers.delete(id)
      } else {
        timers.set(id, next)
      }
    }
  }

  /**
   * Verifies win/loss conditions and transitions state if necessary.
   *
   * - @private.
   *
   * @returns {void}
   */
  _checkGameStateTransitions() {
    if (this.stats.playerHealth <= 0) {
      this._transitionState(GameStates.GAMEOVER)
      this.audio.stopMusic()
      this.audio.playDamage()
    } else if (this.collectedUniqueIds.size >= TARGET_ITEMS.length) {
      if (this.stats.level < 5) {
        this._advanceLevel()
      } else {
        this._transitionState(GameStates.VICTORY)
        this.audio.playPowerUp()
      }
    }
  }

  /**
   * Updates the internal game state machine.
   *
   * - @private.
   *
   * @param {string} newState  - The enum value of the new state.
   * @returns {void}
   */
  _transitionState(newState) {
    this.state = newState
  }

  /**
   * Resets the world, player, and stats for a new game session.
   *
   * - @returns {void}
   */
  resetGame() {
    this.stats = this._createInitialStats()
    this.hud = this._createInitialHud()
    this.collectedUniqueIds.clear()
    // Reset world with level 1 to regenerate map and items
    this.world.reset(this.stats.level)

    const spawn = this.world.findSpawn()
    this.player.reset(spawn)

    this.camera.x = spawn.x - this.window.innerWidth / 2
    this.camera.y = spawn.y - this.window.innerHeight / 2
  }

  /**
   * Advances to the next level, resetting the world but keeping stats.
   *
   * @access private
   */
  _advanceLevel() {
    this.stats.level++
    // Reset world with new level to regenerate map and items
    this.world.reset(this.stats.level)
    this.collectedUniqueIds.clear()
    this.hud.collectedIds.clear()
    this.hud.collectedPulseTimers.clear()

    // Fully restore health on level up
    this.stats.playerHealth = StatsConfig.MaxHealth

    const spawn = this.world.findSpawn()
    this.player.reset(spawn)
    this.camera.x = spawn.x - this.window.innerWidth / 2
    this.camera.y = spawn.y - this.window.innerHeight / 2

    // Change music to match new level
    this.audio.changeMusicForLevel(this.stats.level)

    this.particles.spawn(spawn.x, spawn.y, `LEVEL ${this.stats.level}`, 'boost')
    this.audio.playPowerUp()
  }

  /**
   * Generates the default statistics object.
   *
   * - @private.
   *
   * @returns {Object} A fresh stats object with default values.
   */
  _createInitialStats() {
    return {
      score: 0,
      itemsCollected: 0,
      uniqueFound: 0,
      playerHealth: StatsConfig.MaxHealth,
      level: 1
    }
  }

  /**
   * Generates the default HUD state object.
   *
   * - @private.
   *
   * @returns {Object} A fresh HUD object with default values.
   */
  _createInitialHud() {
    return {
      lastMessage: '',
      messageColor: '#fff',
      messageTimer: 0,
      collectedIds: new Set(),
      collectedPulseTimers: new Map()
    }
  }

  /**
   * Utility to check if a 2D point lies within a rectangle.
   *
   * - @private.
   *
   * @param {number} x       - The X coordinate of the point.
   * @param {number} y       - The Y coordinate of the point.
   * @param {Object} rect    - The rectangle definition.
   * @param {number} rect.x  - Rectangle X origin.
   * @param {number} rect.y  - Rectangle Y origin.
   * @param {number} rect.w  - Rectangle width.
   * @param {number} rect.h  - Rectangle height.
   * @returns {boolean} True if the point is inside the rectangle.
   */
  _isPointInRect(x, y, rect) {
    return (
      x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h
    )
  }

  _activateJumpCheat() {
    // Mark all target items as collected
    TARGET_ITEMS.forEach(item => {
      this.collectedUniqueIds.add(item.id)
      this.hud.collectedIds.add(item.id)
    })
    // Immediately check and advance level if needed
    if (this.collectedUniqueIds.size >= TARGET_ITEMS.length) {
      if (this.stats.level < 5) {
        this._advanceLevel()
      } else {
        this._transitionState(GameStates.VICTORY)
        this.audio.playPowerUp()
      }
    }
  }
}
