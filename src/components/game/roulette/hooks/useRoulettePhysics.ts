"use client"

import { useRef, useCallback, useEffect } from "react"
import type { RouletteConfig, RouletteSlot } from "../types"
import { getWheelSlots } from "../types"

export interface BallState {
  x: number
  y: number
  vx: number
  vy: number
  angle: number // Angle relative to wheel center (for orbit calculations)
  angularVelocity: number // Angular velocity around the wheel
  radius: number // Current orbital radius from center
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
 * Custom physics hook for roulette - simulates a ball spinning on a roulette wheel
 * Uses a simplified 2D orbital physics model with friction and bouncing
 */
export function useRoulettePhysics({
  config,
  playerCount,
  onBallBounce,
  onBallSettle,
  onTick,
}: UseRoulettePhysicsOptions): UseRoulettePhysicsReturn {
  const ballRef = useRef<BallState | null>(null)
  const wheelAngleRef = useRef(0)
  const wheelVelocityRef = useRef(0)
  const isSpinningRef = useRef(false)
  const animationFrameRef = useRef<number | null>(null)
  const lastTimeRef = useRef(0)

  // Callback refs to avoid stale closures
  const onBallBounceRef = useRef(onBallBounce)
  const onBallSettleRef = useRef(onBallSettle)
  const onTickRef = useRef(onTick)
  const configRef = useRef(config)
  const playerCountRef = useRef(playerCount)

  onBallBounceRef.current = onBallBounce
  onBallSettleRef.current = onBallSettle
  onTickRef.current = onTick
  configRef.current = config
  playerCountRef.current = playerCount
  
  const wheelRadius = config.wheelSize / 2
  const trackRadius = wheelRadius * 0.85 // Where ball orbits
  const pocketRadius = wheelRadius * 0.55 // Where pockets are
  const innerRadius = wheelRadius * 0.35 // Inner cone
  
  // Deflector positions (diamond-shaped bumpers on the track)
  const deflectorAngles = Array.from(
    { length: config.deflectorCount },
    (_, i) => (i * 2 * Math.PI) / config.deflectorCount
  )
  
  const physicsLoop = useCallback(() => {
    const now = performance.now()
    const dt = Math.min((now - lastTimeRef.current) / 1000, 0.05) // Cap delta time
    lastTimeRef.current = now
    
    if (!isSpinningRef.current) return
    
    const cfg = configRef.current
    const ball = ballRef.current
    
    // Update wheel rotation
    const wheelFriction = 0.985 // Wheel slows down gradually
    wheelVelocityRef.current *= wheelFriction
    wheelAngleRef.current += wheelVelocityRef.current * dt
    
    // Keep angle in [0, 2π]
    wheelAngleRef.current = wheelAngleRef.current % (2 * Math.PI)
    if (wheelAngleRef.current < 0) wheelAngleRef.current += 2 * Math.PI
    
    if (ball && !ball.settled) {
      // Apply physics to the ball
      const gravity = 500 // Downward force when ball is on the sloped track
      const airFriction = 0.995
      const trackFrictionCoeff = cfg.ballFriction
      
      // Current position in polar coordinates relative to wheel
      const currentRadius = ball.radius
      const currentAngle = ball.angle
      
      // Angular momentum - ball moves around the wheel
      ball.angularVelocity *= airFriction
      
      // Centripetal and gravitational forces
      // Ball experiences outward centrifugal force from spinning
      // And inward gravity from the sloped track
      const centrifugalForce = ball.angularVelocity * ball.angularVelocity * currentRadius * 0.1
      const slopeGravity = gravity * 0.3 // Inward pull from sloped track
      
      // Radial velocity (moving in/out from center)
      let radialAccel = 0
      
      if (currentRadius > pocketRadius) {
        // On the outer track - ball tends to fall inward
        radialAccel = -slopeGravity + centrifugalForce
        
        // More friction when moving slowly (ball settling)
        if (Math.abs(ball.angularVelocity) < 2) {
          radialAccel -= 100 // Stronger inward pull when slow
        }
      } else if (currentRadius > innerRadius) {
        // In the pocket zone - ball bounces between frets
        radialAccel = -slopeGravity * 0.5
        
        // Check for collision with pocket frets (slot dividers)
        const slots = getWheelSlots(cfg.wheelStyle, playerCountRef.current)
        const slotAngleWidth = (2 * Math.PI) / slots.length
        
        // Ball's angle relative to the wheel (accounting for wheel rotation)
        const relativeAngle = (currentAngle - wheelAngleRef.current + 4 * Math.PI) % (2 * Math.PI)
        
        // Which slot is the ball in?
        const slotIndex = Math.floor(relativeAngle / slotAngleWidth)
        const slotCenterAngle = (slotIndex + 0.5) * slotAngleWidth
        const distFromCenter = relativeAngle - slotCenterAngle
        
        // Bounce off frets if near the edge
        const fretThreshold = slotAngleWidth * 0.4
        if (Math.abs(distFromCenter) > fretThreshold && Math.abs(ball.angularVelocity) > 0.1) {
          ball.angularVelocity *= -cfg.ballRestitution * 0.5
          if (onBallBounceRef.current) {
            onBallBounceRef.current(Math.abs(ball.angularVelocity) * 10)
          }
        }
      }
      
      // Check for deflector collisions
      for (const deflectorAngle of deflectorAngles) {
        const deflectorRadius = trackRadius * 0.95
        const angleDiff = Math.abs(currentAngle - deflectorAngle)
        const normalizedDiff = Math.min(angleDiff, 2 * Math.PI - angleDiff)
        
        if (normalizedDiff < 0.15 && Math.abs(currentRadius - deflectorRadius) < 20) {
          // Bounce off deflector
          ball.angularVelocity += (Math.random() - 0.5) * 2 * cfg.ballRestitution
          radialAccel -= 200 * cfg.ballRestitution
          
          if (onBallBounceRef.current) {
            onBallBounceRef.current(Math.abs(ball.angularVelocity) * 20)
          }
        }
      }
      
      // Update radial velocity and position
      const radialVelocity = (ball.vx * Math.cos(currentAngle) + ball.vy * Math.sin(currentAngle))
      const newRadialVelocity = radialVelocity + radialAccel * dt
      
      // Clamp radius to valid range
      let newRadius = currentRadius + newRadialVelocity * dt
      
      // Bounce off outer edge
      if (newRadius > trackRadius) {
        newRadius = trackRadius
        ball.vx *= -cfg.ballRestitution * 0.5
        ball.vy *= -cfg.ballRestitution * 0.5
        if (onBallBounceRef.current) {
          onBallBounceRef.current(50)
        }
      }
      
      // Bounce off inner cone
      if (newRadius < innerRadius) {
        newRadius = innerRadius
        ball.vx *= -cfg.ballRestitution * 0.3
        ball.vy *= -cfg.ballRestitution * 0.3
        radialAccel = Math.abs(radialAccel) * 0.5 // Push back out
        if (onBallBounceRef.current) {
          onBallBounceRef.current(30)
        }
      }
      
      ball.radius = newRadius
      
      // Update angular position
      // Ball also inherits some of the wheel's rotation (friction coupling)
      const wheelCoupling = currentRadius < pocketRadius ? 0.9 : 0.3
      ball.angularVelocity += wheelVelocityRef.current * wheelCoupling * dt
      ball.angularVelocity *= (1 - trackFrictionCoeff * dt)
      ball.angle += ball.angularVelocity * dt
      
      // Convert polar back to cartesian for rendering
      ball.x = Math.cos(ball.angle) * ball.radius
      ball.y = Math.sin(ball.angle) * ball.radius
      
      // Update velocity components
      const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy)
      ball.vx = Math.cos(ball.angle + Math.PI / 2) * ball.angularVelocity * ball.radius
      ball.vy = Math.sin(ball.angle + Math.PI / 2) * ball.angularVelocity * ball.radius
      
      // Check if ball has settled
      const totalSpeed = Math.abs(ball.angularVelocity) + Math.abs(newRadialVelocity)
      const wheelSpeed = Math.abs(wheelVelocityRef.current)
      
      if (totalSpeed < 0.05 && wheelSpeed < 0.1 && ball.radius < pocketRadius) {
        ball.settled = true
        
        // Determine which slot the ball landed in
        const slots = getWheelSlots(cfg.wheelStyle, playerCountRef.current)
        const relativeAngle = (ball.angle - wheelAngleRef.current + 4 * Math.PI) % (2 * Math.PI)
        const slotAngleWidth = (2 * Math.PI) / slots.length
        const slotIndex = Math.floor(relativeAngle / slotAngleWidth)
        const winningSlot = slots[slotIndex % slots.length]
        
        if (onBallSettleRef.current) {
          onBallSettleRef.current(winningSlot)
        }
      }
    }
    
    // Call tick callback for rendering
    if (onTickRef.current && ball) {
      onTickRef.current(ball, wheelAngleRef.current)
    }
    
    // Continue loop if still spinning
    if (isSpinningRef.current && !(ball?.settled)) {
      animationFrameRef.current = requestAnimationFrame(physicsLoop)
    } else if (ball?.settled) {
      // Give a few more frames after settling for visual
      setTimeout(() => {
        isSpinningRef.current = false
      }, 500)
      animationFrameRef.current = requestAnimationFrame(physicsLoop)
    }
  }, [deflectorAngles, innerRadius, pocketRadius, trackRadius])
  
  const spin = useCallback(() => {
    const cfg = configRef.current
    
    // Initialize ball at the outer track
    const startAngle = Math.random() * 2 * Math.PI
    const startRadius = trackRadius * 0.95
    
    ballRef.current = {
      x: Math.cos(startAngle) * startRadius,
      y: Math.sin(startAngle) * startRadius,
      vx: 0,
      vy: 0,
      angle: startAngle,
      angularVelocity: cfg.spinVelocity * (0.8 + Math.random() * 0.4), // Ball spins opposite to wheel
      radius: startRadius,
      settled: false,
    }
    
    // Wheel spins in opposite direction to ball
    wheelVelocityRef.current = -cfg.spinVelocity * (0.6 + Math.random() * 0.3)
    
    isSpinningRef.current = true
    lastTimeRef.current = performance.now()
    
    // Start physics loop
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }
    animationFrameRef.current = requestAnimationFrame(physicsLoop)
  }, [physicsLoop, trackRadius])
  
  const stop = useCallback(() => {
    isSpinningRef.current = false
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
  }, [])
  
  const reset = useCallback(() => {
    stop()
    ballRef.current = null
    wheelAngleRef.current = 0
    wheelVelocityRef.current = 0
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

