import Image from "next/image"
import { Archive, Camera, Minus, Pencil, Plus, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui"
import type { PlayerProfile } from "../plinko/types"

interface PlayerManagerProps {
  open: boolean
  players: PlayerProfile[]
  draftPlayers: PlayerProfile[]
  playersDirty: boolean
  uploadingPlayerId: string | null
  onClose: () => void
  onAddPlayer: () => void
  onSave: () => void
  onSelectAll: () => void
  onClearWins: () => void
  onArchive: (playerId: string) => void
  onUpdateName: (playerId: string, name: string) => void
  onIncrementWins: (playerId: string) => void
  onDecrementWins: (playerId: string) => void
  onUploadAvatar: (playerId: string, file: File) => void
  getAvatarUrl: (player: PlayerProfile) => string
}

export function PlayerManager({
  open,
  players,
  draftPlayers,
  playersDirty,
  uploadingPlayerId,
  onClose,
  onAddPlayer,
  onSave,
  onSelectAll,
  onClearWins,
  onArchive,
  onUpdateName,
  onIncrementWins,
  onDecrementWins,
  onUploadAvatar,
  getAvatarUrl
}: PlayerManagerProps) {
  if (!open) return null
  const visiblePlayers = draftPlayers.filter(player => player.archived !== true)
  const isPlayerPersisted = (playerId: string) =>
    players.some(existing => existing.id === playerId)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="glass-panel flex w-full max-w-4xl flex-col gap-4 rounded-2xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Player Manager</h2>
            <p className="text-sm text-slate-500">
              Edit names, update wins, and manage avatars.
            </p>
          </div>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={onAddPlayer} className="gap-2">
            <Users className="h-4 w-4" />
            Add player
          </Button>
          <Button variant="outline" onClick={onSelectAll}>
            Select all
          </Button>
          <Button variant="outline" onClick={onClearWins}>
            Clear wins
          </Button>
          <Button onClick={onSave} disabled={!playersDirty}>
            {playersDirty ? "Save changes" : "Saved"}
          </Button>
          {playersDirty && <span className="text-xs text-slate-500">Unsaved changes</span>}
        </div>

        <div className="max-h-[70vh] space-y-3 overflow-y-auto pr-2">
          {visiblePlayers.map(player => (
            <div
              key={player.id}
              className="flex flex-col gap-3 rounded-2xl border border-white/60 bg-white/70 p-4 shadow-sm transition hover:bg-white/90 md:flex-row md:items-center"
            >
              <div className="flex items-center gap-3">
                <Image
                  src={getAvatarUrl(player)}
                  alt={`${player.name} avatar`}
                  width={64}
                  height={64}
                  unoptimized
                  className="h-16 w-16 rounded-full object-cover"
                />
                <div className="space-y-1">
                  <span className="text-xs uppercase tracking-wide text-slate-500">
                    Player
                  </span>
                  <Input
                    className="min-w-[200px] font-semibold"
                    value={player.name}
                    onChange={event => onUpdateName(player.id, event.target.value)}
                  />
                </div>
              </div>
              <div className="flex flex-1 flex-wrap items-center gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase tracking-wide text-slate-500">
                    Wins
                  </span>
                  <Button
                    variant="outline"
                    className="h-8 w-8 p-0"
                    onClick={() =>
                      (isPlayerPersisted(player.id) ? onDecrementWins : onDecrementWins)(
                        player.id
                      )
                    }
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-8 text-center font-semibold">{player.wins}</span>
                  <Button
                    variant="outline"
                    className="h-8 w-8 p-0"
                    onClick={() =>
                      (isPlayerPersisted(player.id) ? onIncrementWins : onIncrementWins)(
                        player.id
                      )
                    }
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white/80 text-slate-500">
                    <Pencil className="h-4 w-4" />
                  </span>
                  <input
                    id={`avatar-upload-${player.id}`}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={event => {
                      const file = event.target.files?.[0]
                      if (file != null) {
                        onUploadAvatar(player.id, file)
                      }
                      event.target.value = ""
                    }}
                  />
                  <Button
                    asChild
                    variant="outline"
                    disabled={uploadingPlayerId === player.id}
                  >
                    <label htmlFor={`avatar-upload-${player.id}`}>
                      <span className="flex items-center gap-2">
                        <Camera className="h-4 w-4" />
                        {uploadingPlayerId === player.id ? "Uploading..." : "Upload photo"}
                      </span>
                    </label>
                  </Button>
                  <Button variant="outline" onClick={() => onArchive(player.id)} className="gap-2">
                    <Archive className="h-4 w-4" />
                    Archive
                  </Button>
                </div>
              </div>
            </div>
          ))}
          {visiblePlayers.length === 0 && (
            <p className="text-sm text-slate-500">No active players to manage.</p>
          )}
        </div>
      </div>
    </div>
  )
}
