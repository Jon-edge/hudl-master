"use client"

import * as React from "react"
import { useState, useCallback, useEffect, useRef, useMemo } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import type { PlayerProfile } from "../plinko/types"
import { WheelSpinWheel, type SpinResult } from "./WheelSpinWheel"
import { type WheelSpinConfig, type WheelGameState, type SpecialSpaceType, defaultWheelSpinConfig, WHEEL_GAME_MODES, SPECIAL_SPACES } from "./types"

export interface WheelSpinGameProps {
  players: PlayerProfile[]
  config?: Partial<WheelSpinConfig>
  onGameEnd?: (winner: PlayerProfile, loser?: PlayerProfile) => void
  soundEnabled?: boolean
  className?: string
}

const initialGameState: WheelGameState = {
  eliminatedPlayerIds: [],
  playerCounts: {},
  gameOver: false,
  winner: null,
  loser: null,
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
  const [loser, setLoser] = useState<PlayerProfile | null>(null)
  const [showCelebration, setShowCelebration] = useState(false)
  const [gameState, setGameState] = useState<WheelGameState>(initialGameState)
  const [isInAutoSpinCycle, setIsInAutoSpinCycle] = useState(false)
  const [spinDirection, setSpinDirection] = useState<1 | -1>(1)
  const [pointMultiplier, setPointMultiplier] = useState(1) // For double points special
  const [specialSpaceMessage, setSpecialSpaceMessage] = useState<string | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const tickIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const autoSpinTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const handleSpinRef = useRef<((keepLoserDisplay?: boolean) => void) | null>(null)

  // Active players only
  const activePlayers = players.filter(p => p.active && !p.archived)

  // Players currently in the game (for elimination mode)
  const playersInGame = useMemo(() => {
    if (config.gameMode === "elimination") {
      return activePlayers.filter(p => !gameState.eliminatedPlayerIds.includes(p.id))
    }
    return activePlayers
  }, [activePlayers, config.gameMode, gameState.eliminatedPlayerIds])

  // Track previous game mode to detect actual changes
  const prevGameModeRef = useRef(config.gameMode)

  // Reset game state when game mode changes
  useEffect(() => {
    if (prevGameModeRef.current !== config.gameMode) {
      prevGameModeRef.current = config.gameMode
      // Clear any pending auto-spin
      if (autoSpinTimeoutRef.current) {
        clearTimeout(autoSpinTimeoutRef.current)
        autoSpinTimeoutRef.current = null
      }
      setIsInAutoSpinCycle(false)
      setGameState(initialGameState)
      setWinner(null)
      setLoser(null)
      setShowCelebration(false)
      setSpinDirection(1)
      setPointMultiplier(1)
      setSpecialSpaceMessage(null)
    }
  }, [config.gameMode])

  // Cleanup auto-spin timeout on unmount
  useEffect(() => {
    return () => {
      if (autoSpinTimeoutRef.current) {
        clearTimeout(autoSpinTimeoutRef.current)
      }
    }
  }, [])

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

  const handleSpin = useCallback((keepLoserDisplay = false) => {
    if (playersInGame.length < 2 && config.gameMode !== "winner") return
    if (playersInGame.length < 1) return
    if (gameState.gameOver) return

    // Clear any pending auto-spin when manually spinning
    if (autoSpinTimeoutRef.current) {
      clearTimeout(autoSpinTimeoutRef.current)
      autoSpinTimeoutRef.current = null
      setIsInAutoSpinCycle(false)
    }

    setWinner(null)
    if (!keepLoserDisplay) {
      setLoser(null)
    }
    setShowCelebration(false)
    setIsSpinning(true)
  }, [playersInGame.length, config.gameMode, gameState.gameOver])

  // Keep handleSpin ref updated
  useEffect(() => {
    handleSpinRef.current = handleSpin
  }, [handleSpin])

  // Handle special space effects
  const handleSpecialSpace = useCallback((specialType: SpecialSpaceType) => {
    const spaceInfo = SPECIAL_SPACES[specialType]
    setSpecialSpaceMessage(`${spaceInfo.emoji} ${spaceInfo.name}!`)
    
    // Auto-clear message after delay
    setTimeout(() => setSpecialSpaceMessage(null), 2000)
    
    // Auto-spin after brief delay to show the special space effect
    const triggerNextSpin = () => {
      autoSpinTimeoutRef.current = setTimeout(() => {
        if (handleSpinRef.current) {
          handleSpinRef.current(false)
        }
      }, 1500)
    }
    
    switch (specialType) {
      case "double_points":
        // Next player landed on gets 2x effect
        setPointMultiplier(2)
        triggerNextSpin()
        break
        
      case "reverse_spin":
        // Flip spin direction
        setSpinDirection(prev => prev === 1 ? -1 : 1)
        triggerNextSpin()
        break
        
      case "lose_a_point":
        // Next player landed on loses a point
        setPointMultiplier(-1)
        triggerNextSpin()
        break
        
      case "bankrupt":
        // Next player landed on loses all points
        setPointMultiplier(-999)
        triggerNextSpin()
        break
        
      case "free_spin":
        // Bonus spin!
        triggerNextSpin()
        break
        
      case "mystery":
        // Random effect
        const effects: SpecialSpaceType[] = ["double_points", "reverse_spin", "lose_a_point"]
        const randomEffect = effects[Math.floor(Math.random() * effects.length)]
        setTimeout(() => handleSpecialSpace(randomEffect), 500)
        break
    }
  }, [])

  const handleSpinComplete = useCallback((result: SpinResult) => {
    setIsSpinning(false)
    
    // Handle special space
    if (result.type === "special" && result.specialType) {
      handleSpecialSpace(result.specialType)
      return
    }
    
    // Handle player selection
    const selectedPlayer = result.player
    if (!selectedPlayer) return
    
    // Apply point multiplier effects
    const multiplier = pointMultiplier
    setPointMultiplier(1) // Reset multiplier after use
    setSpinDirection(1) // Reset direction after use

    if (config.gameMode === "winner") {
      // Simple mode: whoever is selected wins
      if (multiplier > 1) {
        setSpecialSpaceMessage(`⭐ ${selectedPlayer.name} wins with DOUBLE glory!`)
        setTimeout(() => setSpecialSpaceMessage(null), 3000)
      }
      setWinner(selectedPlayer)
      setShowCelebration(true)
      playWinSound()
      if (onGameEnd) {
        onGameEnd(selectedPlayer)
      }
    } else if (config.gameMode === "elimination") {
      // Handle double points in elimination = player is SAFE (not eliminated)
      if (multiplier > 1) {
        setSpecialSpaceMessage(`⭐ ${selectedPlayer.name} is SAFE!`)
        setTimeout(() => setSpecialSpaceMessage(null), 2000)
        
        // Continue spinning without eliminating
        if (config.autoRespin) {
          setIsInAutoSpinCycle(true)
          autoSpinTimeoutRef.current = setTimeout(() => {
            if (handleSpinRef.current) {
              handleSpinRef.current(false)
            }
          }, 2000)
        }
        return
      }

      // Elimination mode: selected player is eliminated
      const newEliminatedIds = [...gameState.eliminatedPlayerIds, selectedPlayer.id]
      const remainingPlayers = activePlayers.filter(p => !newEliminatedIds.includes(p.id))

      if (remainingPlayers.length === 1) {
        // Last player standing wins!
        const lastPlayer = remainingPlayers[0]
        setIsInAutoSpinCycle(false) // End auto-spin cycle
        setGameState(prev => ({
          ...prev,
          eliminatedPlayerIds: newEliminatedIds,
          gameOver: true,
          winner: lastPlayer,
        }))
        setWinner(lastPlayer)
        setShowCelebration(true)
        playWinSound()
        if (onGameEnd) {
          onGameEnd(lastPlayer)
        }
      } else {
        // Continue elimination
        setGameState(prev => ({
          ...prev,
          eliminatedPlayerIds: newEliminatedIds,
        }))
        setLoser(selectedPlayer) // Show who was eliminated
        
        // Auto-spin after a brief delay to show who was eliminated (if enabled)
        if (config.autoRespin) {
          setIsInAutoSpinCycle(true) // Mark that we're in auto-spin mode
          autoSpinTimeoutRef.current = setTimeout(() => {
            if (handleSpinRef.current) {
              handleSpinRef.current(true) // Keep loser display during auto-spin
            }
          }, 2000) // 2 second delay to show elimination
        }
      }
    } else if (config.gameMode === "first_to_x") {
      // First to X mode: track selection counts with multiplier
      let pointChange = multiplier
      
      // Handle bankrupt
      if (multiplier === -999) {
        pointChange = -(gameState.playerCounts[selectedPlayer.id] || 0)
        setSpecialSpaceMessage(`💸 ${selectedPlayer.name} goes BANKRUPT!`)
        setTimeout(() => setSpecialSpaceMessage(null), 2000)
      } else if (multiplier < 0) {
        setSpecialSpaceMessage(`📉 ${selectedPlayer.name} loses a point!`)
        setTimeout(() => setSpecialSpaceMessage(null), 2000)
      } else if (multiplier > 1) {
        setSpecialSpaceMessage(`⭐ ${selectedPlayer.name} gets ${multiplier} points!`)
        setTimeout(() => setSpecialSpaceMessage(null), 2000)
      }
      
      const currentCount = Math.max(0, (gameState.playerCounts[selectedPlayer.id] || 0) + pointChange)
      const newCounts = {
        ...gameState.playerCounts,
        [selectedPlayer.id]: currentCount,
      }

      if (currentCount >= config.firstToXTarget) {
        // Player reached target!
        if (config.firstToXIsWin) {
          setWinner(selectedPlayer)
          setGameState(prev => ({
            ...prev,
            playerCounts: newCounts,
            gameOver: true,
            winner: selectedPlayer,
          }))
          playWinSound()
          if (onGameEnd) {
            onGameEnd(selectedPlayer)
          }
        } else {
          setLoser(selectedPlayer)
          setGameState(prev => ({
            ...prev,
            playerCounts: newCounts,
            gameOver: true,
            loser: selectedPlayer,
          }))
          // Play a different sound for losing
          playWinSound() // TODO: add lose sound
          if (onGameEnd) {
            onGameEnd(selectedPlayer, selectedPlayer)
          }
        }
        setShowCelebration(true)
      } else {
        // Continue counting
        setGameState(prev => ({
          ...prev,
          playerCounts: newCounts,
        }))
      }
    }
  }, [config.gameMode, config.firstToXTarget, config.firstToXIsWin, config.autoRespin, gameState, activePlayers, onGameEnd, playWinSound, pointMultiplier, handleSpecialSpace])

  const handleCloseCelebration = useCallback(() => {
    setShowCelebration(false)
  }, [])

  const handleResetGame = useCallback(() => {
    // Clear any pending auto-spin
    if (autoSpinTimeoutRef.current) {
      clearTimeout(autoSpinTimeoutRef.current)
      autoSpinTimeoutRef.current = null
    }
    setIsInAutoSpinCycle(false)
    setGameState(initialGameState)
    setWinner(null)
    setLoser(null)
    setShowCelebration(false)
    setSpinDirection(1)
    setPointMultiplier(1)
    setSpecialSpaceMessage(null)
  }, [])

  const minPlayersNeeded = config.gameMode === "winner" ? 2 : 2
  const canSpin = !isSpinning && !gameState.gameOver && playersInGame.length >= minPlayersNeeded && !isInAutoSpinCycle
  
  // Hide controls during auto-respin cycle OR if auto-respin is enabled in elimination mode (after first spin)
  const shouldShowControls = !isInAutoSpinCycle && !(
    config.gameMode === "elimination" && 
    config.autoRespin && 
    gameState.eliminatedPlayerIds.length > 0 && 
    !gameState.gameOver
  )

  return (
    <div className={cn("flex flex-col items-center gap-6", className)}>
      {/* Game Mode Badge */}
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 border border-border/50">
        <span className="text-xs text-muted-foreground">Mode:</span>
        <span className="text-sm font-medium">{WHEEL_GAME_MODES[config.gameMode].name}</span>
      </div>

      {/* Special Space Message */}
      {specialSpaceMessage && (
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-purple-500/20 border border-purple-400/30 animate-pulse">
          <span className="font-bold text-lg text-purple-300">
            {specialSpaceMessage}
          </span>
        </div>
      )}

      {/* Spin Direction Indicator */}
      {spinDirection === -1 && (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/20 border border-purple-400/30">
          <span className="text-xl">🔄</span>
          <span className="text-sm font-medium text-purple-300">Reverse Spin!</span>
        </div>
      )}

      {/* Point Multiplier Indicator */}
      {pointMultiplier !== 1 && pointMultiplier !== -999 && (
        <div className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-full border",
          pointMultiplier > 1 
            ? "bg-yellow-500/20 border-yellow-400/30" 
            : "bg-red-500/20 border-red-400/30"
        )}>
          <span className="text-xl">{pointMultiplier > 1 ? "⭐" : "📉"}</span>
          <span className={cn(
            "text-sm font-medium",
            pointMultiplier > 1 ? "text-yellow-300" : "text-red-300"
          )}>
            {pointMultiplier > 1 ? `${pointMultiplier}x Points!` : "Lose a Point!"}
          </span>
        </div>
      )}

      {/* Wheel */}
      <div className="relative">
        <WheelSpinWheel
          players={playersInGame}
          config={config}
          isSpinning={isSpinning}
          spinDirection={spinDirection}
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

      {/* Game State Display */}
      {config.gameMode === "elimination" && gameState.eliminatedPlayerIds.length > 0 && (
        <div className="flex flex-col items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {playersInGame.length} remaining • {gameState.eliminatedPlayerIds.length} eliminated
          </span>
          <div className="flex flex-wrap gap-1 justify-center max-w-md">
            {activePlayers
              .filter(p => gameState.eliminatedPlayerIds.includes(p.id))
              .map(p => (
                <span
                  key={p.id}
                  className="px-2 py-0.5 text-xs rounded-full bg-destructive/20 text-destructive line-through"
                >
                  {p.name}
                </span>
              ))}
          </div>
        </div>
      )}

      {config.gameMode === "first_to_x" && Object.keys(gameState.playerCounts).length > 0 && (
        <div className="flex flex-col items-center gap-2">
          <span className="text-xs text-muted-foreground">
            First to {config.firstToXTarget} {config.firstToXIsWin ? "wins" : "loses"}
          </span>
          <div className="flex flex-wrap gap-2 justify-center max-w-md">
            {activePlayers
              .filter(p => gameState.playerCounts[p.id])
              .sort((a, b) => (gameState.playerCounts[b.id] || 0) - (gameState.playerCounts[a.id] || 0))
              .map(p => (
                <div
                  key={p.id}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1 rounded-full text-sm",
                    config.firstToXIsWin
                      ? "bg-game-success/20 text-game-success"
                      : "bg-destructive/20 text-destructive"
                  )}
                >
                  <span>{p.name}</span>
                  <span className="font-bold">
                    {gameState.playerCounts[p.id]}/{config.firstToXTarget}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Last eliminated player badge */}
      {loser && !winner && !showCelebration && config.gameMode === "elimination" && (
        <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-destructive/20 border border-destructive/30">
          {loser.avatarUrl && (
            <img
              src={loser.avatarUrl}
              alt={loser.name}
              className="w-8 h-8 rounded-full object-cover border-2 border-destructive/50 opacity-60"
            />
          )}
          <span className="font-semibold text-destructive">
            {loser.name} eliminated!
          </span>
        </div>
      )}

      {/* Controls - hide during auto-spin cycle or when auto-respin is active */}
      {shouldShowControls && (
        <div className="flex items-center justify-center gap-3 p-3 rounded-xl glass-panel">
          <Button
            onClick={() => handleSpin()}
            disabled={!canSpin}
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
            ) : gameState.gameOver ? (
              "Game Over"
            ) : (
              <>
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
                SPIN THE WHEEL!
              </>
            )}
          </Button>

          {/* Reset button for multi-round modes */}
          {config.gameMode !== "winner" && (gameState.eliminatedPlayerIds.length > 0 || Object.keys(gameState.playerCounts).length > 0) && (
            <Button
              onClick={handleResetGame}
              variant="outline"
              size="lg"
              disabled={isSpinning}
            >
              Reset Game
            </Button>
          )}

          {playersInGame.length < minPlayersNeeded && !gameState.gameOver && (
            <span className="text-sm text-muted-foreground">
              Need at least {minPlayersNeeded} players
            </span>
          )}
        </div>
      )}

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

      {/* Loser Badge for first_to_x lose mode */}
      {loser && !winner && !showCelebration && config.gameMode === "first_to_x" && !config.firstToXIsWin && gameState.gameOver && (
        <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-destructive/20 border border-destructive/30">
          {loser.avatarUrl && (
            <img
              src={loser.avatarUrl}
              alt={loser.name}
              className="w-8 h-8 rounded-full object-cover border-2 border-destructive/50"
            />
          )}
          <span className="font-semibold text-destructive">
            {loser.name} loses!
          </span>
        </div>
      )}

      {/* Win Celebration Modal */}
      {showCelebration && (winner || loser) && (
        <GameEndCelebration
          winner={winner}
          loser={loser}
          gameMode={config.gameMode}
          isWinMode={config.firstToXIsWin}
          onClose={handleCloseCelebration}
        />
      )}
    </div>
  )
}

