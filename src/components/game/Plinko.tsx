"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { GameLayout } from "@/components/game/layout/GameLayout"
import { PlayerManager } from "@/components/game/shared/PlayerManager"
import { PlayerSidebar } from "@/components/game/shared/PlayerSidebar"
import { PlinkoConfigPanel } from "@/components/game/plinko/PlinkoConfigPanel"
import { PlinkoControls } from "@/components/game/plinko/PlinkoControls"
import { PlinkoGame } from "@/components/game/plinko/PlinkoGame"
import { PlinkoLeaderboard } from "@/components/game/plinko/PlinkoLeaderboard"
import { WinCelebration } from "@/components/game/plinko/WinCelebration"
import { useGameSounds } from "@/components/game/plinko/hooks/useGameSounds"
import type { PlayerProfile, PlinkoConfig } from "@/components/game/plinko/types"

export interface PlinkoProps {
  initialConfig?: PlinkoConfig
}

const defaultConfig: PlinkoConfig = {
  ballCount: 10,
  ballRadius: 8,
  ballRestitution: 0.9,
  ballFriction: 0.005,
  ballShape: "ball",
  destroyBalls: false,
  dropLocation: "random",
  pinRadius: 3,
  pinRows: 10,
  pinColumns: 8,
  pinRestitution: 0.5,
  pinFriction: 0.1,
  pinShape: "ball",
  pinAngle: 0,
  pinWallGap: 20,
  pinRimGap: 60,
  ceilingGap: 50,
  wallThickness: 10,
  rimHeight: 100,
  rimWidth: 5,
  bucketCount: 6,
  bucketDistribution: "even",
  winCondition: "most",
  winNth: 3,
  width: 600,
  height: 450
}

const playerStorageKey = "plinko.players.v2"
const configStorageKey = "plinko.config.v1"

const makePlayerId = (): string =>
  `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`

