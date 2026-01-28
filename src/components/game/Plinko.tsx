"use client"

import { useRef, useState, useEffect, useCallback, useMemo } from "react"
import { GameLayout, SidebarToggle } from "./layout/GameLayout"
import { PlayerSidebar, PlayerManager } from "./shared"
import { PlinkoGame } from "./plinko/PlinkoGame"
import { PlinkoControls } from "./plinko/PlinkoControls"
import { PlinkoConfigPanel } from "./plinko/PlinkoConfigPanel"
import { PlinkoLeaderboard } from "./plinko/PlinkoLeaderboard"
import { WinCelebration } from "./plinko/WinCelebration"
import { TiebreakerAnnouncement } from "./plinko/TiebreakerAnnouncement"
import { defaultConfig, type PlinkoConfig, type PlayerProfile } from "./plinko/types"
import { WheelSpinGame, WheelSpinConfigPanel, defaultWheelSpinConfig, type WheelSpinConfig } from "./wheelspin"
import { SlotMachineGame, SlotMachineConfigPanel, defaultSlotMachineConfig, type SlotMachineConfig } from "./slotmachine"
import { RouletteGame, RouletteConfigPanel, defaultRouletteConfig, type RouletteConfig } from "./roulette"
import { RaceGame, RaceConfigPanel, defaultRaceConfig, type RaceConfig } from "./race"
import { type GameType } from "./types"

const playerStorageKey = "plinko.players.v2"
const configStorageKey = "plinko.config.v1"
const initialBoardScale = 0.6 // proportion of viewport for initial board size

// API helpers with localStorage fallback
async function loadPlayersFromAPI(): Promise<PlayerProfile[] | null> {
  try {
    const response = await fetch("/api/plinko/players")
    if (!response.ok) return null
    const data = await response.json()
    if (data.fallback === true) return null
    return data.players
  } catch {
    return null
  }
}

async function savePlayersToAPI(players: PlayerProfile[]): Promise<boolean> {
  try {
    const response = await fetch("/api/plinko/players", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ players })
    })
    if (!response.ok) return false
    const data = await response.json()
    return data.fallback !== true && data.success === true
  } catch {
    return false
  }
}

async function loadConfigFromAPI(): Promise<Partial<PlinkoConfig> | null> {
  try {
    const response = await fetch("/api/plinko/config")
    if (!response.ok) return null
    const data = await response.json()
    if (data.fallback === true) return null
    return data.config
  } catch {
    return null
  }
}

async function saveConfigToAPI(config: PlinkoConfig): Promise<boolean> {
  try {
    const response = await fetch("/api/plinko/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ config })
    })
    if (!response.ok) return false
    const data = await response.json()
    return data.fallback !== true && data.success === true
  } catch {
    return false
  }
}

const makePlayerId = (): string =>
  `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`

const defaultPlayers: PlayerProfile[] = [
  { id: makePlayerId(), name: "Alberto", wins: 0, active: true, avatarUrl: "https://ca.slack-edge.com/T08U86VNU-U07CS78N83E-75c562954cec-512" },
  { id: makePlayerId(), name: "Cache", wins: 0, active: true, avatarUrl: "https://ca.slack-edge.com/T08U86VNU-UJTV9CALF-1f9a6157e910-512" },
  { id: makePlayerId(), name: "Daniel", wins: 0, active: true, avatarUrl: "https://ca.slack-edge.com/T08U86VNU-U04UZ5RR5RU-6b08814bab5f-512" },
  { id: makePlayerId(), name: "Elizabeth", wins: 0, active: true, avatarUrl: "https://ca.slack-edge.com/T08U86VNU-U08J7A4HL20-969440ad060f-512" },
  { id: makePlayerId(), name: "Fari", wins: 0, active: true, avatarUrl: "https://ca.slack-edge.com/T08U86VNU-U04T9PY41P1-d15c814fd4e2-512" },
  { id: makePlayerId(), name: "Jared", wins: 0, active: true, avatarUrl: "https://ca.slack-edge.com/T08U86VNU-U075CGCJP8V-3dce62562a1a-512" },
  { id: makePlayerId(), name: "Jon", wins: 0, active: true, avatarUrl: "https://ca.slack-edge.com/T08U86VNU-U02E91B4U66-1b9a90423a90-512" },
  { id: makePlayerId(), name: "Madison", wins: 0, active: true, avatarUrl: "https://ca.slack-edge.com/T08U86VNU-U026T9FAGQ7-90a4aaa8f62c-512" },
  { id: makePlayerId(), name: "Matt", wins: 0, active: true, avatarUrl: "https://ca.slack-edge.com/T08U86VNU-U8U5ANCF8-3bfdde800605-512" },
  { id: makePlayerId(), name: "Michael", wins: 0, active: true, avatarUrl: "https://ca.slack-edge.com/T08U86VNU-U019XM6PTJA-430d597450fe-512" },
  { id: makePlayerId(), name: "Paul", wins: 0, active: true, avatarUrl: "https://ca.slack-edge.com/T08U86VNU-U08U8DPR9-03d672ef101c-512" },
  { id: makePlayerId(), name: "RJ", wins: 0, active: true, avatarUrl: "https://ca.slack-edge.com/T08U86VNU-U0990R1S6-b47fdae676a6-192" },
  { id: makePlayerId(), name: "Sam", wins: 0, active: true, avatarUrl: "https://ca.slack-edge.com/T08U86VNU-U01DXBN6A3S-8720534b422b-512" },
  { id: makePlayerId(), name: "William", wins: 0, active: true, avatarUrl: "https://ca.slack-edge.com/T08U86VNU-U0ABCTX5H-g37aa34e7410-192" },
].map(player => ({ ...player, archived: false }))

