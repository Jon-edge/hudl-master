"use client"

import { useRef, useCallback, useEffect } from "react"
import Matter, {
  Engine,
  Bodies,
  Body,
  Composite,
  Events,
  Vector,
} from "matter-js"
import type { RouletteConfig, RouletteSlot } from "../types"
import { getWheelSlots } from "../types"

export interface BallState {
  x: number
  y: number
  vx: number
  vy: number
  angle: number
  angularVelocity: number
  radius: number
  settled: boolean
}

export interface UseRoulettePhysicsOptions {
  config: RouletteConfig
  playerCount?: number
  onBallBounce?: (velocity: number) => void
  onBallSettle?: (slot: RouletteSlot) => void
  onTick?: (ball: BallState, wheelAngle: number) => void
}

export interface UseRoulettePhysicsReturn {
  ballRef: React.RefObject<BallState | null>
  wheelAngleRef: React.RefObject<number>
  wheelVelocityRef: React.RefObject<number>
  isSpinningRef: React.RefObject<boolean>
  spin: () => void
  stop: () => void
  reset: () => void
}

/**
 * Matter.js-based physics for realistic roulette simulation
 *
 * Architecture:
 * - The wheel rotates as a visual element (not a physics body)
 * - The ball is a dynamic physics body
 * - Static bodies form the track, deflectors, and pocket walls
 * - Pocket frets and inner cone rotate with the wheel (updated each frame)
 * - Ball experiences real gravity, friction, and collisions
 */
