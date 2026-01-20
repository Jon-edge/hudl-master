"use client"

import * as React from "react"
import { Save, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/Input"
import { Select } from "@/components/ui/Select"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/Switch"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { PlinkoConfig } from "./types"

interface PlinkoConfigPanelProps {
  config: PlinkoConfig
  onUpdateConfig: <K extends keyof PlinkoConfig>(key: K, value: PlinkoConfig[K]) => void
  onSave: () => void
  onClose: () => void
  isSaving?: boolean
}

export function PlinkoConfigPanel({
  config,
  onUpdateConfig,
  onSave,
  onClose,
  isSaving,
}: PlinkoConfigPanelProps) {
  return (
    <div className="flex h-full flex-col bg-background">
      <div className="flex items-center justify-between border-b p-4">
        <h2 className="font-semibold tracking-tight">Settings</h2>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={onSave} disabled={isSaving}>
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? "Saving..." : "Save"}
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4">
          <Accordion type="multiple" defaultValue={["balls", "pins", "board", "buckets", "win"]}>
            <AccordionItem value="balls">
              <AccordionTrigger>Balls</AccordionTrigger>
              <AccordionContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 space-y-2">
                    <div className="flex justify-between">
                      <label className="text-sm font-medium">Count</label>
                      <span className="text-sm text-muted-foreground">{config.ballCount}</span>
                    </div>
                    <Slider
                      value={[config.ballCount]}
                      onValueChange={([v]) => onUpdateConfig("ballCount", v)}
                      max={50}
                      step={1}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Shape</label>
                    <Select
                      value={config.ballShape}
                      onChange={(e) => onUpdateConfig("ballShape", e.target.value as any)}
                    >
                      <option value="ball">Ball</option>
                      <option value="square">Square</option>
                      <option value="triangle">Triangle</option>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Drop Location</label>
                    <Select
                      value={config.dropLocation}
                      onChange={(e) => onUpdateConfig("dropLocation", e.target.value as any)}
                    >
                      <option value="random">Random</option>
                      <option value="zigzag">Zig-Zag</option>
                      <option value="center">Center</option>
                    </Select>
                  </div>

                  <div className="col-span-2 space-y-2">
                    <div className="flex justify-between">
                      <label className="text-sm font-medium">Restitution (Bounciness)</label>
                      <span className="text-sm text-muted-foreground">{config.ballRestitution}</span>
                    </div>
                    <Slider
                      value={[config.ballRestitution]}
                      onValueChange={([v]) => onUpdateConfig("ballRestitution", v)}
                      max={1}
                      step={0.05}
                    />
                  </div>

                  <div className="col-span-2 space-y-2">
                    <div className="flex justify-between">
                      <label className="text-sm font-medium">Friction</label>
                      <span className="text-sm text-muted-foreground">{config.ballFriction}</span>
                    </div>
                    <Slider
                      value={[config.ballFriction]}
                      onValueChange={([v]) => onUpdateConfig("ballFriction", v)}
                      max={1}
                      step={0.01}
                    />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="pins">
              <AccordionTrigger>Pins</AccordionTrigger>
              <AccordionContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Rows</label>
                    <Input
                      type="number"
                      value={config.pinRows}
                      onChange={(e) => onUpdateConfig("pinRows", Number(e.target.value))}
                      min={1}
                      max={20}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Columns</label>
                    <Input
                      type="number"
                      value={config.pinColumns}
                      onChange={(e) => onUpdateConfig("pinColumns", Number(e.target.value))}
                      min={1}
                      max={20}
                    />
                  </div>

                  <div className="col-span-2 space-y-2">
                    <div className="flex justify-between">
                      <label className="text-sm font-medium">Size</label>
                      <span className="text-sm text-muted-foreground">{config.pinRadius}px</span>
                    </div>
                    <Slider
                      value={[config.pinRadius]}
                      onValueChange={([v]) => onUpdateConfig("pinRadius", v)}
                      min={2}
                      max={20}
                    />
                  </div>

                  <div className="col-span-2 space-y-2">
                    <div className="flex justify-between">
                      <label className="text-sm font-medium">Wall Gap</label>
                      <span className="text-sm text-muted-foreground">{config.pinWallGap}px</span>
                    </div>
                    <Slider
                      value={[config.pinWallGap]}
                      onValueChange={([v]) => onUpdateConfig("pinWallGap", v)}
                      min={0}
                      max={100}
                    />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="buckets">
              <AccordionTrigger>Buckets</AccordionTrigger>
              <AccordionContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Count (Read Only)</label>
                    <Input
                      type="number"
                      value={config.bucketCount}
                      disabled
                      className="bg-muted"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Distribution</label>
                    <Select
                      value={config.bucketDistribution}
                      onChange={(e) => onUpdateConfig("bucketDistribution", e.target.value as any)}
                    >
                      <option value="even">Even</option>
                      <option value="middle">Middle-Weighted</option>
                      <option value="edge">Edge-Weighted</option>
                    </Select>
                  </div>
                  
                  <div className="col-span-2 flex items-center justify-between space-x-2">
                    <label className="text-sm font-medium">Destroy Balls on Entry</label>
                    <Switch
                      checked={config.destroyBalls}
                      onCheckedChange={(c) => onUpdateConfig("destroyBalls", c)}
                    />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="win">
              <AccordionTrigger>Win Condition</AccordionTrigger>
              <AccordionContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 space-y-2">
                    <label className="text-sm font-medium">Condition</label>
                    <Select
                      value={config.winCondition}
                      onChange={(e) => onUpdateConfig("winCondition", e.target.value as any)}
                    >
                      <option value="most">Most Balls</option>
                      <option value="first">First Ball</option>
                      <option value="last-empty">Last Empty Bucket</option>
                      <option value="nth">Nth Ball</option>
                    </Select>
                  </div>
                  
                  {config.winCondition === "nth" && (
                    <div className="col-span-2 space-y-2">
                      <label className="text-sm font-medium">Nth Ball Target</label>
                      <Input
                        type="number"
                        value={config.winNth}
                        onChange={(e) => onUpdateConfig("winNth", Number(e.target.value))}
                        min={1}
                      />
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </ScrollArea>
    </div>
  )
}
