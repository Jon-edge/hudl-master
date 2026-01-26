"use client"

import { useRef, useCallback, useEffect } from "react"
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

interface PolarBallState {
  r: number       // Radius from center
  theta: number   // Angular position (radians)
  dr: number      // Radial velocity (positive = outward)
  dtheta: number  // Angular velocity (rad/s)
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
 * Polar coordinate physics for realistic roulette simulation
 *
 * This approach uses polar coordinates (radius, angle) which naturally model
 * circular motion. The physics simulate a ball on a sloped bowl where:
 * - Centrifugal force (r * omega^2) pushes the ball outward
 * - Gravity component on the slope pulls the ball inward
 * - Ball maintains orbit when forces balance, spirals in as it slows
 */
export function useRoulettePhysics({
  config,
  playerCount,
  onBallBounce,
  onBallSettle,
  onTick,
}: UseRoulettePhysicsOptions): UseRoulettePhysicsReturn {
  // Ball state in polar coordinates
  const polarBallRef = useRef<PolarBallState | null>(null)
  const ballRef = useRef<BallState | null>(null)
  const wheelAngleRef = useRef(0)
  const wheelVelocityRef = useRef(0)
  const isSpinningRef = useRef(false)
  const animationFrameRef = useRef<number | null>(null)
  const lastTimeRef = useRef(0)
  const hasSettledRef = useRef(false)
  const settleCheckCountRef = useRef(0)
  const spinStartTimeRef = useRef(0)

  // Deflector collision cooldowns to prevent rapid re-collisions
  const deflectorCooldownsRef = useRef<Map<number, number>>(new Map())

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

  // Wheel dimensions (derived from config)
  const getWheelDimensions = useCallback(() => {
    const cfg = configRef.current
    const wheelRadius = cfg.wheelSize / 2
    return {
      wheelRadius,
      trackOuterRadius: wheelRadius * 0.88,
      trackInnerRadius: wheelRadius * 0.72,
      pocketOuterRadius: wheelRadius * 0.58,
      pocketInnerRadius: wheelRadius * 0.38,
      deflectorRadius: wheelRadius * 0.80,
    }
  }, [])

  // Get effective slope for a given radius (smooth interpolation)
  const getSlopeForRadius = useCallback((r: number): number => {
    const cfg = configRef.current
    const dims = getWheelDimensions()

    if (r > dims.pocketOuterRadius) {
      // Outer track - full slope
      return cfg.outerTrackSlope
    } else if (r > dims.pocketInnerRadius) {
      // Pocket zone - interpolate to lower slope
      const t = (r - dims.pocketInnerRadius) / (dims.pocketOuterRadius - dims.pocketInnerRadius)
      const pocketSlope = cfg.outerTrackSlope * 0.3 // Pocket zone has gentler slope
      return pocketSlope + (cfg.outerTrackSlope - pocketSlope) * t
    } else {
      // Inner cone - negative slope (pushes ball back out)
      return -cfg.outerTrackSlope * 0.4
    }
  }, [getWheelDimensions])

  // Check for deflector collisions
  const checkDeflectorCollisions = useCallback((ball: PolarBallState, now: number): boolean => {
    const cfg = configRef.current
    const dims = getWheelDimensions()

    // Only check collisions if ball is near deflector radius
    const deflectorTolerance = cfg.ballSize + 15 // Ball radius + deflector size
    if (Math.abs(ball.r - dims.deflectorRadius) > deflectorTolerance) {
      return false
    }

    const deflectorCount = cfg.deflectorCount
    let collided = false

    for (let i = 0; i < deflectorCount; i++) {
      const deflectorAngle = (i * 2 * Math.PI) / deflectorCount

      // Check cooldown
      const lastCollision = deflectorCooldownsRef.current.get(i) || 0
      if (now - lastCollision < 200) continue // 200ms cooldown

      // Angular distance to deflector
      let angleDiff = ball.theta - deflectorAngle
      // Normalize to [-PI, PI]
      while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI
      while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI

      // Convert angular distance to arc length at this radius
      const arcDistance = Math.abs(angleDiff) * ball.r
      const radialDistance = Math.abs(ball.r - dims.deflectorRadius)

      // Check if within collision distance
      const collisionDistance = cfg.ballSize + 12 // Ball + deflector radius
      const totalDistance = Math.sqrt(arcDistance * arcDistance + radialDistance * radialDistance)

      if (totalDistance < collisionDistance) {
        // Collision!
        collided = true
        deflectorCooldownsRef.current.set(i, now)

        // Bounce the ball
        // Reverse radial direction with some randomness
        ball.dr = -ball.dr * cfg.ballRestitution * (0.7 + Math.random() * 0.6)

        // Add some angular kick
        const angularKick = (Math.random() - 0.5) * 2 * Math.abs(ball.dtheta) * 0.3
        ball.dtheta = ball.dtheta * cfg.ballRestitution + angularKick

        // Slightly push ball away from deflector
        if (ball.r > dims.deflectorRadius) {
          ball.r += 3
        } else {
          ball.r -= 3
        }

        // Notify bounce callback
        if (onBallBounceRef.current) {
          const impactVelocity = Math.sqrt(ball.dr * ball.dr + (ball.dtheta * ball.r) ** 2)
          onBallBounceRef.current(impactVelocity * 3)
        }

        break // Only handle one collision per frame
      }
    }

    return collided
  }, [getWheelDimensions])

  // Convert polar to Cartesian for rendering
  const polarToCartesian = useCallback((polar: PolarBallState): BallState => {
    const x = polar.r * Math.cos(polar.theta)
    const y = polar.r * Math.sin(polar.theta)
    const tangentialVelocity = polar.dtheta * polar.r
    const vx = -tangentialVelocity * Math.sin(polar.theta) + polar.dr * Math.cos(polar.theta)
    const vy = tangentialVelocity * Math.cos(polar.theta) + polar.dr * Math.sin(polar.theta)

    return {
      x,
      y,
      vx,
      vy,
      angle: polar.theta,
      angularVelocity: polar.dtheta,
      radius: polar.r,
      settled: false,
    }
  }, [])

  // Main physics loop
  const physicsLoop = useCallback(() => {
    if (!isSpinningRef.current || !polarBallRef.current) return

    const now = performance.now()
    const dt = Math.min((now - lastTimeRef.current) / 1000, 0.033) // Cap at ~30fps equivalent
    lastTimeRef.current = now

    const cfg = configRef.current
    const dims = getWheelDimensions()
    const ball = polarBallRef.current

    // Update wheel rotation - wheel slows down gradually
    // wheelFriction is now a decay rate per second (0 = no decay, 1 = fast decay)
    // Convert to time-based exponential decay: velocity *= e^(-decayRate * dt)
    const wheelDecayRate = (1.0 - cfg.wheelFriction) * 100 // Scale so 0.99 = slow, 0.98 = fast
    wheelVelocityRef.current *= Math.exp(-wheelDecayRate * dt)
    wheelAngleRef.current += wheelVelocityRef.current * dt

    // Keep angle normalized
    wheelAngleRef.current = wheelAngleRef.current % (Math.PI * 2)
    if (wheelAngleRef.current < 0) wheelAngleRef.current += Math.PI * 2

    if (!hasSettledRef.current) {
      // === POLAR PHYSICS ===

      // The key insight: angular momentum tends to be conserved
      // As ball spirals inward, it should actually speed up (like a figure skater)
      // But friction and air resistance slowly drain energy

      // 1. Calculate forces
      const centrifugal = ball.r * ball.dtheta * ball.dtheta
      const slope = getSlopeForRadius(ball.r)
      const gravityInward = cfg.gravity * slope

      // Air drag - very gentle, proportional to velocity squared
      // Scaled down significantly so ball maintains speed longer
      const airDrag = -cfg.airResistance * ball.dtheta * Math.abs(ball.dtheta) * 0.1

      // Surface friction - also gentle, linear decay
      const surfaceFriction = -cfg.trackFriction * ball.dtheta * 0.05

      // 2. Update angular velocity
      // Apply friction forces (these are small)
      ball.dtheta += (airDrag + surfaceFriction) * dt

      // Conservation of angular momentum effect when radius changes
      // L = m * r * v = m * r^2 * omega (constant without friction)
      // So if r decreases, omega should increase
      // We apply this as a gentle correction
      if (Math.abs(ball.dr) > 0.1) {
        // When moving inward (dr < 0), angular velocity increases
        const momentumCorrection = -ball.dr / ball.r * ball.dtheta * 0.3
        ball.dtheta += momentumCorrection * dt
      }

      // 3. Update radial velocity
      // Net radial acceleration = centrifugal outward - gravity inward - damping
      const radialDamping = ball.dr * 2.0 // Stronger damping on radial oscillation
      ball.dr += (centrifugal - gravityInward - radialDamping) * dt

      // 4. Wheel coupling in pocket zone
      const inPocketZone = ball.r < dims.pocketOuterRadius && ball.r > dims.pocketInnerRadius
      if (inPocketZone) {
        const wheelAngularVelocity = wheelVelocityRef.current
        const coupling = cfg.wheelCoupling

        // Ball gets dragged toward wheel's angular velocity
        // This works both when wheel is spinning (drags ball along)
        // and when wheel is stopped (friction slows ball to match stationary wheel)
        ball.dtheta += (wheelAngularVelocity - ball.dtheta) * coupling * dt
      }

      // 5. Check deflector collisions
      checkDeflectorCollisions(ball, now)

      // 6. Update positions
      ball.r += ball.dr * dt
      ball.theta += ball.dtheta * dt

      // 7. Boundary enforcement
      // Outer wall - bounce back in
      if (ball.r > dims.trackOuterRadius - cfg.ballSize) {
        ball.r = dims.trackOuterRadius - cfg.ballSize
        ball.dr = -Math.abs(ball.dr) * cfg.ballRestitution * 0.8
        if (onBallBounceRef.current) {
          onBallBounceRef.current(Math.abs(ball.dr) * 2)
        }
      }

      // Inner wall - bounce back out
      if (ball.r < dims.pocketInnerRadius + cfg.ballSize) {
        ball.r = dims.pocketInnerRadius + cfg.ballSize
        ball.dr = Math.abs(ball.dr) * cfg.ballRestitution * 0.6
        if (onBallBounceRef.current) {
          onBallBounceRef.current(Math.abs(ball.dr) * 2)
        }
      }

      // Normalize theta
      ball.theta = ball.theta % (Math.PI * 2)
      if (ball.theta < 0) ball.theta += Math.PI * 2

      // 8. Convert to Cartesian for rendering
      const cartesian = polarToCartesian(ball)
      cartesian.settled = false
      ballRef.current = cartesian

      // 9. Check for settlement
      const speed = Math.sqrt(ball.dr * ball.dr + (ball.dtheta * ball.r) ** 2)
      const isSlowEnough = speed < 15 && Math.abs(ball.dtheta) < 0.3
      const wheelIsSlowEnough = Math.abs(wheelVelocityRef.current) < 0.5

      // Failsafe: force settle after 20 seconds
      const elapsedTime = (now - spinStartTimeRef.current) / 1000
      const forceSettle = elapsedTime > 20

      if ((inPocketZone && isSlowEnough && wheelIsSlowEnough) || forceSettle) {
        settleCheckCountRef.current++

        // Require multiple consecutive frames (~0.5s at 60fps)
        if (settleCheckCountRef.current > 30 || forceSettle) {
          hasSettledRef.current = true
          ballRef.current!.settled = true

          // Determine winning slot
          const slots = getWheelSlots(cfg.wheelStyle, playerCountRef.current)
          // Ball angle relative to wheel
          const relativeAngle = (ball.theta - wheelAngleRef.current + Math.PI * 4) % (Math.PI * 2)
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
      // Final tick after settling
      if (onTickRef.current && ballRef.current) {
        onTickRef.current(ballRef.current, wheelAngleRef.current)
      }

      setTimeout(() => {
        isSpinningRef.current = false
      }, 300)
    }
  }, [getWheelDimensions, getSlopeForRadius, checkDeflectorCollisions, polarToCartesian])

  // Start spin
  const spin = useCallback(() => {
    const cfg = configRef.current
    const dims = getWheelDimensions()

    // Initialize ball on outer track
    const startAngle = Math.random() * Math.PI * 2
    const startRadius = dims.trackOuterRadius - cfg.ballSize - 5

    // Initial angular velocity (rad/s) - ball spins opposite to wheel
    // ballThrowSpeed multiplier allows user to control how fast the ball is thrown
    // With spinVelocity=15 and ballThrowSpeed=1.5, this gives ~18-22 rad/s
    const initialAngularVelocity = cfg.spinVelocity * cfg.ballThrowSpeed * (0.9 + Math.random() * 0.2)

    polarBallRef.current = {
      r: startRadius,
      theta: startAngle,
      dr: 0, // No initial radial velocity
      dtheta: initialAngularVelocity,
    }

    // Wheel spins opposite direction (slower than ball)
    // wheelSpinSpeed multiplier allows user to control wheel rotation speed
    wheelVelocityRef.current = -cfg.spinVelocity * cfg.wheelSpinSpeed * 0.15 * (0.8 + Math.random() * 0.4)

    // Reset state
    hasSettledRef.current = false
    settleCheckCountRef.current = 0
    isSpinningRef.current = true
    lastTimeRef.current = performance.now()
    spinStartTimeRef.current = performance.now()
    deflectorCooldownsRef.current.clear()

    // Initial Cartesian state
    ballRef.current = polarToCartesian(polarBallRef.current)

    // Start physics loop
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }
    animationFrameRef.current = requestAnimationFrame(physicsLoop)
  }, [getWheelDimensions, polarToCartesian, physicsLoop])

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
    polarBallRef.current = null
    ballRef.current = null
    wheelAngleRef.current = 0
    wheelVelocityRef.current = 0
    hasSettledRef.current = false
    settleCheckCountRef.current = 0
    deflectorCooldownsRef.current.clear()
  }, [stop])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
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
