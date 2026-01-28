// Shared game types
export type GameType = "plinko" | "wheelspin" | "slotmachine" | "roulette" | "race"

export interface GameInfo {
  id: GameType
  name: string
  description: string
  icon: string
}

export const GAMES: Record<GameType, GameInfo> = {
  plinko: {
    id: "plinko",
    name: "Plinko",
    description: "Drop balls through pegs to determine a winner",
    icon: "🎯",
  },
  wheelspin: {
    id: "wheelspin",
    name: "Wheel Spin",
    description: "Spin the wheel of fortune",
    icon: "🎡",
  },
  slotmachine: {
    id: "slotmachine",
    name: "Slot Machine",
    description: "Pull the lever and let fate decide who presents first",
    icon: "🎰",
  },
  roulette: {
    id: "roulette",
    name: "Roulette",
    description: "Spin the roulette wheel and let fate decide",
    icon: "🎲",
  },
  race: {
    id: "race",
    name: "Race",
    description: "Watch racers compete to the finish line",
    icon: "🏁",
  },
}

