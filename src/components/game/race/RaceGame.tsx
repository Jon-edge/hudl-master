"use client"

import * as React from "react"
import { useState, useCallback, useEffect, useRef, useMemo } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import type { PlayerProfile } from "../plinko/types"
import { useGameSounds } from "../plinko/hooks/useGameSounds"
import {
  type RaceConfig,
  defaultRaceConfig,
  RACER_THEMES,
  LANE_COLORS,
} from "./types"

export interface RaceGameProps {
  players: PlayerProfile[]
  config?: Partial<RaceConfig>
  onGameEnd?: (winner: PlayerProfile) => void
  soundEnabled?: boolean
  className?: string
}

const TRACK_STYLES: Record<string, { background: string; borderColor: string }> = {
  horses: { background: "linear-gradient(180deg, #2d5a1d 0%, #1a3d0f 100%)", borderColor: "#8B4513" },
  boats: { background: "linear-gradient(180deg, #0077be 0%, #003d5c 100%)", borderColor: "#1e3a5f" },
  cars: { background: "linear-gradient(180deg, #2c2c2c 0%, #0d0d0d 100%)", borderColor: "#ff4444" },
  rockets: { background: "linear-gradient(180deg, #0a0a2e 0%, #0d0d1a 100%)", borderColor: "#6366f1" },
  snails: { background: "linear-gradient(180deg, #5d4e37 0%, #2a231a 100%)", borderColor: "#8bc34a" },
  dogs: { background: "linear-gradient(180deg, #4a7c59 0%, #2d5038 100%)", borderColor: "#d4a574" },
}

const RACER_EMOJIS: Record<string, string[]> = {
  horses: ["🏇", "🐎", "🐴", "🦄", "🦓", "🐪", "🦌", "🫏", "🐂", "🦬", "🐏", "🦙"],
  boats: ["🚤", "⛵", "🛥️", "🚢", "🛶", "⛴️", "🚣", "🛳️", "🚀", "🛸", "🚁", "✈️"],
  cars: ["🏎️", "🚗", "🚙", "🏍️", "🚕", "🚓", "🚑", "🚒", "🛻", "🚜", "🚐", "🚎"],
  rockets: ["🚀", "🛸", "🛰️", "✈️", "🚁", "🛩️", "🪐", "☄️", "💫", "⭐", "🌟", "✨"],
  snails: ["🐌", "🐢", "🦥", "🐛", "🐜", "🦗", "🐞", "🦋", "🐝", "🪲", "🦎", "🐸"],
  dogs: ["🐕", "🐩", "🦮", "🐕‍🦺", "🐶", "🦊", "🐺", "🦝", "🐈", "🐇", "🐿️", "🦔"],
}

