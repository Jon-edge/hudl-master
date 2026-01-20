import { useEffect, useRef } from "react"
import Matter, { Bodies, Composite, Engine, Events, Runner } from "matter-js"
import type { PlinkoConfig } from "../types"

export interface PlinkoPhysicsOptions {
  config: PlinkoConfig
  runKey: number
  running: boolean
  onRoundWinner: (buckets: number[]) => void
  onBucketHit: (bucket: number, position: Matter.Vector) => void
  onBallCollision: (speed: number) => void
  onPinHit: (pin: Matter.Body) => void
}

export const usePlinkoPhysics = ({
  config,
  runKey,
  running,
  onRoundWinner,
  onBucketHit,
  onBallCollision,
  onPinHit
}: PlinkoPhysicsOptions) => {
  const engineRef = useRef<Engine | null>(null)
  const runnerRef = useRef<Runner | null>(null)
  const bucketBoundsRef = useRef<number[]>([])
  const pinsRef = useRef<Matter.Body[]>([])
  const ballsRef = useRef<Matter.Body[]>([])
  const dropIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stopDropping = () => {
    if (dropIntervalRef.current != null) {
      clearInterval(dropIntervalRef.current)
      dropIntervalRef.current = null
    }
  }

  useEffect(() => {
    const engine = Engine.create()
    engine.positionIterations = 8
    engine.velocityIterations = 6
    engine.constraintIterations = 2
    const runner = Runner.create()
    engineRef.current = engine
    runnerRef.current = runner
    ballsRef.current = []

    const { width, height } = config
    const walls = [
      Bodies.rectangle(width / 2, -25, width, 50, { isStatic: true, label: "wall" }),
      Bodies.rectangle(width / 2, height - config.wallThickness / 2, width, config.wallThickness, {
        isStatic: true,
        label: "wall"
      }),
      Bodies.rectangle(width / 2, height + config.wallThickness / 2, width, config.wallThickness, {
        isStatic: true,
        label: "wall"
      }),
      Bodies.rectangle(-25, height / 2, 50, height, { isStatic: true, label: "wall" }),
      Bodies.rectangle(width + 25, height / 2, 50, height, { isStatic: true, label: "wall" })
    ]
    Composite.add(engine.world, walls)

    const xSpacing = (width - config.pinWallGap * 2) / (config.pinColumns - 1)
    const yStart = config.ceilingGap
    const yEnd = height - config.rimHeight - config.pinRimGap
    const ySpacing =
      config.pinRows > 1 ? (yEnd - yStart) / (config.pinRows - 1) : 0

    const pins: Matter.Body[] = []
    for (let row = 0; row < config.pinRows; row += 1) {
      for (let col = 0; col < config.pinColumns; col += 1) {
        const x =
          config.pinWallGap + col * xSpacing + (row % 2 === 0 ? 0 : xSpacing / 2)
        const y = yStart + row * ySpacing
        pins.push(
          makeShape(config.pinShape, x, y, config.pinRadius, {
            isStatic: true,
            restitution: config.pinRestitution,
            friction: config.pinFriction,
            angle: config.pinShape === "ball" ? 0 : config.pinAngle,
            label: "pin"
          })
        )
      }
    }
    pinsRef.current = pins
    Composite.add(engine.world, pins)

    const bounds = bucketBounds(config.bucketCount, width, config.bucketDistribution)
    bucketBoundsRef.current = bounds
    for (const x of bounds) {
      Composite.add(engine.world, [
        Bodies.rectangle(x, height - config.rimHeight / 2, config.rimWidth, config.rimHeight, {
          isStatic: true,
          label: "divider"
        })
      ])
    }

    return () => {
      stopDropping()
      if (runnerRef.current != null) {
        Runner.stop(runnerRef.current)
      }
      Engine.clear(engine)
      if (engineRef.current === engine) {
        engineRef.current = null
      }
      if (runnerRef.current === runner) {
        runnerRef.current = null
      }
    }
  }, [config, runKey])

  useEffect(() => {
    const engine = engineRef.current
    const runner = runnerRef.current
    if (engine == null || runner == null) return

    if (running) {
      Runner.run(runner, engine)
    } else {
      Runner.stop(runner)
      stopDropping()
    }
  }, [running])

  useEffect(() => {
    if (!running) return
    const engine = engineRef.current
    if (engine == null) return

    const { width, height } = config
    const bounds = bucketBoundsRef.current
    const balls: Matter.Body[] = []
    const bucketCounts = new Array(config.bucketCount).fill(0)
    const ballBucketMap = new Map<number, number>()
    let dropped = 0
    let finished = 0
    let gameEnded = false
    const settledBalls = new Set<Matter.Body>()
    let firstBallBucket: number | null = null
    let tiebreakRound = 0
    const ballsPerRound = config.ballCount
    const zig = { x: Math.random() * width, dir: 1 }
    let liveCountsPrev = new Array(config.bucketCount).fill(0)

    const startDropping = () => {
      stopDropping()
      dropIntervalRef.current = setInterval(() => {
        if (ballsPerRound > 0 && dropped >= ballsPerRound * (tiebreakRound + 1)) {
          stopDropping()
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
          angle: config.ballShape === "ball" ? 0 : Math.random() * Math.PI * 2,
          label: "ball"
        })
        balls.push(ball)
        ballsRef.current = balls
        Composite.add(engine.world, ball)
        dropped += 1
      }, 420)
    }

    startDropping()

    const afterUpdate = () => {
      if (gameEnded) return

      if (config.winCondition === "nth") {
        const liveCounts = new Array(config.bucketCount).fill(0)
        balls.forEach(ball => {
          if (ball.position.y < height - config.rimHeight) return
          let bucket = -1
          for (let i = 0; i < bounds.length - 1; i += 1) {
            if (ball.position.x >= bounds[i] && ball.position.x < bounds[i + 1]) {
              bucket = i
              break
            }
          }
          if (bucket >= 0 && bucket < liveCounts.length) {
            liveCounts[bucket] += 1
          }
        })

        const winnerBucket = liveCounts.findIndex(
          (count, idx) => liveCountsPrev[idx] < config.winNth && count >= config.winNth
        )
        liveCountsPrev = liveCounts

        if (winnerBucket >= 0) {
          onRoundWinner([winnerBucket])
          gameEnded = true
          stopDropping()
        }
        return
      }

      balls.forEach((ball, index) => {
        if (settledBalls.has(ball)) return
        if (ball.position.y > height - 60 && Math.abs(ball.velocity.y) < 1) {
          let bucket = -1
          for (let i = 0; i < bounds.length - 1; i += 1) {
            if (ball.position.x >= bounds[i] && ball.position.x < bounds[i + 1]) {
              bucket = i
              break
            }
          }
          if (bucket >= 0 && bucket < bucketCounts.length) {
            settledBalls.add(ball)
            bucketCounts[bucket] += 1
            finished += 1
            if (!ballBucketMap.has(ball.id)) {
              ballBucketMap.set(ball.id, bucket)
              onBucketHit(bucket, ball.position)
            }
            if (tiebreakRound === 0 && finished === 1) {
              firstBallBucket = bucket
            }
            if (config.destroyBalls) {
              Composite.remove(engine.world, ball)
              balls.splice(index, 1)
            }
          }
        }
      })

      const expectedBalls = ballsPerRound * (tiebreakRound + 1)
      const allBallsDropped = ballsPerRound > 0 && dropped >= expectedBalls
      const allBallsSettled = allBallsDropped && finished >= expectedBalls

      if (allBallsSettled) {
        let winnerBuckets: number[] = []
        switch (config.winCondition) {
          case "first":
            if (firstBallBucket !== null) {
              winnerBuckets = [firstBallBucket]
            }
            break
          case "last-empty": {
            const emptyBuckets = bucketCounts
              .map((count, idx) => (count === 0 ? idx : -1))
              .filter(idx => idx >= 0)
            if (emptyBuckets.length > 0) {
              winnerBuckets = emptyBuckets
            } else {
              const minCount = Math.min(...bucketCounts)
              winnerBuckets = bucketCounts
                .map((count, idx) => (count === minCount ? idx : -1))
                .filter(idx => idx >= 0)
            }
            break
          }
          case "most":
          default: {
            const maxCount = Math.max(...bucketCounts)
            winnerBuckets = bucketCounts
              .map((count, idx) => (count === maxCount ? idx : -1))
              .filter(idx => idx >= 0)
            break
          }
        }

        if (winnerBuckets.length > 1) {
          tiebreakRound += 1
          startDropping()
        } else if (winnerBuckets.length === 1) {
          onRoundWinner(winnerBuckets)
          gameEnded = true
          stopDropping()
        }
      }
    }

    const collisionStart = (event: Matter.IEventCollision<Matter.Engine>) => {
      event.pairs.forEach(pair => {
        const { bodyA, bodyB } = pair
        const hasBall = bodyA.label === "ball" || bodyB.label === "ball"
        if (!hasBall) return
        const speed = (bodyA.speed + bodyB.speed) / 2
        onBallCollision(speed)
        if (bodyA.label === "pin") onPinHit(bodyA)
        if (bodyB.label === "pin") onPinHit(bodyB)
      })
    }

    Events.on(engine, "afterUpdate", afterUpdate)
    Events.on(engine, "collisionStart", collisionStart)

    return () => {
      stopDropping()
      Events.off(engine, "afterUpdate", afterUpdate)
      Events.off(engine, "collisionStart", collisionStart)
    }
  }, [config, onBallCollision, onBucketHit, onPinHit, onRoundWinner, running])

  return {
    engineRef,
    bucketBoundsRef,
    pinsRef,
    ballsRef
  }
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
  for (let i = 0; i < count; i += 1) {
    const t = i / (count - 1)
    const base = 1 + Math.cos((t - 0.5) * Math.PI)
    weights.push(distribution === "middle" ? base : 2 - base)
  }
  const sum = weights.reduce((a, b) => a + b, 0)
  const bounds: number[] = [0]
  let pos = 0
  for (let i = 0; i < count; i += 1) {
    pos += (totalWidth * weights[i]) / sum
    bounds.push(pos)
  }
  return bounds
}
