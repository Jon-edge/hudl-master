import { Button } from "@/components/ui/button"
import { Input, RangeSlider, Select, Switch } from "@/components/ui"
import type { PlinkoConfig } from "./types"

interface PlinkoConfigPanelProps {
  config: PlinkoConfig
  derivedBucketCount: number
  isSaving: boolean
  saveMessage: { type: "success" | "error"; text: string } | null
  onUpdateConfig: <K extends keyof PlinkoConfig>(key: K, value: PlinkoConfig[K]) => void
  onOpenSaveConfirm: () => void
  onClose?: () => void
}

export function PlinkoConfigPanel({
  config,
  derivedBucketCount,
  isSaving,
  saveMessage,
  onUpdateConfig,
  onOpenSaveConfirm,
  onClose
}: PlinkoConfigPanelProps) {
  return (
    <div className="glass-panel flex h-full flex-col gap-4 rounded-2xl p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">
          Config Panel
        </h2>
        {onClose ? (
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={onOpenSaveConfirm} disabled={isSaving}>
          {isSaving ? "Saving..." : "Save to Server"}
        </Button>
      </div>
      {saveMessage != null && (
        <div
          className={`rounded-md p-2 text-sm ${
            saveMessage.type === "success"
              ? "bg-emerald-100 text-emerald-700"
              : "bg-red-100 text-red-700"
          }`}
        >
          {saveMessage.text}
        </div>
      )}
      <div className="flex-1 space-y-3 overflow-y-auto pr-1">
        <Section title="Balls">
          <Field label="Count">
            <RangeSlider
              className="flex-1"
              value={config.ballCount}
              onValueChange={value => onUpdateConfig("ballCount", value)}
              min={0}
              max={50}
            />
            <Input
              className="w-20"
              type="number"
              value={config.ballCount}
              onChange={event => onUpdateConfig("ballCount", Number(event.target.value))}
              min={0}
              max={50}
            />
          </Field>
          <Field label="Restitution">
            <RangeSlider
              className="flex-1"
              value={config.ballRestitution}
              onValueChange={value => onUpdateConfig("ballRestitution", value)}
              min={0}
              max={1}
              step={0.05}
            />
            <Input
              className="w-20"
              type="number"
              value={config.ballRestitution}
              onChange={event => onUpdateConfig("ballRestitution", Number(event.target.value))}
              min={0}
              max={1}
              step={0.05}
            />
          </Field>
          <Field label="Friction">
            <RangeSlider
              className="flex-1"
              value={config.ballFriction}
              onValueChange={value => onUpdateConfig("ballFriction", value)}
              min={0}
              max={1}
              step={0.01}
            />
            <Input
              className="w-20"
              type="number"
              value={config.ballFriction}
              onChange={event => onUpdateConfig("ballFriction", Number(event.target.value))}
              min={0}
              max={1}
              step={0.01}
            />
          </Field>
          <Field label="Shape">
            <Select
              className="w-auto"
              value={config.ballShape}
              onChange={event =>
                onUpdateConfig("ballShape", event.target.value as PlinkoConfig["ballShape"])
              }
            >
              <option value="ball">Ball</option>
              <option value="square">Square</option>
              <option value="triangle">Triangle</option>
            </Select>
          </Field>
          <Field label="Drop">
            <Select
              className="w-auto"
              value={config.dropLocation}
              onChange={event =>
                onUpdateConfig(
                  "dropLocation",
                  event.target.value as PlinkoConfig["dropLocation"]
                )
              }
            >
              <option value="random">Random</option>
              <option value="zigzag">Zig-Zag</option>
              <option value="center">Center</option>
            </Select>
          </Field>
        </Section>

        <Section title="Pins">
          <Field label="Rows">
            <Input
              className="w-20"
              type="number"
              value={config.pinRows}
              onChange={event => onUpdateConfig("pinRows", Number(event.target.value))}
              min={1}
              max={20}
            />
          </Field>
          <Field label="Columns">
            <Input
              className="w-20"
              type="number"
              value={config.pinColumns}
              onChange={event => onUpdateConfig("pinColumns", Number(event.target.value))}
              min={1}
              max={20}
            />
          </Field>
          <Field label="Size">
            <RangeSlider
              className="flex-1"
              value={config.pinRadius}
              onValueChange={value => onUpdateConfig("pinRadius", value)}
              min={2}
              max={20}
            />
            <Input
              className="w-20"
              type="number"
              value={config.pinRadius}
              onChange={event => onUpdateConfig("pinRadius", Number(event.target.value))}
              min={2}
              max={20}
            />
          </Field>
          <Field label="Angle">
            <RangeSlider
              className="flex-1"
              value={config.pinAngle}
              onValueChange={value => onUpdateConfig("pinAngle", value)}
              min={0}
              max={360}
            />
            <Input
              className="w-20"
              type="number"
              value={config.pinAngle}
              onChange={event => onUpdateConfig("pinAngle", Number(event.target.value))}
              min={0}
              max={360}
              disabled={config.pinShape === "ball"}
            />
          </Field>
          <Field label="Wall gap">
            <Input
              className="w-20"
              type="number"
              value={config.pinWallGap}
              onChange={event => onUpdateConfig("pinWallGap", Number(event.target.value))}
              min={0}
              max={100}
            />
          </Field>
          <Field label="Pin-rim gap">
            <Input
              className="w-20"
              type="number"
              value={config.pinRimGap}
              onChange={event => onUpdateConfig("pinRimGap", Number(event.target.value))}
              min={0}
              max={200}
            />
          </Field>
          <Field label="Restitution">
            <RangeSlider
              className="flex-1"
              value={config.pinRestitution}
              onValueChange={value => onUpdateConfig("pinRestitution", value)}
              min={0}
              max={1}
              step={0.05}
            />
            <Input
              className="w-20"
              type="number"
              value={config.pinRestitution}
              onChange={event => onUpdateConfig("pinRestitution", Number(event.target.value))}
              min={0}
              max={1}
              step={0.05}
            />
          </Field>
          <Field label="Friction">
            <RangeSlider
              className="flex-1"
              value={config.pinFriction}
              onValueChange={value => onUpdateConfig("pinFriction", value)}
              min={0}
              max={1}
              step={0.01}
            />
            <Input
              className="w-20"
              type="number"
              value={config.pinFriction}
              onChange={event => onUpdateConfig("pinFriction", Number(event.target.value))}
              min={0}
              max={1}
              step={0.01}
            />
          </Field>
          <Field label="Shape">
            <Select
              className="w-auto"
              value={config.pinShape}
              onChange={event =>
                onUpdateConfig("pinShape", event.target.value as PlinkoConfig["pinShape"])
              }
            >
              <option value="ball">Ball</option>
              <option value="square">Square</option>
              <option value="triangle">Triangle</option>
            </Select>
          </Field>
        </Section>

        <Section title="Board">
          <Field label="Ceiling gap">
            <Input
              className="w-20"
              type="number"
              value={config.ceilingGap}
              onChange={event => onUpdateConfig("ceilingGap", Number(event.target.value))}
              min={0}
              max={200}
            />
          </Field>
          <Field label="Width">
            <RangeSlider
              className="flex-1"
              value={config.width}
              onValueChange={value => onUpdateConfig("width", value)}
              min={300}
              max={1000}
            />
            <Input
              className="w-20"
              type="number"
              value={config.width}
              onChange={event => onUpdateConfig("width", Number(event.target.value))}
              min={300}
              max={1000}
            />
          </Field>
          <Field label="Height">
            <RangeSlider
              className="flex-1"
              value={config.height}
              onValueChange={value => onUpdateConfig("height", value)}
              min={300}
              max={800}
            />
            <Input
              className="w-20"
              type="number"
              value={config.height}
              onChange={event => onUpdateConfig("height", Number(event.target.value))}
              min={300}
              max={800}
            />
          </Field>
        </Section>

        <Section title="Buckets">
          <Field label="Count">
            <Input className="w-20" type="number" value={derivedBucketCount} disabled />
            <span className="text-xs text-slate-500">
              Follows enrolled players
            </span>
          </Field>
          <Field label="Distribution">
            <Select
              className="w-auto"
              value={config.bucketDistribution}
              onChange={event =>
                onUpdateConfig(
                  "bucketDistribution",
                  event.target.value as PlinkoConfig["bucketDistribution"]
                )
              }
            >
              <option value="even">Even</option>
              <option value="middle">Middle-Weighted</option>
              <option value="edge">Edge-Weighted</option>
            </Select>
          </Field>
          <Field label="Destroy balls">
            <Switch
              checked={config.destroyBalls}
              onCheckedChange={checked => onUpdateConfig("destroyBalls", checked)}
            />
          </Field>
          <Field label="Rim height">
            <Input
              className="w-20"
              type="number"
              value={config.rimHeight}
              onChange={event => onUpdateConfig("rimHeight", Number(event.target.value))}
              min={10}
              max={200}
            />
          </Field>
          <Field label="Rim width">
            <Input
              className="w-20"
              type="number"
              value={config.rimWidth}
              onChange={event => onUpdateConfig("rimWidth", Number(event.target.value))}
              min={5}
              max={50}
            />
          </Field>
        </Section>

        <Section title="Win">
          <Field label="Condition">
            <Select
              value={config.winCondition}
              onChange={event =>
                onUpdateConfig("winCondition", event.target.value as PlinkoConfig["winCondition"])
              }
              className="w-auto"
            >
              <option value="nth">Nth ball</option>
              <option value="most">Most balls</option>
              <option value="first">First ball</option>
              <option value="last-empty">Last empty</option>
            </Select>
            {config.winCondition === "nth" && (
              <Input
                className="w-20"
                type="number"
                value={config.winNth}
                onChange={event => onUpdateConfig("winNth", Number(event.target.value))}
                min={1}
              />
            )}
          </Field>
        </Section>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <details open className="rounded-xl border border-white/60 bg-white/70 p-3">
      <summary className="cursor-pointer text-sm font-semibold text-slate-700">
        {title}
      </summary>
      <div className="mt-3 space-y-2">{children}</div>
    </details>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="w-28 text-xs uppercase tracking-wide text-slate-500">
        {label}
      </label>
      {children}
    </div>
  )
}
