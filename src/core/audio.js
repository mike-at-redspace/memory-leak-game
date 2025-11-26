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
    this._musicBuffer = null
    this._musicUrl = '/assets/background-music.mp3'

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
   * Fetches, decodes, and loops the background music.
   *
   * @returns {Promise<void>}
   * @async
   */
  async startMusic() {
    this.initialize()
    if (!this._context || !this._fetcher) return

    if (!this._musicBuffer) {
      try {
        const response = await this._fetcher(this._musicUrl)
        const arrayBuffer = await response.arrayBuffer()
        this._musicBuffer = await this._context.decodeAudioData(arrayBuffer)
      } catch (error) {
        console.warn('AudioController: Failed to load music', error)
        return
      }
    }

    if (this._musicSource) return

    this._musicSource = this._context.createBufferSource()
    this._musicSource.buffer = this._musicBuffer
    this._musicSource.loop = true

    const musicGain = this._context.createGain()
    musicGain.gain.value = 0.08 // Background level

    this._musicSource.connect(musicGain)
    musicGain.connect(this._masterGain)
    this._musicSource.start(0)
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
   * Stops playback, disconnects nodes, and releases the AudioContext.
   *
   * @returns {void}
   */
  dispose() {
    if (this._musicSource) {
      this._musicSource.stop()
      this._musicSource.disconnect()
      this._musicSource = null
    }
    if (this._context) {
      this._context.close().catch(() => {})
      this._context = null
    }
    this._masterGain = null
    this._musicBuffer = null
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
