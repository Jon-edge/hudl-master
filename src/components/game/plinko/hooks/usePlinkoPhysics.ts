"use client"

import { useRef, useCallback, useEffect } from "react"
import Matter, {
  Engine,
  Runner,
  Bodies,
  Composite,
  Events,
  Body
} from "matter-js"
import type { PlinkoConfig } from "../types"

export interface UsePlinkoPhysicsOptions {
  config: PlinkoConfig
  onBallSettle?: (bucketIndex: number) => void
  onCollision?: (velocity: number, position: { x: number; y: number }) => void
}

export interface UsePlinkoPhysicsReturn {
  engineRef: React.RefObject<Matter.Engine | null>
  runnerRef: React.RefObject<Matter.Runner | null>
  ballsRef: React.RefObject<Matter.Body[]>
  pinsRef: React.RefObject<Matter.Body[]>
  bucketBoundsRef: React.RefObject<number[]>
  initializeBoard: () => void
  dropBall: (x?: number) => Matter.Body | null
  clearBalls: () => void
  startRunner: () => void
  stopRunner: () => void
  cleanup: () => void
}

/**
 * Helper to create different shaped bodies
 */
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

/**
 * Calculate bucket boundary positions
 */
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

/**
 * Hook for managing Plinko physics with Matter.js
 */
