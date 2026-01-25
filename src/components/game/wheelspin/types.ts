import type { PlayerProfile } from "../plinko/types"

export interface WheelSpinConfig {
  wheelSize: number
  spinDuration: number // ms
  minSpins: number // minimum full rotations
  maxSpins: number // maximum full rotations
  friction: number // deceleration rate
  showPlayerAvatars: boolean
  showPlayerNames: boolean
  innerWheelRatio: number // ratio of inner wheel to outer (0.3 = 30%)
  soundEnabled: boolean
}

export const defaultWheelSpinConfig: WheelSpinConfig = {
  wheelSize: 400,
  spinDuration: 6000,
  minSpins: 3,
  maxSpins: 8,
  friction: 0.97,
  showPlayerAvatars: true,
  showPlayerNames: true,
  innerWheelRatio: 0.35,
  soundEnabled: true,
}

export interface WheelSegment {
  player: PlayerProfile
  startAngle: number
  endAngle: number
  color: string
}

// Beautiful color palette for wheel segments
export const WHEEL_COLORS = [
  "oklch(0.70 0.20 25)",   // Coral red
  "oklch(0.75 0.18 60)",   // Golden amber
  "oklch(0.72 0.16 140)",  // Emerald green
  "oklch(0.68 0.18 200)",  // Ocean cyan
  "oklch(0.65 0.22 270)",  // Royal purple
  "oklch(0.72 0.20 330)",  // Hot pink
  "oklch(0.78 0.15 85)",   // Lime yellow
  "oklch(0.70 0.18 175)",  // Teal
  "oklch(0.65 0.20 295)",  // Violet
  "oklch(0.75 0.16 15)",   // Peach
  "oklch(0.68 0.22 240)",  // Electric blue
  "oklch(0.72 0.18 355)",  // Rose
  "oklch(0.70 0.15 120)",  // Mint
  "oklch(0.68 0.20 45)",   // Tangerine
]
