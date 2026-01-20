"use client"

import * as React from "react"
import { useRef, useEffect, useCallback } from "react"
import Image from "next/image"
import Matter, { Engine, Runner, Bodies, Composite, Events } from "matter-js"
import { cn } from "@/lib/utils"
import type { PlayerProfile } from "./types"
import { getAvatarUrl } from "../shared/PlayerSidebar"

export interface WinCelebrationProps {
  isVisible: boolean
  winner: PlayerProfile | null
  onClose: () => void
  className?: string
}

/**
 * WinCelebration - Physics-based celebration overlay with ball drop
 */
export function WinCelebration({
  isVisible,
  winner,
  onClose,
  className,
}: WinCelebrationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const engineRef = useRef<Matter.Engine | null>(null)
  const runnerRef = useRef<Matter.Runner | null>(null)
  const ballsRef = useRef<Matter.Body[]>([])
  const animationRef = useRef<number | null>(null)

  const cleanup = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
      animationRef.current = null
    }
    if (runnerRef.current) {
      Runner.stop(runnerRef.current)
      runnerRef.current = null
    }
    if (engineRef.current) {
      Engine.clear(engineRef.current)
      engineRef.current = null
    }
    ballsRef.current = []
  }, [])

  useEffect(() => {
    if (!isVisible || !winner || !canvasRef.current || !containerRef.current) {
      cleanup()
      return
    }

    const canvas = canvasRef.current
    const container = containerRef.current
    const width = container.clientWidth
    const height = container.clientHeight

    canvas.width = width
    canvas.height = height

    // Create physics engine
    const engine = Engine.create()
    engine.gravity.y = 1
    engineRef.current = engine

    // Create runner
    const runner = Runner.create()
    runnerRef.current = runner

    // Create walls
    const wallThickness = 50
    const walls = [
      Bodies.rectangle(width / 2, height + wallThickness / 2, width, wallThickness, { isStatic: true }),
      Bodies.rectangle(-wallThickness / 2, height / 2, wallThickness, height, { isStatic: true }),
      Bodies.rectangle(width + wallThickness / 2, height / 2, wallThickness, height, { isStatic: true }),
    ]
    Composite.add(engine.world, walls)

    // Create avatar obstacle (static body in center)
    const avatarRadius = Math.min(width, height) * 0.15
    const avatarBody = Bodies.circle(width / 2, height * 0.4, avatarRadius + 20, {
      isStatic: true,
      restitution: 0.8,
      label: "avatar",
    })
    Composite.add(engine.world, avatarBody)

    // Create name obstacle (rectangle below avatar)
    const nameWidth = Math.min(width * 0.6, 300)
    const nameHeight = 50
    const nameBody = Bodies.rectangle(width / 2, height * 0.6, nameWidth, nameHeight, {
      isStatic: true,
      restitution: 0.6,
      chamfer: { radius: 10 },
      label: "name",
    })
    Composite.add(engine.world, nameBody)

    Runner.run(runner, engine)

    // Ball colors
    const colors = [
      "#ef4444", "#f97316", "#eab308", "#22c55e", 
      "#3b82f6", "#8b5cf6", "#ec4899", "#06b6d4"
    ]

    // Drop balls continuously
    let dropCount = 0
    const maxBalls = 100
    const dropInterval = setInterval(() => {
      if (dropCount >= maxBalls) {
        clearInterval(dropInterval)
        return
      }

      const x = Math.random() * width
      const radius = 8 + Math.random() * 8
      const color = colors[Math.floor(Math.random() * colors.length)]

      const ball = Bodies.circle(x, -20, radius, {
        restitution: 0.7,
        friction: 0.1,
        render: { fillStyle: color },
        label: `ball-${dropCount}`,
      })
      // @ts-expect-error - Adding custom property for rendering
      ball.customColor = color

      ballsRef.current.push(ball)
      Composite.add(engine.world, ball)
      dropCount++
    }, 80)

    // Custom render loop
    const render = () => {
      const ctx = canvas.getContext("2d")
      if (!ctx) return

      // Clear
      ctx.clearRect(0, 0, width, height)

      // Draw balls
      ballsRef.current.forEach(ball => {
        const { x, y } = ball.position
        // @ts-expect-error - Using custom property
        const color = ball.customColor || "#f97316"
        const radius = (ball.circleRadius || 10)

        // Shadow
        ctx.fillStyle = "rgba(0, 0, 0, 0.1)"
        ctx.beginPath()
        ctx.ellipse(x + 2, y + 3, radius * 0.8, radius * 0.4, 0, 0, Math.PI * 2)
        ctx.fill()

        // Ball body
        const gradient = ctx.createRadialGradient(
          x - radius * 0.3, y - radius * 0.3, 0,
          x, y, radius
        )
        gradient.addColorStop(0, lightenColor(color, 30))
        gradient.addColorStop(1, color)
        
        ctx.fillStyle = gradient
        ctx.beginPath()
        ctx.arc(x, y, radius, 0, Math.PI * 2)
        ctx.fill()

        // Highlight
        ctx.fillStyle = "rgba(255, 255, 255, 0.4)"
        ctx.beginPath()
        ctx.arc(x - radius * 0.3, y - radius * 0.3, radius * 0.3, 0, Math.PI * 2)
        ctx.fill()
      })

      animationRef.current = requestAnimationFrame(render)
    }

    animationRef.current = requestAnimationFrame(render)

    return () => {
      clearInterval(dropInterval)
      cleanup()
    }
  }, [isVisible, winner, cleanup])

  if (!isVisible || !winner) return null

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center",
        "bg-black/60 backdrop-blur-md",
        "animate-in fade-in duration-300",
        className
      )}
      onClick={onClose}
    >
      {/* Physics canvas (behind) */}
      <div 
        ref={containerRef}
        className="absolute inset-0"
        onClick={e => e.stopPropagation()}
      >
        <canvas
          ref={canvasRef}
          className="w-full h-full"
        />
      </div>

      {/* Winner content (on top) */}
      <div 
        className="relative z-10 flex flex-col items-center gap-6 p-8"
        onClick={e => e.stopPropagation()}
      >
        {/* Avatar */}
        <div className="relative animate-bounce-subtle">
          <div className="absolute -inset-4 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 rounded-full blur-xl opacity-60 animate-pulse" />
          <Image
            src={getAvatarUrl(winner)}
            alt={winner.name}
            width={160}
            height={160}
            unoptimized
            className="relative w-40 h-40 rounded-full object-cover ring-4 ring-amber-400 shadow-2xl"
          />
          <div className="absolute -top-2 -right-2 w-12 h-12 bg-amber-400 rounded-full flex items-center justify-center shadow-lg">
            <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </div>
        </div>

        {/* Winner text */}
        <div className="text-center">
          <p className="text-amber-400 text-lg font-medium uppercase tracking-wider mb-2">
            🎉 Winner! 🎉
          </p>
          <h2 className="text-white text-4xl md:text-5xl font-bold tracking-tight text-glow-accent">
            {winner.name}
          </h2>
          <p className="text-white/70 text-lg mt-2">
            {winner.wins} {winner.wins === 1 ? "win" : "wins"} total
          </p>
        </div>

        {/* Dismiss hint */}
        <button
          onClick={onClose}
          className="mt-4 px-6 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-full text-white/80 text-sm transition-all hover:scale-105"
        >
          Click anywhere to continue
        </button>
      </div>
    </div>
  )
}

/**
 * Helper to lighten a hex color
 */
function lightenColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace("#", ""), 16)
  const amt = Math.round(2.55 * percent)
  const R = Math.min(255, (num >> 16) + amt)
  const G = Math.min(255, ((num >> 8) & 0x00FF) + amt)
  const B = Math.min(255, (num & 0x0000FF) + amt)
  return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`
}
