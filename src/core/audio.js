import {
  defaultAudioContextCtor,
  defaultFetcher
} from '../utils/environment.js'
import { SoundPresets } from '../config/index.js'

/**
 * Manages the Web Audio API context, background music streaming, and procedural
 * sound effect generation.
 */
export class AudioController {
  /**
   * @param {Object} [options={}]
   * - Configuration options. Default is `{}`
   * @param {Function} [options.audioContextCtor]
   * - The AudioContext constructor (dependency injection).
   * @param {Function} [options.fetcher]
   * - The fetch implementation for loading assets.
   */
  constructor({
    audioContextCtor = defaultAudioContextCtor,
    fetcher = defaultFetcher
  } = {}) {
    // --- Private State ---
    this._context = null
    this._masterGain = null
    this._isMuted = false

    this._musicSource = null
    this._musicGain = null
    this._musicBuffers = new Map() // Cache for level music buffers
    this._currentLevel = 1

    this._AudioContextCtor = audioContextCtor
    this._fetcher = fetcher
  }

  /**
   * Lazily initializes the AudioContext and Master Gain Node. Can be called
   * repeatedly; will only initialize once.
   *
   * @returns {void}
   */
  initialize() {
    if (!this._context && this._AudioContextCtor) {
      this._context = new this._AudioContextCtor()
      this._masterGain = this._context.createGain()
      this._masterGain.connect(this._context.destination)
      this._applyMuteState(this._isMuted)
    }

    if (this._context?.state === 'suspended') {
      this._context.resume().catch(() => {})
    }
  }

  /**
   * Toggles the global mute state of the game.
   *
   * @returns {boolean} The new mute state (true = muted).
   */
  toggleMute() {
    const newState = !this._isMuted
    this._applyMuteState(newState)
    return newState
  }

  /**
   * Internal helper to apply the mute gain value.
   *
   * @param {boolean} shouldMute  - Whether to silence audio.
   * @returns {void}
   * @access private
   */
  _applyMuteState(shouldMute) {
    this._isMuted = shouldMute
    if (this._masterGain) {
      const time = this._context.currentTime
      this._masterGain.gain.setValueAtTime(shouldMute ? 0 : 1, time)
    }
  }

  /**
   * Gets the music URL for a specific level.
   *
   * @param {number} level  - The level number (1-5).
   * @returns {string} The music file path for the level.
   * @access private
   */
  _getMusicUrlForLevel(level) {
    const clampedLevel = Math.min(Math.max(1, level), 5)
    return `/assets/level-${clampedLevel}.mp3`
  }

  /**
   * Stops the currently playing music.
   *
   * @returns {void}
   * @access private
   */
  _stopMusic() {
    if (this._musicSource) {
      try {
        this._musicSource.stop()
      } catch {
        // Source may already be stopped
      }
      this._musicSource.disconnect()
      this._musicSource = null
    }
    if (this._musicGain) {
      this._musicGain.disconnect()
      this._musicGain = null
    }
  }

  /**
   * Stops the background music playback.
   *
   * @returns {void}
   */
  stopMusic() {
    this._stopMusic()
  }

  /**
   * Fetches, decodes, and loops the background music for a specific level.
   *
   * @param {number} [level=1]  - The level number (1-5). Defaults to 1.
   * @returns {Promise<void>}
   * @async
   */
  async startMusic(level = 1) {
    this.initialize()
    if (!this._context || !this._fetcher) return

    const targetLevel = Math.min(Math.max(1, level), 5)
    this._currentLevel = targetLevel

    // Stop current music if playing
    this._stopMusic()

    // Check if we already have this level's music cached
    let musicBuffer = this._musicBuffers.get(targetLevel)

    if (!musicBuffer) {
      try {
        const musicUrl = this._getMusicUrlForLevel(targetLevel)
        const response = await this._fetcher(musicUrl)
        const arrayBuffer = await response.arrayBuffer()
        musicBuffer = await this._context.decodeAudioData(arrayBuffer)
        this._musicBuffers.set(targetLevel, musicBuffer)
      } catch (error) {
        console.warn(
          `AudioController: Failed to load music for level ${targetLevel}`,
          error
        )
        return
      }
    }

    // Create and start new music source
    this._musicSource = this._context.createBufferSource()
    this._musicSource.buffer = musicBuffer
    this._musicSource.loop = true

    this._musicGain = this._context.createGain()
    this._musicGain.gain.value = 0.08 // Background level

    this._musicSource.connect(this._musicGain)
    this._musicGain.connect(this._masterGain)
    this._musicSource.start(0)
  }

