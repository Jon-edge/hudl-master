"use client"

import * as React from "react"
import { useRef, useCallback, useEffect, useState } from "react"
import Image from "next/image"
import { cn } from "@/lib/utils"
import { usePlinkoPhysics } from "./hooks/usePlinkoPhysics"
import { usePlinkoRender } from "./hooks/usePlinkoRender"
import { useGameSounds } from "./hooks/useGameSounds"
import { createParticleEmitter, particlePresets, type ParticleEmitter } from "./utils/particles"
import type { PlinkoConfig, PlayerProfile } from "./types"
import { getAvatarUrl } from "../shared/PlayerSidebar"

export interface PlinkoGameProps {
  config: PlinkoConfig
  bucketAssignments: string[]
  players: PlayerProfile[]
  isRunning: boolean
  onGameEnd?: (winningBuckets: number[]) => void
  onBallSettle?: (bucketIndex: number) => void
  winningBuckets?: number[]
  className?: string
  soundEnabled?: boolean
}

/**
 * PlinkoGame - Canvas-based Plinko game board with custom rendering
 */
export function PlinkoGame({
  config,
  bucketAssignments,
  players,
  isRunning,
  onGameEnd,
  onBallSettle: onBallSettleProp,
  winningBuckets = [],
  className,
  soundEnabled = true,
}: PlinkoGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particleEmitterRef = useRef<ParticleEmitter>(createParticleEmitter())
  const [boardKey, setBoardKey] = useState(0)
  
  // Game state refs
  const droppedRef = useRef(0)
  const settledCountRef = useRef(0)
  const bucketCountsRef = useRef<number[]>([])
  const firstBallBucketRef = useRef<number | null>(null)
  const gameEndedRef = useRef(false)
  const zigRef = useRef({ x: config.width / 2, dir: 1 })
  const liveCountsPrevRef = useRef<number[]>([])

  // Sound effects
  const { playCollision, playBucket, playWin } = useGameSounds({
    enabled: soundEnabled,
  })

  // Store callbacks in refs to avoid stale closures
  const onGameEndRef = useRef(onGameEnd)
  const playWinRef = useRef(playWin)
  useEffect(() => {
    onGameEndRef.current = onGameEnd
    playWinRef.current = playWin
  }, [onGameEnd, playWin])

  // Track tiebreaker rounds
  const tiebreakerRoundRef = useRef(0)
  
  // Check win condition
  const checkWinCondition = useCallback(() => {
    if (gameEndedRef.current) return
    
    const counts = bucketCountsRef.current
    const totalSettled = settledCountRef.current
    const totalDropped = droppedRef.current
    const expectedBalls = config.ballCount
    
    // For "nth" condition, check during play (first bucket to reach N balls wins)
    // No tiebreaker needed - first to reach N wins
    if (config.winCondition === "nth") {
      for (let i = 0; i < counts.length; i++) {
        if (counts[i] >= config.winNth && (liveCountsPrevRef.current[i] || 0) < config.winNth) {
          gameEndedRef.current = true
          playWinRef.current()
          onGameEndRef.current?.([i])
          return
        }
      }
      liveCountsPrevRef.current = [...counts]
      return
    }
    
    // For other conditions, wait until all balls have been dropped AND settled
    // Skip if ballCount is 0 (unlimited mode)
    if (expectedBalls === 0) return
    if (totalDropped < expectedBalls) return
    if (totalSettled < expectedBalls) return
    
    let winnerBuckets: number[] = []
    
    switch (config.winCondition) {
      case "first":
        // "first" condition has no ties - single winner
        if (firstBallBucketRef.current !== null) {
          winnerBuckets = [firstBallBucketRef.current]
        }
        break
      case "last-empty": {
        const emptyBuckets = counts
          .map((count, idx) => count === 0 ? idx : -1)
          .filter(idx => idx >= 0)
        if (emptyBuckets.length > 0) {
          winnerBuckets = emptyBuckets
        } else {
          const minCount = Math.min(...counts.filter(c => c > 0))
          winnerBuckets = counts
            .map((count, idx) => count === minCount ? idx : -1)
            .filter(idx => idx >= 0)
        }
        break
      }
      case "most":
      default: {
        const maxCount = Math.max(...counts)
        if (maxCount > 0) {
          winnerBuckets = counts
            .map((count, idx) => count === maxCount ? idx : -1)
            .filter(idx => idx >= 0)
        }
        break
      }
    }
    
    // Check for ties - if multiple winners, start tiebreaker round
    if (winnerBuckets.length > 1) {
      // Tiebreaker: reset drop counters but KEEP bucket counts (they accumulate)
      // This allows another round of balls to be dropped
      tiebreakerRoundRef.current += 1
      droppedRef.current = 0
      settledCountRef.current = 0
      console.log(`Tiebreaker round ${tiebreakerRoundRef.current} - tied buckets:`, winnerBuckets)
      // Game continues - don't end, don't assign wins
      return
    }
    
    // Single winner - game ends
    if (winnerBuckets.length === 1) {
      gameEndedRef.current = true
      playWinRef.current()
      onGameEndRef.current?.(winnerBuckets)
    }
  }, [config.ballCount, config.winCondition, config.winNth])

  // Store checkWinCondition in ref for use in callbacks
  const checkWinConditionRef = useRef(checkWinCondition)
  useEffect(() => {
    checkWinConditionRef.current = checkWinCondition
  }, [checkWinCondition])

  // Physics collision handler
  const handleCollision = useCallback((velocity: number, position: { x: number; y: number }) => {
    playCollision(velocity)
    // Add small particle burst on collision for significant impacts
    if (velocity > 3) {
      particleEmitterRef.current.addBurst(position.x, position.y, 3, {
        ...particlePresets.collision,
        minSpeed: velocity * 0.3,
        maxSpeed: velocity * 0.6,
      })
    }
  }, [playCollision])

  // Physics ball settle handler
  const handleBallSettle = useCallback((bucketIndex: number) => {
    // Increment counters
    bucketCountsRef.current[bucketIndex] = (bucketCountsRef.current[bucketIndex] || 0) + 1
    settledCountRef.current += 1
    
    // Track first ball for "first" win condition
    if (firstBallBucketRef.current === null) {
      firstBallBucketRef.current = bucketIndex
    }
    
    // Play bucket sound
    playBucket()
    
    // Add particle effect at bucket
    const bounds = bucketBoundsRef.current
    if (bounds && bounds.length > bucketIndex + 1) {
      const bucketX = (bounds[bucketIndex] + bounds[bucketIndex + 1]) / 2
      particleEmitterRef.current.addBurst(bucketX, config.height - 30, 8, particlePresets.bucket)
    }
    
    // Notify parent
    onBallSettleProp?.(bucketIndex)
    
    // Check win conditions
    checkWinConditionRef.current()
  }, [playBucket, onBallSettleProp, config.height])

  // Initialize physics
  const {
    engineRef,
    ballsRef,
    pinsRef,
    bucketBoundsRef,
    initializeBoard,
    dropBall,
    startRunner,
    cleanup,
  } = usePlinkoPhysics({
    config,
    onBallSettle: handleBallSettle,
    onCollision: handleCollision,
  })


  // Custom renderer
  const { startRender, stopRender } = usePlinkoRender({
    canvasRef,
    engineRef,
    ballsRef,
    pinsRef,
    bucketBoundsRef,
    config,
    winningBuckets,
    isDark: false,
  })

  // Ball dropping interval
  useEffect(() => {
    if (!isRunning) return
    
    const interval = setInterval(() => {
      // Skip dropping if game has ended
      if (gameEndedRef.current) return
      
      // Skip dropping if we've reached the ball count for this round (0 = unlimited)
      // Don't clear interval - tiebreaker may reset droppedRef to continue
      if (config.ballCount > 0 && droppedRef.current >= config.ballCount) {
        return
      }
      
      let x = config.width / 2
      if (config.dropLocation === "random") {
        x = config.ballRadius + Math.random() * (config.width - config.ballRadius * 2)
      } else if (config.dropLocation === "zigzag") {
        x = zigRef.current.x
        zigRef.current.x += (config.width / config.pinColumns) * zigRef.current.dir
        if (zigRef.current.x < config.ballRadius || zigRef.current.x > config.width - config.ballRadius) {
          zigRef.current.dir *= -1
          zigRef.current.x = Math.max(config.ballRadius, Math.min(config.width - config.ballRadius, zigRef.current.x))
        }
      }
      
      dropBall(x)
      droppedRef.current++
    }, 500)
    
    return () => clearInterval(interval)
  }, [isRunning, config.ballCount, config.width, config.dropLocation, config.ballRadius, config.pinColumns, dropBall])

  // Initialize board and start rendering
  useEffect(() => {
    // Reset all game state FIRST
    droppedRef.current = 0
    settledCountRef.current = 0
    bucketCountsRef.current = new Array(config.bucketCount).fill(0)
    firstBallBucketRef.current = null
    gameEndedRef.current = false
    tiebreakerRoundRef.current = 0
    liveCountsPrevRef.current = new Array(config.bucketCount).fill(0)
    zigRef.current = { x: config.width / 2, dir: 1 }
    particleEmitterRef.current.clear()
    
    // THEN initialize the board and start
    initializeBoard()
    startRender()
    startRunner()
    
    return () => {
      stopRender()
      cleanup()
    }
  }, [boardKey, config.bucketCount, config.width, initializeBoard, startRender, startRunner, stopRender, cleanup])

  // Particle render loop (draws on top of main render)
  useEffect(() => {
    let animFrame: number
    
    const updateParticles = () => {
      particleEmitterRef.current.update()
      
      const canvas = canvasRef.current
      if (canvas) {
        const ctx = canvas.getContext("2d")
        if (ctx) {
          particleEmitterRef.current.draw(ctx)
        }
      }
      
      animFrame = requestAnimationFrame(updateParticles)
    }
    
    animFrame = requestAnimationFrame(updateParticles)
    return () => cancelAnimationFrame(animFrame)
  }, [])

  // Reset board when config changes significantly
  useEffect(() => {
    setBoardKey(k => k + 1)
  }, [
    config.pinRows,
    config.pinColumns,
    config.bucketCount,
    config.width,
    config.height,
    config.pinRadius,
    config.rimHeight,
  ])


  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {/* Game Canvas */}
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={config.width}
          height={config.height}
          className="rounded-xl shadow-inner"
          style={{ 
            width: config.width, 
            height: config.height,
            background: "linear-gradient(180deg, var(--game-surface) 0%, var(--muted) 100%)"
          }}
        />
      </div>

      {/* Player avatars under buckets */}
      {bucketAssignments.length > 0 && (
        <div className="flex" style={{ width: config.width }}>
          {bucketAssignments.map((playerId, bucketIndex) => {
            const player = players.find(p => p.id === playerId)
            if (!player) return null
            
            const isWinner = winningBuckets.includes(bucketIndex)
            
            return (
              <div
                key={playerId}
                className={cn(
                  "flex flex-col items-center justify-center flex-1 py-2 rounded-lg transition-all duration-300",
                  isWinner && "bg-game-success/20 glow-success"
                )}
              >
                <div className="relative">
                  <Image
                    src={getAvatarUrl(player)}
                    alt={player.name}
                    width={44}
                    height={44}
                    unoptimized
                    className={cn(
                      "w-11 h-11 rounded-full object-cover ring-2 transition-all",
                      isWinner 
                        ? "ring-game-success scale-110" 
                        : "ring-border/50"
                    )}
                  />
                  {isWinner && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-game-success rounded-full flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </div>
                <span className={cn(
                  "text-xs mt-1 truncate max-w-full font-medium transition-colors",
                  isWinner ? "text-game-success text-glow-success" : "text-muted-foreground"
                )}>
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
