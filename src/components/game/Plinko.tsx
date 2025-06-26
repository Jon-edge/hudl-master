"use client"

import React, { useRef, useState, useEffect } from "react"
import Matter, {
  Engine,
  Render,
  Runner,
  Bodies,
  Composite,
  Events
} from "matter-js"
import { Button } from "@/components/ui/button"
import { Input, RangeSlider, Select } from "@/components/ui"

export interface PlinkoConfig {
  ballCount: number
  ballRadius: number
  ballRestitution: number
  ballFriction: number
  ballShape: "ball" | "square" | "triangle"
  destroyBalls: boolean
  dropLocation: "random" | "zigzag" | "center"
  pinRadius: number
  pinRows: number
  pinColumns: number
  pinRestitution: number
  pinFriction: number
  pinShape: "ball" | "square" | "triangle"
  pinAngle: number
  pinWallGap: number
  pinRimGap: number
  ceilingGap: number
  wallThickness: number
  rimHeight: number
  rimWidth: number
  bucketCount: number
  bucketDistribution: "even" | "middle" | "edge"
  winCondition: "nth" | "most" | "first" | "last-empty"
  winNth: number
  width: number
  height: number
}

export interface PlinkoProps {
  /** starting configuration */
  initialConfig?: PlinkoConfig
}

const defaultConfig: PlinkoConfig = {
  ballCount: 10,
  ballRadius: 8,
  ballRestitution: 0.9,
  ballFriction: 0.005,
  ballShape: "ball",
  destroyBalls: true,
  dropLocation: "center",
  pinRadius: 3,
  pinRows: 10,
  pinColumns: 8,
  pinRestitution: 0.5,
  pinFriction: 0.1,
  pinShape: "ball",
  pinAngle: 0,
  pinWallGap: 20,
  pinRimGap: 60,
  ceilingGap: 50,
  wallThickness: 10,
  rimHeight: 100,
  rimWidth: 10,
  bucketCount: 6,
  bucketDistribution: "even",
  winCondition: "nth",
  winNth: 3,
  width: 600,
  height: 500
}