  /**
   * Changes the background music to match the specified level.
   *
   * @param {number} level  - The level number (1-5).
   * @returns {Promise<void>}
   * @async
   */
  async changeMusicForLevel(level) {
    if (level === this._currentLevel) return
    await this.startMusic(level)
  }

  /**
   * Generates a procedural tone using an OscillatorNode.
   *
   * @param {Object} params                  - The tone configuration.
   * @param {number} params.frequency        - The base frequency in Hz.
   * @param {string} params.type             - The waveform type (sine, square,
   *                                         sawtooth,
   *                                         triangle).
   * @param {number} params.duration         - How long the tone lasts in
   *                                         seconds.
   * @param {number} params.volume           - Peak volume (0.0 to 1.0).
   * @param {number} [params.startOffset=0]  - Delay before playing in seconds.
   *                                         Default is `0`
   * @param {number} [params.pitchBend=0]    - Frequency shift over the duration
   *                                         in Hz. Default is `0`
   * @returns {void}
   */
  playTone({
    frequency,
    type,
    duration,
    volume,
    startOffset = 0,
    pitchBend = 0
  }) {
    if (!this._context) return

    const startTime = this._context.currentTime + startOffset
    const stopTime = startTime + duration
    const attackTime = 0.005
    const releaseTime = 0.05

    const osc = this._context.createOscillator()
    const gain = this._context.createGain()

    osc.type = type
    osc.frequency.setValueAtTime(frequency, startTime)

    if (pitchBend !== 0) {
      osc.frequency.exponentialRampToValueAtTime(
        Math.max(1, frequency + pitchBend), // Prevent negative frequency
        stopTime
      )
    }

    // Envelope: Ramp up (Attack) -> sustain -> Ramp down (Release)
    gain.gain.setValueAtTime(0.0001, startTime)
    gain.gain.exponentialRampToValueAtTime(volume, startTime + attackTime)
    gain.gain.exponentialRampToValueAtTime(0.0001, stopTime)

    osc.connect(gain)
    gain.connect(this._masterGain)

    osc.start(startTime)
    osc.stop(stopTime + releaseTime)
  }

  /**
   * Triggers the "Item Collected" sound effect.
   *
   * @returns {void}
   */
  playCollect() {
    this.playTone(SoundPresets.COLLECT)
  }

  /**
   * Triggers the "Damage Taken" sound effect.
   *
   * @returns {void}
   */
  playDamage() {
    this.playTone(SoundPresets.DAMAGE)
  }

  /**
   * Triggers the "Power Up" sound effect.
   *
   * @returns {void}
   */
  playPowerUp() {
    this.playTone(SoundPresets.POWERUP)
  }

  /**
   * Triggers the "Debuff/Slow" sound effect.
   *
   * @returns {void}
   */
  playDebuff() {
    this.playTone(SoundPresets.DEBUFF)
  }

  /**
   * Triggers the "Health" sound effect.
   *
   * @returns {void}
   */
  playHealth() {
    this.playTone(SoundPresets.HEALTH)
  }

  /**
   * Stops playback, disconnects nodes, and releases the AudioContext.
   *
   * @returns {void}
   */
  dispose() {
    this._stopMusic()
    if (this._context) {
      this._context.close().catch(() => {})
      this._context = null
    }
    this._masterGain = null
    this._musicBuffers.clear()
  }

  /**
   * Getter for current mute status.
   *
   * @returns {boolean}
   */
  get isMuted() {
    return this._isMuted
  }
}
