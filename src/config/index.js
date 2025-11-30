import { ITEM_REGISTRY } from './items.js'
import {
  ScreenConfig,
  LayoutConfig,
  Fonts,
  Colors,
  HudConfig,
  UIConfig,
  ItemOutlineColors,
  LevelThemes,
  PlayerVisualConfig
} from './styles.js'
import { ParticleConfig } from './render.js'
import { SoundPresets } from './sound.js'

/**
 * Physics constants that govern movement, animation, and tile math.
 *
 * @type {Readonly<{
 *   BaseSpeed: number
 *   AnimationSpeed: number
 *   CameraLerpFactor: number
 *   TileSize: number
 * }>}
 */
export const PhysicsConfig = Object.freeze({
  BaseSpeed: 4,
  AnimationSpeed: 8,
  CameraLerpFactor: 0.12,
  TileSize: 64
})

/**
 * Sprite sheet metadata used by the renderer and player animation.
 *
 * @type {Readonly<{
 *   Source: string
 *   Width: number
 *   Height: number
 *   Scale: number
 *   FramesPerDirection: number
 * }>}
 */
export const SpriteConfig = Object.freeze({
  Source: '/assets/sprite-sheet.png',
  Width: 128,
  Height: 258,
  Scale: 0.5,
  FramesPerDirection: 8
})

/**
 * Gameplay tuning values such as health, speed boosts, and leak rate.
 *
 * @type {Readonly<{
 *   MaxHealth: number
 *   SpeedBoostDuration: number
 *   SpeedBoostMultiplier: number
 *   MemoryLeakRate: number
 * }>}
 */
export const StatsConfig = Object.freeze({
  MaxHealth: 640,
  SpeedBoostDuration: 4200,
  SpeedBoostMultiplier: 2.0,
  MemoryLeakRate: 8
})

/**
 * Enumerates the world tile types.
 *
 * @type {Readonly<{ FLOOR: number; WALL: number }>}
 */
export const TileTypes = Object.freeze({ FLOOR: 0, WALL: 1 })

/**
 * Cardinal direction identifiers used by input and animation logic.
 *
 * @type {Readonly<{
 *   UP: number
 *   RIGHT: number
 *   DOWN: number
 *   LEFT: number
 * }>}
 */
export const Directions = Object.freeze({ UP: 0, RIGHT: 1, DOWN: 2, LEFT: 3 })

/**
 * High level game states that drive the engine loop.
 *
 * @type {Readonly<{
 *   START: number
 *   PLAYING: number
 *   GAMEOVER: number
 *   VICTORY: number
 * }>}
 */
export const GameStates = Object.freeze({
  START: 0,
  PLAYING: 1,
  GAMEOVER: 2,
  VICTORY: 3
})

/**
 * Collision box dimensions in view space.
 *
 * @type {Readonly<{
 *   Width: number
 *   Height: number
 *   VerticalOffset: number
 * }>}
 */
export const CollisionConfig = Object.freeze({
  Width: 32,
  Height: 48,
  VerticalOffset: 52
})

/**
 * Procedural generation constants used by the world grid.
 *
 * @type {Readonly<{
 *   CellSize: number
 *   Primes: { X: number; Y: number }
 *   ItemSeed: { X: number; Y: number }
 *   SpawnChance: number
 *   ConnectionThresholds: { One: number; Two: number }
 * }>}
 */
export const ProcGenConfig = Object.freeze({
  CellSize: 4,
  Primes: { X: 73856093, Y: 19349663 },
  ItemSeed: { X: 1234567, Y: 9876543 },
  SpawnChance: 0.08,
  ConnectionThresholds: { One: 0.33, Two: 0.66 }
})

/**
 * Item placement configuration for guaranteed item distribution.
 *
 * @type {Readonly<{
 *   MinDistanceSameType: number
 *   MinDistanceFromSpawn: number
 *   MaxDistanceFromSpawn: number
 *   UseEuclideanDistance: boolean
 *   DistributionZones: number
 *   MaxPlacementAttempts: number
 *   RelaxDistanceOnFailure: boolean
 * }>}
 */
export const ItemPlacementConfig = Object.freeze({
  MinDistanceSameType: 4, // Reduced from 6 to allow more placement options
  MinDistanceFromSpawn: 2, // Reduced from 3
  MaxDistanceFromSpawn: 500, // Much larger to avoid filtering out valid tiles
  UseEuclideanDistance: false,
  MaxPlacementAttempts: 2000,
  RelaxDistanceOnFailure: true,
  MinDistanceSameTypeFallback: 2 // Minimum distance even in fallback
})

/**
 * Pre-processed list of items that count toward the main collection goal.
 *
 * @type {ReadonlyArray<(typeof ITEM_REGISTRY)[number]>}
 */
export const TARGET_ITEMS = ITEM_REGISTRY.filter(
  item => !item.isBoost && !item.isSlow && !item.health
)

/** Aggregates gameplay constants for quick imports. */
export const GameConfig = Object.freeze({
  Physics: PhysicsConfig,
  Sprite: SpriteConfig,
  Stats: StatsConfig,
  TileTypes,
  Directions,
  GameStates,
  Collision: CollisionConfig,
  ProcGen: ProcGenConfig,
  ItemRegistry: ITEM_REGISTRY,
  TargetItems: TARGET_ITEMS
})

export { ParticleConfig }
export { SoundPresets }

export {
  ITEM_REGISTRY,
  ScreenConfig,
  LayoutConfig,
  Fonts,
  Colors,
  HudConfig,
  UIConfig,
  ItemOutlineColors,
  LevelThemes,
  PlayerVisualConfig
}
