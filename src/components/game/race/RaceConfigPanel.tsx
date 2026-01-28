"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { RangeSlider } from "@/components/ui/RangeSlider"
import {
  type RaceConfig,
  type RacerTheme,
  RACER_THEMES,
} from "./types"
import { type GameType, GAMES } from "../types"

export interface RaceConfigPanelProps {
  config: RaceConfig
  onConfigChange: <K extends keyof RaceConfig>(key: K, value: RaceConfig[K]) => void
  onSaveToServer?: () => void
  isSaving?: boolean
  saveMessage?: { type: "success" | "error"; text: string } | null
  className?: string
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

export function RaceConfigPanel({
  config,
  onConfigChange,
  onSaveToServer,
  isSaving = false,
  saveMessage,
  className,
  currentGame = "race",
  onGameChange,
}: RaceConfigPanelProps) {
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
                  <span className="text-xs font-medium">{game.name}</span>
                </button>
              )
            })}
          </div>
        </CollapsibleSection>
      )}

      {/* Racer Theme */}
      <CollapsibleSection title="🎨 Race Theme" defaultOpen={true}>
        <div className="grid grid-cols-3 gap-2">
          {(Object.keys(RACER_THEMES) as RacerTheme[]).map(theme => {
            const info = RACER_THEMES[theme]
            const isSelected = config.racerTheme === theme
            return (
              <button
                key={theme}
                onClick={() => onConfigChange("racerTheme", theme)}
                className={cn(
                  "flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-all",
                  isSelected
                    ? "border-primary bg-primary/10"
                    : "border-border/50 hover:border-primary/50"
                )}
              >
                <span className="text-2xl">{info.emoji}</span>
                <span className="text-xs">{info.name.replace(" Race", "")}</span>
              </button>
            )
          })}
        </div>
      </CollapsibleSection>

      {/* Race Dynamics */}
      <CollapsibleSection title="⚡ Race Dynamics" defaultOpen={true}>
        <ConfigRow label="Base Speed">
          <RangeSlider
            value={config.baseSpeed}
            onValueChange={(v) => onConfigChange("baseSpeed", v)}
            min={1}
            max={8}
            step={0.5}
          />
          <span className="w-12 text-right text-sm">{config.baseSpeed}</span>
        </ConfigRow>

        <ConfigRow label="Chaos">
          <RangeSlider
            value={config.speedVariation}
            onValueChange={(v) => onConfigChange("speedVariation", v)}
            min={0}
            max={2}
            step={0.1}
          />
          <span className="w-12 text-right text-sm">{config.speedVariation.toFixed(1)}</span>
        </ConfigRow>

        <ConfigRow label="Boost %">
          <RangeSlider
            value={config.boostChance * 100}
            onValueChange={(v) => onConfigChange("boostChance", v / 100)}
            min={0}
            max={10}
            step={0.5}
          />
          <span className="w-12 text-right text-sm">{(config.boostChance * 100).toFixed(1)}%</span>
        </ConfigRow>

        <ConfigRow label="Boost Power">
          <RangeSlider
            value={config.boostMultiplier}
            onValueChange={(v) => onConfigChange("boostMultiplier", v)}
            min={1.5}
            max={5}
            step={0.25}
          />
          <span className="w-12 text-right text-sm">{config.boostMultiplier}x</span>
        </ConfigRow>

        <ConfigRow label="Slowdown %">
          <RangeSlider
            value={config.slowdownChance * 100}
            onValueChange={(v) => onConfigChange("slowdownChance", v / 100)}
            min={0}
            max={10}
            step={0.5}
          />
          <span className="w-12 text-right text-sm">{(config.slowdownChance * 100).toFixed(1)}%</span>
        </ConfigRow>

        <ConfigRow label="Anim Speed">
          <RangeSlider
            value={config.animationSpeed}
            onValueChange={(v) => onConfigChange("animationSpeed", v)}
            min={0.5}
            max={3}
            step={0.25}
          />
          <span className="w-12 text-right text-sm">{config.animationSpeed}x</span>
        </ConfigRow>
      </CollapsibleSection>

      {/* Visual Settings */}
      <CollapsibleSection title="👁️ Display" defaultOpen={false}>
        <ConfigRow label="Track Length">
          <RangeSlider
            value={config.trackLength}
            onValueChange={(v) => onConfigChange("trackLength", v)}
            min={400}
            max={900}
            step={50}
          />
          <span className="w-12 text-right text-sm">{config.trackLength}px</span>
        </ConfigRow>

        <ConfigRow label="Lane Height">
          <RangeSlider
            value={config.laneHeight}
            onValueChange={(v) => onConfigChange("laneHeight", v)}
            min={40}
            max={80}
            step={5}
          />
          <span className="w-12 text-right text-sm">{config.laneHeight}px</span>
        </ConfigRow>

        <div className="flex items-center justify-between py-1">
          <span className="text-sm text-muted-foreground">Show Names</span>
          <button
            onClick={() => onConfigChange("showPlayerNames", !config.showPlayerNames)}
            className={cn(
              "w-10 h-6 rounded-full transition-colors relative",
              config.showPlayerNames ? "bg-primary" : "bg-muted"
            )}
          >
            <div
              className={cn(
                "absolute top-1 w-4 h-4 rounded-full bg-white transition-transform",
                config.showPlayerNames ? "translate-x-5" : "translate-x-1"
              )}
            />
          </button>
        </div>

        <div className="flex items-center justify-between py-1">
          <span className="text-sm text-muted-foreground">Show Avatars</span>
          <button
            onClick={() => onConfigChange("showPlayerAvatars", !config.showPlayerAvatars)}
            className={cn(
              "w-10 h-6 rounded-full transition-colors relative",
              config.showPlayerAvatars ? "bg-primary" : "bg-muted"
            )}
          >
            <div
              className={cn(
                "absolute top-1 w-4 h-4 rounded-full bg-white transition-transform",
                config.showPlayerAvatars ? "translate-x-5" : "translate-x-1"
              )}
            />
          </button>
        </div>

        <div className="flex items-center justify-between py-1">
          <span className="text-sm text-muted-foreground">Dramatic Finish</span>
          <button
            onClick={() => onConfigChange("dramaticFinish", !config.dramaticFinish)}
            className={cn(
              "w-10 h-6 rounded-full transition-colors relative",
              config.dramaticFinish ? "bg-primary" : "bg-muted"
            )}
          >
            <div
              className={cn(
                "absolute top-1 w-4 h-4 rounded-full bg-white transition-transform",
                config.dramaticFinish ? "translate-x-5" : "translate-x-1"
              )}
            />
          </button>
        </div>
      </CollapsibleSection>

      {/* Save Button */}
      {onSaveToServer && (
        <div className="pt-2">
          <Button
            onClick={onSaveToServer}
            disabled={isSaving}
            variant="outline"
            size="sm"
            className="w-full"
          >
            {isSaving ? "Saving..." : "Save to Server"}
          </Button>
          {saveMessage && (
            <p
              className={cn(
                "text-xs mt-1 text-center",
                saveMessage.type === "success" ? "text-green-500" : "text-red-500"
              )}
            >
              {saveMessage.text}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
