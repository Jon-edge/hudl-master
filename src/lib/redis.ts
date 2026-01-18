import { Redis } from "@upstash/redis"

// Keys for storing data
export const REDIS_KEYS = {
  PLAYERS: "plinko:players",
  CONFIG: "plinko:config"
} as const

// Create Redis client only if environment variables are set
function createRedisClient(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN

  if (!url || !token) {
    console.warn(
      "Upstash Redis environment variables not set. Using localStorage fallback."
    )
    return null
  }

  return new Redis({
    url,
    token
  })
}

export const redis = createRedisClient()

// Helper to check if Redis is available
export function isRedisAvailable(): boolean {
  return redis !== null
}
