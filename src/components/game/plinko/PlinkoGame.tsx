"use client"

import * as React from "react"
import { GameLayout } from "../layout/GameLayout"
import { PlayerSidebar } from "../shared/PlayerSidebar"
import { PlayerManager } from "../shared/PlayerManager"
import { PlinkoControls } from "./PlinkoControls"
import { PlinkoConfigPanel } from "./PlinkoConfigPanel"
import { PlinkoLeaderboard } from "./PlinkoLeaderboard"
import { WinCelebration } from "./WinCelebration"
import { usePlinkoPhysics } from "./hooks/usePlinkoPhysics"
import { usePlinkoRender } from "./hooks/usePlinkoRender"
import { useGameSounds } from "./hooks/useGameSounds"
import { particleSystem } from "./utils/particles"
import { defaultConfig, PlinkoConfig } from "./types"
import { PlayerProfile } from "../shared/types"
import { 
  loadPlayersFromAPI, 
  savePlayersToAPI, 
  loadConfigFromAPI, 
  saveConfigToAPI, 
  defaultPlayers,
  getAvatarUrl
} from "../shared/api"
import Image from "next/image"

export function PlinkoGame() {
  // State
  const [config, setConfig] = React.useState<PlinkoConfig>(defaultConfig)
  const [players, setPlayers] = React.useState<PlayerProfile[]>(defaultPlayers)
  const [isConfigOpen, setIsConfigOpen] = React.useState(false)
  const [showPlayerManager, setShowPlayerManager] = React.useState(false)
  const [bucketAssignments, setBucketAssignments] = React.useState<string[]>([])
  const [roundWinnerIds, setRoundWinnerIds] = React.useState<string[] | null>(null)
  const [celebrationWinner, setCelebrationWinner] = React.useState<PlayerProfile | null>(null)
  const [isSaving, setIsSaving] = React.useState(false)
  const [isMuted, setIsMuted] = React.useState(false)

  const { playCollision, playBucket, playWin } = useGameSounds(!isMuted)

  // Physics Hook
  const { engine, startGame, stopGame, isRunning } = usePlinkoPhysics({
    config,
    players,
    onCollision: (x, y, speed) => {
      playCollision(speed)
      // Color based on speed? Blue for now.
      particleSystem.createExplosion(x, y, "#3b82f6") 
    },
    onRoundOver: (winnerBuckets) => {
      playWin()
      const winnerIds = winnerBuckets
        .map(idx => bucketAssignments[idx])
        .filter(id => id != null)
      
      setRoundWinnerIds(winnerIds)
      
      // Show celebration if there's a winner
      if (winnerIds.length > 0) {
        const winner = players.find(p => p.id === winnerIds[0])
        if (winner) setCelebrationWinner(winner)
        
        setPlayers(prev => {
          const next = prev.map(p => 
            winnerIds.includes(p.id) ? { ...p, wins: p.wins + 1 } : p
          )
          savePlayersToAPI(next) // Fire and forget save
          return next
        })
      }
    }
  })

  const canvasRef = React.useRef<HTMLDivElement>(null)
  
  // Custom Render Hook
  usePlinkoRender({
    engine,
    canvasRef,
    config
  })

  // Load Data
  React.useEffect(() => {
    async function init() {
      const savedPlayers = await loadPlayersFromAPI()
      if (savedPlayers?.length) setPlayers(savedPlayers)
      
      const savedConfig = await loadConfigFromAPI()
      if (savedConfig) setConfig(prev => ({ ...prev, ...savedConfig }))
    }
    init()
  }, [])

  // Assign Buckets Logic
  React.useEffect(() => {
    if (isRunning) return // Don't shuffle while running
    
    const active = players.filter(p => p.active && !p.archived)
    const shuffled = [...active].sort(() => Math.random() - 0.5)
    setBucketAssignments(shuffled.map(p => p.id))
    
    // Auto-update bucket count if needed
    const needed = Math.max(2, active.length)
    if (config.bucketCount !== needed) {
      setConfig(prev => ({ ...prev, bucketCount: needed }))
    }
  }, [players, config.bucketCount, isRunning]) // check deps

  const handleUpdateConfig = <K extends keyof PlinkoConfig>(key: K, value: PlinkoConfig[K]) => {
    setConfig(prev => ({ ...prev, [key]: value }))
    // Physics engine will re-init via boardKey in hook if needed
  }

  const handleSaveConfig = async () => {
    setIsSaving(true)
    await saveConfigToAPI(config)
    setIsSaving(false)
  }

  const handleSavePlayers = async (newPlayers: PlayerProfile[]) => {
    setPlayers(newPlayers)
    await savePlayersToAPI(newPlayers)
  }

  const handleUploadAvatar = async (id: string, file: File): Promise<string | null> => {
    const formData = new FormData()
    formData.append("file", file)
    try {
      const res = await fetch("/api/plinko/avatar", { method: "POST", body: formData })
      if (!res.ok) return null
      const data = await res.json()
      return data.url
    } catch {
      return null
    }
  }

  const handleToggleActive = (id: string, active: boolean) => {
    const next = players.map(p => p.id === id ? { ...p, active } : p)
    setPlayers(next)
    savePlayersToAPI(next)
  }

  const handleStart = () => {
    setRoundWinnerIds(null)
    setCelebrationWinner(null)
    startGame()
  }

  return (
    <GameLayout
      leftSidebar={
        <PlayerSidebar
          players={players}
          onToggleActive={handleToggleActive}
          onManage={() => setShowPlayerManager(true)}
        />
      }
      rightSidebar={
        isConfigOpen ? (
          <PlinkoConfigPanel
            config={config}
            onUpdateConfig={handleUpdateConfig}
            onSave={handleSaveConfig}
            onClose={() => setIsConfigOpen(false)}
            isSaving={isSaving}
          />
        ) : (
          <PlinkoLeaderboard
            players={players}
            roundWinnerIds={roundWinnerIds}
          />
        )
      }
    >
      <div className="relative w-full h-full flex flex-col items-center justify-center">
        {/* Physics Canvas */}
        <div ref={canvasRef} className="border rounded-lg shadow-sm bg-white/50 backdrop-blur" />
        
        {/* Avatars under buckets */}
        <div className="absolute top-[calc(50%+225px)] flex w-[600px] pointer-events-none"> 
          {/* Note: Hardcoded width/offset matching default config for now. 
              Ideally this should align dynamically with canvas. 
              Canvas height 450. half is 225. 
          */}
          {bucketAssignments.map((id, i) => {
             const player = players.find(p => p.id === id)
             if (!player) return <div key={i} className="flex-1" />
             return (
               <div key={id} className="flex-1 flex justify-center -mt-8 z-10">
                 <div className="flex flex-col items-center">
                   <div className="h-10 w-10 relative rounded-full border-2 border-white shadow-md overflow-hidden">
                     <Image src={getAvatarUrl(player)} alt={player.name} fill className="object-cover" />
                   </div>
                   <span className="text-[10px] font-bold bg-white/80 px-1 rounded mt-1">{player.name}</span>
                 </div>
               </div>
             )
          })}
        </div>

        {/* Controls Overlay */}
        <div className="absolute bottom-8 z-20">
          <PlinkoControls
            isRunning={isRunning}
            onStart={handleStart}
            onStop={stopGame}
            isConfigOpen={isConfigOpen}
            onToggleConfig={() => setIsConfigOpen(!isConfigOpen)}
            isMuted={isMuted}
            onToggleSound={() => setIsMuted(!isMuted)}
          />
        </div>
      </div>

      <PlayerManager
        isOpen={showPlayerManager}
        onClose={() => setShowPlayerManager(false)}
        players={players}
        onSave={handleSavePlayers}
        onUploadAvatar={handleUploadAvatar}
      />

      {celebrationWinner && (
        <WinCelebration
          winner={celebrationWinner}
          onClose={() => setCelebrationWinner(null)}
        />
      )}
    </GameLayout>
  )
}