export function usePlinkoPhysics({
  config,
  onBallSettle,
  onCollision,
}: UsePlinkoPhysicsOptions): UsePlinkoPhysicsReturn {
  const engineRef = useRef<Matter.Engine | null>(null)
  const runnerRef = useRef<Matter.Runner | null>(null)
  const ballsRef = useRef<Matter.Body[]>([])
  const pinsRef = useRef<Matter.Body[]>([])
  const bucketBoundsRef = useRef<number[]>([])
  const settledBallsRef = useRef<Set<number>>(new Set())
  const ballIdCounterRef = useRef(0)

  const initializeBoard = useCallback(() => {
    // Create fresh engine
    const engine = Engine.create()
    engine.positionIterations = 8
    engine.velocityIterations = 6
    engine.constraintIterations = 2
    
    engineRef.current = engine
    settledBallsRef.current = new Set()
    ballsRef.current = []
    pinsRef.current = []

    const { width, height } = config

    // Create walls
    const walls = [
      Bodies.rectangle(width / 2, -25, width, 50, { isStatic: true, label: "wall-ceiling" }),
      Bodies.rectangle(width / 2, height - config.wallThickness / 2, width, config.wallThickness, { 
        isStatic: true, 
        label: "wall-floor" 
      }),
      Bodies.rectangle(width / 2, height + config.wallThickness / 2, width, config.wallThickness, { 
        isStatic: true,
        label: "wall-safety"
      }),
      Bodies.rectangle(-25, height / 2, 50, height, { isStatic: true, label: "wall-left" }),
      Bodies.rectangle(width + 25, height / 2, 50, height, { isStatic: true, label: "wall-right" })
    ]
    Composite.add(engine.world, walls)

    // Create pins
    const xSpacing = (width - config.pinWallGap * 2) / (config.pinColumns - 1)
    const yStart = config.ceilingGap
    const yEnd = height - config.rimHeight - config.pinRimGap
    const ySpacing = config.pinRows > 1 ? (yEnd - yStart) / (config.pinRows - 1) : 0
    
    const pins: Matter.Body[] = []
    for (let row = 0; row < config.pinRows; row++) {
      for (let col = 0; col < config.pinColumns; col++) {
        const x = config.pinWallGap + col * xSpacing + (row % 2 === 0 ? 0 : xSpacing / 2)
        const y = yStart + row * ySpacing
        const pin = makeShape(config.pinShape, x, y, config.pinRadius, {
          isStatic: true,
          restitution: config.pinRestitution,
          friction: config.pinFriction,
          angle: config.pinShape === "ball" ? 0 : config.pinAngle,
          label: `pin-${row}-${col}`
        })
        pins.push(pin)
      }
    }
    pinsRef.current = pins
    Composite.add(engine.world, pins)

    // Create bucket dividers
    const bounds = bucketBounds(config.bucketCount, width, config.bucketDistribution)
    bucketBoundsRef.current = bounds
    for (const x of bounds) {
      Composite.add(engine.world, [
        Bodies.rectangle(
          x,
          height - config.rimHeight / 2,
          config.rimWidth,
          config.rimHeight,
          { isStatic: true, label: "bucket-divider" }
        )
      ])
    }

    // Collision detection for sounds
    if (onCollision) {
      Events.on(engine, "collisionStart", (event) => {
        event.pairs.forEach((pair) => {
          const isBallPin = 
            (pair.bodyA.label?.startsWith("ball") && pair.bodyB.label?.startsWith("pin")) ||
            (pair.bodyB.label?.startsWith("ball") && pair.bodyA.label?.startsWith("pin"))
          
          if (isBallPin) {
            const ball = pair.bodyA.label?.startsWith("ball") ? pair.bodyA : pair.bodyB
            const velocity = Math.sqrt(ball.velocity.x ** 2 + ball.velocity.y ** 2)
            onCollision(velocity, { x: ball.position.x, y: ball.position.y })
          }
        })
      })
    }
  }, [config, onCollision])

  const dropBall = useCallback((x?: number): Matter.Body | null => {
    const engine = engineRef.current
    if (!engine) return null

    const { width } = config
    const dropX = x ?? width / 2
    
    const ball = makeShape(config.ballShape, dropX, 0, config.ballRadius, {
      restitution: config.ballRestitution,
      friction: config.ballFriction,
      angle: config.ballShape === "ball" ? 0 : Math.random() * Math.PI * 2,
      label: `ball-${ballIdCounterRef.current++}`
    })
    
    ballsRef.current.push(ball)
    Composite.add(engine.world, ball)
    
    return ball
  }, [config])

  const clearBalls = useCallback(() => {
    const engine = engineRef.current
    if (!engine) return
    
    ballsRef.current.forEach(ball => {
      Composite.remove(engine.world, ball)
    })
    ballsRef.current = []
    settledBallsRef.current = new Set()
  }, [])

  const startRunner = useCallback(() => {
    const engine = engineRef.current
    if (!engine) return
    
    if (!runnerRef.current) {
      runnerRef.current = Runner.create()
    }
    Runner.run(runnerRef.current, engine)
  }, [])

  const stopRunner = useCallback(() => {
    if (runnerRef.current) {
      Runner.stop(runnerRef.current)
    }
  }, [])

  const cleanup = useCallback(() => {
    stopRunner()
    if (engineRef.current) {
      Engine.clear(engineRef.current)
      engineRef.current = null
    }
    runnerRef.current = null
    ballsRef.current = []
    pinsRef.current = []
    bucketBoundsRef.current = []
  }, [stopRunner])

  // Check for settled balls
  useEffect(() => {
    const engine = engineRef.current
    if (!engine || !onBallSettle) return

    const checkSettled = () => {
      const { height } = config
      const bounds = bucketBoundsRef.current

      ballsRef.current.forEach((ball) => {
        if (settledBallsRef.current.has(ball.id)) return
        
        if (ball.position.y > height - 60 && Math.abs(ball.velocity.y) < 1) {
          let bucketIndex = -1
          for (let i = 0; i < bounds.length - 1; i++) {
            if (ball.position.x >= bounds[i] && ball.position.x < bounds[i + 1]) {
              bucketIndex = i
              break
            }
          }
          
          if (bucketIndex >= 0) {
            settledBallsRef.current.add(ball.id)
            onBallSettle(bucketIndex)
            
            if (config.destroyBalls) {
              Composite.remove(engine.world, ball)
              ballsRef.current = ballsRef.current.filter(b => b.id !== ball.id)
            }
          }
        }
      })
    }

    Events.on(engine, "afterUpdate", checkSettled)
    return () => {
      Events.off(engine, "afterUpdate", checkSettled)
    }
  }, [config, onBallSettle])

  return {
    engineRef,
    runnerRef,
    ballsRef,
    pinsRef,
    bucketBoundsRef,
    initializeBoard,
    dropBall,
    clearBalls,
    startRunner,
    stopRunner,
    cleanup,
  }
}
