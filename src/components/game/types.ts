// Shared game types
export type GameType = "plinko" | "wheelspin"

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
    icon: "🎰",
  },
  wheelspin: {
    id: "wheelspin",
    name: "Wheel Spin",
    description: "Spin the wheel of fortune",
    icon: "🎡",
  },
}

