"use client"

import * as React from "react"
import { useState, useCallback, useEffect, useRef, useMemo } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import type { PlayerProfile } from "../plinko/types"
import type { RouletteConfig, RouletteSlot } from "./types"
import { defaultRouletteConfig, getWheelSlots, RED_NUMBERS } from "./types"
import { RouletteWheel } from "./RouletteWheel"
import { useRoulettePhysics, type BallState } from "./hooks"

export interface RouletteGameProps {
  players: PlayerProfile[]
  config?: Partial<RouletteConfig>
  onGameEnd?: (winner: PlayerProfile) => void
  soundEnabled?: boolean
  className?: string
}

// Assign players to different bet types
interface PlayerBet {
  player: PlayerProfile
  betType: "red" | "black" | "green" | "odd" | "even" | "number" | "slot"
  numbers: number[] // Which numbers they win on
}

function assignPlayerBets(
  players: PlayerProfile[],
  wheelStyle: "european" | "american" | "players"
): PlayerBet[] {
  const activePlayers = players.filter(p => p.active && !p.archived)
  if (activePlayers.length === 0) return []

  // In "players" mode, each player gets their own slot (1-indexed)
  if (wheelStyle === "players") {
    return activePlayers.map((player, index) => ({
      player,
      betType: "slot" as const,
      numbers: [index + 1], // Slot numbers are 1-indexed
    }))
  }

  // Traditional mode: distribute players across bet types
  const betTypes: Array<"red" | "black" | "odd" | "even"> = ["red", "black", "odd", "even"]

  return activePlayers.map((player, index) => {
    const betType = betTypes[index % betTypes.length]
    let numbers: number[] = []

    if (betType === "red") {
      numbers = RED_NUMBERS
    } else if (betType === "black") {
      numbers = Array.from({ length: 36 }, (_, i) => i + 1).filter(n => !RED_NUMBERS.includes(n))
    } else if (betType === "odd") {
      numbers = Array.from({ length: 18 }, (_, i) => i * 2 + 1)
    } else if (betType === "even") {
      numbers = Array.from({ length: 18 }, (_, i) => (i + 1) * 2)
    }

    return { player, betType, numbers }
  })
}

