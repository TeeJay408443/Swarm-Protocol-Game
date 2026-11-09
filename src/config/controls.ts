/**
 * Control Scheme Configuration for Swarm Protocol: Survivor
 * Defines all input mappings for keyboard, touch, and gamepad
 */

// ============================================
// KEYBOARD CONTROLS
// ============================================

export const KEYBOARD_CONTROLS = {
  // Movement keys (WASD for 8-directional movement)
  MOVE: {
    UP: ['KeyW', 'ArrowUp'],
    DOWN: ['KeyS', 'ArrowDown'],
    LEFT: ['KeyA', 'ArrowLeft'],
    RIGHT: ['KeyD', 'ArrowRight'],
  },
  
  // Action keys
  ACTIONS: {
    PRIMARY_ATTACK: ['MouseLeft', 'KeyJ'],
    SECONDARY_ATTACK: ['MouseRight', 'KeyK'],
    DASH: ['Space'],
    SPRINT: ['ShiftLeft', 'ShiftRight'],
    INTERACT: ['KeyE'],
    PAUSE: ['KeyTab', 'Escape'],
  },
  
  // Utility keys
  UTILITY: {
    OPEN_MENU: ['Escape'],
    OPEN_CODEX: ['KeyC'],
    OPEN_ARMORY: ['KeyL'],
    OPEN_LEADERBOARDS: ['KeyB'],
    OPEN_PROFILE: ['KeyP'],
    TOGGLE_MUTE: ['KeyM'],
    TOGGLE_HIGH_CONTRAST: ['KeyH'],
    SCREENSHOT: ['KeyF12'],
  },
  
  // Debug keys (only in development)
  DEBUG: {
    TOGGLE_DEBUG: ['KeyF1'],
    SPAWN_ENEMY: ['KeyF2'],
    KILL_ALL: ['KeyF3'],
    ADD_COINS: ['KeyF4'],
    LEVEL_UP: ['KeyF5'],
    TOGGLE_INVINCIBILITY: ['KeyF6'],
    SKIP_WAVE: ['KeyF7'],
    RESTART: ['KeyF8'],
  },
} as const

// ============================================
// MOVEMENT DIRECTIONS
// ============================================

export type MovementDirection = 
  | 'NONE'
  | 'UP'
  | 'DOWN'
  | 'LEFT'
  | 'RIGHT'
  | 'UP_LEFT'
  | 'UP_RIGHT'
  | 'DOWN_LEFT'
  | 'DOWN_RIGHT'

// Movement vector map (normalized)
export const MOVEMENT_VECTORS: Record<MovementDirection, { x: number; y: number }> = {
  NONE: { x: 0, y: 0 },
  UP: { x: 0, y: -1 },
  DOWN: { x: 0, y: 1 },
  LEFT: { x: -1, y: 0 },
  RIGHT: { x: 1, y: 0 },
  UP_LEFT: { x: -0.7071, y: -0.7071 }, // Normalized diagonal (cos(135°), sin(135°))
  UP_RIGHT: { x: 0.7071, y: -0.7071 }, // Normalized diagonal (cos(45°), sin(45°))
  DOWN_LEFT: { x: -0.7071, y: 0.7071 }, // Normalized diagonal (cos(225°), sin(225°))
  DOWN_RIGHT: { x: 0.7071, y: 0.7071 }, // Normalized diagonal (cos(315°), sin(315°))
} as const

// ============================================
// TOUCH CONTROLS
// ============================================

export const TOUCH_CONTROLS = {
  // Virtual joystick
  JOYSTICK: {
    POSITION: 'left', // 'left' or 'right'
    SIZE: 120, // pixels (diameter)
    DEAD_ZONE: 0.1, // 10% dead zone
    OPACITY: 0.8,
  },
  
  // Action buttons
  BUTTONS: {
    PRIMARY_ATTACK: {
      POSITION: 'right',
      SIZE: 80,
      ICON: '⚔️',
      COLOR: '#FF0055',
    },
    SECONDARY_ATTACK: {
      POSITION: 'right',
      SIZE: 80,
      ICON: '⚡',
      COLOR: '#00F0FF',
    },
    DASH: {
      POSITION: 'right',
      SIZE: 60,
      ICON: '➡️',
      COLOR: '#FFD700',
    },
  },
  
  // Tap to move (alternative)
  TAP_TO_MOVE: {
    ENABLED: true,
    TAP_RADIUS: 50, // pixels from tap position
  },
  
  // Gestures
  GESTURES: {
    SWIPE_DASH: true, // Quick swipe for dash
    DOUBLE_TAP_DASH: true, // Double tap for dash
    PINCH_ZOOM: false, // Not used in this game
  },
} as const

// ============================================
// GAMEPAD CONTROLS
// ============================================

