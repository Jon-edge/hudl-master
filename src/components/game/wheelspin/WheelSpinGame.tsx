"use client"

import * as React from "react"
import { useState, useCallback, useEffect, useRef } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import type { PlayerProfile } from "../plinko/types"
import { WheelSpinWheel } from "./WheelSpinWheel"
import { type WheelSpinConfig, defaultWheelSpinConfig } from "./types"

export interface WheelSpinGameProps {
  players: PlayerProfile[]
  config?: Partial<WheelSpinConfig>
  onGameEnd?: (winner: PlayerProfile) => void
  soundEnabled?: boolean
  className?: string
}

export function WheelSpinGame({
  players,
  config: configOverrides,
  onGameEnd,
  soundEnabled = true,
  className,
}: WheelSpinGameProps) {
  const config = { ...defaultWheelSpinConfig, ...configOverrides }
  const [isSpinning, setIsSpinning] = useState(false)
  const [winner, setWinner] = useState<PlayerProfile | null>(null)
  const [showCelebration, setShowCelebration] = useState(false)
  const audioContextRef = useRef<AudioContext | null>(null)
  const tickIntervalRef = useRef<NodeJS.Timeout | null>(null)
  
  // Active players only
  const activePlayers = players.filter(p => p.active && !p.archived)

  // Play tick sound during spin
  const playTickSound = useCallback(() => {
    if (!soundEnabled) return
    
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext()
    }
    
    const ctx = audioContextRef.current
    if (ctx.state === "suspended") {
      ctx.resume()
    }
    
    const oscillator = ctx.createOscillator()
    const gainNode = ctx.createGain()
    
    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)
    
    oscillator.frequency.value = 800 + Math.random() * 200
    oscillator.type = "sine"
    
    gainNode.gain.setValueAtTime(0.1, ctx.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05)
    
    oscillator.start(ctx.currentTime)
    oscillator.stop(ctx.currentTime + 0.05)
  }, [soundEnabled])

  // Play win sound
  const playWinSound = useCallback(() => {
    if (!soundEnabled) return
    
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext()
    }
    
    const ctx = audioContextRef.current
    if (ctx.state === "suspended") {
      ctx.resume()
    }
    
    // Fanfare chord
    const frequencies = [523.25, 659.25, 783.99] // C5, E5, G5
    frequencies.forEach((freq, i) => {
      const oscillator = ctx.createOscillator()
      const gainNode = ctx.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(ctx.destination)
      
      oscillator.frequency.value = freq
      oscillator.type = "sine"
      
      const startTime = ctx.currentTime + i * 0.1
      gainNode.gain.setValueAtTime(0, startTime)
      gainNode.gain.linearRampToValueAtTime(0.15, startTime + 0.1)
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.8)
      
      oscillator.start(startTime)
      oscillator.stop(startTime + 0.8)
    })
  }, [soundEnabled])

  // Start tick sounds during spin
  useEffect(() => {
    if (isSpinning && soundEnabled) {
      let tickRate = 50 // Start fast
      const slowDown = () => {
        playTickSound()
        tickRate = Math.min(tickRate * 1.02, 300) // Gradually slow down
        if (isSpinning) {
          tickIntervalRef.current = setTimeout(slowDown, tickRate)
        }
      }
      slowDown()
      
      return () => {
        if (tickIntervalRef.current) {
          clearTimeout(tickIntervalRef.current)
        }
      }
    }
  }, [isSpinning, soundEnabled, playTickSound])

  const handleSpin = useCallback(() => {
    if (activePlayers.length < 2) return
    
    setWinner(null)
    setShowCelebration(false)
    setIsSpinning(true)
  }, [activePlayers.length])

  const handleSpinComplete = useCallback((winningPlayer: PlayerProfile) => {
    setIsSpinning(false)
    setWinner(winningPlayer)
    setShowCelebration(true)
    playWinSound()
    
    if (onGameEnd) {
      onGameEnd(winningPlayer)
    }
  }, [onGameEnd, playWinSound])

  const handleCloseCelebration = useCallback(() => {
    setShowCelebration(false)
  }, [])

  return (
    <div className={cn("flex flex-col items-center gap-6", className)}>
      {/* Wheel */}
      <div className="relative">
        <WheelSpinWheel
          players={activePlayers}
          config={config}
          isSpinning={isSpinning}
          onSpinComplete={handleSpinComplete}
        />
        
        {/* Spinning glow effect */}
        {isSpinning && (
          <div 
            className="absolute inset-0 rounded-full animate-pulse"
            style={{
              background: "radial-gradient(circle, transparent 60%, rgba(255, 200, 100, 0.2) 100%)",
              pointerEvents: "none",
            }}
          />
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-3 p-3 rounded-xl glass-panel">
        <Button
          onClick={handleSpin}
          disabled={isSpinning || activePlayers.length < 2}
          size="lg"
          className={cn(
            "min-w-40 gap-2 font-bold text-lg transition-all",
            isSpinning 
              ? "bg-amber-600 hover:bg-amber-700" 
              : "bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-600 hover:via-yellow-500 hover:to-amber-600 text-amber-950"
          )}
        >
          {isSpinning ? (
            <>
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Spinning...
            </>
          ) : (
            <>
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
              SPIN THE WHEEL!
            </>
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
        <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-gradient-to-r from-amber-500/20 via-yellow-400/20 to-amber-500/20 border border-amber-400/30">
          {winner.avatarUrl && (
            <img 
              src={winner.avatarUrl} 
              alt={winner.name}
              className="w-8 h-8 rounded-full object-cover border-2 border-amber-400"
            />
          )}
          <span className="font-semibold text-amber-300">
            {winner.name} won!
          </span>
        </div>
      )}

      {/* Win Celebration Modal */}
      {showCelebration && winner && (
        <WinCelebration 
          winner={winner} 
          onClose={handleCloseCelebration}
        />
      )}
    </div>
  )
}

// Win celebration component
function WinCelebration({ 
  winner, 
  onClose 
}: { 
  winner: PlayerProfile
  onClose: () => void 
}) {
  const confettiRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Auto-close after 4 seconds
    const timer = setTimeout(onClose, 4000)
    return () => clearTimeout(timer)
  }, [onClose])

  // Generate confetti particles
  const confettiParticles = Array.from({ length: 50 }).map((_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 0.5,
    duration: 2 + Math.random() * 2,
    color: ["#ffd700", "#ff6b6b", "#4ecdc4", "#45b7d1", "#96ceb4", "#ff8c00"][Math.floor(Math.random() * 6)],
    size: 8 + Math.random() * 8,
    rotation: Math.random() * 360,
  }))

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Confetti */}
      <div ref={confettiRef} className="absolute inset-0 overflow-hidden pointer-events-none">
        {confettiParticles.map(p => (
          <div
            key={p.id}
            className="absolute animate-confetti-fall"
            style={{
              left: `${p.left}%`,
              top: "-20px",
              width: p.size,
              height: p.size,
              backgroundColor: p.color,
              transform: `rotate(${p.rotation}deg)`,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.duration}s`,
              borderRadius: Math.random() > 0.5 ? "50%" : "2px",
            }}
          />
        ))}
      </div>

      {/* Winner Card */}
      <div 
        className="relative glass-panel-elevated rounded-3xl p-8 text-center animate-winner-pop"
        onClick={e => e.stopPropagation()}
      >
        {/* Glow effect */}
        <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-amber-500/20 via-transparent to-amber-500/20 animate-pulse" />
        
        {/* Content */}
        <div className="relative z-10">
          <div className="text-6xl mb-4">🎉</div>
          
          {/* Winner avatar */}
          {winner.avatarUrl ? (
            <img
              src={winner.avatarUrl}
              alt={winner.name}
              className="w-24 h-24 mx-auto rounded-full object-cover border-4 border-amber-400 shadow-lg shadow-amber-400/30 mb-4"
            />
          ) : (
            <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-3xl font-bold text-white mb-4">
              {winner.name.charAt(0).toUpperCase()}
            </div>
          )}
          
          <h2 className="text-3xl font-bold bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-300 bg-clip-text text-transparent mb-2">
            {winner.name}
          </h2>
          <p className="text-xl text-amber-200/80 font-medium">
            WINS THE SPIN!
          </p>
          
          <div className="mt-6 text-amber-400/60 text-sm">
            Click anywhere to close
          </div>
        </div>

        {/* Sparkles */}
        <div className="absolute -top-4 -left-4 text-4xl animate-float">✨</div>
        <div className="absolute -top-4 -right-4 text-4xl animate-float" style={{ animationDelay: "0.5s" }}>✨</div>
        <div className="absolute -bottom-4 -left-4 text-4xl animate-float" style={{ animationDelay: "0.25s" }}>⭐</div>
        <div className="absolute -bottom-4 -right-4 text-4xl animate-float" style={{ animationDelay: "0.75s" }}>⭐</div>
      </div>
    </div>
  )
}
