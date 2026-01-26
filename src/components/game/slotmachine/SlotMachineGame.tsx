"use client"

import * as React from "react"
import { useState, useCallback, useEffect, useRef, useMemo } from "react"
import { cn } from "@/lib/utils"
import type { PlayerProfile } from "../plinko/types"
import { type SlotMachineConfig, type GameResult, defaultSlotMachineConfig, WIN_MESSAGES } from "./types"

export interface SlotMachineGameProps {
  players: PlayerProfile[]
  config?: Partial<SlotMachineConfig>
  onGameEnd?: (result: GameResult) => void
  onPlayerDisable?: (playerId: string) => void
  soundEnabled?: boolean
  className?: string
}

// Classic slot machine with proper reels
export function SlotMachineGame({
  players,
  config: configOverrides,
  onGameEnd,
  onPlayerDisable,
  soundEnabled = true,
  className,
}: SlotMachineGameProps) {
  const config = { ...defaultSlotMachineConfig, ...configOverrides }
  const [isSpinning, setIsSpinning] = useState(false)
  const [winner, setWinner] = useState<PlayerProfile | null>(null)
  const [showCelebration, setShowCelebration] = useState(false)
  const [leverPulled, setLeverPulled] = useState(false)

  // Bonus round state
  const [bonusMode, setBonusMode] = useState(false)
  const [bonusPlayers, setBonusPlayers] = useState<PlayerProfile[]>([])
  const [showBonusAnnouncement, setShowBonusAnnouncement] = useState(false)

  // Lucky Spin (triple match = burn) state
  const [showLuckyBurn, setShowLuckyBurn] = useState(false)
  const [burnedPlayer, setBurnedPlayer] = useState<PlayerProfile | null>(null)
  const [sessionBurnedIds, setSessionBurnedIds] = useState<Set<string>>(new Set())

  // Track if current win is a bonus win (triple with +2 points)
  const [isTripleWin, setIsTripleWin] = useState(false)
  const [bonusPoints, setBonusPoints] = useState(0)

  // Reel positions (0-based index into player array)
  const [reelPositions, setReelPositions] = useState([0, 0, 0])
  const [reelSpinning, setReelSpinning] = useState([false, false, false])

  const audioContextRef = useRef<AudioContext | null>(null)

  // Filter out burned players for this session
  const activePlayers = players.filter(p => p.active && !p.archived && !sessionBurnedIds.has(p.id))

  // Players to show on reels - either all active players or just bonus players
  const reelPlayers = bonusMode ? bonusPlayers : activePlayers

  // Randomize initial reel positions when players change
  useEffect(() => {
    if (reelPlayers.length > 0 && !isSpinning) {
      setReelPositions([
        Math.floor(Math.random() * reelPlayers.length),
        Math.floor(Math.random() * reelPlayers.length),
        Math.floor(Math.random() * reelPlayers.length),
      ])
    }
  }, [reelPlayers.length]) // Only re-randomize when player count changes

  // Initialize audio context on first interaction
  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext()
    }
    if (audioContextRef.current.state === "suspended") {
      audioContextRef.current.resume()
    }
    return audioContextRef.current
  }, [])

  // Sound effects
  const playSound = useCallback((type: "spin" | "stop" | "win" | "lever" | "bonus" | "burn") => {
    if (!soundEnabled) return
    const ctx = getAudioContext()

    if (type === "lever") {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.value = 80
      osc.type = "square"
      gain.gain.setValueAtTime(0.3, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15)
      osc.start()
      osc.stop(ctx.currentTime + 0.15)
    } else if (type === "stop") {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.value = 120
      osc.type = "triangle"
      gain.gain.setValueAtTime(0.4, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1)
      osc.start()
      osc.stop(ctx.currentTime + 0.1)
    } else if (type === "win") {
      [523, 659, 784, 1047].forEach((freq, i) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.frequency.value = freq
        osc.type = "sine"
        const t = ctx.currentTime + i * 0.08
        gain.gain.setValueAtTime(0, t)
        gain.gain.linearRampToValueAtTime(0.2, t + 0.02)
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3)
        osc.start(t)
        osc.stop(t + 0.3)
      })
    } else if (type === "bonus") {
      const notes = [392, 494, 587, 784, 587, 784, 988]
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.frequency.value = freq
        osc.type = "square"
        const t = ctx.currentTime + i * 0.08
        gain.gain.setValueAtTime(0, t)
        gain.gain.linearRampToValueAtTime(0.15, t + 0.02)
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.2)
        osc.start(t)
        osc.stop(t + 0.2)
      })
    } else if (type === "burn") {
      // Dramatic descending whoosh + crackle
      const baseFreq = 800
      for (let i = 0; i < 15; i++) {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.frequency.value = baseFreq - i * 50 + Math.random() * 100
        osc.type = "sawtooth"
        const t = ctx.currentTime + i * 0.05
        gain.gain.setValueAtTime(0, t)
        gain.gain.linearRampToValueAtTime(0.1 + Math.random() * 0.1, t + 0.02)
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15)
        osc.start(t)
        osc.stop(t + 0.15)
      }
      // Low rumble
      const rumble = ctx.createOscillator()
      const rumbleGain = ctx.createGain()
      rumble.connect(rumbleGain)
      rumbleGain.connect(ctx.destination)
      rumble.frequency.value = 60
      rumble.type = "triangle"
      rumbleGain.gain.setValueAtTime(0, ctx.currentTime)
      rumbleGain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.2)
      rumbleGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1)
      rumble.start()
      rumble.stop(ctx.currentTime + 1)
    }
  }, [soundEnabled, getAudioContext])

  // Execute a spin with given players
  const executeSpin = useCallback((playersToUse: PlayerProfile[], isBonusRound: boolean) => {
    if (playersToUse.length < 2) return

    setIsSpinning(true)
    setWinner(null)
    setShowCelebration(false)
    setReelSpinning([true, true, true])

    // Determine results - random indices into playersToUse
    const results = [
      Math.floor(Math.random() * playersToUse.length),
      Math.floor(Math.random() * playersToUse.length),
      Math.floor(Math.random() * playersToUse.length),
    ]

    // Stop reels sequentially
    const stopTimes = [1200, 1800, 2400]

    stopTimes.forEach((time, reelIndex) => {
      setTimeout(() => {
        setReelSpinning(prev => {
          const next = [...prev]
          next[reelIndex] = false
          return next
        })
        setReelPositions(prev => {
          const next = [...prev]
          next[reelIndex] = results[reelIndex]
          return next
        })
        playSound("stop")

        // After last reel stops
        if (reelIndex === 2) {
          setTimeout(() => {
            setIsSpinning(false)

            // Get the players that landed on each reel
            const landedPlayers = results.map(idx => playersToUse[idx])
            const p0 = landedPlayers[0]
            const p1 = landedPlayers[1]
            const p2 = landedPlayers[2]

            // Check for matches
            const isTripleMatch = p0.id === p1.id && p1.id === p2.id
            const hasPair = (p0.id === p1.id || p1.id === p2.id || p0.id === p2.id)

            // Determine which player won when there's a pair
            let pairWinner: PlayerProfile = p1
            if (hasPair && !isTripleMatch) {
              if (p0.id === p1.id) pairWinner = p0
              else if (p1.id === p2.id) pairWinner = p1
              else pairWinner = p0 // p0 === p2
            }

            // Helper to declare a winner
            const declareWinner = (winner: PlayerProfile, isTriple: boolean, bonusPts: number) => {
              setWinner(winner)
              setIsTripleWin(isTriple)
              setBonusPoints(bonusPts)
              setShowCelebration(true)
              playSound("win")
              setBonusMode(false)
              setBonusPlayers([])
              if (onGameEnd) {
                onGameEnd({ winner, bonusPoints: bonusPts, isTripleWin: isTriple })
              }
            }

            // Helper to trigger bonus round
            const triggerBonusRound = () => {
              const uniqueIds = new Set([p0.id, p1.id, p2.id])
              const uniquePlayers = Array.from(uniqueIds).map(id =>
                playersToUse.find(p => p.id === id)!
              )
              playSound("bonus")
              setBonusPlayers(uniquePlayers)
              setShowBonusAnnouncement(true)
            }

            // STEP 1: Handle triple response (only when winCondition != "triple")
            if (isTripleMatch && config.winCondition !== "triple") {
              switch (config.tripleResponse) {
                case "burn":
                  // LUCKY SPIN - burn this player and re-roll!
                  playSound("burn")
                  setBurnedPlayer(p1)
                  setShowLuckyBurn(true)
                  setSessionBurnedIds(prev => new Set([...prev, p1.id]))
                  if (onPlayerDisable) onPlayerDisable(p1.id)
                  return
                case "win":
                  declareWinner(p1, true, 0)
                  return
                case "winBonus":
                  declareWinner(p1, true, 2)
                  return
                case "disabled":
                default:
                  // Fall through to normal win condition logic
                  break
              }
            }

            // Helper to check if bonus round should trigger
            const shouldTriggerBonus = () => {
              if (config.bonusRoundsMode === "off") return false
              if (config.bonusRoundsMode === "initialOnly") return !isBonusRound
              return true // "always" - can chain bonus rounds
            }

            // STEP 2: Check win condition
            if (config.winCondition === "triple") {
              // Need triple to win
              if (isTripleMatch) {
                declareWinner(p1, true, 0)
              } else if (shouldTriggerBonus()) {
                // No triple - go to bonus round with contestants from this spin
                triggerBonusRound()
              } else {
                // Bonus disabled - auto re-spin with same players
                setTimeout(() => {
                  setLeverPulled(true)
                  playSound("lever")
                  setTimeout(() => {
                    setLeverPulled(false)
                    executeSpin(playersToUse, true)
                  }, 200)
                }, 800)
              }
            } else if (config.winCondition === "pair") {
              // Need pair to win
              if (hasPair) {
                declareWinner(pairWinner, isTripleMatch, 0)
              } else if (shouldTriggerBonus()) {
                // No pair - go to bonus round with contestants from this spin
                triggerBonusRound()
              } else {
                // Bonus disabled - auto re-spin with same players
                setTimeout(() => {
                  setLeverPulled(true)
                  playSound("lever")
                  setTimeout(() => {
                    setLeverPulled(false)
                    executeSpin(playersToUse, true)
                  }, 200)
                }, 800)
              }
            } else {
              // winCondition === "middle"
              // Check for bonus trigger (pair in non-bonus round when bonus enabled)
              if (hasPair && !isTripleMatch && shouldTriggerBonus() && !isBonusRound) {
                triggerBonusRound()
              } else {
                // Normal win - middle reel determines winner
                declareWinner(p1, false, 0)
              }
            }
          }, 300)
        }
      }, time)
    })
  }, [config.winCondition, config.tripleResponse, config.bonusRoundsMode, playSound, onGameEnd, onPlayerDisable])

  // Handle spin button click
  const handleSpin = useCallback(() => {
    if (isSpinning || reelPlayers.length < 2) return

    setLeverPulled(true)
    playSound("lever")

    setTimeout(() => {
      setLeverPulled(false)
      executeSpin(reelPlayers, bonusMode)
    }, 200)
  }, [isSpinning, reelPlayers, playSound, executeSpin, bonusMode])

  // Handle bonus announcement close - auto-start bonus spin
  const handleBonusAnnouncementClose = useCallback(() => {
    setShowBonusAnnouncement(false)
    setBonusMode(true)

    setTimeout(() => {
      setLeverPulled(true)
      playSound("lever")

      setTimeout(() => {
        setLeverPulled(false)
        executeSpin(bonusPlayers, true)
      }, 200)
    }, 500)
  }, [bonusPlayers, executeSpin, playSound])

  // Handle lucky burn close - re-spin with remaining players
  const handleLuckyBurnClose = useCallback(() => {
    setShowLuckyBurn(false)
    setBurnedPlayer(null)
    setBonusMode(false)
    setBonusPlayers([])

    // Get remaining active players (excluding burned ones)
    const remainingPlayers = players.filter(p =>
      p.active && !p.archived && !sessionBurnedIds.has(p.id)
    )

    if (remainingPlayers.length >= 2) {
      // Auto re-spin
      setTimeout(() => {
        setLeverPulled(true)
        playSound("lever")

        setTimeout(() => {
          setLeverPulled(false)
          executeSpin(remainingPlayers, false)
        }, 200)
      }, 500)
    } else if (remainingPlayers.length === 1) {
      // Only one player left - they win by default
      setWinner(remainingPlayers[0])
      setIsTripleWin(false)
      setBonusPoints(0)
      setShowCelebration(true)
      playSound("win")
      if (onGameEnd) {
        onGameEnd({ winner: remainingPlayers[0], bonusPoints: 0, isTripleWin: false })
      }
    }
  }, [players, sessionBurnedIds, executeSpin, playSound, onGameEnd])

  // Memoized callbacks for modals to prevent re-renders from resetting their timers
  const handleCelebrationClose = useCallback(() => {
    setShowCelebration(false)
  }, [])

  const presenterMessage = useMemo(() => {
    return WIN_MESSAGES.presenter[Math.floor(Math.random() * WIN_MESSAGES.presenter.length)]
  }, [winner])

  // Animated light state for chase lights
  const [lightPhase, setLightPhase] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setLightPhase(p => (p + 1) % 20)
    }, 80)
    return () => clearInterval(interval)
  }, [])

  // Generate bulb positions for marquee border
  const topBulbs = Array.from({ length: 12 }, (_, i) => i)
  const sideBulbs = Array.from({ length: 6 }, (_, i) => i)

  return (
    <div className={cn("flex flex-col items-center gap-6", className)}>
      {/* Slot Machine Cabinet */}
      <div className="relative">
        {/* Subtle drop shadow instead of neon glow */}
        <div
          className="absolute -inset-4 rounded-[2rem] -z-10"
          style={{
            boxShadow: "0 20px 60px rgba(0,0,0,0.6), 0 8px 20px rgba(0,0,0,0.4)",
          }}
        />

        {/* Vintage Marquee Top Sign with Light Bulbs */}
        <div className="absolute -top-16 left-1/2 -translate-x-1/2 z-20">
          <div className="relative">
            {/* Main marquee sign */}
            <div
              className="relative px-8 py-3 rounded-lg"
              style={{
                background: "linear-gradient(180deg, #FFFDD0 0%, #F5DEB3 100%)",
                border: "4px solid #B8860B",
                boxShadow: `
                  inset 0 2px 4px rgba(255,255,255,0.8),
                  inset 0 -2px 4px rgba(0,0,0,0.1),
                  0 4px 12px rgba(0,0,0,0.4)
                `,
              }}
            >
              {/* Light bulbs around the sign - top */}
              <div className="absolute -top-3 left-2 right-2 flex justify-between">
                {topBulbs.map((i) => (
                  <div
                    key={`top-${i}`}
                    className="w-3 h-3 rounded-full"
                    style={{
                      background: (lightPhase + i) % 3 === 0
                        ? "radial-gradient(circle at 30% 30%, #FFFDD0, #FFE4B5)"
                        : "radial-gradient(circle at 30% 30%, #D2B48C, #A0522D)",
                      boxShadow: (lightPhase + i) % 3 === 0
                        ? "0 0 8px #FFE4B5, 0 0 4px #FFF8DC"
                        : "inset 0 1px 2px rgba(0,0,0,0.3)",
                      border: "1px solid #8B4513",
                    }}
                  />
                ))}
              </div>
              {/* Light bulbs - bottom */}
              <div className="absolute -bottom-3 left-2 right-2 flex justify-between">
                {topBulbs.map((i) => (
                  <div
                    key={`bottom-${i}`}
                    className="w-3 h-3 rounded-full"
                    style={{
                      background: (lightPhase + i + 1) % 3 === 0
                        ? "radial-gradient(circle at 30% 30%, #FFFDD0, #FFE4B5)"
                        : "radial-gradient(circle at 30% 30%, #D2B48C, #A0522D)",
                      boxShadow: (lightPhase + i + 1) % 3 === 0
                        ? "0 0 8px #FFE4B5, 0 0 4px #FFF8DC"
                        : "inset 0 1px 2px rgba(0,0,0,0.3)",
                      border: "1px solid #8B4513",
                    }}
                  />
                ))}
              </div>
              <span
                className="text-2xl font-black tracking-[0.15em] uppercase"
                style={{
                  fontFamily: "'Georgia', 'Times New Roman', serif",
                  color: bonusMode ? "#722F37" : "#8B4513",
                  textShadow: "1px 1px 0 rgba(255,255,255,0.5), -1px -1px 0 rgba(0,0,0,0.1)",
                }}
              >
                {bonusMode ? "Bonus" : "Lucky's"}
              </span>
            </div>
          </div>
        </div>

        {/* Main cabinet - vintage wood grain design */}
        <div
          className="relative rounded-2xl overflow-hidden"
          style={{
            background: `
              linear-gradient(180deg,
                #A0522D 0%,
                #8B4513 15%,
                #5D3A1A 50%,
                #8B4513 85%,
                #A0522D 100%
              )
            `,
            boxShadow: `
              0 0 0 3px #B8860B,
              0 0 0 6px #8B4513,
              0 0 0 8px #DAA520,
              0 25px 50px -12px rgba(0,0,0,0.8),
              inset 0 2px 4px rgba(255,255,255,0.2),
              inset 0 -2px 4px rgba(0,0,0,0.3)
            `,
            padding: "4px",
          }}
        >
          {/* Inner brass frame */}
          <div
            className="rounded-xl p-4"
            style={{
              background: `
                linear-gradient(180deg,
                  #6B4423 0%,
                  #5D3A1A 20%,
                  #4A2F17 50%,
                  #5D3A1A 80%,
                  #6B4423 100%
                )
              `,
              boxShadow: `
                inset 0 0 0 2px #B8860B,
                inset 0 2px 4px rgba(0,0,0,0.4)
              `,
            }}
          >
            {/* Decorative brass strip - top */}
            <div
              className="h-2 rounded-full mb-4 mx-4"
              style={{
                background: "linear-gradient(180deg, #DAA520 0%, #B8860B 50%, #8B6914 100%)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.4), 0 2px 4px rgba(0,0,0,0.3)",
              }}
            />

            {/* Reel window - cream background with brass frame */}
            <div
              className="relative rounded-xl overflow-hidden"
              style={{
                background: "#FFF8DC",
                boxShadow: `
                  inset 0 4px 12px rgba(0,0,0,0.4),
                  inset 0 -2px 6px rgba(0,0,0,0.2),
                  0 0 0 3px #B8860B,
                  0 0 0 5px #5D3A1A
                `,
                padding: "12px",
              }}
            >
              {/* Glass reflection overlay */}
              <div
                className="absolute inset-0 pointer-events-none z-30"
                style={{
                  background: "linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 50%, rgba(0,0,0,0.05) 100%)",
                }}
              />

              {/* Brass side trim - left */}
              <div
                className="absolute left-0 top-0 bottom-0 w-2"
                style={{
                  background: "linear-gradient(90deg, #DAA520 0%, #B8860B 50%, #8B6914 100%)",
                  boxShadow: "inset -1px 0 2px rgba(0,0,0,0.3), 1px 0 4px rgba(0,0,0,0.2)",
                }}
              />
              {/* Brass side trim - right */}
              <div
                className="absolute right-0 top-0 bottom-0 w-2"
                style={{
                  background: "linear-gradient(90deg, #8B6914 0%, #B8860B 50%, #DAA520 100%)",
                  boxShadow: "inset 1px 0 2px rgba(0,0,0,0.3), -1px 0 4px rgba(0,0,0,0.2)",
                }}
              />

              {/* Win line - brass indicator */}
              <div className="absolute left-2 right-2 top-1/2 -translate-y-1/2 z-20 flex items-center">
                {/* Left arrow indicator */}
                <div
                  style={{
                    width: 0,
                    height: 0,
                    borderTop: "8px solid transparent",
                    borderBottom: "8px solid transparent",
                    borderLeft: "12px solid #DC143C",
                    filter: "drop-shadow(1px 0 2px rgba(0,0,0,0.3))",
                  }}
                />
                <div
                  className="flex-1 h-1 mx-1"
                  style={{
                    background: "#DC143C",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.3)",
                  }}
                />
                {/* Right arrow indicator */}
                <div
                  style={{
                    width: 0,
                    height: 0,
                    borderTop: "8px solid transparent",
                    borderBottom: "8px solid transparent",
                    borderRight: "12px solid #DC143C",
                    filter: "drop-shadow(-1px 0 2px rgba(0,0,0,0.3))",
                  }}
                />
              </div>

              {/* Reels container with brass dividers */}
              <div className="flex relative mx-2">
                {[0, 1, 2].map((reelIndex) => (
                  <React.Fragment key={reelIndex}>
                    <Reel
                      players={reelPlayers}
                      position={reelPositions[reelIndex]}
                      spinning={reelSpinning[reelIndex]}
                      config={config}
                      isWinnerReel={config.winCondition === "middle" && reelIndex === 1}
                    />
                    {/* Brass divider between reels */}
                    {reelIndex < 2 && (
                      <div
                        className="w-2 flex-shrink-0"
                        style={{
                          background: "linear-gradient(90deg, #8B6914 0%, #DAA520 30%, #B8860B 50%, #DAA520 70%, #8B6914 100%)",
                          boxShadow: "inset 0 0 4px rgba(0,0,0,0.4), 0 0 2px rgba(0,0,0,0.2)",
                        }}
                      />
                    )}
                  </React.Fragment>
                ))}
              </div>

              {/* Middle reel WINNER indicator */}
              {config.winCondition === "middle" && (
                <>
                  {/* Spotlight effect on middle - subtle gold tint */}
                  <div
                    className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-full pointer-events-none z-10"
                    style={{
                      background: "linear-gradient(90deg, transparent, rgba(218,165,32,0.08), transparent)",
                    }}
                  />
                  {/* Winner badge - brass plate style */}
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 z-30">
                    <div
                      className="px-3 py-1 rounded text-[10px] font-black tracking-widest"
                      style={{
                        fontFamily: "'Georgia', serif",
                        background: "linear-gradient(180deg, #DAA520 0%, #B8860B 50%, #8B6914 100%)",
                        color: "#3D2914",
                        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.4), 0 2px 4px rgba(0,0,0,0.4)",
                        border: "1px solid #8B6914",
                      }}
                    >
                      ★ WINNER ★
                    </div>
                  </div>
                  {/* Bottom arrow indicator - brass style */}
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 z-30">
                    <div
                      style={{
                        width: 0,
                        height: 0,
                        borderLeft: "8px solid transparent",
                        borderRight: "8px solid transparent",
                        borderBottom: "8px solid #B8860B",
                        filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.3))",
                      }}
                    />
                  </div>
                </>
              )}

              {/* Mechanical shadow at top/bottom of reel window */}
              <div
                className="absolute top-0 left-0 right-0 h-8 pointer-events-none z-25"
                style={{
                  background: "linear-gradient(180deg, rgba(0,0,0,0.4) 0%, transparent 100%)",
                }}
              />
              <div
                className="absolute bottom-0 left-0 right-0 h-8 pointer-events-none z-25"
                style={{
                  background: "linear-gradient(0deg, rgba(0,0,0,0.4) 0%, transparent 100%)",
                }}
              />
            </div>

            {/* Info display - brass plate style */}
            <div
              className="mt-4 mx-4 px-4 py-2 rounded text-center"
              style={{
                background: "linear-gradient(180deg, #DAA520 0%, #B8860B 50%, #8B6914 100%)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.4), inset 0 -1px 0 rgba(0,0,0,0.2), 0 2px 4px rgba(0,0,0,0.3)",
                border: "1px solid #8B6914",
              }}
            >
              <div
                className="text-sm font-bold tracking-wider"
                style={{
                  fontFamily: "'Georgia', serif",
                  color: "#3D2914",
                  textShadow: "0 1px 0 rgba(255,255,255,0.3)",
                }}
              >
                {config.winCondition === "middle" && "CENTER WINS"}
                {config.winCondition === "pair" && "MATCH 2 TO WIN"}
                {config.winCondition === "triple" && "MATCH 3 TO WIN"}
              </div>
            </div>

            {/* Decorative brass strip - bottom */}
            <div
              className="h-2 rounded-full mt-4 mx-4"
              style={{
                background: "linear-gradient(180deg, #DAA520 0%, #B8860B 50%, #8B6914 100%)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.4), 0 2px 4px rgba(0,0,0,0.3)",
              }}
            />

            {/* Spin button - chrome dome style */}
            <div className="mt-6 flex justify-center">
              {/* Brass ring around button */}
              <div
                className="p-1 rounded-full"
                style={{
                  background: "linear-gradient(180deg, #DAA520 0%, #B8860B 50%, #8B6914 100%)",
                  boxShadow: "0 4px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.3)",
                }}
              >
                <button
                  onClick={handleSpin}
                  disabled={isSpinning || reelPlayers.length < 2}
                  className="relative group"
                  style={{
                    background: isSpinning
                      ? "linear-gradient(180deg, #808080 0%, #606060 30%, #404040 70%, #505050 100%)"
                      : "radial-gradient(ellipse at 30% 20%, #E8E8E8 0%, #C0C0C0 30%, #909090 70%, #707070 100%)",
                    padding: "18px 52px",
                    borderRadius: "9999px",
                    border: "none",
                    cursor: isSpinning ? "not-allowed" : "pointer",
                    boxShadow: isSpinning
                      ? "inset 0 4px 8px rgba(0,0,0,0.5), inset 0 -2px 4px rgba(255,255,255,0.1)"
                      : `
                        inset 0 2px 4px rgba(255,255,255,0.6),
                        inset 0 -4px 8px rgba(0,0,0,0.3),
                        0 6px 16px rgba(0,0,0,0.4)
                      `,
                    transform: isSpinning ? "translateY(2px)" : "translateY(0)",
                    transition: "all 0.1s ease",
                  }}
                >
                  <span
                    className="text-xl font-black tracking-wider"
                    style={{
                      fontFamily: "'Georgia', serif",
                      color: isSpinning ? "#505050" : "#3D2914",
                      textShadow: isSpinning
                        ? "none"
                        : "0 1px 0 rgba(255,255,255,0.5), 0 -1px 0 rgba(0,0,0,0.2)",
                    }}
                  >
                    {isSpinning ? "..." : "SPIN"}
                  </span>
                  {/* Chrome highlight on hover */}
                  {!isSpinning && (
                    <div
                      className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{
                        background: "radial-gradient(ellipse at 30% 20%, rgba(255,255,255,0.3) 0%, transparent 60%)",
                      }}
                    />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Lever - vintage chrome and brass style */}
        <div className="absolute -right-16 top-1/2 -translate-y-1/2">
          <button
            onClick={handleSpin}
            disabled={isSpinning || reelPlayers.length < 2}
            className="relative cursor-pointer disabled:cursor-not-allowed group"
          >
            {/* Brass mounting plate */}
            <div
              className="absolute bottom-0 left-1/2 -translate-x-1/2 w-14 h-6 rounded-lg"
              style={{
                background: "linear-gradient(180deg, #DAA520 0%, #B8860B 50%, #8B6914 100%)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.4), 0 3px 8px rgba(0,0,0,0.5)",
                border: "1px solid #8B6914",
              }}
            />
            {/* Chrome lever arm with ball attached */}
            <div
              className={cn(
                "relative w-4 h-28 rounded-full transition-transform duration-200 origin-bottom",
                leverPulled ? "rotate-[40deg]" : "group-hover:rotate-[-8deg]"
              )}
              style={{
                background: "linear-gradient(90deg, #808080 0%, #E8E8E8 30%, #C0C0C0 50%, #E8E8E8 70%, #808080 100%)",
                boxShadow: "2px 0 10px rgba(0,0,0,0.4), inset -1px 0 2px rgba(0,0,0,0.2), inset 1px 0 2px rgba(255,255,255,0.5)",
              }}
            >
              {/* Red ball top - attached to lever arm */}
              <div
                className={cn(
                  "absolute -top-5 left-1/2 -translate-x-1/2 w-12 h-12 rounded-full transition-transform duration-200",
                  leverPulled ? "scale-95" : "group-hover:scale-105",
                )}
                style={{
                  background: "radial-gradient(circle at 30% 30%, #FF6B6B 0%, #DC143C 40%, #8B0000 100%)",
                  boxShadow: `
                    0 4px 12px rgba(139,0,0,0.5),
                    inset 0 2px 6px rgba(255,255,255,0.5),
                    inset 0 -4px 8px rgba(0,0,0,0.4)
                  `,
                  border: "2px solid #8B0000",
                }}
              />
            </div>
          </button>
        </div>
      </div>

      {/* Player count warning */}
      {activePlayers.length < 2 && (
        <p className="text-amber-400 text-sm">Need at least 2 active players to spin!</p>
      )}

      {/* Burned players this session */}
      {sessionBurnedIds.size > 0 && (
        <div className="text-xs text-orange-400/70">
          {sessionBurnedIds.size} player{sessionBurnedIds.size > 1 ? "s" : ""} eliminated this session
        </div>
      )}

      {/* Last winner badge */}
      {winner && !showCelebration && (
        <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-gradient-to-r from-amber-900/50 to-yellow-900/50 border border-yellow-500/30">
          {winner.avatarUrl && (
            <img src={winner.avatarUrl} alt="" className="w-8 h-8 rounded-full border-2 border-yellow-500" />
          )}
          <span className="font-semibold text-yellow-300">{winner.name} {presenterMessage}</span>
        </div>
      )}

      {/* Lucky Spin Burn Animation */}
      {showLuckyBurn && burnedPlayer && (
        <LuckySpinBurn
          player={burnedPlayer}
          onClose={handleLuckyBurnClose}
        />
      )}

      {/* Bonus Announcement */}
      {showBonusAnnouncement && (
        <BonusAnnouncement
          players={bonusPlayers}
          onClose={handleBonusAnnouncementClose}
        />
      )}

      {/* Celebration modal */}
      {showCelebration && winner && (
        <CelebrationModal
          winner={winner}
          presenterMessage={presenterMessage}
          isTripleWin={isTripleWin}
          bonusPoints={bonusPoints}
          symbolSize={config.symbolSize}
          onClose={handleCelebrationClose}
        />
      )}
    </div>
  )
}