const defaultAvatarByName = new Map(
  defaultPlayers
    .filter(player => player.avatarUrl != null && player.avatarUrl.trim() !== "")
    .map(player => [player.name.toLowerCase(), player.avatarUrl as string])
)

const normalizePlayers = (profiles: PlayerProfile[]): PlayerProfile[] =>
  profiles.map(profile => ({
    ...profile,
    archived: profile.archived ?? false
  }))

const applyDefaultAvatars = (profiles: PlayerProfile[]): PlayerProfile[] =>
  normalizePlayers(profiles).map(profile => {
    if (profile.avatarUrl != null && profile.avatarUrl.trim() !== "") {
      return profile
    }
    const defaultAvatar = defaultAvatarByName.get(profile.name.toLowerCase())
    if (defaultAvatar == null) return profile
    return { ...profile, avatarUrl: defaultAvatar }
  })

export interface PlinkoProps {
  initialConfig?: PlinkoConfig
}

function getResponsiveBoardSize(): { width: number; height: number } {
  const targetWidth = Math.round(window.innerWidth * initialBoardScale)
  const targetHeight = Math.round(window.innerHeight * Math.min(.7, initialBoardScale * 1.2)) // Side panels allow board height to exceed width
  
  // Clamp to config slider ranges (width: 300-1000, height: 300-800)
  const width = Math.max(300, Math.min(1000, targetWidth))
  const height = Math.max(300, Math.min(800, targetHeight))
  
  return { width, height }
}

