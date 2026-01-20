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

export const defaultConfig: PlinkoConfig = {
  ballCount: 10,
  ballRadius: 8,
  ballRestitution: 0.9,
  ballFriction: 0.005,
  ballShape: "ball",
  destroyBalls: false,
  dropLocation: "random",
  pinRadius: 3,
  pinRows: 10,
  pinColumns: 8,
  pinRestitution: 0.5,
  pinFriction: 0.1,
  pinShape: "ball",
  pinAngle: 0,
  pinWallGap: 20,
  pinRimGap: 60,
  ceilingGap: 50,
  wallThickness: 10,
  rimHeight: 100,
  rimWidth: 5,
  bucketCount: 6,
  bucketDistribution: "even",
  winCondition: "most",
  winNth: 3,
  width: 600,
  height: 450
}