export function RaceGame({
  players,
  config: configOverrides,
  onGameEnd,
  soundEnabled = true,
  className,
}: RaceGameProps) {
  const config = useMemo(() => ({ ...defaultRaceConfig, ...configOverrides }), [configOverrides])

  const [isRacing, setIsRacing] = useState(false)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [winner, setWinner] = useState<PlayerProfile | null>(null)
  const [showCelebration, setShowCelebration] = useState(false)
  const [finishOrder, setFinishOrder] = useState<PlayerProfile[]>([])

  // Refs for direct DOM manipulation - no React during animation
  const racerRefs = useRef<(HTMLDivElement | null)[]>([])
  const animationRef = useRef<number | null>(null)
  const raceDataRef = useRef<{ positions: number[]; finished: boolean[]; speeds: number[] }>({
    positions: [],
    finished: [],
    speeds: [],
  })

  const { playWin, playBucket, playCollision } = useGameSounds({ enabled: soundEnabled })

  const activePlayers = useMemo(() => players.filter(p => p.active && !p.archived), [players])
  const themeInfo = RACER_THEMES[config.racerTheme]
  const trackStyle = TRACK_STYLES[config.racerTheme]
  const racerEmojis = RACER_EMOJIS[config.racerTheme]
  const finishLine = config.trackLength - 100

  // Reset refs when player count changes
  useEffect(() => {
    racerRefs.current = activePlayers.map(() => null)
  }, [activePlayers.length])

  const startRace = useCallback(() => {
    if (activePlayers.length < 2 || isRacing) return

    setWinner(null)
    setShowCelebration(false)
    setFinishOrder([])

    // Reset positions via DOM
    racerRefs.current.forEach(el => {
      if (el) el.style.transform = "translateX(0px)"
    })

    // Init race data
    raceDataRef.current = {
      positions: activePlayers.map(() => 0),
      finished: activePlayers.map(() => false),
      speeds: activePlayers.map(() => config.baseSpeed),
    }

    // Countdown
    setCountdown(3)
    playCollision(8)

    setTimeout(() => { setCountdown(2); playCollision(8) }, 1000)
    setTimeout(() => { setCountdown(1); playCollision(8) }, 2000)
    setTimeout(() => {
      setCountdown(null)
      playBucket()
      setIsRacing(true)
    }, 3000)
  }, [activePlayers, isRacing, config.baseSpeed, playCollision, playBucket])

  // Animation loop - pure DOM manipulation, no React
  useEffect(() => {
    if (!isRacing) return

    let lastTime = performance.now()
    const order: PlayerProfile[] = []

    const loop = (now: number) => {
      const dt = Math.min((now - lastTime) / 16.67, 2.5)
      lastTime = now

      const data = raceDataRef.current
      let allDone = true

      for (let i = 0; i < activePlayers.length; i++) {
        if (data.finished[i]) continue
        allDone = false

        // Calculate speed with variation
        let speed = config.baseSpeed + (Math.random() - 0.5) * config.speedVariation * 2

        // Boost
        if (Math.random() < config.boostChance * 0.3) {
          speed *= config.boostMultiplier
        }
        // Slowdown
        if (Math.random() < config.slowdownChance * 0.3) {
          speed *= config.slowdownMultiplier
        }

        // Dramatic finish
        if (config.dramaticFinish && data.positions[i] > finishLine * 0.7) {
          speed *= 0.6
        }

        data.positions[i] += speed * config.animationSpeed * dt

        // Update DOM directly
        const el = racerRefs.current[i]
        if (el) {
          el.style.transform = `translateX(${data.positions[i]}px)`
        }

        // Check finish
        if (data.positions[i] >= finishLine) {
          data.finished[i] = true
          order.push(activePlayers[i])

          if (order.length === 1) {
            playWin(activePlayers[i].name)
          }
        }
      }

      if (allDone) {
        setIsRacing(false)
        setWinner(order[0] || null)
        setFinishOrder(order)
        setShowCelebration(true)
        if (order[0] && onGameEnd) onGameEnd(order[0])
        return
      }

      animationRef.current = requestAnimationFrame(loop)
    }

    animationRef.current = requestAnimationFrame(loop)
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
    }
  }, [isRacing, activePlayers, config, finishLine, onGameEnd, playWin])

  const canStart = !isRacing && countdown === null && activePlayers.length >= 2

  return (
    <div className={cn("flex flex-col items-center gap-4", className)}>
      {/* Theme badge */}
      <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-muted/50 border border-border/50">
        <span className="text-2xl">{themeInfo.emoji}</span>
        <span className="font-semibold">{themeInfo.name}</span>
      </div>

      {/* Track */}
      <div
        className="relative rounded-xl overflow-hidden border-4 shadow-2xl"
        style={{
          width: config.trackLength,
          background: trackStyle.background,
          borderColor: trackStyle.borderColor,
        }}
      >
        {/* Start line */}
        <div className="absolute top-0 bottom-0 left-12 w-1 bg-white/70" />

        {/* Finish line */}
        <div
          className="absolute top-0 bottom-0 w-4"
          style={{
            left: finishLine + 48,
            background: "repeating-linear-gradient(0deg, #000 0px, #000 8px, #fff 8px, #fff 16px)",
          }}
        />

        {/* Lanes */}
        {activePlayers.map((player, i) => {
          const color = LANE_COLORS[i % LANE_COLORS.length]
          const emoji = racerEmojis[i % racerEmojis.length]
          const isWinner = winner?.id === player.id
          const place = finishOrder.findIndex(p => p.id === player.id) + 1

          return (
            <div
              key={player.id}
              className="relative flex items-center"
              style={{
                height: config.laneHeight,
                borderBottom: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              {/* Lane # */}
              <div
                className="absolute left-1 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white z-10"
                style={{ background: color }}
              >
                {i + 1}
              </div>

              {/* Racer - positioned via ref, not state */}
              <div
                ref={el => { racerRefs.current[i] = el }}
                className="absolute flex items-center"
                style={{ left: 48, top: "50%", transform: "translateY(-50%)" }}
              >
                <div
                  className={cn(
                    "w-11 h-11 rounded-full flex items-center justify-center text-2xl border-2",
                    isWinner && "ring-2 ring-yellow-400"
                  )}
                  style={{
                    background: `${color}40`,
                    borderColor: color,
                  }}
                >
                  {emoji}
                </div>
                {config.showPlayerNames && (
                  <span
                    className="ml-2 text-[11px] font-semibold px-1.5 py-0.5 rounded text-white whitespace-nowrap"
                    style={{ background: color }}
                  >
                    {player.name}
                  </span>
                )}
                {place > 0 && place <= 3 && (
                  <span className="ml-1 text-lg">
                    {place === 1 ? "🥇" : place === 2 ? "🥈" : "🥉"}
                  </span>
                )}
              </div>
            </div>
          )
        })}

        {/* Countdown */}
        {countdown !== null && (
          <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-20">
            <span
              className="text-8xl font-black"
              style={{
                color: countdown === 1 ? "#4ade80" : "#facc15",
                textShadow: `0 0 30px currentColor`,
              }}
            >
              {countdown}
            </span>
          </div>
        )}
      </div>

      {/* Button */}
      <Button
        onClick={startRace}
        disabled={!canStart}
        size="lg"
        className="min-w-40 font-bold bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
      >
        {countdown ? "Ready..." : isRacing ? "Racing!" : "🏁 START RACE"}
      </Button>

      {activePlayers.length < 2 && (
        <span className="text-sm text-muted-foreground">Need at least 2 players</span>
      )}

      {/* Celebration */}
      {showCelebration && winner && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center"
          onClick={() => setShowCelebration(false)}
        >
          <div
            className="bg-gradient-to-br from-purple-900 to-slate-900 rounded-2xl p-8 text-center border-4 border-yellow-500 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="text-5xl mb-3">🏆 {themeInfo.emoji}</div>
            <h2 className="text-3xl font-black text-yellow-400 mb-1">{winner.name}</h2>
            <p className="text-green-400 font-bold tracking-wide">WINS THE RACE!</p>

            {finishOrder.length > 1 && (
              <div className="flex justify-center gap-6 mt-4 text-sm">
                {finishOrder.slice(0, 3).map((p, i) => (
                  <div key={p.id} className="flex flex-col items-center">
                    <span className="text-xl">{["🥇", "🥈", "🥉"][i]}</span>
                    <span className="text-gray-300">{p.name}</span>
                  </div>
                ))}
              </div>
            )}

            <p className="text-xs text-gray-500 mt-4">Click to close</p>
          </div>
        </div>
      )}
    </div>
  )
}