// Lucky Spin Burn Animation - player gets eliminated!
function LuckySpinBurn({
  player,
  onClose,
}: {
  player: PlayerProfile
  onClose: () => void
}) {
  const [burnPhase, setBurnPhase] = useState(0)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    // Phase 1: Show announcement
    const t1 = setTimeout(() => setBurnPhase(1), 500)
    // Phase 2: Start burn
    const t2 = setTimeout(() => setBurnPhase(2), 1500)
    // Phase 3: Fully burned
    const t3 = setTimeout(() => setBurnPhase(3), 2500)
    // Close
    const t4 = setTimeout(() => onCloseRef.current(), 4000)

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
      clearTimeout(t4)
    }
  }, [])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Fire particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {burnPhase >= 2 && Array.from({ length: 40 }).map((_, i) => (
          <div
            key={i}
            className="absolute animate-float"
            style={{
              left: `${40 + Math.random() * 20}%`,
              bottom: `${20 + Math.random() * 30}%`,
              width: 8 + Math.random() * 16,
              height: 20 + Math.random() * 30,
              background: `linear-gradient(to top, #ff4500 0%, #ff8c00 50%, #ffd700 100%)`,
              borderRadius: "50% 50% 20% 20%",
              opacity: 0.8,
              animation: `floatUp ${1 + Math.random() * 2}s ease-out forwards`,
              animationDelay: `${Math.random() * 0.5}s`,
              filter: "blur(2px)",
            }}
          />
        ))}
      </div>

      {/* Ember particles */}
      {burnPhase >= 2 && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {Array.from({ length: 30 }).map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full"
              style={{
                left: `${35 + Math.random() * 30}%`,
                top: `${40 + Math.random() * 20}%`,
                width: 3 + Math.random() * 5,
                height: 3 + Math.random() * 5,
                background: Math.random() > 0.5 ? "#ff6b35" : "#ffd700",
                animation: `ember ${2 + Math.random() * 2}s ease-out forwards`,
                animationDelay: `${Math.random() * 1}s`,
              }}
            />
          ))}
        </div>
      )}

      {/* Main card */}
      <div
        className="relative p-8 rounded-2xl text-center"
        style={{
          background: "linear-gradient(135deg, #1a0a00 0%, #3d1c00 50%, #1a0a00 100%)",
          border: "4px solid #ff4500",
          boxShadow: burnPhase >= 2
            ? "0 0 80px rgba(255,69,0,0.8), inset 0 0 40px rgba(255,140,0,0.3)"
            : "0 0 40px rgba(255,69,0,0.4)",
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Lucky Spin banner */}
        <div className="absolute -top-6 left-1/2 -translate-x-1/2 px-6 py-2 bg-gradient-to-r from-orange-600 via-yellow-500 to-orange-600 rounded-full border-4 border-red-600">
          <span className="text-red-900 font-black text-2xl">LUCKY SPIN!</span>
        </div>

        <div className="mt-4">
          <div className="text-4xl mb-4">🍀🔥🍀</div>

          {/* Player avatar with burn effect */}
          <div className="relative inline-block">
            {player.avatarUrl ? (
              <img
                src={player.avatarUrl}
                alt={player.name}
                className={cn(
                  "w-28 h-28 rounded-full border-4 shadow-xl transition-all duration-1000",
                  burnPhase >= 2 ? "border-orange-500 opacity-50 scale-90" : "border-yellow-500",
                  burnPhase >= 3 && "opacity-0 scale-50"
                )}
                style={{
                  filter: burnPhase >= 2 ? "sepia(100%) saturate(300%) brightness(70%) contrast(150%)" : "none",
                }}
              />
            ) : (
              <div
                className={cn(
                  "w-28 h-28 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-4xl font-bold text-white border-4 transition-all duration-1000",
                  burnPhase >= 2 ? "border-orange-500 opacity-50 scale-90" : "border-yellow-500",
                  burnPhase >= 3 && "opacity-0 scale-50"
                )}
              >
                {player.name.charAt(0).toUpperCase()}
              </div>
            )}

            {/* Fire overlay on avatar */}
            {burnPhase >= 2 && (
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  background: "radial-gradient(circle, transparent 30%, rgba(255,69,0,0.6) 70%, rgba(255,140,0,0.8) 100%)",
                  animation: "pulse 0.3s ease-in-out infinite",
                }}
              />
            )}

            {/* Ash particles */}
            {burnPhase >= 3 && (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-6xl animate-bounce">💨</span>
              </div>
            )}
          </div>

          <h2 className={cn(
            "text-2xl font-black mt-4 transition-all duration-500",
            burnPhase >= 3 ? "text-gray-500 line-through" : "text-orange-400"
          )}>
            {player.name}
          </h2>

          <p className="text-lg text-orange-200/80 mt-2">
            {burnPhase < 2 && "Triple match! Too lucky..."}
            {burnPhase === 2 && "Burning away..."}
            {burnPhase >= 3 && "Eliminated! Re-rolling..."}
          </p>

          <p className="text-sm text-orange-500/60 mt-6">
            {burnPhase >= 3 ? "Spinning again without them..." : "Click anywhere to skip"}
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes floatUp {
          0% {
            transform: translateY(0) scale(1);
            opacity: 0.8;
          }
          100% {
            transform: translateY(-200px) scale(0.5);
            opacity: 0;
          }
        }
        @keyframes ember {
          0% {
            transform: translate(0, 0) scale(1);
            opacity: 1;
          }
          100% {
            transform: translate(${Math.random() > 0.5 ? '' : '-'}${50 + Math.random() * 100}px, -${100 + Math.random() * 150}px) scale(0);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  )
}

