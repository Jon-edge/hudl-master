import { Button } from "@/components/ui/button"
import { LayoutDashboard, Pause, Play, Settings, Users, Volume2, VolumeX } from "lucide-react"

interface PlinkoControlsProps {
  started: boolean
  rightSidebarMode: "leaderboard" | "config"
  soundEnabled: boolean
  onStartStop: () => void
  onToggleRightSidebar: () => void
  onToggleSound: () => void
  onOpenPlayers: () => void
  onOpenDetails: () => void
}

export function PlinkoControls({
  started,
  rightSidebarMode,
  soundEnabled,
  onStartStop,
  onToggleRightSidebar,
  onToggleSound,
  onOpenPlayers,
  onOpenDetails
}: PlinkoControlsProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-6">
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={onStartStop} className="min-w-[140px] gap-2">
          {started ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          {started ? "Pause" : "Play"}
        </Button>
        <Button variant="outline" onClick={onToggleRightSidebar} className="gap-2">
          {rightSidebarMode === "config" ? (
            <LayoutDashboard className="h-4 w-4" />
          ) : (
            <Settings className="h-4 w-4" />
          )}
          {rightSidebarMode === "config" ? "Leaderboard" : "Config"}
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" onClick={onToggleSound} className="gap-2">
          {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          {soundEnabled ? "Sound On" : "Muted"}
        </Button>
        <Button variant="outline" className="gap-2 lg:hidden" onClick={onOpenPlayers}>
          <Users className="h-4 w-4" />
          Players
        </Button>
        <Button variant="outline" className="gap-2 lg:hidden" onClick={onOpenDetails}>
          <LayoutDashboard className="h-4 w-4" />
          Details
        </Button>
      </div>
    </div>
  )
}
