import type { PlayerProfile } from "./types"

interface PlinkoHUDProps {
  started: boolean
  roundWinnerBuckets: number[] | null
  bucketAssignments: string[]
  players: PlayerProfile[]
}

export function PlinkoHUD({
  started,
  roundWinnerBuckets,
  bucketAssignments,
  players
}: PlinkoHUDProps) {
  const winnerNames =
    roundWinnerBuckets?.map(bucket => {
      const playerId = bucketAssignments[bucket]
      const player = players.find(current => current.id === playerId)
      return player?.name ?? `Bucket ${bucket + 1}`
    }) ?? []

  return (
    <div className="pointer-events-none absolute left-4 top-4 flex flex-col gap-1 rounded-xl border border-white/60 bg-white/70 px-3 py-2 text-xs text-slate-600 shadow-sm">
      <span className="uppercase tracking-wide text-slate-400">Round status</span>
      <span className="font-semibold text-slate-800">
        {started ? "Running" : "Paused"}
      </span>
      {winnerNames.length > 0 && (
        <span className="text-slate-500">
          Winner: {winnerNames.join(", ")}
        </span>
      )}
    </div>
  )
}