// Bonus round announcement - vintage casino style
function BonusAnnouncement({
  players,
  onClose,
}: {
  players: PlayerProfile[]
  onClose: () => void
}) {
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    const timer = setTimeout(() => onCloseRef.current(), 3000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Gold sparkle effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 30 }).map((_, i) => (
          <div
            key={i}
            className="absolute animate-ping"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              width: 4 + Math.random() * 8,
              height: 4 + Math.random() * 8,
              background: "#FFD700",
              borderRadius: "50%",
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${1 + Math.random()}s`,
            }}
          />
        ))}
      </div>

      {/* Vintage announcement card */}
      <div
        className="relative p-8 rounded-xl animate-winner-pop text-center"
        style={{
          background: "linear-gradient(180deg, #722F37 0%, #4A1F25 100%)",
          border: "4px solid #B8860B",
          boxShadow: `
            0 0 0 2px #5D3A1A,
            0 0 0 6px #DAA520,
            0 10px 40px rgba(0,0,0,0.5)
          `,
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Brass plate banner */}
        <div
          className="absolute -top-5 left-1/2 -translate-x-1/2 px-6 py-2 rounded"
          style={{
            background: "linear-gradient(180deg, #DAA520 0%, #B8860B 50%, #8B6914 100%)",
            border: "2px solid #8B6914",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.4), 0 3px 8px rgba(0,0,0,0.4)",
          }}
        >
          <span
            className="font-black text-xl"
            style={{
              fontFamily: "'Georgia', serif",
              color: "#3D2914",
              textShadow: "0 1px 0 rgba(255,255,255,0.3)",
            }}
          >
            BONUS ROUND!
          </span>
        </div>

        <div className="mt-4">
          {/* Classic 7s instead of emoji */}
          <div
            className="text-5xl mb-4 font-black"
            style={{
              color: "#FFD700",
              textShadow: "2px 2px 0 #8B6914",
              fontFamily: "'Georgia', serif",
            }}
          >
            7 VS 7
          </div>

          <p
            className="text-lg mb-6"
            style={{
              fontFamily: "'Georgia', serif",
              color: "#FFFDD0",
            }}
          >
            Double match! Head-to-head showdown:
          </p>

          <div className="flex items-center justify-center gap-6">
            {players.map((player, i) => (
              <React.Fragment key={player.id}>
                <div className="flex flex-col items-center">
                  {player.avatarUrl ? (
                    <img
                      src={player.avatarUrl}
                      alt={player.name}
                      className="w-20 h-20 rounded-full shadow-xl"
                      style={{
                        border: "4px solid #B8860B",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
                      }}
                    />
                  ) : (
                    <div
                      className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold"
                      style={{
                        background: "linear-gradient(135deg, #DC143C 0%, #8B0000 100%)",
                        color: "#FFD700",
                        border: "4px solid #B8860B",
                        fontFamily: "'Georgia', serif",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
                      }}
                    >
                      {player.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span
                    className="mt-2 font-bold text-lg"
                    style={{
                      fontFamily: "'Georgia', serif",
                      color: "#FFFDD0",
                    }}
                  >
                    {player.name}
                  </span>
                </div>
                {i === 0 && (
                  <div
                    className="text-4xl font-black"
                    style={{
                      color: "#FFD700",
                      fontFamily: "'Georgia', serif",
                      textShadow: "2px 2px 0 #8B6914",
                    }}
                  >
                    VS
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>

          <p
            className="text-sm mt-6"
            style={{
              color: "#D2B48C",
              fontFamily: "'Georgia', serif",
            }}
          >
            Get ready...
          </p>
        </div>
      </div>
    </div>
  )
}

// Individual reel component
function Reel({
  players,
  position,
  spinning,
  config,
  isWinnerReel = false,
}: {
  players: PlayerProfile[]
  position: number
  spinning: boolean
  config: SlotMachineConfig
  isWinnerReel?: boolean
}) {
  const reelRef = useRef<HTMLDivElement>(null)
  const [offset, setOffset] = useState(0)
  const animationRef = useRef<number | null>(null)
  const speedRef = useRef(0)

  const extendedPlayers = useMemo(() => {
    if (players.length === 0) return []
    const extended: PlayerProfile[] = []
    for (let i = 0; i < Math.max(20, players.length * 4); i++) {
      extended.push(players[i % players.length])
    }
    return extended
  }, [players])

  useEffect(() => {
    if (spinning) {
      speedRef.current = 30 + Math.random() * 10
      let lastTime = performance.now()

      const animate = (time: number) => {
        const delta = time - lastTime
        lastTime = time

        setOffset(prev => {
          const newOffset = prev + speedRef.current * (delta / 16)
          const itemHeight = config.symbolSize + 8
          const totalHeight = players.length * itemHeight
          return newOffset % totalHeight
        })

        animationRef.current = requestAnimationFrame(animate)
      }

      animationRef.current = requestAnimationFrame(animate)

      return () => {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current)
        }
      }
    } else {
      const itemHeight = config.symbolSize + 8
      setOffset(position * itemHeight)
    }
  }, [spinning, position, players.length, config.symbolSize])

  const itemHeight = config.symbolSize + 8
  const visibleCount = 3

  if (players.length === 0) {
    return (
      <div
        className="relative overflow-hidden rounded flex items-center justify-center"
        style={{
          width: config.symbolSize + 16,
          height: itemHeight * visibleCount,
          background: "linear-gradient(180deg, #FFF8DC 0%, #FFFDD0 50%, #FFF8DC 100%)",
        }}
      >
        <span className="text-amber-800 text-xs">No players</span>
      </div>
    )
  }

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded",
        isWinnerReel && "ring-2 ring-amber-600"
      )}
      style={{
        width: config.symbolSize + 16,
        height: itemHeight * visibleCount,
        // Cream/ivory background like classic slot machine reels
        background: isWinnerReel
          ? "linear-gradient(180deg, #FFFACD 0%, #FFF8DC 50%, #FFFACD 100%)"
          : "linear-gradient(180deg, #FFF8DC 0%, #FFFDD0 50%, #FFF8DC 100%)",
        boxShadow: isWinnerReel
          ? "inset 0 0 20px rgba(184,134,11,0.2)"
          : "inset 0 2px 4px rgba(0,0,0,0.1)",
      }}
    >
      {/* Top shadow for mechanical depth */}
      <div
        className="absolute top-0 left-0 right-0 h-12 z-10 pointer-events-none"
        style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.25) 0%, transparent 100%)" }}
      />
      {/* Bottom shadow */}
      <div
        className="absolute bottom-0 left-0 right-0 h-12 z-10 pointer-events-none"
        style={{ background: "linear-gradient(0deg, rgba(0,0,0,0.25) 0%, transparent 100%)" }}
      />

      <div
        ref={reelRef}
        className="absolute left-0 right-0"
        style={{
          transform: `translateY(${-offset + itemHeight}px)`,
          transition: spinning ? "none" : "transform 0.3s cubic-bezier(0.17, 0.67, 0.12, 1.2)",
        }}
      >
        {extendedPlayers.map((player, i) => (
          <div
            key={`${player.id}-${i}`}
            className="flex flex-col items-center justify-center p-1"
            style={{ height: itemHeight }}
          >
            {/* Symbol card with brass frame */}
            <div
              className="rounded overflow-hidden shadow-md"
              style={{
                width: config.symbolSize - 8,
                height: config.symbolSize - 8,
                background: "#FFFFF0",
                border: "3px solid #B8860B",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.5), 0 2px 4px rgba(0,0,0,0.2)",
              }}
            >
              {player.avatarUrl ? (
                <img
                  src={player.avatarUrl}
                  alt={player.name}
                  className="w-full h-full object-cover"
                  draggable={false}
                />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center font-bold text-2xl"
                  style={{
                    background: "linear-gradient(135deg, #DC143C 0%, #8B0000 100%)",
                    color: "#FFD700",
                    fontFamily: "'Georgia', serif",
                    textShadow: "1px 1px 2px rgba(0,0,0,0.5)",
                  }}
                >
                  {player.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Win line highlight - brass style */}
      <div
        className="absolute left-0 right-0 top-1/2 -translate-y-1/2 pointer-events-none z-5"
        style={{
          height: itemHeight,
          background: "linear-gradient(90deg, transparent, rgba(184,134,11,0.08), transparent)",
          borderTop: "1px solid rgba(184,134,11,0.4)",
          borderBottom: "1px solid rgba(184,134,11,0.4)",
        }}
      />
    </div>
  )
}

// Celebration modal - full screen dramatic reveal
function CelebrationModal({
  winner,
  presenterMessage,
  isTripleWin,
  bonusPoints,
  symbolSize,
  onClose,
}: {
  winner: PlayerProfile
  presenterMessage: string
  isTripleWin: boolean
  bonusPoints: number
  symbolSize: number
  onClose: () => void
}) {
  const [phase, setPhase] = useState(0)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  // Scale factor based on symbolSize (150 is the default)
  const scale = symbolSize / 150

  // Responsive sizes
  const avatarSize = Math.round(160 * scale)
  const avatarInitialFontSize = Math.round(48 * scale) // text-6xl equivalent
  const bannerFontSize = Math.round(48 * scale) // text-5xl equivalent  
  const nameFontSizeLarge = Math.round(56 * scale) // 3.5rem equivalent
  const nameFontSizeSmall = Math.round(32 * scale) // 2rem equivalent
  const presenterFontSize = Math.round(24 * scale) // text-2xl equivalent
  const bonusFontSize = Math.round(20 * scale) // text-xl equivalent

  useEffect(() => {
    // Phase 1: Avatar zoom in
    const t1 = setTimeout(() => setPhase(1), 100)
    // Phase 2: Name reveal
    const t2 = setTimeout(() => setPhase(2), 600)
    // Phase 3: Full celebration
    const t3 = setTimeout(() => setPhase(3), 1000)
    // Close
    const t4 = setTimeout(() => onCloseRef.current(), 4000)

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
      clearTimeout(t4)
    }
  }, [])

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden"
      onClick={onClose}
      style={{
        background: `
          radial-gradient(ellipse at center, rgba(255,253,208,0.95) 0%, rgba(218,165,32,0.9) 50%, rgba(139,69,19,0.95) 100%)
        `,
      }}
    >
      {/* Vintage curtain pattern overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            repeating-linear-gradient(
              90deg,
              transparent 0px,
              transparent 80px,
              rgba(114,47,55,0.1) 80px,
              rgba(114,47,55,0.1) 82px
            ),
            repeating-linear-gradient(
              0deg,
              transparent 0px,
              transparent 80px,
              rgba(184,134,11,0.15) 80px,
              rgba(184,134,11,0.15) 82px
            )
          `,
        }}
      />

      {/* Radial spotlight effect */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(circle at 50% 40%, rgba(255,215,0,0.3) 0%, transparent 50%)
          `,
        }}
      />

      {/* Decorative corner flourishes */}
      {["top-4 left-4", "top-4 right-4 scale-x-[-1]", "bottom-4 left-4 scale-y-[-1]", "bottom-4 right-4 scale-[-1]"].map((pos, i) => (
        <div
          key={i}
          className={`absolute ${pos} pointer-events-none`}
          style={{
            width: 80,
            height: 80,
            borderLeft: "4px solid #B8860B",
            borderTop: "4px solid #B8860B",
            borderRadius: "8px 0 0 0",
            opacity: phase >= 1 ? 1 : 0,
            transition: "opacity 0.5s",
          }}
        />
      ))}

      {/* Marquee border with bulbs */}
      <div
        className="absolute inset-8 pointer-events-none rounded-lg z-10"
        style={{
          border: "6px solid #B8860B",
          boxShadow: "inset 0 0 20px rgba(139,69,19,0.3), 0 0 30px rgba(184,134,11,0.2)",
        }}
      >
        {/* Incandescent bulbs around border */}
        {Array.from({ length: 40 }).map((_, i) => {
          const isLit = (i + Math.floor(phase)) % 3 !== 0
          const perimeter = 2 * (100 - 8) + 2 * (100 - 8)
          const position = (i / 40) * perimeter
          let x, y
          const w = 100 - 16
          const h = 100 - 16
          if (position < w) {
            x = 8 + position
            y = 8
          } else if (position < w + h) {
            x = 100 - 8
            y = 8 + (position - w)
          } else if (position < 2 * w + h) {
            x = 100 - 8 - (position - w - h)
            y = 100 - 8
          } else {
            x = 8
            y = 100 - 8 - (position - 2 * w - h)
          }
          return (
            <div
              key={i}
              className="absolute rounded-full"
              style={{
                left: `${x}%`,
                top: `${y}%`,
                transform: "translate(-50%, -50%)",
                width: 10,
                height: 10,
                background: isLit
                  ? "radial-gradient(circle at 30% 30%, #FFF8DC 0%, #FFE4B5 50%, #DAA520 100%)"
                  : "#D2B48C",
                boxShadow: isLit ? "0 0 8px #FFE4B5, 0 0 16px rgba(255,215,0,0.4)" : "none",
                transition: "all 0.3s",
              }}
            />
          )
        })}
      </div>

      {/* Gold coin confetti */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-20">
        {phase >= 3 && Array.from({ length: 60 }).map((_, i) => (
          <div
            key={i}
            className="absolute animate-confetti-fall"
            style={{
              left: `${Math.random() * 100}%`,
              top: -30,
              width: 12 + Math.random() * 20,
              height: 12 + Math.random() * 20,
              background: i % 3 === 0
                ? `radial-gradient(circle at 30% 30%, #FFD700 0%, #DAA520 50%, #B8860B 100%)`
                : i % 3 === 1
                  ? `radial-gradient(circle at 30% 30%, #DC143C 0%, #8B0000 100%)`
                  : `radial-gradient(circle at 30% 30%, #E8E8E8 0%, #C0C0C0 50%, #808080 100%)`,
              borderRadius: "50%",
              boxShadow: "inset -2px -2px 4px rgba(0,0,0,0.3), inset 2px 2px 4px rgba(255,255,255,0.5)",
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${3 + Math.random() * 3}s`,
            }}
          />
        ))}
      </div>

      {/* Sparkle bursts */}
      {phase >= 2 && (
        <div className="absolute inset-0 pointer-events-none z-20">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className="absolute animate-ping"
              style={{
                left: `${20 + Math.random() * 60}%`,
                top: `${20 + Math.random() * 60}%`,
                width: 4 + Math.random() * 8,
                height: 4 + Math.random() * 8,
                background: "#FFD700",
                borderRadius: "50%",
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${1 + Math.random()}s`,
              }}
            />
          ))}
        </div>
      )}

      {/* Main content */}
      <div className="relative z-50 flex flex-col items-center text-center px-8">
        {/* Winner banner at top */}
        <div
          className="mb-8 transition-all duration-700"
          style={{
            opacity: phase >= 1 ? 1 : 0,
            transform: phase >= 1 ? "translateY(0) scale(1)" : "translateY(-30px) scale(0.8)",
          }}
        >
          <div
            className="rounded-lg relative"
            style={{
              padding: `${Math.round(16 * scale)}px ${Math.round(48 * scale)}px`,
              background: "linear-gradient(180deg, #722F37 0%, #4A1F25 100%)",
              border: "4px solid #B8860B",
              boxShadow: `
                0 0 0 2px #5D3A1A,
                0 0 0 6px #DAA520,
                0 8px 32px rgba(0,0,0,0.5),
                inset 0 2px 4px rgba(255,255,255,0.1)
              `,
            }}
          >
            <h1
              className="font-black tracking-wider"
              style={{
                fontSize: bannerFontSize,
                fontFamily: "'Georgia', serif",
                color: "#FFD700",
                textShadow: "2px 2px 0 #8B6914, 0 0 30px rgba(255,215,0,0.5)",
              }}
            >
              {isTripleWin ? "★ JACKPOT ★" : "★ WINNER ★"}
            </h1>
          </div>
        </div>

        {/* Bonus badge */}
        {bonusPoints > 0 && phase >= 2 && (
          <div
            className="mb-4 rounded-full animate-bounce"
            style={{
              padding: `${Math.round(8 * scale)}px ${Math.round(24 * scale)}px`,
              background: "linear-gradient(180deg, #DC143C 0%, #8B0000 100%)",
              border: "3px solid #FFD700",
              boxShadow: "0 0 30px rgba(220,20,60,0.6), 0 4px 12px rgba(0,0,0,0.4)",
            }}
          >
            <span
              className="font-black"
              style={{ fontSize: bonusFontSize, color: "#FFD700", fontFamily: "'Georgia', serif" }}
            >
              +{bonusPoints} BONUS!
            </span>
          </div>
        )}

        {/* Avatar - large and dramatic */}
        <div
          className="relative transition-all duration-500 ease-out"
          style={{
            transform: phase >= 1 ? "scale(1)" : "scale(0.3)",
            opacity: phase >= 1 ? 1 : 0,
          }}
        >
          {/* Glow ring behind avatar */}
          <div
            className="absolute inset-0 rounded-full"
            style={{
              transform: "scale(1.3)",
              background: "radial-gradient(circle, rgba(255,215,0,0.4) 0%, transparent 70%)",
              filter: "blur(20px)",
            }}
          />
          {/* Brass ornate frame */}
          <div
            className="relative rounded-full"
            style={{
              padding: Math.round(8 * scale),
              background: "linear-gradient(135deg, #DAA520 0%, #B8860B 50%, #8B6914 100%)",
              boxShadow: `
                0 0 ${Math.round(60 * scale)}px rgba(255,215,0,0.5),
                inset 0 2px 4px rgba(255,255,255,0.4),
                0 8px 32px rgba(0,0,0,0.5)
              `,
            }}
          >
            {winner.avatarUrl ? (
              <img
                src={winner.avatarUrl}
                alt={winner.name}
                className="rounded-full object-cover"
                style={{
                  width: avatarSize,
                  height: avatarSize,
                  border: `${Math.round(4 * scale)}px solid #5D3A1A`,
                }}
              />
            ) : (
              <div
                className="rounded-full flex items-center justify-center font-bold"
                style={{
                  width: avatarSize,
                  height: avatarSize,
                  fontSize: avatarInitialFontSize,
                  background: "linear-gradient(135deg, #DC143C 0%, #8B0000 100%)",
                  color: "#FFD700",
                  border: `${Math.round(4 * scale)}px solid #5D3A1A`,
                  fontFamily: "'Georgia', serif",
                }}
              >
                {winner.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

        </div>

        {/* Name - dramatic reveal */}
        <h2
          className="font-black transition-all duration-500"
          style={{
            marginTop: Math.round(32 * scale),
            fontFamily: "'Georgia', serif",
            fontSize: phase >= 2 ? nameFontSizeLarge : nameFontSizeSmall,
            color: "#5D3A1A",
            textShadow: "0 0 30px rgba(255,215,0,0.6), 1px 1px 0 #B8860B, -1px -1px 0 rgba(255,255,255,0.5)",
            opacity: phase >= 2 ? 1 : 0,
            transform: phase >= 2 ? "translateY(0)" : "translateY(20px)",
          }}
        >
          {winner.name}
        </h2>

        {/* Presenter message */}
        <p
          className="transition-all duration-500"
          style={{
            marginTop: Math.round(16 * scale),
            fontSize: presenterFontSize,
            fontFamily: "'Georgia', serif",
            color: "#722F37",
            textShadow: "1px 1px 0 rgba(255,255,255,0.5)",
            opacity: phase >= 3 ? 1 : 0,
            transform: phase >= 3 ? "translateY(0)" : "translateY(10px)",
          }}
        >
          {presenterMessage}
        </p>

        {/* Click to continue */}
        <p
          className="mt-12 text-sm transition-opacity duration-500"
          style={{
            color: "rgba(93,58,26,0.6)",
            opacity: phase >= 3 ? 1 : 0,
          }}
        >
          Click anywhere to continue
        </p>
      </div>

      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
