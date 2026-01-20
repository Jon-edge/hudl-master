"use client"

import * as React from "react"
import Image from "next/image"
import { cn } from "@/lib/utils"

export interface PlayerProfile {
  id: string
  name: string
  wins: number
  active: boolean
  avatarUrl?: string
  archived?: boolean
}

export interface PlayerSidebarProps {
  players: PlayerProfile[]
  onTogglePlayer: (id: string) => void
  onManageClick?: () => void
  searchQuery?: string
  onSearchChange?: (query: string) => void
  className?: string
  title?: string
}

/**
 * Helper to get placeholder avatar URL
 */
export const getAvatarUrl = (player: PlayerProfile): string => {
  if (player.avatarUrl != null && player.avatarUrl.trim() !== "") return player.avatarUrl
  const seed = encodeURIComponent(player.name || player.id)
  return `https://api.dicebear.com/7.x/bottts-neutral/png?seed=${seed}&size=48`
}

/**
 * PlayerSidebar - Alphabetized roster list with toggle switches
 */
export function PlayerSidebar({
  players,
  onTogglePlayer,
  onManageClick,
  searchQuery = "",
  onSearchChange,
  className,
  title = "Players",
}: PlayerSidebarProps) {
  // Filter and sort players
  const visiblePlayers = React.useMemo(() => {
    const filtered = players
      .filter(p => p.archived !== true)
      .filter(p => 
        searchQuery === "" || 
        p.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    return filtered.sort((a, b) => a.name.localeCompare(b.name))
  }, [players, searchQuery])

  const activeCount = visiblePlayers.filter(p => p.active).length

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          <p className="text-xs text-muted-foreground">
            {activeCount} of {visiblePlayers.length} active
          </p>
        </div>
        {onManageClick && (
          <button
            onClick={onManageClick}
            className="text-xs font-medium px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 text-secondary-foreground transition-colors"
          >
            Manage
          </button>
        )}
      </div>

      {/* Search */}
      {onSearchChange && (
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            placeholder="Search players..."
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-muted/50 border border-border/50 placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
          />
        </div>
      )}

      {/* Player List */}
      <div className="space-y-1">
        {visiblePlayers.map(player => (
          <PlayerListItem
            key={player.id}
            player={player}
            onToggle={() => onTogglePlayer(player.id)}
          />
        ))}
        {visiblePlayers.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No players found
          </p>
        )}
      </div>
    </div>
  )
}

/**
 * Individual player list item with avatar and toggle
 */
function PlayerListItem({
  player,
  onToggle,
}: {
  player: PlayerProfile
  onToggle: () => void
}) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        "w-full flex items-center gap-3 p-2 rounded-lg transition-all duration-200",
        "hover:bg-accent/50 active:scale-[0.98]",
        player.active 
          ? "bg-accent/30 ring-1 ring-accent/50" 
          : "bg-transparent"
      )}
    >
      {/* Avatar */}
      <div className="relative shrink-0">
        <Image
          src={getAvatarUrl(player)}
          alt={player.name}
          width={36}
          height={36}
          unoptimized
          className={cn(
            "w-9 h-9 rounded-full object-cover ring-2 transition-all",
            player.active 
              ? "ring-primary/50" 
              : "ring-border/50 opacity-60"
          )}
        />
        {player.active && (
          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-game-success rounded-full border-2 border-background" />
        )}
      </div>

      {/* Name */}
      <span className={cn(
        "flex-1 text-left text-sm font-medium truncate transition-colors",
        player.active ? "text-foreground" : "text-muted-foreground"
      )}>
        {player.name}
      </span>

      {/* Toggle indicator */}
      <div className={cn(
        "w-8 h-5 rounded-full p-0.5 transition-colors shrink-0",
        player.active ? "bg-primary" : "bg-muted"
      )}>
        <div className={cn(
          "w-4 h-4 rounded-full bg-white shadow transition-transform",
          player.active ? "translate-x-3" : "translate-x-0"
        )} />
      </div>
    </button>
  )
}