export function Plinko({ initialConfig }: PlinkoProps) {
  // UI State
  const [started, setStarted] = useState(false)
  const [showConfig, setShowConfig] = useState(false)
  const [showPlayerManager, setShowPlayerManager] = useState(false)
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(false)
  const [rightSidebarOpen, setRightSidebarOpen] = useState(false)
  const [playerSearchQuery, setPlayerSearchQuery] = useState("")
  const [boardKey, setBoardKey] = useState(0)
  const [currentGame, setCurrentGame] = useState<GameType>("plinko")

  // Game State - start with defaults, then apply responsive size on mount
  const [config, setConfig] = useState<PlinkoConfig>(initialConfig ?? defaultConfig)
  const [wheelSpinConfig, setWheelSpinConfig] = useState<WheelSpinConfig>(defaultWheelSpinConfig)
  const [slotMachineConfig, setSlotMachineConfig] = useState<SlotMachineConfig>(defaultSlotMachineConfig)
  const [rouletteConfig, setRouletteConfig] = useState<RouletteConfig>(defaultRouletteConfig)
  const [raceConfig, setRaceConfig] = useState<RaceConfig>(defaultRaceConfig)
  
  // Track if we've applied responsive sizing (only do it once on mount)
  const hasAppliedResponsiveSizeRef = useRef(false)
  
  // Apply responsive board size on mount (client-side only, avoids hydration mismatch)
  useEffect(() => {
    if (hasAppliedResponsiveSizeRef.current) return
    hasAppliedResponsiveSizeRef.current = true
    
    // Only apply if no initialConfig was provided with explicit dimensions
    if (initialConfig?.width && initialConfig?.height) return
    
    const responsiveSize = getResponsiveBoardSize()
    setConfig(prev => ({
      ...prev,
      width: responsiveSize.width,
      height: responsiveSize.height,
    }))
  }, [])
  const [players, setPlayers] = useState<PlayerProfile[]>(defaultPlayers)
  const [draftPlayers, setDraftPlayers] = useState<PlayerProfile[]>(defaultPlayers)
  const [playersDirty, setPlayersDirty] = useState(false)
  const [bucketAssignments, setBucketAssignments] = useState<string[]>([])
  const [roundWinnerBuckets, setRoundWinnerBuckets] = useState<number[]>([])
  const [showWinCelebration, setShowWinCelebration] = useState(false)
  const [showTiebreaker, setShowTiebreaker] = useState(false)
  const [tiebreakerRound, setTiebreakerRound] = useState(0)
  const [soundEnabled, setSoundEnabled] = useState(true)

  // Save/Load State
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [uploadingPlayerId, setUploadingPlayerId] = useState<string | null>(null)

  // Refs
  const hasStartedOnceRef = useRef(false)
  const allowWinCountRef = useRef(false)

  // Computed values
  const visiblePlayers = useMemo(
    () => players.filter(p => p.archived !== true),
    [players]
  )

  const enrolledPlayers = useMemo(
    () => players.filter(p => p.active && p.archived !== true),
    [players]
  )

  const derivedBucketCount = Math.max(2, enrolledPlayers.length)

  // Sync bucket count with enrolled players
  useEffect(() => {
    if (config.bucketCount !== derivedBucketCount) {
      setConfig(prev => ({ ...prev, bucketCount: derivedBucketCount }))
    }
  }, [derivedBucketCount, config.bucketCount])

  // Assign buckets to players
  const assignBuckets = useCallback((activePlayers: PlayerProfile[]) => {
    if (activePlayers.length === 0) {
      setBucketAssignments([])
      return
    }
    const shuffled = [...activePlayers].sort(() => Math.random() - 0.5)
    setBucketAssignments(shuffled.map(p => p.id))
  }, [])

  // Reassign buckets when enrolled players change
  useEffect(() => {
    assignBuckets(enrolledPlayers)
  }, [assignBuckets, enrolledPlayers.map(p => p.id).join("|")])

  // Load players from API/localStorage on mount
  useEffect(() => {
    async function loadPlayers() {
      const apiPlayers = await loadPlayersFromAPI()
      if (apiPlayers && Array.isArray(apiPlayers) && apiPlayers.length > 0) {
        const seeded = applyDefaultAvatars(apiPlayers.length >= 2 ? apiPlayers : [...apiPlayers, ...defaultPlayers.slice(0, 2 - apiPlayers.length)])
        setPlayers(seeded)
        setDraftPlayers(seeded)
        return
      }

      try {
        const stored = localStorage.getItem(playerStorageKey)
        if (stored) {
          const parsed = JSON.parse(stored) as PlayerProfile[]
          if (Array.isArray(parsed) && parsed.length > 0) {
            const seeded = applyDefaultAvatars(parsed.length >= 2 ? parsed : [...parsed, ...defaultPlayers.slice(0, 2 - parsed.length)])
            setPlayers(seeded)
            setDraftPlayers(seeded)
            return
          }
        }
      } catch {}

      // Default
      setPlayers(applyDefaultAvatars(defaultPlayers))
      setDraftPlayers(applyDefaultAvatars(defaultPlayers))
    }
    loadPlayers()
  }, [])

  // Load config from API/localStorage on mount
  useEffect(() => {
    async function loadConfig() {
      const apiConfig = await loadConfigFromAPI()
      if (apiConfig && typeof apiConfig === "object") {
        setConfig(prev => ({ ...prev, ...apiConfig }))
        return
      }

      try {
        const stored = localStorage.getItem(configStorageKey)
        if (stored) {
          const parsed = JSON.parse(stored) as Partial<PlinkoConfig>
          if (typeof parsed === "object" && parsed !== null) {
            setConfig(prev => ({ ...prev, ...parsed }))
          }
        }
      } catch {}
    }
    loadConfig()
  }, [])

  // Save config to localStorage when changed
  const configInitRef = useRef(false)
  useEffect(() => {
    if (!configInitRef.current) {
      configInitRef.current = true
      return
    }
    localStorage.setItem(configStorageKey, JSON.stringify(config))
  }, [config])

  // Persist players
  const persistPlayers = useCallback(async (nextPlayers: PlayerProfile[]): Promise<boolean> => {
    localStorage.setItem(playerStorageKey, JSON.stringify(nextPlayers))
    return await savePlayersToAPI(nextPlayers)
  }, [])

  // Game controls
  const startGame = useCallback(() => {
    setBoardKey(k => k + 1)
    setStarted(true)
    setRoundWinnerBuckets([])
    setShowWinCelebration(false)
    setShowTiebreaker(false)
    setTiebreakerRound(0)
    allowWinCountRef.current = true

    if (hasStartedOnceRef.current) {
      assignBuckets(enrolledPlayers)
    }
    hasStartedOnceRef.current = true
  }, [assignBuckets, enrolledPlayers])

  const stopGame = useCallback(() => {
    setStarted(false)
    allowWinCountRef.current = false
  }, [])

  // Handle game end
  const handleGameEnd = useCallback((winningBuckets: number[]) => {
    setStarted(false)
    setRoundWinnerBuckets(winningBuckets)

    // Increment wins for winning players (skip if config panel is open)
    if (allowWinCountRef.current && !showConfig) {
      const winningPlayerIds = winningBuckets
        .map(bucket => bucketAssignments[bucket])
        .filter(Boolean)

      if (winningPlayerIds.length > 0) {
        setPlayers(prev => {
          const updated = prev.map(p =>
            winningPlayerIds.includes(p.id)
              ? { ...p, wins: p.wins + 1 }
              : p
          )
          void persistPlayers(updated)
          return updated
        })

        // Show celebration for single winner
        if (winningPlayerIds.length === 1) {
          setShowWinCelebration(true)
        }
      }
      allowWinCountRef.current = false
    }
  }, [bucketAssignments, persistPlayers, showConfig])

  // Handle tiebreaker announcement
  const handleTiebreaker = useCallback((roundNumber: number) => {
    setTiebreakerRound(roundNumber)
    setShowTiebreaker(true)
  }, [])

  // Config change handlers
  const handleConfigChange = <K extends keyof PlinkoConfig>(key: K, value: PlinkoConfig[K]) => {
    setConfig(prev => ({ ...prev, [key]: value }))
    if (started) {
      setStarted(false)
    }
    setBoardKey(k => k + 1)
  }

  const handleWheelSpinConfigChange = <K extends keyof WheelSpinConfig>(key: K, value: WheelSpinConfig[K]) => {
    setWheelSpinConfig(prev => ({ ...prev, [key]: value }))
  }

  const handleSlotMachineConfigChange = <K extends keyof SlotMachineConfig>(key: K, value: SlotMachineConfig[K]) => {
    setSlotMachineConfig(prev => ({ ...prev, [key]: value }))
  }

  const handleRouletteConfigChange = <K extends keyof RouletteConfig>(key: K, value: RouletteConfig[K]) => {
    setRouletteConfig((prev: RouletteConfig) => ({ ...prev, [key]: value }))
  }

  const handleRaceConfigChange = <K extends keyof RaceConfig>(key: K, value: RaceConfig[K]) => {
    setRaceConfig(prev => ({ ...prev, [key]: value }))
  }

  // Player toggle handler
  const handleTogglePlayer = useCallback((id: string) => {
    setPlayers(prev => {
      const updated = prev.map(p =>
        p.id === id ? { ...p, active: !p.active } : p
      )
      void persistPlayers(updated)
      return updated
    })
  }, [persistPlayers])

  // Player manager handlers
  const handleUpdateDraftPlayer = useCallback((id: string, updates: Partial<PlayerProfile>) => {
    setDraftPlayers(prev =>
      prev.map(p => p.id === id ? { ...p, ...updates } : p)
    )
    setPlayersDirty(true)
  }, [])

  const handleAddPlayer = useCallback(() => {
    const nextIndex = draftPlayers.filter(p => p.archived !== true).length + 1
    setDraftPlayers(prev => [
      ...prev,
      {
        id: makePlayerId(),
        name: `Player ${nextIndex}`,
        wins: 0,
        active: true,
        archived: false,
      }
    ])
    setPlayersDirty(true)
  }, [draftPlayers])

  const handleArchivePlayer = useCallback((id: string) => {
    const visibleCount = draftPlayers.filter(p => p.archived !== true).length
    if (visibleCount <= 2) return

    setDraftPlayers(prev =>
      prev.map(p =>
        p.id === id ? { ...p, archived: true, active: false } : p
      )
    )
    setPlayersDirty(true)
  }, [draftPlayers])

  const handleSavePlayers = useCallback(async () => {
    setIsSaving(true)
    try {
      const success = await persistPlayers(draftPlayers)
      if (success) {
        setPlayers(draftPlayers)
        setPlayersDirty(false)
        setSaveMessage({ type: "success", text: "Players saved!" })
      } else {
        setSaveMessage({ type: "error", text: "Could not save to server" })
      }
    } catch {
      setSaveMessage({ type: "error", text: "Error saving players" })
    } finally {
      setIsSaving(false)
      setTimeout(() => setSaveMessage(null), 3000)
      setShowPlayerManager(false)
    }
  }, [draftPlayers, persistPlayers])

  const handleAvatarUpload = useCallback(async (playerId: string, file: File) => {
    setUploadingPlayerId(playerId)
    try {
      const formData = new FormData()
      formData.append("file", file)
      const response = await fetch("/api/plinko/avatar", {
        method: "POST",
        body: formData
      })

      if (!response.ok) throw new Error("Upload failed")

      const data = await response.json()
      if (typeof data.url === "string" && data.url.trim() !== "") {
        handleUpdateDraftPlayer(playerId, { avatarUrl: data.url })
      }
    } catch {
      setSaveMessage({ type: "error", text: "Avatar upload failed" })
      setTimeout(() => setSaveMessage(null), 3000)
    } finally {
      setUploadingPlayerId(null)
    }
  }, [handleUpdateDraftPlayer])

  // Save config to server
  const handleSaveConfigToServer = useCallback(async () => {
    setIsSaving(true)
    try {
      const success = await saveConfigToAPI(config)
      setSaveMessage({
        type: success ? "success" : "error",
        text: success ? "Config saved!" : "Could not save to server"
      })
    } catch {
      setSaveMessage({ type: "error", text: "Error saving config" })
    } finally {
      setIsSaving(false)
      setTimeout(() => setSaveMessage(null), 3000)
    }
  }, [config])

  // Open player manager
  const openPlayerManager = useCallback(() => {
    setDraftPlayers(players)
    setPlayersDirty(false)
    setShowPlayerManager(true)
  }, [players])

  // Handle game switch
  const handleGameChange = useCallback((game: GameType) => {
    setCurrentGame(game)
    setStarted(false)
    setRoundWinnerBuckets([])
    setShowWinCelebration(false)
  }, [])

  // Handle wheel spin win
  const handleWheelSpinWin = useCallback((winner: PlayerProfile) => {
    // Increment wins for the winner
    setPlayers(prev => {
      const updated = prev.map(p =>
        p.id === winner.id ? { ...p, wins: p.wins + 1 } : p
      )
      void persistPlayers(updated)
      return updated
    })
  }, [persistPlayers])

  // Get winner for celebration
  const celebrationWinner = useMemo(() => {
    if (roundWinnerBuckets.length !== 1) return null
    const winnerId = bucketAssignments[roundWinnerBuckets[0]]
    return players.find(p => p.id === winnerId) || null
  }, [roundWinnerBuckets, bucketAssignments, players])

  return (
    <>
      <GameLayout
        leftSidebarOpen={leftSidebarOpen}
        rightSidebarOpen={rightSidebarOpen}
        onLeftSidebarToggle={() => setLeftSidebarOpen(!leftSidebarOpen)}
        onRightSidebarToggle={() => setRightSidebarOpen(!rightSidebarOpen)}
        forceRightPinned={showConfig}
        leftSidebar={
          <PlayerSidebar
            players={visiblePlayers}
            onTogglePlayer={handleTogglePlayer}
            onManageClick={openPlayerManager}
            searchQuery={playerSearchQuery}
            onSearchChange={setPlayerSearchQuery}
          />
        }
        mainContent={
          <div className="flex flex-col items-center gap-4">
            {currentGame === "plinko" ? (
              <>
                <div className="relative">
                  <PlinkoGame
                    key={boardKey}
                    config={config}
                    bucketAssignments={bucketAssignments}
                    players={visiblePlayers}
                    isRunning={started}
                    onGameEnd={handleGameEnd}
                    onTiebreaker={handleTiebreaker}
                    winningBuckets={roundWinnerBuckets}
                    soundEnabled={soundEnabled}
                  />
                  <TiebreakerAnnouncement
                    isVisible={showTiebreaker}
                    roundNumber={tiebreakerRound}
                    onComplete={() => setShowTiebreaker(false)}
                  />
                </div>
                <PlinkoControls
                  isRunning={started}
                  onStart={startGame}
                  onStop={stopGame}
                  onConfigToggle={() => {
                    setShowConfig(!showConfig)
                    setRightSidebarOpen(true)
                  }}
                  showConfig={showConfig}
                  isMuted={!soundEnabled}
                  onMuteToggle={() => setSoundEnabled(!soundEnabled)}
                />
              </>
            ) : currentGame === "wheelspin" ? (
              <>
                <WheelSpinGame
                  players={visiblePlayers}
                  onGameEnd={handleWheelSpinWin}
                  soundEnabled={soundEnabled}
                  config={wheelSpinConfig}
                />
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setShowConfig(!showConfig)
                      setRightSidebarOpen(true)
                    }}
                    className={`p-2 rounded-lg transition-colors ${
                      showConfig 
                        ? "bg-primary/20 text-primary" 
                        : "bg-muted hover:bg-muted/80 text-muted-foreground"
                    }`}
                    title="Settings"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setSoundEnabled(!soundEnabled)}
                    className="p-2 rounded-lg bg-muted hover:bg-muted/80 text-muted-foreground transition-colors"
                    title={soundEnabled ? "Mute" : "Unmute"}
                  >
                    {soundEnabled ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" clipRule="evenodd" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                      </svg>
                    )}
                  </button>
                </div>
              </>
            ) : currentGame === "slotmachine" ? (
              <>
                <SlotMachineGame
                  players={visiblePlayers}
                  config={slotMachineConfig}
                  onGameEnd={(result) => {
                    // Increment wins for the winner
                    if (result.winner) {
                      setPlayers(prev => {
                        const updated = prev.map(p =>
                          p.id === result.winner.id ? { ...p, wins: p.wins + 1 + (result.bonusPoints ?? 0) } : p
                        )
                        void persistPlayers(updated)
                        return updated
                      })
                    }
                  }}
                  soundEnabled={soundEnabled}
                />
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setShowConfig(!showConfig)
                      setRightSidebarOpen(true)
                    }}
                    className={`p-2 rounded-lg transition-colors ${
                      showConfig 
                        ? "bg-primary/20 text-primary" 
                        : "bg-muted hover:bg-muted/80 text-muted-foreground"
                    }`}
                    title="Settings"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setSoundEnabled(!soundEnabled)}
                    className="p-2 rounded-lg bg-muted hover:bg-muted/80 text-muted-foreground transition-colors"
                    title={soundEnabled ? "Mute" : "Unmute"}
                  >
                    {soundEnabled ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" clipRule="evenodd" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                      </svg>
                    )}
                  </button>
                </div>
              </>
            ) : currentGame === "roulette" ? (
              <>
                <RouletteGame
                  players={visiblePlayers}
                  config={rouletteConfig}
                  onGameEnd={(winner: PlayerProfile) => {
                    // Increment wins for the winner
                    setPlayers((prev: PlayerProfile[]) => {
                      const updated = prev.map(p =>
                        p.id === winner.id ? { ...p, wins: p.wins + 1 } : p
                      )
                      void persistPlayers(updated)
                      return updated
                    })
                  }}
                  soundEnabled={soundEnabled}
                />
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setShowConfig(!showConfig)
                      setRightSidebarOpen(true)
                    }}
                    className={`p-2 rounded-lg transition-colors ${
                      showConfig 
                        ? "bg-primary/20 text-primary" 
                        : "bg-muted hover:bg-muted/80 text-muted-foreground"
                    }`}
                    title="Settings"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setSoundEnabled(!soundEnabled)}
                    className="p-2 rounded-lg bg-muted hover:bg-muted/80 text-muted-foreground transition-colors"
                    title={soundEnabled ? "Mute" : "Unmute"}
                  >
                    {soundEnabled ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" clipRule="evenodd" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                      </svg>
                    )}
                  </button>
                </div>
              </>
            ) : currentGame === "race" ? (
              <>
                <RaceGame
                  players={visiblePlayers}
                  config={raceConfig}
                  onGameEnd={(winner: PlayerProfile) => {
                    // Increment wins for the winner
                    setPlayers((prev: PlayerProfile[]) => {
                      const updated = prev.map(p =>
                        p.id === winner.id ? { ...p, wins: p.wins + 1 } : p
                      )
                      void persistPlayers(updated)
                      return updated
                    })
                  }}
                  soundEnabled={soundEnabled}
                />
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setShowConfig(!showConfig)
                      setRightSidebarOpen(true)
                    }}
                    className={`p-2 rounded-lg transition-colors ${
                      showConfig
                        ? "bg-primary/20 text-primary"
                        : "bg-muted hover:bg-muted/80 text-muted-foreground"
                    }`}
                    title="Settings"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setSoundEnabled(!soundEnabled)}
                    className="p-2 rounded-lg bg-muted hover:bg-muted/80 text-muted-foreground transition-colors"
                    title={soundEnabled ? "Mute" : "Unmute"}
                  >
                    {soundEnabled ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" clipRule="evenodd" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                      </svg>
                    )}
                  </button>
                </div>
              </>
            ) : null}
          </div>
        }
        rightSidebar={
          showConfig ? (
            currentGame === "plinko" ? (
              <PlinkoConfigPanel
                config={config}
                onConfigChange={handleConfigChange}
                enrolledPlayerCount={enrolledPlayers.length}
                onSaveToServer={handleSaveConfigToServer}
                isSaving={isSaving}
                saveMessage={saveMessage}
                currentGame={currentGame}
                onGameChange={handleGameChange}
              />
            ) : currentGame === "wheelspin" ? (
              <WheelSpinConfigPanel
                config={wheelSpinConfig}
                onConfigChange={handleWheelSpinConfigChange}
                onSaveToServer={handleSaveConfigToServer}
                isSaving={isSaving}
                saveMessage={saveMessage}
                currentGame={currentGame}
                onGameChange={handleGameChange}
              />
            ) : currentGame === "slotmachine" ? (
              <SlotMachineConfigPanel
                config={slotMachineConfig}
                onConfigChange={handleSlotMachineConfigChange}
                onSaveToServer={handleSaveConfigToServer}
                isSaving={isSaving}
                saveMessage={saveMessage}
                currentGame={currentGame}
                onGameChange={handleGameChange}
              />
            ) : currentGame === "roulette" ? (
              <RouletteConfigPanel
                config={rouletteConfig}
                onConfigChange={handleRouletteConfigChange}
                onSaveToServer={handleSaveConfigToServer}
                isSaving={isSaving}
                saveMessage={saveMessage}
                currentGame={currentGame}
                onGameChange={handleGameChange}
              />
            ) : currentGame === "race" ? (
              <RaceConfigPanel
                config={raceConfig}
                onConfigChange={handleRaceConfigChange}
                onSaveToServer={handleSaveConfigToServer}
                isSaving={isSaving}
                saveMessage={saveMessage}
                currentGame={currentGame}
                onGameChange={handleGameChange}
              />
            ) : null
          ) : (
            <PlinkoLeaderboard
              players={visiblePlayers}
              bucketAssignments={bucketAssignments}
              roundWinnerBuckets={roundWinnerBuckets}
            />
          )
        }
      />

      {/* Mobile sidebar toggles */}
      <SidebarToggle
        side="left"
        isOpen={leftSidebarOpen}
        onClick={() => setLeftSidebarOpen(true)}
        icon={
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        }
        label="Players"
      />
      <SidebarToggle
        side="right"
        isOpen={rightSidebarOpen}
        onClick={() => setRightSidebarOpen(true)}
        icon={
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        }
        label="Leaderboard"
      />

      {/* Player Manager Modal */}
      <PlayerManager
        isOpen={showPlayerManager}
        onClose={() => setShowPlayerManager(false)}
        players={draftPlayers}
        onUpdatePlayer={handleUpdateDraftPlayer}
        onAddPlayer={handleAddPlayer}
        onArchivePlayer={handleArchivePlayer}
        onSave={handleSavePlayers}
        onAvatarUpload={handleAvatarUpload}
        isDirty={playersDirty}
        isSaving={isSaving}
        uploadingPlayerId={uploadingPlayerId}
      />

      {/* Win Celebration */}
      <WinCelebration
        isVisible={showWinCelebration}
        winner={celebrationWinner}
        onClose={() => setShowWinCelebration(false)}
      />
    </>
  )
}
