import type { PlayerProfile } from "../plinko/types"

// Win condition determines what's needed to declare a winner
export type WinCondition = "middle" | "pair" | "triple"

// What happens when someone gets 3-in-a-row (only applies when winCondition is not "triple")
export type TripleResponse = "disabled" | "burn" | "win" | "winBonus"

// When bonus rounds can trigger
export type BonusRoundsMode = "off" | "initialOnly" | "always"

// Result passed to onGameEnd callback
export interface GameResult {
  winner: PlayerProfile
  bonusPoints: number  // 0 for normal win, 2 for triple bonus win
  isTripleWin: boolean
}

export interface SlotMachineConfig {
  reelCount: number            // Number of reels (3-5)
  symbolsPerReel: number       // Visible symbols per reel (3)
  spinDuration: number         // Base spin duration in ms
  reelDelay: number            // Delay between each reel stopping
  symbolSize: number           // Size of each symbol in pixels
  showAvatars: boolean         // Show player avatars as symbols
  showNames: boolean           // Show player names under symbols
  soundEnabled: boolean
  autoSpin: boolean            // Automatically spin again after win
  celebrationDuration: number  // How long to celebrate a win
  jackpotMode: boolean         // Extra celebration for 3 matching
  // Game rules
  winCondition: WinCondition   // What's needed to win: middle reel, pair, or triple
  tripleResponse: TripleResponse // What happens on 3-in-a-row (when winCondition != triple)
  bonusRoundsMode: BonusRoundsMode // When bonus rounds trigger: off, initial spin only, or always (including within bonus rounds)
}

export const defaultSlotMachineConfig: SlotMachineConfig = {
  reelCount: 3,
  symbolsPerReel: 3,
  spinDuration: 2000,
  reelDelay: 400,
  symbolSize: 150,
  showAvatars: true,
  showNames: true,
  soundEnabled: true,
  autoSpin: false,
  celebrationDuration: 3000,
  jackpotMode: true,
  // Game rules
  winCondition: "middle",      // Middle reel determines winner by default
  tripleResponse: "burn",      // Triple match burns and re-rolls by default
  bonusRoundsMode: "initialOnly", // Bonus rounds enabled for initial spin by default
}

export interface ReelSymbol {
  player: PlayerProfile
  position: number
}

export interface ReelState {
  symbols: ReelSymbol[]
  spinning: boolean
  finalIndex: number
}

// Classic vintage casino color palette
export const SLOT_COLORS = {
  // Wood and cabinet colors
  cabinet: {
    wood: "#8B4513",           // Saddle brown (main wood)
    woodDark: "#5D3A1A",       // Dark wood grain
    woodLight: "#A0522D",      // Sienna (wood highlight)
    felt: "#1B4D3E",           // Dark green felt
  },
  // Metallic trim colors
  metal: {
    brass: "#B8860B",          // Dark goldenrod (brass)
    brassLight: "#DAA520",     // Goldenrod (brass highlight)
    chrome: "#C0C0C0",         // Silver chrome
    chromeLight: "#E8E8E8",    // Chrome highlight
    chromeDark: "#808080",     // Chrome shadow
  },
  // Accent colors
  accent: {
    cherryRed: "#DC143C",      // Crimson red
    gold: "#FFD700",           // Pure gold
    cream: "#FFFDD0",          // Cream white
    burgundy: "#722F37",       // Rich burgundy
    ivory: "#FFFFF0",          // Ivory
  },
  // Reel window colors
  reel: {
    background: "#FFF8DC",     // Cornsilk (cream background)
    separator: "#B8860B",      // Brass dividers
    highlight: "#FFD700",      // Gold highlight
    shadow: "rgba(0,0,0,0.3)", // Mechanical shadow
  },
  // Button colors
  button: {
    chrome: "#C0C0C0",         // Chrome base
    chromeHighlight: "#E8E8E8", // Chrome shine
    chromeShadow: "#808080",   // Chrome depth
    ring: "#B8860B",           // Brass ring
  },
  // Win celebration colors
  win: {
    normal: "#FFD700",         // Gold for wins
    jackpot: "#DC143C",        // Cherry red for jackpots
  },
  // Bulb colors for marquee
  bulb: {
    on: "#FFF8DC",             // Warm white when lit
    glow: "#FFE4B5",           // Moccasin warm glow
    off: "#D2B48C",            // Tan when off
  }
}

// Fun messages for different win scenarios
export const WIN_MESSAGES = {
  jackpot: [
    "JACKPOT! 🎰",
    "TRIPLE MATCH! 🔥",
    "MEGA WIN! 💎",
    "INCREDIBLE! ⭐",
  ],
  match: [
    "WINNER! 🎉",
    "NICE! 👏",
    "YOU GOT IT! ✨",
  ],
  presenter: [
    "is up first!",
    "kicks us off!",
    "leads the HUDL!",
    "starts us off!",
  ]
}
