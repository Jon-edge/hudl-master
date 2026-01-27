"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/Input"
import { RangeSlider } from "@/components/ui/RangeSlider"
import type { RouletteConfig } from "./types"
import { type GameType, GAMES } from "../types"

export interface RouletteConfigPanelProps {
  config: RouletteConfig
  onConfigChange: <K extends keyof RouletteConfig>(key: K, value: RouletteConfig[K]) => void
  onSaveToServer?: () => void
  isSaving?: boolean
  saveMessage?: { type: "success" | "error"; text: string } | null
  className?: string
  // Game selection
  currentGame?: GameType
  onGameChange?: (game: GameType) => void
}

interface CollapsibleSectionProps {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
}

function CollapsibleSection({ title, children, defaultOpen = true }: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen)
  
  return (
    <div className="border border-border/50 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 bg-muted/30 hover:bg-muted/50 transition-colors"
      >
        <span className="text-sm font-semibold">{title}</span>
        <svg 
          className={cn("w-4 h-4 transition-transform", isOpen && "rotate-180")} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && (
        <div className="p-3 space-y-3">
          {children}
        </div>
      )}
    </div>
  )
}

function ConfigRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <label className="w-28 text-sm text-muted-foreground shrink-0">{label}</label>
      <div className="flex-1 flex items-center gap-2">
        {children}
      </div>
    </div>
  )
}

/**
 * RouletteConfigPanel - Configuration panel for Roulette game
 */