// Game end celebration component (handles both win and lose scenarios)
function GameEndCelebration({
  winner,
  loser,
  gameMode,
  isWinMode,
  onClose,
}: {
  winner: PlayerProfile | null
  loser: PlayerProfile | null
  gameMode: WheelSpinConfig["gameMode"]
  isWinMode: boolean
  onClose: () => void
}) {
  const confettiRef = useRef<HTMLDivElement>(null)

  // Determine if this is a win celebration or lose celebration
  const isLoseCelebration = gameMode === "first_to_x" && !isWinMode && loser && !winner
  const player = winner || loser

  useEffect(() => {
    // Auto-close after 4 seconds
    const timer = setTimeout(onClose, 4000)
    return () => clearTimeout(timer)
  }, [onClose])

  if (!player) return null

  // Carnival marquee bulb colors - matching the wheel theme
  const CARNIVAL_CONFETTI_COLORS = [
    "#FF4444", // Bright red (marquee bulb)
    "#FFDD44", // Bright yellow (marquee bulb)
    "#44FF44", // Bright green (marquee bulb)
    "#44DDFF", // Bright cyan (marquee bulb)
    "#FF44FF", // Bright magenta (marquee bulb)
    "#FFD700", // Gold (wheel accents)
    "#DC2626", // Carnival red
    "#2563EB", // Bunting blue
    "#16A34A", // Bunting green
    "#9333EA", // Bunting purple
  ]

  // Generate confetti particles (or sad particles for lose)
  const confettiParticles = Array.from({ length: 60 }).map((_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 0.8,
    duration: 2.5 + Math.random() * 2,
    color: isLoseCelebration
      ? ["#666666", "#888888", "#444444", "#555555"][Math.floor(Math.random() * 4)]
      : CARNIVAL_CONFETTI_COLORS[Math.floor(Math.random() * CARNIVAL_CONFETTI_COLORS.length)],
    size: 10 + Math.random() * 10,
    rotation: Math.random() * 360,
    shape: Math.random() > 0.6 ? "circle" : Math.random() > 0.5 ? "star" : "rect",
  }))

  // Get the message based on game mode
  const getMessage = () => {
    if (isLoseCelebration) {
      return "LOSES!"
    }
    switch (gameMode) {
      case "elimination":
        return "LAST ONE STANDING!"
      case "first_to_x":
        return "REACHES THE TARGET!"
      default:
        return "WINS THE SPIN!"
    }
  }

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
              height: p.shape === "star" ? p.size : p.size * (p.shape === "rect" ? 0.4 : 1),
              backgroundColor: p.color,
              transform: `rotate(${p.rotation}deg)`,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.duration}s`,
              borderRadius: p.shape === "circle" ? "50%" : p.shape === "star" ? "2px" : "1px",
              boxShadow: `0 0 ${p.size / 2}px ${p.color}80`,
              clipPath: p.shape === "star"
                ? "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)"
                : undefined,
            }}
          />
        ))}
      </div>

      {/* Card */}
      <div
        className="relative rounded-3xl p-8 text-center animate-winner-pop"
        style={{
          background: isLoseCelebration
            ? "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #1a1a2e 100%)"
            : "linear-gradient(135deg, #2D1B4E 0%, #1a1a2e 30%, #2D1B4E 50%, #1a1a2e 70%, #2D1B4E 100%)",
          border: isLoseCelebration ? "3px solid #444" : "4px solid #FFD700",
          boxShadow: isLoseCelebration
            ? "0 0 30px rgba(100, 100, 100, 0.3), inset 0 0 20px rgba(0, 0, 0, 0.5)"
            : "0 0 40px rgba(255, 215, 0, 0.4), 0 0 80px rgba(255, 68, 68, 0.3), inset 0 0 30px rgba(255, 215, 0, 0.1)",
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Carnival marquee lights border */}
        {!isLoseCelebration && (
          <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none">
            {Array.from({ length: 24 }).map((_, i) => {
              const colors = ["#FF4444", "#FFDD44", "#44FF44", "#44DDFF", "#FF44FF"]
              const isLit = (Date.now() / 200 + i) % 3 < 1.5
              return (
                <div
                  key={i}
                  className="absolute w-3 h-3 rounded-full transition-all duration-150"
                  style={{
                    ...(i < 6 ? { top: -4, left: `${10 + i * 16}%` } :
                       i < 12 ? { bottom: -4, left: `${10 + (i - 6) * 16}%` } :
                       i < 18 ? { left: -4, top: `${10 + (i - 12) * 14}%` } :
                       { right: -4, top: `${10 + (i - 18) * 14}%` }),
                    backgroundColor: isLit ? colors[i % colors.length] : "#333",
                    boxShadow: isLit ? `0 0 8px 2px ${colors[i % colors.length]}` : "none",
                  }}
                />
              )
            })}
          </div>
        )}

        {/* Glow effect */}
        <div
          className={cn(
            "absolute inset-0 rounded-3xl animate-pulse",
            isLoseCelebration
              ? "bg-gradient-to-br from-red-500/10 via-transparent to-red-500/10"
              : "bg-gradient-to-br from-yellow-400/20 via-transparent to-pink-500/20"
          )}
        />

        {/* Content */}
        <div className="relative z-10">
          {/* Trophy/emoji with glow */}
          <div
            className="text-6xl mb-4"
            style={{
              filter: isLoseCelebration ? "none" : "drop-shadow(0 0 20px rgba(255, 215, 0, 0.8))",
            }}
          >
            {isLoseCelebration ? "😢" : "🏆"}
          </div>

          {/* Player avatar with carnival border */}
          {player.avatarUrl ? (
            <div className="relative w-28 h-28 mx-auto mb-4">
              {!isLoseCelebration && (
                <div
                  className="absolute inset-0 rounded-full animate-spin-slow"
                  style={{
                    background: "conic-gradient(#FF4444, #FFDD44, #44FF44, #44DDFF, #FF44FF, #FF4444)",
                    padding: "4px",
                  }}
                />
              )}
              <img
                src={player.avatarUrl}
                alt={player.name}
                className={cn(
                  "absolute inset-1 w-[calc(100%-8px)] h-[calc(100%-8px)] rounded-full object-cover",
                  isLoseCelebration && "grayscale border-4 border-gray-500"
                )}
                style={{
                  boxShadow: isLoseCelebration
                    ? "none"
                    : "0 0 20px rgba(255, 215, 0, 0.6), inset 0 0 10px rgba(0,0,0,0.3)",
                }}
              />
            </div>
          ) : (
            <div
              className="w-28 h-28 mx-auto rounded-full flex items-center justify-center text-4xl font-bold text-white mb-4"
              style={{
                background: isLoseCelebration
                  ? "linear-gradient(135deg, #666 0%, #444 100%)"
                  : "conic-gradient(#FF4444, #FFDD44, #44FF44, #44DDFF, #FF44FF, #FF4444)",
                boxShadow: isLoseCelebration
                  ? "none"
                  : "0 0 30px rgba(255, 215, 0, 0.6), inset 0 0 20px rgba(0, 0, 0, 0.3)",
              }}
            >
              <span
                className="w-24 h-24 rounded-full flex items-center justify-center"
                style={{
                  background: isLoseCelebration
                    ? "#333"
                    : "linear-gradient(135deg, #2D1B4E 0%, #1a1a2e 100%)",
                }}
              >
                {player.name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}

          {/* Player name with vibrant gradient */}
          <h2
            className="text-4xl font-black mb-2 tracking-wide"
            style={{
              background: isLoseCelebration
                ? "linear-gradient(135deg, #888 0%, #666 50%, #888 100%)"
                : "linear-gradient(135deg, #FFD700 0%, #FFF 30%, #FFD700 50%, #FF6B6B 70%, #FFD700 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              textShadow: isLoseCelebration ? "none" : "0 0 30px rgba(255, 215, 0, 0.5)",
              filter: isLoseCelebration ? "none" : "drop-shadow(0 2px 4px rgba(0,0,0,0.5))",
            }}
          >
            {player.name}
          </h2>

          {/* Message with carnival styling */}
          <p
            className="text-xl font-bold tracking-widest uppercase"
            style={{
              color: isLoseCelebration ? "#888" : "#44FF44",
              textShadow: isLoseCelebration
                ? "none"
                : "0 0 10px #44FF44, 0 0 20px rgba(68, 255, 68, 0.5)",
            }}
          >
            {getMessage()}
          </p>

          <div
            className="mt-6 text-sm"
            style={{
              color: isLoseCelebration ? "rgba(150, 150, 150, 0.6)" : "rgba(255, 215, 0, 0.6)",
            }}
          >
            Click anywhere to close
          </div>
        </div>

        {/* Carnival star bursts in corners */}
        {!isLoseCelebration && (
          <>
            <div
              className="absolute -top-6 -left-6 text-4xl animate-float"
              style={{ filter: "drop-shadow(0 0 10px #FF4444)" }}
            >
              🎪
            </div>
            <div
              className="absolute -top-6 -right-6 text-4xl animate-float"
              style={{ animationDelay: "0.5s", filter: "drop-shadow(0 0 10px #44FF44)" }}
            >
              🎯
            </div>
            <div
              className="absolute -bottom-6 -left-6 text-4xl animate-float"
              style={{ animationDelay: "0.25s", filter: "drop-shadow(0 0 10px #FFDD44)" }}
            >
              ⭐
            </div>
            <div
              className="absolute -bottom-6 -right-6 text-4xl animate-float"
              style={{ animationDelay: "0.75s", filter: "drop-shadow(0 0 10px #FF44FF)" }}
            >
              🎊
            </div>
          </>
        )}
      </div>
    </div>
  )
}
