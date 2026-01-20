import Image from "next/image"
import type Matter from "matter-js"
import { useEffect, useMemo, useRef } from "react"
import type { PlayerProfile, PlinkoConfig } from "./types"
import { usePlinkoPhysics } from "./hooks/usePlinkoPhysics"
import { usePlinkoRender } from "./hooks/usePlinkoRender"
import { PlinkoHUD } from "./PlinkoHUD"

interface PlinkoGameProps {
  config: PlinkoConfig
  runKey: number
  started: boolean
  bucketAssignments: string[]
  visiblePlayers: PlayerProfile[]
  roundWinnerBuckets: number[] | null
  onRoundWinner: (buckets: number[]) => void
  onBucketHit: (bucket: number) => void
  onBallCollision: (speed: number) => void
  getAvatarUrl: (player: PlayerProfile) => string
  shake: boolean
}

export function PlinkoGame({
  config,
  runKey,
  started,
  bucketAssignments,
  visiblePlayers,
  roundWinnerBuckets,
  onRoundWinner,
  onBucketHit,
  onBallCollision,
  getAvatarUrl,
  shake
}: PlinkoGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const pinHitRef = useRef<(pin: Matter.Body) => void>(() => {})
  const bucketHitRef = useRef<(bucket: number, position: Matter.Vector) => void>(() => {})
  const { engineRef, bucketBoundsRef, pinsRef, ballsRef } = usePlinkoPhysics({
    config,
    runKey,
    running: started,
    onRoundWinner,
    onBucketHit: (bucket, position) => {
      bucketHitRef.current(bucket, position)
      onBucketHit(bucket)
    },
    onBallCollision,
    onPinHit: pin => pinHitRef.current(pin)
  })

  const { registerPinHit, registerBucketHit } = usePlinkoRender({
    canvasRef,
    engineRef,
    bucketBoundsRef,
    pinsRef,
    ballsRef,
    config,
    winnerBuckets: roundWinnerBuckets
  })

  useEffect(() => {
    pinHitRef.current = registerPinHit
    bucketHitRef.current = registerBucketHit
  }, [registerBucketHit, registerPinHit])

  const bucketPlayers = useMemo(
    () =>
      bucketAssignments
        .map((playerId, bucketIndex) => ({
          player: visiblePlayers.find(player => player.id === playerId),
          bucketIndex,
          playerId
        }))
        .filter(entry => entry.player != null),
    [bucketAssignments, visiblePlayers]
  )

  const boardClassName = `glass-panel relative rounded-3xl border border-white/70 p-4 shadow-xl ${
    shake ? "win-shake" : ""
  }`

  return (
    <div className="flex flex-col items-center gap-3">
      <div className={boardClassName}>
        <canvas ref={canvasRef} />
        <PlinkoHUD
          started={started}
          roundWinnerBuckets={roundWinnerBuckets}
          bucketAssignments={bucketAssignments}
          players={visiblePlayers}
        />
      </div>
      {bucketPlayers.length > 0 && (
        <div className="flex w-full max-w-full justify-between gap-2" style={{ width: config.width }}>
          {bucketPlayers.map(entry => {
            const player = entry.player as PlayerProfile
            const isWinner = roundWinnerBuckets?.includes(entry.bucketIndex) ?? false
            return (
              <div key={entry.playerId} className="flex flex-1 flex-col items-center">
                <Image
                  src={getAvatarUrl(player)}
                  alt={`${player.name} avatar`}
                  width={40}
                  height={40}
                  unoptimized
                  className={`h-10 w-10 rounded-full border-2 object-cover ${
                    isWinner
                      ? "border-emerald-500 ring-2 ring-emerald-300"
                      : "border-slate-200"
                  }`}
                />
                <span
                  className={`mt-1 max-w-full truncate text-xs ${
                    isWinner ? "font-semibold text-emerald-600" : "text-slate-600"
                  }`}
                >
                  {player.name}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