export function Plinko({ initialConfig }: PlinkoProps) {
  const canvasRef = useRef<HTMLDivElement>(null)
  const [engine] = useState(() => Engine.create())
  const [runner] = useState(() => Runner.create())
  const [started, setStarted] = useState(false)
  const [config, setConfig] = useState<PlinkoConfig>(initialConfig ?? defaultConfig)
  const [showConfig, setShowConfig] = useState(false)
  const bucketBoundsRef = useRef<number[]>([])
  const preserveBallsRef = useRef(false)
  const restartRef = useRef(false)

  const stopGame = (preserve: boolean) => {
    preserveBallsRef.current = preserve
    setStarted(false)
  }

  const startGame = (resetBoard: boolean = true) => {
    preserveBallsRef.current = false
    if (resetBoard) {
      setConfig(prev => ({ ...prev }))
    }
    setStarted(true)
  }

  const updateConfig = <K extends keyof PlinkoConfig>(
    key: K,
    value: PlinkoConfig[K]
  ) => {
    setConfig(prev => ({ ...prev, [key]: value }))
    if (started) {
      restartRef.current = true
      stopGame(false)
    }
  }

  useEffect(() => {
    if (restartRef.current && !started) {
      restartRef.current = false
      startGame(false)
    }
  }, [config, started])

  const makeShape = (
    type: "ball" | "square" | "triangle",
    x: number,
    y: number,
    radius: number,
    options: Matter.IBodyDefinition
  ): Matter.Body => {
    switch (type) {
      case "square":
        return Bodies.rectangle(x, y, radius * 2, radius * 2, options)
      case "triangle":
        return Bodies.polygon(x, y, 3, radius, options)
      case "ball":
      default:
        return Bodies.circle(x, y, radius, options)
    }
  }

  const bucketBounds = (
    count: number,
    totalWidth: number,
    distribution: "even" | "middle" | "edge"
  ): number[] => {
    if (distribution === "even") {
      return Array.from({ length: count + 1 }, (_, i) => (i * totalWidth) / count)
    }
    const weights: number[] = []
    for (let i = 0; i < count; i++) {
      const t = i / (count - 1)
      const base = 1 + Math.cos((t - 0.5) * Math.PI)
      weights.push(distribution === "middle" ? base : 2 - base)
    }
    const sum = weights.reduce((a, b) => a + b, 0)
    const bounds: number[] = [0]
    let pos = 0
    for (let i = 0; i < count; i++) {
      pos += (totalWidth * weights[i]) / sum
      bounds.push(pos)
    }
    return bounds
  }


  useEffect(() => {
    if (canvasRef.current == null) return

    const { width, height } = config
    const render = Render.create({
      element: canvasRef.current,
      engine,
      options: { width, height, wireframes: false, background: "#f8fafc" }
    })

    const walls = [
      Bodies.rectangle(width / 2, -25, width, 50, { isStatic: true }),
      Bodies.rectangle(
        width / 2,
        height + config.rimWidth / 2,
        width,
        config.rimWidth,
        { isStatic: true }
      ),
      Bodies.rectangle(-25, height / 2, 50, height, { isStatic: true }),
      Bodies.rectangle(width + 25, height / 2, 50, height, { isStatic: true })
    ]

    Composite.add(engine.world, walls)

    const xSpacing = (width - config.pinWallGap * 2) / (config.pinColumns - 1)
    const yStart = config.ceilingGap
    const yEnd = height - config.rimHeight - config.pinRimGap
    const ySpacing =
      config.pinRows > 1 ? (yEnd - yStart) / (config.pinRows - 1) : 0
    const pins: Matter.Body[] = []
    for (let row = 0; row < config.pinRows; row++) {
      for (let col = 0; col < config.pinColumns; col++) {
        const x =
          config.pinWallGap + col * xSpacing + (row % 2 === 0 ? 0 : xSpacing / 2)
        const y = yStart + row * ySpacing
        pins.push(
          makeShape(config.pinShape, x, y, config.pinRadius, {
            isStatic: true,
            restitution: config.pinRestitution,
            friction: config.pinFriction,
            angle: config.pinShape === "ball" ? 0 : config.pinAngle
          })
        )
      }
    }
    Composite.add(engine.world, pins)

    const bounds = bucketBounds(config.bucketCount, width, config.bucketDistribution)
    bucketBoundsRef.current = bounds
    for (const x of bounds) {
      Composite.add(engine.world, [
        Bodies.rectangle(
          x,
          height - config.rimHeight / 2,
          config.wallThickness,
          config.rimHeight,
          { isStatic: true }
        )
      ])
    }

    Render.run(render)
    Runner.run(runner, engine)

    return () => {
      Render.stop(render)
      Runner.stop(runner)
      Composite.clear(engine.world, false)
      if (render.canvas.parentNode != null) {
        render.canvas.parentNode.removeChild(render.canvas)
      }
    }
  }, [config, engine, runner])

  useEffect(() => {
    if (!started) {
      return
    }

    const { width, height } = config
    const bounds = bucketBoundsRef.current
    const balls: Matter.Body[] = []
    const bucketCounts = new Array(config.bucketCount).fill(0)
    let dropped = 0
    const zig = { x: Math.random() * width, dir: 1 }

    const dropInterval = setInterval(() => {
      if (config.ballCount > 0 && dropped >= config.ballCount) {
        clearInterval(dropInterval)
        return
      }
      let x = width / 2
      if (config.dropLocation === "random") {
        x = Math.random() * width
      } else if (config.dropLocation === "zigzag") {
        x = zig.x
        zig.x += (width / config.pinColumns) * zig.dir
        if (zig.x < config.ballRadius || zig.x > width - config.ballRadius) {
          zig.dir *= -1
          zig.x = Math.max(config.ballRadius, Math.min(width - config.ballRadius, zig.x))
        }
      }
      const ball = makeShape(config.ballShape, x, 0, config.ballRadius, {
        restitution: config.ballRestitution,
        friction: config.ballFriction,
        angle: config.ballShape === "ball" ? 0 : Math.random() * Math.PI * 2
      })
      balls.push(ball)
      Composite.add(engine.world, ball)
      dropped += 1
    }, 500)

    let finished = 0
    const afterUpdate = () => {
      balls.forEach((ball, index) => {
        if (ball.position.y > height - 60 && Math.abs(ball.velocity.y) < 1) {
          let bucket = -1
          for (let i = 0; i < bounds.length - 1; i++) {
            if (ball.position.x >= bounds[i] && ball.position.x < bounds[i + 1]) {
              bucket = i
              break
            }
          }
          if (bucket >= 0 && bucket < bucketCounts.length) {
            bucketCounts[bucket] += 1
            finished += 1
            if (config.destroyBalls) {
              Composite.remove(engine.world, ball)
              balls.splice(index, 1)
            }

            switch (config.winCondition) {
              case "nth":
                if (finished >= config.winNth) {
                  stopGame(true)
                  clearInterval(dropInterval)
                }
                break
              case "first":
                if (finished >= 1) {
                  stopGame(true)
                  clearInterval(dropInterval)
                }
                break
              case "last-empty":
                if (bucketCounts.filter(c => c === 0).length <= 1) {
                  stopGame(true)
                  clearInterval(dropInterval)
                }
                break
              case "most":
              default:
                if (finished >= config.ballCount && config.ballCount > 0) {
                  stopGame(true)
                  clearInterval(dropInterval)
                }
                break
            }
          }
        }
      })
    }

    Events.on(engine, "afterUpdate", afterUpdate)

    return () => {
      clearInterval(dropInterval)
      Events.off(engine, "afterUpdate", afterUpdate)
      if (!preserveBallsRef.current) {
        balls.forEach(ball => Composite.remove(engine.world, ball))
      }
    }
  }, [started, config, engine])

  return (
    <div className="space-y-2">
      <div
        className="border"
        ref={canvasRef}
        style={{ width: config.width, height: config.height }}
      />
      <div className="flex gap-2">
        <Button onClick={() => (started ? stopGame(false) : startGame())}>
          {started ? 'Stop' : 'Start'}
        </Button>
        <Button variant="outline" onClick={() => setShowConfig(v => !v)}>
          Config
        </Button>
      </div>
      {showConfig && (
        <div className="space-y-4 p-2 border rounded-md">
          <fieldset className="space-y-2">
            <legend className="font-semibold">Balls</legend>
            <div className="flex items-center gap-2">
              <label className="w-32">Count</label>
              <RangeSlider
                className="flex-1"
                value={config.ballCount}
                onValueChange={v => updateConfig('ballCount', v)}
                min={0}
                max={50}
              />
              {config.ballCount === 0 ? (
                <span className="w-20">Unlimited</span>
              ) : (
                <Input
                  className="w-20"
                  type="number"
                  value={config.ballCount}
                  onChange={e =>
                    updateConfig('ballCount', Number(e.target.value))
                  }
                  min={0}
                  max={50}
                />
              )}
            </div>
            <div className="flex items-center gap-2">
              <label className="w-32">Restitution</label>
              <RangeSlider
                className="flex-1"
                value={config.ballRestitution}
                onValueChange={v => updateConfig('ballRestitution', v)}
                min={0}
                max={1}
                step={0.05}
              />
              <Input
                className="w-20"
                type="number"
                value={config.ballRestitution}
                onChange={e => updateConfig('ballRestitution', Number(e.target.value))}
                min={0}
                max={1}
                step={0.05}
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="w-32">Friction</label>
              <RangeSlider
                className="flex-1"
                value={config.ballFriction}
                onValueChange={v => updateConfig('ballFriction', v)}
                min={0}
                max={1}
                step={0.01}
              />
              <Input
                className="w-20"
                type="number"
                value={config.ballFriction}
                onChange={e => updateConfig('ballFriction', Number(e.target.value))}
                min={0}
                max={1}
                step={0.01}
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="w-32">Shape</label>
              <Select
                className="w-auto"
                value={config.ballShape}
                onChange={e => updateConfig('ballShape', e.target.value as PlinkoConfig['ballShape'])}
              >
                <option value="ball">Ball</option>
                <option value="square">Square</option>
                <option value="triangle">Triangle</option>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <label className="w-32">Drop Location</label>
              <Select
                className="w-auto"
                value={config.dropLocation}
                onChange={e => updateConfig('dropLocation', e.target.value as PlinkoConfig['dropLocation'])}
              >
                <option value="random">Random</option>
                <option value="zigzag">Zig-Zag</option>
                <option value="center">Center</option>
              </Select>
            </div>
          </fieldset>
          <fieldset className="space-y-2">
            <legend className="font-semibold">Pins</legend>
            <div className="flex items-center gap-2">
              <label className="w-32">Rows</label>
              <Input
                className="w-20"
                type="number"
                value={config.pinRows}
                onChange={e => updateConfig('pinRows', Number(e.target.value))}
                min={1}
                max={20}
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="w-32">Columns</label>
              <Input
                className="w-20"
                type="number"
                value={config.pinColumns}
                onChange={e => updateConfig('pinColumns', Number(e.target.value))}
                min={1}
                max={20}
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="w-32">Size</label>
              <RangeSlider
                className="flex-1"
                value={config.pinRadius}
                onValueChange={v => updateConfig('pinRadius', v)}
                min={2}
                max={20}
              />
              <Input
                className="w-20"
                type="number"
                value={config.pinRadius}
                onChange={e => updateConfig('pinRadius', Number(e.target.value))}
                min={2}
                max={20}
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="w-32">Angle</label>
              <RangeSlider
                className="flex-1"
                value={config.pinAngle}
                onValueChange={v => updateConfig('pinAngle', v)}
                min={0}
                max={360}
              />
              <Input
                className="w-20"
                type="number"
                value={config.pinAngle}
                onChange={e => updateConfig('pinAngle', Number(e.target.value))}
                min={0}
                max={360}
                disabled={config.pinShape === 'ball'}
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="w-32">Wall Gap</label>
              <Input
                className="w-20"
                type="number"
                value={config.pinWallGap}
                onChange={e => updateConfig('pinWallGap', Number(e.target.value))}
                min={0}
                max={100}
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="w-32">Pin-Rim Gap</label>
              <Input
                className="w-20"
                type="number"
                value={config.pinRimGap}
                onChange={e => updateConfig('pinRimGap', Number(e.target.value))}
                min={0}
                max={200}
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="w-32">Restitution</label>
              <RangeSlider
                className="flex-1"
                value={config.pinRestitution}
                onValueChange={v => updateConfig('pinRestitution', v)}
                min={0}
                max={1}
                step={0.05}
              />
              <Input
                className="w-20"
                type="number"
                value={config.pinRestitution}
                onChange={e => updateConfig('pinRestitution', Number(e.target.value))}
                min={0}
                max={1}
                step={0.05}
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="w-32">Friction</label>
              <RangeSlider
                className="flex-1"
                value={config.pinFriction}
                onValueChange={v => updateConfig('pinFriction', v)}
                min={0}
                max={1}
                step={0.01}
              />
              <Input
                className="w-20"
                type="number"
                value={config.pinFriction}
                onChange={e => updateConfig('pinFriction', Number(e.target.value))}
                min={0}
                max={1}
                step={0.01}
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="w-32">Shape</label>
              <Select
                className="w-auto"
                value={config.pinShape}
                onChange={e => updateConfig('pinShape', e.target.value as PlinkoConfig['pinShape'])}
              >
                <option value="ball">Ball</option>
                <option value="square">Square</option>
                <option value="triangle">Triangle</option>
              </Select>
            </div>
          </fieldset>
          <fieldset className="space-y-2">
          <legend className="font-semibold">Board</legend>
          <div className="flex items-center gap-2">
            <label className="w-32">Ceiling Gap</label>
            <Input
              className="w-20"
              type="number"
              value={config.ceilingGap}
              onChange={e => updateConfig('ceilingGap', Number(e.target.value))}
              min={0}
              max={200}
            />
          </div>
          <div className="flex items-center gap-2">
              <label className="w-32">Width</label>
              <RangeSlider
                className="flex-1"
                value={config.width}
                onValueChange={v => updateConfig('width', v)}
                min={300}
                max={1000}
              />
              <Input
                className="w-20"
                type="number"
                value={config.width}
                onChange={e => updateConfig('width', Number(e.target.value))}
                min={300}
                max={1000}
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="w-32">Height</label>
              <RangeSlider
                className="flex-1"
                value={config.height}
                onValueChange={v => updateConfig('height', v)}
                min={300}
                max={800}
              />
              <Input
                className="w-20"
                type="number"
                value={config.height}
                onChange={e => updateConfig('height', Number(e.target.value))}
                min={300}
                max={800}
              />
            </div>
          </fieldset>
          <fieldset className="space-y-2">
            <legend className="font-semibold">Buckets</legend>
            <div className="flex items-center gap-2">
              <label className="w-32">Count</label>
              <RangeSlider
                className="flex-1"
                value={config.bucketCount}
                onValueChange={v => updateConfig('bucketCount', v)}
                min={2}
                max={10}
              />
              <Input
                className="w-20"
                type="number"
                value={config.bucketCount}
                onChange={e => updateConfig('bucketCount', Number(e.target.value))}
                min={2}
                max={10}
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="w-32">Distribution</label>
              <Select
                className="w-auto"
                value={config.bucketDistribution}
                onChange={e =>
                  updateConfig(
                    'bucketDistribution',
                    e.target.value as PlinkoConfig['bucketDistribution']
                  )
                }
              >
                <option value="even">Even</option>
                <option value="middle">Middle-Weighted</option>
                <option value="edge">Edge-Weighted</option>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <label className="w-32">Destroy Balls</label>
              <input
                type="checkbox"
                checked={config.destroyBalls}
                onChange={e => updateConfig('destroyBalls', e.target.checked)}
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="w-32">Rim Height</label>
              <Input
                className="w-20"
                type="number"
                value={config.rimHeight}
                onChange={e => updateConfig('rimHeight', Number(e.target.value))}
                min={10}
                max={200}
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="w-32">Rim Width</label>
              <Input
                className="w-20"
                type="number"
                value={config.rimWidth}
                onChange={e => updateConfig('rimWidth', Number(e.target.value))}
                min={5}
                max={50}
              />
            </div>
          </fieldset>
          <fieldset className="space-y-2">
            <legend className="font-semibold">Win</legend>
            <div className="flex items-center gap-2">
              <label className="w-32">Condition</label>
              <Select
                value={config.winCondition}
                onChange={e =>
                  updateConfig(
                    'winCondition',
                    e.target.value as PlinkoConfig['winCondition']
                  )
                }
                className="w-auto"
              >
                <option value="nth">Nth ball</option>
                <option value="most">Most balls</option>
                <option value="first">First ball</option>
                <option value="last-empty">Last empty</option>
              </Select>
              {config.winCondition === 'nth' && (
                <Input
                  className="w-20"
                  type="number"
                  value={config.winNth}
                  onChange={e => updateConfig('winNth', Number(e.target.value))}
                  min={1}
                />
              )}
            </div>
          </fieldset>
        </div>
      )}
    </div>
  )
}
