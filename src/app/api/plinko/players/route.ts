import { NextResponse } from "next/server"
import { redis, REDIS_KEYS, isRedisAvailable } from "@/lib/redis"

export interface PlayerProfile {
  id: string
  name: string
  wins: number
  active: boolean
  avatarUrl?: string
  archived?: boolean
}

const normalizePlayers = (players: PlayerProfile[]): PlayerProfile[] =>
  players.map(player => ({
    ...player,
    archived: player.archived ?? false
  }))

export async function GET() {
  if (!isRedisAvailable() || redis == null) {
    return NextResponse.json(
      { error: "Redis not configured", fallback: true },
      { status: 503 }
    )
  }

  try {
    const players = await redis.get<PlayerProfile[]>(REDIS_KEYS.PLAYERS)
    if (players == null) return NextResponse.json({ players: null })
    return NextResponse.json({ players: normalizePlayers(players) })
  } catch (error) {
    console.error("Failed to fetch players from Redis:", error)
    return NextResponse.json(
      { error: "Failed to fetch players", fallback: true },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  if (!isRedisAvailable() || redis == null) {
    return NextResponse.json(
      { error: "Redis not configured", fallback: true },
      { status: 503 }
    )
  }

  try {
    const body = await request.json()
    const players = body.players as PlayerProfile[]

    if (!Array.isArray(players)) {
      return NextResponse.json(
        { error: "Invalid players data" },
        { status: 400 }
      )
    }

    await redis.set(REDIS_KEYS.PLAYERS, normalizePlayers(players))
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to save players to Redis:", error)
    return NextResponse.json(
      { error: "Failed to save players", fallback: true },
      { status: 500 }
    )
  }
}
