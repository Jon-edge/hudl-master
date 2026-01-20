"use client"

import * as React from "react"
import { Camera, Minus, Pencil, Plus, Trash2, Users } from "lucide-react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/Input"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { PlayerProfile } from "./types"
import { getAvatarUrl, makePlayerId } from "./api"

interface PlayerManagerProps {
  isOpen: boolean
  onClose: () => void
  players: PlayerProfile[]
  onSave: (players: PlayerProfile[]) => Promise<void>
  onUploadAvatar: (id: string, file: File) => Promise<string | null>
}

export function PlayerManager({
  isOpen,
  onClose,
  players,
  onSave,
  onUploadAvatar,
}: PlayerManagerProps) {
  const [draftPlayers, setDraftPlayers] = React.useState<PlayerProfile[]>(players)
  const [isSaving, setIsSaving] = React.useState(false)
  const [uploadingId, setUploadingId] = React.useState<string | null>(null)

  // Sync draft with props when opened
  React.useEffect(() => {
    if (isOpen) {
      setDraftPlayers(players)
    }
  }, [isOpen, players])

  const handleSave = async () => {
    setIsSaving(true)
    await onSave(draftPlayers)
    setIsSaving(false)
    onClose()
  }

  const updatePlayer = (id: string, updates: Partial<PlayerProfile>) => {
    setDraftPlayers((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
    )
  }

  const addPlayer = () => {
    const newPlayer: PlayerProfile = {
      id: makePlayerId(),
      name: `Player ${draftPlayers.length + 1}`,
      wins: 0,
      active: true,
      archived: false,
    }
    setDraftPlayers((prev) => [...prev, newPlayer])
  }

  const archivePlayer = (id: string) => {
    updatePlayer(id, { archived: true, active: false })
  }

  const handleFileChange = async (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingId(id)
    try {
      const url = await onUploadAvatar(id, file)
      if (url) {
        updatePlayer(id, { avatarUrl: url })
      }
    } finally {
      setUploadingId(null)
    }
  }

  const visiblePlayers = draftPlayers.filter((p) => !p.archived)

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Manage Players</DialogTitle>
          <DialogDescription>
            Add, edit, or remove players from the game roster.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 py-2">
          <Button onClick={addPlayer} size="sm" className="gap-2">
            <Plus className="h-4 w-4" /> Add Player
          </Button>
          <div className="ml-auto text-sm text-muted-foreground">
            {visiblePlayers.length} Active Players
          </div>
        </div>

        <ScrollArea className="flex-1 pr-4 -mr-4">
          <div className="flex flex-col gap-3 pb-2">
            {visiblePlayers.map((player) => (
              <div
                key={player.id}
                className="flex items-center justify-between rounded-lg border p-3 bg-card"
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="relative h-12 w-12 shrink-0">
                    <Image
                      src={getAvatarUrl(player)}
                      alt={player.name}
                      fill
                      className="rounded-full object-cover border"
                    />
                    <label
                      htmlFor={`avatar-${player.id}`}
                      className="absolute -bottom-1 -right-1 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
                    >
                      {uploadingId === player.id ? (
                        <span className="h-2 w-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      ) : (
                        <Camera className="h-3 w-3" />
                      )}
                      <input
                        id={`avatar-${player.id}`}
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={(e) => handleFileChange(player.id, e)}
                        disabled={uploadingId === player.id}
                      />
                    </label>
                  </div>
                  
                  <div className="flex-1 min-w-0 max-w-[200px]">
                    <Input
                      value={player.name}
                      onChange={(e) => updatePlayer(player.id, { name: e.target.value })}
                      className="h-8 font-medium"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <div className="flex items-center rounded-md border bg-background shadow-sm">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-l-md rounded-r-none"
                      onClick={() => updatePlayer(player.id, { wins: Math.max(0, player.wins - 1) })}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <div className="w-8 text-center text-sm font-medium tabular-nums">
                      {player.wins}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-l-none rounded-r-md"
                      onClick={() => updatePlayer(player.id, { wins: player.wins + 1 })}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => archivePlayer(player.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
