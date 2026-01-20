import Image from "next/image"
import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input, Switch } from "@/components/ui"
import type { PlayerProfile } from "../plinko/types"

interface PlayerSidebarProps {
  players: PlayerProfile[]
  onTogglePlayer: (playerId: string) => void
  onOpenManager: () => void
  getAvatarUrl: (player: PlayerProfile) => string
}

export function PlayerSidebar({
  players,
  onTogglePlayer,
  onOpenManager,
  getAvatarUrl
}: PlayerSidebarProps) {
  const [query, setQuery] = useState("")
  const filteredPlayers = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    const visible = players.filter(player => player.archived !== true)
    const sorted = [...visible].sort((a, b) => a.name.localeCompare(b.name))
    if (normalized.length === 0) return sorted
    return sorted.filter(player => player.name.toLowerCase().includes(normalized))
  }, [players, query])

  return (
    <div className="glass-panel flex h-full flex-col gap-4 rounded-2xl p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">
          Roster
        </h2>
        <Button variant="outline" size="sm" onClick={onOpenManager}>
          Manage
        </Button>
      </div>
      <Input
        placeholder="Search players..."
        value={query}
        onChange={event => setQuery(event.target.value)}
      />
      <div className="flex flex-1 flex-col gap-3 overflow-y-auto pr-1">
        {filteredPlayers.map(player => (
          <div
            key={player.id}
            className="flex items-center gap-3 rounded-xl border border-white/60 bg-white/70 px-3 py-2 shadow-sm"
          >
            <Image
              src={getAvatarUrl(player)}
              alt={`${player.name} avatar`}
              width={40}
              height={40}
              unoptimized
              className="h-10 w-10 rounded-full object-cover"
            />
            <div className="flex flex-1 flex-col">
              <span className="text-sm font-semibold text-slate-800">
                {player.name}
              </span>
              <span className="text-xs text-slate-500">
                {player.wins} wins
              </span>
            </div>
            <Switch
              checked={player.active}
              onCheckedChange={() => onTogglePlayer(player.id)}
            />
          </div>
        ))}
        {filteredPlayers.length === 0 && (
          <p className="text-xs text-slate-500">No matching players.</p>
        )}
      </div>
    </div>
  )
}
