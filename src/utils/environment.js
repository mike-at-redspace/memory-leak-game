const defaultWindowImpl = {
  addEventListener: () => {},
  removeEventListener: () => {},
  innerWidth: 0,
  innerHeight: 0,
  AudioContext: null,
  webkitAudioContext: null,
  fetch: null
}

const defaultDocumentImpl = {
  body: null,
  head: { appendChild: () => {} },
  createElement: () => ({})
}

/** Provides a safe global reference that works in non-browser contexts. */
export const safeGlobal =
  typeof globalThis !== 'undefined'
    ? globalThis
    : typeof window !== 'undefined'
      ? window
      : {}

export const defaultAudioContextCtor =
  typeof safeGlobal.AudioContext !== 'undefined'
    ? safeGlobal.AudioContext
    : safeGlobal.webkitAudioContext

export const defaultFetcher =
  typeof safeGlobal.fetch === 'function'
    ? safeGlobal.fetch.bind(safeGlobal)
    : async () => {
        throw new Error('fetch API is not available')
      }

/** Provides a safe window reference that works in non-browser contexts. */
export const defaultWindow =
  typeof window !== 'undefined' ? window : defaultWindowImpl

/** Provides a safe document reference for server-side rendering or tests. */
export const defaultDocument =
  typeof document !== 'undefined' ? document : defaultDocumentImpl

/** Provides a safe event target for shared DOM listeners. */
export const defaultEventTarget =
  typeof window !== 'undefined'
    ? window
    : { addEventListener: () => {}, removeEventListener: () => {} }

/**
 * Supplies a viewport measurement strategy compatible with non-browser
 * contexts. Default implementation just reads from the safe `window` object.
 */
export const defaultViewport = () => ({
  width: defaultWindow.innerWidth ?? 0,
  height: defaultWindow.innerHeight ?? 0
})

/**
 * Detects if the current device supports touch input.
 *
 * @returns {boolean} True if the device supports touch, false otherwise.
 */
export const isTouchDevice = () => {
  if (typeof window === 'undefined') return false
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    (navigator.msMaxTouchPoints && navigator.msMaxTouchPoints > 0)
  )
}