export function RouletteConfigPanel({
  config,
  onConfigChange,
  onSaveToServer,
  isSaving = false,
  saveMessage,
  className,
  currentGame = "roulette",
  onGameChange,
}: RouletteConfigPanelProps) {
  return (
    <div className={cn("space-y-4", className)}>
      {/* Game Selection */}
      {onGameChange && (
        <CollapsibleSection title="🎮 Game Selection" defaultOpen={true}>
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(GAMES) as GameType[]).map(gameId => {
              const game = GAMES[gameId]
              const isSelected = currentGame === gameId
              return (
                <button
                  key={gameId}
                  onClick={() => onGameChange(gameId)}
                  className={cn(
                    "flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all",
                    isSelected 
                      ? "border-primary bg-primary/10 shadow-md" 
                      : "border-border/50 hover:border-primary/50 hover:bg-muted/50"
                  )}
                >
                  <span className="text-2xl">{game.icon}</span>
                  <span className={cn(
                    "font-semibold text-sm",
                    isSelected ? "text-primary" : "text-foreground"
                  )}>
                    {game.name}
                  </span>
                </button>
              )
            })}
          </div>
          <p className="text-xs text-muted-foreground text-center mt-2">
            {GAMES[currentGame].description}
          </p>
        </CollapsibleSection>
      )}

      {/* Header with Save */}
      {onSaveToServer && (
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            onClick={onSaveToServer}
            disabled={isSaving}
          >
            {isSaving ? "Saving..." : "Save to Server"}
          </Button>
          {saveMessage && (
            <span className={cn(
              "text-xs px-2 py-1 rounded",
              saveMessage.type === "success" 
                ? "bg-game-success/20 text-game-success" 
                : "bg-destructive/20 text-destructive"
            )}>
              {saveMessage.text}
            </span>
          )}
        </div>
      )}

      {/* Wheel Style */}
      <CollapsibleSection title="🎰 Wheel Style" defaultOpen={true}>
        <div className="flex gap-2">
          <button
            onClick={() => onConfigChange("wheelStyle", "european")}
            className={cn(
              "flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all border-2",
              config.wheelStyle === "european"
                ? "border-green-500 bg-green-500/20 text-green-400"
                : "border-border hover:border-green-500/50 hover:bg-muted/50 text-foreground/80"
            )}
          >
            🇪🇺 European
          </button>
          <button
            onClick={() => onConfigChange("wheelStyle", "american")}
            className={cn(
              "flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all border-2",
              config.wheelStyle === "american"
                ? "border-blue-500 bg-blue-500/20 text-blue-400"
                : "border-border hover:border-blue-500/50 hover:bg-muted/50 text-foreground/80"
            )}
          >
            🇺🇸 American
          </button>
          <button
            onClick={() => onConfigChange("wheelStyle", "players")}
            className={cn(
              "flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all border-2",
              config.wheelStyle === "players"
                ? "border-purple-500 bg-purple-500/20 text-purple-400"
                : "border-border hover:border-purple-500/50 hover:bg-muted/50 text-foreground/80"
            )}
          >
            👥 Players
          </button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          {config.wheelStyle === "european"
            ? "European wheel has single 0 (37 slots)"
            : config.wheelStyle === "american"
            ? "American wheel has 0 and 00 (38 slots)"
            : "One slot per player in the game"}
        </p>
      </CollapsibleSection>

      {/* Wheel Settings */}
      <CollapsibleSection title="🎡 Wheel Settings">
        <ConfigRow label="Wheel Size">
          <RangeSlider
            className="flex-1"
            value={config.wheelSize}
            onValueChange={v => onConfigChange("wheelSize", v)}
            min={300}
            max={700}
          />
          <Input
            className="w-16 h-8 text-xs"
            type="number"
            value={config.wheelSize}
            onChange={e => onConfigChange("wheelSize", Number(e.target.value))}
            min={300}
            max={700}
          />
        </ConfigRow>

        <ConfigRow label="Wheel Speed">
          <RangeSlider
            className="flex-1"
            value={config.wheelSpinSpeed}
            onValueChange={v => onConfigChange("wheelSpinSpeed", v)}
            min={0.0}
            max={8.0}
            step={0.1}
          />
          <Input
            className="w-16 h-8 text-xs"
            type="number"
            value={config.wheelSpinSpeed}
            onChange={e => onConfigChange("wheelSpinSpeed", Number(e.target.value))}
            min={0.0}
            max={8.0}
            step={0.1}
          />
        </ConfigRow>
        <p className="text-xs text-muted-foreground mb-2">
          Higher = wheel spins faster initially
        </p>

        <ConfigRow label="Wheel Friction">
          <RangeSlider
            className="flex-1"
            value={config.wheelFriction}
            onValueChange={v => onConfigChange("wheelFriction", v)}
            min={0.95}
            max={0.999}
            step={0.001}
          />
          <Input
            className="w-20 h-8 text-xs"
            type="number"
            value={config.wheelFriction}
            onChange={e => onConfigChange("wheelFriction", Number(e.target.value))}
            min={0.95}
            max={0.999}
            step={0.001}
          />
        </ConfigRow>
        <p className="text-xs text-muted-foreground mb-2">
          Higher = wheel spins longer (0.99 = ~5s, 0.995 = ~10s)
        </p>

        <ConfigRow label="Deflectors">
          <RangeSlider
            className="flex-1"
            value={config.deflectorCount}
            onValueChange={v => onConfigChange("deflectorCount", v)}
            min={0}
            max={20}
          />
          <Input
            className="w-16 h-8 text-xs"
            type="number"
            value={config.deflectorCount}
            onChange={e => onConfigChange("deflectorCount", Number(e.target.value))}
            min={0}
            max={20}
          />
        </ConfigRow>
      </CollapsibleSection>

      {/* Ball Settings */}
      <CollapsibleSection title="⚪ Ball Settings">
        <ConfigRow label="Ball Size">
          <RangeSlider
            className="flex-1"
            value={config.ballSize}
            onValueChange={v => onConfigChange("ballSize", v)}
            min={6}
            max={20}
          />
          <Input
            className="w-16 h-8 text-xs"
            type="number"
            value={config.ballSize}
            onChange={e => onConfigChange("ballSize", Number(e.target.value))}
            min={6}
            max={20}
          />
        </ConfigRow>

        <ConfigRow label="Throw Speed">
          <RangeSlider
            className="flex-1"
            value={config.ballThrowSpeed}
            onValueChange={v => onConfigChange("ballThrowSpeed", v)}
            min={0.0}
            max={8.0}
            step={0.1}
          />
          <Input
            className="w-16 h-8 text-xs"
            type="number"
            value={config.ballThrowSpeed}
            onChange={e => onConfigChange("ballThrowSpeed", Number(e.target.value))}
            min={0.0}
            max={8.0}
            step={0.1}
          />
        </ConfigRow>
        <p className="text-xs text-muted-foreground mb-2">
          Higher = ball thrown faster, more rotations
        </p>

        <ConfigRow label="Bounce">
          <RangeSlider
            className="flex-1"
            value={config.ballRestitution}
            onValueChange={v => onConfigChange("ballRestitution", v)}
            min={0.0}
            max={3.0}
            step={0.05}
          />
          <Input
            className="w-16 h-8 text-xs"
            type="number"
            value={config.ballRestitution}
            onChange={e => onConfigChange("ballRestitution", Number(e.target.value))}
            min={0.0}
            max={3.0}
            step={0.05}
          />
        </ConfigRow>

        <ConfigRow label="Ball Friction">
          <RangeSlider
            className="flex-1"
            value={config.ballFriction}
            onValueChange={v => onConfigChange("ballFriction", v)}
            min={0.0}
            max={1.0}
            step={0.01}
          />
          <Input
            className="w-16 h-8 text-xs"
            type="number"
            value={config.ballFriction}
            onChange={e => onConfigChange("ballFriction", Number(e.target.value))}
            min={0.0}
            max={1.0}
            step={0.01}
          />
        </ConfigRow>
      </CollapsibleSection>

      {/* Track & Environment */}
      <CollapsibleSection title="🏁 Track & Environment" defaultOpen={false}>
        <ConfigRow label="Track Slope">
          <RangeSlider
            className="flex-1"
            value={config.outerTrackSlope}
            onValueChange={v => onConfigChange("outerTrackSlope", v)}
            min={0.0}
            max={2.0}
            step={0.05}
          />
          <Input
            className="w-16 h-8 text-xs"
            type="number"
            value={config.outerTrackSlope}
            onChange={e => onConfigChange("outerTrackSlope", Number(e.target.value))}
            min={0.0}
            max={2.0}
            step={0.05}
          />
        </ConfigRow>
        <p className="text-xs text-muted-foreground mb-2">
          Higher = steeper bowl angle
        </p>

        <ConfigRow label="Track Friction">
          <RangeSlider
            className="flex-1"
            value={config.trackFriction}
            onValueChange={v => onConfigChange("trackFriction", v)}
            min={0.0}
            max={2.0}
            step={0.01}
          />
          <Input
            className="w-16 h-8 text-xs"
            type="number"
            value={config.trackFriction}
            onChange={e => onConfigChange("trackFriction", Number(e.target.value))}
            min={0.0}
            max={2.0}
            step={0.01}
          />
        </ConfigRow>
        <p className="text-xs text-muted-foreground mb-2">
          Higher = ball slows faster on track
        </p>

        <ConfigRow label="Gravity">
          <RangeSlider
            className="flex-1"
            value={config.gravity}
            onValueChange={v => onConfigChange("gravity", v)}
            min={50}
            max={4000}
            step={25}
          />
          <Input
            className="w-16 h-8 text-xs"
            type="number"
            value={config.gravity}
            onChange={e => onConfigChange("gravity", Number(e.target.value))}
            min={50}
            max={4000}
          />
        </ConfigRow>
        <p className="text-xs text-muted-foreground mb-2">
          Higher = ball falls inward faster
        </p>

        <ConfigRow label="Air Resistance">
          <RangeSlider
            className="flex-1"
            value={config.airResistance}
            onValueChange={v => onConfigChange("airResistance", v)}
            min={0.0}
            max={0.5}
            step={0.01}
          />
          <Input
            className="w-16 h-8 text-xs"
            type="number"
            value={config.airResistance}
            onChange={e => onConfigChange("airResistance", Number(e.target.value))}
            min={0.0}
            max={0.5}
            step={0.01}
          />
        </ConfigRow>
        <p className="text-xs text-muted-foreground">
          Higher = faster spin decay
        </p>
      </CollapsibleSection>

      {/* Advanced Physics */}
      <CollapsibleSection title="⚙️ Advanced Physics" defaultOpen={false}>
        <ConfigRow label="Spin Velocity">
          <RangeSlider
            className="flex-1"
            value={config.spinVelocity}
            onValueChange={v => onConfigChange("spinVelocity", v)}
            min={5}
            max={60}
          />
          <Input
            className="w-16 h-8 text-xs"
            type="number"
            value={config.spinVelocity}
            onChange={e => onConfigChange("spinVelocity", Number(e.target.value))}
            min={5}
            max={60}
          />
        </ConfigRow>
        <p className="text-xs text-muted-foreground mb-2">
          Higher = faster initial spin, longer settle time
        </p>

        <ConfigRow label="Wheel Coupling">
          <RangeSlider
            className="flex-1"
            value={config.wheelCoupling}
            onValueChange={v => onConfigChange("wheelCoupling", v)}
            min={0.0}
            max={10.0}
            step={0.1}
          />
          <Input
            className="w-16 h-8 text-xs"
            type="number"
            value={config.wheelCoupling}
            onChange={e => onConfigChange("wheelCoupling", Number(e.target.value))}
            min={0.0}
            max={10.0}
            step={0.1}
          />
        </ConfigRow>
        <p className="text-xs text-muted-foreground">
          Higher = ball follows wheel rotation in pockets
        </p>
      </CollapsibleSection>
    </div>
  )
}