export function useRoulettePhysics({
  config,
  playerCount,
  onBallBounce,
  onBallSettle,
  onTick,
}: UseRoulettePhysicsOptions): UseRoulettePhysicsReturn {
  const engineRef = useRef<Engine | null>(null)
  const ballBodyRef = useRef<Matter.Body | null>(null)
  const ballRef = useRef<BallState | null>(null)
  const wheelAngleRef = useRef(0)
  const wheelVelocityRef = useRef(0)
  const isSpinningRef = useRef(false)
  const animationFrameRef = useRef<number | null>(null)
  const lastTimeRef = useRef(0)
  const hasSettledRef = useRef(false)
  const settleCheckCountRef = useRef(0)
  const spinStartTimeRef = useRef(0)

  // Bodies that rotate with the wheel
  const rotatingBodiesRef = useRef<Matter.Body[]>([])
  const initialBodyAnglesRef = useRef<Map<Matter.Body, { angle: number; radius: number; baseAngle: number }>>(new Map())

  // Callback refs to avoid stale closures
  const onBallBounceRef = useRef(onBallBounce)
  const onBallSettleRef = useRef(onBallSettle)
  const onTickRef = useRef(onTick)
  const configRef = useRef(config)
  const playerCountRef = useRef(playerCount)

  useEffect(() => {
    onBallBounceRef.current = onBallBounce
    onBallSettleRef.current = onBallSettle
    onTickRef.current = onTick
    configRef.current = config
    playerCountRef.current = playerCount
  }, [onBallBounce, onBallSettle, onTick, config, playerCount])

  // Wheel dimensions
  const wheelRadius = config.wheelSize / 2
  const trackOuterRadius = wheelRadius * 0.88
  const trackInnerRadius = wheelRadius * 0.72
  const pocketOuterRadius = wheelRadius * 0.58
  const pocketInnerRadius = wheelRadius * 0.38
  const deflectorRadius = wheelRadius * 0.80

  // Create the physics world
  const createWorld = useCallback(() => {
    // Clean up previous engine
    if (engineRef.current) {
      Engine.clear(engineRef.current)
    }

    const engine = Engine.create({
      // Use real gravity - we'll rotate the gravity vector to simulate the bowl
      gravity: { x: 0, y: 1, scale: 0.001 },
    })

    // Higher precision for small, fast-moving ball
    engine.positionIterations = 12
    engine.velocityIterations = 10
    engine.constraintIterations = 4

    engineRef.current = engine

    const cfg = configRef.current
    const centerX = 0
    const centerY = 0

    // Create outer track wall (circle approximated with segments)
    const outerWallSegments = 72
    const outerWalls: Matter.Body[] = []
    for (let i = 0; i < outerWallSegments; i++) {
      const angle1 = (i / outerWallSegments) * Math.PI * 2
      const angle2 = ((i + 1) / outerWallSegments) * Math.PI * 2
      const midAngle = (angle1 + angle2) / 2

      const x = Math.cos(midAngle) * (trackOuterRadius + 5)
      const y = Math.sin(midAngle) * (trackOuterRadius + 5)
      const segmentLength = 2 * trackOuterRadius * Math.sin(Math.PI / outerWallSegments) + 2

      const wall = Bodies.rectangle(x, y, segmentLength, 10, {
        isStatic: true,
        angle: midAngle + Math.PI / 2,
        restitution: 0.7, // Good bounce off walls
        friction: 0.05, // Low friction so ball rolls smoothly
        label: "outer-wall",
        render: { visible: false },
      })
      outerWalls.push(wall)
    }
    Composite.add(engine.world, outerWalls)

    // Create deflectors (diamond bumpers)
    const deflectorCount = cfg.deflectorCount
    const deflectors: Matter.Body[] = []
    for (let i = 0; i < deflectorCount; i++) {
      const angle = (i / deflectorCount) * Math.PI * 2
      const x = Math.cos(angle) * deflectorRadius
      const y = Math.sin(angle) * deflectorRadius

      // Diamond shape using polygon - high bounce for realistic deflection
      const deflector = Bodies.polygon(x, y, 4, 12, {
        isStatic: true,
        angle: angle + Math.PI / 4,
        restitution: 0.9, // Very bouncy deflectors
        friction: 0.02, // Minimal friction
        label: "deflector",
        render: { visible: false },
      })
      deflectors.push(deflector)
    }
    Composite.add(engine.world, deflectors)

    // Create a static inner ring to catch the ball in the pocket zone
    // This doesn't rotate - ball settles here and we calculate which pocket based on angle
    const innerRingSegments = 48
    const innerRingWalls: Matter.Body[] = []
    for (let i = 0; i < innerRingSegments; i++) {
      const angle1 = (i / innerRingSegments) * Math.PI * 2
      const angle2 = ((i + 1) / innerRingSegments) * Math.PI * 2
      const midAngle = (angle1 + angle2) / 2

      const x = Math.cos(midAngle) * pocketInnerRadius
      const y = Math.sin(midAngle) * pocketInnerRadius
      const segmentLength = 2 * pocketInnerRadius * Math.sin(Math.PI / innerRingSegments) + 2

      const wall = Bodies.rectangle(x, y, segmentLength, 10, {
        isStatic: true,
        angle: midAngle + Math.PI / 2,
        restitution: 0.4, // Moderate bounce for inner ring
        friction: 0.3, // More friction in pocket area (felt surface)
        label: "inner-ring",
        render: { visible: false },
      })
      innerRingWalls.push(wall)
    }
    Composite.add(engine.world, innerRingWalls)

    // Clear rotating bodies - we're not rotating anything for simpler physics
    rotatingBodiesRef.current = []
    initialBodyAnglesRef.current.clear()

    // Set up collision events
    Events.on(engine, "collisionStart", (event) => {
      event.pairs.forEach((pair) => {
        const labels = [pair.bodyA.label, pair.bodyB.label]
        const isBallCollision = labels.includes("ball")

        if (isBallCollision && onBallBounceRef.current) {
          const ball = pair.bodyA.label === "ball" ? pair.bodyA : pair.bodyB
          const velocity = Vector.magnitude(ball.velocity)
          onBallBounceRef.current(velocity * 5)
        }
      })
    })

    return engine
  }, [trackOuterRadius, deflectorRadius, pocketOuterRadius, pocketInnerRadius])

  // Physics update loop
  const physicsLoop = useCallback(() => {
    const engine = engineRef.current
    const ballBody = ballBodyRef.current

    if (!engine || !isSpinningRef.current) return

    const now = performance.now()
    const dt = Math.min((now - lastTimeRef.current) / 1000, 0.033) // Cap at ~30fps worth of dt
    lastTimeRef.current = now

    const cfg = configRef.current

    // Update wheel rotation - wheel slows down faster than ball
    const wheelFriction = 0.97 // Faster decay for wheel
    wheelVelocityRef.current *= wheelFriction
    wheelAngleRef.current += wheelVelocityRef.current * dt

    // Keep angle normalized
    wheelAngleRef.current = wheelAngleRef.current % (Math.PI * 2)
    if (wheelAngleRef.current < 0) wheelAngleRef.current += Math.PI * 2

    if (ballBody && !hasSettledRef.current) {
      // Get ball position relative to center
      const bx = ballBody.position.x
      const by = ballBody.position.y
      const distFromCenter = Math.sqrt(bx * bx + by * by)
      const ballAngle = Math.atan2(by, bx)

      // === BOWL PHYSICS ===
      // Simulate the sloped bowl by pointing gravity toward center
      // This creates realistic inward spiral motion
      const gravityDirection = Vector.normalise({ x: -bx, y: -by })

      // Adjust gravity based on zone - creates the bowl shape effect
      const speed = Vector.magnitude(ballBody.velocity)
      let gravityScale = 0.0012 // Base gravity scale

      if (distFromCenter > pocketOuterRadius) {
        // Outer track: ball resists falling in when moving fast (centrifugal effect)
        // Higher speed = less effective gravity pulling it in
        const centrifugalResistance = Math.min(speed / 300, 0.8)
        gravityScale *= (1 - centrifugalResistance * 0.6)
      } else if (distFromCenter > pocketInnerRadius) {
        // Pocket zone: moderate gravity, ball settling
        gravityScale *= 0.8
      } else {
        // Inner cone: push ball back out
        gravityScale *= -0.3
      }

      // Set gravity direction toward center (or away if near inner cone)
      engine.gravity.x = gravityDirection.x * gravityScale / 0.001
      engine.gravity.y = gravityDirection.y * gravityScale / 0.001

      // === WHEEL COUPLING ===
      // Ball gets dragged by rotating wheel surface through friction
      const inPockets = distFromCenter < pocketOuterRadius
      if (Math.abs(wheelVelocityRef.current) > 0.1) {
        const wheelCoupling = inPockets ? 0.15 : 0.02
        const tangentDirection = { x: -gravityDirection.y, y: gravityDirection.x }
        const couplingForce = wheelVelocityRef.current * wheelCoupling * ballBody.mass * 0.5

        Body.applyForce(ballBody, ballBody.position, {
          x: tangentDirection.x * couplingForce * dt,
          y: tangentDirection.y * couplingForce * dt,
        })
      }

      // Step the physics engine - let Matter.js handle the physics naturally
      Engine.update(engine, dt * 1000)

      // Update ball state for rendering (reuse speed from above)

      ballRef.current = {
        x: ballBody.position.x,
        y: ballBody.position.y,
        vx: ballBody.velocity.x,
        vy: ballBody.velocity.y,
        angle: ballAngle,
        angularVelocity: speed / Math.max(distFromCenter, 1),
        radius: distFromCenter,
        settled: false,
      }

      // Check for settlement - ball must be in pocket zone and moving slowly
      const isInPocketZone = distFromCenter < pocketOuterRadius && distFromCenter > pocketInnerRadius
      const isSlowEnough = speed < 20
      const wheelIsSlowEnough = Math.abs(wheelVelocityRef.current) < 1.0

      // Failsafe: force settle after 15 seconds
      const elapsedTime = (now - spinStartTimeRef.current) / 1000
      const forceSettle = elapsedTime > 15

      if ((isInPocketZone && isSlowEnough && wheelIsSlowEnough) || forceSettle) {
        settleCheckCountRef.current++

        // Require multiple consecutive frames of being settled (~0.3 seconds at 60fps)
        // Or settle immediately if forced
        if (settleCheckCountRef.current > 20 || forceSettle) {
          hasSettledRef.current = true
          ballRef.current.settled = true

          // Determine winning slot
          const slots = getWheelSlots(cfg.wheelStyle, playerCountRef.current)
          // Ball angle relative to wheel
          const relativeAngle = (ballAngle - wheelAngleRef.current + Math.PI * 4) % (Math.PI * 2)
          const slotAngleWidth = (Math.PI * 2) / slots.length
          // Offset by half slot to center the detection
          const adjustedAngle = (relativeAngle + slotAngleWidth / 2 + Math.PI / 2) % (Math.PI * 2)
          const slotIndex = Math.floor(adjustedAngle / slotAngleWidth)
          const winningSlot = slots[slotIndex % slots.length]

          if (onBallSettleRef.current) {
            onBallSettleRef.current(winningSlot)
          }
        }
      } else {
        settleCheckCountRef.current = 0
      }

      // Call tick for rendering
      if (onTickRef.current && ballRef.current) {
        onTickRef.current(ballRef.current, wheelAngleRef.current)
      }
    }

    // Continue loop if still spinning
    if (isSpinningRef.current && !hasSettledRef.current) {
      animationFrameRef.current = requestAnimationFrame(physicsLoop)
    } else if (hasSettledRef.current) {
      // Keep updating for a bit after settling for visual smoothness
      const finalUpdates = () => {
        if (onTickRef.current && ballRef.current) {
          onTickRef.current(ballRef.current, wheelAngleRef.current)
        }
      }
      finalUpdates()

      setTimeout(() => {
        isSpinningRef.current = false
      }, 300)
    }
  }, [pocketOuterRadius, pocketInnerRadius])

  // Start spin
  const spin = useCallback(() => {
    const cfg = configRef.current

    // Create fresh world
    const engine = createWorld()

    // Create ball on the outer track
    const startAngle = Math.random() * Math.PI * 2
    const startRadius = trackOuterRadius - 15
    const startX = Math.cos(startAngle) * startRadius
    const startY = Math.sin(startAngle) * startRadius

    const ball = Bodies.circle(startX, startY, cfg.ballSize, {
      restitution: 0.6, // Good bounce like real ball pool examples
      friction: 0.1, // Low friction for smooth rolling
      frictionStatic: 0.5, // Default static friction
      frictionAir: 0.015, // Slightly higher than default for realistic air drag
      density: 0.002, // Lighter ball - more responsive physics
      slop: 0.05, // Default collision tolerance
      label: "ball",
    })

    // Initial velocity - ball moves opposite to wheel direction
    // Tuned for good visual physics - not too fast, not too slow
    const ballSpeed = cfg.spinVelocity * 8 * (0.9 + Math.random() * 0.2)
    const tangentAngle = startAngle + Math.PI / 2
    Body.setVelocity(ball, {
      x: Math.cos(tangentAngle) * ballSpeed,
      y: Math.sin(tangentAngle) * ballSpeed,
    })

    Composite.add(engine.world, ball)
    ballBodyRef.current = ball

    // Wheel spins opposite to ball - reduced for faster settling
    wheelVelocityRef.current = -cfg.spinVelocity * 0.25 * (0.8 + Math.random() * 0.4)

    // Reset state
    hasSettledRef.current = false
    settleCheckCountRef.current = 0
    isSpinningRef.current = true
    lastTimeRef.current = performance.now()
    spinStartTimeRef.current = performance.now()

    // Initial ball state
    ballRef.current = {
      x: startX,
      y: startY,
      vx: ball.velocity.x,
      vy: ball.velocity.y,
      angle: startAngle,
      angularVelocity: ballSpeed / startRadius,
      radius: startRadius,
      settled: false,
    }

    // Start physics loop
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }
    animationFrameRef.current = requestAnimationFrame(physicsLoop)
  }, [createWorld, physicsLoop, trackOuterRadius])

  const stop = useCallback(() => {
    isSpinningRef.current = false
    hasSettledRef.current = true
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
  }, [])

  const reset = useCallback(() => {
    stop()
    ballRef.current = null
    ballBodyRef.current = null
    wheelAngleRef.current = 0
    wheelVelocityRef.current = 0
    hasSettledRef.current = false
    settleCheckCountRef.current = 0
    rotatingBodiesRef.current = []
    initialBodyAnglesRef.current.clear()

    if (engineRef.current) {
      Engine.clear(engineRef.current)
      engineRef.current = null
    }
  }, [stop])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      if (engineRef.current) {
        Engine.clear(engineRef.current)
      }
    }
  }, [])

  return {
    ballRef,
    wheelAngleRef,
    wheelVelocityRef,
    isSpinningRef,
    spin,
    stop,
    reset,
  }
}
