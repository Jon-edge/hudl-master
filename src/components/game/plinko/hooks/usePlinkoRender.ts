"use client"

import { useRef, useCallback, useEffect } from "react"
import type Matter from "matter-js"
import type { PlinkoConfig } from "../types"

export interface RenderTheme {
  background: string
  pinColor: string
  pinGlow: string
  ballGradientStart: string
  ballGradientEnd: string
  ballTrail: string
  bucketDivider: string
  bucketHighlight: string
  wallColor: string
}

const lightTheme: RenderTheme = {
  background: "linear-gradient(180deg, #f8fafc 0%, #e2e8f0 100%)",
  pinColor: "#6366f1",
  pinGlow: "rgba(99, 102, 241, 0.4)",
  ballGradientStart: "#f97316",
  ballGradientEnd: "#ea580c",
  ballTrail: "rgba(249, 115, 22, 0.3)",
  bucketDivider: "#cbd5e1",
  bucketHighlight: "rgba(34, 197, 94, 0.3)",
  wallColor: "#94a3b8",
}

const darkTheme: RenderTheme = {
  background: "linear-gradient(180deg, #0f172a 0%, #1e293b 100%)",
  pinColor: "#818cf8",
  pinGlow: "rgba(129, 140, 248, 0.5)",
  ballGradientStart: "#fb923c",
  ballGradientEnd: "#f97316",
  ballTrail: "rgba(251, 146, 60, 0.35)",
  bucketDivider: "#475569",
  bucketHighlight: "rgba(74, 222, 128, 0.4)",
  wallColor: "#64748b",
}

interface HitPin {
  x: number
  y: number
  time: number
  intensity: number
}

export interface UsePlinkoRenderOptions {
  canvasRef: React.RefObject<HTMLCanvasElement | null>
  engineRef: React.RefObject<Matter.Engine | null>
  ballsRef: React.RefObject<Matter.Body[]>
  pinsRef: React.RefObject<Matter.Body[]>
  bucketBoundsRef: React.RefObject<number[]>
  bucketCountsRef: React.RefObject<number[]>
  config: PlinkoConfig
  winningBuckets?: number[]
  isDark?: boolean
}

export interface UsePlinkoRenderReturn {
  startRender: () => void
  stopRender: () => void
  registerPinHit: (x: number, y: number, intensity: number) => void
}

/**
 * Custom canvas renderer for Plinko with "Modern Glass & Light" aesthetic
 */
