"use client"

import { useRef, useState, useEffect, useCallback, useMemo } from "react"
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

interface PlayerProfile {
  id: string
  name: string
  wins: number
  active: boolean
  avatarUrl?: string
}

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
  destroyBalls: false,
  dropLocation: "random",
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
  rimWidth: 5,
  bucketCount: 6,
  bucketDistribution: "even",
  winCondition: "first",
  winNth: 3,
  width: 500,
  height: 450
}

const playerStorageKey = "plinko.players.v1"

const makePlayerId = (): string =>
  `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`

const defaultPlayers: PlayerProfile[] = [
  { id: makePlayerId(), name: "Avery", wins: 2, active: true },
  { id: makePlayerId(), name: "Blake", wins: 4, active: true },
  { id: makePlayerId(), name: "Casey", wins: 1, active: false }
]

export function Plinko({ initialConfig }: PlinkoProps) {
  const canvasRef = useRef<HTMLDivElement>(null)
  const engineRef = useRef<Matter.Engine | null>(null)
  const [started, setStarted] = useState(false)
  const [config, setConfig] = useState<PlinkoConfig>(initialConfig ?? defaultConfig)
  const [showConfig, setShowConfig] = useState(false)
  const [showPlayerSettings, setShowPlayerSettings] = useState(false)
  const [boardKey, setBoardKey] = useState(0)
  const bucketBoundsRef = useRef<number[]>([])
  const [players, setPlayers] = useState<PlayerProfile[]>(defaultPlayers)
  const [bucketAssignments, setBucketAssignments] = useState<string[]>([])
  const [roundWinnerBuckets, setRoundWinnerBuckets] = useState<number[] | null>(null)
  const roundWinnerRef = useRef<number[] | null>(null)

  const stopGame = useCallback((): void => {
    setStarted(false)
  }, [])

  const startGame = useCallback((): void => {
    // Increment boardKey to create a fresh engine
    setBoardKey(k => k + 1)
    setStarted(true)
    roundWinnerRef.current = null
    setRoundWinnerBuckets(null)
    const activePlayers = players.filter(player => player.active)
    const shuffled = [...activePlayers].sort(() => Math.random() - 0.5)
    setBucketAssignments(shuffled.map(player => player.id))
  }, [players])

  const updateConfig = <K extends keyof PlinkoConfig>(
    key: K,
    value: PlinkoConfig[K]
  ): void => {
    setConfig(prev => ({ ...prev, [key]: value }))
    // Reset the board when config changes
    if (started) {
      setStarted(false)
    }
    setBoardKey(k => k + 1)
  }

  useEffect(() => {
    try {
      const stored = localStorage.getItem(playerStorageKey)
      if (stored != null) {
        const parsed = JSON.parse(stored) as PlayerProfile[]
        if (Array.isArray(parsed)) {
          if (parsed.length >= 2) {
            setPlayers(parsed)
          } else {
            const needed = 2 - parsed.length
            const padded = [...parsed]
            for (let i = 0; i < needed; i++) {
              padded.push({
                id: makePlayerId(),
                name: `Player ${parsed.length + i + 1}`,
                wins: 0,
                active: true
              })
            }
            setPlayers(padded)
          }
        }
      }
    } catch {
      // If storage is invalid, fall back to defaults
    }
  }, [])

  useEffect(() => {
    localStorage.setItem(playerStorageKey, JSON.stringify(players))
  }, [players])

  const enrolledPlayers = players.filter(player => player.active)
  const derivedBucketCount = Math.max(2, enrolledPlayers.length)

  useEffect(() => {
    if (config.bucketCount === derivedBucketCount) return
    setConfig(prev => ({ ...prev, bucketCount: derivedBucketCount }))
    if (started) {
      setStarted(false)
    }
    setBoardKey(k => k + 1)
  }, [config.bucketCount, derivedBucketCount, started])

  const updatePlayer = (id: string, updater: (player: PlayerProfile) => PlayerProfile) => {
    setPlayers(prev => prev.map(player => (player.id === id ? updater(player) : player)))
  }

  const addPlayer = () => {
    setPlayers(prev => [
      ...prev,
      {
        id: makePlayerId(),
        name: `Player ${prev.length + 1}`,
        wins: 0,
        active: true
      }
    ])
  }

  const removePlayer = (id: string) => {
    setPlayers(prev => {
      if (prev.length <= 2) return prev
      return prev.filter(player => player.id !== id)
    })
  }

  const leaderboard = [...players].sort((a, b) => b.wins - a.wins)
  const topWins = leaderboard.length > 0 ? leaderboard[0].wins : 0
  const hasWinner = topWins > 0
  const winnerCount = hasWinner
    ? leaderboard.filter(player => player.wins === topWins).length
    : 0
  const bucketByPlayer = useMemo(() => {
    const map = new Map<string, number>()
    bucketAssignments.forEach((playerId, index) => {
      map.set(playerId, index)
    })
    return map
  }, [bucketAssignments])

  // Track bucket assignments in a ref to avoid stale closures
  const bucketAssignmentsRef = useRef<string[]>([])
  useEffect(() => {
    bucketAssignmentsRef.current = bucketAssignments
  }, [bucketAssignments])

  // Increment wins when round ends
  useEffect(() => {
    if (roundWinnerBuckets === null || roundWinnerBuckets.length === 0) return
    // Get winning player IDs from bucket assignments ref
    const assignments = bucketAssignmentsRef.current
    const winningPlayerIds = roundWinnerBuckets
      .map(bucket => assignments[bucket])
      .filter(id => id != null)
    if (winningPlayerIds.length === 0) return
    setPlayers(prev =>
      prev.map(player =>
        winningPlayerIds.includes(player.id)
          ? { ...player, wins: player.wins + 1 }
          : player
      )
    )
  }, [roundWinnerBuckets])

  // Helper to get placeholder avatar URL
  const getAvatarUrl = (player: PlayerProfile): string => {
    if (player.avatarUrl) return player.avatarUrl
    // Use DiceBear API for placeholder avatars
    const seed = encodeURIComponent(player.name || player.id)
    return `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${seed}&size=48`
  }

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

  // Board setup effect - creates fresh engine/runner each time boardKey changes
  useEffect(() => {
    if (canvasRef.current == null) return

    const engine = Engine.create()
    const runner = Runner.create()
    engineRef.current = engine

    const { width, height } = config
    const render = Render.create({
      element: canvasRef.current,
      engine,
      options: { width, height, wireframes: false, background: "#f8fafc" }
    })

    // Outer walls (ceiling, floor, left, right)
    const walls = [
      Bodies.rectangle(width / 2, -25, width, 50, { isStatic: true }), // ceiling
      Bodies.rectangle(
        width / 2,
        height - config.wallThickness / 2,
        width,
        config.wallThickness,
        { isStatic: true }
      ), // floor - positioned at bottom of canvas
      Bodies.rectangle(-25, height / 2, 50, height, { isStatic: true }), // left
      Bodies.rectangle(width + 25, height / 2, 50, height, { isStatic: true }) // right
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

    // Bucket dividers - use rimWidth for their thickness
    const bounds = bucketBounds(config.bucketCount, width, config.bucketDistribution)
    bucketBoundsRef.current = bounds
    for (const x of bounds) {
      Composite.add(engine.world, [
        Bodies.rectangle(
          x,
          height - config.rimHeight / 2,
          config.rimWidth,
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
      Engine.clear(engine)
      if (render.canvas.parentNode != null) {
        render.canvas.parentNode.removeChild(render.canvas)
      }
    }
  }, [config, boardKey])

  // Game logic effect - handles ball dropping and win conditions
  useEffect(() => {
    if (!started) return

    const engine = engineRef.current
    if (engine === null) return

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
    let gameEnded = false
    const afterUpdate = () => {
      if (gameEnded) return
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
                  if (roundWinnerRef.current === null) {
                    roundWinnerRef.current = [bucket]
                    setRoundWinnerBuckets([bucket])
                  }
                  gameEnded = true
                  stopGame()
                  clearInterval(dropInterval)
                }
                break
              case "first":
                if (finished >= 1) {
                  if (roundWinnerRef.current === null) {
                    roundWinnerRef.current = [bucket]
                    setRoundWinnerBuckets([bucket])
                  }
                  gameEnded = true
                  stopGame()
                  clearInterval(dropInterval)
                }
                break
              case "last-empty":
                {
                  const emptyBuckets = bucketCounts
                    .map((count, idx) => (count === 0 ? idx : -1))
                    .filter(idx => idx >= 0)
                  if (roundWinnerRef.current === null && emptyBuckets.length === 1) {
                    roundWinnerRef.current = [emptyBuckets[0]]
                    setRoundWinnerBuckets([emptyBuckets[0]])
                  }
                  if (emptyBuckets.length <= 1) {
                  gameEnded = true
                  stopGame()
                  clearInterval(dropInterval)
                  }
                }
                break
              case "most":
              default:
                if (finished >= config.ballCount && config.ballCount > 0) {
                  if (roundWinnerRef.current === null) {
                    const maxCount = Math.max(...bucketCounts)
                    const winners = bucketCounts
                      .map((count, idx) => (count === maxCount ? idx : -1))
                      .filter(idx => idx >= 0)
                    roundWinnerRef.current = winners
                    setRoundWinnerBuckets(winners)
                  }
                  gameEnded = true
                  stopGame()
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
    }
  }, [started, config, stopGame])

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-start md:gap-6">
      {/* Left: Player selection toggles */}
      <aside className="w-full md:w-56 space-y-3 shrink-0">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Players</h2>
          <Button variant="outline" size="sm" onClick={() => setShowPlayerSettings(true)}>
            Manage
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {players.map(player => (
            <Button
              key={player.id}
              variant={player.active ? "default" : "outline"}
              size="sm"
              onClick={() =>
                updatePlayer(player.id, current => ({ ...current, active: !current.active }))
              }
            >
              {player.name}
            </Button>
          ))}
        </div>
      </aside>

      {/* Center: Game board */}
      <div className="space-y-2 shrink-0">
        <div
          key={boardKey}
          className="border"
          ref={canvasRef}
          style={{ width: config.width, height: config.height }}
        />
        {/* Player avatars under buckets */}
        {bucketAssignments.length > 0 && (
          <div
            className="flex"
            style={{ width: config.width }}
          >
            {bucketAssignments.map((playerId, bucketIndex) => {
              const player = players.find(p => p.id === playerId)
              if (!player) return null
              const isWinner = roundWinnerBuckets?.includes(bucketIndex) ?? false
              return (
                <div
                  key={playerId}
                  className="flex flex-col items-center justify-center flex-1"
                >
                  <img
                    src={getAvatarUrl(player)}
                    alt={`${player.name} avatar`}
                    className={`h-10 w-10 rounded-full object-cover border-2 ${
                      isWinner ? "border-emerald-500 ring-2 ring-emerald-300" : "border-slate-200"
                    }`}
                  />
                  <span className={`text-xs mt-1 truncate max-w-full ${isWinner ? "font-semibold text-emerald-600" : ""}`}>
                    {player.name}
                  </span>
                </div>
              )
            })}
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => started ? stopGame() : startGame()}>
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
                value={derivedBucketCount}
                onValueChange={() => {}}
                min={2}
                max={10}
                disabled
              />
              <Input
                className="w-20"
                type="number"
                value={derivedBucketCount}
                onChange={() => {}}
                min={2}
                max={10}
                disabled
              />
            </div>
            <p className="text-xs text-slate-500">
              Bucket count follows enrolled players ({enrolledPlayers.length})
            </p>
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

      {/* Right: Leaderboard */}
      <aside className="w-full md:w-64 shrink-0">
        <section className="border rounded-md p-3 space-y-2">
          <h2 className="text-sm font-semibold">Leaderboard</h2>
          {roundWinnerBuckets != null && roundWinnerBuckets.length > 0 && (
            <div className="text-xs text-slate-500">
              Round winner: bucket {roundWinnerBuckets.map(bucket => bucket + 1).join(", ")}
            </div>
          )}
          {hasWinner && (
            <div className="text-xs text-slate-500">
              {winnerCount > 1 ? "Co-winners" : "Winner"}: {topWins} wins
            </div>
          )}
          <div className="space-y-2">
            {leaderboard.map((player, index) => (
              <div
                key={player.id}
                className="flex items-center justify-between text-sm border rounded-md px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <span className="w-5 text-slate-500">#{index + 1}</span>
                  <span>{player.name}</span>
                  {roundWinnerBuckets?.includes(bucketByPlayer.get(player.id) ?? -1) && (
                    <span className="text-[10px] uppercase tracking-wide text-emerald-600">
                      Round winner
                    </span>
                  )}
                  {hasWinner && player.wins === topWins && (
                    <span className="text-[10px] uppercase tracking-wide text-emerald-600">
                      Winner
                    </span>
                  )}
                </div>
                <span className="font-semibold">{player.wins}</span>
              </div>
            ))}
          </div>
        </section>
      </aside>

      {/* Player Settings Modal */}
      {showPlayerSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-xl max-h-[80vh] overflow-y-auto p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Manage Players</h2>
              <Button variant="outline" onClick={() => setShowPlayerSettings(false)}>
                Close
              </Button>
            </div>
            <Button variant="outline" onClick={addPlayer}>Add player</Button>
            <div className="space-y-3">
              {players.map(player => {
                const assignedBucket = bucketByPlayer.get(player.id)
                const isRoundWinner = roundWinnerBuckets?.includes(assignedBucket ?? -1) ?? false
                return (
                  <div key={player.id} className="flex items-center gap-3 border rounded-md p-2">
                    <img
                      src={getAvatarUrl(player)}
                      alt={`${player.name} avatar`}
                      className="h-12 w-12 rounded-full object-cover"
                    />
                    <div className="flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Input
                          className="min-w-[140px]"
                          value={player.name}
                          onChange={e =>
                            updatePlayer(player.id, current => ({
                              ...current,
                              name: e.target.value
                            }))
                          }
                        />
                        <Button
                          variant={player.active ? "default" : "outline"}
                          onClick={() =>
                            updatePlayer(player.id, current => ({
                              ...current,
                              active: !current.active
                            }))
                          }
                        >
                          {player.active ? "Enrolled" : "Benched"}
                        </Button>
                        {player.active && assignedBucket != null && (
                          <span className="text-xs text-slate-500">
                            Bucket {assignedBucket + 1}
                          </span>
                        )}
                        {isRoundWinner && (
                          <span className="text-[10px] uppercase tracking-wide text-emerald-600">
                            Round winner
                          </span>
                        )}
                        {/* TODO: implement image upload and storage */}
                        <Button variant="outline" disabled>Upload image</Button>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <span className="w-16">Wins</span>
                        <Button
                          variant="outline"
                          onClick={() =>
                            updatePlayer(player.id, current => ({
                              ...current,
                              wins: Math.max(0, current.wins - 1)
                            }))
                          }
                        >
                          -
                        </Button>
                        <span className="w-8 text-center">{player.wins}</span>
                        <Button
                          variant="outline"
                          onClick={() =>
                            updatePlayer(player.id, current => ({
                              ...current,
                              wins: current.wins + 1
                            }))
                          }
                        >
                          +
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => removePlayer(player.id)}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
