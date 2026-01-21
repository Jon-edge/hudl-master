"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/Input"
import { RangeSlider } from "@/components/ui/RangeSlider"
import { Select } from "@/components/ui/Select"
import type { PlinkoConfig } from "./types"

export interface PlinkoConfigPanelProps {
  config: PlinkoConfig
  onConfigChange: <K extends keyof PlinkoConfig>(key: K, value: PlinkoConfig[K]) => void
  enrolledPlayerCount: number
  onSaveToServer?: () => void
  isSaving?: boolean
  saveMessage?: { type: "success" | "error"; text: string } | null
  className?: string
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
 * PlinkoConfigPanel - Accordion-based configuration panel
 */
export function PlinkoConfigPanel({
  config,
  onConfigChange,
  enrolledPlayerCount,
  onSaveToServer,
  isSaving = false,
  saveMessage,
  className,
}: PlinkoConfigPanelProps) {
  return (
    <div className={cn("space-y-4", className)}>
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

      {/* Balls Section */}
      <CollapsibleSection title="Balls">
        <ConfigRow label="Count">
          <RangeSlider
            className="flex-1"
            value={config.ballCount}
            onValueChange={v => onConfigChange("ballCount", v)}
            min={0}
            max={50}
          />
          {config.ballCount === 0 ? (
            <span className="w-16 text-xs text-muted-foreground">∞</span>
          ) : (
            <Input
              className="w-16 h-8 text-xs"
              type="number"
              value={config.ballCount}
              onChange={e => onConfigChange("ballCount", Number(e.target.value))}
              min={0}
              max={50}
            />
          )}
        </ConfigRow>
        <ConfigRow label="Size">
          <RangeSlider
            className="flex-1"
            value={config.ballRadius}
            onValueChange={v => onConfigChange("ballRadius", v)}
            min={4}
            max={20}
          />
          <Input
            className="w-16 h-8 text-xs"
            type="number"
            value={config.ballRadius}
            onChange={e => onConfigChange("ballRadius", Number(e.target.value))}
            min={4}
            max={20}
          />
        </ConfigRow>
        <ConfigRow label="Bounciness">
          <RangeSlider
            className="flex-1"
            value={config.ballRestitution}
            onValueChange={v => onConfigChange("ballRestitution", v)}
            min={0}
            max={1}
            step={0.05}
          />
          <Input
            className="w-16 h-8 text-xs"
            type="number"
            value={config.ballRestitution}
            onChange={e => onConfigChange("ballRestitution", Number(e.target.value))}
            min={0}
            max={1}
            step={0.05}
          />
        </ConfigRow>
        <ConfigRow label="Friction">
          <RangeSlider
            className="flex-1"
            value={config.ballFriction}
            onValueChange={v => onConfigChange("ballFriction", v)}
            min={0}
            max={1}
            step={0.01}
          />
          <Input
            className="w-16 h-8 text-xs"
            type="number"
            value={config.ballFriction}
            onChange={e => onConfigChange("ballFriction", Number(e.target.value))}
            min={0}
            max={1}
            step={0.01}
          />
        </ConfigRow>
        <ConfigRow label="Shape">
          <Select
            className="flex-1 h-8 text-xs"
            value={config.ballShape}
            onChange={e => onConfigChange("ballShape", e.target.value as PlinkoConfig["ballShape"])}
          >
            <option value="ball">Ball</option>
            <option value="square">Square</option>
            <option value="triangle">Triangle</option>
          </Select>
        </ConfigRow>
        <ConfigRow label="Drop From">
          <Select
            className="flex-1 h-8 text-xs"
            value={config.dropLocation}
            onChange={e => onConfigChange("dropLocation", e.target.value as PlinkoConfig["dropLocation"])}
          >
            <option value="random">Random</option>
            <option value="zigzag">Zig-Zag</option>
            <option value="center">Center</option>
          </Select>
        </ConfigRow>
        <ConfigRow label="Drop Delay (ms)">
          <RangeSlider
            className="flex-1"
            value={config.dropDelay}
            onValueChange={v => onConfigChange("dropDelay", v)}
            min={50}
            max={2000}
            step={50}
          />
          <Input
            className="w-20 h-8 text-xs"
            type="number"
            value={config.dropDelay}
            onChange={e => onConfigChange("dropDelay", Number(e.target.value))}
            min={50}
            max={2000}
            step={50}
          />
        </ConfigRow>
        <ConfigRow label="Drop Velocity">
          <RangeSlider
            className="flex-1"
            value={config.dropVelocity}
            onValueChange={v => onConfigChange("dropVelocity", v)}
            min={0}
            max={20}
            step={0.5}
          />
          <Input
            className="w-16 h-8 text-xs"
            type="number"
            value={config.dropVelocity}
            onChange={e => onConfigChange("dropVelocity", Number(e.target.value))}
            min={0}
            max={20}
            step={0.5}
          />
        </ConfigRow>
        <ConfigRow label="Angle Randomness (°)">
          <RangeSlider
            className="flex-1"
            value={config.dropAngleRandomness}
            onValueChange={v => onConfigChange("dropAngleRandomness", v)}
            min={0}
            max={90}
            step={5}
          />
          <Input
            className="w-16 h-8 text-xs"
            type="number"
            value={config.dropAngleRandomness}
            onChange={e => onConfigChange("dropAngleRandomness", Number(e.target.value))}
            min={0}
            max={90}
            step={5}
          />
        </ConfigRow>
      </CollapsibleSection>

      {/* Pins Section */}
      <CollapsibleSection title="Pins" defaultOpen={false}>
        <ConfigRow label="Rows">
          <Input
            className="w-20 h-8 text-xs"
            type="number"
            value={config.pinRows}
            onChange={e => onConfigChange("pinRows", Number(e.target.value))}
            min={1}
            max={20}
          />
        </ConfigRow>
        <ConfigRow label="Columns">
          <Input
            className="w-20 h-8 text-xs"
            type="number"
            value={config.pinColumns}
            onChange={e => onConfigChange("pinColumns", Number(e.target.value))}
            min={1}
            max={20}
          />
        </ConfigRow>
        <ConfigRow label="Size">
          <RangeSlider
            className="flex-1"
            value={config.pinRadius}
            onValueChange={v => onConfigChange("pinRadius", v)}
            min={2}
            max={20}
          />
          <Input
            className="w-16 h-8 text-xs"
            type="number"
            value={config.pinRadius}
            onChange={e => onConfigChange("pinRadius", Number(e.target.value))}
            min={2}
            max={20}
          />
        </ConfigRow>
        <ConfigRow label="Shape">
          <Select
            className="flex-1 h-8 text-xs"
            value={config.pinShape}
            onChange={e => onConfigChange("pinShape", e.target.value as PlinkoConfig["pinShape"])}
          >
            <option value="ball">Ball</option>
            <option value="square">Square (random rotation)</option>
            <option value="triangle">Triangle (random rotation)</option>
          </Select>
        </ConfigRow>
        <ConfigRow label="Bounciness">
          <RangeSlider
            className="flex-1"
            value={config.pinRestitution}
            onValueChange={v => onConfigChange("pinRestitution", v)}
            min={0}
            max={1}
            step={0.05}
          />
          <Input
            className="w-16 h-8 text-xs"
            type="number"
            value={config.pinRestitution}
            onChange={e => onConfigChange("pinRestitution", Number(e.target.value))}
            min={0}
            max={1}
            step={0.05}
          />
        </ConfigRow>
        <ConfigRow label="Friction">
          <RangeSlider
            className="flex-1"
            value={config.pinFriction}
            onValueChange={v => onConfigChange("pinFriction", v)}
            min={0}
            max={1}
            step={0.01}
          />
          <Input
            className="w-16 h-8 text-xs"
            type="number"
            value={config.pinFriction}
            onChange={e => onConfigChange("pinFriction", Number(e.target.value))}
            min={0}
            max={1}
            step={0.01}
          />
        </ConfigRow>
        <ConfigRow label="Wall Gap">
          <RangeSlider
            className="flex-1"
            value={config.pinWallGap}
            onValueChange={v => onConfigChange("pinWallGap", v)}
            min={10}
            max={100}
          />
          <Input
            className="w-16 h-8 text-xs"
            type="number"
            value={config.pinWallGap}
            onChange={e => onConfigChange("pinWallGap", Number(e.target.value))}
            min={10}
            max={100}
          />
        </ConfigRow>
        <ConfigRow label="Rim Gap">
          <RangeSlider
            className="flex-1"
            value={config.pinRimGap}
            onValueChange={v => onConfigChange("pinRimGap", v)}
            min={10}
            max={150}
          />
          <Input
            className="w-16 h-8 text-xs"
            type="number"
            value={config.pinRimGap}
            onChange={e => onConfigChange("pinRimGap", Number(e.target.value))}
            min={10}
            max={150}
          />
        </ConfigRow>
      </CollapsibleSection>

      {/* Board Section */}
      <CollapsibleSection title="Board" defaultOpen={false}>
        <ConfigRow label="Width">
          <RangeSlider
            className="flex-1"
            value={config.width}
            onValueChange={v => onConfigChange("width", v)}
            min={300}
            max={1000}
          />
          <Input
            className="w-16 h-8 text-xs"
            type="number"
            value={config.width}
            onChange={e => onConfigChange("width", Number(e.target.value))}
            min={300}
            max={1000}
          />
        </ConfigRow>
        <ConfigRow label="Height">
          <RangeSlider
            className="flex-1"
            value={config.height}
            onValueChange={v => onConfigChange("height", v)}
            min={300}
            max={800}
          />
          <Input
            className="w-16 h-8 text-xs"
            type="number"
            value={config.height}
            onChange={e => onConfigChange("height", Number(e.target.value))}
            min={300}
            max={800}
          />
        </ConfigRow>
        <ConfigRow label="Ceiling Gap">
          <RangeSlider
            className="flex-1"
            value={config.ceilingGap}
            onValueChange={v => onConfigChange("ceilingGap", v)}
            min={20}
            max={200}
          />
          <Input
            className="w-16 h-8 text-xs"
            type="number"
            value={config.ceilingGap}
            onChange={e => onConfigChange("ceilingGap", Number(e.target.value))}
            min={20}
            max={200}
          />
        </ConfigRow>
        <ConfigRow label="Wall Thickness">
          <RangeSlider
            className="flex-1"
            value={config.wallThickness}
            onValueChange={v => onConfigChange("wallThickness", v)}
            min={5}
            max={30}
          />
          <Input
            className="w-16 h-8 text-xs"
            type="number"
            value={config.wallThickness}
            onChange={e => onConfigChange("wallThickness", Number(e.target.value))}
            min={5}
            max={30}
          />
        </ConfigRow>
      </CollapsibleSection>

      {/* Buckets Section */}
      <CollapsibleSection title="Buckets" defaultOpen={false}>
        <ConfigRow label="Count">
          <Input
            className="w-20 h-8 text-xs bg-muted"
            type="number"
            value={enrolledPlayerCount}
            disabled
          />
          <span className="text-xs text-muted-foreground">= enrolled players</span>
        </ConfigRow>
        <ConfigRow label="Distribution">
          <Select
            className="flex-1 h-8 text-xs"
            value={config.bucketDistribution}
            onChange={e => onConfigChange("bucketDistribution", e.target.value as PlinkoConfig["bucketDistribution"])}
          >
            <option value="even">Even</option>
            <option value="middle">Middle-Weighted</option>
            <option value="edge">Edge-Weighted</option>
          </Select>
        </ConfigRow>
        <ConfigRow label="Rim Height">
          <RangeSlider
            className="flex-1"
            value={config.rimHeight}
            onValueChange={v => onConfigChange("rimHeight", v)}
            min={30}
            max={200}
          />
          <Input
            className="w-16 h-8 text-xs"
            type="number"
            value={config.rimHeight}
            onChange={e => onConfigChange("rimHeight", Number(e.target.value))}
            min={30}
            max={200}
          />
        </ConfigRow>
        <ConfigRow label="Rim Width">
          <RangeSlider
            className="flex-1"
            value={config.rimWidth}
            onValueChange={v => onConfigChange("rimWidth", v)}
            min={2}
            max={20}
          />
          <Input
            className="w-16 h-8 text-xs"
            type="number"
            value={config.rimWidth}
            onChange={e => onConfigChange("rimWidth", Number(e.target.value))}
            min={2}
            max={20}
          />
        </ConfigRow>
        <ConfigRow label="Destroy Balls">
          <input
            type="checkbox"
            checked={config.destroyBalls}
            onChange={e => onConfigChange("destroyBalls", e.target.checked)}
            className="w-4 h-4 rounded border-border"
          />
          <span className="text-xs text-muted-foreground">Remove balls after landing</span>
        </ConfigRow>
      </CollapsibleSection>

      {/* Win Condition Section */}
      <CollapsibleSection title="Win Condition" defaultOpen={false}>
        <ConfigRow label="Mode">
          <Select
            className="flex-1 h-8 text-xs"
            value={config.winCondition}
            onChange={e => onConfigChange("winCondition", e.target.value as PlinkoConfig["winCondition"])}
          >
            <option value="most">Most balls</option>
            <option value="nth">Nth ball</option>
            <option value="first">First ball</option>
            <option value="last-empty">Last empty</option>
          </Select>
        </ConfigRow>
        {config.winCondition === "nth" && (
          <ConfigRow label="N =">
            <Input
              className="w-20 h-8 text-xs"
              type="number"
              value={config.winNth}
              onChange={e => onConfigChange("winNth", Number(e.target.value))}
              min={1}
            />
          </ConfigRow>
        )}
      </CollapsibleSection>
    </div>
  )
}