export function usePlinkoRender({
  canvasRef,
  engineRef,
  ballsRef,
  pinsRef,
  bucketBoundsRef,
  bucketCountsRef,
  config,
  winningBuckets = [],
  isDark = false,
}: UsePlinkoRenderOptions): UsePlinkoRenderReturn {
  const animationRef = useRef<number | null>(null)
  const hitPinsRef = useRef<HitPin[]>([])
  const trailsRef = useRef<Map<number, Array<{ x: number; y: number; alpha: number }>>>(new Map())
  
  const theme = isDark ? darkTheme : lightTheme

  const registerPinHit = useCallback((x: number, y: number, intensity: number) => {
    hitPinsRef.current.push({ x, y, time: Date.now(), intensity: Math.min(intensity / 10, 1) })
  }, [])

  const render = useCallback(() => {
    const canvas = canvasRef.current
    const engine = engineRef.current
    if (!canvas || !engine) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const { width, height } = config
    const now = Date.now()

    // Clear and draw background
    ctx.clearRect(0, 0, width, height)
    
    // Background gradient
    const bgGradient = ctx.createLinearGradient(0, 0, 0, height)
    if (isDark) {
      bgGradient.addColorStop(0, "#0f172a")
      bgGradient.addColorStop(1, "#1e293b")
    } else {
      bgGradient.addColorStop(0, "#f8fafc")
      bgGradient.addColorStop(1, "#e2e8f0")
    }
    ctx.fillStyle = bgGradient
    ctx.fillRect(0, 0, width, height)

    // Draw bucket zones
    const bounds = bucketBoundsRef.current
    const counts = bucketCountsRef.current
    if (bounds.length > 0) {
      for (let i = 0; i < bounds.length - 1; i++) {
        const isWinning = winningBuckets.includes(i)
        const x1 = bounds[i]
        const x2 = bounds[i + 1]
        const bucketY = height - config.rimHeight
        
        // Bucket background
        ctx.fillStyle = isWinning ? theme.bucketHighlight : "transparent"
        ctx.fillRect(x1, bucketY, x2 - x1, config.rimHeight)
        
        // Bucket divider
        if (i > 0) {
          ctx.fillStyle = theme.bucketDivider
          ctx.fillRect(x1 - config.rimWidth / 2, bucketY, config.rimWidth, config.rimHeight)
        }
        
        // Draw ball count inside bucket (aligned to top)
        const count = counts[i] || 0
        if (count > 0) {
          const bucketCenterX = (x1 + x2) / 2
          const circleRadius = Math.min(18, (x2 - x1) / 3)
          // Position at top of bucket with padding
          const countY = bucketY + circleRadius + 4
          
          // Count background circle
          ctx.fillStyle = isWinning ? "rgba(34, 197, 94, 0.9)" : "rgba(0, 0, 0, 0.5)"
          ctx.beginPath()
          ctx.arc(bucketCenterX, countY, circleRadius, 0, Math.PI * 2)
          ctx.fill()
          
          // Count text
          ctx.fillStyle = "#ffffff"
          ctx.font = `bold ${Math.min(14, circleRadius)}px system-ui, sans-serif`
          ctx.textAlign = "center"
          ctx.textBaseline = "middle"
          ctx.fillText(count.toString(), bucketCenterX, countY)
        }
      }
      // Last divider
      const lastX = bounds[bounds.length - 1]
      ctx.fillStyle = theme.bucketDivider
      ctx.fillRect(lastX - config.rimWidth / 2, height - config.rimHeight, config.rimWidth, config.rimHeight)
    }

    // Clean up old hit pins
    hitPinsRef.current = hitPinsRef.current.filter(hit => now - hit.time < 300)

    // Draw pins with glow effect
    const pins = pinsRef.current
    pins.forEach(pin => {
      const { x, y } = pin.position
      const hitPin = hitPinsRef.current.find(
        hit => Math.abs(hit.x - x) < config.pinRadius * 2 && Math.abs(hit.y - y) < config.pinRadius * 2
      )
      
      // Pin glow (when hit)
      if (hitPin) {
        const age = (now - hitPin.time) / 300
        const glowAlpha = (1 - age) * hitPin.intensity * 0.8
        const glowRadius = config.pinRadius * (2 + age * 2)
        
        const glow = ctx.createRadialGradient(x, y, 0, x, y, glowRadius)
        glow.addColorStop(0, `rgba(99, 102, 241, ${glowAlpha})`)
        glow.addColorStop(1, "rgba(99, 102, 241, 0)")
        ctx.fillStyle = glow
        ctx.beginPath()
        ctx.arc(x, y, glowRadius, 0, Math.PI * 2)
        ctx.fill()
      }

      // Pin body
      ctx.fillStyle = theme.pinColor
      ctx.beginPath()
      
      if (config.pinShape === "ball") {
        ctx.arc(x, y, config.pinRadius, 0, Math.PI * 2)
      } else if (config.pinShape === "square") {
        const size = config.pinRadius * 2
        ctx.save()
        ctx.translate(x, y)
        ctx.rotate(config.pinAngle * Math.PI / 180)
        ctx.rect(-size / 2, -size / 2, size, size)
        ctx.restore()
      } else if (config.pinShape === "triangle") {
        ctx.save()
        ctx.translate(x, y)
        ctx.rotate(config.pinAngle * Math.PI / 180)
        const r = config.pinRadius
        ctx.moveTo(0, -r)
        ctx.lineTo(r * Math.cos(Math.PI / 6), r * Math.sin(Math.PI / 6))
        ctx.lineTo(-r * Math.cos(Math.PI / 6), r * Math.sin(Math.PI / 6))
        ctx.closePath()
        ctx.restore()
      }
      
      ctx.fill()

      // Pin highlight (glass effect)
      ctx.fillStyle = "rgba(255, 255, 255, 0.3)"
      ctx.beginPath()
      ctx.arc(x - config.pinRadius * 0.3, y - config.pinRadius * 0.3, config.pinRadius * 0.4, 0, Math.PI * 2)
      ctx.fill()
    })

    // Draw balls with trails
    const balls = ballsRef.current
    balls.forEach(ball => {
      const { x, y } = ball.position
      const ballId = ball.id

      // Update trail
      let trail = trailsRef.current.get(ballId) || []
      trail.unshift({ x, y, alpha: 1 })
      trail = trail.slice(0, 8).map((point, i) => ({ ...point, alpha: 1 - i * 0.12 }))
      trailsRef.current.set(ballId, trail)

      // Draw trail
      trail.forEach((point, i) => {
        if (i === 0) return
        const alpha = point.alpha * 0.5
        ctx.fillStyle = theme.ballTrail.replace("0.3", alpha.toString())
        ctx.beginPath()
        ctx.arc(point.x, point.y, config.ballRadius * (1 - i * 0.08), 0, Math.PI * 2)
        ctx.fill()
      })

      // Ball shadow
      ctx.fillStyle = "rgba(0, 0, 0, 0.15)"
      ctx.beginPath()
      ctx.ellipse(x + 2, y + 4, config.ballRadius * 0.9, config.ballRadius * 0.5, 0, 0, Math.PI * 2)
      ctx.fill()

      // Ball body with gradient
      const ballGradient = ctx.createRadialGradient(
        x - config.ballRadius * 0.3,
        y - config.ballRadius * 0.3,
        0,
        x,
        y,
        config.ballRadius
      )
      ballGradient.addColorStop(0, theme.ballGradientStart)
      ballGradient.addColorStop(1, theme.ballGradientEnd)
      
      ctx.fillStyle = ballGradient
      ctx.beginPath()
      
      if (config.ballShape === "ball") {
        ctx.arc(x, y, config.ballRadius, 0, Math.PI * 2)
      } else if (config.ballShape === "square") {
        const size = config.ballRadius * 2
        ctx.save()
        ctx.translate(x, y)
        ctx.rotate(ball.angle)
        ctx.rect(-size / 2, -size / 2, size, size)
        ctx.restore()
      } else if (config.ballShape === "triangle") {
        ctx.save()
        ctx.translate(x, y)
        ctx.rotate(ball.angle)
        const r = config.ballRadius
        ctx.moveTo(0, -r)
        ctx.lineTo(r * Math.cos(Math.PI / 6), r * Math.sin(Math.PI / 6))
        ctx.lineTo(-r * Math.cos(Math.PI / 6), r * Math.sin(Math.PI / 6))
        ctx.closePath()
        ctx.restore()
      }
      
      ctx.fill()

      // Ball highlight (glass effect)
      ctx.fillStyle = "rgba(255, 255, 255, 0.4)"
      ctx.beginPath()
      ctx.arc(
        x - config.ballRadius * 0.3,
        y - config.ballRadius * 0.3,
        config.ballRadius * 0.35,
        0,
        Math.PI * 2
      )
      ctx.fill()
    })

    // Clean up trails for removed balls
    const ballIds = new Set(balls.map(b => b.id))
    trailsRef.current.forEach((_, id) => {
      if (!ballIds.has(id)) {
        trailsRef.current.delete(id)
      }
    })

    // Schedule next frame
    animationRef.current = requestAnimationFrame(render)
  }, [canvasRef, engineRef, ballsRef, pinsRef, bucketBoundsRef, bucketCountsRef, config, winningBuckets, isDark, theme])

  const startRender = useCallback(() => {
    if (animationRef.current === null) {
      animationRef.current = requestAnimationFrame(render)
    }
  }, [render])

  const stopRender = useCallback(() => {
    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current)
      animationRef.current = null
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRender()
    }
  }, [stopRender])

  return {
    startRender,
    stopRender,
    registerPinHit,
  }
}
