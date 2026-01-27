import type { PlayerProfile } from "../plinko/types"

export interface RouletteConfig {
  /** Size of the wheel in pixels */
  wheelSize: number
  /** Initial spin velocity (affects how long it takes to stop) */
  spinVelocity: number
  /** Ball size relative to wheel */
  ballSize: number
  /** How bouncy the ball is (0-1) */
  ballRestitution: number
  /** Ball friction (affects how quickly it settles) */
  ballFriction: number
  /** Number of diamond deflectors on the wheel */
  deflectorCount: number
  /** Wheel style: european (37), american (38), or players (one slot per player) */
  wheelStyle: "european" | "american" | "players"

  // Physics tuning parameters
  /** Inward gravity/slope strength (100-1000) */
  gravity: number
  /** Slope angle of outer track in radians (0.1-0.5) */
  outerTrackSlope: number
  /** Air resistance - velocity decay coefficient (0.001-0.05) */
  airResistance: number
  /** Surface friction coefficient (0.01-0.2) */
  trackFriction: number
  /** How strongly the wheel drags the ball in pockets (0.1-0.8) */
  wheelCoupling: number
  /** Initial ball throw speed multiplier (0.5-3.0) */
  ballThrowSpeed: number
  /** Wheel spin speed multiplier (0.5-3.0) */
  wheelSpinSpeed: number
  /** Wheel friction - how quickly the wheel slows down (0.99-0.999) */
  wheelFriction: number
}

export const defaultRouletteConfig: RouletteConfig = {
  wheelSize: 500,
  spinVelocity: 30,
  ballSize: 12,
  ballRestitution: 1.5,
  ballFriction: 0.5,
  deflectorCount: 0,
  wheelStyle: "players",
  // Physics tuning defaults - tuned for realistic ~10-15 second spins
  gravity: 2000,          // Inward pull strength
  outerTrackSlope: 1.7,   // Track slope angle
  airResistance: 0.2,     // Velocity decay
  trackFriction: 0.8,     // Surface friction
  wheelCoupling: 5,       // Ball follows wheel in pockets
  ballThrowSpeed: 0.2,    // Ball throw speed multiplier
  wheelSpinSpeed: 5,      // Wheel spin speed multiplier
  wheelFriction: 0.995,   // Wheel friction (0.99 = fast stop, 0.999 = slow stop)
}

// European roulette wheel order (37 numbers: 0-36)
export const EUROPEAN_WHEEL_ORDER = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10,
  5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26
]

// American roulette wheel order (38 numbers: 0, 00, 1-36)
export const AMERICAN_WHEEL_ORDER = [
  0, 28, 9, 26, 30, 11, 7, 20, 32, 17, 5, 22, 34, 15, 3, 24, 36, 13, 1,
  -1, // -1 represents 00
  27, 10, 25, 29, 12, 8, 19, 31, 18, 6, 21, 33, 16, 4, 23, 35, 14, 2
]

// Red numbers in roulette
export const RED_NUMBERS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]

export interface RouletteSlot {
  number: number
  color: "red" | "black" | "green"
  displayText: string
  angle: number // Starting angle of this slot in radians
  arcLength: number // Arc length in radians
}

// Colors for player slots (cycles through these)
export const PLAYER_SLOT_COLORS: Array<"red" | "black"> = [
  "red", "black", "red", "black", "red", "black", "red", "black",
  "red", "black", "red", "black", "red", "black", "red", "black",
]

export function getWheelSlots(
  style: "european" | "american" | "players",
  playerCount?: number
): RouletteSlot[] {
  // Player mode: one slot per player
  if (style === "players" && playerCount && playerCount > 0) {
    const slotCount = Math.max(playerCount, 2) // Minimum 2 slots
    const arcLength = (2 * Math.PI) / slotCount

    return Array.from({ length: slotCount }, (_, index) => ({
      number: index + 1,
      color: PLAYER_SLOT_COLORS[index % PLAYER_SLOT_COLORS.length],
      displayText: String(index + 1),
      angle: index * arcLength - Math.PI / 2,
      arcLength,
    }))
  }

  // Traditional roulette modes
  const numbers = style === "european" ? EUROPEAN_WHEEL_ORDER : AMERICAN_WHEEL_ORDER
  const slotCount = numbers.length
  const arcLength = (2 * Math.PI) / slotCount

  return numbers.map((num, index) => {
    const isGreen = num === 0 || num === -1
    const isRed = !isGreen && RED_NUMBERS.includes(num)

    return {
      number: num,
      color: isGreen ? "green" : isRed ? "red" : "black",
      displayText: num === -1 ? "00" : String(num),
      angle: index * arcLength - Math.PI / 2, // Start from top
      arcLength,
    }
  })
}

export interface RouletteResult {
  slot: RouletteSlot
  winner: PlayerProfile | null
}

