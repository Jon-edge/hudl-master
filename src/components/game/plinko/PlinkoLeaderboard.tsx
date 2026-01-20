import type { PlayerProfile } from "./types"

interface PlinkoLeaderboardProps {
  leaderboard: PlayerProfile[]
  roundWinnerBuckets: number[] | null
  bucketByPlayer: Map<string, number>
  topWins: number
  winnerCount: number
}

export function PlinkoLeaderboard({
  leaderboard,
  roundWinnerBuckets,
  bucketByPlayer,
  topWins,
  winnerCount
}: PlinkoLeaderboardProps) {
  return (
    <section className="glass-panel flex h-full flex-col gap-3 rounded-2xl p-4">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">
          Leaderboard
        </h2>
        {roundWinnerBuckets != null && roundWinnerBuckets.length > 0 && (
          <p className="text-xs text-slate-500">
            Round winner: bucket {roundWinnerBuckets.map(bucket => bucket + 1).join(", ")}
          </p>
        )}
        {topWins > 0 && (
          <p className="text-xs text-slate-500">
            {winnerCount > 1 ? "Co-leaders" : "Leader"}: {topWins} wins
          </p>
        )}
      </div>
      <div className="space-y-2">
        {leaderboard.map((player, index) => {
          const bucketIndex = bucketByPlayer.get(player.id)
          const isRoundWinner = roundWinnerBuckets?.includes(bucketIndex ?? -1) ?? false
          return (
            <div
              key={player.id}
              className="flex items-center justify-between rounded-xl border border-white/60 bg-white/70 px-3 py-2 text-sm shadow-sm"
            >
              <div className="flex items-center gap-2">
                <span className="w-5 text-slate-400">#{index + 1}</span>
                <span className="font-medium text-slate-800">{player.name}</span>
                {isRoundWinner && (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] uppercase tracking-wide text-emerald-700">
                    Round winner
                  </span>
                )}
              </div>
              <span className="font-semibold text-slate-900">{player.wins}</span>
            </div>
          )
        })}
      </div>
    </section>
  )
}
