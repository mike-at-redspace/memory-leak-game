import {
  StatsConfig,
  Directions,
  PhysicsConfig,
  SpriteConfig,
  ScreenConfig
} from '../config/index.js'

/** Manages the player character's physics, health, and animation state. */
export class Player {
  /** Initializes player defaults and internal animation timers. */
  constructor() {
    this.x = 0
    this.y = 0
    this.health = StatsConfig.MaxHealth
    this.direction = Directions.DOWN
    this.frame = 0
    this.multiplier = 1

    // Internal State
    this._animTimer = 0
    this._isMoving = false
  }

  /**
   * Repositions the player and resets health and speed modifiers.
   *
   * @param {{ x: number; y: number }} pos  - The world coordinates to spawn at.
   * @returns {void}
   */
  reset(pos) {
    this.x = pos.x
    this.y = pos.y
    this.health = StatsConfig.MaxHealth
    this.multiplier = 1
    this.direction = Directions.DOWN
    this.frame = 0

    this._animTimer = 0
    this._isMoving = false
  }

  /**
   * Advances the sprite animation frame based on elapsed time.
   *
   * @param {number} dt  - Delta time in milliseconds.
   * @returns {void}
   */
  update(dt) {
    if (!this._isMoving) {
      this.frame = 0
      this._animTimer = 0
      return
    }

    this._animTimer += dt

    // Calculate threshold based on config (normalized to frame interval)
    const threshold = PhysicsConfig.AnimationSpeed * ScreenConfig.FrameInterval

    if (this._animTimer >= threshold) {
      this.frame = (this.frame + 1) % SpriteConfig.FramesPerDirection
      this._animTimer = 0
    }
  }

  /**
   * Calculates physics and resolves wall collisions. Checks X and Y axes
   * independently to allow "sliding" along walls.
   *
   * @param {{ x: number; y: number }} vec
   * - Normalized input vector.
   * @param {World} world
   * - The game world instance for collision checks.
   * @param {number} dt
   * - Delta time in milliseconds.
   * @returns {void}
   */
  move(vec, world, dt) {
    // 1. Determine state
    this._isMoving = vec.x !== 0 || vec.y !== 0
    if (!this._isMoving) return

    const speed = PhysicsConfig.BaseSpeed * this.multiplier
    const frameRatio = dt / ScreenConfig.FrameInterval
    const distance = speed * frameRatio

    if (vec.x !== 0) {
      const nextX = this.x + vec.x * distance
      if (!world.checkCollision(nextX, this.y)) {
        this.x = nextX
      }
    }
    if (vec.y !== 0) {
      const nextY = this.y + vec.y * distance
      if (!world.checkCollision(this.x, nextY)) {
        this.y = nextY
      }
    }
  }
}
