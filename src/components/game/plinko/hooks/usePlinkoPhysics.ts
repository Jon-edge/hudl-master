import { useEffect, useRef, useState, useCallback } from "react"
import Matter, { Engine, Render, Runner, Bodies, Composite, Events, Vector } from "matter-js"
import { PlinkoConfig } from "../types"
import { PlayerProfile } from "../../shared/types"

interface UsePlinkoPhysicsProps {
  config: PlinkoConfig
  players: PlayerProfile[]
  onRoundOver: (winnerBucketIndices: number[]) => void
  onCollision?: (x: number, y: number, speed: number) => void
}

export function usePlinkoPhysics({ config, players, onRoundOver, onCollision }: UsePlinkoPhysicsProps) {
  const canvasRef = useRef<HTMLDivElement>(null)
  const engineRef = useRef<Matter.Engine | null>(null)
  const runnerRef = useRef<Matter.Runner | null>(null)
  const renderRef = useRef<Matter.Render | null>(null)
  
  const [isRunning, setIsRunning] = useState(false)
  const [boardKey, setBoardKey] = useState(0) // Forces re-init of board
  const bucketBoundsRef = useRef<number[]>([])
  
  // Game State Refs (mutable during physics steps)
  const roundStateRef = useRef({
    dropped: 0,
    finished: 0,
    bucketCounts: [] as number[],
    settledBalls: new Set<number>(), // ball.id
    firstBallBucket: null as number | null,
    tiebreakRound: 0,
    gameEnded: false,
    liveCountsPrev: [] as number[]
  })

  // Helper: Create shapes
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

  // Helper: Bucket Bounds
  const getBucketBounds = (count: number, width: number, distribution: "even" | "middle" | "edge") => {
    if (distribution === "even") {
      return Array.from({ length: count + 1 }, (_, i) => (i * width) / count)
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
      pos += (width * weights[i]) / sum
      bounds.push(pos)
    }
    return bounds
  }

  // Cleanup Function
  const cleanup = useCallback(() => {
    // Render cleanup moved to usePlinkoRender
    if (runnerRef.current) {
      Runner.stop(runnerRef.current)
    }
    if (engineRef.current) {
      Engine.clear(engineRef.current)
    }
    renderRef.current = null
    runnerRef.current = null
    engineRef.current = null
  }, [])

  const stopGame = useCallback(() => {
    setIsRunning(false)
    if (runnerRef.current) Runner.stop(runnerRef.current)
  }, [])

  // Initialize Board
  useEffect(() => {
    // Canvas ref is handled by usePlinkoRender now, we just need engine
    cleanup()

    const engine = Engine.create()
    engine.positionIterations = 8
    engine.velocityIterations = 6
    const runner = Runner.create()
    
    engineRef.current = engine
    runnerRef.current = runner

    const { width, height } = config
    
    // Walls
    const wallOpts = { isStatic: true, render: { fillStyle: "#cbd5e1" } }
    Composite.add(engine.world, [
      Bodies.rectangle(width / 2, -25, width, 50, wallOpts), // Ceiling
      Bodies.rectangle(width / 2, height + 50, width, 100, wallOpts), // Floor (Safety)
      Bodies.rectangle(-25, height / 2, 50, height, wallOpts), // Left
      Bodies.rectangle(width + 25, height / 2, 50, height, wallOpts), // Right
    ])

    // Pins
    const pins: Matter.Body[] = []
    const xSpacing = (width - config.pinWallGap * 2) / (config.pinColumns - 1)
    const yStart = config.ceilingGap
    const yEnd = height - config.rimHeight - config.pinRimGap
    const ySpacing = config.pinRows > 1 ? (yEnd - yStart) / (config.pinRows - 1) : 0

    for (let row = 0; row < config.pinRows; row++) {
      for (let col = 0; col < config.pinColumns; col++) {
        const x = config.pinWallGap + col * xSpacing + (row % 2 === 0 ? 0 : xSpacing / 2)
        const y = yStart + row * ySpacing
        pins.push(
          makeShape(config.pinShape, x, y, config.pinRadius, {
            isStatic: true,
            restitution: config.pinRestitution,
            friction: config.pinFriction,
            angle: config.pinShape === "ball" ? 0 : config.pinAngle,
            render: { fillStyle: "#94a3b8" }
          })
        )
      }
    }
    Composite.add(engine.world, pins)

    // Bucket Dividers
    const bounds = getBucketBounds(config.bucketCount, width, config.bucketDistribution)
    bucketBoundsRef.current = bounds
    
    for (const x of bounds) {
      Composite.add(engine.world, [
        Bodies.rectangle(
          x,
          height - config.rimHeight / 2,
          config.rimWidth,
          config.rimHeight,
          { isStatic: true, render: { fillStyle: "#e2e8f0" } }
        )
      ])
    }

    Runner.run(runner, engine)

    return cleanup
  }, [config, boardKey, cleanup])

  // Game Logic (Dropping & Win Check)
  useEffect(() => {
    if (!isRunning || !engineRef.current) return

    const engine = engineRef.current
    const { width, height } = config
    const balls: Matter.Body[] = []
    
    // Reset Round State
    roundStateRef.current = {
      dropped: 0,
      finished: 0,
      bucketCounts: new Array(config.bucketCount).fill(0),
      settledBalls: new Set(),
      firstBallBucket: null,
      tiebreakRound: 0,
      gameEnded: false,
      liveCountsPrev: new Array(config.bucketCount).fill(0)
    }

    const ballsPerRound = config.ballCount
    const zig = { x: Math.random() * width, dir: 1 }
    let dropInterval: NodeJS.Timeout | null = null

    const startDropping = () => {
      dropInterval = setInterval(() => {
        const state = roundStateRef.current
        const expectedTotal = ballsPerRound > 0 ? ballsPerRound * (state.tiebreakRound + 1) : Infinity
        
        if (ballsPerRound > 0 && state.dropped >= expectedTotal) {
          if (dropInterval) clearInterval(dropInterval)
          dropInterval = null
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

        const ball = makeShape(config.ballShape, x, -20, config.ballRadius, {
          restitution: config.ballRestitution,
          friction: config.ballFriction,
          angle: config.ballShape === "ball" ? 0 : Math.random() * Math.PI * 2,
          render: { fillStyle: "#3b82f6" }
        })
        
        balls.push(ball)
        Composite.add(engine.world, ball)
        state.dropped++
      }, 500)
    }

    startDropping()

    const onAfterUpdate = () => {
      const state = roundStateRef.current
      if (state.gameEnded) return

      // Nth Win Condition (Instant)
      if (config.winCondition === "nth") {
        const liveCounts = new Array(config.bucketCount).fill(0)
        balls.forEach(ball => {
          if (ball.position.y < height - config.rimHeight) return
          const bounds = bucketBoundsRef.current
          // Find bucket
          for (let i = 0; i < bounds.length - 1; i++) {
            if (ball.position.x >= bounds[i] && ball.position.x < bounds[i+1]) {
              liveCounts[i]++
              break
            }
          }
        })

        const winnerIdx = liveCounts.findIndex((count, idx) => 
          state.liveCountsPrev[idx] < config.winNth && count >= config.winNth
        )
        state.liveCountsPrev = liveCounts

        if (winnerIdx >= 0) {
          state.gameEnded = true
          stopGame()
          onRoundOver([winnerIdx])
          if (dropInterval) clearInterval(dropInterval)
        }
        return
      }

      // Check Settled Balls
      balls.forEach((ball, idx) => {
        if (state.settledBalls.has(ball.id)) return

        // Simple settle check: low Y velocity near bottom
        if (ball.position.y > height - config.rimHeight + 10 && Math.abs(ball.velocity.y) < 0.5 && Math.abs(ball.velocity.x) < 0.5) {
          const bounds = bucketBoundsRef.current
          let bucket = -1
          for (let i = 0; i < bounds.length - 1; i++) {
            if (ball.position.x >= bounds[i] && ball.position.x < bounds[i+1]) {
              bucket = i
              break
            }
          }

          if (bucket >= 0) {
            state.settledBalls.add(ball.id)
            state.bucketCounts[bucket]++
            state.finished++

            if (state.tiebreakRound === 0 && state.finished === 1) {
              state.firstBallBucket = bucket
            }

            if (config.destroyBalls) {
              Composite.remove(engine.world, ball)
              // Note: array splice might be risky during iteration, but for now ok
            }
          }
        }
      })

      // Check Round End
      const expectedBalls = ballsPerRound * (state.tiebreakRound + 1)
      const allDropped = ballsPerRound > 0 && state.dropped >= expectedBalls
      const allSettled = allDropped && state.finished >= expectedBalls

      if (allSettled) {
        let winners: number[] = []
        
        if (config.winCondition === "first") {
          if (state.firstBallBucket !== null) winners = [state.firstBallBucket]
        } else if (config.winCondition === "last-empty") {
           const empty = state.bucketCounts.map((c, i) => c === 0 ? i : -1).filter(i => i >= 0)
           if (empty.length > 0) winners = empty
           else {
             const min = Math.min(...state.bucketCounts)
             winners = state.bucketCounts.map((c, i) => c === min ? i : -1).filter(i => i >= 0)
           }
        } else {
          // Most
          const max = Math.max(...state.bucketCounts)
          winners = state.bucketCounts.map((c, i) => c === max ? i : -1).filter(i => i >= 0)
        }

        if (winners.length > 1) {
          // Tiebreaker
          state.tiebreakRound++
          startDropping()
        } else {
          state.gameEnded = true
          stopGame()
          onRoundOver(winners)
          if (dropInterval) clearInterval(dropInterval)
        }
      }
    }

    Events.on(engine, "afterUpdate", onAfterUpdate)
    
    // Collision Events
    Events.on(engine, "collisionStart", (event) => {
      event.pairs.forEach((pair) => {
        const bodyA = pair.bodyA
        const bodyB = pair.bodyB
        
        // Check for Ball vs Pin collision
        // We know pins are static and balls are not
        // We assigned render.fillStyle to balls as blue (#3b82f6) and pins as gray
        // Better to use labels if we set them, but we didn't explicitly set distinct labels for all.
        // Pins were created with default body creation.
        // Let's assume if one is static and one is not, it's a collision of interest.
        // Actually, walls are static too.
        // We can check if it's "Ball" label (default circle) vs Static.
        
        // We'll just check speed for impact
        // But collisionStart happens on contact.
        // Get velocity of the non-static body
        const ball = bodyA.isStatic ? bodyB : bodyA
        const other = bodyA.isStatic ? bodyA : bodyB
        
        if (!ball.isStatic && other.isStatic) {
           // It's a ball hitting something static (Pin or Wall)
           // If we want only pins, we'd need to tag them.
           // For now, any impact is sound-worthy if fast enough.
           const speed = Vector.magnitude(ball.velocity)
           if (speed > 1) {
             // Collision point is approximate
             // Matter.js collision pair has collision.supports etc but complex
             // Use ball position
             onCollision?.(ball.position.x, ball.position.y, speed)
           }
        }
      })
    })

    return () => {
      if (dropInterval) clearInterval(dropInterval)
      Events.off(engine, "afterUpdate", onAfterUpdate)
      Events.off(engine, "collisionStart")
    }
  }, [isRunning, config, stopGame, onRoundOver, onCollision])

  const startGame = useCallback(() => {
    setBoardKey(k => k + 1)
    setIsRunning(true)
  }, [])

  return {
    engine: engineRef.current,
    startGame,
    stopGame,
    isRunning
  }
}
