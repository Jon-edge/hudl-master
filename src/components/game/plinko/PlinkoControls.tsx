"use client"

import * as React from "react"
import { Play, Settings, Square, Volume2, VolumeX } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface PlinkoControlsProps {
  isRunning: boolean
  onStart: () => void
  onStop: () => void
  isConfigOpen: boolean
  onToggleConfig: () => void
  isMuted: boolean
  onToggleSound: () => void
  className?: string
}

export function PlinkoControls({
  isRunning,
  onStart,
  onStop,
  isConfigOpen,
  onToggleConfig,
  isMuted,
  onToggleSound,
  className,
}: PlinkoControlsProps) {
  return (
    <div className={cn("flex items-center gap-2 rounded-full border bg-background/80 p-2 backdrop-blur shadow-lg", className)}>
      <Button
        size="lg"
        className={cn("h-12 w-12 rounded-full transition-all", isRunning ? "bg-destructive hover:bg-destructive/90" : "bg-primary hover:bg-primary/90")}
        onClick={isRunning ? onStop : onStart}
      >
        {isRunning ? (
          <Square className="h-5 w-5 fill-current" />
        ) : (
          <Play className="h-6 w-6 fill-current ml-1" />
        )}
        <span className="sr-only">{isRunning ? "Stop" : "Start"}</span>
      </Button>

      <div className="h-8 w-px bg-border mx-1" />

      <Button
        variant={isConfigOpen ? "secondary" : "ghost"}
        size="icon"
        className="h-10 w-10 rounded-full"
        onClick={onToggleConfig}
      >
        <Settings className="h-5 w-5" />
        <span className="sr-only">Settings</span>
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className="h-10 w-10 rounded-full"
        onClick={onToggleSound}
      >
        {isMuted ? (
          <VolumeX className="h-5 w-5 text-muted-foreground" />
        ) : (
          <Volume2 className="h-5 w-5" />
        )}
        <span className="sr-only">{isMuted ? "Unmute" : "Mute"}</span>
      </Button>
    </div>
  )
}
