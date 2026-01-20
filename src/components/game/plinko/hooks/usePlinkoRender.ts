"use client"

import { useEffect, useRef } from "react"
import type Matter from "matter-js"
import type { PlinkoConfig } from "../types"
import { createBurst, updateParticles } from "../utils/particles"

interface RenderOptions {
  canvasRef: React.RefObject<HTMLCanvasElement>
  engineRef: React.RefObject<Matter.Engine | null>
  bucketBoundsRef: React.RefObject<number[]>
  pinsRef: React.RefObject<Matter.Body[]>
  ballsRef: React.RefObject<Matter.Body[]>
  config: PlinkoConfig
  winnerBuckets: number[] | null
}

export const usePlinkoRender = ({
  canvasRef,
  engineRef,
  bucketBoundsRef,
  pinsRef,
  ballsRef,
  config,
  winnerBuckets
}: RenderOptions) => {
  const pinHitsRef = useRef<Map<number, number>>(new Map())
  const bucketGlowRef = useRef<Map<number, number>>(new Map())
  const particlesRef = useRef(createBurst(0, 0, "56,189,248", 0))
  const trailsRef = useRef<Map<number, { x: number; y: number }[]>>(new Map())
  const lastFrameRef = useRef<number>(0)

  const registerPinHit = (pin: Matter.Body) => {
    pinHitsRef.current.set(pin.id, performance.now())
  }

  const registerBucketHit = (bucket: number, position: Matter.Vector) => {
    bucketGlowRef.current.set(bucket, performance.now())
    particlesRef.current.push(...createBurst(position.x, position.y, "56,189,248", 14))
  }

  useEffect(() => {
    if (winnerBuckets == null || winnerBuckets.length === 0) return
    winnerBuckets.forEach(bucket => {
      bucketGlowRef.current.set(bucket, performance.now())
    })
    particlesRef.current.push(...createBurst(config.width / 2, config.height / 2, "16,185,129", 20))
  }, [config.height, config.width, winnerBuckets])

  useEffect(() => {
    const canvas = canvasRef.current
    const engine = engineRef.current
    if (canvas == null || engine == null) return
    const ctx = canvas.getContext("2d")
    if (ctx == null) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = config.width * dpr
    canvas.height = config.height * dpr
    canvas.style.width = `${config.width}px`
    canvas.style.height = `${config.height}px`
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.scale(dpr, dpr)

    let animationFrame = 0
    const renderFrame = (now: number) => {
      const last = lastFrameRef.current || now
      const delta = now - last
      lastFrameRef.current = now

      ctx.clearRect(0, 0, config.width, config.height)
      drawBackground(ctx, config)
      drawBuckets(ctx, config, bucketBoundsRef.current, bucketGlowRef.current, winnerBuckets)
      drawPins(ctx, pinsRef.current, pinHitsRef.current)
      drawBalls(ctx, ballsRef.current, trailsRef.current, config)
      updateParticles(particlesRef.current, delta)
      drawParticles(ctx, particlesRef.current)

      animationFrame = requestAnimationFrame(renderFrame)
    }

    animationFrame = requestAnimationFrame(renderFrame)
    return () => cancelAnimationFrame(animationFrame)
  }, [bucketBoundsRef, canvasRef, config, engineRef, pinsRef, ballsRef, winnerBuckets])

  return {
    registerPinHit,
    registerBucketHit
  }
}

const drawBackground = (ctx: CanvasRenderingContext2D, config: PlinkoConfig) => {
  const gradient = ctx.createLinearGradient(0, 0, 0, config.height)
  gradient.addColorStop(0, "rgba(248,250,252,0.9)")
  gradient.addColorStop(1, "rgba(226,232,240,0.95)")
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, config.width, config.height)
}

const drawBuckets = (
  ctx: CanvasRenderingContext2D,
  config: PlinkoConfig,
  bounds: number[],
  bucketGlow: Map<number, number>,
  winnerBuckets: number[] | null
) => {
  const now = performance.now()
  for (let i = 0; i < bounds.length - 1; i += 1) {
    const x = bounds[i]
    const width = bounds[i + 1] - bounds[i]
    const isWinner = winnerBuckets?.includes(i) ?? false
    const glowTime = bucketGlow.get(i) ?? 0
    const glowIntensity = Math.max(0, 1 - (now - glowTime) / 600)
    const alpha = isWinner ? 0.6 : 0.3 + glowIntensity * 0.4
    ctx.fillStyle = `rgba(56,189,248,${alpha})`
    ctx.fillRect(x, config.height - config.rimHeight, width, config.rimHeight)
  }
}

const drawPins = (
  ctx: CanvasRenderingContext2D,
  pins: Matter.Body[],
  pinHits: Map<number, number>
) => {
  const now = performance.now()
  pins.forEach(pin => {
    const hitTime = pinHits.get(pin.id) ?? 0
    const intensity = Math.max(0, 1 - (now - hitTime) / 300)
    ctx.beginPath()
    ctx.fillStyle = `rgba(15,118,110,${0.6 + intensity * 0.4})`
    ctx.shadowColor = `rgba(14,165,233,${0.6 * intensity})`
    ctx.shadowBlur = 12 * intensity
    ctx.arc(pin.position.x, pin.position.y, pin.circleRadius ?? 4, 0, Math.PI * 2)
    ctx.fill()
    ctx.shadowBlur = 0
  })
}

const drawBalls = (
  ctx: CanvasRenderingContext2D,
  balls: Matter.Body[],
  trails: Map<number, { x: number; y: number }[]>,
  config: PlinkoConfig
) => {
  balls.forEach(ball => {
    const trail = trails.get(ball.id) ?? []
    trail.push({ x: ball.position.x, y: ball.position.y })
    if (trail.length > 12) trail.shift()
    trails.set(ball.id, trail)

    if (trail.length > 1) {
      ctx.strokeStyle = "rgba(125,211,252,0.35)"
      ctx.lineWidth = 2
      ctx.beginPath()
      trail.forEach((point, idx) => {
        if (idx === 0) ctx.moveTo(point.x, point.y)
        else ctx.lineTo(point.x, point.y)
      })
      ctx.stroke()
    }

    ctx.save()
    ctx.translate(ball.position.x, ball.position.y)
    ctx.rotate(ball.angle)
    const radius = config.ballRadius
    ctx.fillStyle = "rgba(255,255,255,0.9)"
    ctx.strokeStyle = "rgba(148,163,184,0.7)"
    ctx.lineWidth = 1
    if (ball.circleRadius != null) {
      ctx.beginPath()
      ctx.arc(0, 0, radius, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
    } else if (config.ballShape === "square") {
      ctx.fillRect(-radius, -radius, radius * 2, radius * 2)
      ctx.strokeRect(-radius, -radius, radius * 2, radius * 2)
    } else {
      ctx.beginPath()
      ctx.moveTo(0, -radius)
      ctx.lineTo(radius, radius)
      ctx.lineTo(-radius, radius)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
    }
    ctx.restore()
  })
}

const drawParticles = (
  ctx: CanvasRenderingContext2D,
  particles: ReturnType<typeof createBurst>
) => {
  particles.forEach(particle => {
    const lifeRatio = 1 - particle.life / particle.ttl
    const alpha = Math.max(0.2, lifeRatio)
    ctx.fillStyle = `rgba(${particle.color},${alpha})`
    ctx.beginPath()
    ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2)
    ctx.fill()
  })
}