export function RouletteGame({
  players,
  config: configOverrides,
  onGameEnd,
  soundEnabled = true,
  className,
}: RouletteGameProps) {
  const config: RouletteConfig = { ...defaultRouletteConfig, ...configOverrides }
  
  const [isSpinning, setIsSpinning] = useState(false)
  const [winningSlot, setWinningSlot] = useState<RouletteSlot | null>(null)
  const [winner, setWinner] = useState<PlayerProfile | null>(null)
  const [showCelebration, setShowCelebration] = useState(false)
  const [ballState, setBallState] = useState<BallState | null>(null)
  const [wheelAngle, setWheelAngle] = useState(0)
  const [history, setHistory] = useState<RouletteSlot[]>([])
  
  const audioContextRef = useRef<AudioContext | null>(null)
  
  // Get player bets
  const playerBets = useMemo(
    () => assignPlayerBets(players, config.wheelStyle),
    [players, config.wheelStyle]
  )
  const activePlayers = players.filter(p => p.active && !p.archived)
  
  // Initialize audio context on user interaction
  const initAudio = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext()
    }
    if (audioContextRef.current.state === "suspended") {
      audioContextRef.current.resume()
    }
  }, [])
  
  // Play bounce sound
  const playBounceSound = useCallback((velocity: number) => {
    if (!soundEnabled || !audioContextRef.current) return
    
    const ctx = audioContextRef.current
    if (ctx.state === "suspended") return
    
    const intensity = Math.min(velocity / 50, 1)
    const oscillator = ctx.createOscillator()
    const gainNode = ctx.createGain()
    
    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)
    
    // Higher pitch for harder bounces
    oscillator.frequency.value = 200 + intensity * 300
    oscillator.type = "sine"
    
    gainNode.gain.setValueAtTime(0.05 * intensity, ctx.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08)
    
    oscillator.start(ctx.currentTime)
    oscillator.stop(ctx.currentTime + 0.08)
  }, [soundEnabled])
  
  // Play win sound
  const playWinSound = useCallback(() => {
    if (!soundEnabled || !audioContextRef.current) return
    
    const ctx = audioContextRef.current
    if (ctx.state === "suspended") return
    
    // Casino fanfare
    const notes = [523.25, 659.25, 783.99, 1046.5] // C5, E5, G5, C6
    
    notes.forEach((freq, i) => {
      const oscillator = ctx.createOscillator()
      const gainNode = ctx.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(ctx.destination)
      
      oscillator.frequency.value = freq
      oscillator.type = "sine"
      
      const startTime = ctx.currentTime + i * 0.12
      gainNode.gain.setValueAtTime(0, startTime)
      gainNode.gain.linearRampToValueAtTime(0.15, startTime + 0.05)
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.6)
      
      oscillator.start(startTime)
      oscillator.stop(startTime + 0.6)
    })
  }, [soundEnabled])
  
  // Play spinning click sound
  const playClickSound = useCallback(() => {
    if (!soundEnabled || !audioContextRef.current) return
    
    const ctx = audioContextRef.current
    if (ctx.state === "suspended") return
    
    const oscillator = ctx.createOscillator()
    const gainNode = ctx.createGain()
    
    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)
    
    oscillator.frequency.value = 1000 + Math.random() * 200
    oscillator.type = "square"
    
    gainNode.gain.setValueAtTime(0.03, ctx.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.02)
    
    oscillator.start(ctx.currentTime)
    oscillator.stop(ctx.currentTime + 0.02)
  }, [soundEnabled])
  
  // Click sound interval when spinning
  const clickIntervalRef = useRef<NodeJS.Timeout | null>(null)
  
  useEffect(() => {
    if (isSpinning && soundEnabled) {
      let delay = 50
      const tick = () => {
        playClickSound()
        delay = Math.min(delay * 1.01, 200)
        if (isSpinning) {
          clickIntervalRef.current = setTimeout(tick, delay)
        }
      }
      tick()
      
      return () => {
        if (clickIntervalRef.current) {
          clearTimeout(clickIntervalRef.current)
        }
      }
    }
  }, [isSpinning, soundEnabled, playClickSound])
  
  // Handle ball settle
  const handleBallSettle = useCallback((slot: RouletteSlot) => {
    setIsSpinning(false)
    setWinningSlot(slot)
    
    // Add to history
    setHistory(prev => [slot, ...prev.slice(0, 9)])
    
    // Find winning player
    const winningNumber = slot.number
    const winningBet = playerBets.find(bet => bet.numbers.includes(winningNumber))
    
    if (winningBet) {
      setWinner(winningBet.player)
      setShowCelebration(true)
      playWinSound()
      
      if (onGameEnd) {
        onGameEnd(winningBet.player)
      }
    }
  }, [playerBets, onGameEnd, playWinSound])
  
  // Physics hook
  const {
    ballRef,
    wheelAngleRef,
    spin,
    reset,
  } = useRoulettePhysics({
    config,
    playerCount: activePlayers.length,
    onBallBounce: playBounceSound,
    onBallSettle: handleBallSettle,
    onTick: (ball, angle) => {
      setBallState({ ...ball })
      setWheelAngle(angle)
    },
  })
  
  // Start spin
  const handleSpin = useCallback(() => {
    if (activePlayers.length < 2) return
    
    initAudio()
    setWinner(null)
    setWinningSlot(null)
    setShowCelebration(false)
    setIsSpinning(true)
    spin()
  }, [activePlayers.length, initAudio, spin])
  
  // Close celebration
  const handleCloseCelebration = useCallback(() => {
    setShowCelebration(false)
  }, [])
  
  return (
    <div className={cn("flex flex-col items-center gap-6", className)}>
      {/* Betting display */}
      <div className="flex flex-wrap justify-center gap-2 max-w-lg">
        {playerBets.map((bet, idx) => (
          <div
            key={bet.player.id}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border",
              "transition-all duration-300",
              bet.betType === "red" && "bg-red-900/50 border-red-500/50 text-red-200",
              bet.betType === "black" && "bg-gray-900/50 border-gray-500/50 text-gray-200",
              bet.betType === "odd" && "bg-purple-900/50 border-purple-500/50 text-purple-200",
              bet.betType === "even" && "bg-blue-900/50 border-blue-500/50 text-blue-200",
              bet.betType === "slot" && idx % 2 === 0 && "bg-red-900/50 border-red-500/50 text-red-200",
              bet.betType === "slot" && idx % 2 === 1 && "bg-gray-900/50 border-gray-500/50 text-gray-200",
              winner?.id === bet.player.id && "ring-2 ring-yellow-400 animate-pulse"
            )}
          >
            {bet.player.avatarUrl && (
              <img 
                src={bet.player.avatarUrl} 
                alt={bet.player.name}
                className="w-5 h-5 rounded-full object-cover"
              />
            )}
            <span>{bet.player.name}</span>
            <span className="opacity-60 text-xs uppercase">
              {bet.betType === "slot" ? `#${bet.numbers[0]}` : bet.betType}
            </span>
          </div>
        ))}
      </div>
      
      {/* Wheel */}
      <div className="relative">
        <RouletteWheel
          config={config}
          wheelAngle={wheelAngle}
          ball={ballState}
          isSpinning={isSpinning}
          winningSlot={winningSlot}
          playerCount={activePlayers.length}
        />
      </div>
      
      {/* History */}
      {history.length > 0 && (
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground mr-2">History:</span>
          {history.map((slot, i) => (
            <div
              key={i}
              className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                "border border-opacity-50 transition-all",
                slot.color === "red" && "bg-red-700 border-red-400 text-white",
                slot.color === "black" && "bg-gray-900 border-gray-500 text-white",
                slot.color === "green" && "bg-green-700 border-green-400 text-white",
                i === 0 && "ring-2 ring-yellow-400"
              )}
              style={{
                opacity: 1 - i * 0.08,
                transform: `scale(${1 - i * 0.03})`,
              }}
            >
              {slot.displayText}
            </div>
          ))}
        </div>
      )}
      
      {/* Controls */}
      <div className="flex items-center justify-center gap-3 p-3 rounded-xl glass-panel">
        <Button
          onClick={handleSpin}
          disabled={isSpinning || activePlayers.length < 2}
          size="lg"
          className={cn(
            "min-w-44 gap-2 font-bold text-lg transition-all relative overflow-hidden",
            isSpinning 
              ? "bg-amber-700 hover:bg-amber-800" 
              : "bg-gradient-to-r from-green-600 via-emerald-500 to-green-600 hover:from-green-700 hover:via-emerald-600 hover:to-green-700 text-white"
          )}
        >
          {isSpinning ? (
            <>
              <svg className="w-6 h-6 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              NO MORE BETS
            </>
          ) : (
            <>
              <span className="text-2xl">🎲</span>
              SPIN ROULETTE
            </>
          )}
          
          {/* Shimmer effect */}
          {!isSpinning && (
            <div 
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
              style={{
                animation: "shimmer 2s infinite",
                transform: "translateX(-100%)",
              }}
            />
          )}
        </Button>
        
        {activePlayers.length < 2 && (
          <span className="text-sm text-muted-foreground">
            Need at least 2 players
          </span>
        )}
      </div>
      
      {/* Last Winner Badge */}
      {winner && !showCelebration && (
        <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-gradient-to-r from-green-500/20 via-emerald-400/20 to-green-500/20 border border-green-400/30">
          {winner.avatarUrl && (
            <img 
              src={winner.avatarUrl} 
              alt={winner.name}
              className="w-8 h-8 rounded-full object-cover border-2 border-green-400"
            />
          )}
          <span className="font-semibold text-green-300">
            {winner.name} won on {winningSlot?.displayText}!
          </span>
        </div>
      )}
      
      {/* Win Celebration Modal */}
      {showCelebration && winner && winningSlot && (
        <WinCelebration 
          winner={winner}
          slot={winningSlot}
          onClose={handleCloseCelebration}
        />
      )}
      
      {/* Shimmer animation style */}
      <style jsx>{`
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
      `}</style>
    </div>
  )
}

