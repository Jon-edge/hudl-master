import type { PlayerProfile } from "../plinko/types"

// Racer themes - different visual styles for the racers
export type RacerTheme = "horses" | "boats" | "cars" | "rockets" | "snails" | "dogs"

export const RACER_THEMES: Record<RacerTheme, { name: string; emoji: string; trackEmoji: string }> = {
  horses: { name: "Horse Race", emoji: "🐎", trackEmoji: "🏇" },
  boats: { name: "Boat Race", emoji: "⛵", trackEmoji: "🌊" },
  cars: { name: "Drag Race", emoji: "🏎️", trackEmoji: "🛣️" },
  rockets: { name: "Space Race", emoji: "🚀", trackEmoji: "🌟" },
  snails: { name: "Snail Race", emoji: "🐌", trackEmoji: "🌿" },
  dogs: { name: "Dog Race", emoji: "🐕", trackEmoji: "🦴" },
}

// Lane colors for each racer
export const LANE_COLORS = [
  "#E53935",  // Red
  "#1E88E5",  // Blue
  "#43A047",  // Green
  "#FFD600",  // Yellow
  "#8E24AA",  // Purple
  "#FF6D00",  // Orange
  "#00ACC1",  // Cyan
  "#D81B60",  // Pink
  "#7CB342",  // Lime
  "#5E35B1",  // Deep purple
  "#F4511E",  // Deep orange
  "#00897B",  // Teal
  "#C62828",  // Deep red
  "#F9A825",  // Amber
]

export interface RaceConfig {
  // Track settings
  trackLength: number           // Visual track length (px)
  laneHeight: number            // Height of each lane (px)

  // Race dynamics
  baseSpeed: number             // Base movement speed
  speedVariation: number        // Random speed variation (0-1)
  boostChance: number           // Chance of speed boost (0-1)
  boostMultiplier: number       // Speed multiplier during boost
  slowdownChance: number        // Chance of slowdown (0-1)
  slowdownMultiplier: number    // Speed multiplier during slowdown

  // Visual settings
  racerTheme: RacerTheme
  showPlayerNames: boolean
  showPlayerAvatars: boolean
  animationSpeed: number        // Overall animation timing multiplier

  // Race settings
  autoRestart: boolean          // Auto start next race after win
  dramaticFinish: boolean       // Slow down near finish for tension
}

export const defaultRaceConfig: RaceConfig = {
  trackLength: 600,
  laneHeight: 60,
  baseSpeed: 3,
  speedVariation: 0.8,
  boostChance: 0.02,
  boostMultiplier: 2.5,
  slowdownChance: 0.015,
  slowdownMultiplier: 0.3,
  racerTheme: "horses",
  showPlayerNames: true,
  showPlayerAvatars: true,
  animationSpeed: 1,
  autoRestart: false,
  dramaticFinish: true,
}

// Individual racer state during race
export interface RacerState {
  playerId: string
  position: number              // Current X position (0 to trackLength)
  speed: number                 // Current speed
  isBoost: boolean              // Currently boosting
  isSlowed: boolean             // Currently slowed
  animationFrame: number        // For animation cycling
  finished: boolean             // Has crossed finish line
  finishTime: number | null     // When they finished (for ordering)
  laneIndex: number             // Which lane they're in
}

// Overall race state
export interface RaceState {
  racers: RacerState[]
  isRacing: boolean
  raceStartTime: number | null
  winner: PlayerProfile | null
  finishOrder: string[]         // Player IDs in order of finish
}

export const initialRaceState: RaceState = {
  racers: [],
  isRacing: false,
  raceStartTime: null,
  winner: null,
  finishOrder: [],
}
