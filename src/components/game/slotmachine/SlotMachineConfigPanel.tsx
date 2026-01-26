"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/Input"
import { RangeSlider } from "@/components/ui/RangeSlider"
import type { SlotMachineConfig, WinCondition, TripleResponse, BonusRoundsMode } from "./types"
import { type GameType, GAMES } from "../types"

export interface SlotMachineConfigPanelProps {
  config: SlotMachineConfig
  onConfigChange: <K extends keyof SlotMachineConfig>(key: K, value: SlotMachineConfig[K]) => void
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
 * SlotMachineConfigPanel - Configuration panel for Slot Machine game
 */
export function SlotMachineConfigPanel({
  config,
  onConfigChange,
  onSaveToServer,
  isSaving = false,
  saveMessage,
  className,
  currentGame = "slotmachine",
  onGameChange,
}: SlotMachineConfigPanelProps) {
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
            {GAMES[currentGame]?.description ?? "Select a game"}
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

      {/* Machine Section */}
      <CollapsibleSection title="🎰 Machine">
        <ConfigRow label="Reels">
          <RangeSlider
            className="flex-1"
            value={config.reelCount}
            onValueChange={v => onConfigChange("reelCount", v)}
            min={3}
            max={5}
          />
          <Input
            className="w-16 h-8 text-xs"
            type="number"
            value={config.reelCount}
            onChange={e => onConfigChange("reelCount", Number(e.target.value))}
            min={3}
            max={5}
          />
        </ConfigRow>
        <ConfigRow label="Symbol Size">
          <RangeSlider
            className="flex-1"
            value={config.symbolSize}
            onValueChange={v => onConfigChange("symbolSize", v)}
            min={60}
            max={240}
            step={10}
          />
          <Input
            className="w-16 h-8 text-xs"
            type="number"
            value={config.symbolSize}
            onChange={e => onConfigChange("symbolSize", Number(e.target.value))}
            min={60}
            max={240}
            step={10}
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
            min={1000}
            max={5000}
            step={250}
          />
          <Input
            className="w-20 h-8 text-xs"
            type="number"
            value={config.spinDuration}
            onChange={e => onConfigChange("spinDuration", Number(e.target.value))}
            min={1000}
            max={5000}
            step={250}
          />
        </ConfigRow>
        <ConfigRow label="Reel Delay (ms)">
          <RangeSlider
            className="flex-1"
            value={config.reelDelay}
            onValueChange={v => onConfigChange("reelDelay", v)}
            min={100}
            max={800}
            step={50}
          />
          <Input
            className="w-20 h-8 text-xs"
            type="number"
            value={config.reelDelay}
            onChange={e => onConfigChange("reelDelay", Number(e.target.value))}
            min={100}
            max={800}
            step={50}
          />
        </ConfigRow>
        <ConfigRow label="Celebrate (ms)">
          <RangeSlider
            className="flex-1"
            value={config.celebrationDuration}
            onValueChange={v => onConfigChange("celebrationDuration", v)}
            min={2000}
            max={6000}
            step={500}
          />
          <Input
            className="w-20 h-8 text-xs"
            type="number"
            value={config.celebrationDuration}
            onChange={e => onConfigChange("celebrationDuration", Number(e.target.value))}
            min={2000}
            max={6000}
            step={500}
          />
        </ConfigRow>
      </CollapsibleSection>

      {/* Display Section */}
      <CollapsibleSection title="👁️ Display" defaultOpen={false}>
        <ConfigRow label="Show Avatars">
          <input
            type="checkbox"
            checked={config.showAvatars}
            onChange={e => onConfigChange("showAvatars", e.target.checked)}
            className="w-4 h-4 rounded border-border"
          />
          <span className="text-xs text-muted-foreground">Show player avatars on reels</span>
        </ConfigRow>
        <ConfigRow label="Show Names">
          <input
            type="checkbox"
            checked={config.showNames}
            onChange={e => onConfigChange("showNames", e.target.checked)}
            className="w-4 h-4 rounded border-border"
          />
          <span className="text-xs text-muted-foreground">Show player names under symbols</span>
        </ConfigRow>
        <ConfigRow label="Jackpot Mode">
          <input
            type="checkbox"
            checked={config.jackpotMode}
            onChange={e => onConfigChange("jackpotMode", e.target.checked)}
            className="w-4 h-4 rounded border-border"
          />
          <span className="text-xs text-muted-foreground">Extra celebration for matching reels</span>
        </ConfigRow>
      </CollapsibleSection>

      {/* Game Rules Section */}
      <CollapsibleSection title="🎲 Game Rules" defaultOpen={true}>
        <ConfigRow label="Win Condition">
          <select
            value={config.winCondition}
            onChange={e => onConfigChange("winCondition", e.target.value as WinCondition)}
            className="flex-1 h-8 text-xs rounded border border-border bg-background px-2"
          >
            <option value="middle">Middle Reel Wins</option>
            <option value="pair">Pair Required</option>
            <option value="triple">Triple Required</option>
          </select>
        </ConfigRow>
        <p className="text-xs text-muted-foreground pl-[7.5rem]">
          {config.winCondition === "middle" && "Winner is determined by the middle reel"}
          {config.winCondition === "pair" && "Need 2 matching to win, otherwise bonus round"}
          {config.winCondition === "triple" && "Need 3 matching to win, otherwise bonus round"}
        </p>

        {/* Triple Response - only shown when win condition is not "triple" */}
        {config.winCondition !== "triple" && (
          <>
            <ConfigRow label="On 3-in-a-row">
              <select
                value={config.tripleResponse}
                onChange={e => onConfigChange("tripleResponse", e.target.value as TripleResponse)}
                className="flex-1 h-8 text-xs rounded border border-border bg-background px-2"
              >
                <option value="disabled">Nothing Special</option>
                <option value="burn">Burn & Reroll</option>
                <option value="win">Instant Win</option>
                <option value="winBonus">Instant Win +2 pts</option>
              </select>
            </ConfigRow>
            <p className="text-xs text-muted-foreground pl-[7.5rem]">
              {config.tripleResponse === "disabled" && "Triple match has no special effect"}
              {config.tripleResponse === "burn" && "Player is eliminated and reels spin again"}
              {config.tripleResponse === "win" && "Player wins immediately"}
              {config.tripleResponse === "winBonus" && "Player wins with +2 bonus points"}
            </p>
          </>
        )}

        <ConfigRow label="Bonus Rounds">
          <select
            value={config.bonusRoundsMode}
            onChange={e => onConfigChange("bonusRoundsMode", e.target.value as BonusRoundsMode)}
            className="flex-1 h-8 text-xs rounded border border-border bg-background px-2"
          >
            <option value="off">Off</option>
            <option value="initialOnly">Initial Spin Only</option>
            <option value="always">Always (Chain Bonus)</option>
          </select>
        </ConfigRow>
        <p className="text-xs text-muted-foreground pl-[7.5rem]">
          {config.bonusRoundsMode === "off" && "No bonus rounds, keep spinning until win"}
          {config.bonusRoundsMode === "initialOnly" && (
            config.winCondition === "middle"
              ? "Pair triggers head-to-head with 2 contestants"
              : "No winner triggers bonus with all contestants"
          )}
          {config.bonusRoundsMode === "always" && "Bonus rounds can chain, narrowing contestants"}
        </p>
      </CollapsibleSection>
    </div>
  )
}