// Win celebration component
function WinCelebration({ 
  winner, 
  slot,
  onClose 
}: { 
  winner: PlayerProfile
  slot: RouletteSlot
  onClose: () => void 
}) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4500)
    return () => clearTimeout(timer)
  }, [onClose])
  
  // Generate casino chip confetti
  const chips = Array.from({ length: 40 }).map((_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 0.5,
    duration: 2 + Math.random() * 2,
    color: ["#e53935", "#1e88e5", "#43a047", "#ffb300", "#8e24aa"][Math.floor(Math.random() * 5)],
    size: 15 + Math.random() * 15,
    rotation: Math.random() * 360,
  }))
  
  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Confetti */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {chips.map(chip => (
          <div
            key={chip.id}
            className="absolute animate-confetti-fall"
            style={{
              left: `${chip.left}%`,
              top: "-30px",
              width: chip.size,
              height: chip.size,
              backgroundColor: chip.color,
              borderRadius: "50%",
              transform: `rotate(${chip.rotation}deg)`,
              animationDelay: `${chip.delay}s`,
              animationDuration: `${chip.duration}s`,
              boxShadow: `inset -2px -2px 4px rgba(0,0,0,0.3), inset 2px 2px 4px rgba(255,255,255,0.2)`,
              border: "2px dashed rgba(255,255,255,0.3)",
            }}
          />
        ))}
      </div>
      
      {/* Winner Card */}
      <div 
        className="relative glass-panel-elevated rounded-3xl p-8 text-center animate-winner-pop max-w-md mx-4"
        onClick={e => e.stopPropagation()}
      >
        {/* Casino lights effect */}
        <div className="absolute inset-0 rounded-3xl overflow-hidden">
          <div 
            className="absolute inset-0 bg-gradient-to-br from-green-500/30 via-transparent to-green-500/30"
            style={{ animation: "pulse 1.5s ease-in-out infinite" }}
          />
          <div 
            className="absolute -inset-4 bg-gradient-conic from-yellow-400/20 via-transparent to-yellow-400/20"
            style={{ animation: "spin 4s linear infinite" }}
          />
        </div>
        
        {/* Content */}
        <div className="relative z-10">
          <div className="text-6xl mb-4">🎰</div>
          
          {/* Winning number */}
          <div className={cn(
            "w-20 h-20 mx-auto rounded-full flex items-center justify-center",
            "text-3xl font-bold mb-4 border-4",
            slot.color === "red" && "bg-red-700 border-red-400 text-white",
            slot.color === "black" && "bg-gray-900 border-gray-400 text-white",
            slot.color === "green" && "bg-green-700 border-green-400 text-white",
          )}
          style={{
            boxShadow: `0 0 40px ${
              slot.color === "red" ? "rgba(220, 38, 38, 0.6)" :
              slot.color === "green" ? "rgba(22, 163, 74, 0.6)" :
              "rgba(100, 100, 100, 0.6)"
            }`,
          }}
          >
            {slot.displayText}
          </div>
          
          {/* Winner info */}
          {winner.avatarUrl ? (
            <img
              src={winner.avatarUrl}
              alt={winner.name}
              className="w-20 h-20 mx-auto rounded-full object-cover border-4 border-green-400 shadow-lg shadow-green-400/30 mb-4"
            />
          ) : (
            <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-3xl font-bold text-white mb-4">
              {winner.name.charAt(0).toUpperCase()}
            </div>
          )}
          
          <h2 className="text-2xl font-bold bg-gradient-to-r from-green-300 via-emerald-200 to-green-300 bg-clip-text text-transparent mb-1">
            {winner.name}
          </h2>
          <p className="text-lg text-green-200/80 font-medium">
            WINS THE SPIN!
          </p>
          
          <div className="mt-4 text-green-400/60 text-sm">
            Click anywhere to close
          </div>
        </div>
        
        {/* Corner decorations */}
        <div className="absolute -top-3 -left-3 text-3xl">💎</div>
        <div className="absolute -top-3 -right-3 text-3xl">💰</div>
        <div className="absolute -bottom-3 -left-3 text-3xl">🎲</div>
        <div className="absolute -bottom-3 -right-3 text-3xl">🃏</div>
      </div>
    </div>
  )
}

