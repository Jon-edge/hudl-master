"use client"

import React, { useRef, useState, useEffect } from "react"
import Matter, { Engine, Render, Runner, Bodies, Composite, Events } from "matter-js"
import { Button } from "@/components/ui/button"
import { Input, RangeSlider } from "@/components/ui"

export interface PlinkoConfig {
  ballCount: number
  ballRadius: number
  ballRestitution: number
  ballFriction: number
  pinRadius: number
  pinRows: number
  pinColumns: number
  wallThickness: number
  bucketCount: number
  winCount: number
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
  pinRadius: 3,
  pinRows: 10,
  pinColumns: 8,
  wallThickness: 10,
  bucketCount: 6,
  winCount: 3,
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
  
  const updateConfig = (key: keyof PlinkoConfig, value: number) => {
    setConfig(prev => ({ ...prev, [key]: value }))
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
      Bodies.rectangle(width / 2, height + 25, width, 50, { isStatic: true }),
      Bodies.rectangle(-25, height / 2, 50, height, { isStatic: true }),
      Bodies.rectangle(width + 25, height / 2, 50, height, { isStatic: true })
    ]

    Composite.add(engine.world, walls)

    const xSpacing = width / config.pinColumns
    const ySpacing = (height - 100) / config.pinRows
    const pins: Matter.Body[] = []
    for (let row = 0; row < config.pinRows; row++) {
      for (let col = 0; col < config.pinColumns; col++) {
        const x = xSpacing / 2 + col * xSpacing + (row % 2 === 0 ? xSpacing / 2 : 0)
        const y = 50 + row * ySpacing
        pins.push(Bodies.circle(x, y, config.pinRadius, { isStatic: true }))
      }
    }
    Composite.add(engine.world, pins)

      // buckets
    const bucketWidth = width / config.bucketCount
    for (let i = 0; i <= config.bucketCount; i++) {
      const x = i * bucketWidth
      Composite.add(engine.world, [
        Bodies.rectangle(x, height - 50, config.wallThickness, 100, { isStatic: true })
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
    const bucketWidth = width / config.bucketCount
    const balls: Matter.Body[] = []
    const bucketCounts = new Array(config.bucketCount).fill(0)
    let dropped = 0

    const dropInterval = setInterval(() => {
      if (dropped >= config.ballCount) {
        clearInterval(dropInterval)
        return
      }
      const ball = Bodies.circle(width / 2, 0, config.ballRadius, {
        restitution: config.ballRestitution,
        friction: config.ballFriction
      })
      balls.push(ball)
      Composite.add(engine.world, ball)
      dropped += 1
    }, 500)

    const afterUpdate = () => {
      balls.forEach((ball, index) => {
        if (ball.position.y > height - 60 && Math.abs(ball.velocity.y) < 1) {
          const bucket = Math.floor(ball.position.x / bucketWidth)
          if (bucket >= 0 && bucket < bucketCounts.length) {
            bucketCounts[bucket] += 1
            Composite.remove(engine.world, ball)
            balls.splice(index, 1)
            if (bucketCounts[bucket] >= config.winCount) {
              setStarted(false)
              clearInterval(dropInterval)
            }
          }
        }
      })
    }

    Events.on(engine, "afterUpdate", afterUpdate)

    return () => {
      clearInterval(dropInterval)
      Events.off(engine, "afterUpdate", afterUpdate)
      balls.forEach(ball => Composite.remove(engine.world, ball))
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
        <Button onClick={() => setStarted(true)}>Start</Button>
        <Button variant="outline" onClick={() => setShowConfig(v => !v)}>
          Config
        </Button>
      </div>
      {showConfig && (
        <div className="space-y-4 p-2 border rounded-md">
          <fieldset className="space-y-2">
            <legend className="font-semibold">Balls</legend>
            <div className="grid grid-cols-2 gap-2 items-center">
              <RangeSlider
                value={config.ballCount}
                onValueChange={v => updateConfig('ballCount', v)}
                min={1}
                max={50}
              />
              <Input
                type="number"
                value={config.ballCount}
                onChange={e => updateConfig('ballCount', Number(e.target.value))}
                min={1}
                max={50}
              />
            </div>
          </fieldset>
          <fieldset className="space-y-2">
            <legend className="font-semibold">Board</legend>
            <div className="grid grid-cols-2 gap-2 items-center">
              <RangeSlider
                value={config.width}
                onValueChange={v => updateConfig('width', v)}
                min={300}
                max={1000}
              />
              <Input
                type="number"
                value={config.width}
                onChange={e => updateConfig('width', Number(e.target.value))}
                min={300}
                max={1000}
              />
            </div>
            <div className="grid grid-cols-2 gap-2 items-center">
              <RangeSlider
                value={config.height}
                onValueChange={v => updateConfig('height', v)}
                min={300}
                max={800}
              />
              <Input
                type="number"
                value={config.height}
                onChange={e => updateConfig('height', Number(e.target.value))}
                min={300}
                max={800}
              />
            </div>
          </fieldset>
          <fieldset className="space-y-2">
            <legend className="font-semibold">Win</legend>
            <div className="grid grid-cols-2 gap-2 items-center">
              <RangeSlider
                value={config.winCount}
                onValueChange={v => updateConfig('winCount', v)}
                min={1}
                max={config.ballCount}
              />
              <Input
                type="number"
                value={config.winCount}
                onChange={e => updateConfig('winCount', Number(e.target.value))}
                min={1}
                max={config.ballCount}
              />
            </div>
          </fieldset>
        </div>
      )}
    </div>
  )
}
