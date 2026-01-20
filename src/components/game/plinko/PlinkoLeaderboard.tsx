"use client"

import * as React from "react"
import Image from "next/image"
import { cn } from "@/lib/utils"
import type { PlayerProfile } from "./types"
import { getAvatarUrl } from "../shared/PlayerSidebar"

export interface PlinkoLeaderboardProps {
  players: PlayerProfile[]
  bucketAssignments: string[]
  roundWinnerBuckets?: number[]
  className?: string
}

/**
 * PlinkoLeaderboard - Clean, tabular leaderboard showing player standings
 */
export function PlinkoLeaderboard({
  players,
  bucketAssignments,
  roundWinnerBuckets = [],
  className,
}: PlinkoLeaderboardProps) {
  // Sort players by wins (descending)
  const leaderboard = React.useMemo(() => {
    return [...players]
      .filter(p => p.archived !== true)
      .sort((a, b) => b.wins - a.wins)
  }, [players])

  // Create bucket lookup
  const bucketByPlayer = React.useMemo(() => {
    const map = new Map<string, number>()
    bucketAssignments.forEach((playerId, index) => {
      map.set(playerId, index)
    })
    return map
  }, [bucketAssignments])

  const topWins = leaderboard.length > 0 ? leaderboard[0].wins : 0
  const hasOverallWinner = topWins > 0

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Leaderboard</h2>
        {hasOverallWinner && (
          <span className="text-xs text-muted-foreground">
            Top: {topWins} wins
          </span>
        )}
      </div>

      {/* Round Winner Announcement */}
      {roundWinnerBuckets.length > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 bg-game-success/10 border border-game-success/30 rounded-lg">
          <svg className="w-4 h-4 text-game-success shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span className="text-sm font-medium text-game-success">
            Round Winner: {roundWinnerBuckets.map(b => {
              const playerId = bucketAssignments[b]
              const player = players.find(p => p.id === playerId)
              return player?.name || `Bucket ${b + 1}`
            }).join(", ")}
          </span>
        </div>
      )}

      {/* Leaderboard List */}
      <div className="space-y-1.5">
        {leaderboard.map((player, index) => {
          const bucket = bucketByPlayer.get(player.id)
          const isRoundWinner = bucket !== undefined && roundWinnerBuckets.includes(bucket)
          const isTopWinner = hasOverallWinner && player.wins === topWins
          
          return (
            <div
              key={player.id}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg transition-all",
                isRoundWinner && "bg-game-success/10 ring-1 ring-game-success/30",
                !isRoundWinner && isTopWinner && "bg-primary/5 ring-1 ring-primary/20",
                !isRoundWinner && !isTopWinner && "bg-card/50 hover:bg-card"
              )}
            >
              {/* Rank */}
              <span className={cn(
                "w-6 text-sm font-bold tabular-nums",
                index === 0 && hasOverallWinner ? "text-primary" : "text-muted-foreground"
              )}>
                #{index + 1}
              </span>

              {/* Avatar */}
              <Image
                src={getAvatarUrl(player)}
                alt={player.name}
                width={32}
                height={32}
                unoptimized
                className={cn(
                  "w-8 h-8 rounded-full object-cover ring-2",
                  isRoundWinner ? "ring-game-success" : 
                  isTopWinner ? "ring-primary/50" : "ring-border/30"
                )}
              />

              {/* Name and badges */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "text-sm font-medium truncate",
                    isRoundWinner ? "text-game-success" : ""
                  )}>
                    {player.name}
                  </span>
                  {isRoundWinner && (
                    <span className="shrink-0 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide bg-game-success/20 text-game-success rounded">
                      Round
                    </span>
                  )}
                </div>
              </div>

              {/* Wins count */}
              <div className="flex items-center gap-1">
                <span className={cn(
                  "text-lg font-bold tabular-nums",
                  isTopWinner && hasOverallWinner ? "text-primary" : "text-foreground"
                )}>
                  {player.wins}
                </span>
                {player.wins > 0 && (
                  <svg className="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                )}
              </div>
            </div>
          )
        })}

        {leaderboard.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No players yet
          </div>
        )}
      </div>
    </div>
  )
}
