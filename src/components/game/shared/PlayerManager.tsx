"use client"

import * as React from "react"
import Image from "next/image"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/Input"
import { getAvatarUrl, type PlayerProfile } from "./PlayerSidebar"

export interface PlayerManagerProps {
  isOpen: boolean
  onClose: () => void
  players: PlayerProfile[]
  onUpdatePlayer: (id: string, updates: Partial<PlayerProfile>) => void
  onAddPlayer: () => void
  onArchivePlayer: (id: string) => void
  onSave: () => Promise<void>
  onAvatarUpload?: (playerId: string, file: File) => Promise<void>
  isDirty?: boolean
  isSaving?: boolean
  uploadingPlayerId?: string | null
}

/**
 * PlayerManager - Modal for managing player roster
 * List-based design with avatar, name, actions
 */
export function PlayerManager({
  isOpen,
  onClose,
  players,
  onUpdatePlayer,
  onAddPlayer,
  onArchivePlayer,
  onSave,
  onAvatarUpload,
  isDirty = false,
  isSaving = false,
  uploadingPlayerId = null,
}: PlayerManagerProps) {
  const [searchQuery, setSearchQuery] = React.useState("")
  
  const visiblePlayers = React.useMemo(() => {
    const filtered = players
      .filter(p => p.archived !== true)
      .filter(p => 
        searchQuery === "" || 
        p.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    return filtered.sort((a, b) => a.name.localeCompare(b.name))
  }, [players, searchQuery])

  const canArchive = visiblePlayers.length > 2

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-2xl max-h-[85vh] glass-panel-elevated rounded-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 p-4 border-b border-border/50">
          <div>
            <h2 className="text-lg font-semibold">Manage Players</h2>
            <p className="text-sm text-muted-foreground">
              {visiblePlayers.length} players • {visiblePlayers.filter(p => p.active).length} active
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3 p-4 border-b border-border/30 bg-muted/30">
          <Button variant="outline" size="sm" onClick={onAddPlayer}>
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Player
          </Button>
          
          <div className="flex-1 min-w-[180px] max-w-xs">
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-sm rounded-lg bg-background border border-border/50 placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
              />
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            {isDirty && (
              <span className="text-xs text-muted-foreground">Unsaved changes</span>
            )}
            <Button 
              size="sm" 
              onClick={onSave}
              disabled={!isDirty || isSaving}
            >
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>

        {/* Player List */}
        <div className="flex-1 overflow-y-auto scrollbar-glass p-4 space-y-2">
          {visiblePlayers.map(player => (
            <PlayerManagerItem
              key={player.id}
              player={player}
              onUpdatePlayer={onUpdatePlayer}
              onArchivePlayer={onArchivePlayer}
              onAvatarUpload={onAvatarUpload}
              canArchive={canArchive}
              isUploading={uploadingPlayerId === player.id}
            />
          ))}
          {visiblePlayers.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No players found
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Individual player item in the manager
 */
function PlayerManagerItem({
  player,
  onUpdatePlayer,
  onArchivePlayer,
  onAvatarUpload,
  canArchive,
  isUploading,
}: {
  player: PlayerProfile
  onUpdatePlayer: (id: string, updates: Partial<PlayerProfile>) => void
  onArchivePlayer: (id: string) => void
  onAvatarUpload?: (playerId: string, file: File) => Promise<void>
  canArchive: boolean
  isUploading: boolean
}) {
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && onAvatarUpload) {
      onAvatarUpload(player.id, file)
    }
    e.target.value = ""
  }

  return (
    <div className={cn(
      "flex items-center gap-4 p-3 rounded-xl transition-colors",
      "bg-card/50 hover:bg-card border border-border/30"
    )}>
      {/* Avatar with upload button */}
      <div className="relative group shrink-0">
        <Image
          src={getAvatarUrl(player)}
          alt={player.name}
          width={56}
          height={56}
          unoptimized
          className="w-14 h-14 rounded-full object-cover ring-2 ring-border/50"
        />
        {onAvatarUpload && (
          <>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className={cn(
                "absolute inset-0 flex items-center justify-center rounded-full",
                "bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity",
                isUploading && "opacity-100"
              )}
            >
              {isUploading ? (
                <svg className="w-5 h-5 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileSelect}
            />
          </>
        )}
      </div>

      {/* Name Input */}
      <div className="flex-1 min-w-0">
        <Input
          value={player.name}
          onChange={e => onUpdatePlayer(player.id, { name: e.target.value })}
          className="font-medium bg-transparent border-transparent hover:border-border focus:border-border h-9"
          placeholder="Player name"
        />
      </div>

      {/* Wins Stepper */}
      <div className="flex items-center gap-1 shrink-0">
        <span className="text-xs text-muted-foreground mr-1">Wins</span>
        <button
          onClick={() => onUpdatePlayer(player.id, { wins: Math.max(0, player.wins - 1) })}
          className="w-7 h-7 flex items-center justify-center rounded-md bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
          </svg>
        </button>
        <span className="w-8 text-center font-semibold tabular-nums">{player.wins}</span>
        <button
          onClick={() => onUpdatePlayer(player.id, { wins: player.wins + 1 })}
          className="w-7 h-7 flex items-center justify-center rounded-md bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      {/* Archive Button */}
      <button
        onClick={() => onArchivePlayer(player.id)}
        disabled={!canArchive}
        className={cn(
          "p-2 rounded-lg transition-colors shrink-0",
          canArchive
            ? "text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            : "text-muted-foreground/30 cursor-not-allowed"
        )}
        title={canArchive ? "Archive player" : "Cannot archive: minimum 2 players required"}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  )
}
