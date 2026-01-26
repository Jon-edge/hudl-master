import type { PlayerProfile } from "../plinko/types"

export type WheelGameMode = "winner" | "elimination" | "first_to_x"

export const WHEEL_GAME_MODES: Record<WheelGameMode, { name: string; description: string }> = {
  winner: {
    name: "Land on You",
    description: "Wheel lands on you, you win!",
  },
  elimination: {
    name: "Last Man Standing",
    description: "Each spin eliminates a player. Last one remaining wins!",
  },
  first_to_x: {
    name: "First to X",
    description: "First player to be selected X times wins (or loses).",
  },
}

// Special wheel space types
export type SpecialSpaceType = 
  | "double_points"    // Respin, winner gets 2 points
  | "reverse_spin"     // Respin in opposite direction
  | "lose_a_point"     // Selected player loses a point (first_to_x mode)
  | "bankrupt"         // Selected player loses all points (first_to_x mode)
  | "free_spin"        // Current leader gets a free spin
  | "mystery"          // Random effect (placeholder for future)

export interface SpecialSpaceInfo {
  id: SpecialSpaceType
  name: string
  shortName: string       // For display on wheel
  emoji: string
  description: string
  color: string
  textColor: string
  applicableModes: WheelGameMode[] // Which game modes this space works with
}

export const SPECIAL_SPACES: Record<SpecialSpaceType, SpecialSpaceInfo> = {
  double_points: {
    id: "double_points",
    name: "Double Points",
    shortName: "2X",
    emoji: "⭐",
    description: "Next player landed on gets 2x the effect!",
    color: "#FFD700",          // Gold
    textColor: "#000000",
    applicableModes: ["winner", "elimination", "first_to_x"],
  },
  reverse_spin: {
    id: "reverse_spin",
    name: "Reverse Spin",
    shortName: "↺",
    emoji: "🔄",
    description: "Wheel spins in the opposite direction!",
    color: "#9C27B0",          // Purple
    textColor: "#FFFFFF",
    applicableModes: ["winner", "elimination", "first_to_x"],
  },
  lose_a_point: {
    id: "lose_a_point",
    name: "Lose a Point",
    shortName: "-1",
    emoji: "📉",
    description: "Next player landed on loses 1 point",
    color: "#F44336",          // Red
    textColor: "#FFFFFF",
    applicableModes: ["first_to_x"],
  },
  bankrupt: {
    id: "bankrupt",
    name: "Bankrupt",
    shortName: "💸",
    emoji: "💸",
    description: "Next player landed on loses ALL their points!",
    color: "#212121",          // Almost black
    textColor: "#FFFFFF",
    applicableModes: ["first_to_x"],
  },
  free_spin: {
    id: "free_spin",
    name: "Free Spin",
    shortName: "FREE",
    emoji: "🎁",
    description: "Bonus spin for the current leader!",
    color: "#4CAF50",          // Green
    textColor: "#FFFFFF",
    applicableModes: ["first_to_x"],
  },
  mystery: {
    id: "mystery",
    name: "Mystery",
    shortName: "?",
    emoji: "❓",
    description: "Something random happens...",
    color: "#673AB7",          // Deep purple
    textColor: "#FFFFFF",
    applicableModes: ["winner", "elimination", "first_to_x"],
  },
}

// Config for each special space type
export interface SpecialSpaceSettings {
  enabled: boolean
  count: number  // How many of this space to add to the wheel (1-3)
}

export interface WheelSpinConfig {
  wheelSize: number
  spinDuration: number // ms
  minSpins: number // minimum full rotations
  maxSpins: number // maximum full rotations
  friction: number // deceleration rate
  showPlayerAvatars: boolean
  showPlayerNames: boolean
  innerWheelRatio: number // ratio of inner wheel to outer (0.3 = 30%)
  textScale: number // text size multiplier (0.5 = 50%, 1.0 = 100%, 1.5 = 150%)
  soundEnabled: boolean
  // Game mode settings
  gameMode: WheelGameMode
  firstToXTarget: number // target count for "first to x" mode
  firstToXIsWin: boolean // true = first to X wins, false = first to X loses
  autoRespin: boolean // automatically respin in elimination mode until winner is determined
  // Special spaces settings
  specialSpaces: Record<SpecialSpaceType, SpecialSpaceSettings>
}

export const defaultSpecialSpacesConfig: Record<SpecialSpaceType, SpecialSpaceSettings> = {
  double_points: { enabled: false, count: 1 },
  reverse_spin: { enabled: false, count: 1 },
  lose_a_point: { enabled: false, count: 1 },
  bankrupt: { enabled: false, count: 1 },
  free_spin: { enabled: false, count: 1 },
  mystery: { enabled: false, count: 1 },
}

export const defaultWheelSpinConfig: WheelSpinConfig = {
  wheelSize: 510,
  spinDuration: 6000,
  minSpins: 3,
  maxSpins: 8,
  friction: 0.97,
  showPlayerAvatars: true,
  showPlayerNames: true,
  innerWheelRatio: 0.35,
  textScale: 1.0,
  soundEnabled: true,
  // Game mode defaults
  gameMode: "winner",
  firstToXTarget: 3,
  firstToXIsWin: true,
  autoRespin: true,
  // Special spaces - all disabled by default
  specialSpaces: { ...defaultSpecialSpacesConfig },
}

// Game state for tracking progress in multi-round modes
export interface WheelGameState {
  eliminatedPlayerIds: string[]
  playerCounts: Record<string, number> // player id -> selection count
  gameOver: boolean
  winner: PlayerProfile | null
  loser: PlayerProfile | null // for first_to_x when firstToXIsWin is false
}

// Base wheel segment with common properties
export interface WheelSegmentBase {
  startAngle: number
  endAngle: number
  color: string
}

// Player segment
export interface PlayerWheelSegment extends WheelSegmentBase {
  type: "player"
  player: PlayerProfile
}

// Special space segment
export interface SpecialWheelSegment extends WheelSegmentBase {
  type: "special"
  specialType: SpecialSpaceType
  info: SpecialSpaceInfo
}

export type WheelSegment = PlayerWheelSegment | SpecialWheelSegment

// Legacy support - will be removed later
export interface LegacyWheelSegment {
  player: PlayerProfile
  startAngle: number
  endAngle: number
  color: string
}

// Vibrant carnival color palette for wheel segments
export const WHEEL_COLORS = [
  "#E53935",  // Carnival red
  "#FFD600",  // Sunny yellow
  "#1E88E5",  // Royal blue
  "#43A047",  // Emerald green
  "#8E24AA",  // Purple
  "#FF6D00",  // Orange
  "#00ACC1",  // Cyan
  "#D81B60",  // Hot pink
  "#7CB342",  // Lime green
  "#5E35B1",  // Deep purple
  "#F4511E",  // Deep orange
  "#00897B",  // Teal
  "#C62828",  // Deep red
  "#F9A825",  // Amber
]
