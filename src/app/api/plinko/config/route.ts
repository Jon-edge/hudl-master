import { NextResponse } from "next/server"
import { redis, REDIS_KEYS, isRedisAvailable } from "@/lib/redis"

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

export async function GET() {
  if (!isRedisAvailable() || !redis) {
    return NextResponse.json(
      { error: "Redis not configured", fallback: true },
      { status: 503 }
    )
  }

  try {
    const config = await redis.get<PlinkoConfig>(REDIS_KEYS.CONFIG)
    return NextResponse.json({ config: config ?? null })
  } catch (error) {
    console.error("Failed to fetch config from Redis:", error)
    return NextResponse.json(
      { error: "Failed to fetch config", fallback: true },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  if (!isRedisAvailable() || !redis) {
    return NextResponse.json(
      { error: "Redis not configured", fallback: true },
      { status: 503 }
    )
  }

  try {
    const body = await request.json()
    const config = body.config as PlinkoConfig

    if (!config || typeof config !== "object") {
      return NextResponse.json(
        { error: "Invalid config data" },
        { status: 400 }
      )
    }

    await redis.set(REDIS_KEYS.CONFIG, config)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to save config to Redis:", error)
    return NextResponse.json(
      { error: "Failed to save config", fallback: true },
      { status: 500 }
    )
  }
}