export const GAMEPAD_CONTROLS = {
  // Left stick
  LEFT_STICK: {
    MOVE: true,
    DEAD_ZONE: 0.1,
  },
  
  // Right stick
  RIGHT_STICK: {
    AIM: true, // For potential aimed weapons
    DEAD_ZONE: 0.1,
  },
  
  // Buttons
  BUTTONS: {
    A: 'PRIMARY_ATTACK',
    B: 'SECONDARY_ATTACK',
    X: 'DASH',
    Y: 'INTERACT',
    LB: 'SPRINT',
    RB: 'SPECIAL',
    LT: 'ZOOM_IN',
    RT: 'ZOOM_OUT',
    BACK: 'PAUSE',
    START: 'OPEN_MENU',
    LEFT_STICK_PRESS: 'TOGGLE_WEAPON',
    RIGHT_STICK_PRESS: 'TOGGLE_VIEW',
  },
  
  // D-Pad
  DPAD: {
    UP: 'UP',
    DOWN: 'DOWN',
    LEFT: 'LEFT',
    RIGHT: 'RIGHT',
  },
} as const

// ============================================
// CONTROL SCHEME PRESETS
// ============================================

export type ControlScheme = 'DEFAULT' | 'LEFT_HANDED' | 'CUSTOM'

export const CONTROL_SCHEMES: Record<ControlScheme, typeof KEYBOARD_CONTROLS> = {
  DEFAULT: KEYBOARD_CONTROLS,
  LEFT_HANDED: {
    ...KEYBOARD_CONTROLS,
    MOVE: {
      ...KEYBOARD_CONTROLS.MOVE,
      // Swap left/right for left-handed players
    },
    ACTIONS: {
      ...KEYBOARD_CONTROLS.ACTIONS,
      PRIMARY_ATTACK: ['MouseRight', 'KeyJ'],
      SECONDARY_ATTACK: ['MouseLeft', 'KeyK'],
    },
  },
  CUSTOM: KEYBOARD_CONTROLS, // Will be overridden by user settings
} as const

// ============================================
// INPUT STATE MANAGEMENT
// ============================================

export interface InputState {
  // Movement state
  movement: MovementDirection
  movementVector: { x: number; y: number }
  
  // Action states
  isPrimaryAttacking: boolean
  isSecondaryAttacking: boolean
  isDashing: boolean
  isSprinting: boolean
  isInteracting: boolean
  
  // Just pressed (for single-press actions)
  primaryAttackJustPressed: boolean
  secondaryAttackJustPressed: boolean
  dashJustPressed: boolean
  interactJustPressed: boolean
  pauseJustPressed: boolean
  
  // Mouse state
  mousePosition: { x: number; y: number }
  mouseWorldPosition: { x: number; y: number }
  isMouseDown: boolean
  
  // Touch state
  touches: Map<number, { x: number; y: number }>
  activeTouches: number
  
  // Gamepad state
  gamepadConnected: boolean
  gamepadIndex: number | null
}

// ============================================
// CONTROL SETTINGS
// ============================================

export interface ControlSettings {
  scheme: ControlScheme
  keyboard: typeof KEYBOARD_CONTROLS
  touch: typeof TOUCH_CONTROLS
  gamepad: typeof GAMEPAD_CONTROLS
  
  // Sensitivity
  mouseSensitivity: number
  joystickSensitivity: number
  
  // Inversion
  invertYAxis: boolean
  
  // Vibration (for gamepad)
  vibrationEnabled: boolean
  vibrationIntensity: number
}

// Default control settings
export const DEFAULT_CONTROL_SETTINGS: ControlSettings = {
  scheme: 'DEFAULT',
  keyboard: KEYBOARD_CONTROLS,
  touch: TOUCH_CONTROLS,
  gamepad: GAMEPAD_CONTROLS,
  mouseSensitivity: 1.0,
  joystickSensitivity: 1.0,
  invertYAxis: false,
  vibrationEnabled: true,
  vibrationIntensity: 0.5,
}

// ============================================
// KEY CODE UTILITIES
// ============================================

/**
 * Check if a key code matches any of the specified keys
 */
export function isKeyPressed(
  eventCode: string,
  keyOptions: string[]
): boolean {
  return keyOptions.includes(eventCode)
}

/**
 * Get movement direction from pressed keys
 */
export function getMovementDirection(
  keysPressed: Set<string>
): MovementDirection {
  const up = KEYBOARD_CONTROLS.MOVE.UP.some(key => keysPressed.has(key))
  const down = KEYBOARD_CONTROLS.MOVE.DOWN.some(key => keysPressed.has(key))
  const left = KEYBOARD_CONTROLS.MOVE.LEFT.some(key => keysPressed.has(key))
  const right = KEYBOARD_CONTROLS.MOVE.RIGHT.some(key => keysPressed.has(key))
  
  if (up && left) return 'UP_LEFT'
  if (up && right) return 'UP_RIGHT'
  if (down && left) return 'DOWN_LEFT'
  if (down && right) return 'DOWN_RIGHT'
  if (up) return 'UP'
  if (down) return 'DOWN'
  if (left) return 'LEFT'
  if (right) return 'RIGHT'
  return 'NONE'
}

/**
 * Get movement vector from direction
 */
export function getMovementVector(direction: MovementDirection): { x: number; y: number } {
  return MOVEMENT_VECTORS[direction]
}
