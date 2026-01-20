"use client"

import * as React from "react"
import { Search } from "lucide-react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/Input"
import { Switch } from "@/components/ui/Switch"
import { PlayerProfile } from "./types"
import { getAvatarUrl } from "./api"

interface PlayerSidebarProps {
  players: PlayerProfile[]
  onToggleActive: (id: string, active: boolean) => void
  onManage: () => void
}

export function PlayerSidebar({
  players,
  onToggleActive,
  onManage,
}: PlayerSidebarProps) {
  const [search, setSearch] = React.useState("")

  const filteredPlayers = React.useMemo(() => {
    return players
      .filter(p => !p.archived) // Only show non-archived
      .filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [players, search])

  return (
    <div className="flex h-full flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold tracking-tight">Players</h2>
        <Button variant="outline" size="sm" onClick={onManage}>
          Manage
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search players..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="flex-1 overflow-y-auto -mx-2 px-2">
        <div className="flex flex-col gap-2">
          {filteredPlayers.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-4">
              No players found
            </div>
          ) : (
            filteredPlayers.map((player) => (
              <div
                key={player.id}
                className="flex items-center justify-between rounded-lg border border-transparent p-2 hover:bg-muted/50 transition-colors group"
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full border border-border">
                    <Image
                      src={getAvatarUrl(player)}
                      alt={player.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <span className="truncate text-sm font-medium leading-none">
                    {player.name}
                  </span>
                </div>
                <Switch
                  checked={player.active}
                  onCheckedChange={(checked) => onToggleActive(player.id, checked)}
                />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
