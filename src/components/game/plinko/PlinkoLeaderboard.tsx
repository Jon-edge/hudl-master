"use client"

import * as React from "react"
import { Trophy } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { PlayerProfile } from "../shared/types"

interface PlinkoLeaderboardProps {
  players: PlayerProfile[]
  roundWinnerIds: string[] | null
}

export function PlinkoLeaderboard({ players, roundWinnerIds }: PlinkoLeaderboardProps) {
  const sortedPlayers = React.useMemo(() => {
    return [...players]
      .filter(p => !p.archived)
      .sort((a, b) => b.wins - a.wins)
  }, [players])

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b p-4">
        <Trophy className="h-5 w-5 text-yellow-500" />
        <h2 className="font-semibold tracking-tight">Leaderboard</h2>
      </div>
      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-1 p-4">
          {sortedPlayers.map((player, index) => {
            const isRoundWinner = roundWinnerIds?.includes(player.id)
            const isTopWinner = index === 0 && player.wins > 0

            return (
              <div
                key={player.id}
                className={cn(
                  "flex items-center justify-between rounded-lg border p-3 transition-colors",
                  isRoundWinner
                    ? "bg-primary/10 border-primary/50"
                    : "bg-card hover:bg-muted/50"
                )}
              >
                <div className="flex items-center gap-3">
                  <span className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium",
                    isTopWinner ? "bg-yellow-500 text-white" : "bg-muted text-muted-foreground"
                  )}>
                    {index + 1}
                  </span>
                  <span className={cn("font-medium", isRoundWinner && "text-primary")}>
                    {player.name}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {isRoundWinner && (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                      Winner
                    </span>
                  )}
                  <span className="font-mono font-bold">{player.wins}</span>
                </div>
              </div>
            )
          })}
        </div>
      </ScrollArea>
    </div>
  )
}
