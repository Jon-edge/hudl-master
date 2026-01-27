"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/Input"
import { RangeSlider } from "@/components/ui/RangeSlider"
import { type WheelSpinConfig, type WheelGameMode, type SpecialSpaceType, type SpecialSpaceSettings, WHEEL_GAME_MODES, SPECIAL_SPACES } from "./types"
import { type GameType, GAMES } from "../types"

export interface WheelSpinConfigPanelProps {
  config: WheelSpinConfig
  onConfigChange: <K extends keyof WheelSpinConfig>(key: K, value: WheelSpinConfig[K]) => void
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
 * WheelSpinConfigPanel - Configuration panel for Wheel Spin game
 */
export function WheelSpinConfigPanel({
  config,
  onConfigChange,
  onSaveToServer,
  isSaving = false,
  saveMessage,
  className,
  currentGame = "wheelspin",
  onGameChange,
}: WheelSpinConfigPanelProps) {
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

      {/* Win Condition */}
      <CollapsibleSection title="🏆 Win Condition" defaultOpen={true}>
        <div className="space-y-3">
          {(Object.keys(WHEEL_GAME_MODES) as WheelGameMode[]).map(mode => {
            const modeInfo = WHEEL_GAME_MODES[mode]
            const isSelected = config.gameMode === mode
            return (
              <button
                key={mode}
                onClick={() => onConfigChange("gameMode", mode)}
                className={cn(
                  "w-full flex flex-col items-start gap-1 p-3 rounded-lg border-2 transition-all text-left",
                  isSelected
                    ? "border-primary bg-primary/10"
                    : "border-border/50 hover:border-primary/50 hover:bg-muted/50"
                )}
              >
                <span className={cn(
                  "font-semibold text-sm",
                  isSelected ? "text-primary" : "text-foreground"
                )}>
                  {modeInfo.name}
                </span>
                <span className="text-xs text-muted-foreground">
                  {modeInfo.description}
                </span>
              </button>
            )
          })}
        </div>

        {/* Auto-respin setting for elimination mode */}
        {config.gameMode === "elimination" && (
          <div className="mt-3 pt-3 border-t border-border/50">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Auto-Respin</span>
                <button
                  onClick={() => onConfigChange("autoRespin", !config.autoRespin)}
                  className={cn(
                    "px-4 py-1.5 rounded text-xs font-medium transition-all",
                    config.autoRespin
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted hover:bg-muted/80"
                  )}
                >
                  {config.autoRespin ? "Enabled" : "Disabled"}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                {config.autoRespin ? "Automatically spins until winner is determined" : "Requires manual spin after each elimination"}
              </p>
            </div>
          </div>
        )}

        {/* First to X settings */}
        {config.gameMode === "first_to_x" && (
          <div className="mt-3 pt-3 border-t border-border/50 space-y-3">
            <ConfigRow label="Target Count">
              <RangeSlider
                className="flex-1"
                value={config.firstToXTarget}
                onValueChange={v => onConfigChange("firstToXTarget", v)}
                min={2}
                max={10}
              />
              <Input
                className="w-16 h-8 text-xs"
                type="number"
                value={config.firstToXTarget}
                onChange={e => onConfigChange("firstToXTarget", Number(e.target.value))}
                min={2}
                max={10}
              />
            </ConfigRow>
            <ConfigRow label="First to X...">
              <div className="flex gap-2">
                <button
                  onClick={() => onConfigChange("firstToXIsWin", true)}
                  className={cn(
                    "px-3 py-1.5 rounded text-xs font-medium transition-all",
                    config.firstToXIsWin
                      ? "bg-game-success text-white"
                      : "bg-muted hover:bg-muted/80"
                  )}
                >
                  Wins
                </button>
                <button
                  onClick={() => onConfigChange("firstToXIsWin", false)}
                  className={cn(
                    "px-3 py-1.5 rounded text-xs font-medium transition-all",
                    !config.firstToXIsWin
                      ? "bg-destructive text-white"
                      : "bg-muted hover:bg-muted/80"
                  )}
                >
                  Loses
                </button>
              </div>
            </ConfigRow>
          </div>
        )}
      </CollapsibleSection>

      {/* Special Spaces Section */}
      <CollapsibleSection title="✨ Special Spaces" defaultOpen={false}>
        <p className="text-xs text-muted-foreground mb-3">
          Add special wheel spaces with unique effects. Some spaces only work in certain game modes.
        </p>
        <div className="space-y-3">
          {(Object.keys(SPECIAL_SPACES) as SpecialSpaceType[]).map(spaceType => {
            const spaceInfo = SPECIAL_SPACES[spaceType]
            const settings = config.specialSpaces[spaceType]
            const isApplicable = spaceInfo.applicableModes.includes(config.gameMode)
            
            return (
              <div 
                key={spaceType}
                className={cn(
                  "rounded-lg border p-3 transition-all",
                  !isApplicable && "opacity-50",
                  settings.enabled ? "border-primary/50 bg-primary/5" : "border-border/50"
                )}
              >
                <div className="flex items-start gap-3">
                  {/* Toggle */}
                  <button
                    onClick={() => {
                      if (!isApplicable) return
                      const newSpecialSpaces = {
                        ...config.specialSpaces,
                        [spaceType]: { ...settings, enabled: !settings.enabled }
                      }
                      onConfigChange("specialSpaces", newSpecialSpaces)
                    }}
                    disabled={!isApplicable}
                    className={cn(
                      "mt-0.5 w-10 h-6 rounded-full transition-all relative flex-shrink-0",
                      settings.enabled && isApplicable
                        ? "bg-primary"
                        : "bg-muted"
                    )}
                  >
                    <div
                      className={cn(
                        "absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all",
                        settings.enabled ? "left-5" : "left-1"
                      )}
                    />
                  </button>
                  
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span 
                        className="inline-flex items-center justify-center w-6 h-6 rounded text-sm"
                        style={{ backgroundColor: spaceInfo.color, color: spaceInfo.textColor }}
                      >
                        {spaceInfo.emoji}
                      </span>
                      <span className="font-medium text-sm">{spaceInfo.name}</span>
                      {!isApplicable && (
                        <span className="text-xs text-muted-foreground">(not available in this mode)</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {spaceInfo.description}
                    </p>
                    
                    {/* Count selector - only show when enabled */}
                    {settings.enabled && isApplicable && (
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-muted-foreground">Spaces on wheel:</span>
                        <div className="flex gap-1">
                          {[1, 2, 3].map(count => (
                            <button
                              key={count}
                              onClick={() => {
                                const newSpecialSpaces = {
                                  ...config.specialSpaces,
                                  [spaceType]: { ...settings, count }
                                }
                                onConfigChange("specialSpaces", newSpecialSpaces)
                              }}
                              className={cn(
                                "w-7 h-7 rounded text-xs font-medium transition-all",
                                settings.count === count
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted hover:bg-muted/80"
                              )}
                            >
                              {count}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </CollapsibleSection>

      {/* Wheel Section */}
      <CollapsibleSection title="🎡 Wheel">
        <ConfigRow label="Size">
          <RangeSlider
            className="flex-1"
            value={config.wheelSize}
            onValueChange={v => onConfigChange("wheelSize", v)}
            min={200}
            max={600}
          />
          <Input
            className="w-16 h-8 text-xs"
            type="number"
            value={config.wheelSize}
            onChange={e => onConfigChange("wheelSize", Number(e.target.value))}
            min={200}
            max={600}
          />
        </ConfigRow>
        <ConfigRow label="Inner Ratio">
          <RangeSlider
            className="flex-1"
            value={config.innerWheelRatio}
            onValueChange={v => onConfigChange("innerWheelRatio", v)}
            min={0.1}
            max={0.6}
            step={0.05}
          />
          <Input
            className="w-16 h-8 text-xs"
            type="number"
            value={config.innerWheelRatio}
            onChange={e => onConfigChange("innerWheelRatio", Number(e.target.value))}
            min={0.1}
            max={0.6}
            step={0.05}
          />
        </ConfigRow>
      </CollapsibleSection>

      {/* Spin Section */}
      <CollapsibleSection title="🔄 Spin">
        <ConfigRow label="Duration (ms)">
          <RangeSlider
            className="flex-1"
            value={config.spinDuration}
            onValueChange={v => onConfigChange("spinDuration", v)}
            min={2000}
            max={15000}
            step={500}
          />
          <Input
            className="w-20 h-8 text-xs"
            type="number"
            value={config.spinDuration}
            onChange={e => onConfigChange("spinDuration", Number(e.target.value))}
            min={2000}
            max={15000}
            step={500}
          />
        </ConfigRow>
        <ConfigRow label="Min Spins">
          <RangeSlider
            className="flex-1"
            value={config.minSpins}
            onValueChange={v => onConfigChange("minSpins", v)}
            min={1}
            max={10}
          />
          <Input
            className="w-16 h-8 text-xs"
            type="number"
            value={config.minSpins}
            onChange={e => onConfigChange("minSpins", Number(e.target.value))}
            min={1}
            max={10}
          />
        </ConfigRow>
        <ConfigRow label="Max Spins">
          <RangeSlider
            className="flex-1"
            value={config.maxSpins}
            onValueChange={v => onConfigChange("maxSpins", v)}
            min={1}
            max={20}
          />
          <Input
            className="w-16 h-8 text-xs"
            type="number"
            value={config.maxSpins}
            onChange={e => onConfigChange("maxSpins", Number(e.target.value))}
            min={1}
            max={20}
          />
        </ConfigRow>
        <ConfigRow label="Friction">
          <RangeSlider
            className="flex-1"
            value={config.friction}
            onValueChange={v => onConfigChange("friction", v)}
            min={0.90}
            max={0.99}
            step={0.01}
          />
          <Input
            className="w-16 h-8 text-xs"
            type="number"
            value={config.friction}
            onChange={e => onConfigChange("friction", Number(e.target.value))}
            min={0.90}
            max={0.99}
            step={0.01}
          />
        </ConfigRow>
      </CollapsibleSection>

      {/* Display Section */}
      <CollapsibleSection title="👁️ Display" defaultOpen={false}>
        <ConfigRow label="Show Avatars">
          <input
            type="checkbox"
            checked={config.showPlayerAvatars}
            onChange={e => onConfigChange("showPlayerAvatars", e.target.checked)}
            className="w-4 h-4 rounded border-border"
          />
          <span className="text-xs text-muted-foreground">Show player avatars on wheel</span>
        </ConfigRow>
        <ConfigRow label="Show Names">
          <input
            type="checkbox"
            checked={config.showPlayerNames}
            onChange={e => onConfigChange("showPlayerNames", e.target.checked)}
            className="w-4 h-4 rounded border-border"
          />
          <span className="text-xs text-muted-foreground">Show player names on wheel</span>
        </ConfigRow>
        <ConfigRow label="Text Scale">
          <RangeSlider
            className="flex-1"
            value={config.textScale}
            onValueChange={v => onConfigChange("textScale", v)}
            min={0.5}
            max={1.5}
            step={0.1}
          />
          <span className="w-12 text-xs text-center tabular-nums">
            {Math.round(config.textScale * 100)}%
          </span>
        </ConfigRow>
      </CollapsibleSection>
    </div>
  )
}

