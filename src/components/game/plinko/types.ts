export interface PlayerProfile {
  id: string
  name: string
  wins: number
  active: boolean
  avatarUrl?: string
  archived?: boolean
}

export interface PlinkoConfig {
  ballCount: number
  ballRadius: number
  ballRestitution: number
  ballFriction: number
  ballShape: "ball" | "square" | "triangle"
  destroyBalls: boolean
  dropLocation: "random" | "zigzag" | "center"
  pinRadius: number
  pinRows: number
  pinColumns: number
  pinRestitution: number
  pinFriction: number
  pinShape: "ball" | "square" | "triangle"
  pinAngle: number
  pinWallGap: number
  pinRimGap: number
  ceilingGap: number
  wallThickness: number
  rimHeight: number
  rimWidth: number
  bucketCount: number
  bucketDistribution: "even" | "middle" | "edge"
  winCondition: "nth" | "most" | "first" | "last-empty"
  winNth: number
  width: number
  height: number
}