const defaultPlayers: PlayerProfile[] = [
  {
    id: makePlayerId(),
    name: "Alberto",
    wins: 0,
    active: true,
    avatarUrl: "https://ca.slack-edge.com/T08U86VNU-U07CS78N83E-75c562954cec-512"
  },
  {
    id: makePlayerId(),
    name: "Cache",
    wins: 0,
    active: true,
    avatarUrl: "https://ca.slack-edge.com/T08U86VNU-UJTV9CALF-1f9a6157e910-512"
  },
  {
    id: makePlayerId(),
    name: "Daniel",
    wins: 0,
    active: true,
    avatarUrl: "https://ca.slack-edge.com/T08U86VNU-U04UZ5RR5RU-6b08814bab5f-512"
  },
  {
    id: makePlayerId(),
    name: "Elizabeth",
    wins: 0,
    active: true,
    avatarUrl: "https://ca.slack-edge.com/T08U86VNU-U08J7A4HL20-969440ad060f-512"
  },
  {
    id: makePlayerId(),
    name: "Fari",
    wins: 0,
    active: true,
    avatarUrl: "https://ca.slack-edge.com/T08U86VNU-U04T9PY41P1-d15c814fd4e2-512"
  },
  {
    id: makePlayerId(),
    name: "Jared",
    wins: 0,
    active: true,
    avatarUrl: "https://ca.slack-edge.com/T08U86VNU-U075CGCJP8V-3dce62562a1a-512"
  },
  {
    id: makePlayerId(),
    name: "Jon",
    wins: 0,
    active: true,
    avatarUrl: "https://ca.slack-edge.com/T08U86VNU-U02E91B4U66-1b9a90423a90-512"
  },
  {
    id: makePlayerId(),
    name: "Madison",
    wins: 0,
    active: true,
    avatarUrl: "https://ca.slack-edge.com/T08U86VNU-U026T9FAGQ7-90a4aaa8f62c-512"
  },
  {
    id: makePlayerId(),
    name: "Matt",
    wins: 0,
    active: true,
    avatarUrl: "https://ca.slack-edge.com/T08U86VNU-U8U5ANCF8-3bfdde800605-512"
  },
  {
    id: makePlayerId(),
    name: "Paul",
    wins: 0,
    active: true,
    avatarUrl: "https://ca.slack-edge.com/T08U86VNU-U08U8DPR9-03d672ef101c-512"
  },
  {
    id: makePlayerId(),
    name: "RJ",
    wins: 0,
    active: true,
    avatarUrl: "https://ca.slack-edge.com/T08U86VNU-U0990R1S6-b47fdae676a6-192"
  },
  {
    id: makePlayerId(),
    name: "Sam",
    wins: 0,
    active: true,
    avatarUrl: "https://ca.slack-edge.com/T08U86VNU-U01DXBN6A3S-8720534b422b-512"
  },
  {
    id: makePlayerId(),
    name: "William",
    wins: 0,
    active: true,
    avatarUrl: "https://ca.slack-edge.com/T08U86VNU-U0ABCTX5H-g37aa34e7410-192"
  }
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

export function Plinko({ initialConfig }: PlinkoProps) {
  const [started, setStarted] = useState(false)
  const [runKey, setRunKey] = useState(0)
  const [config, setConfig] = useState<PlinkoConfig>(initialConfig ?? defaultConfig)
  const [rightSidebarMode, setRightSidebarMode] = useState<"leaderboard" | "config">(
    "leaderboard"
  )
  const [showPlayerManager, setShowPlayerManager] = useState(false)
  const [showMobilePlayers, setShowMobilePlayers] = useState(false)
  const [showMobileDetails, setShowMobileDetails] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [shakeBoard, setShakeBoard] = useState(false)
  const [bucketAssignments, setBucketAssignments] = useState<string[]>([])
  const [roundWinnerBuckets, setRoundWinnerBuckets] = useState<number[] | null>(null)
  const roundWinnerRef = useRef<number[] | null>(null)
  const allowWinCountRef = useRef(false)
  const hasStartedOnceRef = useRef(false)

  const [players, setPlayers] = useState<PlayerProfile[]>(defaultPlayers)
  const [draftPlayers, setDraftPlayers] = useState<PlayerProfile[]>(defaultPlayers)
  const [playersDirty, setPlayersDirty] = useState(false)

  const [showSaveConfirm, setShowSaveConfirm] = useState(false)
  const [saveMessage, setSaveMessage] = useState<{
    type: "success" | "error"
    text: string
  } | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [uploadingPlayerId, setUploadingPlayerId] = useState<string | null>(null)
  const [celebrationPlayerId, setCelebrationPlayerId] = useState<string | null>(null)
  const { playCollision, playBucket, playWin } = useGameSounds(soundEnabled)

  const wasPlayerManagerOpenRef = useRef(false)
  useEffect(() => {
    if (showPlayerManager && !wasPlayerManagerOpenRef.current) {
      setDraftPlayers(players)
      setPlayersDirty(false)
    }
    wasPlayerManagerOpenRef.current = showPlayerManager
  }, [players, showPlayerManager])

  const stopGame = useCallback((reason: "manual" | "auto" = "manual") => {
    setStarted(false)
    if (reason === "manual") {
      allowWinCountRef.current = false
      roundWinnerRef.current = null
      setRoundWinnerBuckets(null)
    }
  }, [])

  const assignBuckets = useCallback((activePlayers: PlayerProfile[]) => {
    if (activePlayers.length === 0) {
      setBucketAssignments([])
      return
    }
    const shuffled = [...activePlayers].sort(() => Math.random() - 0.5)
    setBucketAssignments(shuffled.map(player => player.id))
  }, [])

  const startGame = useCallback(() => {
    setRunKey(key => key + 1)
    setStarted(true)
    roundWinnerRef.current = null
    allowWinCountRef.current = true
    setRoundWinnerBuckets(null)
    if (hasStartedOnceRef.current) {
      const activePlayers = players.filter(player => player.active && player.archived !== true)
      assignBuckets(activePlayers)
    }
    hasStartedOnceRef.current = true
  }, [assignBuckets, players])

  const updateConfig = <K extends keyof PlinkoConfig>(
    key: K,
    value: PlinkoConfig[K]
  ): void => {
    setConfig(prev => ({ ...prev, [key]: value }))
    if (started) {
      setStarted(false)
    }
    setRunKey(key => key + 1)
  }

  const persistPlayers = useCallback(async (nextPlayers: PlayerProfile[]): Promise<boolean> => {
    localStorage.setItem(playerStorageKey, JSON.stringify(nextPlayers))
    return await savePlayersToAPI(nextPlayers)
  }, [])

  const handleSavePlayers = async (): Promise<void> => {
    setIsSaving(true)
    try {
      const playersSuccess = await persistPlayers(draftPlayers)
      if (playersSuccess) {
        setPlayers(draftPlayers)
        setPlayersDirty(false)
        setSaveMessage({ type: "success", text: "Players saved to server successfully!" })
      } else {
        setSaveMessage({
          type: "error",
          text: "Could not save players to server. Changes are local only."
        })
      }
    } catch {
      setSaveMessage({ type: "error", text: "Error saving players. Changes are local only." })
    } finally {
      setIsSaving(false)
      setTimeout(() => setSaveMessage(null), 4000)
      setShowPlayerManager(false)
    }
  }

  const handleSaveToServer = async (): Promise<void> => {
    setIsSaving(true)
    setShowSaveConfirm(false)
    try {
      const configSuccess = await saveConfigToAPI(config)
      const playersSuccess = await persistPlayers(players)
      if (configSuccess && playersSuccess) {
        setSaveMessage({ type: "success", text: "Settings and players saved to server." })
      } else if (configSuccess) {
        setSaveMessage({ type: "success", text: "Settings saved. Players may not have synced." })
      } else if (playersSuccess) {
        setSaveMessage({ type: "success", text: "Players saved. Settings may not have synced." })
      } else {
        setSaveMessage({ type: "error", text: "Could not save to server. Changes are local only." })
      }
    } catch {
      setSaveMessage({ type: "error", text: "Error saving to server. Changes are local only." })
    } finally {
      setIsSaving(false)
      setTimeout(() => setSaveMessage(null), 4000)
    }
  }

  useEffect(() => {
    async function loadPlayers() {
      const apiPlayers = await loadPlayersFromAPI()
      if (apiPlayers != null && Array.isArray(apiPlayers)) {
        if (apiPlayers.length === 0) {
          const seeded = applyDefaultAvatars(defaultPlayers)
          setPlayers(seeded)
          setDraftPlayers(seeded)
          setPlayersDirty(false)
          return
        }
        if (apiPlayers.length >= 2) {
          const seeded = applyDefaultAvatars(apiPlayers)
          setPlayers(seeded)
          setDraftPlayers(seeded)
          setPlayersDirty(false)
          return
        }
        const needed = 2 - apiPlayers.length
        const padded = [...apiPlayers]
        for (let i = 0; i < needed; i += 1) {
          padded.push({
            id: makePlayerId(),
            name: `Player ${apiPlayers.length + i + 1}`,
            wins: 0,
            active: true
          })
        }
        const seeded = applyDefaultAvatars(padded)
        setPlayers(seeded)
        setDraftPlayers(seeded)
        setPlayersDirty(false)
        return
      }

      try {
        const stored = localStorage.getItem(playerStorageKey)
        if (stored != null) {
          const parsed = JSON.parse(stored) as PlayerProfile[]
          if (Array.isArray(parsed)) {
            if (parsed.length === 0) {
              const seeded = applyDefaultAvatars(defaultPlayers)
              setPlayers(seeded)
              setDraftPlayers(seeded)
              setPlayersDirty(false)
              return
            }
            if (parsed.length >= 2) {
              const seeded = applyDefaultAvatars(parsed)
              setPlayers(seeded)
              setDraftPlayers(seeded)
              setPlayersDirty(false)
              return
            }
            const needed = 2 - parsed.length
            const padded = [...parsed]
            for (let i = 0; i < needed; i += 1) {
              padded.push({
                id: makePlayerId(),
                name: `Player ${parsed.length + i + 1}`,
                wins: 0,
                active: true
              })
            }
            const seeded = applyDefaultAvatars(padded)
            setPlayers(seeded)
            setDraftPlayers(seeded)
            setPlayersDirty(false)
          }
        }
      } catch {
        // ignore invalid storage
      }
    }
    loadPlayers()
  }, [])

  useEffect(() => {
    async function loadConfig() {
      const apiConfig = await loadConfigFromAPI()
      if (apiConfig != null && typeof apiConfig === "object") {
        setConfig(prev => ({ ...prev, ...apiConfig }))
        return
      }
      try {
        const stored = localStorage.getItem(configStorageKey)
        if (stored != null) {
          const parsed = JSON.parse(stored) as Partial<PlinkoConfig>
          if (typeof parsed === "object" && parsed !== null) {
            setConfig(prev => ({ ...prev, ...parsed }))
          }
        }
      } catch {
        // ignore invalid storage
      }
    }
    loadConfig()
  }, [])

  const configInitRef = useRef(false)
  useEffect(() => {
    if (!configInitRef.current) {
      configInitRef.current = true
      return
    }
    async function saveConfig() {
      localStorage.setItem(configStorageKey, JSON.stringify(config))
      await saveConfigToAPI(config)
    }
    saveConfig()
  }, [config])

  const visiblePlayers = useMemo(
    () => players.filter(player => player.archived !== true),
    [players]
  )
  const enrolledPlayers = useMemo(
    () => players.filter(player => player.active && player.archived !== true),
    [players]
  )
  const enrolledPlayerIds = useMemo(
    () => enrolledPlayers.map(player => player.id).join("|"),
    [enrolledPlayers]
  )
  const derivedBucketCount = Math.max(2, enrolledPlayers.length)

  useEffect(() => {
    assignBuckets(enrolledPlayers)
  }, [assignBuckets, enrolledPlayerIds])

  useEffect(() => {
    if (config.bucketCount === derivedBucketCount) return
    setConfig(prev => ({ ...prev, bucketCount: derivedBucketCount }))
    if (started) setStarted(false)
    setRunKey(key => key + 1)
  }, [config.bucketCount, derivedBucketCount, started])

  const syncDraftWithPlayers = useCallback(
    (draft: PlayerProfile[], nextPlayers: PlayerProfile[]) => {
      const draftMap = new Map(draft.map(player => [player.id, player]))
      const synced = nextPlayers.map(player => {
        const draftPlayer = draftMap.get(player.id)
        if (draftPlayer == null) return player
        return {
          ...player,
          name: draftPlayer.name,
          avatarUrl: draftPlayer.avatarUrl,
          archived: draftPlayer.archived
        }
      })
      draft.forEach(player => {
        if (!nextPlayers.some(existing => existing.id === player.id)) {
          synced.push(player)
        }
      })
      return synced
    },
    []
  )

  const updatePlayersImmediate = useCallback(
    (updater: (players: PlayerProfile[]) => PlayerProfile[]) => {
      setPlayers(prev => {
        const nextPlayers = updater(prev)
        if (showPlayerManager) {
          setDraftPlayers(draft => syncDraftWithPlayers(draft, nextPlayers))
        }
        void persistPlayers(nextPlayers)
        return nextPlayers
      })
    },
    [persistPlayers, showPlayerManager, syncDraftWithPlayers]
  )

  const updateDraftPlayers = useCallback((updater: (players: PlayerProfile[]) => PlayerProfile[]) => {
    setDraftPlayers(prev => updater(prev))
    setPlayersDirty(true)
  }, [])

  const restoreArchivedPlayerByName = (name: string, currentId: string) => {
    const normalized = name.trim().toLowerCase()
    if (normalized.length === 0) {
      updateDraftPlayers(prev =>
        prev.map(player => (player.id === currentId ? { ...player, name } : player))
      )
      return
    }

    updateDraftPlayers(prev => {
      const archivedMatch = prev.find(
        player =>
          player.archived === true &&
          player.name.trim().toLowerCase() === normalized &&
          player.id !== currentId
      )
      if (archivedMatch == null) {
        return prev.map(player => (player.id === currentId ? { ...player, name } : player))
      }

      const currentPlayer = prev.find(player => player.id === currentId)
      const currentAvatar = currentPlayer?.avatarUrl
      const mergedAvatar =
        currentAvatar != null && currentAvatar.trim() !== ""
          ? currentAvatar
          : archivedMatch.avatarUrl

      return prev
        .filter(player => player.id !== currentId)
        .map(player =>
          player.id === archivedMatch.id
            ? {
                ...player,
                name,
                archived: false,
                active: true,
                avatarUrl: mergedAvatar
              }
            : player
        )
    })
  }

  const updatePlayerImmediate = (id: string, updater: (player: PlayerProfile) => PlayerProfile) => {
    updatePlayersImmediate(prev =>
      prev.map(player => (player.id === id ? updater(player) : player))
    )
  }

  const updateDraftPlayer = (id: string, updater: (player: PlayerProfile) => PlayerProfile) => {
    updateDraftPlayers(prev => prev.map(player => (player.id === id ? updater(player) : player)))
  }

  const addPlayer = () => {
    const nextIndex = visiblePlayers.length + 1
    updateDraftPlayers(prev => [
      ...prev,
      {
        id: makePlayerId(),
        name: `Player ${nextIndex}`,
        wins: 0,
        active: true,
        archived: false
      }
    ])
  }

  const archivePlayer = (id: string) => {
    updateDraftPlayers(prev => {
      const activeVisibleCount = prev.filter(player => player.archived !== true).length
      if (activeVisibleCount <= 2) return prev
      return prev.map(player =>
        player.id === id ? { ...player, archived: true, active: false } : player
      )
    })
  }

  const handleAvatarUpload = async (playerId: string, file: File) => {
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
        updateDraftPlayer(playerId, current => ({ ...current, avatarUrl: data.url }))
      }
    } catch {
      setSaveMessage({ type: "error", text: "Avatar upload failed. Try again." })
      setTimeout(() => setSaveMessage(null), 4000)
    } finally {
      setUploadingPlayerId(null)
    }
  }

  const handleRoundWinner = useCallback((buckets: number[]) => {
    roundWinnerRef.current = buckets
    setRoundWinnerBuckets(buckets)
    setStarted(false)
    allowWinCountRef.current = true
    playWin()
    setShakeBoard(true)
    setTimeout(() => setShakeBoard(false), 700)
  }, [playWin])

  useEffect(() => {
    if (!allowWinCountRef.current) return
    if (roundWinnerBuckets == null || roundWinnerBuckets.length === 0) return
    const winningPlayerIds = roundWinnerBuckets
      .map(bucket => bucketAssignments[bucket])
      .filter(id => id != null)
    if (winningPlayerIds.length === 0) return
    updatePlayersImmediate(prev =>
      prev.map(player =>
        winningPlayerIds.includes(player.id) ? { ...player, wins: player.wins + 1 } : player
      )
    )
    allowWinCountRef.current = false
    setCelebrationPlayerId(winningPlayerIds[0])
  }, [bucketAssignments, roundWinnerBuckets, updatePlayersImmediate])

  const leaderboard = useMemo(
    () => [...visiblePlayers].sort((a, b) => b.wins - a.wins),
    [visiblePlayers]
  )
  const topWins = leaderboard.length > 0 ? leaderboard[0].wins : 0
  const winnerCount = topWins > 0 ? leaderboard.filter(player => player.wins === topWins).length : 0
  const bucketByPlayer = useMemo(() => {
    const map = new Map<string, number>()
    bucketAssignments.forEach((playerId, index) => {
      map.set(playerId, index)
    })
    return map
  }, [bucketAssignments])

  const getAvatarUrl = (player: PlayerProfile): string => {
    if (player.avatarUrl != null && player.avatarUrl.trim() !== "") return player.avatarUrl
    const seed = encodeURIComponent(player.name || player.id)
    return `https://api.dicebear.com/7.x/bottts-neutral/png?seed=${seed}&size=48`
  }

  const celebrationPlayer = useMemo(
    () => players.find(player => player.id === celebrationPlayerId),
    [celebrationPlayerId, players]
  )

  const rightSidebarContent =
    rightSidebarMode === "config" ? (
      <PlinkoConfigPanel
        config={config}
        derivedBucketCount={derivedBucketCount}
        isSaving={isSaving}
        saveMessage={saveMessage}
        onUpdateConfig={updateConfig}
        onOpenSaveConfirm={() => setShowSaveConfirm(true)}
      />
    ) : (
      <PlinkoLeaderboard
        leaderboard={leaderboard}
        roundWinnerBuckets={roundWinnerBuckets}
        bucketByPlayer={bucketByPlayer}
        topWins={topWins}
        winnerCount={winnerCount}
      />
    )

  return (
    <>
      <GameLayout
        header={
          <div className="px-4 pt-6 md:px-6 lg:px-10">
            <div className="glass-panel flex items-center justify-between rounded-2xl p-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Plinko</p>
                <h1 className="text-xl font-semibold text-slate-900">Plinko Showdown</h1>
              </div>
              <Button variant="outline" onClick={() => setShowPlayerManager(true)}>
                Manage players
              </Button>
            </div>
          </div>
        }
        leftSidebar={
          <PlayerSidebar
            players={players}
            onTogglePlayer={playerId =>
              updatePlayerImmediate(playerId, current => ({
                ...current,
                active: !current.active
              }))
            }
            onOpenManager={() => setShowPlayerManager(true)}
            getAvatarUrl={getAvatarUrl}
          />
        }
        mainContent={
          <PlinkoGame
            config={config}
            runKey={runKey}
            started={started}
            bucketAssignments={bucketAssignments}
            visiblePlayers={visiblePlayers}
            roundWinnerBuckets={roundWinnerBuckets}
            onRoundWinner={handleRoundWinner}
            onBucketHit={() => playBucket()}
            onBallCollision={speed => playCollision(speed)}
            getAvatarUrl={getAvatarUrl}
            shake={shakeBoard}
          />
        }
        rightSidebar={rightSidebarContent}
        controls={
          <PlinkoControls
            started={started}
            rightSidebarMode={rightSidebarMode}
            soundEnabled={soundEnabled}
            onStartStop={() => (started ? stopGame("manual") : startGame())}
            onToggleRightSidebar={() =>
              setRightSidebarMode(mode => (mode === "config" ? "leaderboard" : "config"))
            }
            onToggleSound={() => setSoundEnabled(enabled => !enabled)}
            onOpenPlayers={() => setShowMobilePlayers(true)}
            onOpenDetails={() => setShowMobileDetails(true)}
          />
        }
      />

      {showMobilePlayers && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 lg:hidden">
          <div className="w-full max-w-md p-4">
            <PlayerSidebar
              players={players}
              onTogglePlayer={playerId =>
                updatePlayerImmediate(playerId, current => ({
                  ...current,
                  active: !current.active
                }))
              }
              onOpenManager={() => setShowPlayerManager(true)}
              getAvatarUrl={getAvatarUrl}
            />
            <div className="mt-3 flex justify-end">
              <Button variant="outline" onClick={() => setShowMobilePlayers(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {showMobileDetails && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 lg:hidden">
          <div className="w-full max-w-md p-4">
            {rightSidebarMode === "config" ? (
              <PlinkoConfigPanel
                config={config}
                derivedBucketCount={derivedBucketCount}
                isSaving={isSaving}
                saveMessage={saveMessage}
                onUpdateConfig={updateConfig}
                onOpenSaveConfirm={() => setShowSaveConfirm(true)}
                onClose={() => setShowMobileDetails(false)}
              />
            ) : (
              rightSidebarContent
            )}
            <div className="mt-3 flex justify-end">
              <Button variant="outline" onClick={() => setShowMobileDetails(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      <PlayerManager
        open={showPlayerManager}
        players={players}
        draftPlayers={draftPlayers}
        playersDirty={playersDirty}
        uploadingPlayerId={uploadingPlayerId}
        onClose={() => setShowPlayerManager(false)}
        onAddPlayer={addPlayer}
        onSave={handleSavePlayers}
        onSelectAll={() =>
          updateDraftPlayers(prev => prev.map(player => ({ ...player, active: true })))
        }
        onClearWins={() =>
          updateDraftPlayers(prev => prev.map(player => ({ ...player, wins: 0 })))
        }
        onArchive={archivePlayer}
        onUpdateName={(id, name) => restoreArchivedPlayerByName(name, id)}
        onIncrementWins={id =>
          (players.some(existing => existing.id === id) ? updatePlayerImmediate : updateDraftPlayer)(
            id,
            current => ({ ...current, wins: current.wins + 1 })
          )
        }
        onDecrementWins={id =>
          (players.some(existing => existing.id === id) ? updatePlayerImmediate : updateDraftPlayer)(
            id,
            current => ({ ...current, wins: Math.max(0, current.wins - 1) })
          )
        }
        onUploadAvatar={handleAvatarUpload}
        getAvatarUrl={getAvatarUrl}
      />

      {showSaveConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="glass-panel w-full max-w-md rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-slate-900">Save to Server?</h2>
            <p className="mt-2 text-sm text-slate-600">
              This will save your current settings and player data to the server for all devices.
            </p>
            <div className="mt-4 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowSaveConfirm(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveToServer}>Yes, Save to Server</Button>
            </div>
          </div>
        </div>
      )}

      {saveMessage != null && (
        <div
          className={`fixed bottom-4 right-4 z-50 rounded-lg border p-4 shadow-lg ${
            saveMessage.type === "success"
              ? "border-emerald-200 bg-emerald-100 text-emerald-700"
              : "border-red-200 bg-red-100 text-red-700"
          }`}
        >
          {saveMessage.text}
        </div>
      )}

      <WinCelebration
        open={celebrationPlayer != null}
        winnerName={celebrationPlayer?.name ?? ""}
        winnerAvatarUrl={celebrationPlayer?.avatarUrl ?? getAvatarUrl(defaultPlayers[0])}
        onClose={() => setCelebrationPlayerId(null)}
      />
    </>
  )
}
